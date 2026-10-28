// The assessment engine: pure functions, no page access, so every number can be checked by a test.
import { PARAMS, WEIGHTS, BANDS, METHOD_VERSION } from "./params.js";
import { REGIONS } from "./regions.js";

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

export const PURPOSES = ["new_build", "renovation", "energy", "accessibility", "equipment"];
export const SECTORS = ["sport", "culture"];
export const BORROWERS = ["comune", "region_province", "sports_association", "cultural_body", "school_university"];

export const CLIMATE_RISKS = ["low", "medium", "high"];

const USERS_MAX = 5e6;
const finiteIn = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
// Optional fields: absent is fine; present must be a number in its range.
const OPTIONAL = { energy_class_gain: [0, 7], renewable_share: [0, 1], free_access_share: [0, 1], co2_avoided_t: [0, 1e6],
  operating_cost: [0, 1e8] };
// Yes or no fields: absent is no; present must be true or false, so a text such as "false" is refused, not read as yes.
export const BOOLEANS = ["brownfield", "accessible_beyond_minimum", "youth_or_senior_programme", "inner_area", "monitoring_plan",
  "audited_accounts", "community_consulted"];

// Every key a loan may carry: the form's fields, the optional horizon, and a synthetic loan's id and flag.
const LOAN_KEYS = ["sector", "purpose", "borrower", "region", "amount", "term", "users", "project_cost", "climate_risk",
  ...Object.keys(OPTIONAL), ...BOOLEANS, "horizon_years", "id", "synthetic"];
const isObject = (x) => x != null && typeof x === "object" && !Array.isArray(x);

// Check a loan request; return a list of problems (empty when the request can be assessed).
export function validate(loan) {
  if (!isObject(loan)) return ["loan"];
  const problems = [];
  // only the loan's own keys; a synthetic loan's id is text and its flag is true, so every loan assessed can be replayed
  for (const k of Object.keys(loan)) if (!LOAN_KEYS.includes(k)) problems.push(k);
  if (loan.id !== undefined && typeof loan.id !== "string") problems.push("id");
  if (loan.synthetic !== undefined && loan.synthetic !== true) problems.push("synthetic");
  if (!SECTORS.includes(loan.sector)) problems.push("sector");
  if (!PURPOSES.includes(loan.purpose)) problems.push("purpose");
  if (!BORROWERS.includes(loan.borrower)) problems.push("borrower");
  if (!REGIONS.some((r) => r.id === loan.region)) problems.push("region");
  if (!finiteIn(loan.amount, 1, 1e9)) problems.push("amount");
  if (!(Number.isInteger(loan.term) && loan.term >= 1 && loan.term <= 40)) problems.push("term");
  // people are counted whole
  if (!(finiteIn(loan.users, 0, USERS_MAX) && Number.isInteger(loan.users))) problems.push("users");
  // the cost is compared with the amount only when the amount itself is valid, so an empty amount is not blamed on the cost
  if (!(finiteIn(loan.project_cost, 1, 1e10) && (problems.includes("amount") || loan.project_cost >= loan.amount))) problems.push("project_cost");
  // an optional field is absent only when left out; a field present as null is refused, not read as absent
  if (loan.climate_risk !== undefined && !CLIMATE_RISKS.includes(loan.climate_risk)) problems.push("climate_risk");
  for (const [k, [lo, hi]] of Object.entries(OPTIONAL)) if (loan[k] !== undefined && !finiteIn(loan[k], lo, hi)) problems.push(k);
  // energy classes are counted in whole steps
  if (loan.energy_class_gain !== undefined && !problems.includes("energy_class_gain") && !Number.isInteger(loan.energy_class_gain)) {
    problems.push("energy_class_gain");
  }
  for (const k of BOOLEANS) if (loan[k] !== undefined && typeof loan[k] !== "boolean") problems.push(k);
  if (loan.horizon_years !== undefined && !(Number.isInteger(loan.horizon_years) && loan.horizon_years >= 1 && loan.horizon_years <= 60)) {
    problems.push("horizon_years");
  }
  return problems;
}

// Each indicator returns points (0 to 100) and the reason, so the page can show every step.
// A share entered as a decimal times a whole number, plus a whole number, worked on the share's own decimal digits and
// read once, so 0.28 times 100 is 28, not 28.000000000000004, and 40 + 2.74% of 40 + 20 is 61.096, while a share of
// 0.9999999999999999 keeps every digit (round 36, reviewer B)
export function decimalTimes(x, c, plus = 0) {
  if (!Number.isFinite(x)) return x * c + plus;
  const [m, e = "0"] = String(x).split("e");
  const [i, f = ""] = m.split(".");
  const scale = f.length - Number(e);
  if (scale < 0) return x * c + plus;
  return Number(`${BigInt(i + f) * BigInt(c) + BigInt(plus) * 10n ** BigInt(scale)}e${-scale}`);
}

function environmental(loan) {
  const steps = [];
  const classGain = clamp(loan.energy_class_gain ?? 0, 0, 7);
  steps.push({ id: "E1", points: clamp(classGain * 20, 0, 100), weight: 0.4, input: classGain, rule: "energy_class_gain" });
  const renewable = clamp(loan.renewable_share ?? 0, 0, 1);
  steps.push({ id: "E2", points: decimalTimes(renewable, 100), weight: 0.25, input: decimalTimes(renewable, 100), input_unit: "percent", rule: "renewable_share" });
  const land = loan.purpose === "new_build" ? (loan.brownfield ? 70 : 20) : 100;
  steps.push({ id: "E3", points: land, weight: 0.2, input: loan.purpose === "new_build" ? Boolean(loan.brownfield) : "reuse", rule: "land_use" });
  const risk = { low: 100, medium: 60, high: 20 }[loan.climate_risk ?? "medium"];
  steps.push({ id: "E4", points: risk, weight: 0.15, input: loan.climate_risk ?? "medium", rule: "climate_risk" });
  return steps;
}

function social(loan) {
  const steps = [];
  const region = REGIONS.find((r) => r.id === loan.region);
  // one division, so a whole density reads whole: users / (cost / 1e5) rounds twice and gave 120.00000000000001 for 42
  // users on EUR 35,000 (round 37, reviewer A)
  const perHundredK = (loan.users * 1e5) / loan.project_cost;
  steps.push({ id: "S1", points: clamp((Math.log10(1 + perHundredK) / Math.log10(1 + 500)) * 100, 0, 100), weight: 0.35,
    // the input as computed, so the page never shows 0 beside points worked out from 0.04 (round 31, reviewer A)
    input: perHundredK, rule: "users_per_100k" });
  // S2 reads the participation rate of the loan's own sector: low sport practice for a sports loan, low cultural
  // participation for a cultural one
  steps.push({ id: "S2", points: region.need[loan.sector], weight: 0.25, input: region.rate[loan.sector], input_unit: "percent", rule: "regional_need", status: region.status });
  const inclusion = decimalTimes(clamp(loan.free_access_share ?? 0, 0, 1), 40, (loan.accessible_beyond_minimum ? 40 : 0) + (loan.youth_or_senior_programme ? 20 : 0));
  steps.push({ id: "S3", points: inclusion, weight: 0.25, input: inclusion, rule: "inclusion" });
  steps.push({ id: "S4", points: loan.inner_area ? 100 : 40, weight: 0.15, input: Boolean(loan.inner_area), rule: "inner_area" });
  return steps;
}

function governance(loan) {
  const steps = [];
  const publicBody = ["comune", "region_province", "school_university"].includes(loan.borrower);
  steps.push({ id: "G1", points: publicBody ? 80 : 50, weight: 0.3, input: loan.borrower, rule: "borrower_transparency" });
  steps.push({ id: "G2", points: loan.monitoring_plan ? 100 : 0, weight: 0.3, input: Boolean(loan.monitoring_plan), rule: "monitoring_plan" });
  steps.push({ id: "G3", points: loan.audited_accounts ? 100 : 30, weight: 0.2, input: Boolean(loan.audited_accounts), rule: "audited_accounts" });
  steps.push({ id: "G4", points: loan.community_consulted ? 100 : 40, weight: 0.2, input: Boolean(loan.community_consulted), rule: "community_consulted" });
  return steps;
}

const pillarScore = (steps) => steps.reduce((sum, s) => sum + s.points * s.weight, 0);

export function esgRating(loan) {
  const pillars = { E: environmental(loan), S: social(loan), G: governance(loan) };
  const raw = Object.fromEntries(Object.entries(pillars).map(([k, steps]) => [k, pillarScore(steps)]));
  const scores = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, round(v, 1)]));
  // the total weights the unrounded pillar scores and is rounded once, to one decimal; the grade follows the total as
  // shown, so a 64.94 reads 64.9 and C (round 34, reviewer A: rounding the pillars first gave 65 and B)
  const total = round(raw.E * WEIGHTS.E + raw.S * WEIGHTS.S + raw.G * WEIGHTS.G, 1);
  const grade = BANDS.find((b) => total >= b.min).grade;
  return { pillars, scores, total, grade };
}

// Benefit period in whole years: the life assumed for the loan's purpose and, when set, the shorter horizon the
// lender wants to count. p holds the values to use, so a drawn or overridden life changes the period.
export function benefitYears(loan, p) {
  const life = loan.purpose === "new_build" ? p.asset_life_build
    : loan.purpose === "equipment" ? p.asset_life_equipment : p.asset_life_renovation;
  return Math.max(1, Math.round(loan.horizon_years ? Math.min(life, loan.horizon_years) : life));
}

// SROI. People's value takes deadweight, displacement and attribution, then a yearly drop-off. The avoided-carbon value
// is the project's own metered saving: it takes its own deadweight (the share that rules or a cleaner grid would have
// saved anyway) and attribution, and no displacement or drop-off, since a building's saving does not move elsewhere or
// fade with users. A new facility counts no carbon: carbon benefits and added emissions of new facilities are not
// modelled, a stated exclusion. Benefits are discounted over
// the benefit period and divided by all inputs: the project cost plus the present value of the yearly running cost the
// project adds. p holds the values to use; p.years, when given, fixes the period.
export function sroi(loan, p) {
  const perUser = loan.sector === "sport" ? p.value_per_user_sport : p.value_per_user_culture;
  const userValue = loan.users * perUser;
  const carbonValue = loan.purpose === "new_build" ? 0 : (loan.co2_avoided_t ?? 0) * p.carbon_value;
  const gross = userValue + carbonValue;
  const peopleNet = userValue * (1 - p.deadweight) * (1 - p.displacement) * (1 - p.attribution);
  const carbonNet = carbonValue * (1 - (p.carbon_deadweight ?? 0)) * (1 - p.attribution);
  const net = peopleNet + carbonNet;
  const years = p.years ?? benefitYears(loan, p);
  const running = loan.operating_cost ?? 0;
  let presentValue = 0, runningPV = 0, undiscounted = 0;
  const flows = [];
  // the drop-off and discount factors are built by multiplying year by year, not with **, since browsers may compute a
  // power to different last digits and the passport replays its unrounded values exactly (local review of round 35)
  let kept = 1, factor = 1;
  for (let t = 1; t <= years; t += 1) {
    const value = peopleNet * kept + carbonNet;
    factor *= 1 + p.discount_rate;
    kept *= 1 - p.drop_off;
    presentValue += value / factor;
    undiscounted += value;
    runningPV += running / factor;
    flows.push({ year: t, value: round(value), discounted: round(value / factor) });
  }
  const inputs = loan.project_cost + runningPV;
  // the undiscounted total sums the unrounded yearly values; flows are rounded for the list only (round 33, reviewer A:
  // summing rounded flows gave EUR 102,061.50 before discounting beside EUR 102,061.44 after a zero discount rate)
  return { userValue, carbonValue, gross, peopleNet, carbonNet, net, years, presentValue, runningPV, inputs, undiscounted,
    ratio: presentValue / inputs, flows };
}

export function centralValues(loan, params = PARAMS) {
  return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
}

// A seeded generator, so the same loan always gives the same range and the audit record can be replayed.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A triangular draw between lo and hi with its peak at mode.
export function triangular(u, lo, mode, hi) {
  if (hi === lo) return lo;
  const c = (mode - lo) / (hi - lo);
  return u < c ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
}

// The f-th percentile of a sorted list: the value at rank floor(f * n), counted from 0.
export const percentile = (sorted, f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];

// Uncertainty: draw every ranged parameter at once and report the 10th, 50th and 90th percentiles of the ratio. A
// reviewer's value is the peak of its draws and its widened range their span, so the range shows the reviewer's view.
export function sroiRange(loan, params = PARAMS, draws = 2000, seed = 20261028) {
  const next = rng(seed);
  const central = centralValues(loan, params);
  const ratios = [];
  // parameters drawn in name order, so the same parameters in any order give the same draws
  const ranged = Object.keys(params).sort().filter((k) => params[k].range);
  for (let i = 0; i < draws; i += 1) {
    const p = { ...central };
    for (const k of ranged) p[k] = triangular(next(), params[k].range[0], params[k].value, params[k].range[1]);
    ratios.push(sroi(loan, p).ratio);
  }
  ratios.sort((a, b) => a - b);
  return { p10: percentile(ratios, 0.1), p50: percentile(ratios, 0.5), p90: percentile(ratios, 0.9), draws, seed };
}

// A point inside every assumption's range: each ranged assumption at the middle of its range, the rest at their values.
// SROI's adjustments multiply, so a part of the value that is above zero here is above zero for some draws.
function midValues(params) {
  return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.range ? (d.range[0] + d.range[1]) / 2 : d.value]));
}

// The assumptions drawn one way only: those whose value in use sits at one end of the range it is drawn from (the
// published range, widened for a reviewer's value). For each, the side its draws go, and how SROI moves at the values
// sampled across that side, the others at their values in use: "more", "less", or "both" where it rises at some and
// falls at others (round 15, reviewers A and B); some values sampled may leave it unchanged. The values sampled are
// every whole year for a period, since the period counts whole years only (round 18, reviewer A), and otherwise 96 steps
// and two points right beside the value in use, so a turn close to it is seen (round 16, reviewer C; round 17, reviewer
// A); a turn between samples can still be missed, and the card says the directions are those sampled. Read from the
// parameters in use, so a reviewer's value at a range end is named with its own direction (round 14, reviewer B, HIGH).
// Each one-sided assumption is also read with the other one-sided assumptions at the middle of their ranges and the
// rest at their values in use (round 16, reviewer C), always, not only where a part of the value is set to zero, so the
// method page's promise holds (round 18, reviewer A, HIGH). That second reading is kept apart (round 17, reviewer A):
// an assumption that moved nothing alone is marked together; one whose second reading differs carries it as
// with_others. One that moves nothing either way is left out.
// onPoint (tests only) is told each value an assumption is read at, so the whole-year rule is pinned on this path
// itself, not only on samplePoints (round 20, reviewer A).
export function oneWayDraws(loan, params = PARAMS, steps = 96, onPoint = null) {
  const central = centralValues(loan, params);
  const ends = Object.entries(params).filter(([, d]) => d.range && d.range[0] !== d.range[1] && (d.value <= d.range[0] || d.value >= d.range[1]));
  const middle = (except) => Object.fromEntries(ends.filter(([k]) => k !== except).map(([k, d]) => [k, (d.range[0] + d.range[1]) / 2]));
  const out = [];
  for (const [k, d] of ends) {
    const up = d.value <= d.range[0];
    const far = up ? d.range[1] : d.range[0];
    const points = samplePoints(d, far, steps);
    const way = (others) => {
      const base = sroi(loan, { ...others, [k]: d.value }).ratio;
      const tol = 1e-12 * Math.max(1, Math.abs(base));
      let more = false, less = false;
      for (const x of points) {
        if (onPoint) onPoint(k, x);
        const r = sroi(loan, { ...others, [k]: x }).ratio;
        if (r > base + tol) more = true;
        else if (r < base - tol) less = true;
      }
      return more && less ? "both" : more ? "more" : less ? "less" : null;
    };
    const alone = way(central);
    const together = way({ ...central, ...middle(k) });
    if (!alone && !together) continue;
    const draws = up ? "up" : "down";
    if (!alone) out.push({ param: k, draws, value: together, together: true });
    else if (together && together !== alone) out.push({ param: k, draws, value: alone, with_others: together });
    else out.push({ param: k, draws, value: alone });
  }
  return out;
}

// The adjustment waterfall: how much of the gross yearly value each adjustment removes, then the years and discounting.
export function waterfall(loan, p) {
  const r = sroi(loan, p);
  const carbonKept = r.carbonValue * (1 - (p.carbon_deadweight ?? 0));
  const afterDeadweight = r.userValue * (1 - p.deadweight) + carbonKept;
  const afterDisplacement = r.userValue * (1 - p.deadweight) * (1 - p.displacement) + carbonKept;
  return [
    { id: "gross", value: r.gross },
    { id: "deadweight", value: afterDeadweight - r.gross },
    { id: "displacement", value: afterDisplacement - afterDeadweight },
    { id: "attribution", value: r.net - afterDisplacement },
    { id: "net", value: r.net },
    { id: "over_years", value: r.undiscounted },
    { id: "pv", value: r.presentValue },
  ];
}

// The values a parameter may take, one rule for sliders, overrides, break-even and passports: a share from 0 to 100
// percent, a yearly rate from 0 to 99 percent, a benefit period from 1 to 60 whole years, a money value from 0 to ten
// times its published range's top. A reviewer's value never moves the domain: it is read from the published range.
export function domainOf(d) {
  if (d.domain) return d.domain;
  if (d.unit === "share") return [0, 1];
  if (d.unit === "per year") return [0, 0.99];
  if (d.unit === "years") return [1, 60];
  const range = d.status === "reviewer" ? d.cited_range : d.range;
  const top = d.status === "reviewer" ? d.cited_value : d.value;
  return [0, (range ? range[1] : top) * 10];
}

// The published range: a reviewer's widened range is used for draws, never to say what the stated range is.
export const statedRange = (d) => (d.status === "reviewer" ? d.cited_range : d.range);

export const inDomain = (d, v) => {
  const [lo, hi] = domainOf(d);
  return typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi && (d.unit !== "years" || Number.isInteger(v));
};

// The points a parameter is tried at across [lo, hi]: every whole year for a benefit period, else n even steps.
// The values a one-sided assumption is sampled at between its value in use and its far range end: every whole year for a
// period, else `steps` steps and two points right beside the value in use; never the value in use itself (round 19,
// reviewer A: exported so the whole-year rule is pinned).
export function samplePoints(d, far, steps = 96) {
  const near = d.unit === "years" ? [] : [1e-6, 1e-3].map((f) => d.value + (far - d.value) * f);
  return [...near, ...grid(d, Math.min(d.value, far), Math.max(d.value, far), steps)].filter((x) => x !== d.value);
}

function grid(d, lo, hi, n) {
  if (d.unit === "years") return Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i);
  return Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);
}

// Which assumption moves the ratio most: each ranged parameter alone across its whole range, the rest central. The
// swing is the highest ratio minus the lowest anywhere in the range, so a peak inside the range counts too (with a
// running cost, a longer period can lower the ratio after a point).
export function sensitivity(loan, params = PARAMS) {
  const central = centralValues(loan, params);
  const base = sroi(loan, central).ratio;
  const rows = [];
  for (const [k, d] of Object.entries(params)) {
    const range = statedRange(d);
    if (!range) continue;
    const at = (v) => sroi(loan, { ...central, [k]: v }).ratio;
    const seen = grid(d, range[0], range[1], 100).map(at);
    const lowest = Math.min(...seen), highest = Math.max(...seen);
    rows.push({ param: k, at_low: at(range[0]), at_high: at(range[1]), lowest, highest, swing: highest - lowest });
  }
  rows.sort((a, b) => b.swing - a.swing);
  return { base, rows };
}

// The places in [lo, hi] where the ratio crosses 1.0, in order. A benefit period counts whole years, so the ratio
// steps from one year to the next: the crossing is the first whole year on the far side. Other values are scanned in
// 2,000 steps and each step that crosses is narrowed by bisection. Two crossings closer together than one step (a
// ratio that only grazes 1.0) can be missed, so the list is what the scan finds, not a proof that there is no other.
function crossings(f, d, lo, hi) {
  const out = [];
  const xs = grid(d, lo, hi, 2000);
  let prev = f(xs[0]) - 1;
  for (let i = 1; i < xs.length; i += 1) {
    const now = f(xs[i]) - 1;
    if ((prev < 0) !== (now < 0)) {
      let x = xs[i], a = xs[i - 1], b = xs[i];
      if (d.unit !== "years") {
        let fa = prev;
        for (let j = 0; j < 60; j += 1) {
          const m = (a + b) / 2, fm = f(m) - 1;
          if ((fa < 0) !== (fm < 0)) b = m; else { a = m; fa = fm; }
        }
        x = (a + b) / 2;
      }
      // the last bracket is kept: its two ends sit on opposite sides of 1.0, so inside or outside is read from it
      out.push({ value: x, direction: now < 0 ? "down" : "up", bracket: [a, b] });
    }
    prev = now;
  }
  return out;
}

// What would change our mind: for each assumption, each value at which the scan finds the ratio crossing 1.0 with the
// rest central (up: reaches 1.0; down: falls below it), each marked inside or outside the stated range. Users get an exact count:
// the least whole number of people whose ratio reaches 1.0, found by bisection on whole counts, each count run through
// the method itself, so no rounding of a slope can leave the count short (round 10, reviewer B, HIGH).
export function usersAtOne(loan, central) {
  const at = (users) => sroi({ ...loan, users }, central).ratio;
  // with no participants at all the carbon value alone may reach 1.0: then none are needed, which is an answer, not none
  if (at(0) >= 1) return 0;
  // a count past the users field's limit is no answer, and so is a value per person that adds nothing
  if (!(at(USERS_MAX) >= 1)) return null;
  let below = 0, reaches = USERS_MAX;
  while (reaches - below > 1) {
    const mid = Math.floor((below + reaches) / 2);
    if (at(mid) >= 1) reaches = mid; else below = mid;
  }
  return reaches;
}

export function breakEven(loan, params = PARAMS) {
  const central = centralValues(loan, params);
  const base = sroi(loan, central).ratio;
  const users = usersAtOne(loan, central);
  const rows = [];
  for (const [k, d] of Object.entries(params)) {
    const range = statedRange(d);
    if (!range) continue;
    const [lo, hi] = domainOf(d);
    const at = (v) => sroi(loan, { ...central, [k]: v }).ratio;
    const found = crossings(at, d, lo, hi);
    // a crossing lies inside the published range when the range itself holds values on both sides of 1.0 at it: the
    // crossing's bracket, cut to the range, still has one end below 1.0 and one at or above it. That is the same
    // equality rule as the verdict (below means under 1.0), and no rounding of the bisected value can move a crossing
    // across an end (round 22, reviewer B, HIGH twice). For whole years both years of the step must be in the range;
    // a step from a year below the range to its first year is "step_outside" (round 22, reviewer B)
    const below = (v) => at(v) < 1;
    const place = (c) => {
      const [a, b] = c.bracket;
      if (d.unit === "years") {
        if (a >= range[0] && b <= range[1]) return "inside";
        return b >= range[0] && b <= range[1] ? "step_outside" : "outside";
      }
      const lo = Math.max(a, range[0]), hi = Math.min(b, range[1]);
      return lo <= hi && below(lo) !== below(hi) ? "inside" : "outside";
    };
    const marked = found.map(({ bracket, ...c }) => {
      const where = place({ ...c, bracket });
      return { ...c, inside: where === "inside", place: where };
    });
    // the value shown first is the first crossing inside the range, else the first found
    const first = marked.find((c) => c.inside) ?? marked[0];
    // a reviewer's value outside the published range can leave the whole range on the far side of 1.0 with no crossing
    // inside it, so the lowest ratio over the range is read too, unrounded
    const scanned = grid(d, range[0], range[1], 2000).map(at);
    // the value in use counts as scanned when it lies in the range, so a range is never called below 1.0 at every
    // value while the card shows the ratio at 1.0 or above at a value inside it (round 21, reviewer A)
    if (central[k] >= range[0] && central[k] <= range[1]) scanned.push(base);
    const range_lowest = Math.min(...scanned);
    // the highest too: only a range whose every scanned value is below 1.0 may be called below 1.0 throughout
    const range_highest = Math.max(...scanned);
    rows.push({ param: k, crossings: marked, value_at_one: first ? first.value : null, inside_range: marked.some((c) => c.inside),
      range_lowest, range_highest });
  }
  // holds: SROI at least 1.0 at the central values and at every scanned value of each assumption's published range
  const holds = base >= 1 && rows.every((r) => !r.inside_range && r.range_lowest >= 1);
  return { base, users_at_one: users, rows, holds };
}

// The break-even verdict's sentence: below 1.0 at the central values, holds across every range, or fragile. The page
// reads its sentence from here, so the mapping is tested by behaviour (round 22, reviewer B).
export const verdictKey = (b) => (b.base < 1 ? "be_below" : b.holds ? "be_holds" : "be_fragile");
// The central ratio as the card shows it: two decimals, except that a ratio below 1.0 which rounds to 1.00 is shown as
// just under 1, so the number never reads 1 beside a verdict that says less than one euro (round 24, reviewer B).
export const ratioShown = (raw) => ({ value: round(raw, 2), under: raw < 1 && round(raw, 2) >= 1 });

// The words beside each crossing, by its place; a step from below the range says which side of 1.0 its first year is on
// (round 23, reviewer B, HIGH: a downward step was told its first year was at or above 1.0).
export const placeKey = (c) => (c.place === "inside" ? "inside_range" : c.place === "step_outside"
  ? (c.direction === "down" ? "outside_range_step_down" : "outside_range_step") : "outside_range");

// Reviewer overrides: a copy of the parameters with chosen central values replaced and marked as the reviewer's,
// each range widened if needed so it still holds the new central value. A value outside the parameter's domain is
// ignored.
// Applied to parameters that already carry a reviewer's value, it starts again from the method's own value, so the
// cited value, status and range are always the published ones.
// What the break-even list may say about a range with no crossing inside it, when the central ratio is at least 1.0:
// "all_below" only when every scanned value, the value in use included, is below 1.0; "some_below" when the scan found
// values below 1.0 and at or above it but could not place a crossing (a narrow crossing can fall between scanned
// values); null otherwise.
export function rangeNote(row, base) {
  if (base < 1 || row.inside_range || !(row.range_lowest < 1)) return null;
  return row.range_highest < 1 ? "all_below" : "some_below";
}

export const widened = (range, v) => (range ? [Math.min(range[0], v), Math.max(range[1], v)] : undefined);

// A parameter as the method publishes it: a reviewer's value, range and status replaced by the cited ones.
export function published(d) {
  if (d.status !== "reviewer") return d;
  const { cited_value, cited_status, cited_range, ...rest } = d;
  return { ...rest, value: cited_value, status: cited_status, range: cited_range };
}

export function withOverrides(params, overrides = {}) {
  const out = {};
  for (const [k, d0] of Object.entries(params)) {
    const d = published(d0);
    if (!(k in overrides)) { out[k] = d0; continue; }
    // a number, or a number written as text as a slider sends it; null, empty text or true is ignored, never read as 0 or 1
    const raw = overrides[k];
    const v = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof v !== "number") { out[k] = d0; continue; }
    if (v === d.value) { out[k] = d; continue; }
    if (!inDomain(d, v)) { out[k] = d0; continue; }
    out[k] = { ...d, value: v, status: "reviewer", cited_value: d.value, cited_status: d.status, cited_range: d.range,
      range: widened(d.range, v) };
  }
  return out;
}

// One full assessment, with everything an auditor needs to replay it.
export function assess(loan, params = PARAMS) {
  const problems = validate(loan);
  if (problems.length) return { ok: false, problems };
  const esg = esgRating(loan);
  const central = centralValues(loan, params);
  const value = sroi(loan, central);
  const range = sroiRange(loan, params);
  // benefits counted over one year and five, divided by the same inputs as the full period (project cost plus the
  // running cost over the whole period), so only the benefits stop; shown only where shorter than the full period.
  // Each carries the same flag as the central ratio, so one below 1.0 that rounds to 1.00 never reads 1 (round 25, reviewer A)
  const horizons = [1, 5].filter((y) => y < value.years).map((y) => {
    const raw = sroi(loan, { ...central, years: y }).presentValue / value.inputs;
    return { years: y, ratio: round(raw, 2), under: ratioShown(raw).under };
  });
  const illustrative = Object.entries(params).filter(([, d]) => d.status === "illustrative").map(([k]) => k);
  return {
    ok: true,
    method_version: METHOD_VERSION,
    loan,
    esg,
    sroi: { ...value, ratio: round(value.ratio, 2), ratio_under: ratioShown(value.ratio).under, presentValue: value.presentValue, runningPV: value.runningPV, inputs: value.inputs },
    horizons,
    // each percentile carries its under flag, and the central ratio is outside the band by the unrounded values, so a
    // band that starts at 0.998 beside a central 0.996 is said, though both show near 1 (round 26, reviewers A and B)
    range: { p10: round(range.p10, 2), p50: round(range.p50, 2), p90: round(range.p90, 2),
      // the unrounded ends place the band on the chart (round 34, reviewer A)
      p10_raw: range.p10, p50_raw: range.p50, p90_raw: range.p90, draws: range.draws, seed: range.seed,
      under: { p10: ratioShown(range.p10).under, p50: ratioShown(range.p50).under, p90: ratioShown(range.p90).under },
      central_outside: value.ratio < range.p10 || value.ratio > range.p90 },
    // unrounded, so the chart and the gross value line round once from the same value (round 31, reviewer A: EUR 10.49776
    // read EUR 11 in the chart, after rounding to cents first, and EUR 10 in the step table)
    waterfall: waterfall(loan, central),
    sensitivity: sensitivity(loan, params).rows.map((s) => ({ ...s, at_low: round(s.at_low, 2), at_high: round(s.at_high, 2),
      lowest: round(s.lowest, 2), highest: round(s.highest, 2), swing: round(s.swing, 2),
      // the unrounded ends place the bar, so one crossing 1.0 by less than 0.005 keeps its width (round 32, reviewer A)
      lowest_raw: s.lowest, highest_raw: s.highest,
      lowest_under: ratioShown(s.lowest).under, highest_under: ratioShown(s.highest).under,
      // whether the assumption moves the result at all, read unrounded, so a bar that crosses 1.0 by less than 0.005 is
      // drawn (round 27, reviewer A)
      moves: s.swing > 0 })),
    break_even: breakEven(loan, params),
    parameters: Object.fromEntries(Object.entries(params).map(([k, d]) => [k, { value: d.value, unit: d.unit, range: d.range ?? null, status: d.status, source: d.source,
      ...(d.status === "reviewer" ? { cited_value: d.cited_value, cited_status: d.cited_status } : {}) }])),
    illustrative,
    transferred: transferredUsed(loan, params),
    cautions: cautions(loan, params),
    one_way: oneWayDraws(loan, params),
  };
}

// The transferred values this loan uses: its own sector's value per person, not the other sector's. A reviewer's value
// that replaces one keeps it listed, since the method's value it replaces, and so the UK basis, is still transferred
// (round 10, reviewers A and B).
export function transferredUsed(loan, params = PARAMS) {
  const other = loan.sector === "sport" ? "value_per_user_culture" : "value_per_user_sport";
  return Object.entries(params).filter(([k, d]) => k !== other && published(d).status === "transferred").map(([k]) => k);
}

// Reminders shown on the result card, not changes to the result. deadweight_works: works on an existing facility with
// the method's own deadweight, which is set for users of a new facility; the deadweight note asks for 100 percent
// where the works bring no additional participation and avoid no loss of it (round 14: accessibility works can add
// participation without adding capacity). energy_no_saving: an energy-efficiency loan with no carbon saving or no
// energy class gained entered. deadweight_reviewer: works on an existing facility where a reviewer set deadweight below
// 100 percent, so some participation is still counted as added; a reviewer's number is not evidence of added
// participation or an avoided loss (round 11, reviewer B; round 12: participation value falls to zero only at 100
// percent, so the caution no longer stops at the top of the range). deadweight_reviewer_new: a new facility where a
// reviewer set deadweight below the method's own value, so more users are counted as new; that is not evidence either
// (round 12). The three participation cautions fire only where the central result counts participation value: not with
// no users (round 13), and not where a value per person of 0 or displacement or attribution at 100 percent already
// removes it (round 14, reviewer B). deadweight_full_range: deadweight at 100 percent removes participation from the
// central result, but the assumption range still draws deadweight below 100 percent, so the range counts some
// participation the central result leaves out (round 14, expert point 1).
export function cautions(loan, params = PARAMS) {
  const out = [];
  const d = params.deadweight;
  const reviewer = d.status === "reviewer";
  const r = sroi(loan, centralValues(loan, params));
  const people = r.peopleNet > 0;
  // the range's draws count participation where an assumption the central result sets to an end that leaves none (a
  // value per person of 0, deadweight or attribution of 1) is drawn inside its range (round 15, reviewer C)
  const drawn = sroi(loan, midValues(params)).peopleNet > 0;
  if (people && loan.purpose !== "new_build" && !reviewer) out.push("deadweight_works");
  if (people && loan.purpose !== "new_build" && reviewer && d.value < 1) out.push("deadweight_reviewer");
  if (people && loan.purpose === "new_build" && reviewer && d.value < published(d).value) out.push("deadweight_reviewer_new");
  if (!people && drawn) out.push(d.value >= 1 && d.range && d.range[0] < 1 ? "deadweight_full_range" : "participation_range");
  if (loan.purpose === "energy" && (!loan.co2_avoided_t || !loan.energy_class_gain)) out.push("energy_no_saving");
  return out;
}

// The method passport: the assessment as one canonical JSON text (keys sorted), so the same inputs give the same bytes
// and the same SHA-256 on any machine. Yearly flows are left out; they follow from the rest.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function passport(result, reviewer = "") {
  const { flows, ...sroiCore } = result.sroi;
  return {
    schema: "impact-lens.passport.v1", method_version: result.method_version, reviewer,
    loan: result.loan, parameters: result.parameters,
    results: { esg_total: result.esg.total, esg_grade: result.esg.grade, esg_pillars: result.esg.scores,
      sroi: sroiCore, range: result.range, break_even_users: result.break_even.users_at_one },
  };
}

// Field-level differences between two passports: every leaf whose value differs, by path.
export function diffPassports(a, b) {
  const out = [];
  const walk = (x, y, path) => {
    const bothObjects = x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y);
    if (bothObjects) {
      for (const k of [...new Set([...Object.keys(x), ...Object.keys(y)])].sort()) {
        const at = path ? `${path}.${k}` : k;
        // a key left out and a key set to null are different texts, so different fingerprints: show the difference
        const hasX = x[k] !== undefined, hasY = y[k] !== undefined;
        if (hasX !== hasY) out.push({ path: at, a: hasX ? x[k] : "(missing)", b: hasY ? y[k] : "(missing)" });
        else walk(x[k], y[k], at);
      }
    } else if (canonical(x) !== canonical(y)) {
      out.push({ path, a: x ?? null, b: y ?? null });
    }
  };
  walk(a, b, "");
  return out;
}

const sameText = (a, b) => canonical(a) === canonical(b);

// What is wrong with a passport before it is replayed, as a list (empty when it can be replayed). Every parameter of
// the method must be there and nothing else; a value the reviewer did not change must be the method's own value,
// unit, range, source and status; a reviewer's value must lie in its domain, inside its range, and carry the
// method's own value as its cited value. So a passport cannot cite a value the method does not publish.
const PASSPORT_KEYS = ["schema", "method_version", "reviewer", "loan", "parameters", "results"];
const REVIEWER_KEYS = ["value", "unit", "range", "status", "source", "cited_value", "cited_status"];

export function passportProblems(pp, params = PARAMS) {
  if (!isObject(pp)) return ["not_an_object"];
  const problems = [];
  for (const k of Object.keys(pp)) if (!PASSPORT_KEYS.includes(k)) problems.push(k);
  if (pp.schema !== "impact-lens.passport.v1") problems.push("schema");
  if (pp.method_version !== METHOD_VERSION) problems.push("method_version");
  if (typeof pp.reviewer !== "string") problems.push("reviewer");
  // the same check as an assessment's, so a loan that can be assessed can be replayed and no other
  if (validate(pp.loan).length) problems.push("loan");
  if (!isObject(pp.results)) problems.push("results");
  if (!isObject(pp.parameters)) return [...problems, "parameters"];
  const keys = Object.keys(params);
  for (const k of Object.keys(pp.parameters)) if (!keys.includes(k)) problems.push(`parameters.${k}`);
  for (const k of keys) {
    // parameters that already carry a reviewer's value are checked against the published value, as withOverrides does
    const d = published(params[k]);
    const e = pp.parameters[k];
    const own = { value: d.value, unit: d.unit, range: d.range ?? null, status: d.status, source: d.source };
    if (!isObject(e)) { problems.push(`parameters.${k}`); continue; }
    if (e.status !== "reviewer") { if (!sameText(e, own)) problems.push(`parameters.${k}`); continue; }
    // exactly what withOverrides makes: a value other than the method's, in its domain, and the published range
    // widened to hold it
    if (!inDomain(d, e.value) || e.value === d.value || !sameText(e.range, widened(d.range, e.value) ?? null)
        || e.cited_value !== d.value || e.cited_status !== d.status || e.unit !== d.unit || !sameText(e.source, d.source)
        || Object.keys(e).length !== REVIEWER_KEYS.length || Object.keys(e).some((x) => !REVIEWER_KEYS.includes(x))) {
      problems.push(`parameters.${k}`);
    }
  }
  return problems;
}

// Replay: check the passport, rebuild the parameters it was made with, rerun the method on its own inputs and check
// that the result is the same text, byte for byte. Any failure, a malformed file included, is a failed replay.
export function replays(pp, params = PARAMS) {
  try {
    if (passportProblems(pp, params).length) return false;
    // rebuilt from the published values, so a bundle that already carries a reviewer's value replays the same way
    const rebuilt = Object.fromEntries(Object.entries(params).map(([k, d]) => [k, pp.parameters[k].status === "reviewer"
      ? withOverrides({ [k]: published(d) }, { [k]: pp.parameters[k].value })[k]
      : published(d)]));
    const again = assess(pp.loan, rebuilt);
    return again.ok && canonical(passport(again, pp.reviewer)) === canonical(pp);
  } catch {
    return false;
  }
}
