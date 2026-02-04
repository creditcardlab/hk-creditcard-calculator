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


def main():
    parser = argparse.ArgumentParser(description="Sync repo data to Notion (optional) and/or dump DATA JSON")
    parser.add_argument("--page-url", help="Notion page URL that contains the child databases")
    parser.add_argument("--bootstrap", action="store_true", help="Create the expected child databases under the page if missing")
    parser.add_argument("--dump", help="Write a JSON dump of DATA to this file (for offline inspection)")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data = load_data_via_node(repo_root)

    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote dump: {args.dump}")

    if not args.page_url:
        return

    token = os.environ.get("NOTION_TOKEN")
    if not token:
        die("NOTION_TOKEN is not set")

    if args.bootstrap:
        page_id = extract_id_from_url(args.page_url)
        if not page_id:
            die("Could not parse page ID from URL")
        bootstrap_child_databases(page_id, token)

    sync(repo_root, args.page_url, token)
    print("Sync complete")


if __name__ == "__main__":
    main()
