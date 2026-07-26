// Hashmark U12 — "Film Room" narration proxy. Server-to-server ONLY: the Monday
// game_analysis.py run POSTs a closed-world fact pack; this function holds the
// Anthropic key (same project secret the Ask proxy uses) and returns a short
// narration draft. The caller runs the POST-VERIFIER (every numeral + proper noun
// must trace to the pack) and falls back to the template render on any violation —
// this function is a prose polisher, never a source of facts.
//
// Auth: x-film-token header must equal the FILMROOM_TOKEN secret (deployed with
// --no-verify-jwt; the token gates it instead of a user JWT — no browser ever calls
// this). Cost: max_tokens clamp + the caller's monthly token ledger (FILM_TOKEN_CAP)
// + the provider-side workspace spend cap.
//
// Deploy:  supabase functions deploy film-room --no-verify-jwt
// Secrets: supabase secrets set FILMROOM_TOKEN=<random hex>   (ANTHROPIC_API_KEY set)

const SYSTEM = `You write the Monday "Film Room" recap lead for hash-mark.com, an
independent, gambling-free college football stats site. You receive a JSON fact pack.
HARD RULES — violations are rejected by a mechanical verifier, so follow them exactly:
1. CLOSED WORLD: every number and every proper noun in your output must appear in the
   pack, exactly as given. Never compute, convert, estimate, or round differently.
   Never mention a player, coach, team, or place that is not in the pack.
2. Probabilities are always phrased "N of 100" using the pack's *_n_of_100 values.
3. NEVER: quotes from anyone; injury causes or medical framing (a pack news headline
   may be cited only as "SOURCE reported: HEADLINE"); psychology or momentum talk;
   red-zone, coverage, pressure, or separation claims; betting vocabulary of any kind
   (no odds, spread, cover, favorite/underdog, line).
4. Use the pack's verb_tier for the efficiency verdict: "edged" / "outplayed" /
   "dominated" — never a stronger verb than the tier allows.
5. Say "excluding garbage time" once when citing efficiency numbers.
6. Season + week label appears once, like "(2025, Week 14)".
7. win_exp_n_of_100 is a POSTGAME ledger verdict: phrase it "a team playing to
   those numbers wins N of 100 times" — it is NEVER a pregame chance or a live
   probability. Only pregame_home_wp_n_of_100 may be described as pregame.
8. Spell no number as a word — digits only, so the verifier can trace every figure.
9. FORM: first line = a headline under 12 words stating the angle plainly. Then a
   blank-line, then ONE paragraph of 90-160 words, at most one number per sentence.
   Plain text only — no markdown, no lists, no emoji.
Write from the lead_angle the pack specifies; weave in at most the bullet_angles and
player_card facts. Lead-sentence form should vary: stat-first, player-first, or
moment-first as the pack's note suggests.`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const gate = Deno.env.get("FILMROOM_TOKEN");
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!gate || !key) {
    return new Response(JSON.stringify({ error: "film-room not configured" }),
      { status: 503, headers: { "content-type": "application/json" } });
  }
  if (req.headers.get("x-film-token") !== gate) {
    return new Response("forbidden", { status: 403 });
  }
  let body: { pack?: unknown; note?: string };
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.pack) return new Response("no pack", { status: 400 });

  const user = `Fact pack:\n${JSON.stringify(body.pack)}\n` +
    (body.note ? `\nNote: ${body.note}` : "") +
    `\nWrite the headline and lead paragraph now.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ error: `anthropic ${r.status}`, detail: t.slice(0, 300) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
  const d = await r.json();
  const text = (d.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  return new Response(JSON.stringify({ text, usage: d.usage ?? {} }),
    { headers: { "content-type": "application/json" } });
});
