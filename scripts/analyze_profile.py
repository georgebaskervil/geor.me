#!/usr/bin/env python3
"""Analyze a Firefox/Gecko profile JSON dump and surface performance hotspots.

Usage: python3 scripts/analyze_profile.py [path/to/profile.json]
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _profile_loader import load_profile  # noqa: E402

PROFILE = Path(sys.argv[1] if len(sys.argv) > 1 else "input.json")


def get_tables(profile: dict, thread: dict):
    """Profiles can be processed (per-thread tables) or shared (Gecko v34+)."""
    shared = profile.get("shared", {})
    string_array = thread.get("stringArray") or shared.get("stringArray")
    string_table = string_array
    return {
        "stackTable": thread.get("stackTable") or shared.get("stackTable"),
        "frameTable": thread.get("frameTable") or shared.get("frameTable"),
        "funcTable": thread.get("funcTable") or shared.get("funcTable"),
        "resourceTable": thread.get("resourceTable") or shared.get("resourceTable"),
        "stringArray": string_table,
    }


def stack_to_frames(stack_index, tables):
    """Walk a stack to a list of (func_name, resource_url, category, subcategory)."""
    out = []
    st = tables["stackTable"]
    ft = tables["frameTable"]
    fn = tables["funcTable"]
    rt = tables["resourceTable"]
    sa = tables["stringArray"]
    while stack_index is not None:
        frame_idx = st["frame"][stack_index]
        func_idx = ft["func"][frame_idx]
        cat = ft["category"][frame_idx] if ft.get("category") else None
        subcat = ft["subcategory"][frame_idx] if ft.get("subcategory") else None
        name_idx = fn["name"][func_idx]
        name = sa[name_idx] if name_idx is not None else "<anon>"
        res_idx = fn["resource"][func_idx] if fn.get("resource") else -1
        res_url = None
        if res_idx is not None and res_idx >= 0 and rt:
            r_name_idx = rt["name"][res_idx]
            res_url = sa[r_name_idx] if r_name_idx is not None else None
        out.append((name, res_url, cat, subcat))
        stack_index = st["prefix"][stack_index]
    return out  # leaf first


def thread_summary(thread, profile, top_n=25):
    tables = get_tables(profile, thread)
    cats = profile["meta"]["categories"]
    samples = thread["samples"]
    interval = profile["meta"].get("interval", 1)

    # weight per sample
    weights = samples.get("weight") or [interval] * len(samples["time"])
    weight_unit = samples.get("weightType", "ms")

    leaf_counter = Counter()
    self_time_per_func = Counter()
    cat_time = Counter()
    subcat_time = Counter()
    file_self_time = Counter()
    inverted_call_tree = Counter()  # leaf path key
    js_only_self = Counter()

    n = len(samples["stack"])
    total_weight = 0
    for i in range(n):
        si = samples["stack"][i]
        w = weights[i]
        if not isinstance(w, (int, float)):
            w = interval
        total_weight += w
        if si is None:
            cat_time["<idle/null>"] += w
            continue
        frames = stack_to_frames(si, tables)
        if not frames:
            continue
        leaf_name, leaf_res, leaf_cat, leaf_sub = frames[0]
        leaf_counter[leaf_name] += w
        self_time_per_func[(leaf_name, leaf_res)] += w
        if leaf_res:
            file_self_time[leaf_res] += w
        cname = cats[leaf_cat]["name"] if leaf_cat is not None else "Native"
        sname = (
            cats[leaf_cat]["subcategories"][leaf_sub]
            if leaf_cat is not None and leaf_sub is not None
            else "Native"
        )
        cat_time[cname] += w
        subcat_time[f"{cname} / {sname}"] += w
        if cname == "JavaScript":
            js_only_self[(leaf_name, leaf_res)] += w
        # build a small inverted call-tree key (top 4 frames)
        key = " <- ".join(f[0] for f in frames[:4])
        inverted_call_tree[key] += w

    return {
        "total_weight": total_weight,
        "weight_unit": weight_unit,
        "categories": cat_time.most_common(),
        "subcategories": subcat_time.most_common(20),
        "leaf_funcs": leaf_counter.most_common(top_n),
        "self_per_func": self_time_per_func.most_common(top_n),
        "file_self": file_self_time.most_common(top_n),
        "inverted_paths": inverted_call_tree.most_common(top_n),
        "js_self": js_only_self.most_common(top_n),
    }


def marker_summary(thread, profile, top_n=20):
    tables = get_tables(profile, thread)
    sa = tables["stringArray"]
    m = thread["markers"]
    name_idx = m["name"]
    cat_idx = m.get("category")
    starts = m["startTime"]
    ends = m["endTime"]
    phases = m.get("phase")  # 0=instant 1=interval 2=intervalStart 3=intervalEnd
    data = m.get("data")

    cats = profile["meta"]["categories"]

    by_name_count = Counter()
    by_name_dur = Counter()
    long_intervals = []  # (dur, name, start, end, data_summary)
    network_events = []
    reflow_events = []
    long_task_events = []
    script_events = []
    paint_events = []
    gc_events = []

    for i in range(len(name_idx)):
        nm = sa[name_idx[i]]
        s = starts[i]
        e = ends[i]
        ph = phases[i] if phases else None
        dur = (e - s) if (s is not None and e is not None) else 0
        by_name_count[nm] += 1
        if dur:
            by_name_dur[nm] += dur
        d = data[i] if data else None
        d_summary = None
        if isinstance(d, dict):
            t = d.get("type")
            if t == "Network":
                network_events.append((dur, nm, d.get("URI") or d.get("name"), d.get("status"), d.get("contentType")))
            elif nm == "Reflow" or "Reflow" in nm:
                reflow_events.append((dur, nm, d))
            elif nm in ("LongTask", "Long Task") or t == "LongTask":
                long_task_events.append((dur, nm, d))
            elif nm.startswith("Script") or t == "Script":
                script_events.append((dur, nm, d))
            elif nm in ("Paint", "Composite", "RasterizeOnMainThread") or t in ("Paint", "Composite"):
                paint_events.append((dur, nm, d))
            elif nm in ("GC Major", "GCMajor", "GCMinor", "MinorGC", "CC", "CCSlice") or t in ("GCMajor", "GCMinor", "CC"):
                gc_events.append((dur, nm, d))
            d_summary = {k: d[k] for k in list(d.keys())[:6]}
        if dur >= 50:
            long_intervals.append((dur, nm, s, e, d_summary))

    by_first = lambda x: -x[0]
    long_intervals.sort(key=by_first)
    return {
        "count_by_name": by_name_count.most_common(top_n),
        "duration_by_name": by_name_dur.most_common(top_n),
        "long_intervals_top": long_intervals[:top_n],
        "network_top": sorted(network_events, key=by_first)[:top_n],
        "reflow_top": sorted(reflow_events, key=by_first)[:top_n],
        "long_tasks_top": sorted(long_task_events, key=by_first)[:top_n],
        "scripts_top": sorted(script_events, key=by_first)[:top_n],
        "paints_top": sorted(paint_events, key=by_first)[:top_n],
        "gc_top": sorted(gc_events, key=by_first)[:top_n],
    }


def find_user_threads(profile):
    """Find the content-process main thread that hosts the user page."""
    pages = profile.get("pages", [])
    user_tab_ids = set()
    for p in pages:
        url = p.get("url", "")
        if url.startswith(("http://", "https://")):
            user_tab_ids.add(p.get("tabID"))
    return user_tab_ids


def fmt_ms(x):
    return f"{x:>10.1f}ms"


def main():
    profile = load_profile(PROFILE)
    meta = profile["meta"]
    interval = meta.get("interval", 1)
    dur = meta.get("profilingEndTime", 0) - meta.get("profilingStartTime", 0)
    print(f"# Firefox profile: {PROFILE.name}")
    print(f"- Product: {meta.get('product')} {meta.get('misc')} on {meta.get('oscpu')}")
    print(f"- CPU: {meta.get('CPUName')}  ({meta.get('physicalCPUs')} cores / {meta.get('logicalCPUs')} threads)")
    print(f"- Sample interval: {interval} ms")
    print(f"- Profile duration: {dur:.1f} ms ({dur/1000:.1f} s)")
    print(f"- Threads: {len(profile['threads'])}, Pages: {len(profile['pages'])}, Libs: {len(profile['libs'])}")
    print()

    user_tabs = find_user_threads(profile)
    print(f"User-content tab ids: {sorted(user_tabs)}")
    print()

    # Map pid -> "is content process for user tab"
    threads = profile["threads"]
    for idx, t in enumerate(threads):
        print(f"## Thread #{idx}: {t['name']} (pid={t['pid']}, tid={t['tid']}, isMain={t.get('isMainThread')})")
        s = thread_summary(t, profile)
        print(f"   samples={len(t['samples']['time'])}, total_weight={s['total_weight']:.0f} {s['weight_unit']}")
        print("   Categories (self time):")
        for name, w in s["categories"][:10]:
            pct = 100.0 * w / max(1, s["total_weight"])
            print(f"     {name:<30s} {fmt_ms(w)}  ({pct:5.1f}%)")
        print("   Subcategories (top 8):")
        for name, w in s["subcategories"][:8]:
            pct = 100.0 * w / max(1, s["total_weight"])
            print(f"     {name:<50s} {fmt_ms(w)}  ({pct:5.1f}%)")
        print("   Hottest leaf funcs:")
        for (fname, res), w in s["self_per_func"][:15]:
            pct = 100.0 * w / max(1, s["total_weight"])
            res_short = (res or "")[-60:]
            print(f"     {fmt_ms(w)} ({pct:4.1f}%)  {fname[:60]:<60s}  {res_short}")
        print("   Hottest source resources (self time):")
        for res, w in s["file_self"][:10]:
            pct = 100.0 * w / max(1, s["total_weight"])
            print(f"     {fmt_ms(w)} ({pct:4.1f}%)  {res}")
        print("   Top inverted call paths (leaf first):")
        for path, w in s["inverted_paths"][:10]:
            pct = 100.0 * w / max(1, s["total_weight"])
            print(f"     {fmt_ms(w)} ({pct:4.1f}%)  {path}")
        print("   Hottest JS leaf funcs:")
        for (fname, res), w in s["js_self"][:10]:
            pct = 100.0 * w / max(1, s["total_weight"])
            res_short = (res or "")[-60:]
            print(f"     {fmt_ms(w)} ({pct:4.1f}%)  {fname[:60]:<60s}  {res_short}")
        print()

        # Markers (skip if very few)
        ms = marker_summary(t, profile)
        print("   Markers — top by total duration:")
        for name, d in ms["duration_by_name"][:15]:
            print(f"     {fmt_ms(d)}  {name}  (count={dict(ms['count_by_name']).get(name,0)})")
        if ms["long_intervals_top"]:
            print("   Longest individual marker intervals (≥50ms):")
            for dur_, nm, s_, e_, ds in ms["long_intervals_top"][:10]:
                print(f"     {fmt_ms(dur_)}  {nm}  start={s_:.1f}ms  data={ds}")
        if ms["network_top"]:
            print("   Slowest network events:")
            for d_, nm, uri, status, ct in ms["network_top"][:10]:
                print(f"     {fmt_ms(d_)}  {status} {ct} {uri}")
        if ms["scripts_top"]:
            print("   Slowest script-execution markers:")
            for d_, nm, dat in ms["scripts_top"][:10]:
                print(f"     {fmt_ms(d_)}  {nm}  data={dat}")
        if ms["reflow_top"]:
            print("   Slowest reflow markers:")
            for d_, nm, dat in ms["reflow_top"][:10]:
                print(f"     {fmt_ms(d_)}  {nm}  data={dat}")
        if ms["gc_top"]:
            print("   Heaviest GC/CC markers:")
            for d_, nm, dat in ms["gc_top"][:10]:
                print(f"     {fmt_ms(d_)}  {nm}")
        if ms["paints_top"]:
            print("   Slowest paint/composite markers:")
            for d_, nm, dat in ms["paints_top"][:10]:
                print(f"     {fmt_ms(d_)}  {nm}")
        print()


if __name__ == "__main__":
    main()
