# Self-hosted display face — `hashmark-display.woff2`

**Family:** Bricolage Grotesque (Atelier Triay) — SIL Open Font License 1.1 (`OFL.txt`, shipped
alongside as the license requires). Upstream: https://github.com/ateliertriay/bricolage

**Why self-hosted:** U46 forbids third-party font CDN calls for the display face. This file is
served from our own origin, so there is no cross-origin request, no third-party cookie surface,
and no dependency on a CDN staying up.

**How it was built** (reproducible):

```
fonttools varLib.instancer BricolageGrotesque[opsz,wdth,wght].ttf \
    opsz=96 wdth=100 wght=600:800 -o bric-inst.ttf          # pin optical size to display, pin width
pyftsubset bric-inst.ttf --output-file=hashmark-display.woff2 --flavor=woff2 \
    --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,\
U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+2044,U+2122,\
U+00D7,U+00B0,U+00B7,U+2212" \
    --layout-features="kern,liga,calt,tnum" --desubroutinize --no-hinting --drop-tables+=DSIG
```

**Cost:** 408,496 B upstream TTF → **31,952 B** woff2 (31.2 KB), 239 glyphs, one remaining
variable axis (`wght` 600–800). Latin + the typographic punctuation the app actually uses
(en/em dash, curly quotes, middot, ellipsis, degree, ×, −). Loaded with `font-display:swap`
behind a `<link rel=preload>`; every rule that uses it falls back to `"Barlow Condensed"` then
the system stack, so the app renders identically if the file never arrives.

**Scope:** headline surfaces only (`.sectitle`, `.hsectitle`, `.sechead h2`, `.dschool`, `.acchdr`,
card `h2`, the two standalone hero numerals). Tabular numerals stay IBM Plex Mono — swapping them
would break column alignment — and the wordmark stays Barlow Condensed (the logo is not a token).
