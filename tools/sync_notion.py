
import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

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
    return [s[i:i+size] for i in range(0, len(s), size)]


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
            return notion_request(method, url, token, body=body, retry=retry-1)
        detail = e.read().decode("utf-8")
        raise RuntimeError(f"Notion API error {e.code}: {detail}")


def get_database(database_id, token):
    url = f"{API_BASE}/databases/{database_id}"
    return notion_request("GET", url, token)


def extract_id_from_url(url):
    # Accept UUID with or without dashes, or 32 hex chars in URL.
    m = re.search(r"([0-9a-fA-F]{32})", url)
    if m:
        return m.group(1)
    m = re.search(r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", url)
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


def query_page_by_title(database_id, title_prop, key, token):
    url = f"{API_BASE}/databases/{database_id}/query"
    body = {
        "filter": {
            "property": title_prop,
            "title": {"equals": key}
        }
    }
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
    out = {
        title_prop: {"title": [{"text": {"content": title_value}}]}
    }
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


def update_database(database_id, token, properties):
    url = f"{API_BASE}/databases/{database_id}"
    body = {"properties": properties}
    return notion_request("PATCH", url, token, body=body)


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
    node_script = r"""
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=process.cwd();
const ctx={};
vm.createContext(ctx);
['js/data_cards.js','js/data_categories.js','js/data_modules.js','js/data_conversions.js','js/data_rules.js','js/data_promotions.js']
  .forEach(f=>{vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});});
vm.runInContext('this.cardsDB=cardsDB;this.categoriesDB=categoriesDB;this.modulesDB=modulesDB;this.conversionDB=conversionDB;this.DATA_RULES=DATA_RULES;this.PROMOTIONS=PROMOTIONS;this.PROMO_REGISTRY=PROMO_REGISTRY;',ctx);
const out={cards:ctx.cardsDB,categories:ctx.categoriesDB,modules:ctx.modulesDB,conversions:ctx.conversionDB,rules:ctx.DATA_RULES,promotions:ctx.PROMOTIONS,promoRegistry:ctx.PROMO_REGISTRY};
process.stdout.write(JSON.stringify(out));
"""
    result = subprocess.check_output(["node", "-e", node_script], cwd=repo_root, text=True, encoding="utf-8")
    return json.loads(result)


def sync(repo_root, page_url, token):
    page_id = extract_id_from_url(page_url)
    if not page_id:
        die("Could not parse page ID from URL")

    db_map = {title: db_id for title, db_id in list_child_databases(page_id, token)}

    data = load_data_via_node(repo_root)
    promo_page_ids = {}

    # Cards
    if "Cards" in db_map:
        db_id = db_map["Cards"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Card ID", "Cards")
        template_props = build_props(title_prop, "__template__", {
            "Name": rt(""),
            "Currency": rt(""),
            "Type": rt(""),
            "FCF": num(None),
            "Modules": rt(""),
            "Redemption": rt(""),
            "Redemption ? Unit": rt(""),
            "Redemption ? Min": num(None),
            "Redemption ? Fee": rt(""),
            "Redemption ? Ratio": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Cards")
        for c in data["cards"]:
            key = c.get("id", "")
            props = build_props(title_prop, key, {
                "Name": rt(c.get("name", "")),
                "Currency": rt(c.get("currency", "")),
                "Type": rt(c.get("type", "")),
                "FCF": num(c.get("fcf", 0)),
                "Modules": rt(json.dumps(c.get("modules", []), ensure_ascii=False)),
                "Redemption": rt(json.dumps(c.get("redemption", {}) if c.get("redemption") is not None else {}, ensure_ascii=False) if c.get("redemption") is not None else ""),
                "Redemption ? Unit": rt((c.get("redemption") or {}).get("unit", "")),
                "Redemption ? Min": num((c.get("redemption") or {}).get("min", None)),
                "Redemption ? Fee": rt((c.get("redemption") or {}).get("fee", "")),
                "Redemption ? Ratio": rt((c.get("redemption") or {}).get("ratio", "")),
                "Source File": rt("js/data_cards.js"),
            })
            props = filter_props(props, allowed, f"Cards:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")

    # Categories
    if "Categories" in db_map:
        db_id = db_map["Categories"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Category Key", "Categories")
        template_props = build_props(title_prop, "__template__", {
            "Label": rt(""),
            "Order": num(None),
            "Parent": rt(""),
            "Hidden": chk(False),
            "Red Hot": rt(""),
            "Req": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Categories")
        for key, c in data["categories"].items():
            props = {
                "Label": rt(c.get("label", "")),
                "Order": num(c.get("order", None)),
                "Parent": rt(c.get("parent", "")),
                "Hidden": chk(c.get("hidden", False)),
                "Red Hot": rt(c.get("red_hot", "")),
                "Req": rt(c.get("req", "")),
                "Source File": rt("js/data_categories.js"),
            }
            props = build_props(title_prop, key, props)
            props = filter_props(props, allowed, f"Categories:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")

    # Modules
    if "Modules" in db_map:
        db_id = db_map["Modules"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Module Key", "Modules")
        template_props = build_props(title_prop, "__template__", {
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
            "Mission ID": rt(""),
            "Promo End": rt(""),
            "Valid To": rt(""),
            "Valid On Red Day": chk(False),
            "Config": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Modules")
        for key, m in data["modules"].items():
            props = {
                "Type": rt(m.get("type", "")),
                "Desc": rt(m.get("desc", "")),
                "Data": rt(json.dumps(m, ensure_ascii=False)),
                "Rate": num(m.get("rate", None)),
                "Rate Per X": num(m.get("rate_per_x", None)),
                "Multiplier": num(m.get("multiplier", None)),
                "Category": rt(m.get("category", "")),
                "Match": mselect(m.get("match", [])),
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
                "Mission ID": rt(m.get("mission_id", "")),
                "Promo End": rt(m.get("promo_end", "")),
                "Valid To": rt(m.get("valid_to", "")),
                "Valid On Red Day": chk(m.get("valid_on_red_day", False)),
                "Config": rt(json.dumps(m.get("config", {}), ensure_ascii=False) if "config" in m else ""),
                "Source File": rt("js/data_modules.js"),
            }
            props = build_props(title_prop, key, props)
            props = filter_props(props, allowed, f"Modules:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")

    # Conversions
    if "Conversions" in db_map:
        db_id = db_map["Conversions"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Source Currency", "Conversions")
        template_props = build_props(title_prop, "__template__", {
            "Miles Rate": num(None),
            "Cash Rate": num(None),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Conversions")
        for c in data["conversions"]:
            key = c.get("src", "")
            props = build_props(title_prop, key, {
                "Miles Rate": num(c.get("miles_rate", None)),
                "Cash Rate": num(c.get("cash_rate", None)),
                "Source File": rt("js/data_conversions.js"),
            })
            props = filter_props(props, allowed, f"Conversions:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")

    # Rules
    if "Rules" in db_map:
        db_id = db_map["Rules"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Rule Key", "Rules")
        template_props = build_props(title_prop, "__template__", {
            "Data": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Rules")
        for key, val in data["rules"].items():
            props = build_props(title_prop, key, {
                "Data": rt(json.dumps(val, ensure_ascii=False)),
                "Source File": rt("js/data_rules.js"),
            })
            props = filter_props(props, allowed, f"Rules:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")

    # Promotions
    if "Promotions" in db_map:
        db_id = db_map["Promotions"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Promo ID", "Promotions")
        template_props = build_props(title_prop, "__template__", {
            "Name": rt(""),
            "Theme": rt(""),
            "Cards": rt(""),
            "Badge": rt(""),
            "Badge ? Type": rt(""),
            "Badge ? ModuleKey": rt(""),
            "Badge ? Field": rt(""),
            "Badge ? StaticDate": rt(""),
            "Sections": rt(""),
            "Cap Keys": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Promotions")
        for p in data["promotions"]:
            key = p.get("id", "")
            props = build_props(title_prop, key, {
                "Name": rt(p.get("name", "")),
                "Theme": rt(p.get("theme", "")),
                "Cards": rt(json.dumps(p.get("cards", []), ensure_ascii=False)),
                "Badge": rt(json.dumps(p.get("badge", {}), ensure_ascii=False)),
                "Badge ? Type": rt((p.get("badge") or {}).get("type", "")),
                "Badge ? ModuleKey": rt((p.get("badge") or {}).get("moduleKey", "")),
                "Badge ? Field": rt((p.get("badge") or {}).get("field", "")),
                "Badge ? StaticDate": rt((p.get("badge") or {}).get("staticDate", "")),
                "Sections": rt(json.dumps(p.get("sections", []), ensure_ascii=False)),
                "Cap Keys": rt(json.dumps(p.get("capKeys", []), ensure_ascii=False)),
                "Source File": rt("js/data_promotions.js"),
            })
            props = filter_props(props, allowed, f"Promotions:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")


    # Promotion Sections
    if "Promotion Sections" in db_map:
        db_id = db_map["Promotion Sections"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Section ID", "Promotion Sections")
        template_props = build_props(title_prop, "__template__", {
            "Promo ID": rt(""),
            "Promotion": rels([]),
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
        allowed = ensure_properties(db_id, token, template_props, "Promotion Sections")
        for p in data["promotions"]:
            promo_id = p.get("id", "")
            promo_page_id = promo_page_ids.get(promo_id)
            sections = p.get("sections", []) or []
            for i, s in enumerate(sections, start=1):
                section_id = f"{promo_id}#{i}"
                usage_keys = s.get("usageKeys")
                usage_key = s.get("usageKey")
                props = {
                    "Promo ID": rt(promo_id),
                    "Promotion": rels([promo_page_id]) if promo_page_id else rels([]),
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
                    "Source File": rt("js/data_promotions.js"),
                }
                props = build_props(title_prop, section_id, props)
                props = filter_props(props, allowed, f"Promotion Sections:{section_id}")
                page_id_existing = query_page_by_title(db_id, title_prop, section_id, token)
                if page_id_existing:
                    update_page(page_id_existing, props, token)
                else:
                    create_page(db_id, props, token)

    # Promo Registry
    if "Promo Registry" in db_map:
        db_id = db_map["Promo Registry"]
        title_prop, allowed = resolve_title_prop(db_id, token, "Promo ID", "Promo Registry")
        template_props = build_props(title_prop, "__template__", {
            "Setting Key": rt(""),
            "Warning Title": rt(""),
            "Warning Desc": rt(""),
            "Source File": rt(""),
        })
        allowed = ensure_properties(db_id, token, template_props, "Promo Registry")
        for key, val in data["promoRegistry"].items():
            props = build_props(title_prop, key, {
                "Setting Key": rt(val.get("settingKey", "")),
                "Warning Title": rt(val.get("warningTitle", "")),
                "Warning Desc": rt(val.get("warningDesc", "")),
                "Source File": rt("js/data_promotions.js"),
            })
            props = filter_props(props, allowed, f"Promo Registry:{key}")
            page_id_existing = query_page_by_title(db_id, title_prop, key, token)
            if page_id_existing:
                update_page(page_id_existing, props, token)
                promo_page_ids[key] = page_id_existing
            else:
                created = create_page(db_id, props, token)
                promo_page_ids[key] = created.get("id")


def main():
    parser = argparse.ArgumentParser(description="Sync repo data to Notion")
    parser.add_argument("--page-url", required=True, help="Notion page URL that contains the databases")
    args = parser.parse_args()

    token = os.environ.get("NOTION_TOKEN")
    if not token:
        die("NOTION_TOKEN is not set")

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sync(repo_root, args.page_url, token)
    print("Sync complete")


if __name__ == "__main__":
    main()
