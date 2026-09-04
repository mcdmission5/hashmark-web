// Hashmark U79 — pick'em INVITE UNFURL. hash-mark.com is a static GitHub Pages site, so a
// texted `?join=TOKEN` link can only ever preview the generic site card. This tiny public
// GET endpoint serves the per-group Open Graph tags a messaging app reads ("You've been
// invited to join {Group} on Hashmark — no gambling, just bragging rights", the
// monogram-safe 1200x630 card) and immediately forwards a real visitor to the ONE join
// path the app already handles at boot: https://hash-mark.com/?join=TOKEN (U72/U74).
// Reads only the anon-callable group_preview RPC (name + counts, never members' picks).
// Deploy:  supabase functions deploy invite --no-verify-jwt   (link previews carry no JWT)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SITE = "https://hash-mark.com";
const CARD = `${SITE}/icons/pickem-invite.png`;

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // tokens are 32 hex chars (U71); anything else is treated as "no token"
  const t = (url.searchParams.get("t") ?? "").toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 64);
  const target = t ? `${SITE}/?join=${t}` : `${SITE}/`;
  let g: Record<string, unknown> | null = null;
  if (t && SUPABASE_URL && ANON) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/group_preview`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: t }),
      });
      if (r.ok) g = await r.json();
    } catch (_e) { g = null; }
  }
  const name = g && typeof g.name === "string" ? g.name : null;
  const n = g ? Number(g.member_count ?? 0) : 0;
  const mode = g && g.scoring_mode === "confidence" ? "confidence" : "straight";
  const motto = g && typeof g.motto === "string" && g.motto ? g.motto : null;
  const title = name ? `You've been invited to join ${name} on Hashmark` : "Join a Hashmark pick'em group";
  const desc = name
    ? `No gambling, just bragging rights. ${n} member${n === 1 ? "" : "s"} · ${mode} scoring` +
      (motto ? ` · “${motto}”` : "") + `. Tap to join on hash-mark.com.`
    : "No gambling, just bragging rights — pick winners on a shared weekly slate. Tap to join on hash-mark.com.";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hashmark">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(target)}">
<meta property="og:image" content="${CARD}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Hashmark Pick'em — you're invited. No gambling, just bragging rights.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${CARD}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
<style>body{margin:0;background:#0b1120;color:#edf2f7;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}a{color:#ffbe3d}</style>
</head><body><p>${esc(title)} — <a href="${esc(target)}">continue to hash-mark.com</a></p>
<script>location.replace(${JSON.stringify(target)});</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
  });
});
