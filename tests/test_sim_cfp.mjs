// Simulator field-selection tests — 2026 CFP format (rules changed Jan 2026).
// Extracts the REAL simCompute() out of the canonical app file (../hashmark-app.html) and
// exercises it on a synthetic season, so the shipped selection logic itself is under test:
//   1. an unranked Power Four champion still makes the field (the "8-5 Duke" rule)
//   2. the 5th autobid is the highest-ranked G6 TEAM — in over a lower-ranked G6 champion
//   3. Notre Dame: ranked #12 → in (guaranteed); ranked #13 → out
// Run:  node tests/test_sim_cfp.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "..", "hashmark-app.html"), "utf8");
const m = html.match(/function simCompute\(picks\)\{[\s\S]*?\n\}\n(?=function simRecord)/);
if (!m) { console.error("FAIL: could not extract simCompute from hashmark-app.html"); process.exit(1); }

// P4 = 3-team conferences, G6 = 2-team; REAL_CONF_MIN lowered to 2 inside the sandbox so the
// synthetic league is small. Rankings are controlled by stubbing simSOR per team.
const CONFS = {
  S1: "SEC", S2: "SEC", S3: "SEC",
  B1: "Big Ten", B2: "Big Ten", B3: "Big Ten",
  T1: "Big 12", T2: "Big 12", T3: "Big 12",
  A1: "ACC", A2: "ACC", A3: "ACC",
  M1: "MAC", M2: "MAC",
  W1: "Mountain West", W2: "Mountain West",
  ND: "FBS Independents",
};
const TEAMS = Object.keys(CONFS);
const teamMeta = Object.fromEntries(TEAMS.map(id => [id, { school: id === "ND" ? "Notre Dame" : id }]));

// Round-robin conference schedules. Winners: A3 sweeps the ACC (the unranked P4 champ);
// M2 beats M1 (so the MAC champ is the LOWER-ranked G6 team); S1/B1/T1/W1 win their leagues.
let gid = 0;
const games = [], picks = {};
const play = (winner, loser) => { const g = { id: `g${gid++}`, home_team_id: winner, away_team_id: loser }; games.push(g); picks[g.id] = winner; };
for (const [a, b, c] of [["S1","S2","S3"], ["B1","B2","B3"], ["T1","T2","T3"]]) { play(a,b); play(a,c); play(b,c); }
play("A3","A1"); play("A3","A2"); play("A1","A2");   // ACC: bottom-ranked A3 wins the league
play("M2","M1");                                     // MAC: champ M2 ranked below non-champ M1
play("W1","W2");                                     // MW champ W1 ranked below both MAC teams

const BASE_SOR = { S1:.98, B1:.96, T1:.94, A1:.92, S2:.90, B2:.88, T2:.86, A2:.84,
                   S3:.82, B3:.80, T3:.78, M1:.60, A3:.40, M2:.35, W1:.30, W2:.25 };

function run(ndSor) {
  const SOR = { ...BASE_SOR, ND: ndSor };
  const sandbox = new Function("sim", "REAL_CONF_MIN", "simSOR", "teamMeta", m[0] + "; return simCompute;");
  const sim = { fbs: TEAMS, conf: CONFS, games };
  const simCompute = sandbox(sim, 2, (id) => SOR[id], teamMeta);
  return simCompute(picks);
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : `  — ${detail}`}`);
  if (!cond) failures++;
};

// ND at .76 → exactly 12th of the ranking (11 P4 teams above it)
const c1 = run(0.76);
check("field has exactly 12 teams", c1.field.length === 12, `got ${c1.field.length}`);
check("unranked P4 champ (A3, ACC) makes the field", c1.field.includes("A3"), `field=${c1.field}`);
check("all four P4 champions in the field", ["S1","B1","T1","A3"].every(t => c1.field.includes(t)), `field=${c1.field}`);
check("highest-ranked G6 TEAM (M1, not a champ) is in", c1.field.includes("M1"), `field=${c1.field}`);
check("lower-ranked G6 champions (M2, W1) are OUT", !c1.field.includes("M2") && !c1.field.includes("W1"), `field=${c1.field}`);
check("Notre Dame ranked #12 → IN (guaranteed)", c1.field.includes("ND"), `field=${c1.field}`);
check("straight seeding: #1 ranked team is the 1 seed", c1.field[0] === "S1", `seed1=${c1.field[0]}`);
check("bumped-in autobids seed at the bottom", c1.field[10] === "M1" && c1.field[11] === "A3", `seeds 11-12=${c1.field.slice(10)}`);

// ND at .59 → 13th of the ranking (11 P4 + M1 above it) → no guarantee, at-large only
const c2 = run(0.59);
check("Notre Dame ranked #13 → OUT", !c2.field.includes("ND"), `field=${c2.field}`);
check("#13 scenario still fields 12 with all P4 champs + best G6", c2.field.length === 12 && ["S1","B1","T1","A3","M1"].every(t => c2.field.includes(t)), `field=${c2.field}`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nall 2026-CFP-format tests pass");
process.exit(failures ? 1 : 0);
