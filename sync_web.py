"""Regenerate the deployed web copies from the canonical app file.

hashmark-web/index.html = ../hashmark-app.html + PWA head tags + service-worker registration
(those are the ONLY differences). www/index.html is a verbatim copy of index.html.

Run after editing ../hashmark-app.html:  python hashmark-web/sync_web.py
Drift check (used by the pre-commit hook):  python hashmark-web/sync_web.py --check
  — recomputes the expected index.html from the canonical file and exits 1 if the deployed
  copies don't hash-match, so the two files can never silently diverge again.
"""
import hashlib
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "..", "hashmark-app.html")

PWA_HEAD = '''<title>Hashmark — College Football Stats & Analytics</title>
<meta name="description" content="Hashmark — deep, official college-football stats &amp; analytics for every FBS team and across the sport: team stat profiles with national ranks, league-wide leaderboards, player leaders, and preseason rankings. Independent and gambling-free." />
<!-- PWA: installable as a full-screen app on iOS/Android. Relative paths so it works under the GitHub Pages project subpath. -->
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#0B0F14" />
<link rel="icon" href="icons/icon-192.png" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Hashmark" />'''

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
    html = open(os.path.join(ROOT, "..", "hashmark-app.html")).read()
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
              "../hashmark-app.html to match the model repo, then re-sync.")
        return 1
    print(f"ENGINE check OK — beta {app_beta} / hfa {app_hfa} / sigma {app_sigma} match the model repo")
    return 0


BANNED_VOCAB = ["odds", " line ", "the line", "point spread", " spread", "units", "parlay",
                "cover the", " +EV", "moneyline", "book says", " bet ", "wager"]


def check_vocab():
    """E3 compliance linter: no betting vocabulary in the pick'em/assist UI section."""
    import re
    html = open(os.path.join(ROOT, "..", "hashmark-app.html")).read()
    m = re.search(r"P2-E2/E3/E6 — PICK'EM GROUPS[\s\S]*?// ---------- User-driven Simulator", html)
    if not m:
        print("vocab linter: pick'em section marker not found")
        return 1
    seg = m.group(0).lower()
    hits = [w for w in BANNED_VOCAB if w.lower() in seg]
    if hits:
        print(f"VOCAB LINT FAIL: banned betting vocabulary in pick'em/assist UI: {hits}")
        return 1
    print("vocab linter OK — no betting vocabulary in pick'em/assist strings")
    return 0


def check():
    """Exit 1 if the deployed copies have drifted from the canonical hashmark-app.html."""
    want = sha(expected_html())
    drifted = [p for p in ("index.html", os.path.join("www", "index.html"))
               if sha(open(os.path.join(ROOT, p)).read()) != want]
    if drifted:
        print(f"DRIFT: {', '.join(drifted)} != transform(../hashmark-app.html). "
              "Run `python sync_web.py` (edit the canonical ../hashmark-app.html, never "
              "index.html directly), then re-commit.")
        return 1
    print("sync check OK — deployed copies match the canonical hashmark-app.html")
    rc = check_engine()
    return rc or check_vocab()


def main():
    html = expected_html()
    idx = os.path.join(ROOT, "index.html")
    open(idx, "w").write(html)
    shutil.copyfile(idx, os.path.join(ROOT, "www", "index.html"))
    print(f"synced -> hashmark-web/index.html + www/index.html ({len(html)} bytes)")


if __name__ == "__main__":
    sys.exit(check()) if "--check" in sys.argv[1:] else main()
