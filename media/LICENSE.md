# Hero / background footage — sources, licenses, and the clearance record

**Current shipped asset:** `media/home-bg.*` — the U55 full-page background loop (four crossfaded
scenes). Supersedes U48's single-clip `hero-football.*`, which has been removed from the repo; its
licence record is retained below for provenance.

---

## 1. The shipped loop — four scenes

All four clips are **Pexels License** (https://www.pexels.com/license/): free for commercial use,
**attribution not required**, modification permitted. Terms quoted verbatim in §4.

| # | Scene | Pexels id | Source page | Trim used |
|---|---|---|---|---|
| 1 | Cleats on turf, golden-hour backlight | 5423490 | https://www.pexels.com/video/american-football-player-practicing-his-moves-5423490/ | 1.0 – 7.5 s |
| 2 | Floodlight tower over a field at dusk | 16186240 | https://www.pexels.com/video/drone-footage-of-a-football-field-at-sunset-16186240/ | 1.5 – 8.0 s |
| 3 | Football on the turf beside a yard line | 5423493 | https://www.pexels.com/video/football-player-jump-and-defense-training-5423493/ | 0.5 – 7.0 s |
| 4 | Single cleat on a yard line, bokeh huddle | 5423481 | https://www.pexels.com/video/low-angle-shot-of-football-players-practicing-5423481/ | 6.0 – 12.5 s |

Download endpoint for each: `https://www.pexels.com/download/video/<id>/`. Retrieved 2026-07-26.

## 2. Clearance standard applied (owner-revised Jul 26, U55 brief)

**Now ACCEPTED:** incidental apparel branding — a legible Nike swoosh on a sock or cleat, an Under
Armour mark on a practice shirt. Scenes 1, 3 and 4 all contain such marks.

**Still FATAL** (`briefs/decision-team-logos.md` stands): mascot logos, painted school names,
team uniforms with helmet decals, sponsor signage, any identifiable school mark.

Every candidate was reviewed **frame by frame** on ffmpeg tile grids of the *source*, and the
**shipped encode was re-scanned at 1 fps across all 22 seconds** before release.

### Accepted, with what is actually visible
- **5423490 / 5423481 / 5423492 / 5423493** — Nike and Under Armour marks on footwear and practice
  apparel. No school marks. Background figures are small and defocused; no face is identifiable in
  the foreground at any point of the trims used.
- **5423493** — players wear matching red/black practice jerseys carrying a small chest crest.
  Zoomed to 1140 px on the source master the crest resolves to an unreadable red shape with no
  legible text or mascot: it is not an identifiable school mark. Recorded here so the judgement is
  auditable rather than implied.
- **16186240** — no marks of any kind.

### Rejected (carried forward from U48, still rejected under the revised rule)
| Pexels id | Subject | Why it stays rejected |
|---|---|---|
| 32160059 | Aerial, empty football fields | Team mascot logo painted at midfield |
| 32160060 | Aerial, football stadium + track | Team mascot logo painted at midfield |
| 16819573 | Aerial, football field | School name "WETUMPKA" in both end zones + midfield mascot |
| 9758410 | Drone glide toward goalposts | Perimeter fence covered in legible sponsor advertising |
| 8266312 | Players from behind | Numbered team uniforms **with helmet decals** — the exact banned case; also collides with Hashmark's own "no player photos" disclaimer |
| 16186243 | Park fields at dusk | Not rejected on clearance — passed, but reads as generic parkland; unused |

**None of the reject reasons is an apparel mark.** The owner's revision moved apparel branding from
reject to accept; it did not move any of the six above.

## 3. The encode (reproducible)

One file, four scenes already crossfaded — a single request and a single decode, no JS
orchestration, and the tail crossfades back into scene 1 so the loop is seamless.

```
ffmpeg -y \
 -i px-5423490.mp4 -i px-16186240.mp4 -i px-5423493.mp4 -i px-5423481.mp4 -i px-5423490.mp4 \
 -filter_complex "\
[0:v]trim=1.0:7.5,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30,setsar=1[a];\
[1:v]trim=1.5:8.0,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30,setsar=1[b];\
[2:v]trim=0.5:7.0,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30,setsar=1[c];\
[3:v]trim=6.0:12.5,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30,setsar=1[d];\
[4:v]trim=1.0:2.2,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30,setsar=1[loop];\
[a][b]xfade=transition=fade:duration=1.2:offset=5.3[ab];\
[ab][c]xfade=transition=fade:duration=1.2:offset=10.6[abc];\
[abc][d]xfade=transition=fade:duration=1.2:offset=15.9[abcd];\
[abcd][loop]xfade=transition=fade:duration=1.2:offset=21.2,format=yuv420p[v]" \
 -map "[v]" -an -r 30 -c:v libx264 -profile:v high -preset veryslow -crf 25 \
 -maxrate 2400k -bufsize 4800k -pix_fmt yuv420p -movflags +faststart -g 60 home-bg.mp4

ffmpeg -y -i home-bg.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 \
 -deadline good -cpu-used 3 -pix_fmt yuv420p home-bg.webm

ffmpeg -y -i home-bg.mp4 -vf "select=eq(n\,0),scale=1280:720:flags=lanczos" \
 -frames:v 1 -q:v 5 home-bg.jpg
```

## 4. Pexels License terms, quoted from the licence page on the retrieval date

> All photos and videos on Pexels are free to use.
> Attribution is not required. Giving credit to the photographer or Pexels is not necessary but always appreciated.
> You can modify the photos and videos from Pexels. Be creative and edit them as you like.

Restrictions, all of which this use satisfies:

> Identifiable people may not appear in a bad light or in a way that is offensive.
> Don't sell unaltered copies of a photo or video, e.g. as a poster, print or on a physical product without modifying it first.
> Don't imply endorsement of your product by people or brands on the imagery.
> Don't redistribute or sell the photos and videos on other stock photo or wallpaper platforms.
> Don't use the photos or videos as part of your trade-mark, design-mark, trade-name, business name or service mark.

Hashmark's use: four trimmed, rescaled, re-encoded, audio-stripped scenes composited into one loop
that sits behind scrims and page copy at reduced opacity. Not sold, not redistributed, not a
trademark, and no endorsement implied by any person or brand shown.

## 5. Shipped bytes

| File | Bytes | Notes |
|---|---|---|
| `media/home-bg.mp4` | 4,441,463 (4.24 MB) | H.264 high, 1600x900, **22.37 s**, 30 fps, **no audio stream** |
| `media/home-bg.webm` | 2,276,636 (2.17 MB) | VP9 sibling, offered first |
| `media/home-bg.jpg` | 33,378 (0.03 MB) | Poster, first frame, 1280x720 — the LCP element |

**Budget:** the U55 brief raised the ceiling to 5 MB because the clip is now the page background.
Shipped mp4 is **4.24 MB — 85 % of budget** for 22.37 s (1.59 Mbps). CRF 27 was measured at 3.52 MB
and CRF 25 at 4.24 MB; CRF 25 was chosen because the dusk-sky scene bands visibly at 27 and the
budget had room. Most clients take the 2.17 MB VP9 instead. Self-hosted from our own origin — a
grep of the served page for third-party video hosts returns 0.

---

## 6. Superseded — U48's single-clip hero (removed from the repo, record retained)

`hero-football.mp4/.webm/.jpg` — Pexels **16186240** under the same Pexels License, an 8 s
single-scene loop (1.94 MB + 42 KB poster). Retired by U55, which promotes that clip to scene 2 of
the four-scene background. No licence obligation attaches to its removal.
