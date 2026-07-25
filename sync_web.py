"""Regenerate the deployed web copies from the canonical app file.

hashmark-web/index.html = hashmark-app.html + PWA head tags + service-worker registration
(those are the ONLY differences). www/index.html is a verbatim copy of index.html.

Run after editing hashmark-app.html:  python hashmark-web/sync_web.py
Drift check (used by the pre-commit hook):  python hashmark-web/sync_web.py --check
  — recomputes the expected index.html from the canonical file and exits 1 if the deployed
  copies don't hash-match, so the two files can never silently diverge again.
"""
import hashlib
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "hashmark-app.html")

PWA_HEAD = '''<title>Hashmark — College Football Stats & Analytics</title>
<meta name="description" content="Hashmark — deep, official college-football stats &amp; analytics for every FBS team and across the sport: team stat profiles with national ranks, league-wide leaderboards, player leaders, and preseason rankings. Independent and gambling-free." />
<!-- PWA: installable as a full-screen app on iOS/Android. Relative paths so it works under the GitHub Pages project subpath. -->
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#0b1120" />
<link rel="icon" href="icons/icon-192.png" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Hashmark" />
<!-- SEO/OG (batch 6 C1) -->
<link rel="canonical" href="https://hash-mark.com/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Hashmark" />
<meta property="og:title" content="Hashmark — Gambling-free college football analytics" />
<meta property="og:description" content="Official stats, a model that shows its work, and tools built for fans — the Playoff simulator, signature stats, live win probability, and your team first. Independent and gambling-free." />
<meta property="og:url" content="https://hash-mark.com/" />
<meta property="og:image" content="https://hash-mark.com/icons/icon-512.png" />
<meta name="twitter:card" content="summary" />'''

SW_SCRIPT = '''
<script>
// PWA service worker — caches the app shell for offline + instant repeat loads. Registered
// from a relative path so it scopes correctly under the GitHub Pages project subpath. Live
// Supabase data is always fetched fresh (the SW only handles same-origin shell requests).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
</script>'''


def expected_html():
    html = open(SRC).read()
    assert "<title>Hashmark — Rankings</title>" in html, "canonical title marker not found"
    html = html.replace("<title>Hashmark — Rankings</title>", PWA_HEAD)
    # inject the SW registration just before the closing </body>
    html = html.replace("</body>", SW_SCRIPT + "\n</body>", 1)
    return html


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def check_engine():
    """The app's pinned ENGINE constants must match the model repo's serving params
    (HFA-fix brief: hfa follows inseason_params.json; beta is pinned in build_winprob.py).
    Exit-1s on drift so a stale hfa/beta can never redeploy silently."""
    import json
    import re
    model = os.path.expanduser("~/hashmark/hashmark-model")
    html = open(os.path.join(ROOT, "hashmark-app.html")).read()
    m = re.search(r"const ENGINE = \{ beta: ([\d.]+), hfa: ([\d.]+), sigma: ([\d.]+) \}", html)
    if not m:
        print("ENGINE check: constant not found in hashmark-app.html — pattern changed?")
        return 1
    app_beta, app_hfa, app_sigma = (float(x) for x in m.groups())
    try:
        hfa = float(json.load(open(os.path.join(model, "inseason_params.json")))["hfa"])
        bw = open(os.path.join(model, "build_winprob.py")).read()
        beta = float(re.search(r"SERVING_BETA = ([\d.]+)", bw).group(1))
        sigma = float(re.search(r"SIGMA = ([\d.]+)", bw).group(1))
    except Exception as e:
        print(f"ENGINE check skipped (model repo unreadable: {e})")
        return 0
    bad = []
    if abs(app_hfa - round(hfa, 3)) > 5e-4:
        bad.append(f"hfa app {app_hfa} != params {hfa:.3f}")
    if abs(app_beta - beta) > 1e-9:
        bad.append(f"beta app {app_beta} != build_winprob {beta}")
    if abs(app_sigma - sigma) > 1e-9:
        bad.append(f"sigma app {app_sigma} != build_winprob {sigma}")
    if bad:
        print("ENGINE DRIFT: " + "; ".join(bad) + " — update the ENGINE constant in "
              "hashmark-app.html to match the model repo, then re-sync.")
        return 1
    print(f"ENGINE check OK — beta {app_beta} / hfa {app_hfa} / sigma {app_sigma} match the model repo")
    return 0


BANNED_VOCAB = ["odds", " line ", "the line", "point spread", " spread", "units", "parlay",
                "cover the", " +EV", "moneyline", "money line", "book says", " bet ", "wager",
                # design-foundation §2 additions (redesign brief)
                "underdog", " favored", "payout", " fade ", " juice ", " chalk"]

# every file the linters scan (v2 ships alongside until cutover)
LINT_FILES = ["hashmark-app.html", "index.html", "index-v2.html",
              os.path.join("www", "index.html")]


def check_vocab():
    """Compliance linter: no betting vocabulary in the pick'em/assist UI section of any
    app file (v1 canonical + deployed + v2)."""
    import re
    rc = 0
    for rel in LINT_FILES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        html = open(p).read()
        m = re.search(r"P2-E2/E3/E6 — PICK'EM GROUPS[\s\S]*?// ---------- User-driven Simulator", html)
        if not m:
            print(f"vocab linter: pick'em section marker not found in {rel}")
            rc = 1
            continue
        seg = m.group(0).lower()
        hits = [w for w in BANNED_VOCAB if w.lower() in seg]
        if hits:
            print(f"VOCAB LINT FAIL [{rel}]: banned betting vocabulary: {hits}")
            rc = 1
    if not rc:
        print("vocab linter OK — no betting vocabulary in pick'em/assist strings (all app files)")
    # NIL-copy review list (visuals-nil brief Part 2): spending judgments must stay
    # opinion-from-facts — these words state them as fact and are banned in the NIL section.
    NIL_REVIEW = ["wasted", "overpaid", " bust ", "waste of money"]
    for rel in LINT_FILES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        html = open(p).read()
        m = re.search(r"NIL ECONOMY \(Part 2\)[\s\S]*?/\* ---------------- omnibox", html)
        if not m:
            continue
        hits = [w for w in NIL_REVIEW if w in m.group(0).lower()]
        if hits:
            print(f"NIL COPY LINT FAIL [{rel}]: judgment-as-fact language: {hits}")
            rc = 1
    if not rc:
        print("NIL copy linter OK — no judgment-as-fact spending language")
    return rc


# UX batch 4 #2: every full-screen view function (open*) MUST be registered in the
# nav-stack wrap list, or the Back button silently regresses to Home. Overlays/sheets
# that never replace the app root are allowlisted. New views fail the build until wired.
NAV_ALLOWLIST = {"openOmni", "openAsk", "openNotifyPrefs", "openAccountMenu",
                 "openAuthModal", "openPicker"}


def check_nav_registry():
    import re
    p = os.path.join(ROOT, "hashmark-app.html")
    html = open(p).read()
    declared = set(re.findall(r"(?:async\s+)?function\s+(open[A-Z]\w*)\s*\(", html))
    registered = set(re.findall(r'\["(open[A-Z]\w*)"', html))
    missing = sorted(declared - registered - NAV_ALLOWLIST)
    if missing:
        print(f"NAV REGISTRY LINT FAIL: view function(s) not in the nav-stack wrap list "
              f"(Back button will regress to Home): {missing} — register in the "
              f"setTimeout wrap list + NAV_ROUTES, or allowlist in sync_web.py if it is "
              f"a genuine overlay.")
        return 1
    print(f"nav registry OK — all {len(declared - NAV_ALLOWLIST)} open* views push history "
          f"({len(NAV_ALLOWLIST)} overlays allowlisted)")
    return 0


def check_nav_policy():
    """U17 (the 3rd/final back audit): the lint covers the NON-open* nav classes too.
    Policy (briefs/audit-U17-nav-enumeration.md): (1) every on-screen back arrow is
    navBack — one REAL history step, never a hardwired load()/parent; (2) every overlay
    creator (.pickov/.authov sheet) registers with navOverlay so Back CLOSES it;
    (3) U24 delegate rule: no <button> may carry bare data-team — action buttons with
    their own handlers double-fire through the body [data-team] delegate (the pick'em
    bug); use a scoped attr (data-pkteam-style) instead."""
    import re
    p = os.path.join(ROOT, "hashmark-app.html")
    html = open(p).read()
    lines = html.splitlines()
    fails = []
    # (1) back arrows route through navBack
    for i, ln in enumerate(lines, 1):
        m = re.search(r'querySelector\("\.back"\)\.onclick\s*=\s*(\w+|\(\)=>[^;]{0,60})', ln)
        if m and m.group(1) != "navBack":
            fails.append(f"L{i}: .back handler is `{m.group(1)}` — must be navBack")
    # (2) overlay creators register with navOverlay (within their function body, ~200 lines)
    for i, ln in enumerate(lines, 1):
        if 'className="pickov"' in ln or 'className="authov"' in ln:
            window = "\n".join(lines[i - 1:i + 200])
            if "navOverlay(" not in window:
                fails.append(f"L{i}: overlay creator without navOverlay() — Back cannot close it")
    # (3) no <button ... data-team=  (U24 double-fire class)
    for i, ln in enumerate(lines, 1):
        if re.search(r"<button[^>]*\bdata-team=", ln):
            fails.append(f"L{i}: <button> carries bare data-team — double-fires the body delegate")
    if fails:
        print("NAV POLICY LINT FAIL (U17):")
        for f in fails:
            print("  " + f)
        return 1
    n_back = len(re.findall(r'querySelector\("\.back"\)\.onclick\s*=\s*navBack', html))
    n_ov = html.count("navOverlay(") - 1   # minus the function definition itself
    print(f"nav policy OK — {n_back} back arrows on navBack; {n_ov} overlay registrations; "
          f"no <button data-team>")
    return 0


# Emoji/pictograph blocks — HARD RULE (redesign brief): no emoji anywhere in the app;
# icons are the monoline SVG set. Arrows/dingbats/geometric glyphs count (they render as
# emoji on mobile); typographic punctuation (dashes, quotes, middots) stays legal.
EMOJI_RANGES = [(0x1F000, 0x1FAFF), (0x2190, 0x21FF), (0x2300, 0x23FF), (0x2460, 0x24FF),
                (0x25A0, 0x25FF), (0x2600, 0x27BF), (0x2900, 0x2BFF),
                (0xFE0F, 0xFE0F), (0x200D, 0x200D)]


# CUTOVER DONE (Jul 18 2026): v2 is the app — every file hard-fails on any emoji codepoint.
EMOJI_ENFORCE_ALL = True
EMOJI_HARD_FILES = {"index-v2.html"}


def check_emoji():
    """Build fails on ANY emoji codepoint (v2 now; every file once cutover flips the flag)."""
    rc = 0
    for rel in LINT_FILES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        s = open(p).read()
        hits = []
        for i, ch in enumerate(s):
            cp = ord(ch)
            if any(lo <= cp <= hi for lo, hi in EMOJI_RANGES):
                line = s.count("\n", 0, i) + 1
                hits.append(f"U+{cp:04X} {ch!r} line {line}")
                if len(hits) >= 8:
                    break
        if hits:
            hard = EMOJI_ENFORCE_ALL or rel in EMOJI_HARD_FILES
            print(f"EMOJI LINT {'FAIL' if hard else 'WARN (v1 grandfathered until cutover)'} "
                  f"[{rel}]: {hits}")
            rc = rc or (1 if hard else 0)
    if not rc:
        print("emoji linter OK — zero emoji codepoints in enforced files "
              f"({'ALL' if EMOJI_ENFORCE_ALL else ', '.join(sorted(EMOJI_HARD_FILES))})")
    return rc


def check():
    """Exit 1 if the deployed copies have drifted from the canonical hashmark-app.html."""
    want = sha(expected_html())
    drifted = [p for p in ("index.html", os.path.join("www", "index.html"))
               if sha(open(os.path.join(ROOT, p)).read()) != want]
    if drifted:
        print(f"DRIFT: {', '.join(drifted)} != transform(hashmark-app.html). "
              "Run `python sync_web.py` (edit the canonical hashmark-app.html, never "
              "index.html directly), then re-commit.")
        return 1
    print("sync check OK — deployed copies match the canonical hashmark-app.html")
    rc = check_engine()
    return (rc or check_vocab() or check_emoji() or check_nav_registry() or check_nav_policy()
            or check_sim_tests())


def check_sim_tests():
    """U19: the CFP field-selection tests are part of the deploy gate — they had silently
    rotted twice (stale path after the repo move; stale extraction after batch 9 wired the
    conference engine into simCompute) and nobody noticed. Never again."""
    import subprocess
    try:
        r = subprocess.run(["node", os.path.join(ROOT, "tests", "test_sim_cfp.mjs")],
                           capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        print("sim tests SKIPPED — node not on PATH (CI/manual runs must execute "
              "tests/test_sim_cfp.mjs)")
        return 0
    if r.returncode:
        print("SIM CFP TESTS FAIL:\n" + (r.stdout + r.stderr).strip()[-800:])
        return 1
    last = [l for l in r.stdout.splitlines() if l.strip()][-1]
    print(f"sim CFP tests OK — {last}")
    return 0


def main():
    html = expected_html()
    idx = os.path.join(ROOT, "index.html")
    open(idx, "w").write(html)
    shutil.copyfile(idx, os.path.join(ROOT, "www", "index.html"))
    print(f"synced -> hashmark-web/index.html + www/index.html ({len(html)} bytes)")


if __name__ == "__main__":
    sys.exit(check()) if "--check" in sys.argv[1:] else main()
