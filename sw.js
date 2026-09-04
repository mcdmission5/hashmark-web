// Hashmark service worker — caches the app shell for offline + instant repeat loads.
// Strategy:
//   • App shell (same-origin index/manifest/icons): cache-first, revalidate in background.
//   • Navigations: serve cached index.html when offline (SPA fallback).
//   • Everything cross-origin (Supabase REST data, Google Fonts): straight to the network
//     (never cache live ratings — data freshness wins). Fonts get an opportunistic cache.
const VERSION = "hashmark-v101";   // v101: U78 — pick'em ESPN-parity, the PICK SCREEN. One scrolling slate where each card transforms IN PLACE across the week: OPEN ("SAT 9/5 · LOCKS @ 1:30 PM", device-localized, + countdown; monogram tiles w/ record + AP chip, whole tile is the tap target) -> PICKED (amber tile) -> LOCKED (lock header, Model pick teal, consensus, live score + clock from the U75 overlay) -> SCORED (CORRECT green / INCORRECT muted red / FINAL grey with no pick; winner-green / loser-grey score bars; check/X badge on your tile; "+N" points). Day-grouped sticky headers + a Dense pills view. Sticky "N/10 Picks Made" bar (complete state, next-lock countdown, honest "1 game locked without a pick"). TIEBREAKER card on the week's MARQUEE game (server-resolved: the Hashmark slate's tiebreak game, else the group's highest-interest game), locks with that game, post-final "Final · 35 · you said 41 (off by 6)", blank = 0 — wired into the weekly-winner determination and the season ladder (after H2H). Confidence "Change matchup point value" modal (PTS · MATCHUP · Move here) with INSERT-AND-SHIFT semantics, cards re-sorted by value, locked values frozen, slate-change re-range; one atomic server RPC (pickem_set_confidences). Gambling-free Quick pick (Home teams / Higher-ranked / Random / Copy from my other group) that fills ONLY open, unpicked games — never a Model-based fill pre-lock. Dated week carousel with status dots + season switcher w/ the archive banner. PICK-BEFORE-AUTH on the National Pool: signed-out taps are held on the device, the "Save your picks — takes 10 seconds" sheet appears on the first tap, held picks submit after sign-in. National Pool % on tiles PRE-LOCK only at >= 100 pickers (server floor; group consensus stays post-lock). Per-tap auto-save kept; hidden-until-lock absolute for group picks. Scorer: voided games re-range confidence values (both scorers, parity proven).   // v100: U75 items 3-4 — pick'em visibility + compare alignment. (3) ESPN-style GRID tab: members down the left (@handle, pinned column, horizontal scroll), games across the top, each cell the team that member picked (monogram, no logos), green/muted-red once final, weekly correct-count in the right column; the Model plays as a member (teal); pre-lock other-member cells stay hidden (server RLS enforces it) while your own always show, unpicked reads "—". Per-game consensus on slate cards ("N of M in your group took [Team]" + % bar), post-lock ONLY. Tap a member in standings -> the grid, their row highlighted. (4) compare-drawer stat alignment: added an away-left / home-right team-name header above the EPA/success/last-5/win-prob strip so every value sits under its team, matching the duel panels; verified at 390px in light + dark.   // v99: U75 item 1 — LIVE SCORES. Three owner-visible failures during Week-0 live games: (1) Games/Scores tab showed live games as UPCOMING with a market chip and no score, because scGameRow read the `games` table (which carries NO in-progress score — livewp writes those to live_win_prob) and only showed a score when completed; (2) the game page rendered a static PREVIEW for a live game, because live_win_prob.status is written title-cased "In Progress" by ESPN's detail feed while the UI checked ==="in_progress" exactly; (3) the `games` table read inherited the 3-HOUR api() default (+ a permanent per-session scoresCache), the 4th instance of that stale-default class. FIXES: systemic explicit per-endpoint freshness policy (_API_FRESHNESS ordered table — live/gameday tables can never inherit the 3h default again; new intraday tables MUST be listed); scoresCache expires 30s for the current season; a live-score OVERLAY (liveScoreMap from live_win_prob) merged onto the Scores tiles + a 60s auto-redraw while any game is live; game-page live detection is case/format-insensitive (/in.?progress/i); livewp now writes canonical snake_case status.   // v98: U74 pick'em field-test fixes - (A) THE INVITE-LINK ROOT CAUSE: the join sheet opened on a 900ms boot timer while openLanding() is nav-wrapped, so navPush->navPurgeOverlays() DESTROYED the sheet on every first-visit device (exactly the owner's field failure; the texted link itself was intact - the sms body was already encodeURIComponent-ed). The sheet now opens ONLY from the boot .then() after landing/load has run, works signed-in/signed-out/first-visit/post-SW-reload (it keys off the stored token, not the URL), is idempotent (no stacked duplicates from the auth-callback resume), and a network failure no longer burns the token with a false "invalid link" alert; sms prefill now leads with the link (truncation-safe). (B) password whitespace: client trims edges on create/join/settings; server join_group dual-checks as-entered then trimmed, create/settings trim before hashing. (C) slate cards: side-by-side solid [Compare teams] [Game page] expanders, both in-card drawers, one open per card, chevron+amber open state; Game page reuses the game page's PRE renderers verbatim (shared gamePreCards()) with the full page one tap inside. (D) pre-season standings list EVERY member at 0 in join order via the new group_roster definer RPC (National Pool: honest member count, never thousands of zero rows). (E) handle claim moved into onboarding: new accounts get the required sheet at first sign-in; legacy handle-less accounts get the dismissible sheet once per session; pick'em actions still hard-gate.   // v97: U73 BLOCKING HOTFIX - tall auth sheets (Claim handle / Create group) could not reach their action button on phones: 92vh resolves against the LARGEST mobile viewport so the bottom-anchored sheet's button sat behind the browser toolbar while the content still fit inside the cap (overflow never engaged - an off-screen bug, not a scroll bug). Systemic fix on the shared .authov/.authsheet (+ .pickov/.picksheet): dvh caps w/ vh fallback, explicit overlay height so flex-end anchors to the VISIBLE bottom, env(safe-area-inset-bottom) padding, overscroll-behavior:contain, sticky .authact action row on the three tall sheets (claim/create/settings), claim-sheet autofocus now desktop pointer:fine only (U70 rule), visualViewport keyboard lift + focused-input scrollIntoView   // v96b: U72 live-walk fix - the While-you-were-away brief no longer stacks over a pending ?join= invite sheet (the invite wins the first surface; the brief returns next visit)   // v96: U72 - pick'em GROUPS UI (handle claim sheet w/ live availability, groups home w/ National pinned + next-lock countdowns + weekly-win counts, create/share (?join=TOKEN link + sms prefill)/join flows w/ password + paused + regenerate paths, commissioner slate editor w/ freeze-at-lock icons + the visible edit log + reset-to-Hashmark-slate, the flagship pick flow w/ per-game countdowns + instant per-game saves + confidence budget + the one-tap COMPARE drawer (U20 duel rows + market chip + records + Matchup Lab link), standings w/ crowns/drops/win%-context columns + champion banner + trophy case, picks-due return-surface card + Picks-tab badge (no push), and THE LEAK FIX: the Model's legacy pick columns are no longer client-readable pre-lock - hidden-until-lock everywhere via the pickem_model_reveal RPC)   // v95: U70 - P3 polish pass (waterfall + key-player grades + sim pick chips onto the U49 palette w/ a your-pick vs model-favorite voice split, picker desktop autofocus, omni search kept to the app column, Ask answer scrolls with the stream, ~170px stacked bottom dead-space trimmed, team news leads with the team own stories)   // v94b: U69 - second latent kill-switch fixed: player_season stats key UPPERCASE (CAR/REC), the badge read lowercase — with the role mismatch this had kept LIMITED DATA from ever firing anywhere   // v94: U69 - week-aware measured data badges (LIMITED DATA now fires on the player OWN attributed share — graded <60% of official workload, the U62 rule — with his measured numbers + the season coverage-era line from the new pbp_coverage_week table; fixed the latent role=rush vs rushing mismatch that had kept the rusher LIMITED branch from EVER firing)   // v93: U68 - Gameday Hub (multi-game live view on the shared-poller tables: per-game win-prob bars + pace + latest decision read + last play, follow set + favorite pinned, fire-once alerts for swings/momentum flips/red zone/upset watch, device-local drive-call game, 45s self-clearing refresh; Gameday tab in Games + Explore tile; zero client CFBD) + the U67 live decision lane lands in the poller   // v92b: U67 copy fix - the aggressiveness index is over ALL model-GO recommendations (band-clear chances shown per row as their own subset); the first copy claimed clear-only and was factually wrong   // v92: U67 - coach-decision UI (per-option win probabilities w/ 95% bands on game pages: LIVE latest-spots panel + POST notable-decisions recap, honest tiers CLEAR/LOW LEVERAGE/TOO CLOSE TO CALL w/ the humility explainer, season fourth-down aggressiveness board w/ honesty box + Explore tile; weekly coach_decision lane joins the Sunday heavy)   // v91: U66 - fantasy UI (6-slot lineup builder from the eligible pool w/ search + last-season-points ranking, RPC-only saves mirroring server locks, Conventional vs Hashmark Grade mode toggle w/ the attribution-honesty layer surfaced verbatim, Model lineup revealed post-lock, weekly/season/group boards on pick*em groups; Fantasy tab in Picks)   // v90: 2026 ROLLOVER - MW_INELIGIBLE cleared (Jun 24 2026 NCAA vote: FCS-transition teams immediately CCG/bowl/CFP-eligible; sim no longer excludes NDSU from the MW pool)   // v89b: U65 hotfix - prediction_ tables join the 5-min api cache bucket (3h default served purged fixture markets mid-verify; lock countdowns need kickoff-scale freshness)   // v89: U65 - prediction competition UI (Predictions view in the Picks family: season-long + weekly markets w/ lock countdowns, one pick per market via the U61 server-RPC, calibration explainer led by the 2025 replay receipt, national/percentile/lifetime/group standings w/ the Model ranked teal; Predict tab + pick'em cross-links)   // v88: U59 - records-book history live (History & Records gains award-winner + conference-title ledger sections; team History bubble grouped titles + awards; U52 trivia adds award/title questions w/ 5-of-7 rotation + seeded option shuffle fix; U53 FAQ +2 Q&As); grade surfaces reflect the U59 cleaned/re-attributed tables   // v87: U58 - season hardening console surfaces: loop health goes tri-state (RUNNING/STALLED/DEAD from progress heartbeats, measured thresholds 45m/30h) + CFBD budget telemetry (MTD, projected month-end, headroom, breaker level, top consumers)   // v86: U57 dress rehearsal - home LIVE strip now arms on the current bands home (liveArm was wired only to the legacy renderHome; the U50 band defeated the boot-race fallbacks' .band guard) + pick'em header copy derives slate size (Week-0 slate is 3 games, copy said 10)   // v85: U54 - light mode (data-theme light value set for every token, pre-paint boot script, header sun/moon toggle, localStorage+profile persistence, light accent ramps AA-fit; dark values untouched, video hero stays a dark island)   // v84: U53 - per-team FAQ (render-time computed answers w/ season labels + sourced-vs-modeled NIL badge, schema.org FAQPage JSON-LD) + daily-rotating Did-you-know from the U13 ledgers   // v83: U52 - daily trivia (ledger-generated, date-seeded, source row shown per answer, RPC score/streak) + Team Clicker (rate-limited RPC, live aggregate leaderboard; clicker_counts joined the never-cache set)   // v82: U51 - fan polls (owner-authored weekly rotation, one vote per visitor via session key + RPC-only writes, amber crowd bars, polls view)   // v81: U45 - NIL modeled estimates (dashed Modeled badge on board/panel, model ranges for 97 non-figured teams, methodology model section + LOO table from nil_model_meta; sourced counts stay modeled-exclusive)   // v80: U50 - 2026 Kickoff Countdown (amber home band + Kickoff Hub, live tick to the earliest stored kickoff, derived facts row, auto-flip to favorite/marquee next-game countdown in season; tabular-numeral fixed cells, CLS 0)   // v79: U56 - dynamic backgrounds app-wide (4-treatment token layer in dark/light pairs, section treatments via the boot-mounted backdrop stage, home-band tint caps, clamped team glow + ghost school-name watermark; video now home-only + pauses elsewhere)   // v78: QA-FIX-1 - sim RUN restored (popstate over-kill + renderSim re-assert), home video plays (SW media bypass + canplay re-kick), Ask retrieval + P2 set   // v77b: watchdog hotfix - loop_heartbeat reads bypass the api cache (the default 3h bucket made the health surfaces stale in BOTH directions)   // v77: watchdog hardening - LOOP DEAD banner in the owner console + admin home strip (no push required), per-agent loop-health panel, send-test-push round-trip button   // v76b: post-v70 audit - stale media path comment corrected (hero-football -> home-bg); no behavior change   // v76: U55 - full-page video background (4 crossfaded cleared clips, one file), per-band scrims, scroll-FPS rule   // v75b: U48 - hero veil made directional + media opacity capped at the AA-safe max (the footage layer had pushed hero body text under WCAG AA)   // v75: U48 - hero motion stage (self-hosted cleared stock footage + canvas win-probability curve, conditional playback)   // v74b: U47 hotfix - the legacy v2 home-extras block was appending duplicate cards into the STICKY HEADER of the banded home   // v74: U47 - home rebuilt as bands (hero / proof row / today / flagship ratings / sim / NIL / news / team cloud / briefing) + nav-wrap fix   // v73: U49 - palette remap (Model = teal, user/crowd = amber; --model/--user/--warn/--stat semantic tokens)   // v72b: U46 hotfix - a view rendered in a hidden tab kept its scroll-reveal sections at opacity 0 (Chrome pauses transitions while document.hidden)   // v72: U46 - "Primetime Polish" token pass (self-hosted display face, section grammar, count/freshness chips, atmosphere layer, reduced-motion-safe reveals)   // v71: U15 - recurring category-audit system + audit-health panel in the owner console   // v70: U16 - owner console + privacy-respecting events (no PII/IP; admin-RLS reads)   // v69: U14 - Talent Dividend signature stat (residual vs talent-expected, two labeled eras, sustained badges)   // v68: U13 - History & Records (all-time ledgers, poll-era titles + claimed tier, rivalry registry w/ official-vs-raw dual labels)   // v67: U32 - floating Ask Hashmark bubble on every view (team-contextual; stats pill stacks above it)   // v66: U30 - news free everywhere + thumbnails (NCAA/Heartland hotlink only, branded cards default)   // v65: U36 - stat table upgrade (prominent sticky sub-headers, OPP column, pinned TEAM/OPP header)   // v64: U35 - Players bubble (season stats by position, sortable, grade chips) + Stats bubble defaults to the 2026 side   // v63: U33 - rating hero + factor bars + gauntlet projections moved INSIDE the Stats bubble (2026 side)   // v62: U29 - 2026/2025 sub-toggles in Stats/Schedule/Recruiting; standalone 2025 Stats/Schedule bubbles retired   // v61b: U28 - division-TBD group for unassigned new members   // v60: U27 - honest lookahead watch (board + scores strip)   // v56: U11+U31 - recruiting Commits/Prospects/News sub-tabs + portal News (ungated)
const SHELL = [
  "./",
  "./index.html",
  "./fonts/hashmark-display.woff2",
  "./media/home-bg.jpg",              // U55: the background POSTER only - it is the LCP element and tiny (42 KB).
                                      // The 4.24 MB video is deliberately NOT in the shell: it must stay a
                                      // post-load, conditional fetch, never part of the install cost.   // U46: self-hosted display subset (31.2 KB) - cached with the shell so repeat loads never re-fetch it and offline keeps the headline face
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // SPA navigation: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // The HTML document itself: network-first, so returning visitors always get the latest home
  // (the stats dashboard) instead of a stale cached shell. Falls back to cache when offline.
  if (sameOrigin && (url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // QA-FIX-1 P1-2: media files NEVER go through this handler. Video loading depends on native
  // Range-request flow; routing it through respondWith(fetch(req)) measurably stalled the load
  // (2.5s to serve a fully-HTTP-cached webm; a fresh visitor sat at readyState 0 and the home
  // background never played). Returning without respondWith hands the request straight to the
  // network stack, which streams 206s natively. The poster (.jpg) stays SW-cached below.
  if (sameOrigin && /\.(mp4|webm)$/.test(url.pathname)) return;

  // Same-origin shell assets: cache-first with background revalidate.
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Google Fonts: opportunistic stale-while-revalidate so the UI font survives offline.
  if (url.host.includes("fonts.googleapis.com") || url.host.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // Everything else (Supabase live data): straight to the network, no caching.
});


// ---- P2-E6: web push (self-hosted VAPID). Payloads are Declarative-Web-Push-shaped;
// this handler renders them on platforms that don't parse them natively. ----
self.addEventListener("push", (e) => {
  let n = {};
  try { n = (e.data.json() || {}).notification || {}; } catch (_) { n = { title: "Hashmark", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(n.title || "Hashmark", {
    body: n.body || "", icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
    data: { url: n.navigate || "https://hash-mark.com/#pickem" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "https://hash-mark.com/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if (w.url.startsWith("https://hash-mark.com")) { w.focus(); w.navigate(url); return; } }
    return clients.openWindow(url);
  }));
});
