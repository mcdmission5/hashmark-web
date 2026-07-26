// Hashmark UG2 — "why this grade" narration proxy. A SIBLING of film-room (same
// contract, same gate secret, same discipline — one narration SYSTEM, two prompts):
// grade_narratives.py POSTs a closed-world player-grade fact pack; this function
// holds the Anthropic key and returns a 2-4 sentence draft. The caller runs the
// SAME U12 post-verifier (every numeral + proper noun must trace to the pack) and
// falls back to the deterministic template on any violation — this function is a
// prose polisher, never a source of facts.
//
// Auth: x-film-token must equal the FILMROOM_TOKEN secret (deployed with
// --no-verify-jwt; server-to-server only). Cost: max_tokens clamp + the caller's
// monthly ledger (GRADE_TOKEN_CAP) + the workspace spend cap.
//
// Deploy:  supabase functions deploy grade-note --no-verify-jwt

const SYSTEM = `You write the short "why this grade" note under a player's Hashmark
Grade on hash-mark.com, an independent, gambling-free college football stats site.
You receive a JSON fact pack about ONE player-season. HARD RULES — violations are
rejected by a mechanical verifier, so follow them exactly:
1. CLOSED WORLD: every number and every proper noun in your output must appear in
   the pack, exactly as given. Never compute, convert, estimate, or round
   differently. Never mention a player, coach, team, opponent, or place that is
   not in the pack.
2. NEVER: play descriptions or specific-play claims; quotes; injury or medical
   framing; psychology, effort, or momentum talk; recruiting or NIL talk;
   red-zone, coverage, pressure, or separation claims; betting vocabulary of any
   kind (no odds, spread, cover, favorite/underdog, line, over/under).
3. The grade is VALUE PRODUCED IN ROLE, not isolated skill — use the pack's
   context_note phrasing (OL/receiver/QB/scheme context) when explaining it.
4. If the pack has low_sample: the note MUST say the number is shrunk toward the
   position average (50) because the sample is below the qualifying floor, using
   the pack's framing. Never rank or tier a low-sample player.
5. Cite at least one component metric by its pack name with its exact value.
6. Percentile and tier words come only from the pack. Position average is 50.
7. Spell no number as a word — digits only, so the verifier can trace every figure.
8. FORM: 2-4 sentences, 40-90 words, plain text only — no headline, no markdown,
   no lists, no emoji. Vary sentence openings; do not start with the grade number
   every time.`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const gate = Deno.env.get("FILMROOM_TOKEN");
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!gate || !key) {
    return new Response(JSON.stringify({ error: "grade-note not configured" }),
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
    `\nWrite the 2-4 sentence grade note now.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
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
