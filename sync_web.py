"""Regenerate the deployed web copies from the canonical app file.

hashmark-web/index.html = ../hashmark-app.html + PWA head tags + service-worker registration
(those are the ONLY differences). www/index.html is a verbatim copy of index.html.

Run after editing ../hashmark-app.html:  python hashmark-web/sync_web.py
"""
import os
import shutil

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


def main():
    html = open(SRC).read()
    assert "<title>Hashmark — Rankings</title>" in html, "canonical title marker not found"
    html = html.replace("<title>Hashmark — Rankings</title>", PWA_HEAD)
    # inject the SW registration just before the closing </body>
    html = html.replace("</body>", SW_SCRIPT + "\n</body>", 1)
    idx = os.path.join(ROOT, "index.html")
    open(idx, "w").write(html)
    shutil.copyfile(idx, os.path.join(ROOT, "www", "index.html"))
    print(f"synced -> hashmark-web/index.html + www/index.html ({len(html)} bytes)")


if __name__ == "__main__":
    main()
