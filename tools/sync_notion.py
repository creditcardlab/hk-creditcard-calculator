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


def bootstrap_child_databases(page_id, token):
    """
    Ensure the Notion page has the expected child databases used by this repo.
    Creates any missing databases with a stable title property name so upserts work.
    """
    required = [
        ("Cards", "Card ID"),
        ("Categories", "Category Key"),
        ("Modules", "Module Key"),
        ("Trackers", "Tracker Key"),
        ("Conversions", "Conversion Src"),
        ("Campaigns", "Campaign ID"),
        ("Campaign Sections", "Section ID"),
        ("Campaign Registry", "Campaign ID"),
        ("Counters Registry", "Key"),
    ]

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


def sync(repo_root, page_url, token):
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

    campaign_db_name = pick_db_name(db_map, "Campaigns", ["Promotions"])
    campaign_sections_db_name = pick_db_name(db_map, "Campaign Sections", ["Promotion Sections"])
    campaign_registry_db_name = pick_db_name(db_map, "Campaign Registry", ["Promo Registry"])

    card_page_ids = {}
    campaign_page_ids = {}

    if "Cards" in db_map:
        db_id = db_map["Cards"]
        template_props = build_props("Card ID", "__template__", {
            "Name": rt(""),
            "Currency": rt(""),
            "Type": rt(""),
            "FCF": num(None),
            "Reward Modules": rt(""),
            "Trackers": rt(""),
            "Modules": rt(""),  # legacy combined view
            "Reward Module Count": num(None),
            "Tracker Count": num(None),
            "Redemption": rt(""),
            "Redemption ? Unit": rt(""),
            "Redemption ? Min": num(None),
            "Redemption ? Fee": rt(""),
            "Redemption ? Ratio": rt(""),
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
            reward_modules = c.get("rewardModules", []) or []
            tracker_ids = c.get("trackers", []) or []
            combined = list(reward_modules) + list(tracker_ids)
            red = c.get("redemption") or {}
            return {
                "Name": rt(c.get("name", "")),
                "Currency": rt(c.get("currency", "")),
                "Type": rt(c.get("type", "")),
                "FCF": num(c.get("fcf", 0)),
                "Reward Modules": rt(json.dumps(reward_modules, ensure_ascii=False)),
                "Trackers": rt(json.dumps(tracker_ids, ensure_ascii=False)),
                "Modules": rt(json.dumps(combined, ensure_ascii=False)),
                "Reward Module Count": num(len(reward_modules)),
                "Tracker Count": num(len(tracker_ids)),
                "Redemption": rt(json.dumps(red, ensure_ascii=False) if red else ""),
                "Redemption ? Unit": rt(red.get("unit", "")),
                "Redemption ? Min": num(red.get("min", None)),
                "Redemption ? Fee": rt(red.get("fee", "")),
                "Redemption ? Ratio": rt(red.get("ratio", "")),
                "Source File": rt("js/data_cards.js"),
            }

        card_page_ids = sync_table(
            db_id=db_id,
            token=token,
            db_label="Cards",
            default_title_prop="Card ID",
            template_props=template_props,
            rows=[(c.get("id", ""), c) for c in cards if c.get("id")],
            build_row_props=build_row_props,
        )

    if "Categories" in db_map:
        db_id = db_map["Categories"]
        template_props = build_props("Category Key", "__template__", {
            "Label": rt(""),
            "Order": num(None),
            "Parent": rt(""),
            "Hidden": chk(False),
            "Red Hot": rt(""),
            "Req": rt(""),
            "Source File": rt(""),
        })

        def build_row_props(key, c):
            return {
                "Label": rt(c.get("label", "")),
                "Order": num(c.get("order", None)),
                "Parent": rt(c.get("parent", "")),
                "Hidden": chk(c.get("hidden", False)),
                "Red Hot": rt(c.get("red_hot", "")),
                "Req": rt(c.get("req", "")),
                "Source File": rt("js/data_categories.js"),
            }

        sync_table(
            db_id=db_id,
            token=token,
            db_label="Categories",
            default_title_prop="Category Key",
            template_props=template_props,
            rows=[(k, v) for k, v in categories.items()],
            build_row_props=build_row_props,
        )

    if "Modules" in db_map:
        db_id = db_map["Modules"]
        template_props = build_props("Module Key", "__template__", {
            "Type": rt(""),
            "Desc": rt(""),
            "Data": rt(""),
            "Rate": num(None),
            "Rate Per X": num(None),
            "Multiplier": num(None),
            "Promo End": rt(""),
            "Valid From": rt(""),
            "Valid To": rt(""),
            "Category": rt(""),
            "Match": mselect([]),
            "Mode": rt(""),
            "Cap Mode": rt(""),
            "Cap Limit": num(None),
            "Cap Key": rt(""),
            "Secondary Cap Limit": num(None),
            "Secondary Cap Key": rt(""),
            "Min Spend": num(None),
            "Min Single Spend": num(None),
            "Req Mission Spend": num(None),
            "Req Mission Key": rt(""),
            "Setting Key": rt(""),
            "Usage Key": rt(""),
            "Config": rt(""),
            "Display Name (zh-HK)": rt(""),
            "Note (zh-HK)": rt(""),
            "Status": {"select": {"name": ""}},
            "Last Verified": {"date": {}},
            "Source URL": {"url": ""},
            "Source Title": rt(""),
            "Unit Override": rt(""),
            "Sync To Repo": chk(False),
            "Source File": rt(""),
        })

        def build_row_props(key, m):
            match = m.get("match", []) if isinstance(m.get("match", None), list) else []
            return {
                "Type": rt(m.get("type", "")),
                "Desc": rt(m.get("desc", "")),
                "Data": rt(json.dumps(m, ensure_ascii=False)),
                "Rate": num(m.get("rate", None)),
                "Rate Per X": num(m.get("rate_per_x", None)),
                "Multiplier": num(m.get("multiplier", None)),
                "Promo End": rt(m.get("promo_end", "")),
                "Valid From": rt(m.get("valid_from", "")),
                "Valid To": rt(m.get("valid_to", "")),
                "Category": rt(m.get("category", "")),
                "Match": mselect(match),
                "Mode": rt(m.get("mode", "")),
                "Cap Mode": rt(m.get("cap_mode", "")),
                "Cap Limit": num(m.get("cap_limit", None)),
                "Cap Key": rt(m.get("cap_key", "")),
                "Secondary Cap Limit": num(m.get("secondary_cap_limit", None)),
                "Secondary Cap Key": rt(m.get("secondary_cap_key", "")),
                "Min Spend": num(m.get("min_spend", None)),
                "Min Single Spend": num(m.get("min_single_spend", None)),
                "Req Mission Spend": num(m.get("req_mission_spend", None)),
                "Req Mission Key": rt(m.get("req_mission_key", "")),
                "Setting Key": rt(m.get("setting_key", "")),
                "Usage Key": rt(m.get("usage_key", "")),
                "Config": rt(json.dumps(m.get("config", {}) if m.get("config") is not None else {}, ensure_ascii=False) if m.get("config") is not None else ""),
                "Source File": rt("js/data_modules.js"),
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

    if "Trackers" in db_map:
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

    if "Conversions" in db_map:
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

    if campaign_db_name:
        db_id = db_map[campaign_db_name]
        template_props = build_props("Campaign ID", "__template__", {
            "Name": rt(""),
            "Theme": rt(""),
            "Icon": rt(""),
            "Badge": rt(""),
            "Cards": rt(""),
            "Cap Keys": rt(""),
            "Period": rt(""),
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
            return {
                "Name": rt(c.get("name", "")),
                "Theme": rt(c.get("theme", "")),
                "Icon": rt(c.get("icon", "")),
                "Badge": rt(json.dumps(c.get("badge", {}) if c.get("badge") is not None else {}, ensure_ascii=False)),
                "Cards": rt(json.dumps(c.get("cards", []) if c.get("cards") is not None else [], ensure_ascii=False)),
                "Cap Keys": rt(json.dumps(c.get("capKeys", []) if c.get("capKeys") is not None else [], ensure_ascii=False)),
                "Period": rt(json.dumps(c.get("period", {}) if c.get("period") is not None else {}, ensure_ascii=False) if c.get("period") is not None else ""),
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

    if campaign_sections_db_name:
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

    if campaign_registry_db_name:
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

    if "Counters Registry" in db_map:
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

        # Only pull fields that map 1:1 onto module objects.
        # Keep this conservative: avoid structural changes (type/mode/match/category) via Notion.
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

        pe = extract_rich_text(row_props, "Promo End") if "Promo End" in row_props else ""
        if pe != "":
            entry["promo_end"] = pe
        vf = extract_rich_text(row_props, "Valid From") if "Valid From" in row_props else ""
        if vf != "":
            entry["valid_from"] = vf
        vt = extract_rich_text(row_props, "Valid To") if "Valid To" in row_props else ""
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

        entry = normalize_core_entry(entry, [
            "desc",
            "rate", "rate_per_x", "multiplier",
            "promo_end", "valid_from", "valid_to",
            "cap_mode", "cap_limit", "cap_key",
            "secondary_cap_limit", "secondary_cap_key",
            "min_spend", "min_single_spend",
            "req_mission_spend", "req_mission_key",
        ])
        if entry:
            overrides[key] = entry
            page_ids.append(row.get("id"))

    return overrides, page_ids


def pull_cards_core(db_id, token, db_label):
    """
    Pull a controlled subset of card-core fields from Notion.
    Gate: only rows with 'Sync To Repo' checked.
    """
    db = get_database(db_id, token)
    props = db.get("properties") or {}
    allowed = set(props.keys())
    title_prop = "Card ID" if "Card ID" in allowed else get_title_prop_name(db)
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

        nm = extract_rich_text(row_props, "Name") if "Name" in row_props else ""
        if nm != "":
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

        entry = normalize_core_entry(entry, ["name", "currency", "type", "fcf"])
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

    allowed_set = None
    if core_dbs:
        allowed_set = set([d.strip().lower() for d in core_dbs if d and d.strip()])

    def db_allowed(name):
        if not allowed_set:
            return True
        return name in allowed_set

    overrides = {"version": 1, "cards": {}, "modules": {}}
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
    parser.add_argument("--bootstrap", action="store_true", help="Create the expected child databases under the page if missing")
    parser.add_argument("--dump", help="Write a JSON dump of DATA to this file (for offline inspection)")
    parser.add_argument("--pull-all", action="store_true", help="Pull both overrides + core (single ack) into js/data_notion_overrides.js and js/data_notion_core_overrides.js")
    parser.add_argument("--pull-overrides", action="store_true", help="Pull Notion overrides into js/data_notion_overrides.js")
    parser.add_argument("--overrides-out", default="js/data_notion_overrides.js", help="Output path for overrides JS")
    parser.add_argument("--pull-db", action="append", help="Limit override pull to specific DBs (repeatable)")
    parser.add_argument("--pull-core", action="store_true", help="Pull Notion core edits (MVP: Cards + Modules) into js/data_notion_core_overrides.js")
    parser.add_argument("--core-out", default="js/data_notion_core_overrides.js", help="Output path for core overrides JS")
    parser.add_argument("--core-db", action="append", help="Limit core pull to specific DBs (repeatable, e.g. 'modules')")
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
        bootstrap_child_databases(page_id, token)

    pull_ops = int(bool(args.pull_all)) + int(bool(args.pull_overrides)) + int(bool(args.pull_core))
    if pull_ops > 1:
        die("Use only one of --pull-all, --pull-overrides, or --pull-core.")

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

    sync(repo_root, args.page_url, token)
    print("Sync complete")


if __name__ == "__main__":
    main()
