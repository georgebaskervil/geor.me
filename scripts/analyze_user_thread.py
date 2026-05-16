#!/usr/bin/env python3
"""Deep-dive analyzer for the user-page content thread of a Gecko profile.

Focuses on:
  * Top JS hot leaves (self-time)
  * Top inverted call stacks (self-time)
  * Per-resource (script file) JS time
  * Per-DOMEvent type latency
  * Style/layout/reflow time
  * GC/CC time
  * Long tasks
  * Network requests
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median

sys.path.insert(0, str(Path(__file__).parent))
from _profile_loader import load_profile  # noqa: E402

PROFILE = Path(sys.argv[1] if len(sys.argv) > 1 else "input.json")


def load(p):
    return load_profile(p)


def get_tables(profile, thread):
    sh = profile.get("shared", {})
    return {
        "stackTable": thread.get("stackTable") or sh.get("stackTable"),
        "frameTable": thread.get("frameTable") or sh.get("frameTable"),
        "funcTable": thread.get("funcTable") or sh.get("funcTable"),
        "resourceTable": thread.get("resourceTable") or sh.get("resourceTable"),
        "stringArray": thread.get("stringArray") or sh.get("stringArray"),
    }


def stack_to_frames(stack_index, T, max_depth=64):
    """Walk a stack to a list of (func_name, resource_url, category, subcategory, line). leaf first."""
    out = []
    st, ft, fn, rt, sa = T["stackTable"], T["frameTable"], T["funcTable"], T["resourceTable"], T["stringArray"]
    depth = 0
    while stack_index is not None and depth < max_depth:
        depth += 1
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
        line = ft["line"][frame_idx] if ft.get("line") else None
        out.append((name, res_url, cat, subcat, line))
        stack_index = st["prefix"][stack_index]
    return out


def find_user_thread(profile):
    """Find content-process thread holding the user's http(s) page."""
    user_inner_ids = set()
    for p in profile.get("pages", []):
        if (p.get("url") or "").startswith(("http://", "https://")):
            user_inner_ids.add(p["innerWindowID"])
    candidates = []
    for i, t in enumerate(profile["threads"]):
        used = set(t.get("usedInnerWindowIDs") or [])
        match = used & user_inner_ids
        non_user = used - user_inner_ids
        if match and t.get("isMainThread"):
            # Prefer threads whose used-windows are mostly the user's tab
            candidates.append((i, t, len(match), len(non_user)))
    if not candidates:
        for i, t in enumerate(profile["threads"]):
            if t.get("name") == "GeckoMain" and t.get("isMainThread"):
                candidates.append((i, t, 0, 999))
    # Sort: most non-user windows last (parent process), more matches first
    candidates.sort(key=lambda c: (c[3], -c[2], -len(c[1]["samples"]["time"])))
    return candidates[0][0], candidates[0][1], candidates[0][2]


def fix_dur(starts, ends, phases, i):
    """Return duration in ms for marker i, or None for instant. Handles all phases."""
    s = starts[i]
    e = ends[i]
    ph = phases[i] if phases else 1
    if ph == 1:  # interval
        return max(0.0, e - s) if (s and e) else None
    if ph == 0:  # instant
        return 0.0
    # phase 2 (start) or 3 (end): one of s/e is sentinel — leave to pairing pass
    return None


def pair_phase_markers(starts, ends, phases, names, sa):
    """Pair phase=2 (intervalStart) with phase=3 (intervalEnd) by name (sequential)."""
    open_by_name = defaultdict(list)
    pairs = []  # (start, end, name_idx)
    n = len(names)
    for i in range(n):
        ph = phases[i] if phases else 1
        if ph == 2:
            open_by_name[names[i]].append(starts[i])
        elif ph == 3:
            stack = open_by_name.get(names[i])
            if stack:
                s = stack.pop()
                pairs.append((s, ends[i], names[i]))
            else:
                pairs.append((None, ends[i], names[i]))
    return pairs


def main():
    profile = load(PROFILE)
    meta = profile["meta"]
    cats = meta["categories"]
    interval = meta.get("interval", 1)
    p_dur = meta.get("profilingEndTime", 0) - meta.get("profilingStartTime", 0)

    idx, thread, score = find_user_thread(profile)
    print(f"# User content thread analysis")
    print(f"  Picked thread #{idx}: name={thread['name']} pid={thread['pid']} tid={thread['tid']}")
    print(f"  Profile duration: {p_dur:.0f} ms ({p_dur/1000:.1f} s)")
    print(f"  Samples: {len(thread['samples']['time'])}, Markers: {len(thread['markers']['startTime'])}")
    print(f"  innerWindowIDs touched: {thread.get('usedInnerWindowIDs')}")
    print()

    T = get_tables(profile, thread)
    sa = T["stringArray"]
    samples = thread["samples"]
    weights = samples.get("weight") or [interval] * len(samples["time"])

    # Per-sample analysis
    cat_self = Counter()
    leaf_self = Counter()  # (func, res)
    res_self = Counter()
    inverted_paths = Counter()
    js_inverted = Counter()
    js_self = Counter()  # (func, res, line)
    forced_layout = Counter()  # paths that have layout reflow under JS
    cat_subcat_self = Counter()
    leaf_cat_for_func = {}

    cat_name_idx = {c["name"]: i for i, c in enumerate(cats)}
    JS_CAT = cat_name_idx.get("JavaScript")
    LAYOUT_CAT = cat_name_idx.get("Layout")
    GC_CAT = cat_name_idx.get("GC / CC")
    GFX_CAT = cat_name_idx.get("Graphics")
    DOM_CAT = cat_name_idx.get("DOM")

    total_w = 0
    for i, si in enumerate(samples["stack"]):
        w = weights[i] if isinstance(weights[i], (int, float)) else interval
        total_w += w
        if si is None:
            cat_self["<idle>"] += w
            continue
        frames = stack_to_frames(si, T)
        if not frames:
            continue
        leaf = frames[0]
        leaf_self[(leaf[0], leaf[1])] += w
        if leaf[1]:
            res_self[leaf[1]] += w
        cn = cats[leaf[2]]["name"] if leaf[2] is not None else "Native"
        sn = cats[leaf[2]]["subcategories"][leaf[3]] if leaf[2] is not None and leaf[3] is not None else "Native"
        cat_self[cn] += w
        cat_subcat_self[f"{cn} / {sn}"] += w
        leaf_cat_for_func.setdefault((leaf[0], leaf[1]), cn)

        if cn == "JavaScript":
            js_self[(leaf[0], leaf[1], leaf[4])] += w
            js_inverted[" <- ".join(f[0] for f in frames[:5])] += w

        # forced layout heuristic: layout/reflow leaf with JavaScript ancestor
        if cn == "Layout" and any(
            cats[f[2]]["name"] == "JavaScript" if f[2] is not None else False
            for f in frames[1:]
        ):
            jsf = next((f for f in frames if f[2] is not None and cats[f[2]]["name"] == "JavaScript"), None)
            key = f"{leaf[0]}  ⇐  JS:{jsf[0] if jsf else '?'} @ {(jsf[1] or '') if jsf else ''}"
            forced_layout[key] += w

        inverted_paths[" <- ".join(f[0] for f in frames[:5])] += w

    print("## Self-time by category")
    for n, w in cat_self.most_common(15):
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {n}")
    print()
    print("## Self-time by subcategory (top 15)")
    for n, w in cat_subcat_self.most_common(15):
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {n}")
    print()
    print("## Self-time by source resource")
    for n, w in res_self.most_common(20):
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {n}")
    print()
    print("## Hottest JS leaf functions (self-time)")
    for (fn_, res, line), w in js_self.most_common(25):
        cat = leaf_cat_for_func.get((fn_, res), "?")
        loc = f"{(res or '<inline>')}:{line if line else '?'}"
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {fn_:<55s}  {loc}")
    print()
    print("## Top inverted call stacks (any category)")
    for path, w in inverted_paths.most_common(20):
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {path}")
    print()
    print("## Top inverted JS call stacks")
    for path, w in js_inverted.most_common(20):
        print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {path}")
    print()
    if forced_layout:
        print("## Possible forced reflow / layout-thrash hotspots (Layout leaf under JS)")
        for k, w in forced_layout.most_common(20):
            print(f"  {w:>9.0f} ms  ({100*w/max(1,total_w):5.1f}%)  {k}")
        print()

    # ---------- Markers ----------
    m = thread["markers"]
    starts, ends, phases, name_idx = m["startTime"], m["endTime"], m.get("phase"), m["name"]
    data = m.get("data")

    # Build (name, dur, data) tuples for interval-like markers
    triples = []
    for i in range(len(name_idx)):
        nm = sa[name_idx[i]]
        d = data[i] if data else None
        ph = phases[i] if phases else 1
        if ph == 1:
            dur = (ends[i] - starts[i]) if (starts[i] is not None and ends[i] is not None) else 0
            if dur < 0:
                dur = 0
            triples.append((nm, dur, starts[i], d))
        elif ph == 0:
            triples.append((nm, 0.0, starts[i], d))
        # phases 2/3 handled separately
    pairs = pair_phase_markers(starts, ends, phases, name_idx, sa)
    for s, e, ni in pairs:
        if s is not None and e is not None:
            dur = max(0.0, e - s)
            triples.append((sa[ni], dur, s, None))

    by_name_dur = Counter()
    by_name_count = Counter()
    long_tasks = []
    reflow_durs = []
    style_durs = []
    paint_durs = []
    gc_majors = []
    cc_full = []
    cc_slice = []
    dom_event_lat = defaultdict(list)
    user_timings = []
    networks = []
    scripts = []
    eval_durs = []
    long_intervals = []  # (dur, name, start, brief)

    for nm, dur, st, d in triples:
        by_name_count[nm] += 1
        by_name_dur[nm] += dur
        if dur >= 50:
            brief = None
            if isinstance(d, dict):
                brief = {k: d[k] for k in list(d.keys())[:6]}
            long_intervals.append((dur, nm, st, brief))
        if nm == "MainThreadLongTask" or nm == "LongTask":
            long_tasks.append((dur, st, d))
        if nm in ("Reflow", "Reflow (sync)", "Reflow (interruptible)"):
            reflow_durs.append(dur)
        if nm == "Styles":
            style_durs.append((dur, d))
        if nm in ("Paint", "DisplayList", "Composite", "RasterizeOnMainThread"):
            paint_durs.append((dur, nm))
        if nm == "GCMajor":
            gc_majors.append((dur, d))
        if nm == "CC":
            cc_full.append((dur, d))
        if nm == "CCSlice":
            cc_slice.append(dur)
        if nm == "DOMEvent" and isinstance(d, dict):
            ev = d.get("eventType") or "?"
            lat = d.get("latency") or 0
            dom_event_lat[ev].append((lat, dur, d.get("target")))
        if nm == "UserTiming" and isinstance(d, dict):
            user_timings.append((dur, d.get("name"), d.get("entryType")))
        if isinstance(d, dict) and d.get("type") == "Network":
            networks.append((dur, d.get("URI") or d.get("name"), d.get("status"), d.get("contentType"), d.get("count"), d.get("startTime"), d.get("endTime")))
        if nm == "Script" or nm.startswith("Script "):
            scripts.append((dur, nm, d))
        if nm in ("Evaluate Script", "Eval", "compileScript"):
            eval_durs.append(dur)

    long_intervals.sort(key=lambda x: -x[0])

    print("## Markers — top by total duration (count)")
    for nm, dur in by_name_dur.most_common(25):
        print(f"  {dur:>9.0f} ms  count={by_name_count[nm]:>6d}  {nm}")
    print()

    if long_tasks:
        long_tasks.sort(key=lambda x: -x[0])
        print(f"## MainThreadLongTask — total {sum(t[0] for t in long_tasks):.0f} ms across {len(long_tasks)} tasks")
        print(f"  longest single task: {long_tasks[0][0]:.0f} ms")
        print(f"  median: {median(t[0] for t in long_tasks):.0f} ms, p90: {sorted(t[0] for t in long_tasks)[int(0.9*len(long_tasks))-1]:.0f} ms")
        print()

    if reflow_durs:
        print(f"## Reflow — {len(reflow_durs)} markers, total {sum(reflow_durs):.0f} ms")
        print(f"  longest: {max(reflow_durs):.0f} ms, median: {median(reflow_durs):.1f} ms, p90: {sorted(reflow_durs)[int(0.9*len(reflow_durs))-1]:.0f} ms")
        print()

    if style_durs:
        s_dur = [d[0] for d in style_durs]
        big = sorted(style_durs, key=lambda x: -x[0])[:10]
        print(f"## Styles — {len(s_dur)} markers, total {sum(s_dur):.0f} ms, longest {max(s_dur):.0f} ms")
        for d, dat in big:
            if isinstance(dat, dict):
                print(f"   {d:>7.0f} ms  traversed={dat.get('elementsTraversed')}, styled={dat.get('elementsStyled')}, matched={dat.get('elementsMatched')}, shared={dat.get('stylesShared')}, reused={dat.get('stylesReused')}")
        print()

    if gc_majors:
        gd = [g[0] for g in gc_majors]
        print(f"## GC Major — {len(gd)} cycles, total {sum(gd):.0f} ms, longest {max(gd):.0f} ms")
        for d, dat in sorted(gc_majors, key=lambda x: -x[0])[:5]:
            tn = (dat or {}).get("timings", {}) if isinstance(dat, dict) else {}
            print(f"   {d:>7.0f} ms  reason={tn.get('reason') if isinstance(tn, dict) else None}")
        print()
    if cc_full:
        cd = [c[0] for c in cc_full]
        print(f"## CC (cycle collector) — {len(cd)} cycles, total {sum(cd):.0f} ms, longest {max(cd):.0f} ms")
        for d, dat in sorted(cc_full, key=lambda x: -x[0])[:5]:
            if isinstance(dat, dict):
                print(f"   {d:>7.0f} ms  reason={dat.get('mReason')}, slices={dat.get('mSlices')}, suspected={dat.get('mSuspected')}, maxSlice={dat.get('mMaxSliceTime')}")
        print()
    if cc_slice:
        print(f"## CC Slice — {len(cc_slice)} slices, total {sum(cc_slice):.0f} ms, longest {max(cc_slice):.0f} ms")
        print()

    if dom_event_lat:
        print("## DOM event latency (top types by total latency)")
        rows = []
        for ev, items in dom_event_lat.items():
            lats = [x[0] for x in items if isinstance(x[0], (int, float))]
            if not lats:
                continue
            rows.append((sum(lats), ev, len(lats), max(lats), median(lats)))
        rows.sort(reverse=True)
        for tot, ev, n, mx, md in rows[:15]:
            print(f"  total={tot:>8.1f} ms  count={n:>4d}  max={mx:>7.1f} ms  median={md:>5.1f} ms  {ev}")
        print()

    if networks:
        print(f"## Network ({len(networks)} markers)")
        # Aggregate by content type
        ct_count = Counter()
        ct_total = Counter()
        for dur, uri, status, ct, *_ in networks:
            if ct:
                ct_count[ct] += 1
                ct_total[ct] += dur or 0
        for ct, n in ct_count.most_common(15):
            print(f"  {n:>4d} {ct:<25s} totaldur={ct_total[ct]:.0f} ms")
        print()
        print("  Slowest 15:")
        for dur, uri, status, ct, *_ in sorted(networks, key=lambda x: -(x[0] or 0))[:15]:
            print(f"  {dur:>8.0f} ms  {status} {ct}  {uri}")
        print()

    if user_timings:
        print(f"## User Timing — {len(user_timings)} entries")
        rows = sorted(user_timings, key=lambda x: -x[0])[:15]
        for d, n, et in rows:
            print(f"  {d:>8.0f} ms  {et}  {n}")
        print()

    if scripts:
        print(f"## Script execution markers — {len(scripts)} entries")
        for d, n, dat in sorted(scripts, key=lambda x: -x[0])[:15]:
            url = (dat or {}).get("url") if isinstance(dat, dict) else None
            print(f"  {d:>8.0f} ms  {n}  {url}")
        print()

    print("## Longest individual marker intervals (≥50ms)")
    for dur, nm, st, brief in long_intervals[:25]:
        print(f"  {dur:>8.0f} ms  start={st:.0f}  {nm}  {brief}")


if __name__ == "__main__":
    main()
