# Hashmark — web app

Independent, gambling-free **college football analytics**: opponent-adjusted 2026 team & unit
ratings, matchup projections, and official 2025 records, scores and schedules.

**Live:** https://mcdmission5.github.io/hashmark-web/

This repo is a **single self-contained static site** plus a **Capacitor** scaffold for the native
iOS/Android apps — all from one codebase (`index.html`).

## What's here

```
index.html              the entire app (one file: HTML + CSS + vanilla JS)
manifest.webmanifest    PWA manifest (installable "Add to Home Screen")
sw.js                   service worker (offline app shell + fast repeat loads)
icons/                  app icons (192 / 512 / maskable / Apple touch / favicon)
capacitor.config.json   native shell config (appId com.thelittleguy.hashmark)
package.json            Capacitor tooling
www/                    Capacitor web dir (build copy of the web files)
ios/  android/          native Xcode / Android Studio projects (scaffold)
```

## Data

The app is **client-side only**. It reads live data from Supabase via the **publishable key**
(RLS-gated, read-only, browser-safe) — there are **no secrets** in this repo. That's why a public
static deploy is safe, and why it works from any origin.

## Deploy (web)

Served by **GitHub Pages** from `main` / root. Any static host works — it's just files.
A custom domain (e.g. `hashmark.app`) only needs a `CNAME` record pointing at Pages.

## Native apps (Capacitor)

```bash
npm install
npm run copyweb          # copy the web files into www/
npx cap sync             # push web + plugins into ios/ and android/
npx cap open ios         # opens Xcode      (needs macOS + Xcode)
npx cap open android     # opens Android Studio
```

Building/submitting to the App Store / Play Store needs the owner's developer accounts and the
platform IDEs — see the submission checklist in the project notes.
