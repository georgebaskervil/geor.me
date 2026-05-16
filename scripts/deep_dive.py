#!/usr/bin/env python3
"""Deeper investigation of the user-content thread:
  * resolve `fun_xxx` mystery frames using funcTable.isJS / fileName
  * compute inclusive (total) time for top stacks
  * per-JS-resource self / inclusive time
  * stacks observed during `MainThreadLongTask` markers (root cause of long tasks)
  * stacks observed during `Update Blocked` UserTimings (the user's own measure)
  * detect scroll/wheel/animation hot paths
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median

sys.path.insert(0, str(Path(__file__).parent))
from _profile_loader import load_profile  # noqa: E402

PROFILE = Path(sys.argv[1] if len(sys.argv) > 1 else "input.json")


def get_tables(profile, thread):
    sh = profile.get("shared", {})
    return {
        "stackTable": thread.get("stackTable") or sh.get("stackTable"),
        "frameTable": thread.get("frameTable") or sh.get("frameTable"),
        "funcTable": thread.get("funcTable") or sh.get("funcTable"),
        "resourceTable": thread.get("resourceTable") or sh.get("resourceTable"),
        "stringArray": thread.get("stringArray") or sh.get("stringArray"),
    }


def find_user_thread(profile):
    user_inner = {p["innerWindowID"] for p in profile.get("pages", [])
                  if (p.get("url") or "").startswith(("http://", "https://"))}
    cands = []
    for i, t in enumerate(profile["threads"]):
        used = set(t.get("usedInnerWindowIDs") or [])
        match = used & user_inner
        non_user = used - user_inner
        if match and t.get("isMainThread"):
            cands.append((i, t, len(match), len(non_user)))
    cands.sort(key=lambda c: (c[3], -c[2], -len(c[1]["samples"]["time"])))
    return cands[0][1], cands[0][0]


def walk(stack_index, T, max_depth=128):
    """Return list of (func_idx, frame_idx, name, res_idx, res_name, isJS, line, file_name, cat) leaf-first."""
    out = []
    st, ft, fn, rt, sa = T["stackTable"], T["frameTable"], T["funcTable"], T["resourceTable"], T["stringArray"]
    isJS_arr = fn.get("isJS")
    fileName_arr = fn.get("fileName")
    while stack_index is not None and len(out) < max_depth:
        f = st["frame"][stack_index]
        fu = ft["func"][f]
        cat = ft["category"][f] if ft.get("category") else None
        name = sa[fn["name"][fu]]
        res_idx = fn["resource"][fu]
        res_name = sa[rt["name"][res_idx]] if res_idx is not None and res_idx >= 0 else None
        line = ft["line"][f] if ft.get("line") else None
        isJS = bool(isJS_arr[fu]) if isJS_arr is not None else False
        file_name = sa[fileName_arr[fu]] if fileName_arr and fileName_arr[fu] is not None else None
        out.append((fu, f, name, res_idx, res_name, isJS, line, file_name, cat))
        stack_index = st["prefix"][stack_index]
    return out


def fmt(ms): return f"{ms:>9.0f} ms"


def main():
    profile = load_profile(PROFILE)
    thread, idx = find_user_thread(profile)
    print(f"# Deep dive — thread #{idx} ({thread['name']} pid={thread['pid']})")
    cats = profile["meta"]["categories"]
    interval = profile["meta"].get("interval", 1)
    T = get_tables(profile, thread)
    sa = T["stringArray"]
    fn = T["funcTable"]
    isJS_arr = fn.get("isJS") or [False] * len(fn["name"])

    samples = thread["samples"]
    times = samples["time"]
    stacks = samples["stack"]
    weights = samples.get("weight") or [interval] * len(times)
    total_w = 0

    # Pre-compute per-sample frame walks once for speed
    walked = [None] * len(stacks)
    for i, si in enumerate(stacks):
        if si is None:
            walked[i] = []
            continue
        walked[i] = walk(si, T)

    # ----------- inclusive time per func ------------
    incl_func = Counter()
    self_func = Counter()
    js_self_resource = Counter()
    js_incl_resource = Counter()
    js_self_func = Counter()  # (file, line, name)
    native_self_func = Counter()
    incl_top_paths = Counter()
    self_top_paths = Counter()  # leaf 4 frames

    for i, frames in enumerate(walked):
        w = weights[i] if isinstance(weights[i], (int, float)) else interval
        total_w += w
        if not frames:
            continue
        # inclusive
        seen = set()
        seen_js_res = set()
        for fu, fid, name, res_idx, res_name, isJS, line, fileN, cat in frames:
            if fu in seen:
                continue
            seen.add(fu)
            incl_func[(name, res_name, isJS)] += w
            if isJS:
                key = res_name or fileN or "<anon>"
                if key not in seen_js_res:
                    js_incl_resource[key] += w
                    seen_js_res.add(key)
        # self
        leaf = frames[0]
        self_func[(leaf[2], leaf[4], leaf[5])] += w
        if leaf[5]:
            js_self_resource[leaf[4] or leaf[7] or "<anon>"] += w
            js_self_func[(leaf[7] or leaf[4] or "?", leaf[6], leaf[2])] += w
        else:
            native_self_func[(leaf[2], leaf[4])] += w
        self_top_paths[" <- ".join(f[2] for f in frames[:5])] += w
        # also incl path keyed by deepest 5 from root
        if len(frames) >= 1:
            tail = frames[-5:][::-1]
            incl_top_paths[" <- ".join(f[2] for f in tail)] += w

    print(f"  total_weight (≈samples) = {total_w:.0f}\n")

    print("## Top JS leaves — self time")
    for (file_, line, nm), w in js_self_func.most_common(25):
        print(f"  {fmt(w)}  ({100*w/total_w:5.2f}%)  {nm[:50]:<50s}  {file_}:{line}")
    print()

    print("## JS time per resource")
    print("   self time      inclusive   resource")
    rows = sorted(set(list(js_self_resource) + list(js_incl_resource)),
                  key=lambda r: -js_incl_resource.get(r, 0))[:30]
    for r in rows:
        print(f"  {fmt(js_self_resource.get(r,0))}  {fmt(js_incl_resource.get(r,0))}  {r}")
    print()

    print("## Top native (non-JS) self leaves")
    for (nm, res), w in native_self_func.most_common(25):
        print(f"  {fmt(w)}  ({100*w/total_w:5.2f}%)  {nm[:60]:<60s}  {res}")
    print()

    print("## Top inclusive functions (self+children)")
    for (nm, res, ij), w in incl_func.most_common(30):
        tag = "JS" if ij else "native"
        print(f"  {fmt(w)}  ({100*w/total_w:5.2f}%)  [{tag:6s}] {nm[:55]:<55s}  {res or ''}")
    print()

    # --------- Long-task root-cause stacks -----------
    m = thread["markers"]
    starts, ends, phases, name_idx, data = (
        m["startTime"], m["endTime"], m.get("phase"), m["name"], m.get("data")
    )
    long_task_ranges = []
    update_blocked_ranges = []
    rAF_ranges = []
    style_ranges = []
    for i in range(len(name_idx)):
        nm = sa[name_idx[i]]
        ph = phases[i] if phases else 1
        if ph != 1:
            continue
        s, e = starts[i], ends[i]
        if s is None or e is None or e <= s:
            continue
        if nm == "MainThreadLongTask":
            long_task_ranges.append((s, e))
        if nm == "UserTiming":
            d = data[i] if data else None
            if isinstance(d, dict) and d.get("name") == "Update Blocked":
                update_blocked_ranges.append((s, e))
        if nm == "requestAnimationFrame callbacks":
            rAF_ranges.append((s, e))
        if nm == "Styles":
            style_ranges.append((s, e))

    def stacks_in_ranges(ranges, label):
        if not ranges:
            return
        ranges.sort()
        # binary-search-ish; sweep
        ri = 0
        active_end = None
        leaf_self = Counter()
        path_self = Counter()
        js_res = Counter()
        total = 0
        # Two-pointer: iterate samples in time order, advance range
        ranges_sorted = ranges
        rj = 0
        for i, t in enumerate(times):
            while rj < len(ranges_sorted) and ranges_sorted[rj][1] < t:
                rj += 1
            if rj >= len(ranges_sorted):
                break
            s, e = ranges_sorted[rj]
            if t < s:
                continue
            # t in [s, e]
            frames = walked[i]
            if not frames:
                continue
            w = weights[i] if isinstance(weights[i], (int, float)) else interval
            total += w
            leaf = frames[0]
            leaf_self[(leaf[2], leaf[4] or leaf[7], leaf[5])] += w
            path_self[" <- ".join(f[2] for f in frames[:5])] += w
            for fu, fid, name, res_idx, res_name, isJS, line, fileN, cat in frames:
                if isJS and res_name:
                    js_res[res_name] += 0  # placeholder
                    js_res[res_name] += 1
        print(f"## Stacks during {label} ({len(ranges)} ranges, {total:.0f} sample-ms inside)")
        print("   Top leaf functions:")
        for (nm_, res, ij), w in leaf_self.most_common(15):
            tag = "JS" if ij else "native"
            print(f"     {fmt(w)}  [{tag:6s}] {nm_[:55]:<55s}  {res or ''}")
        print("   Top inverted call paths:")
        for p, w in path_self.most_common(15):
            print(f"     {fmt(w)}  {p}")
        print()

    stacks_in_ranges(long_task_ranges, "MainThreadLongTask")
    stacks_in_ranges(update_blocked_ranges, "UserTiming 'Update Blocked'")
    stacks_in_ranges(rAF_ranges, "requestAnimationFrame callbacks")
    stacks_in_ranges(style_ranges, "Styles markers")

    # --------- Per-DOMEvent-type breakdown -----------
    dom_event_lat = defaultdict(list)
    for i in range(len(name_idx)):
        nm = sa[name_idx[i]]
        if nm != "DOMEvent":
            continue
        d = data[i] if data else None
        if not isinstance(d, dict):
            continue
        ev = d.get("eventType") or "?"
        dom_event_lat[ev].append((d.get("latency") or 0, d.get("target")))
    print("## DOM event latency (top by total)")
    rows = []
    for ev, items in dom_event_lat.items():
        lats = [x[0] for x in items if isinstance(x[0], (int, float))]
        if lats:
            rows.append((sum(lats), ev, len(lats), max(lats), median(lats)))
    rows.sort(reverse=True)
    for tot, ev, n, mx, md in rows[:15]:
        print(f"  total={tot:>9.1f} ms  count={n:>5d}  max={mx:>7.1f} ms  median={md:>5.1f} ms  {ev}")


if __name__ == "__main__":
    main()
