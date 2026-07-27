# U48 hero footage — source, license, and the clearance record

## The shipped clip

| | |
|---|---|
| **Title** | *Drone Footage of a Football Field at Sunset* |
| **Source page** | https://www.pexels.com/video/drone-footage-of-a-football-field-at-sunset-16186240/ |
| **Download URL** | https://www.pexels.com/download/video/16186240/ |
| **Pexels asset id** | 16186240 |
| **License** | **Pexels License** — https://www.pexels.com/license/ |
| **Commercial use** | Yes, free |
| **Attribution** | **Not required** ("Giving credit to the photographer or Pexels is not necessary but always appreciated") |
| **Modification** | Permitted ("You can modify the photos and videos from Pexels") |
| **Retrieved** | 2026-07-26 |
| **Source master** | 3840x2160, 10.22 s, H.264, with an AAC audio track (stripped on encode) |

### Pexels License terms that bind this use, quoted from the license page on the retrieval date

> All photos and videos on Pexels are free to use.
> Attribution is not required. Giving credit to the photographer or Pexels is not necessary but always appreciated.
> You can modify the photos and videos from Pexels. Be creative and edit them as you like.

And the restrictions, all of which this use satisfies:

> Identifiable people may not appear in a bad light or in a way that is offensive.
> Don't sell unaltered copies of a photo or video, e.g. as a poster, print or on a physical product without modifying it first.
> Don't imply endorsement of your product by people or brands on the imagery.
> Don't redistribute or sell the photos and videos on other stock photo or wallpaper platforms.
> Don't use the photos or videos as part of your trade-mark, design-mark, trade-name, business name or service mark.

Hashmark's use: a trimmed, rescaled, re-encoded, audio-stripped background layer sitting under a
veil gradient and page copy. Not sold, not redistributed, not a trademark, no endorsement implied.

## Clearance record — every clip reviewed, and why it was accepted or rejected

The brief's hard rules: no identifiable college team logos, marks, uniforms or stadiums; no
recognizable faces in the foreground; no broadcast/telecast look; skip anything ambiguous.
Every candidate was downloaded and reviewed **frame by frame** (ffmpeg tile grids), not judged
from its thumbnail or title.

| Pexels id | Subject | Verdict |
|---|---|---|
| 32160059 | Aerial, empty football fields | ⛔ **Reject** — team mascot logo painted at midfield |
| 32160060 | Aerial, football stadium + track | ⛔ **Reject** — team mascot logo painted at midfield |
| 16819573 | Aerial, football field | ⛔ **Reject** — school name "WETUMPKA" in both end zones + mascot at midfield |
| 9758410 | Drone glide toward goalposts | ⛔ **Reject** — perimeter fence covered in legible third-party sponsor advertising |
| 8266312 | American football players from behind | ⛔ **Reject** — numbered team uniforms and helmet decals (identifiable kit); also collides with Hashmark's own "no player photos" disclaimer |
| 5423490 | Cleats/turf detail, golden hour | ⚠ **Reject (ambiguous)** — clearly legible Nike swooshes on socks and shoes. The brand marks are incidental, but the brief says skip when ambiguous and the Pexels license says don't imply brand endorsement |
| 5423481 | Cleats on a yard line, blurred huddle | ⚠ **Reject (ambiguous)** — legible "adizero" (adidas) wordmark on the cleat and Under Armour marks on shirts behind |
| 16186243 | Park fields at dusk | ✅ Clean, but reads as generic parkland rather than a sports field |
| **16186240** | **Floodlight tower over a field at sunset** | ✅ **ACCEPTED** — no logos, no marks, no signage, no identifiable faces (figures are distant and tiny), no broadcast look. "Stadium lights at dusk" is on the brief's own approved subject list |

**Honest note for the owner:** every *American-football-specific* clip found in this pass failed a
named clearance rule. The shipped clip is a floodlit field at dusk, not American football action —
atmosphere over sport-specificity. If you would accept incidental athletic-apparel branding (a Nike
swoosh on a shoe), clips 5423490 and 5423481 are the better football shots and can be swapped in by
re-running the encode recipe below against that asset id.

## The encode (reproducible)

```
# 8.0 s seamless loop: body 0..7.0 s, then a 1.0 s crossfade from the tail back into the head,
# rescaled 3840x2160 -> 1600x900, AUDIO TRACK REMOVED (-an), faststart for progressive play.
ffmpeg -y -i px-16186240.mp4 -i px-16186240.mp4 -filter_complex \
 "[0:v]trim=0:8.0,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30[a];\
  [1:v]trim=0:1.0,setpts=PTS-STARTPTS,scale=1600:900:flags=lanczos,fps=30[b];\
  [a][b]xfade=transition=fade:duration=1.0:offset=7.0,format=yuv420p[v]" \
 -map "[v]" -an -r 30 -c:v libx264 -profile:v high -preset veryslow -crf 23 \
 -maxrate 2600k -bufsize 5200k -pix_fmt yuv420p -movflags +faststart -g 60 hero-football.mp4

ffmpeg -y -i hero-football.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 \
 -deadline good -cpu-used 2 -pix_fmt yuv420p hero-football.webm

ffmpeg -y -i hero-football.mp4 -vf "select=eq(n\,0),scale=1280:720:flags=lanczos" \
 -frames:v 1 -q:v 5 hero-football.jpg
```

## Shipped bytes

| File | Bytes | Notes |
|---|---|---|
| `hashmark-web/media/hero-football.mp4` | 2,039,205 (1.94 MB) | H.264 high, 1600x900, 8.0 s, 30 fps, **no audio stream** |
| `hashmark-web/media/hero-football.webm` | 915,486 (0.87 MB) | VP9 sibling, served first |
| `hashmark-web/media/hero-football.jpg` | 42,505 (0.04 MB) | Poster, 1280x720 — the LCP element |

Video + poster = **2,081,710 B (1.98 MB)**, inside the brief's 2.5 MB budget. Self-hosted from our
own origin; no third-party video CDN, same discipline as U46's self-hosted display font.
