#!/usr/bin/env python3

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

NOTION_VERSION = "2022-06-28"
API_BASE = "https://api.notion.com/v1"


def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def chunk_text(s, size=1800):
    if s is None:
        return []
    s = str(s)
    if not s:
        return []
    return [s[i:i + size] for i in range(0, len(s), size)]


def rich_text_value(s):
    chunks = chunk_text(s)
    return [{"text": {"content": c}} for c in chunks]


def notion_request(method, url, token, body=None, retry=3):
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429 and retry > 0:
            retry_after = e.headers.get("Retry-After")
            sleep_s = float(retry_after) if retry_after else 1.0
            time.sleep(sleep_s)
            return notion_request(method, url, token, body=body, retry=retry - 1)
        detail = e.read().decode("utf-8")
        raise RuntimeError(f"Notion API error {e.code}: {detail}")


def query_database(database_id, token, filter_body=None):
    results = []
    start_cursor = None
    while True:
        body = {"page_size": 100}
        if filter_body:
            body["filter"] = filter_body
        if start_cursor:
            body["start_cursor"] = start_cursor
        url = f"{API_BASE}/databases/{database_id}/query"
        data = notion_request("POST", url, token, body=body)
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        start_cursor = data.get("next_cursor")
    return results


def get_database(database_id, token):
    url = f"{API_BASE}/databases/{database_id}"
    return notion_request("GET", url, token)


def update_database(database_id, token, properties):
    url = f"{API_BASE}/databases/{database_id}"
    body = {"properties": properties}
    return notion_request("PATCH", url, token, body=body)


def extract_id_from_url(url):
    # Accept UUID with or without dashes, or 32 hex chars in URL.
    m = re.search(r"([0-9a-fA-F]{32})", url or "")
    if m:
        return m.group(1)
    m = re.search(r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", url or "")
    if m:
        return m.group(1)
    return None


def list_child_databases(page_id, token):
    results = []
    start_cursor = None
    while True:
        params = "page_size=100"
        if start_cursor:
            params += f"&start_cursor={start_cursor}"
        url = f"{API_BASE}/blocks/{page_id}/children?{params}"
        data = notion_request("GET", url, token)
        for b in data.get("results", []):
            if b.get("type") == "child_database":
                title = b["child_database"].get("title", "")
                results.append((title, b["id"]))
        if not data.get("has_more"):
            break
        start_cursor = data.get("next_cursor")
    return results


def try_get_database_title(db_id, token):
    try:
        db = get_database(db_id, token)
        title = db.get("title") or []
        parts = []
        for t in title:
            if t.get("type") == "text":
                parts.append((t.get("text") or {}).get("content", ""))
            else:
                parts.append(t.get("plain_text", ""))
        name = "".join(parts).strip()
        return name or None
    except Exception:
        return None


def discover_linked_databases(page_id, token):
    """
    Fallback: if databases are not direct child_database blocks under the cover page
    (e.g. user replaced them with links), scan the page children for database URLs and resolve them.
    """
    discovered = {}
    start_cursor = None
    while True:
        params = "page_size=100"
        if start_cursor:
            params += f"&start_cursor={start_cursor}"
        url = f"{API_BASE}/blocks/{page_id}/children?{params}"
        data = notion_request("GET", url, token)
        for b in data.get("results", []):
            bt = b.get("type")
            payload = b.get(bt) if bt else None
            if not isinstance(payload, dict):
                continue
            rich_text = payload.get("rich_text")
            if not rich_text:
                continue
            for rt in rich_text:
                href = rt.get("href")
                if not href:
                    continue
                db_id = extract_id_from_url(href)
                if not db_id:
                    continue
                title = try_get_database_title(db_id, token)
                if title:
                    discovered[title] = db_id
        if not data.get("has_more"):
            break
        start_cursor = data.get("next_cursor")
    return discovered


def create_child_database(page_id, token, db_title, title_prop_name):
    url = f"{API_BASE}/databases"
    body = {
        "parent": {"type": "page_id", "page_id": page_id},
        "title": [{"type": "text", "text": {"content": db_title}}],
        "properties": {
            title_prop_name: {"title": {}},
        },
    }
    return notion_request("POST", url, token, body=body)


def normalize_bootstrap_selection(db_names, full=False):
    if full:
        return None
    if not db_names:
        # Default to a slim set that supports the simplified Notion workflow.
        return set(["Cards", "Categories", "Offers", "Period Windows"])

    alias_map = {
        "cards": "Cards",
        "categories": "Categories",
        "modules": "Modules",
        "offers": "Offers",
        "period windows": "Period Windows",
        "period_windows": "Period Windows",
        "periodwindows": "Period Windows",
        "campaigns": "Campaigns",
        "windows": "Period Windows",
        "campaign_windows": "Campaign Period Windows",
        "campaign_period_windows": "Campaign Period Windows",
        "campaignsections": "Campaign Sections",
        "campaign_sections": "Campaign Sections",
        "campaignregistry": "Campaign Registry",
        "campaign_registry": "Campaign Registry",
        "trackers": "Trackers",
        "conversions": "Conversions",
        "counters": "Counters Registry",
        "counters_registry": "Counters Registry",
    }

    selected = set()
    for raw in db_names:
        key = str(raw or "").strip()
        if not key:
            continue
        if key in alias_map:
            selected.add(alias_map[key])
            continue
        low = key.lower()
        if low in alias_map:
            selected.add(alias_map[low])
            continue
        selected.add(key)
    return selected


def normalize_sync_db_selection(db_names):
    if not db_names:
        return None

    alias_map = {
        "cards": "cards",
        "categories": "categories",
        "modules": "modules",
        "offers": "offers",
        "period_windows": "period_windows",
        "period windows": "period_windows",
        "periodwindows": "period_windows",
        "trackers": "trackers",
        "conversions": "conversions",
        "campaigns": "campaigns",
        "campaign_windows": "campaign_windows",
        "windows": "period_windows",
        "campaign_windows": "campaign_windows",
        "campaign_period_windows": "campaign_windows",
        "campaign sections": "campaign_sections",
        "campaignsections": "campaign_sections",
        "campaign_sections": "campaign_sections",
        "campaign registry": "campaign_registry",
        "campaignregistry": "campaign_registry",
        "campaign_registry": "campaign_registry",
        "counters": "counters_registry",
        "counters registry": "counters_registry",
        "counters_registry": "counters_registry",
    }

    selected = set()
    for raw in db_names:
        key = str(raw or "").strip().lower()
        if not key:
            continue
        key_space = key.replace("-", " ").replace("_", " ")
        if key in alias_map:
            selected.add(alias_map[key])
            continue
        if key_space in alias_map:
            selected.add(alias_map[key_space])
            continue
        selected.add(key)
    return selected


def bootstrap_child_databases(page_id, token, selected_titles=None):
    """
    Ensure the Notion page has the expected child databases used by this repo.
    Creates any missing databases with a stable title property name so upserts work.
    """
    required_all = [
        ("Cards", "Card"),
        ("Categories", "Category"),
        ("Modules", "Module Key"),
        ("Offers", "Offer ID"),
        ("Period Windows", "Window ID"),
        ("Trackers", "Tracker Key"),
        ("Conversions", "Conversion Src"),
        ("Campaigns", "Campaign ID"),
        ("Campaign Period Windows", "Window ID"),
        ("Campaign Sections", "Section ID"),
        ("Campaign Registry", "Campaign ID"),
        ("Counters Registry", "Key"),
    ]
    required = required_all
    if isinstance(selected_titles, set) and selected_titles:
        required = [(title, prop) for (title, prop) in required_all if title in selected_titles]
        missing = sorted([title for title in selected_titles if title not in set(t for t, _ in required_all)])
        if missing:
            print(f"[warn] bootstrap: unknown db names ignored: {', '.join(missing)}")

    db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}
    created = []
    for db_title, title_prop_name in required:
        if db_title in db_map:
            continue
        created_db = create_child_database(page_id, token, db_title, title_prop_name)
        created.append(db_title)
        db_map[db_title] = created_db.get("id")

    # Notion may take a moment to reflect newly created DB blocks in /children.
    if created:
        time.sleep(0.5)
        db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}
        missing_after = [t for t, _ in required if t not in db_map]
        if missing_after:
            print(f"[warn] bootstrap: created {', '.join(created)} but still missing: {', '.join(missing_after)}")
        else:
            print(f"[info] bootstrap: created databases: {', '.join(created)}")

    return db_map


def query_page_by_title(database_id, title_prop, key, token):
    url = f"{API_BASE}/databases/{database_id}/query"
    body = {"filter": {"property": title_prop, "title": {"equals": key}}}
    data = notion_request("POST", url, token, body=body)
    results = data.get("results", [])
    return results[0]["id"] if results else None


def create_page(database_id, properties, token):
    url = f"{API_BASE}/pages"
    body = {"parent": {"database_id": database_id}, "properties": properties}
    return notion_request("POST", url, token, body=body)


def update_page(page_id, properties, token):
    url = f"{API_BASE}/pages/{page_id}"
    body = {"properties": properties}
    return notion_request("PATCH", url, token, body=body)


def build_props(title_prop, title_value, props):
    out = {title_prop: {"title": [{"text": {"content": title_value}}]}}
    for k, v in props.items():
        out[k] = v
    return out


def get_title_prop_name(db):
    for name, meta in (db.get("properties") or {}).items():
        if meta.get("type") == "title":
            return name
    return None


def filter_props(props, allowed_props, context):
    missing = [k for k in props.keys() if k not in allowed_props]
    if missing:
        print(f"[warn] {context}: skipping missing Notion properties: {', '.join(missing)}")
    return {k: v for k, v in props.items() if k in allowed_props}


def extract_title_value(prop):
    if not prop:
        return ""
    if prop.get("type") == "title":
        parts = [p.get("plain_text", "") for p in prop.get("title", [])]
        return "".join(parts).strip()
    if prop.get("type") == "rich_text":
        parts = [p.get("plain_text", "") for p in prop.get("rich_text", [])]
        return "".join(parts).strip()
    return ""


def extract_rich_text(props, name):
    prop = (props or {}).get(name)
    if not prop:
        return ""
    if prop.get("type") == "rich_text":
        parts = [p.get("plain_text", "") for p in prop.get("rich_text", [])]
        return "".join(parts).strip()
    if prop.get("type") == "title":
        parts = [p.get("plain_text", "") for p in prop.get("title", [])]
        return "".join(parts).strip()
    return ""


def extract_select(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "select":
        return ""
    select = prop.get("select")
    return select.get("name", "") if select else ""


def extract_date(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "date":
        return ""
    date = prop.get("date")
    return date.get("start", "") if date else ""


def extract_url(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "url":
        return ""
    return prop.get("url") or ""


def extract_checkbox(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "checkbox":
        return False
    return bool(prop.get("checkbox"))


def extract_number(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "number":
        return None
    return prop.get("number")


def extract_multi_select(props, name):
    prop = (props or {}).get(name)
    if not prop or prop.get("type") != "multi_select":
        return []
    out = []
    for opt in prop.get("multi_select") or []:
        nm = opt.get("name")
        if nm:
            out.append(nm)
    return out


def resolve_title_prop(db_id, token, default_title_prop, db_label):
    db = get_database(db_id, token)
    allowed = set((db.get("properties") or {}).keys())
    title_prop = default_title_prop
    if title_prop not in allowed:
        detected = get_title_prop_name(db)
        if detected and detected in allowed:
            print(f"[warn] {db_label}: title property '{title_prop}' not found; using '{detected}'")
            title_prop = detected
        else:
            die(f"{db_label}: could not find title property '{title_prop}' in Notion database")
    return title_prop, allowed


def infer_property_schema(prop_value):
    if "rich_text" in prop_value:
        return {"rich_text": {}}
    if "number" in prop_value:
        return {"number": {}}
    if "checkbox" in prop_value:
        return {"checkbox": {}}
    if "multi_select" in prop_value:
        return {"multi_select": {"options": []}}
    if "select" in prop_value:
        return {"select": {"options": []}}
    if "url" in prop_value:
        return {"url": {}}
    if "date" in prop_value:
        return {"date": {}}
    return None


def ensure_properties(db_id, token, props, db_label):
    db = get_database(db_id, token)
    allowed = set((db.get("properties") or {}).keys())
    to_create = {}
    skipped = []
    for key, value in props.items():
        if key in allowed:
            continue
        if "title" in value:
            continue
        if "relation" in value:
            skipped.append(key)
            continue
        schema = infer_property_schema(value)
        if schema is None:
            skipped.append(key)
            continue
        to_create[key] = schema

    if to_create:
        update_database(db_id, token, to_create)
        allowed.update(to_create.keys())
        print(f"[warn] {db_label}: created missing properties: {', '.join(to_create.keys())}")
    if skipped:
        print(f"[warn] {db_label}: skipped auto-creating properties (unsupported type): {', '.join(skipped)}")
    return allowed


def rt(v):
    return {"rich_text": rich_text_value(v)}


def num(v):
    return {"number": v if v is not None else None}


def chk(v):
    return {"checkbox": bool(v)}


def sel(v):
    return {"select": {"name": v} if v else None}


def datev(v):
    return {"date": {"start": v} if v else None}


def urlv(v):
    return {"url": v or ""}


def mselect(values):
    values = values or []
    return {"multi_select": [{"name": v} for v in values]}


def rels(ids):
    ids = [i for i in (ids or []) if i]
    return {"relation": [{"id": i} for i in ids]}


def load_data_via_node(repo_root):
    # Load the same data bootstrap as the browser (data_index.js builds DATA).
    node_script = r"""
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=process.cwd();

const ctx={ console };
ctx.window = ctx;
ctx.global = ctx;
vm.createContext(ctx);

[
  'js/data_cards.js',
  'js/data_categories.js',
  'js/data_modules.js',
  'js/data_trackers.js',
  'js/data_conversions.js',
  'js/data_rules.js',
  'js/data_campaigns.js',
  'js/data_counters.js',
  'js/period_policy.js',
  'js/data_notion_core_overrides.js',
  'js/data_notion_overrides.js',
  'js/data_index.js',
].forEach((f)=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));

const out = {
  cards: (ctx.DATA && ctx.DATA.cards) ? ctx.DATA.cards : null,
  categories: (ctx.DATA && ctx.DATA.categories) ? ctx.DATA.categories : null,
  modules: (ctx.DATA && ctx.DATA.modules) ? ctx.DATA.modules : null,
  trackers: (ctx.DATA && ctx.DATA.trackers) ? ctx.DATA.trackers : null,
  conversions: (ctx.DATA && ctx.DATA.conversions) ? ctx.DATA.conversions : null,
  rules: (ctx.DATA && ctx.DATA.rules) ? ctx.DATA.rules : null,
  campaigns: (ctx.DATA && ctx.DATA.campaigns) ? ctx.DATA.campaigns : null,
  campaignRegistry: (ctx.DATA && ctx.DATA.campaignRegistry) ? ctx.DATA.campaignRegistry : null,
  countersRegistry: (ctx.DATA && ctx.DATA.countersRegistry) ? ctx.DATA.countersRegistry : null,
  periodPolicy: (ctx.DATA && ctx.DATA.periodPolicy) ? ctx.DATA.periodPolicy : null,
  periodDefaults: (ctx.DATA && ctx.DATA.periodDefaults) ? ctx.DATA.periodDefaults : null,
};
process.stdout.write(JSON.stringify(out));
"""
    result = subprocess.check_output(["node", "-e", node_script], cwd=repo_root, text=True, encoding="utf-8")
    return json.loads(result)


def pick_db_name(db_map, preferred, fallbacks):
    if preferred in db_map:
        return preferred
    for name in fallbacks:
        if name in db_map:
            return name
    return None


def sync_table(db_id, token, db_label, default_title_prop, template_props, rows, build_row_props):
    title_prop, allowed = resolve_title_prop(db_id, token, default_title_prop, db_label)
    allowed = ensure_properties(db_id, token, template_props, db_label)
    out_page_ids = {}
    for key, row in rows:
        props = build_row_props(key, row)
        props = build_props(title_prop, key, props)
        props = filter_props(props, allowed, f"{db_label}:{key}")
        page_id_existing = query_page_by_title(db_id, title_prop, key, token)
        if page_id_existing:
            update_page(page_id_existing, props, token)
            out_page_ids[key] = page_id_existing
        else:
            created = create_page(db_id, props, token)
            out_page_ids[key] = created.get("id")
    return out_page_ids


def sync(repo_root, page_url, token, sync_dbs=None):
    page_id = extract_id_from_url(page_url)
    if not page_id:
        die("Could not parse page ID from URL")

    db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}
    # Fallback: allow a “cover page” that only contains links to DBs.
    for title, db_id in (discover_linked_databases(page_id, token) or {}).items():
        if title not in db_map:
            db_map[title] = db_id
    data = load_data_via_node(repo_root)

    cards = data.get("cards") or []
    categories = data.get("categories") or {}
    modules = data.get("modules") or {}
    trackers = data.get("trackers") or {}
    conversions = data.get("conversions") or []
    campaigns = data.get("campaigns") or []
    campaign_registry = data.get("campaignRegistry") or {}
    counters_registry = data.get("countersRegistry") or {}
    module_card_map = {}
    for card in cards:
        card_id = card.get("id", "")
        if not card_id:
            continue
        for module_key in (card.get("rewardModules") or []):
            module_card_map.setdefault(module_key, []).append(card_id)

    campaign_db_name = pick_db_name(db_map, "Campaigns", ["Promotions"])
    campaign_windows_db_name = pick_db_name(db_map, "Campaign Period Windows", ["Promotion Period Windows", "Campaign Windows"])
    campaign_sections_db_name = pick_db_name(db_map, "Campaign Sections", ["Promotion Sections"])
    campaign_registry_db_name = pick_db_name(db_map, "Campaign Registry", ["Promo Registry"])
    offers_db_name = pick_db_name(db_map, "Offers", [])
    period_windows_db_name = pick_db_name(db_map, "Period Windows", [])
    sync_allowed_set = normalize_sync_db_selection(sync_dbs)
    if sync_allowed_set is None and (offers_db_name or period_windows_db_name):
        # New default workflow: keep Notion input schema lean around 4 primary tables.
        sync_allowed_set = set(["cards", "categories", "offers", "period_windows"])

    def db_allowed(name):
        if not sync_allowed_set:
            return True
        return name in sync_allowed_set

    card_page_ids = {}
    campaign_page_ids = {}

    if db_allowed("cards") and "Cards" in db_map:
        db_id = db_map["Cards"]
        template_props = build_props("Card", "__template__", {
            "Display Name (zh-HK)": rt(""),
            "Bank": rt(""),
            "Reward Unit": {"select": {"name": ""}},
            "Active": chk(True),
            "Sync To Repo": chk(False),
        })

        def build_row_props(key, c):
            red = c.get("redemption") or {}
            display_name = str(c.get("display_name_zhhk") or c.get("name") or key)
            active = str(c.get("status", "")).strip().lower() != "inactive"
            return {
                "Display Name (zh-HK)": rt(display_name),
                "Reward Unit": sel(str(red.get("unit", "")).strip()),
                "Active": chk(active),
            }

        card_page_ids = sync_table(
            db_id=db_id,
            token=token,
            db_label="Cards",
            default_title_prop="Card",
            template_props=template_props,
            rows=[(c.get("id", ""), c) for c in cards if c.get("id")],
            build_row_props=build_row_props,
        )

    if db_allowed("categories") and "Categories" in db_map:
        db_id = db_map["Categories"]
        template_props = build_props("Category", "__template__", {
            "Display Name (zh-HK)": rt(""),
            "Parent Category": rt(""),
            "Active": chk(True),
            "Sync To Repo": chk(False),
        })

        def build_row_props(key, c):
            active = not bool(c.get("hidden", False))
            return {
                "Display Name (zh-HK)": rt(str(c.get("label", "")).strip()),
                "Parent Category": rt(str(c.get("parent", "")).strip()),
                "Active": chk(active),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Categories",
            default_title_prop="Category",
            template_props=template_props,
            rows=[(k, v) for k, v in categories.items()],
            build_row_props=build_row_props,
        )

    if db_allowed("modules") and "Modules" in db_map:
        db_id = db_map["Modules"]
        template_props = build_props("Module Key", "__template__", {
            "Offer Name": rt(""),
            "Rule Template": {"select": {"name": ""}},
            "Apply Mode": {"select": {"name": ""}},
            "Reward Type": {"select": {"name": ""}},
            "Reward Value": num(None),
            "Active From": {"date": {}},
            "Active To": {"date": {}},
            "Category IDs": mselect([]),
            "Mission Spend Target": num(None),
            "Mission Credit Mode": {"select": {"name": ""}},
            "Req Mission Key": rt(""),
            "Display Name (zh-HK)": rt(""),
            "Sync To Repo": chk(False),
        })

        def build_row_props(key, m):
            flat = build_module_flat_fields(m)
            return {
                "Offer Name": rt(flat.get("offer_name", "")),
                "Rule Template": sel(flat.get("rule_template", "")),
                "Apply Mode": sel(flat.get("apply_mode", "")),
                "Reward Type": sel(flat.get("reward_type", "")),
                "Reward Value": num(flat.get("reward_value", None)),
                "Active From": datev(flat.get("active_from", "")),
                "Active To": datev(flat.get("active_to", "")),
                "Category IDs": mselect(flat.get("category_ids", [])),
                "Mission Spend Target": num(flat.get("mission_spend_target", None)),
                "Mission Credit Mode": sel(flat.get("mission_credit_mode", "")),
                "Req Mission Key": rt(m.get("req_mission_key", "")),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Modules",
            default_title_prop="Module Key",
            template_props=template_props,
            rows=[(k, v) for k, v in modules.items()],
            build_row_props=build_row_props,
        )

    if db_allowed("offers") and offers_db_name and db_map.get(offers_db_name):
        db_id = db_map[offers_db_name]
        template_props = build_props("Offer ID", "__template__", {
            "Offer Name": rt(""),
            "Rule Template": {"select": {"name": ""}},
            "Card IDs": mselect([]),
            "Category IDs": mselect([]),
            "Apply Mode": {"select": {"name": ""}},
            "Reward Type": {"select": {"name": ""}},
            "Reward Value": num(None),
            "Mission Spend Target": num(None),
            "Retroactive": chk(False),
            "Cap Type": {"select": {"name": ""}},
            "Cap Value": num(None),
            "Period Policy": rt(""),
            "Active": chk(True),
            "Sync To Repo": chk(False),
        })

        def build_row_props(module_key, module):
            row = build_offer_row_from_module(module_key, module, module_card_map.get(module_key, []))
            return {
                "Offer Name": rt(row.get("offer_name", "")),
                "Rule Template": sel(row.get("rule_template", "")),
                "Card IDs": mselect(row.get("card_ids", [])),
                "Category IDs": mselect(row.get("category_ids", [])),
                "Apply Mode": sel(row.get("apply_mode", "")),
                "Reward Type": sel(row.get("reward_type", "")),
                "Reward Value": num(row.get("reward_value", None)),
                "Mission Spend Target": num(row.get("mission_spend_target", None)),
                "Retroactive": chk(row.get("retroactive", True)),
                "Cap Type": sel(row.get("cap_type", "none")),
                "Cap Value": num(row.get("cap_value", None)),
                "Period Policy": rt(row.get("period_policy", "")),
                "Active": chk(True),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label=offers_db_name,
            default_title_prop="Offer ID",
            template_props=template_props,
            rows=[(k, v) for k, v in modules.items()],
            build_row_props=build_row_props,
        )

    if db_allowed("period_windows") and period_windows_db_name and db_map.get(period_windows_db_name):
        db_id = db_map[period_windows_db_name]
        template_props = build_props("Window ID", "__template__", {
            "Period Policy": rt(""),
            "Window Order": num(None),
            "Start Date": {"date": {}},
            "End Date": {"date": {}},
            "Recurrence": {"select": {"name": ""}},
            "Recurrence Interval": num(None),
            "Recurrence Until": {"date": {}},
            "Sync To Repo": chk(False),
        })

        windows_rows = []
        for module_key, module in modules.items():
            for window in build_offer_windows_from_module(module_key, module):
                windows_rows.append((window.get("window_id", ""), window))

        def build_row_props(window_id, row):
            return {
                "Period Policy": rt(row.get("period_policy", "")),
                "Window Order": num(row.get("window_order", None)),
                "Start Date": datev(row.get("start_date", "")),
                "End Date": datev(row.get("end_date", "")),
                "Recurrence": sel(row.get("recurrence", "")),
                "Recurrence Interval": num(row.get("recurrence_interval", None)),
                "Recurrence Until": datev(row.get("recurrence_until", "")),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label=period_windows_db_name,
            default_title_prop="Window ID",
            template_props=template_props,
            rows=windows_rows,
            build_row_props=build_row_props,
        )

    if db_allowed("trackers") and "Trackers" in db_map:
        db_id = db_map["Trackers"]
        template_props = build_props("Tracker Key", "__template__", {
            "Type": rt(""),
            "Desc": rt(""),
            "Data": rt(""),
            "Match": mselect([]),
            "Setting Key": rt(""),
            "Req Mission Key": rt(""),
            "Mission ID": rt(""),
            "Promo End": rt(""),
            "Valid From": rt(""),
            "Valid To": rt(""),
            "Has Eligible Check": chk(False),
            "Counter": rt(""),
            "Source File": rt(""),
        })

        def build_row_props(key, t):
            match = t.get("match", []) if isinstance(t.get("match", None), list) else []
            return {
                "Type": rt(t.get("type", "")),
                "Desc": rt(t.get("desc", "")),
                "Data": rt(json.dumps(t, ensure_ascii=False)),
                "Match": mselect(match),
                "Setting Key": rt(t.get("setting_key", "")),
                "Req Mission Key": rt(t.get("req_mission_key", "")),
                "Mission ID": rt(t.get("mission_id", "")),
                "Promo End": rt(t.get("promo_end", "")),
                "Valid From": rt(t.get("valid_from", "")),
                "Valid To": rt(t.get("valid_to", "")),
                "Has Eligible Check": chk("eligible_check" in t),
                "Counter": rt(json.dumps(t.get("counter", {}) if t.get("counter") is not None else {}, ensure_ascii=False) if t.get("counter") is not None else ""),
                "Source File": rt("js/data_trackers.js"),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Trackers",
            default_title_prop="Tracker Key",
            template_props=template_props,
            rows=[(k, v) for k, v in trackers.items()],
            build_row_props=build_row_props,
        )

    if db_allowed("conversions") and "Conversions" in db_map:
        db_id = db_map["Conversions"]
        template_props = build_props("Conversion Src", "__template__", {
            "Miles Rate": num(None),
            "Cash Rate": num(None),
            "Note (zh-HK)": rt(""),
            "Last Verified": {"date": {}},
            "Source URL": {"url": ""},
            "Source Title": rt(""),
            "Sync To Repo": chk(False),
            "Source File": rt(""),
        })

        def build_row_props(key, c):
            return {
                "Miles Rate": num(c.get("miles_rate", None)),
                "Cash Rate": num(c.get("cash_rate", None)),
                "Source File": rt("js/data_conversions.js"),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Conversions",
            default_title_prop="Conversion Src",
            template_props=template_props,
            rows=[(c.get("src", ""), c) for c in conversions if isinstance(c, dict) and c.get("src")],
            build_row_props=build_row_props,
        )

    if db_allowed("campaigns") and campaign_db_name:
        db_id = db_map[campaign_db_name]
        template_props = build_props("Campaign ID", "__template__", {
            "Name": rt(""),
            "Theme": rt(""),
            "Icon": rt(""),
            "Cards": rt(""),
            "Cap Keys": rt(""),
            "Period Policy": rt(""),
            "PP Mode": {"select": {"name": ""}},
            "PP Period Type": {"select": {"name": ""}},
            "PP Start Date": {"date": {}},
            "PP End Date": {"date": {}},
            "PP Start Day": num(None),
            "PP Start Month": num(None),
            "PP Recurrence Freq": {"select": {"name": ""}},
            "PP Recurrence Interval": num(None),
            "PP Recurrence Until": {"date": {}},
            "PP Windows JSON": rt(""),
            "Data": rt(""),
            "Display Name (zh-HK)": rt(""),
            "Note (zh-HK)": rt(""),
            "Status": {"select": {"name": ""}},
            "Last Verified": {"date": {}},
            "Source URL": {"url": ""},
            "Source Title": rt(""),
            "Sync To Repo": chk(False),
            "Source File": rt(""),
        })

        def build_row_props(key, c):
            policy = c.get("period_policy") if isinstance(c.get("period_policy"), dict) else {}
            flat = build_period_policy_flat_fields(policy)
            return {
                "Name": rt(c.get("name", "")),
                "Theme": rt(c.get("theme", "")),
                "Icon": rt(c.get("icon", "")),
                "Cards": rt(json.dumps(c.get("cards", []) if c.get("cards") is not None else [], ensure_ascii=False)),
                "Cap Keys": rt(json.dumps(c.get("capKeys", []) if c.get("capKeys") is not None else [], ensure_ascii=False)),
                "Period Policy": rt(json.dumps(policy, ensure_ascii=False) if policy else ""),
                "PP Mode": sel(flat.get("mode", "")),
                "PP Period Type": sel(flat.get("period_type", "")),
                "PP Start Date": datev(flat.get("start_date", "")),
                "PP End Date": datev(flat.get("end_date", "")),
                "PP Start Day": num(flat.get("start_day", None)),
                "PP Start Month": num(flat.get("start_month", None)),
                "PP Recurrence Freq": sel(flat.get("recurrence_freq", "")),
                "PP Recurrence Interval": num(flat.get("recurrence_interval", None)),
                "PP Recurrence Until": datev(flat.get("recurrence_until", "")),
                "PP Windows JSON": rt(flat.get("windows_json", "")),
                "Data": rt(json.dumps(c, ensure_ascii=False)),
                "Source File": rt("js/data_campaigns.js"),
            }

        campaign_page_ids = sync_table(
            db_id=db_id,
            token=token,
            db_label=campaign_db_name,
            default_title_prop="Campaign ID",
            template_props=template_props,
            rows=[(c.get("id", ""), c) for c in campaigns if c.get("id")],
            build_row_props=build_row_props,
        )

    if db_allowed("campaign_windows") and campaign_windows_db_name:
        db_id = db_map[campaign_windows_db_name]
        template_props = build_props("Window ID", "__template__", {
            "Campaign ID": rt(""),
            "Campaign": rels([]),
            "Window Ref": rt(""),
            "Mode": {"select": {"name": ""}},
            "Period Type": {"select": {"name": ""}},
            "Start Date": {"date": {}},
            "End Date": {"date": {}},
            "Start Day": num(None),
            "Start Month": num(None),
            "Recurrence Freq": {"select": {"name": ""}},
            "Recurrence Interval": num(None),
            "Recurrence Until": {"date": {}},
            "Priority": num(None),
            "Audience Rule": rt(""),
            "Sync To Repo": chk(False),
            "Source File": rt(""),
        })

        title_prop, allowed = resolve_title_prop(db_id, token, "Window ID", campaign_windows_db_name)
        allowed = ensure_properties(db_id, token, template_props, campaign_windows_db_name)

        for camp in campaigns:
            camp_id = camp.get("id", "")
            if not camp_id:
                continue
            camp_page_id = campaign_page_ids.get(camp_id)
            policy = camp.get("period_policy") if isinstance(camp.get("period_policy"), dict) else {}
            mode = str(policy.get("mode", "")).strip()
            windows = list_policy_windows(policy)
            for idx, window in windows:
                flat = build_window_fields_from_policy_window(policy, idx, window)
                window_ref = str(flat.get("id") or f"window_{idx}")
                window_id = f"{camp_id}#{window_ref}"
                props = {
                    "Campaign ID": rt(camp_id),
                    **({"Campaign": rels([camp_page_id])} if (camp_page_id and "Campaign" in allowed) else {}),
                    "Window Ref": rt(window_ref),
                    "Mode": sel(mode),
                    "Period Type": sel(flat.get("period_type", "")),
                    "Start Date": datev(flat.get("start_date", "")),
                    "End Date": datev(flat.get("end_date", "")),
                    "Start Day": num(flat.get("start_day", None)),
                    "Start Month": num(flat.get("start_month", None)),
                    "Recurrence Freq": sel(flat.get("recurrence_freq", "")),
                    "Recurrence Interval": num(flat.get("recurrence_interval", None)),
                    "Recurrence Until": datev(flat.get("recurrence_until", "")),
                    "Priority": num(flat.get("priority", idx)),
                    "Audience Rule": rt(flat.get("audience_rule", "")),
                    "Source File": rt("js/data_campaigns.js"),
                }
                props = build_props(title_prop, window_id, props)
                props = filter_props(props, allowed, f"{campaign_windows_db_name}:{window_id}")
                page_id_existing = query_page_by_title(db_id, title_prop, window_id, token)
                if page_id_existing:
                    update_page(page_id_existing, props, token)
                else:
                    create_page(db_id, props, token)

    if db_allowed("campaign_sections") and campaign_sections_db_name:
        db_id = db_map[campaign_sections_db_name]
        template_props = build_props("Section ID", "__template__", {
            "Campaign ID": rt(""),
            "Campaign": rels([]),
            "Promo ID": rt(""),         # legacy name
            "Promotion": rels([]),      # legacy name
            "Type": rt(""),
            "Label": rt(""),
            "Label (zh-HK)": rt(""),
            "Usage Key": rt(""),
            "Usage Keys": rt(""),
            "Target": num(None),
            "Rate": num(None),
            "Cap Module": rt(""),
            "Unit": rt(""),
            "Unlock Key": rt(""),
            "Unlock Target": num(None),
            "Total Key": rt(""),
            "Eligible Key": rt(""),
            "Markers": rt(""),
            "Tiers": rt(""),
            "Sync To Repo": chk(False),
            "Source File": rt(""),
        })

        title_prop, allowed = resolve_title_prop(db_id, token, "Section ID", campaign_sections_db_name)
        allowed = ensure_properties(db_id, token, template_props, campaign_sections_db_name)

        for camp in campaigns:
            camp_id = camp.get("id", "")
            if not camp_id:
                continue
            camp_page_id = campaign_page_ids.get(camp_id)
            sections = camp.get("sections", []) or []
            for i, s in enumerate(sections, start=1):
                section_id = f"{camp_id}#{i}"
                usage_keys = s.get("usageKeys")
                usage_key = s.get("usageKey")
                props = {
                    "Campaign ID": rt(camp_id),
                    **({"Campaign": rels([camp_page_id])} if (camp_page_id and "Campaign" in allowed) else {}),
                    "Promo ID": rt(camp_id),
                    **({"Promotion": rels([camp_page_id])} if (camp_page_id and "Promotion" in allowed) else {}),
                    "Type": rt(s.get("type", "")),
                    "Label": rt(s.get("label", "")),
                    "Usage Key": rt(usage_key or ""),
                    "Usage Keys": rt(json.dumps(usage_keys, ensure_ascii=False)) if usage_keys is not None else rt(""),
                    "Target": num(s.get("target", None)),
                    "Rate": num(s.get("rate", None)),
                    "Cap Module": rt(s.get("capModule", "")),
                    "Unit": rt(s.get("unit", "")),
                    "Unlock Key": rt(s.get("unlockKey", "")),
                    "Unlock Target": num(s.get("unlockTarget", None)),
                    "Total Key": rt(s.get("totalKey", "")),
                    "Eligible Key": rt(s.get("eligibleKey", "")),
                    "Markers": rt(json.dumps(s.get("markers", []), ensure_ascii=False)) if s.get("markers") is not None else rt(""),
                    "Tiers": rt(json.dumps(s.get("tiers", []), ensure_ascii=False)) if s.get("tiers") is not None else rt(""),
                    "Source File": rt("js/data_campaigns.js"),
                }
                props = build_props(title_prop, section_id, props)
                props = filter_props(props, allowed, f"{campaign_sections_db_name}:{section_id}")
                page_id_existing = query_page_by_title(db_id, title_prop, section_id, token)
                if page_id_existing:
                    update_page(page_id_existing, props, token)
                else:
                    create_page(db_id, props, token)

    if db_allowed("campaign_registry") and campaign_registry_db_name:
        db_id = db_map[campaign_registry_db_name]
        template_props = build_props("Campaign ID", "__template__", {
            "Setting Key": rt(""),
            "Warning Title": rt(""),
            "Warning Desc": rt(""),
            "Source File": rt(""),
        })

        def build_row_props(key, val):
            return {
                "Setting Key": rt(val.get("settingKey", "")),
                "Warning Title": rt(val.get("warningTitle", "")),
                "Warning Desc": rt(val.get("warningDesc", "")),
                "Source File": rt("js/data_campaigns.js"),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label=campaign_registry_db_name,
            default_title_prop="Campaign ID",
            template_props=template_props,
            rows=[(k, v) for k, v in campaign_registry.items()],
            build_row_props=build_row_props,
        )

    if db_allowed("counters_registry") and "Counters Registry" in db_map:
        db_id = db_map["Counters Registry"]
        template_props = build_props("Key", "__template__", {
            "Period Type": rt(""),
            "Anchor": rt(""),
            "Source": rt(""),
            "Ref Type": rt(""),
            "Ref ID": rt(""),
            "Priority": num(None),
            "Source File": rt(""),
        })

        def build_row_props(key, entry):
            return {
                "Period Type": rt(entry.get("periodType", "")),
                "Anchor": rt(json.dumps(entry.get("anchorRef", {}) if entry.get("anchorRef") is not None else {}, ensure_ascii=False) if entry.get("anchorRef") is not None else ""),
                "Source": rt(entry.get("source", "")),
                "Ref Type": rt(entry.get("refType", "")),
                "Ref ID": rt(entry.get("refId", "")),
                "Priority": num(entry.get("priority", None)),
                "Source File": rt("js/data_counters.js"),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Counters Registry",
            default_title_prop="Key",
            template_props=template_props,
            rows=[(k, v) for k, v in counters_registry.items()],
            build_row_props=build_row_props,
        )


def build_overrides_js(overrides):
    header = [
        "// js/data_notion_overrides.js",
        "// Generated by tools/sync_notion.py --pull-overrides",
        "// Only contains whitelisted fields. Core reward logic stays in js/data_*.js.",
    ]
    body = json.dumps(overrides, ensure_ascii=False, indent=2)
    return "\n".join(header) + "\n" + f"const NOTION_OVERRIDES = {body};\n"


def normalize_overrides_entry(entry, fields):
    out = {}
    for key in fields:
        val = entry.get(key, "")
        if val is None or val == "":
            continue
        out[key] = val
    return out


def build_core_overrides_js(overrides):
    header = [
        "// js/data_notion_core_overrides.js",
        "// Generated by tools/sync_notion.py --pull-core",
        "// Core overrides are higher risk: validate with golden cases before merge.",
    ]
    body = json.dumps(overrides, ensure_ascii=False, indent=2)
    return "\n".join(header) + "\n" + f"const NOTION_CORE_OVERRIDES = {body};\n"


def normalize_core_entry(entry, fields):
    out = {}
    for key in fields:
        if key not in entry:
            continue
        val = entry.get(key)
        if val is None:
            continue
        # Allow 0 / false / empty array to be meaningful values.
        if isinstance(val, str) and val == "":
            continue
        out[key] = val
    return out


def parse_json_text(raw, context):
    if raw is None:
        return None
    text = str(raw).strip()
    if text == "":
        return None
    try:
        return json.loads(text)
    except Exception:
        print(f"[warn] {context}: invalid JSON, skipping")
        return None


def normalize_date_text(raw):
    if raw is None:
        return ""
    text = str(raw).strip()
    if not text:
        return ""
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", text)
    return m.group(1) if m else ""


def extract_select_or_text(props, name):
    val = extract_select(props, name)
    if val:
        return val
    return extract_rich_text(props, name)


def extract_date_or_text(props, name):
    val = extract_date(props, name)
    if val:
        return val
    return normalize_date_text(extract_rich_text(props, name))


def parse_text_list(raw):
    text = str(raw or "").strip()
    if not text:
        return []
    parts = re.split(r"[,\n]", text)
    out = []
    seen = set()
    for part in parts:
        item = part.strip()
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def extract_multi_select_or_text_list(props, name):
    values = extract_multi_select(props, name)
    if values:
        return values
    return parse_text_list(extract_rich_text(props, name))


def extract_multi_or_single_values(props, names):
    out = []
    seen = set()
    for name in (names or []):
        values = extract_multi_select_or_text_list(props, name)
        if not values:
            single = extract_select_or_text(props, name).strip()
            if single:
                values = [single]
        for value in values:
            item = str(value or "").strip()
            if not item or item in seen:
                continue
            seen.add(item)
            out.append(item)
    return out


def build_module_flat_fields(module):
    module = module if isinstance(module, dict) else {}

    reward_type = ""
    reward_value = None
    if module.get("rate") is not None:
        reward_type = "percent"
        reward_value = module.get("rate")
    elif module.get("rate_per_x") is not None:
        reward_type = "rate_per_x"
        reward_value = module.get("rate_per_x")
    elif module.get("multiplier") is not None:
        reward_type = "multiplier"
        reward_value = module.get("multiplier")

    apply_mode = str(module.get("mode", "")).strip().lower()
    if not apply_mode and str(module.get("type", "")).strip().lower() == "always":
        apply_mode = "always"

    match = module.get("match") if isinstance(module.get("match"), list) else []

    mission_credit_mode = ""
    if module.get("req_mission_spend") is not None or module.get("req_mission_key"):
        mission_credit_mode = "from_unlock_only" if module.get("retroactive") is False else "retroactive"

    rule_template = "standard_rate"
    mtype = str(module.get("type", "")).strip().lower()
    if mtype == "guru_capped":
        rule_template = "level_capped"
    elif mtype in ("tiered_cap", "tier_cap"):
        rule_template = "tiered_cap"
    elif mission_credit_mode == "from_unlock_only":
        rule_template = "mission_non_retroactive"
    elif mission_credit_mode == "retroactive":
        rule_template = "mission_retroactive"

    return {
        "offer_name": str(module.get("desc", "")).strip(),
        "rule_template": rule_template,
        "apply_mode": apply_mode,
        "reward_type": reward_type,
        "reward_value": reward_value,
        "active_from": normalize_date_text(module.get("valid_from")),
        "active_to": normalize_date_text(module.get("valid_to") or module.get("promo_end")),
        "category_ids": match,
        "mission_spend_target": module.get("req_mission_spend"),
        "mission_credit_mode": mission_credit_mode,
    }


def build_module_core_from_flat_props(row_props, context):
    entry = {}

    offer_name = extract_rich_text(row_props, "Offer Name")
    if offer_name:
        entry["desc"] = offer_name

    reward_type = extract_select_or_text(row_props, "Reward Type").strip().lower()
    reward_value = extract_number(row_props, "Reward Value")
    if reward_value is not None:
        if reward_type in ("percent", "rate"):
            entry["rate"] = reward_value
        elif reward_type == "rate_per_x":
            entry["rate_per_x"] = reward_value
        elif reward_type == "multiplier":
            entry["multiplier"] = reward_value
        elif reward_type:
            print(f"[warn] {context}: unsupported Reward Type '{reward_type}', skipping")

    apply_mode = extract_select_or_text(row_props, "Apply Mode").strip().lower()
    if apply_mode in ("add", "replace"):
        entry["mode"] = apply_mode
    elif apply_mode and apply_mode not in ("always", "base"):
        print(f"[warn] {context}: unsupported Apply Mode '{apply_mode}', skipping")

    active_from = extract_date_or_text(row_props, "Active From")
    if active_from:
        entry["valid_from"] = active_from

    active_to = extract_date_or_text(row_props, "Active To")
    if active_to:
        entry["valid_to"] = active_to
        entry["promo_end"] = active_to

    category_ids = extract_multi_or_single_values(row_props, [
        "Category IDs", "Category", "Categories"
    ])
    if category_ids:
        entry["match"] = category_ids

    mission_target = extract_number(row_props, "Mission Spend Target")
    if mission_target is not None:
        entry["req_mission_spend"] = mission_target

    if "Retroactive" in (row_props or {}):
        entry["retroactive"] = extract_checkbox(row_props, "Retroactive")

    mission_credit_mode = extract_select_or_text(row_props, "Mission Credit Mode").strip().lower()
    if mission_credit_mode in ("from_unlock_only", "mission_non_retroactive", "non_retroactive"):
        entry["retroactive"] = False
    elif mission_credit_mode in ("retroactive", "mission_retroactive"):
        entry["retroactive"] = True
    elif mission_credit_mode:
        print(f"[warn] {context}: unsupported Mission Credit Mode '{mission_credit_mode}', skipping")

    return entry


def build_offer_row_from_module(module_key, module, card_ids):
    module = module if isinstance(module, dict) else {}
    card_ids = card_ids if isinstance(card_ids, list) else []
    flat = build_module_flat_fields(module)

    cap_mode = str(module.get("cap_mode", "")).strip().lower()
    if cap_mode not in ("reward", "spending"):
        cap_mode = "none"
    cap_value = module.get("cap_limit") if cap_mode != "none" else None

    return {
        "offer_name": flat.get("offer_name", ""),
        "rule_template": flat.get("rule_template", ""),
        "card_ids": card_ids,
        "category_ids": flat.get("category_ids", []),
        "apply_mode": flat.get("apply_mode", ""),
        "reward_type": flat.get("reward_type", ""),
        "reward_value": flat.get("reward_value", None),
        "mission_spend_target": flat.get("mission_spend_target", None),
        "mission_credit_mode": flat.get("mission_credit_mode", ""),
        "retroactive": bool(module.get("retroactive", True)),
        "cap_type": cap_mode,
        "cap_value": cap_value,
        "cap_key": str(module.get("cap_key", "")).strip(),
        "period_policy": f"offer:{module_key}",
        "req_mission_key": str(module.get("req_mission_key", "")).strip(),
        "active_from": flat.get("active_from", ""),
        "active_to": flat.get("active_to", ""),
        "display_name_zhhk": str(module.get("display_name_zhhk", "")).strip(),
    }


def build_offer_windows_from_module(module_key, module):
    module = module if isinstance(module, dict) else {}
    flat = build_module_flat_fields(module)
    start_date = flat.get("active_from", "")
    end_date = flat.get("active_to", "")
    if not start_date and not end_date:
        return []
    return [{
        "window_id": f"offer:{module_key}#1",
        "period_policy": f"offer:{module_key}",
        "window_order": 1,
        "start_date": start_date,
        "end_date": end_date,
        "recurrence": "none",
        "recurrence_interval": 1,
        "recurrence_until": "",
    }]


def build_period_policy_flat_fields(policy):
    policy = policy if isinstance(policy, dict) else {}
    windows = policy.get("windows") if isinstance(policy.get("windows"), list) else []
    primary_window = windows[0] if windows and isinstance(windows[0], dict) else {}
    period = policy.get("period") if isinstance(policy.get("period"), dict) else {}
    if not period and isinstance(primary_window.get("period"), dict):
        period = primary_window.get("period")
    recurrence = policy.get("recurrence") if isinstance(policy.get("recurrence"), dict) else {}
    if not recurrence and isinstance(primary_window.get("recurrence"), dict):
        recurrence = primary_window.get("recurrence")

    start_date = normalize_date_text(
        primary_window.get("startDate")
        or primary_window.get("start")
        or primary_window.get("startAt")
        or primary_window.get("start_at")
        or policy.get("startDate")
        or policy.get("start")
        or policy.get("startAt")
        or policy.get("start_at")
        or policy.get("valid_from")
    )
    end_date = normalize_date_text(
        primary_window.get("endDate")
        or primary_window.get("end")
        or primary_window.get("endAt")
        or primary_window.get("end_at")
        or policy.get("endDate")
        or policy.get("end")
        or policy.get("endAt")
        or policy.get("end_at")
        or policy.get("valid_to")
    )
    if not start_date and period.get("type") == "promo":
        start_date = normalize_date_text(period.get("startDate"))
    if not end_date and period.get("type") == "promo":
        end_date = normalize_date_text(period.get("endDate"))

    windows_json = json.dumps(windows, ensure_ascii=False) if windows else ""
    recurrence_until = normalize_date_text(recurrence.get("until"))

    return {
        "mode": str(policy.get("mode", "")).strip(),
        "period_type": str(period.get("type", "")).strip(),
        "start_date": start_date,
        "end_date": end_date,
        "start_day": period.get("startDay"),
        "start_month": period.get("startMonth"),
        "recurrence_freq": str(recurrence.get("freq", "")).strip(),
        "recurrence_interval": recurrence.get("interval"),
        "recurrence_until": recurrence_until,
        "windows_json": windows_json
    }


def build_period_policy_from_flat_props(row_props, context):
    policy = {}

    mode = extract_select_or_text(row_props, "PP Mode")
    if mode:
        policy["mode"] = mode

    period = {}
    period_type = extract_select_or_text(row_props, "PP Period Type")
    if period_type:
        period["type"] = period_type

    start_date = extract_date_or_text(row_props, "PP Start Date")
    end_date = extract_date_or_text(row_props, "PP End Date")
    if start_date and period_type == "promo":
        period["startDate"] = start_date
    if end_date and period_type == "promo":
        period["endDate"] = end_date

    start_day = extract_number(row_props, "PP Start Day")
    if start_day is not None:
        period["startDay"] = int(start_day)
    start_month = extract_number(row_props, "PP Start Month")
    if start_month is not None:
        period["startMonth"] = int(start_month)
    if period:
        policy["period"] = period

    recurrence = {}
    rec_freq = extract_select_or_text(row_props, "PP Recurrence Freq")
    if rec_freq:
        recurrence["freq"] = rec_freq
    rec_interval = extract_number(row_props, "PP Recurrence Interval")
    if rec_interval is not None:
        recurrence["interval"] = int(rec_interval)
    rec_until = extract_date_or_text(row_props, "PP Recurrence Until")
    if rec_until:
        recurrence["until"] = rec_until
    if recurrence:
        policy["recurrence"] = recurrence

    windows_raw = extract_rich_text(row_props, "PP Windows JSON")
    windows = parse_json_text(windows_raw, f"{context}.PP Windows JSON")
    if isinstance(windows, list):
        policy["windows"] = windows

    if not policy:
        return {}

    if start_date and "windows" not in policy and period_type != "promo":
        policy["startDate"] = start_date
    if end_date and "windows" not in policy and period_type != "promo":
        policy["endDate"] = end_date
    return policy


def merge_period_policy(base, patch):
    out = dict(base or {})
    for key, value in (patch or {}).items():
        if value is None:
            continue
        if isinstance(value, str) and value == "":
            continue
        if key in ("period", "recurrence") and isinstance(value, dict):
            merged = dict(out.get(key) if isinstance(out.get(key), dict) else {})
            merged.update(value)
            out[key] = merged
            continue
        out[key] = value
    return out


def list_policy_windows(policy):
    policy = policy if isinstance(policy, dict) else {}
    windows = policy.get("windows") if isinstance(policy.get("windows"), list) else []
    out = []

    if windows:
        for idx, window in enumerate(windows, start=1):
            if not isinstance(window, dict):
                continue
            out.append((idx, window))
        return out

    if policy:
        out.append((1, policy))
    return out


def build_window_fields_from_policy_window(policy, window_idx, window):
    policy = policy if isinstance(policy, dict) else {}
    window = window if isinstance(window, dict) else {}
    period = window.get("period") if isinstance(window.get("period"), dict) else {}
    recurrence = window.get("recurrence") if isinstance(window.get("recurrence"), dict) else {}
    if not recurrence and isinstance(policy.get("recurrence"), dict):
        recurrence = policy.get("recurrence")

    start_date = normalize_date_text(
        window.get("startDate") or window.get("start") or window.get("startAt") or window.get("start_at")
        or policy.get("startDate") or policy.get("start") or policy.get("startAt") or policy.get("start_at")
    )
    end_date = normalize_date_text(
        window.get("endDate") or window.get("end") or window.get("endAt") or window.get("end_at")
        or policy.get("endDate") or policy.get("end") or policy.get("endAt") or policy.get("end_at")
    )
    if not start_date and period.get("type") == "promo":
        start_date = normalize_date_text(period.get("startDate"))
    if not end_date and period.get("type") == "promo":
        end_date = normalize_date_text(period.get("endDate"))
    if not end_date:
        end_date = normalize_date_text(recurrence.get("until"))

    out = {
        "id": str(window.get("id") or f"window_{window_idx}"),
        "priority": int(window.get("priority")) if isinstance(window.get("priority"), (int, float)) else window_idx,
        "start_date": start_date,
        "end_date": end_date,
        "period_type": str(period.get("type", "")).strip(),
        "start_day": period.get("startDay"),
        "start_month": period.get("startMonth"),
        "recurrence_freq": str(recurrence.get("freq", "")).strip(),
        "recurrence_interval": recurrence.get("interval"),
        "recurrence_until": normalize_date_text(recurrence.get("until")),
        "audience_rule": str(window.get("audienceRule") or window.get("audience_rule") or "").strip()
    }
    return out


def build_period_window_from_row_props(row_props, context):
    period = {}
    period_type = extract_select_or_text(row_props, "Period Type")
    if period_type:
        period["type"] = period_type
    start_day = extract_number(row_props, "Start Day")
    if start_day is not None:
        period["startDay"] = int(start_day)
    start_month = extract_number(row_props, "Start Month")
    if start_month is not None:
        period["startMonth"] = int(start_month)

    recurrence = {}
    rec_freq = extract_select_or_text(row_props, "Recurrence Freq")
    if rec_freq:
        recurrence["freq"] = rec_freq
    rec_interval = extract_number(row_props, "Recurrence Interval")
    if rec_interval is not None:
        recurrence["interval"] = int(rec_interval)
    rec_until = extract_date_or_text(row_props, "Recurrence Until")
    if rec_until:
        recurrence["until"] = rec_until

    window = {}
    wid = extract_rich_text(row_props, "Window Ref")
    if wid:
        window["id"] = wid
    start_date = extract_date_or_text(row_props, "Start Date")
    if start_date:
        window["startDate"] = start_date
    end_date = extract_date_or_text(row_props, "End Date")
    if end_date:
        window["endDate"] = end_date
    if period:
        if period.get("type") == "promo":
            if "startDate" in window:
                period["startDate"] = window["startDate"]
            if "endDate" in window:
                period["endDate"] = window["endDate"]
        window["period"] = period
    if recurrence:
        window["recurrence"] = recurrence
    priority = extract_number(row_props, "Priority")
    if priority is not None:
        window["priority"] = int(priority)
    audience_rule = extract_rich_text(row_props, "Audience Rule")
    if audience_rule:
        window["audienceRule"] = audience_rule

    if not window:
        print(f"[warn] {context}: empty period window row, skipping")
        return None
    return window


def sort_period_windows(windows):
    def keyfn(w):
        pri = w.get("priority")
        pri_num = int(pri) if isinstance(pri, (int, float)) else 0
        sd = normalize_date_text(w.get("startDate"))
        ed = normalize_date_text(w.get("endDate"))
        wid = str(w.get("id", ""))
        return (pri_num, sd, ed, wid)

    return sorted((w for w in windows if isinstance(w, dict)), key=keyfn)


def sort_offer_windows(windows):
    def keyfn(w):
        order = w.get("window_order")
        order_num = int(order) if isinstance(order, (int, float)) else 0
        sd = normalize_date_text(w.get("start_date"))
        ed = normalize_date_text(w.get("end_date"))
        return (order_num, sd, ed)

    return sorted((w for w in windows if isinstance(w, dict)), key=keyfn)


def pull_period_windows_for_offers(db_id, token, db_label, policy_ids=None):
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Window ID" if "Window ID" in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping offer period windows pull")
        return {}, []

    wanted = set(policy_ids or [])
    rows_filter = None
    if "Sync To Repo" in allowed and props.get("Sync To Repo", {}).get("type") == "checkbox":
        rows_filter = {"property": "Sync To Repo", "checkbox": {"equals": True}}
    rows = query_database(db_id, token, rows_filter)
    by_policy = {}
    for row in rows:
        row_props = row.get("properties") or {}
        policy_id = extract_rich_text(row_props, "Period Policy")
        if not policy_id:
            continue
        if wanted and policy_id not in wanted:
            continue

        entry = {
            "window_id": extract_title_value(row_props.get(title_prop)),
            "period_policy": policy_id,
            "window_order": extract_number(row_props, "Window Order"),
            "start_date": extract_date_or_text(row_props, "Start Date"),
            "end_date": extract_date_or_text(row_props, "End Date"),
            "recurrence": extract_select_or_text(row_props, "Recurrence").strip().lower(),
            "recurrence_interval": extract_number(row_props, "Recurrence Interval"),
            "recurrence_until": extract_date_or_text(row_props, "Recurrence Until"),
        }
        by_policy.setdefault(policy_id, []).append(entry)

    for pid in list(by_policy.keys()):
        by_policy[pid] = sort_offer_windows(by_policy[pid])

    ack_ids = []
    if "Sync To Repo" in allowed and props.get("Sync To Repo", {}).get("type") == "checkbox":
        for row in rows:
            row_props = row.get("properties") or {}
            policy_id = extract_rich_text(row_props, "Period Policy")
            if wanted and policy_id not in wanted:
                continue
            ack_ids.append(row.get("id"))

    return by_policy, ack_ids


def derive_offer_date_bounds(windows, fallback_from="", fallback_to=""):
    bounds_start = normalize_date_text(fallback_from)
    bounds_end = normalize_date_text(fallback_to)
    for w in (windows or []):
        sd = normalize_date_text(w.get("start_date"))
        ed = normalize_date_text(w.get("end_date"))
        ru = normalize_date_text(w.get("recurrence_until"))
        if sd and (not bounds_start or sd < bounds_start):
            bounds_start = sd
        if ed and (not bounds_end or ed > bounds_end):
            bounds_end = ed
        if ru and (not bounds_end or ru > bounds_end):
            bounds_end = ru
    return bounds_start, bounds_end


def pull_offers_core(offers_db_id, token, offers_db_label, period_windows_db_id=None, period_windows_db_label="Period Windows"):
    db = get_database(offers_db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Offer ID" if "Offer ID" in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {offers_db_label}: missing title property, skipping offer pull")
        return {"cards": {}, "modules": {}, "trackers": {}}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {offers_db_label}: missing 'Sync To Repo' checkbox, skipping offer pull")
        return {"cards": {}, "modules": {}, "trackers": {}}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {offers_db_label}: 'Sync To Repo' is not a checkbox, skipping offer pull")
        return {"cards": {}, "modules": {}, "trackers": {}}, []

    rows = query_database(offers_db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    offer_rows = []
    policy_ids = set()
    for row in rows:
        row_props = row.get("properties") or {}
        offer_id = extract_title_value(row_props.get(title_prop))
        if not offer_id:
            continue
        active = extract_checkbox(row_props, "Active") if "Active" in row_props else True
        if not active:
            continue
        policy_id = extract_rich_text(row_props, "Period Policy") or extract_rich_text(row_props, "Period")
        if policy_id:
            policy_ids.add(policy_id)
        offer_rows.append((offer_id, row))

    windows_by_policy = {}
    windows_ack_ids = []
    if period_windows_db_id and policy_ids:
        try:
            windows_by_policy, windows_ack_ids = pull_period_windows_for_offers(
                period_windows_db_id,
                token,
                period_windows_db_label,
                policy_ids=policy_ids
            )
        except Exception as e:
            print(f"[warn] {period_windows_db_label}: failed to pull offer period windows: {e}")
            windows_by_policy = {}
            windows_ack_ids = []

    cards_out = {}
    modules_out = {}
    trackers_out = {}
    ack_ids = []

    for offer_id, row in offer_rows:
        row_props = row.get("properties") or {}
        module_entry = build_module_core_from_flat_props(row_props, f"{offers_db_label}:{offer_id}")

        if "Offer Name" in row_props and "desc" not in module_entry:
            offer_name = extract_rich_text(row_props, "Offer Name")
            if offer_name:
                module_entry["desc"] = offer_name

        apply_mode = extract_select_or_text(row_props, "Apply Mode").strip().lower()
        category_ids = extract_multi_or_single_values(row_props, [
            "Category IDs", "Category", "Categories"
        ])
        if apply_mode in ("base", "always"):
            module_entry["type"] = "always"
        else:
            module_entry["type"] = "category"
            if category_ids and "match" not in module_entry:
                module_entry["match"] = category_ids

        cap_type = extract_select_or_text(row_props, "Cap Type").strip().lower()
        cap_value = extract_number(row_props, "Cap Value")
        cap_key = extract_rich_text(row_props, "Cap Key")
        if cap_type in ("reward", "spending") and cap_value is not None:
            module_entry["cap_mode"] = cap_type
            module_entry["cap_limit"] = cap_value
            # Do not auto-generate cap_key for existing offers; preserve repo/default key unless explicitly provided.
            if cap_key:
                module_entry["cap_key"] = cap_key

        req_mission_key = extract_rich_text(row_props, "Req Mission Key")
        if req_mission_key:
            module_entry["req_mission_key"] = req_mission_key

        mission_target = module_entry.get("req_mission_spend")

        fallback_from = module_entry.get("valid_from", "")
        fallback_to = module_entry.get("valid_to", "")
        policy_id = extract_rich_text(row_props, "Period Policy") or extract_rich_text(row_props, "Period")
        offer_windows = windows_by_policy.get(policy_id, []) if policy_id else []
        bounds_start, bounds_end = derive_offer_date_bounds(offer_windows, fallback_from, fallback_to)
        if bounds_start:
            module_entry["valid_from"] = bounds_start
        if bounds_end:
            module_entry["valid_to"] = bounds_end
            module_entry["promo_end"] = bounds_end

        module_entry = normalize_core_entry(module_entry, [
            "type",
            "desc",
            "rate", "rate_per_x", "multiplier",
            "mode", "match", "retroactive",
            "promo_end", "valid_from", "valid_to",
            "cap_mode", "cap_limit", "cap_key",
            "secondary_cap_limit", "secondary_cap_key",
            "min_spend", "min_single_spend",
            "req_mission_spend", "req_mission_key",
        ])
        if module_entry:
            modules_out[offer_id] = module_entry

        card_ids = extract_multi_or_single_values(row_props, [
            "Card IDs", "Card", "Cards", "Card ID"
        ])
        for card_id in card_ids:
            if not card_id:
                continue
            card_entry = cards_out.setdefault(card_id, {"reward_modules_add": [], "trackers_add": []})
            if offer_id not in card_entry["reward_modules_add"]:
                card_entry["reward_modules_add"].append(offer_id)

        if mission_target is not None and module_entry.get("req_mission_key"):
            tracker_id = f"{offer_id}_tracker"
            tracker_entry = {
                "type": "mission_tracker",
                "desc": module_entry.get("desc", offer_id),
                "mission_id": offer_id,
                "req_mission_key": module_entry.get("req_mission_key"),
                "effects_on_match": [{"key": module_entry.get("req_mission_key"), "amount": "tx_amount"}],
            }
            if category_ids:
                tracker_entry["match"] = category_ids
            if bounds_start:
                tracker_entry["valid_from"] = bounds_start
            if bounds_end:
                tracker_entry["valid_to"] = bounds_end
                tracker_entry["promo_end"] = bounds_end
            trackers_out[tracker_id] = tracker_entry
            for card_id in card_ids:
                if not card_id:
                    continue
                card_entry = cards_out.setdefault(card_id, {"reward_modules_add": [], "trackers_add": []})
                if tracker_id not in card_entry["trackers_add"]:
                    card_entry["trackers_add"].append(tracker_id)

        ack_ids.append(row.get("id"))

    return {"cards": cards_out, "modules": modules_out, "trackers": trackers_out}, ack_ids + windows_ack_ids


def pull_campaign_windows_core(db_id, token, db_label, campaign_ids=None, sync_only=False):
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Window ID" if "Window ID" in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping period windows pull")
        return {}, []

    wanted = set(campaign_ids or [])
    rows_filter = None
    if sync_only:
        if "Sync To Repo" not in allowed:
            print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, cannot filter synced windows")
            return {}, []
        if props.get("Sync To Repo", {}).get("type") != "checkbox":
            print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, cannot filter synced windows")
            return {}, []
        rows_filter = {"property": "Sync To Repo", "checkbox": {"equals": True}}
    rows = query_database(db_id, token, rows_filter)
    by_campaign = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        row_title = extract_title_value(row_props.get(title_prop))
        campaign_id = extract_rich_text(row_props, "Campaign ID")
        if not campaign_id and row_title and "#" in row_title:
            campaign_id = row_title.split("#", 1)[0].strip()
        if not campaign_id:
            continue
        if wanted and campaign_id not in wanted:
            continue

        window = build_period_window_from_row_props(row_props, f"{db_label}:{row_title or campaign_id}")
        if not window:
            continue
        if "id" not in window:
            window_ref = extract_rich_text(row_props, "Window Ref")
            if window_ref:
                window["id"] = window_ref
            elif row_title and "#" in row_title:
                window["id"] = row_title.split("#", 1)[1].strip()

        by_campaign.setdefault(campaign_id, []).append(window)
        page_ids.append(row.get("id"))

    for cid in list(by_campaign.keys()):
        by_campaign[cid] = sort_period_windows(by_campaign[cid])
    return by_campaign, page_ids


def pull_modules_core(db_id, token, db_label):
    """
    Pull a controlled subset of module-core fields from Notion.
    Gate: only rows with 'Sync To Repo' checked.
    """
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Module Key" if "Module Key" in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping core pull")
        return {}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, skipping core pull")
        return {}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, skipping core pull")
        return {}, []

    rows = query_database(db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    overrides = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if not key:
            continue
        entry = {}

        flat_entry = build_module_core_from_flat_props(row_props, f"{db_label}:{key}")
        if flat_entry:
            entry.update(flat_entry)
            rk = extract_rich_text(row_props, "Req Mission Key") if "Req Mission Key" in row_props else ""
            if rk != "":
                entry["req_mission_key"] = rk
        else:
            # Backward compatibility for older Notion schemas.
            d = extract_rich_text(row_props, "Desc") if "Desc" in row_props else ""
            if d != "":
                entry["desc"] = d

            n = extract_number(row_props, "Rate") if "Rate" in row_props else None
            if n is not None:
                entry["rate"] = n
            n = extract_number(row_props, "Rate Per X") if "Rate Per X" in row_props else None
            if n is not None:
                entry["rate_per_x"] = n
            n = extract_number(row_props, "Multiplier") if "Multiplier" in row_props else None
            if n is not None:
                entry["multiplier"] = n

            pe = extract_date_or_text(row_props, "Promo End") if "Promo End" in row_props else ""
            if pe != "":
                entry["promo_end"] = pe
            vf = extract_date_or_text(row_props, "Valid From") if "Valid From" in row_props else ""
            if vf != "":
                entry["valid_from"] = vf
            vt = extract_date_or_text(row_props, "Valid To") if "Valid To" in row_props else ""
            if vt != "":
                entry["valid_to"] = vt

            cm = extract_rich_text(row_props, "Cap Mode") if "Cap Mode" in row_props else ""
            if cm != "":
                entry["cap_mode"] = cm
            n = extract_number(row_props, "Cap Limit") if "Cap Limit" in row_props else None
            if n is not None:
                entry["cap_limit"] = n
            ck = extract_rich_text(row_props, "Cap Key") if "Cap Key" in row_props else ""
            if ck != "":
                entry["cap_key"] = ck

            n = extract_number(row_props, "Secondary Cap Limit") if "Secondary Cap Limit" in row_props else None
            if n is not None:
                entry["secondary_cap_limit"] = n
            sk = extract_rich_text(row_props, "Secondary Cap Key") if "Secondary Cap Key" in row_props else ""
            if sk != "":
                entry["secondary_cap_key"] = sk

            n = extract_number(row_props, "Min Spend") if "Min Spend" in row_props else None
            if n is not None:
                entry["min_spend"] = n
            n = extract_number(row_props, "Min Single Spend") if "Min Single Spend" in row_props else None
            if n is not None:
                entry["min_single_spend"] = n
            n = extract_number(row_props, "Req Mission Spend") if "Req Mission Spend" in row_props else None
            if n is not None:
                entry["req_mission_spend"] = n
            rk = extract_rich_text(row_props, "Req Mission Key") if "Req Mission Key" in row_props else ""
            if rk != "":
                entry["req_mission_key"] = rk

        if not entry.get("promo_end") and entry.get("valid_to"):
            entry["promo_end"] = entry["valid_to"]

        entry = normalize_core_entry(entry, [
            "desc",
            "rate", "rate_per_x", "multiplier",
            "promo_end", "valid_from", "valid_to",
            "cap_mode", "cap_limit", "cap_key",
            "secondary_cap_limit", "secondary_cap_key",
            "min_spend", "min_single_spend",
            "req_mission_spend", "req_mission_key",
            "mode", "match", "retroactive",
        ])
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))

    return overrides, page_ids


def pull_campaigns_core(db_id, token, db_label, windows_db_id=None, windows_db_label="Campaign Period Windows"):
    """
    Pull campaign-core fields from Notion.
    Gate: only rows with 'Sync To Repo' checked.
    """
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Campaign ID" if "Campaign ID" in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping core pull")
        return {}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, skipping core pull")
        return {}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, skipping core pull")
        return {}, []

    rows = query_database(db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    campaign_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if key:
            campaign_ids.append(key)

    windows_by_campaign = {}
    windows_ack_ids = []
    window_trigger_campaign_ids = set()
    if windows_db_id and campaign_ids:
        try:
            windows_by_campaign, _ = pull_campaign_windows_core(windows_db_id, token, windows_db_label, campaign_ids=campaign_ids)
        except Exception as e:
            print(f"[warn] {windows_db_label}: failed to pull period windows: {e}")
            windows_by_campaign = {}
    elif windows_db_id:
        print(f"[info] {db_label}: no campaign rows with Sync To Repo checked")

    if windows_db_id:
        try:
            synced_windows_by_campaign, synced_window_page_ids = pull_campaign_windows_core(
                windows_db_id,
                token,
                windows_db_label,
                campaign_ids=None,
                sync_only=True
            )
            windows_ack_ids = list(synced_window_page_ids or [])
            window_trigger_campaign_ids = set(synced_windows_by_campaign.keys())
            if window_trigger_campaign_ids:
                for cid, rows in synced_windows_by_campaign.items():
                    if cid not in windows_by_campaign:
                        windows_by_campaign[cid] = rows
        except Exception as e:
            print(f"[warn] {windows_db_label}: failed to pull synced period windows: {e}")

    overrides = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if not key:
            continue
        entry = {}

        period_policy_raw = extract_rich_text(row_props, "Period Policy") if "Period Policy" in row_props else ""
        period_policy = parse_json_text(period_policy_raw, f"{db_label}:{key}.Period Policy")
        base_policy = period_policy if isinstance(period_policy, dict) else {}
        flat_policy = build_period_policy_from_flat_props(row_props, f"{db_label}:{key}")
        merged_policy = merge_period_policy(base_policy, flat_policy)
        windows = windows_by_campaign.get(key) if windows_by_campaign else None
        if isinstance(windows, list) and windows:
            merged_policy["windows"] = windows
            if not merged_policy.get("mode"):
                merged_policy["mode"] = "composite" if len(windows) > 1 else "fixed"
        if isinstance(merged_policy, dict) and merged_policy:
            entry["period_policy"] = merged_policy

        entry = normalize_core_entry(entry, ["period_policy"])
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))

    missing_campaign_ids = sorted([cid for cid in window_trigger_campaign_ids if cid not in overrides])
    for cid in missing_campaign_ids:
        windows = windows_by_campaign.get(cid)
        if not isinstance(windows, list) or not windows:
            continue
        policy = {
            "windows": windows,
            "mode": "composite" if len(windows) > 1 else "fixed"
        }
        overrides[cid] = {"period_policy": policy}

    if not overrides:
        print(f"[warn] {db_label}: no campaign period updates found (check 'Sync To Repo' on Campaigns or Campaign Period Windows)")
    else:
        print(f"[info] {db_label}: pulled {len(overrides)} campaign period policy rows")

    return overrides, page_ids + windows_ack_ids


def pull_cards_core(db_id, token, db_label):
    """
    Pull a controlled subset of card-core fields from Notion.
    Gate: only rows with 'Sync To Repo' checked.
    """
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Card" if "Card" in allowed else ("Card ID" if "Card ID" in allowed else get_title_prop_name(db))
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping core pull")
        return {}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, skipping core pull")
        return {}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, skipping core pull")
        return {}, []

    rows = query_database(db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    overrides = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if not key:
            continue
        entry = {}

        display_name = ""
        if "Display Name (zh-HK)" in row_props:
            display_name = extract_rich_text(row_props, "Display Name (zh-HK)")
        if not display_name and "Display Name" in row_props:
            display_name = extract_rich_text(row_props, "Display Name")
        if display_name:
            entry["name"] = display_name
            entry["display_name_zhhk"] = display_name

        nm = extract_rich_text(row_props, "Name") if "Name" in row_props else ""
        if nm != "" and "name" not in entry:
            entry["name"] = nm
        cur = extract_rich_text(row_props, "Currency") if "Currency" in row_props else ""
        if cur != "":
            entry["currency"] = cur
        ty = extract_rich_text(row_props, "Type") if "Type" in row_props else ""
        if ty != "":
            entry["type"] = ty
        f = extract_number(row_props, "FCF") if "FCF" in row_props else None
        if f is not None:
            entry["fcf"] = f

        bank = extract_rich_text(row_props, "Bank") if "Bank" in row_props else ""
        if bank:
            entry["bank"] = bank

        reward_unit = ""
        if "Reward Unit" in row_props:
            reward_unit = extract_select_or_text(row_props, "Reward Unit").strip()
        if not reward_unit and "Redemption ? Unit" in row_props:
            reward_unit = extract_select_or_text(row_props, "Redemption ? Unit").strip()
        if reward_unit:
            entry["redemption"] = {"unit": reward_unit}

        if "Active" in row_props:
            active = extract_checkbox(row_props, "Active")
            entry["hidden"] = (not active)
            entry["status"] = "active" if active else "inactive"

        entry = normalize_core_entry(entry, [
            "name", "display_name_zhhk",
            "currency", "type", "fcf", "bank",
            "redemption", "status", "hidden"
        ])
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))

    return overrides, page_ids


def pull_categories_core(db_id, token, db_label):
    """
    Pull editable category fields from Notion.
    Gate: only rows with 'Sync To Repo' checked.
    """
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Category" if "Category" in allowed else ("Category Key" if "Category Key" in allowed else get_title_prop_name(db))
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping core pull")
        return {}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, skipping core pull")
        return {}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, skipping core pull")
        return {}, []

    rows = query_database(db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    overrides = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if not key:
            continue
        entry = {}

        label = ""
        if "Display Name (zh-HK)" in row_props:
            label = extract_rich_text(row_props, "Display Name (zh-HK)")
        if not label and "Label" in row_props:
            label = extract_rich_text(row_props, "Label")
        if label:
            entry["label"] = label

        parent = ""
        if "Parent Category" in row_props:
            parent = extract_rich_text(row_props, "Parent Category")
        if not parent and "Parent" in row_props:
            parent = extract_rich_text(row_props, "Parent")
        if parent:
            entry["parent"] = parent

        if "Active" in row_props:
            entry["hidden"] = (not extract_checkbox(row_props, "Active"))
        elif "Hidden" in row_props:
            entry["hidden"] = extract_checkbox(row_props, "Hidden")

        entry = normalize_core_entry(entry, ["label", "parent", "hidden"])
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))

    return overrides, page_ids


def pull_db_overrides(db_id, token, db_label, default_title_prop, field_specs):
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = default_title_prop if default_title_prop in allowed else get_title_prop_name(db)
    if not title_prop:
        print(f"[warn] {db_label}: missing title property, skipping")
        return {}, []
    if "Sync To Repo" not in allowed:
        print(f"[warn] {db_label}: missing 'Sync To Repo' checkbox, skipping pull")
        return {}, []
    if props.get("Sync To Repo", {}).get("type") != "checkbox":
        print(f"[warn] {db_label}: 'Sync To Repo' is not a checkbox, skipping pull")
        return {}, []

    rows = query_database(db_id, token, {"property": "Sync To Repo", "checkbox": {"equals": True}})
    overrides = {}
    page_ids = []
    for row in rows:
        row_props = row.get("properties") or {}
        key = extract_title_value(row_props.get(title_prop))
        if not key:
            continue
        entry = {}
        for prop_name, out_key, extractor in field_specs:
            val = extractor(row_props, prop_name) if prop_name in row_props else ""
            if val is None or val == "":
                continue
            entry[out_key] = val
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))
    return overrides, page_ids


def pull_overrides(repo_root, page_url, token, overrides_out, pull_dbs=None, ack=False):
    page_id = extract_id_from_url(page_url)
    if not page_id:
        die("Could not parse page ID from URL")

    db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}
    for title, db_id in (discover_linked_databases(page_id, token) or {}).items():
        if title not in db_map:
            db_map[title] = db_id
    campaign_db_name = pick_db_name(db_map, "Campaigns", ["Promotions"])
    campaign_windows_db_name = pick_db_name(db_map, "Campaign Period Windows", ["Promotion Period Windows", "Campaign Windows"])
    campaign_sections_db_name = pick_db_name(db_map, "Campaign Sections", ["Promotion Sections"])

    allowed_set = None
    if pull_dbs:
        allowed_set = set([d.strip().lower() for d in pull_dbs if d and d.strip()])

    overrides = {
        "version": 1,
        "cards": {},
        "modules": {},
        "campaigns": {},
        "campaignSections": {},
        "conversions": {}
    }
    ack_ids = []

    def db_allowed(name):
        if not allowed_set:
            return True
        return name in allowed_set

    if db_allowed("cards") and db_map.get("Cards"):
        fields = [
            ("Display Name (zh-HK)", "display_name_zhhk", extract_rich_text),
            ("Note (zh-HK)", "note_zhhk", extract_rich_text),
            ("Status", "status", extract_select),
            ("Last Verified", "last_verified_at", extract_date),
            ("Source URL", "source_url", extract_url),
            ("Source Title", "source_title", extract_rich_text),
        ]
        data, ids = pull_db_overrides(db_map["Cards"], token, "Cards", "Card ID", fields)
        card_out = {}
        for k, v in sorted(data.items()):
            entry = normalize_overrides_entry(v, ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title"])
            if entry:
                card_out[k] = entry
        overrides["cards"] = card_out
        ack_ids.extend(ids)

    if db_allowed("modules") and db_map.get("Modules"):
        fields = [
            ("Display Name (zh-HK)", "display_name_zhhk", extract_rich_text),
            ("Note (zh-HK)", "note_zhhk", extract_rich_text),
            ("Status", "status", extract_select),
            ("Last Verified", "last_verified_at", extract_date),
            ("Source URL", "source_url", extract_url),
            ("Source Title", "source_title", extract_rich_text),
            ("Unit Override", "unit_override", extract_rich_text),
        ]
        data, ids = pull_db_overrides(db_map["Modules"], token, "Modules", "Module Key", fields)
        module_out = {}
        for k, v in sorted(data.items()):
            entry = normalize_overrides_entry(v, ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title", "unit_override"])
            if entry:
                module_out[k] = entry
        overrides["modules"] = module_out
        ack_ids.extend(ids)

    if db_allowed("campaigns") and campaign_db_name and db_map.get(campaign_db_name):
        fields = [
            ("Display Name (zh-HK)", "display_name_zhhk", extract_rich_text),
            ("Note (zh-HK)", "note_zhhk", extract_rich_text),
            ("Status", "status", extract_select),
            ("Last Verified", "last_verified_at", extract_date),
            ("Source URL", "source_url", extract_url),
            ("Source Title", "source_title", extract_rich_text),
        ]
        data, ids = pull_db_overrides(db_map[campaign_db_name], token, campaign_db_name, "Campaign ID", fields)
        campaign_out = {}
        for k, v in sorted(data.items()):
            entry = normalize_overrides_entry(v, ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title"])
            if entry:
                campaign_out[k] = entry
        overrides["campaigns"] = campaign_out
        ack_ids.extend(ids)

    if db_allowed("campaign sections") and campaign_sections_db_name and db_map.get(campaign_sections_db_name):
        fields = [
            ("Label (zh-HK)", "label_zhhk", extract_rich_text),
        ]
        data, ids = pull_db_overrides(db_map[campaign_sections_db_name], token, campaign_sections_db_name, "Section ID", fields)
        section_out = {}
        for k, v in sorted(data.items()):
            entry = normalize_overrides_entry(v, ["label_zhhk"])
            if entry:
                section_out[k] = entry
        overrides["campaignSections"] = section_out
        ack_ids.extend(ids)

    if db_allowed("conversions") and db_map.get("Conversions"):
        fields = [
            ("Note (zh-HK)", "note_zhhk", extract_rich_text),
            ("Last Verified", "last_verified_at", extract_date),
            ("Source URL", "source_url", extract_url),
            ("Source Title", "source_title", extract_rich_text),
        ]
        data, ids = pull_db_overrides(db_map["Conversions"], token, "Conversions", "Conversion Src", fields)
        conv_out = {}
        for k, v in sorted(data.items()):
            entry = normalize_overrides_entry(v, ["note_zhhk", "last_verified_at", "source_url", "source_title"])
            if entry:
                conv_out[k] = entry
        overrides["conversions"] = conv_out
        ack_ids.extend(ids)

    out_path = overrides_out if os.path.isabs(overrides_out) else os.path.join(repo_root, overrides_out)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(build_overrides_js(overrides))
    print(f"Wrote overrides: {out_path}")

    if ack and ack_ids:
        for page_id in ack_ids:
            try:
                update_page(page_id, {"Sync To Repo": {"checkbox": False}}, token)
            except Exception as e:
                print(f"[warn] failed to ack page {page_id}: {e}")

    return ack_ids


def pull_core(repo_root, page_url, token, core_out_path, core_dbs=None, ack=False):
    page_id = extract_id_from_url(page_url)
    if not page_id:
        die("Could not parse page ID from URL")

    db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}
    for title, db_id in (discover_linked_databases(page_id, token) or {}).items():
        if title not in db_map:
            db_map[title] = db_id
    campaign_db_name = pick_db_name(db_map, "Campaigns", ["Promotions"])
    campaign_windows_db_name = pick_db_name(db_map, "Campaign Period Windows", ["Promotion Period Windows", "Campaign Windows"])
    offers_db_name = pick_db_name(db_map, "Offers", [])
    period_windows_db_name = pick_db_name(db_map, "Period Windows", [])

    allowed_set = None
    if core_dbs:
        allowed_set = set([d.strip().lower() for d in core_dbs if d and d.strip()])
    elif offers_db_name:
        # Safe default: keep pull-core focused on naming/unit edits.
        # Pull Offers explicitly with --core-db offers when you want structural rule updates.
        allowed_set = set(["cards", "categories"])

    def db_allowed(name):
        if not allowed_set:
            return True
        return name in allowed_set

    overrides = {"version": 1, "cards": {}, "categories": {}, "modules": {}, "trackers": {}, "campaigns": {}}
    ack_ids = []

    if db_allowed("cards") and db_map.get("Cards"):
        data, ids = pull_cards_core(db_map["Cards"], token, "Cards")
        cards_out = {}
        for k, v in sorted(data.items()):
            cards_out[k] = v
        overrides["cards"] = cards_out
        ack_ids.extend(ids)
    else:
        if db_allowed("cards"):
            print("[warn] pull-core: 'Cards' database not found under this page")

    if db_allowed("categories") and db_map.get("Categories"):
        data, ids = pull_categories_core(db_map["Categories"], token, "Categories")
        categories_out = {}
        for k, v in sorted(data.items()):
            categories_out[k] = v
        overrides["categories"] = categories_out
        ack_ids.extend(ids)
    else:
        if db_allowed("categories"):
            print("[warn] pull-core: 'Categories' database not found under this page")

    if db_allowed("modules") and db_map.get("Modules"):
        data, ids = pull_modules_core(db_map["Modules"], token, "Modules")
        modules_out = {}
        for k, v in sorted(data.items()):
            modules_out[k] = v
        overrides["modules"] = modules_out
        ack_ids.extend(ids)
    else:
        if db_allowed("modules"):
            print("[warn] pull-core: 'Modules' database not found under this page")

    if db_allowed("offers") and offers_db_name and db_map.get(offers_db_name):
        data, ids = pull_offers_core(
            db_map[offers_db_name],
            token,
            offers_db_name,
            period_windows_db_id=(db_map.get(period_windows_db_name) if period_windows_db_name else None),
            period_windows_db_label=(period_windows_db_name or "Period Windows")
        )
        offer_modules = data.get("modules") if isinstance(data, dict) else {}
        offer_trackers = data.get("trackers") if isinstance(data, dict) else {}
        offer_cards = data.get("cards") if isinstance(data, dict) else {}
        if isinstance(offer_modules, dict) and offer_modules:
            merged = dict(overrides.get("modules") or {})
            merged.update(offer_modules)
            overrides["modules"] = merged
        if isinstance(offer_trackers, dict) and offer_trackers:
            merged = dict(overrides.get("trackers") or {})
            merged.update(offer_trackers)
            overrides["trackers"] = merged
        if isinstance(offer_cards, dict) and offer_cards:
            base_cards = dict(overrides.get("cards") or {})
            for cid, entry in offer_cards.items():
                existing = base_cards.get(cid) if isinstance(base_cards.get(cid), dict) else {}
                merged_entry = dict(existing)
                for add_key in ("reward_modules_add", "trackers_add"):
                    values = entry.get(add_key) if isinstance(entry, dict) else None
                    if not isinstance(values, list) or not values:
                        continue
                    current = merged_entry.get(add_key) if isinstance(merged_entry.get(add_key), list) else []
                    for val in values:
                        if val not in current:
                            current.append(val)
                    merged_entry[add_key] = current
                if merged_entry:
                    base_cards[cid] = merged_entry
            overrides["cards"] = base_cards
        ack_ids.extend(ids)
    else:
        if db_allowed("offers"):
            print("[warn] pull-core: 'Offers' database not found under this page")

    if db_allowed("campaigns") and campaign_db_name and db_map.get(campaign_db_name):
        windows_db_id = db_map.get(campaign_windows_db_name) if campaign_windows_db_name else None
        data, ids = pull_campaigns_core(
            db_map[campaign_db_name],
            token,
            campaign_db_name,
            windows_db_id=windows_db_id,
            windows_db_label=campaign_windows_db_name or "Campaign Period Windows"
        )
        campaigns_out = {}
        for k, v in sorted(data.items()):
            campaigns_out[k] = v
        overrides["campaigns"] = campaigns_out
        ack_ids.extend(ids)
    else:
        if db_allowed("campaigns"):
            print("[warn] pull-core: 'Campaigns' database not found under this page")

    out_path = core_out_path if os.path.isabs(core_out_path) else os.path.join(repo_root, core_out_path)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(build_core_overrides_js(overrides))
    print(f"Wrote core overrides: {out_path}")

    if ack and ack_ids:
        for page_id in ack_ids:
            try:
                update_page(page_id, {"Sync To Repo": {"checkbox": False}}, token)
            except Exception as e:
                print(f"[warn] failed to ack page {page_id}: {e}")

    return ack_ids


def ack_sync_to_repo(token, page_ids):
    ids = sorted(set([i for i in (page_ids or []) if i]))
    for page_id in ids:
        try:
            update_page(page_id, {"Sync To Repo": {"checkbox": False}}, token)
        except Exception as e:
            print(f"[warn] failed to ack page {page_id}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Sync repo data to Notion (optional) and/or dump DATA JSON")
    parser.add_argument("--page-url", help="Notion page URL that contains the child databases")
    parser.add_argument("--bootstrap", action="store_true", help="Create expected child databases under the page if missing (bootstrap-only unless combined with pull flags)")
    parser.add_argument("--bootstrap-db", action="append", help="Limit bootstrap to selected databases (repeatable, e.g. cards, categories, offers, period_windows)")
    parser.add_argument("--bootstrap-full", action="store_true", help="Bootstrap full legacy set of databases (Cards/Categories/Modules/Trackers/Conversions/Campaign* etc.)")
    parser.add_argument("--sync-db", action="append", help="Limit repo->Notion sync tables (repeatable; default is cards/categories/offers/period_windows when those DBs exist)")
    parser.add_argument("--dump", help="Write a JSON dump of DATA to this file (for offline inspection)")
    parser.add_argument("--pull-all", action="store_true", help="Pull both overrides + core (single ack) into js/data_notion_overrides.js and js/data_notion_core_overrides.js")
    parser.add_argument("--pull-overrides", action="store_true", help="Pull Notion overrides into js/data_notion_overrides.js")
    parser.add_argument("--overrides-out", default="js/data_notion_overrides.js", help="Output path for overrides JS")
    parser.add_argument("--pull-db", action="append", help="Limit override pull to specific DBs (repeatable)")
    parser.add_argument("--pull-core", action="store_true", help="Pull Notion core edits into js/data_notion_core_overrides.js (default: cards+categories; add --core-db offers for offer/rule updates)")
    parser.add_argument("--core-out", default="js/data_notion_core_overrides.js", help="Output path for core overrides JS")
    parser.add_argument("--core-db", action="append", help="Limit core pull to specific DBs (repeatable, e.g. 'cards', 'categories', 'offers', 'modules', 'campaigns')")
    parser.add_argument("--ack", action="store_true", help="After pulling, uncheck Sync To Repo for pulled rows")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data = load_data_via_node(repo_root)

    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote dump: {args.dump}")

    if not args.page_url:
        if args.pull_all:
            die("--pull-all requires --page-url")
        if args.pull_overrides:
            die("--pull-overrides requires --page-url")
        if args.pull_core:
            die("--pull-core requires --page-url")
        return

    token = os.environ.get("NOTION_TOKEN")
    if not token:
        die("NOTION_TOKEN is not set")

    if args.bootstrap:
        page_id = extract_id_from_url(args.page_url)
        if not page_id:
            die("Could not parse page ID from URL")
        selected = normalize_bootstrap_selection(args.bootstrap_db, full=bool(args.bootstrap_full))
        bootstrap_child_databases(page_id, token, selected_titles=selected)

    pull_ops = int(bool(args.pull_all)) + int(bool(args.pull_overrides)) + int(bool(args.pull_core))
    if pull_ops > 1:
        die("Use only one of --pull-all, --pull-overrides, or --pull-core.")

    # Keep --bootstrap as a pure setup action unless explicit pull is requested.
    if args.bootstrap and pull_ops == 0:
        return

    if args.pull_all:
        core_ids = pull_core(repo_root, args.page_url, token, args.core_out, core_dbs=args.core_db, ack=False)
        over_ids = pull_overrides(repo_root, args.page_url, token, args.overrides_out, pull_dbs=args.pull_db, ack=False)
        if args.ack:
            ack_sync_to_repo(token, list(core_ids or []) + list(over_ids or []))
        return

    if args.pull_overrides:
        pull_overrides(repo_root, args.page_url, token, args.overrides_out, pull_dbs=args.pull_db, ack=args.ack)
        return

    if args.pull_core:
        pull_core(repo_root, args.page_url, token, args.core_out, core_dbs=args.core_db, ack=args.ack)
        return

    sync(repo_root, args.page_url, token, sync_dbs=args.sync_db)
    print("Sync complete")


if __name__ == "__main__":
    main()
