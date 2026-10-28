import test from "node:test";
import assert from "node:assert/strict";
import { decimalTimes, assess, sroi, rangeNote, oneWayDraws, validate, esgRating, centralValues, sroiRange, waterfall, sensitivity, breakEven, withOverrides, passport, diffPassports, canonical, replays, benefitYears, passportProblems, domainOf, inDomain, BOOLEANS, widened, rng, percentile, triangular, samplePoints, verdictKey, placeKey, ratioShown, statedRange } from "../js/engine.js";
import { syntheticBook } from "../js/synthetic.js";
import { REGIONS } from "../js/regions.js";
import { TEXT, crossingShown, ratioWords, ratioPerEuro, ratioExact, rangeEnds, barEnds, compareCell, compareCells, digitsNearEnds, endText, percentText, shareText } from "../js/i18n.js";
import { passportSlots, slotsPerResult, pointerState, holdHeight } from "../js/compare.js";
import { readFileSync } from "node:fs";
import { PARAMS, BANDS, WEIGHTS, METHOD_VERSION } from "../js/params.js";

const LOAN = {
  sector: "sport", purpose: "renovation", borrower: "comune", region: "umbria", amount: 800000, project_cost: 1000000,
  term: 15, users: 1200, energy_class_gain: 3, renewable_share: 0.4, climate_risk: "low", accessible_beyond_minimum: true,
  free_access_share: 0.2, youth_or_senior_programme: true, inner_area: true, monitoring_plan: true, audited_accounts: true,
  community_consulted: false, co2_avoided_t: 40,
};

test("a valid loan has no problems and a bad one names each field", () => {
  assert.deepEqual(validate(LOAN), []);
  assert.deepEqual(validate({ ...LOAN, amount: 0, region: "nowhere" }), ["region", "amount"]);
  assert.deepEqual(validate({ ...LOAN, project_cost: 100 }), ["project_cost"]);
});

test("SROI follows the four adjustments, drop-off and discounting by hand", () => {
  const p = { value_per_user_sport: 100, value_per_user_culture: 0, carbon_value: 0, deadweight: 0.5, displacement: 0,
    attribution: 0, drop_off: 0, discount_rate: 0, years: 2 };
  const r = sroi({ ...LOAN, users: 10, co2_avoided_t: 0, project_cost: 1000 }, p);
  assert.equal(r.gross, 1000);
  assert.equal(r.net, 500);
  assert.equal(r.presentValue, 1000);
  assert.equal(r.ratio, 1);
  const d = sroi({ ...LOAN, users: 10, co2_avoided_t: 0, project_cost: 1000 }, { ...p, drop_off: 0.1, discount_rate: 0.1 });
  assert.ok(Math.abs(d.presentValue - (500 / 1.1 + 450 / 1.21)) < 1e-9);
});

test("the rating is the weighted pillar score and its band", () => {
  const e = esgRating(LOAN);
  assert.ok(e.total >= 0 && e.total <= 100);
  assert.ok(["A", "B", "C", "D", "E"].includes(e.grade));
  const worse = esgRating({ ...LOAN, monitoring_plan: false, audited_accounts: false, energy_class_gain: 0, renewable_share: 0 });
  assert.ok(worse.total < e.total);
});

test("the range holds the central ratio and replays exactly with its seed", () => {
  const a = sroiRange(LOAN), b = sroiRange(LOAN);
  assert.deepEqual(a, b);
  const central = sroi(LOAN, centralValues(LOAN)).ratio;
  assert.ok(a.p10 <= central && central <= a.p90, `${a.p10} ${central} ${a.p90}`);
});

test("an assessment lists every illustrative parameter", () => {
  const r = assess(LOAN);
  assert.ok(r.ok);
  assert.ok(r.illustrative.length > 0);
  assert.equal(r.method_version, "0.4.36");
  assert.equal(METHOD_VERSION, "0.4.36");
});

test("the waterfall steps add up from gross to net", () => {
  const p = centralValues(LOAN);
  const w = waterfall(LOAN, p);
  const get = (id) => w.find((s) => s.id === id).value;
  assert.ok(Math.abs(get("gross") + get("deadweight") + get("displacement") + get("attribution") - get("net")) < 1e-6);
  assert.ok(Math.abs(get("pv") - sroi(LOAN, p).presentValue) < 1e-6);
});

test("sensitivity is sorted by swing and each end matches a direct run", () => {
  const s = sensitivity(LOAN);
  for (let i = 1; i < s.rows.length; i += 1) assert.ok(s.rows[i - 1].swing >= s.rows[i].swing);
  const top = s.rows[0];
  const direct = sroi(LOAN, { ...centralValues(LOAN), [top.param]: PARAMS[top.param].range[0] }).ratio;
  assert.ok(Math.abs(direct - top.at_low) < 1e-12);
});

test("break-even values bring the ratio to 1.0", () => {
  const loan = { ...LOAN, users: 100, co2_avoided_t: 0 };
  const b = breakEven(loan);
  const central = centralValues(loan);
  assert.ok(b.users_at_one > 100);
  assert.ok(sroi({ ...loan, users: b.users_at_one }, central).ratio >= 1);
  assert.ok(sroi({ ...loan, users: b.users_at_one - 1 }, central).ratio < 1);
  for (const r of b.rows.filter((x) => x.value_at_one != null)) {
    assert.ok(Math.abs(sroi(loan, { ...central, [r.param]: r.value_at_one }).ratio - 1) < 1e-6, r.param);
  }
});

test("reviewer overrides are marked, keep the cited value and widen the range", () => {
  const p = withOverrides(PARAMS, { deadweight: 0.97 });
  assert.equal(p.deadweight.value, 0.97);
  assert.equal(p.deadweight.status, "reviewer");
  assert.equal(p.deadweight.cited_value, PARAMS.deadweight.value);
  assert.equal(p.deadweight.range[1], 0.97);
  assert.equal(p.deadweight.range[0], PARAMS.deadweight.range[0]);
  assert.equal(p.attribution, PARAMS.attribution);
  assert.ok(assess(LOAN, p).sroi.ratio < assess(LOAN).sroi.ratio);
});

test("passports are canonical and two reviewers' passports differ only where they disagree", () => {
  const a = passport(assess(LOAN), "A");
  const again = passport(assess({ ...LOAN }), "A");
  assert.equal(canonical(a), canonical(again));
  assert.equal(canonical({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
  const b = passport(assess(LOAN, withOverrides(PARAMS, { deadweight: 0.6 })), "B");
  const paths = diffPassports(a, b).map((d) => d.path);
  assert.ok(paths.includes("reviewer"));
  assert.ok(paths.includes("parameters.deadweight.value"));
  assert.ok(paths.includes("results.sroi.ratio"));
  assert.ok(!paths.some((p) => p.startsWith("loan.")));
});

test("a passport replays exactly, and an altered one does not", () => {
  const pp = JSON.parse(canonical(passport(assess(LOAN, withOverrides(PARAMS, { attribution: 0.3 })), "B")));
  assert.ok(replays(pp));
  assert.ok(!replays({ ...pp, results: { ...pp.results, esg_grade: "A+" } }));
  assert.ok(!replays({ ...pp, loan: { ...pp.loan, users: pp.loan.users + 1 } }));
  assert.ok(!replays({ ...pp, method_version: "0.0.1" }));
});

test("regional need follows the loan's sector: lowest rate 100, highest 0", async () => {
  const { REGIONS } = await import("../js/regions.js");
  const by = (id) => REGIONS.find((r) => r.id === id);
  assert.equal(REGIONS.length, 20);
  assert.equal(by("calabria").need.sport, 100);
  assert.equal(by("trentino_alto_adige").need.sport, 0);
  assert.equal(by("calabria").need.culture, 100);
  assert.equal(by("trentino_alto_adige").need.culture, 0);
  const sport = esgRating({ ...LOAN, region: "calabria" }).pillars.S.find((s) => s.id === "S2");
  const culture = esgRating({ ...LOAN, sector: "culture", region: "campania" }).pillars.S.find((s) => s.id === "S2");
  assert.equal(sport.points, 100);
  assert.equal(culture.points, by("campania").need.culture);
  assert.notEqual(by("campania").need.sport, by("campania").need.culture);
});

test("validation names each bad optional field and refuses non-finite numbers", () => {
  assert.deepEqual(validate({ ...LOAN, climate_risk: "severe" }), ["climate_risk"]);
  assert.deepEqual(validate({ ...LOAN, energy_class_gain: Number.NaN }), ["energy_class_gain"]);
  assert.deepEqual(validate({ ...LOAN, renewable_share: 1.5 }), ["renewable_share"]);
  assert.deepEqual(validate({ ...LOAN, co2_avoided_t: -1 }), ["co2_avoided_t"]);
  assert.deepEqual(validate({ ...LOAN, operating_cost: Infinity }), ["operating_cost"]);
  assert.deepEqual(validate({ ...LOAN, project_cost: Infinity }), ["project_cost"]);
  assert.deepEqual(validate({ ...LOAN, term: 15.5 }), ["term"]);
  assert.deepEqual(validate({ ...LOAN, horizon_years: 0 }), ["horizon_years"]);
  assert.deepEqual(validate({ ...LOAN, horizon_years: 1.5 }), ["horizon_years"]);
  assert.deepEqual(validate({ ...LOAN, sector: "music", purpose: "x", borrower: "y", users: -1 }), ["sector", "purpose", "borrower", "users"]);
  assert.deepEqual(validate({ ...LOAN, amount: 2e9, project_cost: 3e9 }), ["amount"]);
  assert.equal(assess({ ...LOAN, climate_risk: "severe" }).ok, false);
});

test("the benefit period follows the purpose, its drawn life and the horizon", () => {
  const p = centralValues(LOAN);
  assert.equal(benefitYears({ ...LOAN, purpose: "new_build" }, p), PARAMS.asset_life_build.value);
  assert.equal(benefitYears({ ...LOAN, purpose: "renovation" }, p), PARAMS.asset_life_renovation.value);
  assert.equal(benefitYears({ ...LOAN, purpose: "energy" }, p), PARAMS.asset_life_renovation.value);
  assert.equal(benefitYears({ ...LOAN, purpose: "equipment" }, p), PARAMS.asset_life_equipment.value);
  assert.equal(benefitYears({ ...LOAN, horizon_years: 5 }, p), 5);
  assert.equal(benefitYears(LOAN, { ...p, asset_life_renovation: 9.6 }), 10);
  assert.equal(sroi(LOAN, { ...p, asset_life_renovation: 9 }).years, 9);
});

test("carbon takes attribution only and never drops off; running costs join the denominator", () => {
  const p = { value_per_user_sport: 0, value_per_user_culture: 100, carbon_value: 100, deadweight: 0.5, displacement: 0.5,
    attribution: 0.2, drop_off: 0.5, discount_rate: 0, years: 3 };
  const loan = { ...LOAN, sector: "culture", users: 10, co2_avoided_t: 10, project_cost: 1000, operating_cost: 100 };
  const r = sroi(loan, p);
  assert.equal(r.userValue, 1000);
  assert.equal(r.carbonValue, 1000);
  assert.equal(r.peopleNet, 1000 * 0.5 * 0.5 * 0.8);
  assert.equal(r.carbonNet, 800);
  assert.deepEqual(r.flows.map((f) => f.value), [200 + 800, 100 + 800, 50 + 800]);
  assert.equal(r.inputs, 1000 + 300);
  assert.equal(r.ratio, 2750 / 1300);
});

test("the benefit period is ranged, so it moves the range, the sensitivity bars and the break-even list", () => {
  const s = sensitivity(LOAN).rows.find((x) => x.param === "asset_life_renovation");
  assert.ok(s.swing > 0);
  const atHigh = sroi(LOAN, { ...centralValues(LOAN), asset_life_renovation: PARAMS.asset_life_renovation.range[1] }).ratio;
  assert.ok(Math.abs(s.at_high - atHigh) < 1e-12);
  assert.equal(sensitivity(LOAN).rows.find((x) => x.param === "asset_life_build").swing, 0);
});

test("break-even returns null where an assumption cannot move the ratio, and an exact user count", () => {
  const b = breakEven(LOAN);
  assert.equal(b.rows.find((r) => r.param === "value_per_user_culture").value_at_one, null);
  const p = centralValues(LOAN);
  const zero = { ...LOAN, co2_avoided_t: 0, operating_cost: 0 };
  const perUser = sroi({ ...zero, users: 1 }, p).ratio;
  const exact = { ...zero, project_cost: perUser * 7 * zero.project_cost };
  const users = breakEven(exact).users_at_one;
  assert.ok(sroi({ ...exact, users }, p).ratio >= 1 - 1e-12);
  assert.ok(sroi({ ...exact, users: users - 1 }, p).ratio < 1);
  const d = b.rows.find((r) => r.param === "discount_rate");
  assert.ok(d.value_at_one == null || d.value_at_one <= PARAMS.discount_rate.domain[1]);
});

test("overrides outside a value's domain or not finite are ignored", () => {
  assert.equal(withOverrides(PARAMS, { deadweight: 1.5 }).deadweight, PARAMS.deadweight);
  assert.equal(withOverrides(PARAMS, { deadweight: Number.NaN }).deadweight, PARAMS.deadweight);
  assert.equal(withOverrides(PARAMS, { discount_rate: 0.5 }).discount_rate, PARAMS.discount_rate);
  assert.equal(withOverrides(PARAMS, { carbon_value: -1 }).carbon_value, PARAMS.carbon_value);
});

test("indicator rules give their stated points", () => {
  const pts = (loan, id) => Object.values(esgRating(loan).pillars).flat().find((x) => x.id === id).points;
  assert.equal(pts({ ...LOAN, purpose: "new_build", brownfield: true }, "E3"), 70);
  assert.equal(pts({ ...LOAN, purpose: "new_build", brownfield: false }, "E3"), 20);
  assert.equal(pts({ ...LOAN, purpose: "renovation" }, "E3"), 100);
  assert.deepEqual(["low", "medium", "high"].map((c) => pts({ ...LOAN, climate_risk: c }, "E4")), [100, 60, 20]);
  assert.equal(pts({ ...LOAN, climate_risk: undefined }, "E4"), 60);
  assert.equal(pts({ ...LOAN, energy_class_gain: 9 }, "E1"), 100);
  assert.equal(pts({ ...LOAN, borrower: "sports_association" }, "G1"), 50);
  assert.equal(pts({ ...LOAN, borrower: "comune" }, "G1"), 80);
  assert.equal(pts({ ...LOAN, community_consulted: true }, "G4"), 100);
  assert.equal(pts({ ...LOAN, accessible_beyond_minimum: true, free_access_share: 0.5, youth_or_senior_programme: true }, "S3"), 80);
  // the production bands, not a copy of them
  assert.deepEqual([80, 79.9, 65, 50, 35, 34.9].map((x) => BANDS.find((b) => x >= b.min).grade), ["A", "B", "B", "C", "D", "E"]);
  // S1 is log-scaled: 500 users per EUR 100,000 of cost scores 100, none scores 0
  assert.equal(pts({ ...LOAN, users: 5000, project_cost: 1000000 }, "S1"), 100);
  assert.equal(pts({ ...LOAN, users: 0 }, "S1"), 0);
  assert.ok(Math.abs(pts({ ...LOAN, users: 1200, project_cost: 1000000 }, "S1") - (100 * Math.log10(121)) / Math.log10(501)) < 1e-9);
  assert.equal(pts({ ...LOAN, renewable_share: 0.4 }, "E2"), 40);
  assert.deepEqual([true, false].map((v) => pts({ ...LOAN, inner_area: v }, "S4")), [100, 40]);
  assert.deepEqual([true, false].map((v) => pts({ ...LOAN, audited_accounts: v }, "G3")), [100, 30]);
  assert.deepEqual([true, false].map((v) => pts({ ...LOAN, monitoring_plan: v }, "G2")), [100, 0]);
  assert.equal(pts({ ...LOAN, community_consulted: false }, "G4"), 40);
  assert.deepEqual(["region_province", "school_university", "cultural_body"].map((b) => pts({ ...LOAN, borrower: b }, "G1")), [80, 80, 50]);
  assert.equal(pts({ ...LOAN, energy_class_gain: 3 }, "E1"), 60);
});

test("the synthetic book is the same every time, every loan is marked synthetic and every loan assesses", () => {
  const a = syntheticBook(), b = syntheticBook();
  assert.deepEqual(a, b);
  assert.equal(a.length, 24);
  for (const loan of a) {
    assert.equal(loan.synthetic, true);
    assert.ok(assess(loan).ok, loan.id);
  }
});


// Hub review round 3 (three reviewers).

test("the default rating adds up by hand: pillars, weights and total", () => {
  const r = esgRating(LOAN);
  assert.equal(r.scores.E, 69);
  assert.equal(r.scores.G, 82);
  // the total weights the unrounded pillar sums and is rounded once (round 34, reviewer A)
  const raw = (k) => r.pillars[k].reduce((a, st) => a + st.points * st.weight, 0);
  assert.equal(r.total, Math.round((raw("E") * WEIGHTS.E + raw("S") * WEIGHTS.S + raw("G") * WEIGHTS.G) * 10) / 10);
  assert.deepEqual(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 1);
  for (const steps of Object.values(r.pillars)) assert.ok(Math.abs(steps.reduce((a, s) => a + s.weight, 0) - 1) < 1e-9);
});

test("a yes or no field must be true or false, so the text false is refused", () => {
  for (const k of BOOLEANS) {
    assert.deepEqual(validate({ ...LOAN, [k]: "false" }), [k]);
    assert.deepEqual(validate({ ...LOAN, [k]: 0 }), [k]);
  }
  assert.deepEqual(validate({ ...LOAN, monitoring_plan: undefined }), []);
});

test("a benefit period breaks even at a whole year, and the ratio there is on the far side of 1.0", () => {
  const c = centralValues(LOAN);
  const row = breakEven(LOAN).rows.find((r) => r.param === "asset_life_renovation");
  assert.deepEqual(row.crossings, [{ value: 3, direction: "up", inside: false, place: "outside" }]);
  assert.ok(sroi(LOAN, { ...c, asset_life_renovation: 2 }).ratio < 1);
  assert.ok(sroi(LOAN, { ...c, asset_life_renovation: 3 }).ratio >= 1);
  assert.equal(row.inside_range, false);
});

test("with a running cost a longer period can lower the ratio, and both crossings are reported", () => {
  const loan = { ...LOAN, users: 100, amount: 50000, project_cost: 50000, operating_cost: 20000, co2_avoided_t: 0 };
  const c = centralValues(loan);
  const row = breakEven(loan).rows.find((r) => r.param === "asset_life_renovation");
  assert.deepEqual(row.crossings.map((x) => x.direction), ["up", "down"]);
  for (const { value, direction } of row.crossings) {
    const before = sroi(loan, { ...c, asset_life_renovation: value - 1 }).ratio, at = sroi(loan, { ...c, asset_life_renovation: value }).ratio;
    assert.ok(direction === "up" ? before < 1 && at >= 1 : before >= 1 && at < 1, `${value} ${before} ${at}`);
  }
  assert.equal(row.inside_range, true);
  // the sensitivity bar spans the peak inside the range, not only the two ends
  const s = sensitivity(loan).rows.find((r) => r.param === "asset_life_renovation");
  assert.ok(s.highest > Math.max(s.at_low, s.at_high));
  assert.equal(s.swing, s.highest - s.lowest);
});

test("a continuous break-even value brings the ratio to 1.0, and every crossing lies in the domain", () => {
  const c = centralValues(LOAN);
  for (const r of breakEven(LOAN).rows) {
    const [lo, hi] = domainOf(PARAMS[r.param]);
    for (const x of r.crossings) {
      assert.ok(x.value >= lo && x.value <= hi);
      if (PARAMS[r.param].unit !== "years") assert.ok(Math.abs(sroi(LOAN, { ...c, [r.param]: x.value }).ratio - 1) < 1e-6, r.param);
    }
  }
});

test("on the default loan deadweight moves the ratio most, not the benefit period", () => {
  assert.equal(sensitivity(LOAN).rows[0].param, "deadweight");
});

test("carbon takes its own deadweight; the waterfall still adds up", () => {
  const c = centralValues(LOAN);
  const half = sroi(LOAN, { ...c, carbon_deadweight: 0.5 });
  assert.equal(half.carbonNet, LOAN.co2_avoided_t * c.carbon_value * 0.5 * (1 - c.attribution));
  const w = Object.fromEntries(waterfall(LOAN, { ...c, carbon_deadweight: 0.5 }).map((x) => [x.id, x.value]));
  assert.ok(Math.abs(w.gross + w.deadweight + w.displacement + w.attribution - w.net) < 1e-6);
  assert.equal(c.carbon_deadweight, 0);
});

test("the result shows the ratio over one year and five beside the full period", () => {
  const r = assess(LOAN);
  const c = centralValues(LOAN);
  assert.deepEqual(r.horizons.map((h) => h.years), [1, 5]);
  assert.equal(r.horizons[0].ratio, Math.round((sroi(LOAN, { ...c, years: 1 }).presentValue / sroi(LOAN, c).inputs) * 100) / 100);
  assert.ok(r.horizons[0].ratio < r.horizons[1].ratio && r.horizons[1].ratio < r.sroi.ratio);
});

test("one domain rule: whole years from 1 to 60, shares up to 100 percent; overrides outside it are ignored", () => {
  const life = PARAMS.asset_life_renovation;
  assert.deepEqual(domainOf(life), [1, 60]);
  for (const v of [0, 2.5, 61, NaN]) assert.equal(inDomain(life, v), false, String(v));
  assert.equal(inDomain(life, 30), true);
  assert.deepEqual(domainOf(PARAMS.deadweight), [0, 1]);
  assert.deepEqual(domainOf(PARAMS.drop_off), [0, 0.99]);
  const o = withOverrides(PARAMS, { asset_life_renovation: 2.5, asset_life_build: 0, asset_life_equipment: 61, deadweight: 1.01 });
  assert.ok(Object.values(o).every((d) => d.status !== "reviewer"));
  assert.equal(withOverrides(PARAMS, { asset_life_build: 30 }).asset_life_build.status, "reviewer");
});

test("a malformed, empty or altered passport fails replay without throwing", () => {
  const pp = JSON.parse(canonical(passport(assess(LOAN), "A")));
  assert.deepEqual(passportProblems(pp), []);
  const odd = JSON.parse(JSON.stringify(pp));
  odd.parameters.deadweight.value = { toString: 0, valueOf: 0 };
  assert.equal(replays(odd), false);
  const huge = JSON.parse(JSON.stringify(pp));
  Object.assign(huge.parameters.asset_life_renovation, { status: "reviewer", value: 1e7, range: [8, 1e7], cited_value: 15, cited_status: "illustrative" });
  assert.equal(replays(huge), false);
  for (const x of [{}, null, "null", [], 123]) assert.equal(replays(x), false);
  // a cited value and the results changed together still fail: the method does not publish that value
  const alt = JSON.parse(JSON.stringify(pp));
  alt.parameters.deadweight.value = 0.5;
  alt.results = passport(assess(LOAN, { ...PARAMS, deadweight: { ...PARAMS.deadweight, value: 0.5 } }), "A").results;
  assert.deepEqual(passportProblems(alt), ["parameters.deadweight"]);
  assert.equal(replays(alt), false);
  // an extra or missing parameter fails too
  assert.ok(passportProblems({ ...pp, parameters: { ...pp.parameters, extra: { value: 1 } } }).includes("parameters.extra"));
  const { deadweight, ...fewer } = pp.parameters;
  assert.ok(passportProblems({ ...pp, parameters: fewer }).includes("parameters.deadweight"));
  // a reviewer's passport, made by the page's own override path, replays
  const rv = JSON.parse(canonical(passport(assess(LOAN, withOverrides(PARAMS, { deadweight: 0.5, asset_life_renovation: 20 })), "B")));
  assert.equal(replays(rv), true);
});

test("the uncertainty range is the 10th, 50th and 90th percentile of its own draws", () => {
  const r = sroiRange(LOAN, PARAMS, 500, 7);
  assert.ok(r.p10 <= r.p50 && r.p50 <= r.p90);
  // with only the sport value ranged, and its central value at the top of its range, no draw exceeds the central
  const only = Object.fromEntries(Object.entries(PARAMS).map(([k, d]) => [k, k === "value_per_user_sport" ? d : { ...d, range: undefined }]));
  const central = sroi(LOAN, centralValues(LOAN, only)).ratio;
  const one = sroiRange(LOAN, only, 500, 7);
  assert.ok(one.p90 <= central + 1e-12 && one.p10 < central);
});

test("every synthetic loan carries a running cost, so the book shows the full denominator", () => {
  const book = syntheticBook();
  assert.ok(book.every((l) => typeof l.operating_cost === "number" && l.operating_cost >= 0));
  assert.ok(book.some((l) => l.operating_cost > 0));
});


// Hub review round 4 (three reviewers).

const PAGE_DEFAULT = { ...LOAN, operating_cost: 20000 };

test("the page's own default loan: SROI 2.94, and deadweight crosses 1.0 inside its range", () => {
  const r = assess(PAGE_DEFAULT);
  assert.equal(r.sroi.ratio, 2.94);
  const dw = r.break_even.rows.find((x) => x.param === "deadweight");
  assert.equal(dw.inside_range, true);
  assert.equal(dw.crossings[0].direction, "down");
});

test("a whole-year crossing at the range's first year is not inside the range", () => {
  const loan = { ...LOAN, users: 474 };
  const row = breakEven(loan).rows.find((r) => r.param === "asset_life_renovation");
  assert.deepEqual(row.crossings, [{ value: 8, direction: "up", inside: false, place: "step_outside" }]);
  assert.equal(row.inside_range, false);  // SROI is at or above 1.0 for every year from 8 to 25
});

test("a reviewer passport must carry exactly what an override makes", () => {
  const base = JSON.parse(canonical(passport(assess(LOAN, withOverrides(PARAMS, { deadweight: 0.5 })), "B")));
  assert.equal(replays(base), true);
  const forge = (patch) => { const x = JSON.parse(JSON.stringify(base)); Object.assign(x.parameters.deadweight, patch); return x; };
  for (const patch of [{ range: [-1, 2] }, { range: [0.5, 0.5] }, { cited_value: 0.7 }, { cited_status: "cited" }, { unit: "years" },
    { source: { title: "x", url: "y" } }, { extra: 1 }]) {
    assert.ok(passportProblems(forge(patch)).includes("parameters.deadweight"), JSON.stringify(patch));
  }
  // a no-op reviewer tag: the method's own value marked as the reviewer's, with a collapsed range
  const noop = JSON.parse(canonical(passport(assess(LOAN), "B")));
  Object.assign(noop.parameters.deadweight, { status: "reviewer", range: [0.8, 0.8], cited_value: 0.8, cited_status: "illustrative" });
  assert.ok(passportProblems(noop).includes("parameters.deadweight"));
  // an unknown key on the loan
  assert.ok(passportProblems({ ...base, loan: { ...base.loan, note: "x" } }).includes("loan"));
});

test("overrides applied twice keep the method's own cited value and range; back to the method's value is the method's", () => {
  const once = withOverrides(PARAMS, { deadweight: 0.5 });
  const twice = withOverrides(once, { deadweight: 0.6 });
  assert.equal(twice.deadweight.cited_value, 0.8);
  assert.deepEqual(twice.deadweight.range, widened(PARAMS.deadweight.range, 0.6));
  assert.equal(replays(JSON.parse(canonical(passport(assess(LOAN, twice), "C")))), true);
  assert.equal(withOverrides(once, { deadweight: 0.8 }).deadweight.status, PARAMS.deadweight.status);
});

test("the same parameters in another order give the same range", () => {
  const reversed = Object.fromEntries(Object.entries(PARAMS).reverse());
  assert.deepEqual(sroiRange(LOAN, reversed, 300, 3), sroiRange(LOAN, PARAMS, 300, 3));
});

test("the shorter-period ratios use the years actually counted and are shown only when shorter", () => {
  const short = assess(LOAN, withOverrides(PARAMS, { asset_life_renovation: 3 }));
  assert.equal(short.sroi.years, 3);
  assert.deepEqual(short.horizons.map((h) => h.years), [1]);
});

test("the users needed for 1.0 never leave the ratio below 1.0, and a count past the field's limit is no answer", () => {
  const c = centralValues(LOAN);
  const low = { ...LOAN, users: 10 };
  const n = breakEven(low).users_at_one;
  assert.ok(sroi({ ...low, users: n }, c).ratio >= 1);
  assert.ok(sroi({ ...low, users: n - 1 }, c).ratio < 1);
  assert.equal(breakEven({ ...LOAN, sector: "culture", users: 0, project_cost: 1e10, amount: 1e9, co2_avoided_t: 0 }).users_at_one, null);
});

test("benefit periods by purpose and horizon, and the money domain", () => {
  const c = centralValues(LOAN);
  assert.equal(benefitYears({ ...LOAN, purpose: "accessibility" }, c), c.asset_life_renovation);
  assert.equal(benefitYears({ ...LOAN, purpose: "energy" }, c), c.asset_life_renovation);
  assert.equal(benefitYears({ ...LOAN, horizon_years: 40 }, c), c.asset_life_renovation);
  assert.equal(benefitYears({ ...LOAN, horizon_years: 4 }, c), 4);
  assert.deepEqual(domainOf(PARAMS.value_per_user_sport), [0, PARAMS.value_per_user_sport.range[1] * 10]);
  assert.deepEqual(domainOf(PARAMS.discount_rate), PARAMS.discount_rate.domain);
});

// Round 5 folds: each rule below was named as unpinned or wrong by a reviewer.

test("shorter-period ratios stop only the benefits: the inputs are the full period's, running cost included", () => {
  const loan = { ...LOAN, operating_cost: 20000 };
  const r = assess(loan);
  const c = centralValues(loan);
  const full = sroi(loan, c);
  for (const h of r.horizons) {
    assert.equal(h.ratio, Math.round((sroi(loan, { ...c, years: h.years }).presentValue / full.inputs) * 100) / 100);
  }
  // the truncated-cost ratio is higher, so the two readings differ here
  assert.ok(sroi(loan, { ...c, years: 1 }).ratio > r.horizons[0].ratio);
});

test("each crossing carries its own inside mark, and the value shown first is the first inside one", () => {
  const loan = { ...LOAN, users: 70, amount: 20000, project_cost: 20000, operating_cost: 15000, co2_avoided_t: 0 };
  const row = breakEven(loan).rows.find((r) => r.param === "asset_life_renovation");
  assert.deepEqual(row.crossings, [{ value: 3, direction: "up", inside: false, place: "outside" }, { value: 19, direction: "down", inside: true, place: "inside" }]);
  assert.equal(row.value_at_one, 19);
  assert.equal(row.inside_range, true);
  // a range-end crossing on a money value: inside at the range's ends, outside past them
  const d = PARAMS.value_per_user_sport;
  for (const r of breakEven(LOAN).rows) {
    const pd = PARAMS[r.param];
    for (const x of r.crossings) {
      const expected = (pd.unit === "years" ? x.value - 1 >= pd.range[0] : x.value >= pd.range[0]) && x.value <= pd.range[1];
      assert.equal(x.inside, expected, `${r.param} ${x.value}`);
    }
  }
  assert.ok(d.range[1] === d.value);
});

test("a reviewer's value never widens the domain used by break-even and sliders", () => {
  const o = withOverrides(PARAMS, { value_per_user_sport: 23470 });
  assert.deepEqual(domainOf(o.value_per_user_sport), domainOf(PARAMS.value_per_user_sport));
  assert.deepEqual(domainOf(o.value_per_user_sport), [0, 23470]);
  const loan = { ...LOAN, users: 100, co2_avoided_t: 0 };
  const row = breakEven(loan, o).rows.find((r) => r.param === "value_per_user_sport");
  assert.ok(row.crossings.length > 0);
  for (const x of row.crossings) assert.ok(x.value <= 23470 && x.inside === false, String(x.value));
});

test("shares may reach 100 percent: full deadweight leaves no people value", () => {
  const o = withOverrides(PARAMS, { deadweight: 1 });
  assert.equal(o.deadweight.status, "reviewer");
  const r = assess({ ...LOAN, co2_avoided_t: 0 }, o);
  assert.equal(r.sroi.peopleNet, 0);
  assert.equal(r.sroi.ratio, 0);
});

test("comparing passports: a key left out differs from a key set to null", () => {
  const a = { schema: "x", reviewer: null };
  const b = { schema: "x" };
  assert.notEqual(canonical(a), canonical(b));
  assert.deepEqual(diffPassports(a, b), [{ path: "reviewer", a: null, b: "(missing)" }]);
  assert.deepEqual(diffPassports(b, b), []);
});

test("passport checks: top-level keys, schema, reviewer, results, loan id and flag, reviewer keys", () => {
  const base = JSON.parse(canonical(passport(assess(LOAN), "A")));
  assert.deepEqual(passportProblems(base), []);
  const bad = (patch) => passportProblems({ ...JSON.parse(JSON.stringify(base)), ...patch });
  assert.deepEqual(bad({ extra: 1 }), ["extra"]);
  assert.deepEqual(bad({ schema: "impact-lens.passport.v0" }), ["schema"]);
  assert.deepEqual(bad({ reviewer: 7 }), ["reviewer"]);
  const noResults = JSON.parse(JSON.stringify(base)); delete noResults.results;
  assert.deepEqual(passportProblems(noResults), ["results"]);
  assert.deepEqual(bad({ loan: { ...LOAN, id: { fake: 1 } } }), ["loan"]);
  assert.deepEqual(bad({ loan: { ...LOAN, synthetic: "yes" } }), ["loan"]);
  assert.deepEqual(bad({ loan: { ...LOAN, id: "SYN-001", synthetic: true } }), []);
  // a reviewer's parameter must carry every key, a null source included
  const rev = JSON.parse(canonical(passport(assess(LOAN, withOverrides(PARAMS, { deadweight: 0.5 })), "B")));
  assert.deepEqual(passportProblems(rev), []);
  delete rev.parameters.deadweight.source;
  assert.deepEqual(passportProblems(rev), ["parameters.deadweight"]);
});

test("a passport made from overridden parameters is accepted when checked against them", () => {
  const o = withOverrides(PARAMS, { deadweight: 0.5 });
  const pp = JSON.parse(canonical(passport(assess(LOAN, o), "B")));
  assert.deepEqual(passportProblems(pp, o), []);
  assert.deepEqual(passportProblems(pp), []);
});

test("overrides read text as numbers, as a slider sends them", () => {
  assert.equal(withOverrides(PARAMS, { deadweight: "0.5" }).deadweight.value, 0.5);
  assert.equal(withOverrides(PARAMS, { deadweight: "half" }).deadweight, PARAMS.deadweight);
});

test("the generator's first outputs are pinned, so a change to it cannot move every seeded number unseen", () => {
  const next = rng(1);
  assert.deepEqual([next(), next(), next()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  assert.deepEqual(sroiRange(LOAN), sroiRange(LOAN));
});

test("percentiles are taken at rank floor(f * n)", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(xs, 0.1), 2);
  assert.equal(percentile(xs, 0.5), 6);
  assert.equal(percentile(xs, 0.9), 10);
  assert.equal(percentile(xs, 1), 10);
});

test("a range with equal ends draws that value, so the range collapses to the central ratio", () => {
  const flat = Object.fromEntries(Object.entries(PARAMS).map(([k, d]) => [k, d.range ? { ...d, range: [d.value, d.value] } : d]));
  const r = sroiRange(LOAN, flat, 50);
  const central = sroi(LOAN, centralValues(LOAN, flat)).ratio;
  assert.equal(r.p10, central);
  assert.equal(r.p90, central);
});

test("validate refuses every value past its upper limit and fractional counts", () => {
  const cases = { users: 5e6 + 1, term: 41, horizon_years: 61, free_access_share: 1.1, energy_class_gain: 8, co2_avoided_t: 1e6 + 1,
    operating_cost: 1e8 + 1, renewable_share: 1.01 };
  for (const [k, v] of Object.entries(cases)) assert.deepEqual(validate({ ...LOAN, [k]: v }), [k], k);
  assert.deepEqual(validate({ ...LOAN, amount: 1e10, project_cost: 1e10 + 1 }), ["amount", "project_cost"]);
  assert.deepEqual(validate({ ...LOAN, term: 0 }), ["term"]);
  assert.deepEqual(validate({ ...LOAN, term: 1.5 }), ["term"]);
  assert.deepEqual(validate({ ...LOAN, energy_class_gain: 2.5 }), ["energy_class_gain"]);
  assert.deepEqual(validate({ ...LOAN, users: undefined }), ["users"]);
});

test("domain fallbacks: a money value without a range, and widening without a range", () => {
  assert.deepEqual(domainOf({ unit: "EUR", value: 5 }), [0, 50]);
  assert.equal(widened(undefined, 3), undefined);
  assert.deepEqual(widened([1, 2], 3), [1, 3]);
});

test("the social pillar weights and each inclusion part are pinned", () => {
  const s = (loan) => esgRating(loan).pillars.S;
  assert.deepEqual(s(LOAN).map((x) => x.weight), [0.35, 0.25, 0.25, 0.15]);
  const base = { ...LOAN, accessible_beyond_minimum: false, free_access_share: 0, youth_or_senior_programme: false };
  const inclusion = (loan) => s(loan).find((x) => x.id === "S3").points;
  assert.equal(inclusion(base), 0);
  assert.equal(inclusion({ ...base, accessible_beyond_minimum: true }), 40);
  assert.equal(inclusion({ ...base, free_access_share: 0.5 }), 20);
  assert.equal(inclusion({ ...base, youth_or_senior_programme: true }), 20);
});

test("an assessment lists the transferred values and the waterfall's undiscounted total", () => {
  const r = assess(LOAN);
  // the loan's own sector's value only (round 10)
  assert.deepEqual(r.transferred, ["value_per_user_sport"]);
  const w = Object.fromEntries(waterfall(LOAN, centralValues(LOAN)).map((x) => [x.id, x.value]));
  // the unrounded yearly values, summed; the rounded list stays within half a cent a year of it (round 33, reviewer A)
  const v = sroi(LOAN, centralValues(LOAN));
  assert.equal(w.over_years, v.undiscounted);
  assert.ok(Math.abs(w.over_years - v.flows.reduce((a, f) => a + f.value, 0)) <= 0.005 * v.years + 1e-9);
});

// Round 6 folds.

test("replay works against a bundle that already carries a reviewer's value", () => {
  const o = withOverrides(PARAMS, { deadweight: 0.5 });
  const plain = JSON.parse(canonical(passport(assess(LOAN), "A")));
  assert.equal(replays(plain, o), true);
  const reviewed = JSON.parse(canonical(passport(assess(LOAN, o), "B")));
  assert.equal(replays(reviewed, o), true);
  assert.equal(replays(reviewed), true);
});

test("break-even and sensitivity read the published range, not a reviewer's widened one", () => {
  const loan = { ...LOAN, users: 70, amount: 20000, project_cost: 20000, operating_cost: 15000, co2_avoided_t: 0 };
  const o = withOverrides(PARAMS, { asset_life_renovation: 2 });
  assert.deepEqual(o.asset_life_renovation.range, [2, 25]);
  const row = breakEven(loan, o).rows.find((r) => r.param === "asset_life_renovation");
  assert.deepEqual(row.crossings.map((c) => [c.value, c.inside]), [[3, false], [19, true]]);
  assert.equal(row.value_at_one, 19);
  const s = sensitivity(loan, o).rows.find((r) => r.param === "asset_life_renovation");
  assert.equal(s.at_low, sroi(loan, { ...centralValues(loan, o), asset_life_renovation: 8 }).ratio);
});

test("a crossing at a range end where the ratio is exactly 1.0 leaves the range at or above 1.0", () => {
  // round 22, reviewer B: one equality rule for the list and the verdict; below means under 1.0, so a ratio of exactly
  // 1.0 at the end holds, and the crossing just past the end is outside (it counted as that end before round 22)
  const loan = { ...LOAN, co2_avoided_t: 0, amount: 1, project_cost: 3151817.9062016904 };
  const row = breakEven(loan).rows.find((r) => r.param === "discount_rate");
  const near = row.crossings.find((c) => Math.abs(c.value - 0.05) < 1e-6);
  assert.ok(near, JSON.stringify(row.crossings));
  assert.equal(near.inside, false);
  assert.ok(row.range_lowest >= 1);
});

test("a field present as null is refused, and people are counted whole", () => {
  for (const k of ["brownfield", "co2_avoided_t", "climate_risk", "horizon_years"]) assert.deepEqual(validate({ ...LOAN, [k]: null }), [k], k);
  assert.deepEqual(validate({ ...LOAN, users: 12.5 }), ["users"]);
  for (const [k, v] of [["energy_class_gain", -1], ["renewable_share", -0.1], ["free_access_share", -0.1], ["operating_cost", -1]]) {
    assert.deepEqual(validate({ ...LOAN, [k]: v }), [k], k);
  }
  const base = JSON.parse(canonical(passport(assess(LOAN), "A")));
  for (const patch of [{ id: null }, { synthetic: null }]) {
    assert.deepEqual(passportProblems({ ...base, loan: { ...base.loan, ...patch } }), ["loan"], JSON.stringify(patch));
  }
});

test("every label exists in both languages", () => {
  assert.deepEqual(Object.keys(TEXT.it).sort(), Object.keys(TEXT.en).sort());
});

test("the default social score and total are pinned", () => {
  const e = esgRating(LOAN);
  assert.equal(e.scores.S, 70.5);
  assert.equal(e.total, 72.9);
  assert.equal(e.grade, "B");
});

test("shorter-period ratios at the boundaries: a 5-year period shows 1 year only, a 1-year period none", () => {
  assert.deepEqual(assess({ ...LOAN, horizon_years: 5 }).horizons.map((h) => h.years), [1]);
  assert.deepEqual(assess({ ...LOAN, horizon_years: 1 }).horizons, []);
});

// Round 7.
const PAGE = { ...LOAN, operating_cost: 20000, brownfield: false };

test("a reviewer's value outside a range that leaves the whole range below 1.0 is not called robust", () => {
  // the sport value set far above its range: the ratio is high, but every published sport value gives less than 1.0
  const ov = withOverrides(PARAMS, { value_per_user_sport: 23470 });
  const a = breakEven({ ...PAGE, users: 250, co2_avoided_t: 0 }, ov);
  assert.ok(a.base > 5);
  const row = a.rows.find((r) => r.param === "value_per_user_sport");
  assert.equal(row.inside_range, false);
  assert.ok(row.range_lowest < 1);
  assert.equal(a.holds, false);
  // deadweight set below its range: the crossing lies below the range's low end, so the whole range is below 1.0
  const b = breakEven({ ...PAGE, users: 190 }, withOverrides(PARAMS, { deadweight: 0.1 }));
  const dw = b.rows.find((r) => r.param === "deadweight");
  assert.ok(b.base >= 1 && !dw.inside_range && dw.range_lowest < 1 && dw.crossings.every((c) => c.value < 0.6));
  assert.equal(b.holds, false);
  // and a loan that clears 1.0 across every range holds
  const c = breakEven({ ...PAGE, users: 20000 });
  assert.ok(c.rows.every((r) => r.range_lowest >= 1));
  assert.equal(c.holds, true);
});

test("an assessed loan always replays: a null or wrong id or flag, or an unknown key, is refused at assessment", () => {
  for (const extra of [{ id: null }, { synthetic: null }, { synthetic: false }, { id: 7 }, { colour: "red" }]) {
    const r = assess({ ...LOAN, ...extra });
    assert.equal(r.ok, false, JSON.stringify(extra));
  }
  assert.deepEqual(assess(null).problems, ["loan"]);
  for (const loan of syntheticBook()) {
    const r = assess(loan);
    assert.ok(r.ok && replays(JSON.parse(canonical(passport(r)))), loan.id);
  }
});

test("an override of null, empty text or true is ignored, never read as 0 or 1", () => {
  for (const v of [null, "", "  ", true, false, undefined]) {
    assert.equal(withOverrides(PARAMS, { deadweight: v }).deadweight, PARAMS.deadweight, String(v));
  }
});

test("setting a reviewer's value back to the method's value leaves the published parameter, no cited keys", () => {
  const once = withOverrides(PARAMS, { deadweight: 0.5 });
  const back = withOverrides(once, { deadweight: PARAMS.deadweight.value });
  assert.deepEqual(back.deadweight, PARAMS.deadweight);
});

test("an empty amount is blamed on the amount only, not on the project cost", () => {
  assert.deepEqual(validate({ ...LOAN, amount: undefined }), ["amount"]);
  assert.deepEqual(validate({ ...LOAN, amount: 800000, project_cost: 700000 }), ["project_cost"]);
});

test("a new facility counts no carbon saving", () => {
  const p = centralValues(LOAN);
  const built = sroi({ ...LOAN, purpose: "new_build", co2_avoided_t: 40 }, p);
  assert.equal(built.carbonValue, 0);
  assert.equal(built.carbonNet, 0);
  assert.equal(sroi({ ...LOAN, purpose: "new_build", co2_avoided_t: 0 }, p).ratio, built.ratio);
  assert.equal(sroi({ ...LOAN, co2_avoided_t: 40 }, p).carbonValue, 40 * PARAMS.carbon_value.value);
});

test("triangular draws match the inverse distribution worked by hand", () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} vs ${b}`);
  near(triangular(0.125, 0, 0.5, 1), 0.25);
  near(triangular(0.875, 0, 0.5, 1), 0.75);
  // peak at 0.2: below the peak's share F = x^2 / 0.2, above it 1 - F = (1 - x)^2 / 0.8
  near(triangular(0.1, 0, 0.2, 1), Math.sqrt(0.02));
  near(triangular(0.6, 0, 0.2, 1), 1 - Math.sqrt(0.32));
  near(triangular(0.3, 2, 2, 4), 4 - Math.sqrt(0.7 * 4));
  assert.equal(triangular(0.3, 5, 5, 5), 5);
});

test("draws follow a reviewer's value: its peak and its widened range", () => {
  const ov = withOverrides(PARAMS, { deadweight: 0.1 });
  assert.deepEqual(ov.deadweight.range, [0.1, 0.95]);
  assert.ok(sroiRange(PAGE, ov).p50 > sroiRange(PAGE).p50);
});

test("the renewable share is shown as a percentage in the steps", () => {
  const e2 = esgRating(LOAN).pillars.E.find((s) => s.id === "E2");
  assert.equal(e2.input, 40);
  assert.equal(e2.input_unit, "percent");
});

// Round 8.
test("a passport whose parameter entry is null or a bare value is refused, not crashed on", () => {
  const pp = JSON.parse(canonical(passport(assess(LOAN))));
  for (const bad of [null, 0.8, "0.8", [0.8]]) {
    const copy = JSON.parse(JSON.stringify(pp));
    copy.parameters.deadweight = bad;
    assert.deepEqual(passportProblems(copy), ["parameters.deadweight"], JSON.stringify(bad));
    assert.equal(replays(copy), false);
  }
});

test("draws peak at a reviewer's value, not only across its widened range", () => {
  const ov = withOverrides(PARAMS, { deadweight: 0.1 });
  // the same widened range with the old peak gives other draws, so the peak itself is pinned
  const widenedOnly = { ...PARAMS, deadweight: { ...PARAMS.deadweight, range: [0.1, 0.95] } };
  const a = sroiRange(PAGE, ov), b = sroiRange(PAGE, widenedOnly);
  assert.ok(a.p10 > b.p10 && a.p50 > b.p50 && a.p90 > b.p90);
});

test("the lowest ratio over a benefit period's range is read at whole years", () => {
  const loan = { ...PAGE, users: 300 };
  const p = centralValues(loan);
  const row = breakEven(loan).rows.find((r) => r.param === "asset_life_renovation");
  const [lo, hi] = PARAMS.asset_life_renovation.range;
  const byHand = Math.min(...Array.from({ length: hi - lo + 1 }, (_, i) => sroi(loan, { ...p, asset_life_renovation: lo + i }).ratio));
  assert.equal(row.range_lowest, byHand);
});

test("the carbon values are the EIB 2016 values uprated by the euro area HICP", () => {
  assert.equal(Math.round(165 * 126.07 / 100.23), PARAMS.carbon_value.value);
  assert.equal(Math.round(250 * 126.07 / 100.23), PARAMS.carbon_value.range[1]);
});

// Round 9.
test("when the carbon value alone reaches 1.0, no participants are needed: zero, not no answer", () => {
  const loan = { ...PAGE, users: 0, amount: 1000, project_cost: 1000, operating_cost: 0 };
  const b = breakEven(loan);
  assert.ok(b.base >= 1);
  assert.equal(b.users_at_one, 0);
  // a new facility counts no carbon, so the same loan needs participants again
  assert.ok(breakEven({ ...loan, purpose: "new_build" }).users_at_one > 0);
});

test("the central ratio lies inside P10 to P90 on the page default and outside it with a reviewer's low deadweight", () => {
  const inside = assess(PAGE);
  assert.ok(inside.sroi.ratio >= inside.range.p10 && inside.sroi.ratio <= inside.range.p90);
  const outside = assess({ ...PAGE, users: 190 }, withOverrides(PARAMS, { deadweight: 0.1 }));
  assert.ok(outside.sroi.ratio > outside.range.p90);
});

// Round 10.
test("the users needed for 1.0 are the least whole count that reaches 1.0, even when the slope is a tiny difference", () => {
  const loan = { ...PAGE, amount: 1, project_cost: 79459.69053448689, users: 0, operating_cost: 0 };
  const o = withOverrides(PARAMS, { deadweight: 0.9999999999 });
  const c = centralValues(loan, o);
  const n = breakEven(loan, o).users_at_one;
  assert.equal(n, 535383);
  assert.ok(sroi({ ...loan, users: n }, c).ratio >= 1);
  assert.ok(sroi({ ...loan, users: n - 1 }, c).ratio < 1);
});

test("users needed: none when carbon alone reaches 1.0 with participants present, no answer when people add nothing", () => {
  assert.equal(breakEven({ ...PAGE, users: 500, amount: 50000, project_cost: 50000, operating_cost: 0 }).users_at_one, 0);
  assert.equal(breakEven({ ...PAGE, co2_avoided_t: 0 }, withOverrides(PARAMS, { deadweight: 1 })).users_at_one, null);
  assert.equal(breakEven({ ...PAGE, co2_avoided_t: 0 }, withOverrides(PARAMS, { value_per_user_sport: 0 })).users_at_one, null);
});

test("the transferred warning names the loan's own sector's value, and keeps it under a reviewer's value", () => {
  assert.deepEqual(assess(PAGE).transferred, ["value_per_user_sport"]);
  assert.deepEqual(assess({ ...PAGE, sector: "culture" }).transferred, ["value_per_user_culture"]);
  const o = withOverrides(PARAMS, { value_per_user_sport: 2000 });
  const r = assess(PAGE, o);
  assert.deepEqual(r.transferred, ["value_per_user_sport"]);
  assert.equal(r.parameters.value_per_user_sport.status, "reviewer");
  // the other sector's value, overridden or not, is never named
  assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { value_per_user_culture: 500 })).transferred, ["value_per_user_sport"]);
});

test("cautions: works on an existing facility at the method's deadweight; an energy loan with no saving entered", () => {
  assert.deepEqual(assess(PAGE).cautions, ["deadweight_works"]);
  assert.deepEqual(assess({ ...PAGE, purpose: "new_build" }).cautions, []);
  // round 12: participation value reaches zero only at 100 percent, so 0.95 is still cautioned
  assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { deadweight: 0.95 })).cautions, ["deadweight_reviewer"]);
  assert.deepEqual(assess({ ...PAGE, purpose: "energy", co2_avoided_t: 0 }).cautions, ["deadweight_works", "energy_no_saving"]);
  assert.deepEqual(assess({ ...PAGE, purpose: "energy", energy_class_gain: 0 }).cautions, ["deadweight_works", "energy_no_saving"]);
  assert.deepEqual(assess({ ...PAGE, purpose: "energy" }).cautions, ["deadweight_works"]);
  // a reviewer's lower deadweight keeps a caution: it is not evidence of added participation (round 11)
  assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { deadweight: 0.79 })).cautions, ["deadweight_reviewer"]);
  assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { deadweight: 0.94 })).cautions, ["deadweight_reviewer"]);
  // round 12: a new facility below the method's deadweight is cautioned too
  assert.deepEqual(assess({ ...PAGE, purpose: "new_build" }, withOverrides(PARAMS, { deadweight: 0.5 })).cautions, ["deadweight_reviewer_new"]);
  for (const c of ["deadweight_works", "deadweight_reviewer", "deadweight_reviewer_new", "energy_no_saving"]) assert.ok(TEXT.en[`caution_${c}`] && TEXT.it[`caution_${c}`], c);
});

// The compare panel's slots, with reads and hashes that finish only when the test says so.
function slotRig() {
  const draws = [];
  const pending = [];
  const fingerprint = (v) => {
    if (v === "unhashable") throw new Error("too deep");
    return new Promise((r) => pending.push(() => r(`fp-${typeof v === "object" && v ? v.reviewer : v}`)));
  };
  const slots = passportSlots(fingerprint, (s) => draws.push({ a: s.a && s.a.value?.reviewer, b: s.b && s.b.value?.reviewer, bad: { ...s.bad }, ...(s.a?.from === "current" ? { aFrom: "current" } : {}) }));
  const release = () => { while (pending.length) pending.shift()(); };
  const later = (body) => { let go; const text = () => new Promise((r) => { go = () => r(body); }); return { file: { text }, go: () => go() }; };
  const now = (body) => ({ text: async () => body });
  const settle = async () => { for (let i = 0; i < 5; i += 1) { release(); await new Promise((r) => setTimeout(r, 0)); } };
  const pp = (who) => JSON.stringify({ reviewer: who });
  return { slots, draws, release, later, now, settle, pp, last: () => draws[draws.length - 1] };
}

test("compare slots: choosing a file empties its slot and redraws at once, keeping the other slot's verdict", async () => {
  for (const [key, other] of [["a", "b"], ["b", "a"]]) {
    const g = slotRig();
    g.slots.choose("a", g.now(g.pp("RA")));
    g.slots.choose("b", g.now(g.pp("RB")));
    await g.settle();
    assert.deepEqual(g.last(), { a: "RA", b: "RB", bad: { a: false, b: false } });
    const slow = g.later(g.pp("NEW"));
    const before = g.draws.length;
    g.slots.choose(key, slow.file);
    // drawn before anything is awaited: the old verdict is gone, the other one stays
    assert.equal(g.draws.length, before + 1);
    assert.equal(g.last()[key], null);
    assert.equal(g.last()[other], other === "a" ? "RA" : "RB");
    slow.go();
    await g.settle();
    assert.equal(g.last()[key], "NEW");
  }
});

test("compare slots: a cancelled picker empties the slot; a file that does not parse is named at once", async () => {
  const g = slotRig();
  g.slots.choose("a", g.now(g.pp("RA")));
  await g.settle();
  g.slots.choose("a", undefined);
  assert.equal(g.last().a, null);
  g.slots.choose("b", g.now(g.pp("RB")));
  await g.settle();
  g.slots.choose("b", g.now("not json"));
  assert.equal(g.last().b, null);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(g.last(), { a: null, b: null, bad: { a: false, b: true } });
  // a value that cannot be fingerprinted is not a passport either
  await g.slots.use("a", "unhashable");
  assert.deepEqual(g.last().bad, { a: true, b: true });
});

test("compare slots: a read or hash overtaken by a later choice never fills the slot", async () => {
  const g = slotRig();
  const slow = g.later(g.pp("OLD"));
  g.slots.choose("a", slow.file);
  const use = g.slots.use("a", { reviewer: "CURRENT" });
  slow.go();
  await g.settle();
  await use;
  assert.equal(g.last().a, "CURRENT");
  assert.ok(!g.draws.some((d) => d.a === "OLD"));
  // a hash still running when another file is chosen is dropped too
  g.slots.use("a", { reviewer: "FIRST" });
  g.slots.choose("a", g.now(g.pp("SECOND")));
  await g.settle();
  assert.equal(g.last().a, "SECOND");
  assert.ok(!g.draws.some((d) => d.a === "FIRST"));
});

test("method text: carbon deadweight draws rise and lower carbon benefits; the carbon value draws up; stated exclusions", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(!en.includes("as do carbon deadweight's") && !it.includes("come quelle del deadweight sul carbonio"));
  assert.ok(en.includes("its draws only go up, and carbon benefits fall as it rises"));
  assert.ok(it.includes("i benefici del carbonio diminuiscono all'aumentare del deadweight sul carbonio"));
  assert.ok(en.includes("There is no construction period") && it.includes("Non c'è un periodo di costruzione"));
  assert.ok(en.includes("Savings on energy bills are not counted") && it.includes("I risparmi sulle bollette energetiche non sono contati"));
  assert.ok(!en.includes("only the carbon saving is valued") && !it.includes("si valuta solo il risparmio di carbonio"));
  assert.ok(en.includes("For energy works the values per person still count") && it.includes("Per i lavori di efficienza i valori per persona restano conteggiati"));
  // round 14: the explanation no longer states fixed directions; the card names them from the values in use
  assert.ok(TEXT.en.central_outside.includes("value in use") && TEXT.it.central_outside.includes("valore in uso"));
  assert.ok(TEXT.en.sroi_scope.includes("not assessed for materiality") && TEXT.it.sroi_scope.includes("non sono valutati per rilevanza"));
});

test("an energy loan counts people's value as the method page says, and none at deadweight 1", () => {
  const p = centralValues(LOAN);
  const energy = sroi({ ...LOAN, purpose: "energy" }, p);
  assert.ok(energy.peopleNet > 0);
  assert.equal(energy.peopleNet, sroi(LOAN, p).peopleNet);
  const noCarbon = sroi({ ...LOAN, purpose: "energy", co2_avoided_t: 0 }, p);
  assert.ok(noCarbon.ratio > 0 && noCarbon.carbonNet === 0);
  const full = sroi({ ...LOAN, purpose: "energy" }, { ...p, deadweight: 1 });
  assert.equal(full.peopleNet, 0);
  assert.ok(full.carbonNet > 0);
});

test("compare slots: the picker's cancel event empties a file slot only when the box is empty; this assessment stays", async () => {
  const g = slotRig();
  g.slots.choose("a", g.now(g.pp("RA")));
  await g.settle();
  // a browser that keeps the file: the verdict stays
  await g.slots.cancelled("a", g.now(g.pp("RA")));
  assert.equal(g.last().a, "RA");
  // the box is empty: the slot empties
  await g.slots.cancelled("a", undefined);
  assert.equal(g.last().a, null);
  // a cancel while the file is still being read drops that read
  const slow = g.later(g.pp("SLOW"));
  g.slots.choose("b", slow.file);
  g.slots.cancelled("b", undefined);
  slow.go();
  await g.settle();
  assert.equal(g.last().b, null);
  // this assessment, chosen by its button, stays after a cancel and is marked as this assessment
  g.slots.use("a", { reviewer: "CURRENT" });
  await g.settle();
  await g.slots.cancelled("a", undefined);
  assert.equal(g.last().a, "CURRENT");
  assert.equal(g.last().aFrom, "current");
  assert.ok(TEXT.en.this_assessment && TEXT.it.this_assessment);
});

test("break-even crossings are shown as approximate, shares to two decimals; a benefit period as a whole year", () => {
  const b = breakEven({ ...LOAN, operating_cost: 20000 });
  const all = b.rows.flatMap((r) => r.crossings.map((c) => ({ ...c, param: r.param })));
  assert.ok(all.length > 0);
  for (const c of all) {
    const shown = crossingShown(PARAMS[c.param].unit, c.value);
    if (PARAMS[c.param].unit === "years") {
      assert.equal(shown.approx, false);
      assert.ok(Number.isInteger(c.value));
    } else {
      assert.equal(shown.approx, true);
      const scale = shown.percent ? 100 : 1;
      assert.ok(Math.abs(Number(shown.value.toFixed(shown.digits)) - c.value * scale) <= 0.5 * 10 ** -shown.digits + 1e-9);
    }
  }
  assert.equal(crossingShown("share", 0.7070833).digits, 2);
  assert.equal(TEXT.en.be_about, "about");
  assert.equal(TEXT.it.be_about, "circa");
});

test("the card says the benefit period is not evidenced, in both languages", () => {
  assert.ok(TEXT.en.duration_not_evidenced.includes("not evidenced"));
  assert.ok(TEXT.it.duration_not_evidenced.includes("non è documentato"));
});

test("the low end of a value range is never offered as an age adjustment", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(!en.includes("test the low end") && !it.includes("va provato anche l'estremo basso"));
  assert.ok(en.includes("is not an age adjustment") && it.includes("non è un aggiustamento per età"));
  assert.ok(PARAMS.value_per_user_culture.note.en.includes("not an age adjustment"));
  assert.ok(PARAMS.value_per_user_culture.note.it.includes("non un aggiustamento per età"));
});

test("round 12: a reviewer's deadweight on works is cautioned below 100 percent, and on a new facility below the method's value", () => {
  for (const d of [0.95, 0.99]) assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { deadweight: d })).cautions, ["deadweight_reviewer"], String(d));
  // round 14: at 100 percent the participation cautions stop, and the range caution says the draws still count some
  assert.deepEqual(assess(PAGE, withOverrides(PARAMS, { deadweight: 1 })).cautions, ["deadweight_full_range"]);
  const build = { ...PAGE, purpose: "new_build" };
  assert.deepEqual(assess(build, withOverrides(PARAMS, { deadweight: 0.1 })).cautions, ["deadweight_reviewer_new"]);
  assert.deepEqual(assess(build, withOverrides(PARAMS, { deadweight: 0.9 })).cautions, []);
  assert.deepEqual(assess(build, PARAMS).cautions, []);
  assert.ok(TEXT.en.caution_deadweight_reviewer.includes("below 100 percent") && TEXT.it.caution_deadweight_reviewer.includes("sotto il 100 per cento"));
});

test("round 12: participation value reaches zero only at 100 percent deadweight, and the pages say so", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(!en.includes("unless a reviewer sets deadweight near 100 percent") && !en.includes("reaches zero only at 100 percent"));
  assert.ok(en.includes("100 percent deadweight removes it whatever the other inputs"));
  assert.ok(!it.includes("a meno che un revisore porti il deadweight") && !it.includes("si annulla solo al 100 per cento"));
  assert.ok(it.includes("un deadweight del 100 per cento lo annulla qualunque siano gli altri valori"));
});

test("round 12: the pages give each value's ages, sport from 16 with older adults, culture 30 to 49", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(!en.includes("young or older people these adult values are not supported"));
  assert.ok(en.includes("adults aged 16 or over, older adults included") && en.includes("children under 16") && en.includes("adults aged 30 to 49"));
  assert.ok(it.includes("dai 16 anni in su, anziani compresi") && it.includes("da 30 a 49 anni"));
  // round 13: the report states 2024 prices (section 4.2, checked at source), so the note says so with its place
  assert.ok(PARAMS.value_per_user_culture.note.en.includes("2024 prices (report section 4.2") && PARAMS.value_per_user_culture.note.it.includes("prezzi 2024 (sezione 4.2"));
  assert.ok(PARAMS.value_per_user_sport.note.en.includes("16 or over"));
});

test("round 13: 100 percent deadweight removes participation value whatever the other inputs, and less leaves it unless another input does", () => {
  const energy = { ...PAGE, purpose: "energy" };
  const people = (over) => sroi(energy, centralValues(energy, withOverrides(PARAMS, over))).peopleNet;
  assert.equal(people({ deadweight: 1 }), 0);
  assert.equal(people({ deadweight: 1, attribution: 0 }), 0);
  assert.ok(people({ deadweight: 0.99 }) > 0);
  assert.equal(people({ deadweight: 0.99, attribution: 1 }), 0, "another input can also remove it, so the pages do not say 'only'");
});

test("round 13: no participation caution when no users are entered; the advice says 100 percent; labels", () => {
  assert.deepEqual(assess({ ...PAGE, users: 0 }, withOverrides(PARAMS, { deadweight: 0.99 })).cautions, []);
  assert.deepEqual(assess({ ...PAGE, users: 0, purpose: "new_build" }, withOverrides(PARAMS, { deadweight: 0.1 })).cautions, []);
  for (const s of [PARAMS.deadweight.note.en, TEXT.en.caution_deadweight_works]) assert.ok(!s.includes("near 100") && s.includes("100 percent"), s);
  for (const s of [PARAMS.deadweight.note.it, TEXT.it.caution_deadweight_works]) assert.ok(!s.includes("vicino al 100") && s.includes("100 per cento"), s);
  assert.ok(TEXT.en.users.includes("enter only adults aged 30 to 49") && TEXT.it.users.includes("inserire solo adulti da 30 a 49 anni"));
  assert.ok(TEXT.en.be_below.includes("per euro of inputs") && TEXT.it.be_below.includes("per euro di input"));
});

// Round 14.
test("round 14: the range explanation follows the values in use; a sport value of 0 is drawn upwards, towards more value", () => {
  // reviewer B's case: the page default with the sport value set to 0
  const r = assess(PAGE, withOverrides(PARAMS, { value_per_user_sport: 0 }));
  assert.equal(r.sroi.ratio, 0.06);
  assert.equal(r.range.p10, 0.18);
  assert.equal(r.range.p90, 2.17);
  assert.ok(r.range.p10 > r.sroi.ratio);
  assert.deepEqual(r.one_way.find((o) => o.param === "value_per_user_sport"), { param: "value_per_user_sport", draws: "up", value: "more" });
  // the culture value does not move a sport loan, so it is not named
  assert.ok(!r.one_way.some((o) => o.param === "value_per_user_culture"));
  // at the method's own values the sport value is drawn down, towards less value, and the carbon value up, towards more
  const own = assess(PAGE).one_way;
  assert.deepEqual(own.find((o) => o.param === "value_per_user_sport"), { param: "value_per_user_sport", draws: "down", value: "less" });
  assert.deepEqual(own.find((o) => o.param === "carbon_value"), { param: "carbon_value", draws: "up", value: "more" });
  assert.deepEqual(own.find((o) => o.param === "carbon_deadweight"), { param: "carbon_deadweight", draws: "up", value: "less" });
  // a new facility counts no carbon, so neither carbon assumption is named
  assert.ok(!assess({ ...PAGE, purpose: "new_build" }).one_way.some((o) => o.param.startsWith("carbon")));
  // a reviewer's low deadweight is drawn up, towards less value
  const low = assess({ ...PAGE, users: 190 }, withOverrides(PARAMS, { deadweight: 0.1 }));
  assert.ok(low.sroi.ratio > low.range.p90);
  assert.deepEqual(low.one_way.find((o) => o.param === "deadweight"), { param: "deadweight", draws: "up", value: "less" });
  // the text states no fixed direction, and every part the card uses exists in both languages
  assert.ok(!TEXT.en.central_outside.includes("towards less value") && !TEXT.it.central_outside.includes("verso meno valore"));
  for (const k of ["central_outside", "one_way_up", "one_way_down", "one_way_more", "one_way_less", "one_way_none"]) assert.ok(TEXT.en[k] && TEXT.it[k], k);
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(en.includes("a value per person set to 0, for example, is drawn upwards only") && it.includes("un valore per persona impostato a 0, per esempio, si estrae solo verso l'alto"));
  assert.ok(PARAMS.carbon_deadweight.note.en.includes("at the method's own values") && PARAMS.carbon_deadweight.note.it.includes("ai valori del metodo"));
});

test("round 14: participation cautions only where the central result counts participation value", () => {
  const on = (loan, over) => assess(loan, withOverrides(PARAMS, over)).cautions;
  const build = { ...PAGE, purpose: "new_build" };
  // reviewer B's case: deadweight 99 percent and attribution 100 percent leave no participation value
  assert.equal(assess(PAGE, withOverrides(PARAMS, { deadweight: 0.99, attribution: 1 })).sroi.peopleNet, 0);
  // round 15: the range still draws that assumption inside its range, which participation_range says (reviewer C)
  assert.deepEqual(on(PAGE, { deadweight: 0.99, attribution: 1 }), ["participation_range"]);
  assert.deepEqual(on(PAGE, { deadweight: 0.5, displacement: 1 }), ["participation_range"]);
  assert.deepEqual(on(PAGE, { deadweight: 0.5, value_per_user_sport: 0 }), ["participation_range"]);
  assert.deepEqual(on(build, { deadweight: 0.1, attribution: 1 }), ["participation_range"]);
  assert.deepEqual(on(build, { deadweight: 0.1, value_per_user_sport: 0 }), ["participation_range"]);
  // the method's deadweight on works: no advice to raise it when nothing is counted
  assert.deepEqual(on(PAGE, { attribution: 1 }), ["participation_range"]);
  assert.deepEqual(on(PAGE, { value_per_user_sport: 0 }), ["participation_range"]);
  assert.deepEqual(on({ ...PAGE, purpose: "energy", co2_avoided_t: 0 }, { displacement: 1 }), ["participation_range", "energy_no_saving"]);
  // still cautioned where participation is counted
  assert.deepEqual(on(PAGE, { deadweight: 0.99 }), ["deadweight_reviewer"]);
  assert.deepEqual(on(PAGE, { deadweight: 0.99, attribution: 0.99 }), ["deadweight_reviewer"]);
  assert.deepEqual(on({ ...PAGE, sector: "culture" }, { deadweight: 0.5, value_per_user_sport: 0 }), ["deadweight_reviewer"]);
  assert.deepEqual(on(build, { deadweight: 0.1 }), ["deadweight_reviewer_new"]);
  assert.deepEqual(on(PAGE, {}), ["deadweight_works"]);
});

test("round 14: at 100 percent deadweight the card says the range still draws some participation", () => {
  const r = assess(PAGE, withOverrides(PARAMS, { deadweight: 1 }));
  assert.equal(r.sroi.peopleNet, 0);
  assert.equal(r.sroi.ratio, 0.06);
  assert.ok(r.range.p10 > r.sroi.ratio, "the draws take deadweight below 100 percent");
  assert.deepEqual(r.cautions, ["deadweight_full_range"]);
  assert.deepEqual(assess({ ...PAGE, purpose: "new_build" }, withOverrides(PARAMS, { deadweight: 1 })).cautions, ["deadweight_full_range"]);
  assert.deepEqual(assess({ ...PAGE, users: 0 }, withOverrides(PARAMS, { deadweight: 1 })).cautions, []);
  assert.ok(TEXT.en.caution_deadweight_full_range.includes("below 100 percent") && TEXT.it.caution_deadweight_full_range.includes("sotto il 100 per cento"));
  assert.ok(PARAMS.deadweight.note.en.includes("still draws deadweight below 100 percent") && PARAMS.deadweight.note.it.includes("estrae comunque il deadweight sotto il 100 per cento"));
});

test("round 14: the new facility caution reads the threshold from a custom bundle's published deadweight", () => {
  const bundle = { ...PARAMS, deadweight: { ...PARAMS.deadweight, value: 0.5, range: [0.3, 0.95] } };
  const build = { ...PAGE, purpose: "new_build" };
  // 0.6 is below the method's 0.8 but above this bundle's 0.5
  assert.deepEqual(assess(build, withOverrides(PARAMS, { deadweight: 0.6 })).cautions, ["deadweight_reviewer_new"]);
  assert.deepEqual(assess(build, withOverrides(bundle, { deadweight: 0.6 })).cautions, []);
  assert.deepEqual(assess(build, withOverrides(bundle, { deadweight: 0.4 })).cautions, ["deadweight_reviewer_new"]);
  assert.deepEqual(assess(build, bundle).cautions, []);
});

test("round 14: works advice speaks of added participation or an avoided loss, not capacity; S1 counts only eligible participants", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  for (const s of [PARAMS.deadweight.note.en, TEXT.en.caution_deadweight_works, en]) {
    assert.ok(!s.includes("add no capacity") && s.includes("no additional participation"), s.slice(0, 60));
  }
  for (const s of [PARAMS.deadweight.note.it, TEXT.it.caution_deadweight_works, it]) {
    assert.ok(!s.includes("non aggiungono capienza") && !s.includes("non aggiungono capacità") && s.includes("non portano partecipazione aggiuntiva"), s.slice(0, 60));
  }
  assert.ok(!TEXT.en.caution_deadweight_reviewer.includes("closure") && !TEXT.it.caution_deadweight_reviewer.includes("chiusura"));
  assert.ok(en.includes("Indicator S1") && en.includes("valuation-eligible adults") && en.includes("S1 is not a total of people reached"));
  assert.ok(it.includes("L'indicatore S1") && it.includes("adulti ammessi alla valorizzazione") && it.includes("S1 non è un totale delle persone raggiunte"));
  // the card shows the 1 and 5 year ratios before the lifetime period and the range (source order of the card)
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const card = app.slice(app.indexOf('t(lang, "card_title")'), app.indexOf("verdict(result.break_even)))"));
  assert.ok(card.indexOf('"ratio_over"') > 0 && card.indexOf('"ratio_over"') < card.indexOf('"lifetime"') && card.indexOf('"lifetime"') < card.indexOf('"sroi_range"'));
});

test("round 14: the compare slots outlive a rebuilt panel for the same assessment; a new assessment starts empty", async () => {
  const pending = [];
  const keeper = slotsPerResult((v) => new Promise((r) => pending.push(() => r(`fp-${v.reviewer}`))));
  const settle = async () => { for (let i = 0; i < 5; i += 1) { while (pending.length) pending.shift()(); await new Promise((r) => setTimeout(r, 0)); } };
  const seen = (list) => (s) => list.push({ a: s.a && s.a.value.reviewer, b: s.b && s.b.value.reviewer, fpA: s.a && s.a.fp });
  const result = { id: "one assessment" };
  const first = [];
  const slots = keeper.for(result);
  keeper.drawTo(seen(first));
  const fileA = { reviewer: "RA", parameters: { x: 12.3456789 } };
  slots.choose("a", { text: async () => JSON.stringify(fileA) });
  slots.use("b", { reviewer: "CURRENT" });
  await settle();
  assert.deepEqual(first[first.length - 1], { a: "RA", b: "CURRENT", fpA: "fp-RA" });
  // a language switch renders the same assessment again: the same slots, drawn at once into the new panel
  let release;
  const slow = { text: () => new Promise((r) => { release = () => r(JSON.stringify({ reviewer: "LATE" })); }) };
  const again = keeper.for(result);
  assert.equal(again, slots);
  const second = [];
  keeper.drawTo(seen(second));
  assert.deepEqual(second, [{ a: "RA", b: "CURRENT", fpA: "fp-RA" }]);
  // the file's value is kept as read, digit for digit
  assert.equal(again.state.a.value.parameters.x, 12.3456789);
  assert.equal(canonical(again.state.a.value), canonical(fileA));
  // a read still running when the panel is rebuilt lands in the newest panel only
  again.choose("b", slow);
  const third = [];
  keeper.drawTo(seen(third));
  const before = second.length;
  release();
  await settle();
  assert.deepEqual(third[third.length - 1], { a: "RA", b: "LATE", fpA: "fp-RA" });
  assert.equal(second.length, before);
  // a new assessment starts with empty slots, so 'this assessment' never names an earlier one
  const next = keeper.for({ id: "another assessment" });
  assert.notEqual(next, slots);
  assert.equal(next.state.a, null);
  assert.equal(next.state.b, null);
});

// Round 15.
test("round 15: an assumption whose effect bends across its draws is named as moving the result both ways", () => {
  // reviewer A's and B's case: a small renovation with a running cost, the reviewer's life of 8 at the bottom of its range
  const loan = { ...PAGE, amount: 50000, project_cost: 50000, users: 100, operating_cost: 20000, co2_avoided_t: 0 };
  for (const [dw, central, p90] of [[0, 5.28, 4.14], [0.7, 1.59, 1.49]]) {
    const r = assess(loan, withOverrides(PARAMS, { deadweight: dw, asset_life_renovation: 8 }));
    assert.equal(r.sroi.ratio, central);
    assert.equal(r.range.p90, p90);
    assert.deepEqual(r.one_way.find((o) => o.param === "asset_life_renovation"), { param: "asset_life_renovation", draws: "up", value: "both" });
  }
  // SROI at 8 years is below SROI at 10 and above SROI at 25, so neither one direction is true alone
  const at = (y) => sroi(loan, { ...centralValues(loan, withOverrides(PARAMS, { deadweight: 0 })), asset_life_renovation: y }).ratio;
  assert.ok(at(10) > at(8) && at(25) < at(8));
  for (const k of ["one_way_both", "one_way_together"]) assert.ok(TEXT.en[k] && TEXT.it[k], k);
  assert.ok(!TEXT.en.central_outside.includes("move the result one way") && !TEXT.it.central_outside.includes("spostano il risultato in una sola direzione"));
});

test("round 15: an assumption that moves the result only with the others drawn is named, marked together", () => {
  // reviewer C's case: a new facility with the sport value 0 and deadweight 1 leaves the central result at 0
  const build = { ...PAGE, purpose: "new_build" };
  const c = assess(build, withOverrides(PARAMS, { value_per_user_sport: 0, deadweight: 1 }));
  assert.equal(c.sroi.ratio, 0);
  assert.ok(c.range.p10 > 0);
  assert.deepEqual(c.one_way, [{ param: "deadweight", draws: "down", value: "more", together: true },
    { param: "value_per_user_sport", draws: "up", value: "more", together: true }]);
  // reviewer A's case: the sport value 0 and attribution 1, so the card no longer says no assumption is drawn one way
  const a = assess(build, withOverrides(PARAMS, { value_per_user_sport: 0, attribution: 1 }));
  assert.ok(a.range.p10 > a.sroi.ratio);
  assert.deepEqual(a.one_way.map((o) => [o.param, o.together === true]), [["attribution", true], ["value_per_user_sport", true]]);
  // deadweight 1 on works: the sport value, drawn down, is named too, towards less value with the others drawn
  const d = assess(PAGE, withOverrides(PARAMS, { deadweight: 1 }));
  assert.deepEqual(d.one_way.find((o) => o.param === "value_per_user_sport"), { param: "value_per_user_sport", draws: "down", value: "less", together: true });
  assert.deepEqual(d.one_way.find((o) => o.param === "deadweight"), { param: "deadweight", draws: "down", value: "more" });
  // the other sector's value moves nothing either way, so it is still left out
  assert.ok(!c.one_way.some((o) => o.param === "value_per_user_culture") && !d.one_way.some((o) => o.param === "value_per_user_culture"));
  // the card's words for a list with nothing in it: no assumption that moves this result sits at a range end
  assert.ok(TEXT.en.one_way_none.includes("alone or with the others drawn") && TEXT.it.one_way_none.includes("da sola o insieme alle altre estrazioni"));
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('o.together ? `, ${t(lang, "one_way_together")}`'));
});

test("round 15: the range caution fires where the draws count participation the central result leaves out", () => {
  const on = (loan, params) => assess(loan, params).cautions;
  for (const k of ["caution_participation_range"]) assert.ok(TEXT.en[k] && TEXT.it[k], k);
  // the method's own values count participation in the central result: no range caution
  assert.ok(!on(PAGE, PARAMS).includes("participation_range"));
  // deadweight 1 keeps its own caution, not both
  assert.deepEqual(on(PAGE, withOverrides(PARAMS, { deadweight: 1 })), ["deadweight_full_range"]);
  // a custom bundle that fixes displacement at 1 leaves no participation in any draw: neither range caution
  const fixed = { ...PARAMS, displacement: { ...PARAMS.displacement, value: 1, range: [1, 1] } };
  assert.deepEqual(on(PAGE, withOverrides(fixed, { deadweight: 1 })).filter((c) => c !== "energy_no_saving"), []);
  assert.deepEqual(on(PAGE, fixed), []);
});

test("round 15: an earlier assessment's slots never draw into the new panel; the reviewer's name keeps loaded files", async () => {
  const pending = [];
  const keeper = slotsPerResult((v) => new Promise((r) => pending.push(() => r(`fp-${v.reviewer}`))));
  const settle = async () => { for (let i = 0; i < 5; i += 1) { while (pending.length) pending.shift()(); await new Promise((r) => setTimeout(r, 0)); } };
  // reviewer A's case: the old assessment's passport is still hashing when a new assessment's panel is drawn
  const old = keeper.for({ id: "old" });
  keeper.drawTo(() => {});
  old.use("a", { reviewer: "OLD 2.94" });
  const fresh = keeper.for({ id: "new" });
  const drawn = [];
  keeper.drawTo((s) => drawn.push(s.a && s.a.value.reviewer));
  fresh.use("b", { reviewer: "NEW 0.30" });
  await settle();
  assert.ok(!drawn.includes("OLD 2.94"), JSON.stringify(drawn));
  assert.equal(fresh.state.a, null);
  assert.equal(fresh.state.b.value.reviewer, "NEW 0.30");
  // a file read still running for the old assessment never lands either
  let release;
  old.choose("b", { text: () => new Promise((r) => { release = () => r(JSON.stringify({ reviewer: "OLD FILE" })); }) });
  const count = drawn.length;
  release();
  await settle();
  assert.equal(drawn.length, count);
  // a new name changes this assessment's passport: its slot is emptied, a loaded file stays
  const slots = keeper.for({ id: "named" });
  keeper.drawTo(() => {});
  slots.choose("b", { text: async () => JSON.stringify({ reviewer: "FILE B" }) });
  slots.use("a", { reviewer: "" });
  await settle();
  slots.retire();
  assert.equal(slots.state.a, null);
  assert.equal(slots.state.b.value.reviewer, "FILE B");
  // and the page keeps the same result instead of assessing anew, unless the form was edited (round 16 below)
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const handler = app.slice(app.indexOf("who.onchange"), app.indexOf("who.onchange") + 1600);
  assert.ok(handler.includes("compareSlots.for(last).retire();") && handler.includes("lastForm === canonical(readForm())"), handler);
});

test("round 15: the method pages say the 1 and 5 year ratios show only where shorter, and name both ways and together", () => {
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(en.includes("1 and 5 years, each where it is shorter than the period") && it.includes("1 e per 5 anni, ciascuno quando è più breve del periodo"));
  // round 19: the direction is the SROI ratio's, said in those words
  assert.ok(en.includes("or both where the ratio rises at some values sampled") && it.includes("o in entrambi i versi quando il rapporto sale"));
  assert.ok(en.includes("is named and marked so") && it.includes("è indicata e segnata come tale"));
});

// Round 16.
test("round 16: a period is read at every whole year, so a year the steps would skip still names both ways", () => {
  // reviewer C's case: a new facility with a high running cost and the reviewer's life of 1 year
  const loan = { ...PAGE, purpose: "new_build", amount: 10000, project_cost: 10000, operating_cost: 150000, users: 1000 };
  const params = withOverrides(PARAMS, { asset_life_build: 1 });
  const at = (y) => sroi(loan, { ...centralValues(loan, params), asset_life_build: y }).ratio;
  assert.ok(at(2) > at(1) && at(3) < at(1), "SROI rises from year 1 to 2 and falls after");
  assert.deepEqual(assess(loan, params).one_way.find((o) => o.param === "asset_life_build"), { param: "asset_life_build", draws: "up", value: "both" });
});

test("round 16: the together reading moves only the one-sided assumptions, and a zeroed result reads both", () => {
  // reviewer C's case: deadweight 1 on a small renovation with life 8; drop-off and discounting stay at their values
  const loan = { ...PAGE, amount: 50000, project_cost: 50000, users: 100, operating_cost: 25000, co2_avoided_t: 0 };
  const zero = assess(loan, withOverrides(PARAMS, { asset_life_renovation: 8, deadweight: 1 }));
  assert.deepEqual(zero.one_way.find((o) => o.param === "asset_life_renovation"), { param: "asset_life_renovation", draws: "up", value: "both", together: true });
  assert.deepEqual(assess(loan, withOverrides(PARAMS, { asset_life_renovation: 8, deadweight: 0.5 })).one_way.find((o) => o.param === "asset_life_renovation"),
    { param: "asset_life_renovation", draws: "up", value: "both" });
  // reviewer C's carbon case: alone the discount rate moves only the carbon value, towards less; with participation
  // drawn it moves towards more; round 17 keeps the two readings apart (reviewer A)
  const carbon = { ...PAGE, amount: 10000, project_cost: 10000, operating_cost: 20000, users: 1000, co2_avoided_t: 10 };
  const c = assess(carbon, withOverrides(PARAMS, { deadweight: 1, discount_rate: 0.008 }));
  assert.deepEqual(c.one_way.find((o) => o.param === "discount_rate"), { param: "discount_rate", draws: "up", value: "less", with_others: "more" });
  // round 15's cases hold
  const build = { ...PAGE, purpose: "new_build" };
  assert.deepEqual(assess(build, withOverrides(PARAMS, { value_per_user_sport: 0, deadweight: 1 })).one_way,
    [{ param: "deadweight", draws: "down", value: "more", together: true }, { param: "value_per_user_sport", draws: "up", value: "more", together: true }]);
});

test("round 16: retire() empties a slot whose passport is still hashing; deadweight 1 keeps its own caution", async () => {
  let release;
  const keeper = slotsPerResult(() => new Promise((r) => { release = () => r("fp-late"); }));
  const slots = keeper.for({ id: "hashing" });
  keeper.drawTo(() => {});
  slots.use("a", { reviewer: "OLD NAME" });
  slots.retire();
  release();
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
  assert.equal(slots.state.a, null);
  // two settings that each leave no participation: the deadweight caution, not the general one
  for (const over of [{ deadweight: 1, value_per_user_sport: 0 }, { deadweight: 1, attribution: 1 }]) {
    assert.deepEqual(assess(PAGE, withOverrides(PARAMS, over)).cautions, ["deadweight_full_range"], JSON.stringify(over));
  }
});

test("round 16: a reviewer's name updates the passport in place, never redrawing the card", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const handler = app.slice(app.indexOf("who.onchange"), app.indexOf("return el(\"details\", { class: \"panel\", open: Object.keys(overrides)"));
  assert.ok(!handler.includes("render(last)"), handler);
  assert.ok(handler.includes("showPassport(record, fingerprint)") && handler.includes("mine !== nameTurn || shown !== last"), handler);
  assert.ok(app.includes('el("p", { class: "mono", id: "fingerprint" })') && app.includes("function showPassport(record, fingerprint)"));
  // the comparison box holds its height while the slot empties, so a pressed button does not move away
  assert.ok(handler.indexOf("holdHeight(box, window, pointer)") > 0 && handler.indexOf("holdHeight(box, window, pointer)") < handler.indexOf("retire()"), handler);
});

// Round 17.
test("round 17: a carbon value set to zero is seen, and the two readings are kept apart", () => {
  const A = { ...PAGE, amount: 10000, project_cost: 10000 };
  // reviewer A's carbon-only case: no users, carbon value 0 and carbon deadweight 1; the range still counts carbon
  const c = assess({ ...A, users: 0, operating_cost: 0, co2_avoided_t: 10 }, withOverrides(PARAMS, { carbon_value: 0, carbon_deadweight: 1 }));
  assert.equal(c.sroi.ratio, 0);
  assert.ok(c.range.p10 > 0);
  assert.deepEqual(c.one_way, [{ param: "carbon_value", draws: "up", value: "more", together: true },
    { param: "carbon_deadweight", draws: "down", value: "more", together: true }]);
  // reviewer A's discounting case: alone, towards less value; the second reading is shown apart, never merged
  const d = assess({ ...A, users: 1000, co2_avoided_t: 10, operating_cost: 20000 }, withOverrides(PARAMS, { deadweight: 1, discount_rate: 0.008 }));
  const o = d.one_way.find((x) => x.param === "discount_rate");
  assert.equal(o.value, "less");
  assert.equal(o.with_others, "more");
  for (const k of ["one_way_with_others"]) assert.ok(TEXT.en[k] && TEXT.it[k], k);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('o.with_others ? `; ${t(lang, "one_way_with_others")} ${t(lang, `one_way_${o.with_others}`)}`'));
  assert.ok(TEXT.en.central_outside.includes("at the values sampled") && TEXT.it.central_outside.includes("nei valori campionati"));
});

test("round 17: a turn right beside the value in use is seen", () => {
  // reviewer A's case: discounting from 0.008 rises by a hair before it falls
  const loan = { ...PAGE, amount: 10000, project_cost: 10000, users: 1000, co2_avoided_t: 0, operating_cost: 5204.47 };
  const params = withOverrides(PARAMS, { deadweight: 0, discount_rate: 0.008 });
  const at = (x) => sroi(loan, { ...centralValues(loan, params), discount_rate: x }).ratio;
  assert.ok(at(0.0081) > at(0.008) && at(0.05) < at(0.008));
  assert.deepEqual(assess(loan, params).one_way.find((x) => x.param === "discount_rate"), { param: "discount_rate", draws: "up", value: "both" });
});

test("round 17: the download takes a new name's passport at once, and the height holds until the pointer is released", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const handler = app.slice(app.indexOf("who.onchange"), app.indexOf("return el(\"details\", { class: \"panel\", open: Object.keys(overrides)"));
  assert.ok(handler.indexOf("showPassport(record, hashing);") > 0 && handler.indexOf("showPassport(record, hashing);") < handler.indexOf("await hashing"), handler);
  assert.ok(handler.includes("if (box) holdHeight(box, window, pointer);") && !handler.includes("}, 600)"), handler);
  assert.ok(app.includes("const fp = await fingerprint;"));
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(en.includes("the card shows both readings") && it.includes("la scheda mostra entrambe le letture"));
});

// Round 18.
test("round 18: a period is sampled at whole years only, and 'both' never claims the rest of the draws", () => {
  // reviewer A's case: a renovation with life 8 and a running cost; 8.000017 and 8.017 years round to 8 years
  const loan = { ...PAGE, amount: 50000, project_cost: 50000, users: 100, operating_cost: 20000, co2_avoided_t: 0 };
  const params = withOverrides(PARAMS, { deadweight: 0, asset_life_renovation: 8 });
  const r = assess(loan, params);
  assert.ok(r.sroi.ratio > r.range.p90);
  assert.equal(r.one_way.find((x) => x.param === "asset_life_renovation").value, "both");
  assert.ok(!TEXT.en.one_way_both.includes("the rest") && !TEXT.it.one_way_both.includes("nel resto"));
  for (const page of ["../method.en.html", "../method.it.html"]) {
    const html = readFileSync(new URL(page, import.meta.url), "utf8");
    assert.ok(!html.includes("over the rest") && !html.includes("scende nel resto"), page);
  }
});

test("round 18: the second reading is taken whenever it differs, not only where a part is set to zero", () => {
  // reviewer A's case: deadweight 0.99999 leaves a little participation, so nothing is zero
  const loan = { ...PAGE, amount: 10000, project_cost: 10000, users: 1000, operating_cost: 20000, co2_avoided_t: 10 };
  const params = withOverrides(PARAMS, { deadweight: 0.99999, discount_rate: 0.008 });
  const r = assess(loan, params);
  assert.ok(r.sroi.peopleNet > 0);
  const o = r.one_way.find((x) => x.param === "discount_rate");
  assert.equal(o.value, "less");
  assert.equal(o.with_others, "more");
});

test("round 18: the height hold waits for a pressed pointer, and the five seconds apply only with none pressed", () => {
  const fakeWindow = () => {
    const on = {};
    return {
      addEventListener: (type, f) => { (on[type] ??= new Set()).add(f); },
      removeEventListener: (type, f) => { on[type]?.delete(f); },
      fire: (type) => { for (const f of [...(on[type] ?? [])]) f(); },
    };
  };
  const timers = [];
  const wait = (f, ms) => timers.push({ f, ms });
  const run = (ms) => { for (const x of timers.splice(0).filter((t) => t.ms === ms)) x.f(); };
  // pressed: the five seconds never fire, the release does
  let win = fakeWindow(), pointer = pointerState(win), box = { offsetHeight: 320, style: {} };
  win.fire("pointerdown");
  holdHeight(box, win, pointer, wait);
  assert.equal(box.style.minHeight, "320px");
  assert.equal(timers.filter((t) => t.ms === 5000).length, 0);
  win.fire("pointerup");
  run(0);
  assert.equal(box.style.minHeight, "");
  // keyboard: no pointer pressed, the five seconds release it
  win = fakeWindow(); pointer = pointerState(win); box = { offsetHeight: 200, style: {} };
  holdHeight(box, win, pointer, wait);
  assert.equal(box.style.minHeight, "200px");
  run(5000);
  assert.equal(box.style.minHeight, "");
  // a release after the hold has ended changes nothing and leaves no listener behind
  win.fire("pointerup");
  run(0);
  assert.equal(box.style.minHeight, "");
});

test("round 19: a pressed pointer keeps the hold past five seconds, and a second finger's release does not end the first's", () => {
  const fakeWindow = () => {
    const on = {};
    return {
      addEventListener: (type, f) => { (on[type] ??= new Set()).add(f); },
      removeEventListener: (type, f) => { on[type]?.delete(f); },
      fire: (type, pointerId = 1) => { for (const f of [...(on[type] ?? [])]) f({ pointerId }); },
    };
  };
  const timers = [];
  const wait = (f, ms) => timers.push({ f, ms });
  const run = (ms) => { for (const x of timers.splice(0).filter((t) => t.ms === ms)) x.f(); };
  // keyboard first, then a press before the five seconds end: the timer finds the pointer pressed and keeps the hold
  let win = fakeWindow(), pointer = pointerState(win), box = { offsetHeight: 300, style: {} };
  holdHeight(box, win, pointer, wait);
  win.fire("pointerdown", 1);
  run(5000);
  assert.equal(box.style.minHeight, "300px");
  win.fire("pointerup", 1);
  run(0);
  assert.equal(box.style.minHeight, "");
  // two fingers: the second's release keeps the hold while the first is pressed
  win = fakeWindow(); pointer = pointerState(win); box = { offsetHeight: 260, style: {} };
  win.fire("pointerdown", 1);
  win.fire("pointerdown", 2);
  holdHeight(box, win, pointer, wait);
  win.fire("pointerup", 2);
  run(0);
  assert.equal(box.style.minHeight, "260px");
  win.fire("pointerup", 1);
  run(0);
  assert.equal(box.style.minHeight, "");
});

test("round 19: a period is sampled at whole years only, also when its range ends between years", () => {
  for (const [d, far] of [[{ unit: "years", value: 3, range: [3, 7.5] }, 7.5], [{ unit: "years", value: 20, range: [12.5, 20] }, 12.5],
                          [{ unit: "years", value: 4, range: [4, 4.9] }, 4.9]]) {
    const pts = samplePoints(d, far);
    assert.ok(pts.every((x) => Number.isInteger(x)), JSON.stringify(pts));
    assert.ok(!pts.includes(d.value));
  }
  assert.deepEqual(samplePoints({ unit: "years", value: 3, range: [3, 7.5] }, 7.5), [4, 5, 6, 7]);
  for (const [k, d] of Object.entries(PARAMS).filter(([, d]) => d.unit === "years" && d.range)) {
    for (const far of d.range) assert.ok(samplePoints(d, far).every((x) => Number.isInteger(x)), k);
  }
  // other assumptions keep the two points beside the value in use
  const share = samplePoints({ value: 0, range: [0, 0.5] }, 0.5);
  assert.ok(share.includes(0.5 * 1e-6) && share.includes(0.5 * 1e-3));
});

test("round 19: the direction words name the SROI ratio, in both languages and on both method pages", () => {
  for (const lang of ["en", "it"]) {
    for (const key of ["one_way_more", "one_way_less", "one_way_both"]) assert.match(TEXT[lang][key], /SROI/, `${lang} ${key}`);
  }
  assert.ok(!/towards more value|towards less value/.test(TEXT.en.one_way_more + TEXT.en.one_way_less + TEXT.en.one_way_both));
});

// Round 20.
test("a range is called below 1.0 throughout only when every scanned value is; a missed narrow crossing is said as such", () => {
  // Hub round 20: a central ratio a hair above 1.0 at a reviewer discount rate inside the range, no crossing found
  const loan = { ...PAGE, amount: 100000, project_cost: 367807.94, users: 1000, operating_cost: 217837.25, co2_avoided_t: 0 };
  const b = breakEven(loan, withOverrides(PARAMS, { discount_rate: 0.03005 }));
  const r = b.rows.find((x) => x.param === "discount_rate");
  assert.ok(b.base >= 1 && b.base < 1.000001 && !r.inside_range && r.range_lowest < 1 && r.range_highest >= 1);
  assert.equal(rangeNote(r, b.base), "some_below");
  assert.equal(b.holds, false);
  // the round 7 case: deadweight set below its range leaves every published value below 1.0
  const d = breakEven({ ...PAGE, users: 190 }, withOverrides(PARAMS, { deadweight: 0.1 }));
  const dw = d.rows.find((x) => x.param === "deadweight");
  assert.ok(dw.range_highest < 1);
  assert.equal(rangeNote(dw, d.base), "all_below");
  // no note when a crossing lies inside, when the central ratio is below 1.0, or when the range clears 1.0
  assert.equal(rangeNote({ ...r, inside_range: true }, b.base), null);
  assert.equal(rangeNote(r, 0.99), null);
  assert.equal(rangeNote({ ...r, range_lowest: 1 }, b.base), null);
  // both languages carry both sentences, and neither says "whole" or "tutto" any more
  for (const lang of ["en", "it"]) {
    assert.ok(TEXT[lang].be_range_below && TEXT[lang].be_range_some_below);
    assert.ok(!/whole|tutto/.test(TEXT[lang].be_range_below + TEXT[lang].be_range_some_below));
  }
});

test("the one-way reading of a benefit period reads whole years only, on the path the card uses", () => {
  // Hub round 20, reviewer A: fractional near points put back inside oneWayDraws passed every test
  const seen = [];
  oneWayDraws(PAGE, withOverrides(PARAMS, { asset_life_renovation: 8 }), 96, (k, x) => { if (k === "asset_life_renovation") seen.push(x); });
  assert.ok(seen.length >= 17, `${seen.length} points`);
  assert.ok(seen.every((x) => Number.isInteger(x) && x > 8 && x <= 25), JSON.stringify(seen));
  assert.ok(seen.includes(25));
});

// Round 21.
test("a crossing a hair past a range end is outside unless the ratio at that end is 1.0 or below", () => {
  // Hub round 21, reviewer B (HIGH): deadweight's crossing at 0.9500000006 was marked inside its range ending at 0.95
  const loan = { ...PAGE, amount: 100000, project_cost: 1520855.98, users: 1200, operating_cost: 0, co2_avoided_t: 0 };
  const params = withOverrides(PARAMS, { discount_rate: 0, drop_off: 0 });
  const b = breakEven(loan, params);
  const dw = b.rows.find((x) => x.param === "deadweight");
  assert.ok(dw.crossings.length === 1 && dw.crossings[0].value > 0.95 && dw.crossings[0].value < 0.95 + 1e-8, JSON.stringify(dw.crossings));
  assert.equal(dw.crossings[0].inside, false);
  assert.ok(dw.range_lowest >= 1);
  assert.equal(b.holds, true);
  // a little more cost moves the crossing inside the range: then it is inside and the verdict is fragile
  const c = breakEven({ ...loan, project_cost: 1530000 }, params);
  const dc = c.rows.find((x) => x.param === "deadweight");
  assert.ok(dc.crossings[0].value < 0.95 && dc.crossings[0].inside);
  assert.equal(c.holds, false);
});

test("the value in use counts as scanned, so a range holding it is never called below 1.0 at every value", () => {
  // Hub round 21, reviewer A: the central ratio 1.0000000002 at a reviewer discount rate inside the range, every grid
  // value below 1.0 and no crossing found; the list said 'below 1.0 at every value scanned'
  const loan = { ...PAGE, amount: 100000, project_cost: 367119.69, users: 1000, operating_cost: 217895, co2_avoided_t: 0 };
  const b = breakEven(loan, withOverrides(PARAMS, { discount_rate: 0.03041725 }));
  const r = b.rows.find((x) => x.param === "discount_rate");
  assert.ok(b.base >= 1 && r.crossings.length === 0 && r.range_lowest < 1);
  assert.ok(r.range_highest >= b.base);
  assert.equal(rangeNote(r, b.base), "some_below");
  // the sentence for that case says both sides were seen, in both languages and on both method pages
  assert.match(TEXT.en.be_range_some_below, /below 1\.0 at some values and at or above 1\.0 at others/);
  assert.match(TEXT.it.be_range_some_below, /sotto 1,0 in alcuni valori e pari o sopra 1,0 in altri/);
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(en.includes("the value in use included") && en.includes("values at or above 1.0 in the range"));
  assert.ok(it.includes("compreso il valore in uso") && it.includes("valori pari o sopra 1,0"));
});

test("the break-even list reads rangeNote and maps each note to its own sentence", () => {
  // Hub round 21, reviewer A: a swapped key in app.js passed every test
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("const note = rangeNote(r, b.base);"));
  assert.ok(app.includes('note === "all_below" ? "be_range_below" : "be_range_some_below"'));
  assert.equal(rangeNote({ inside_range: false, range_lowest: 0.9, range_highest: 0.95 }, 1.1), "all_below");
  assert.equal(rangeNote({ inside_range: false, range_lowest: 0.9, range_highest: 1.1 }, 1.1), "some_below");
});

test("the one-way reading of a period reads every whole year of its side, alone and together", () => {
  // Hub round 21, reviewer B: removing year 24 from the points passed the round 20 test
  const seen = [];
  oneWayDraws(PAGE, withOverrides(PARAMS, { asset_life_renovation: 8 }), 96, (k, x) => { if (k === "asset_life_renovation") seen.push(x); });
  const years = Array.from({ length: 17 }, (_, i) => 9 + i);
  assert.deepEqual(seen, [...years, ...years]);
});

test("a cancelled pointer ends its press like a release, one pointer at a time", () => {
  // Hub round 21, reviewer B: pointercancel was handled but never fired by a test
  const on = {};
  const win = {
    addEventListener: (type, f) => { (on[type] ??= new Set()).add(f); },
    removeEventListener: (type, f) => { on[type]?.delete(f); },
    fire: (type, pointerId = 1) => { for (const f of [...(on[type] ?? [])]) f({ pointerId }); },
  };
  const timers = [];
  const wait = (f, ms) => timers.push({ f, ms });
  const run = (ms) => { for (const x of timers.splice(0).filter((t) => t.ms === ms)) x.f(); };
  const pointer = pointerState(win), box = { offsetHeight: 280, style: {} };
  win.fire("pointerdown", 1);
  win.fire("pointerdown", 2);
  holdHeight(box, win, pointer, wait);
  win.fire("pointercancel", 2);
  run(0);
  assert.equal(box.style.minHeight, "280px");
  assert.ok(pointer.held());
  win.fire("pointercancel", 1);
  run(0);
  assert.equal(pointer.held(), false);
  assert.equal(box.style.minHeight, "");
});

test("the sport value cites the page that states its price year", () => {
  // Hub round 21, reviewer A: '2024 prices' was not tied to a page; the summary report says so on p. 10
  assert.match(PARAMS.value_per_user_sport.source.title, /p\. 14 \(values\) and p\. 10 \(all figures in 2024 prices\)/);
});

test("both method pages name the three points not in this version", () => {
  // Hub round 21, reviewer A: a line costs less than silence on the points carried since round 17
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(en.includes("Not in this version:") && /passport; two separate culture scenarios/.test(en) && en.includes("benefit period entered on the loan form"));
  assert.ok(it.includes("Non in questa versione:") && /passaporto; due scenari separati per la cultura/.test(it) && it.includes("periodo dei benefici inserito nel modulo"));
});

// Round 22.
test("a crossing just past the top of a range whose every value is below 1.0 is outside, and the range is called below", () => {
  // Hub round 22, reviewer B (HIGH): the sport crossing at 2347.000002 counted as inside a range ending at 2347
  const loan = { ...PAGE, amount: 100000, project_cost: 12166848.01, users: 2400, operating_cost: 0, co2_avoided_t: 0 };
  const b = breakEven(loan, withOverrides(PARAMS, { discount_rate: 0, drop_off: 0, value_per_user_sport: 2500 }));
  const r = b.rows.find((x) => x.param === "value_per_user_sport");
  const c = r.crossings.find((x) => x.value > 2347 && x.value < 2347.0001);
  assert.ok(c, JSON.stringify(r.crossings));
  assert.equal(c.inside, false);
  assert.ok(r.range_highest < 1);
  assert.equal(rangeNote(r, b.base), "all_below");
});

test("a crossing that rounds onto a range end is outside when every value in the range is at or above 1.0", () => {
  // Hub round 22, reviewer B (HIGH): the deadweight crossing rounded to exactly 0.95 and the exact-range test took it
  const loan = { ...PAGE, amount: 100000, project_cost: 1520856, users: 1200, operating_cost: 0, co2_avoided_t: 0 };
  const b = breakEven(loan, withOverrides(PARAMS, { discount_rate: 0, drop_off: 0 }));
  const dw = b.rows.find((x) => x.param === "deadweight");
  assert.ok(dw.range_lowest >= 1);
  assert.ok(dw.crossings.every((x) => !x.inside), JSON.stringify(dw.crossings));
  assert.equal(b.holds, true);
});

test("a whole-year step from below the range to its first year is marked as starting outside, in both languages", () => {
  // Hub round 22, reviewer B: '8 years (outside the stated range)' read as if year 8 lay outside a range of 8 to 25
  const b = breakEven({ ...PAGE, users: 474, operating_cost: 0 });
  const r = b.rows.find((x) => x.param === "asset_life_renovation");
  assert.deepEqual(r.crossings.map((x) => [x.value, x.place]), [[8, "step_outside"]]);
  for (const lang of ["en", "it"]) {
    for (const c of r.crossings) assert.ok(TEXT[lang][placeKey(c)], lang);
  }
  assert.match(TEXT.en.outside_range_step, /first year at or above 1\.0 is in the stated range/);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("t(lang, placeKey(c))"));
});

test("the verdict sentence follows below, holds and fragile, in both languages", () => {
  // Hub round 22, reviewer B: swapping be_holds and be_fragile in the page passed every test
  assert.equal(verdictKey({ base: 0.9, holds: false }), "be_below");
  assert.equal(verdictKey({ base: 1.2, holds: true }), "be_holds");
  assert.equal(verdictKey({ base: 1.2, holds: false }), "be_fragile");
  assert.equal(verdictKey(breakEven(PAGE_DEFAULT)), "be_fragile");
  assert.equal(verdictKey(breakEven({ ...PAGE, users: 100 })), "be_below");
  assert.match(TEXT.en.be_holds, /no single assumption/);
  assert.match(TEXT.en.be_fragile, /^At least one assumption/);
  assert.match(TEXT.it.be_holds, /non trova alcuna singola ipotesi/);
  assert.match(TEXT.it.be_fragile, /^Almeno un'ipotesi/);
  // the same rule for both: below means under 1.0
  assert.ok(TEXT.en.be_fragile.includes("below 1.0") && !TEXT.en.be_fragile.includes("1.0 or below"));
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("text: t(lang, verdictKey(b))"));
});

// Round 23.
test("a downward whole-year step from below the range says its first year is below 1.0, in both languages", () => {
  // Hub round 23, reviewer B (HIGH): "falls below 1.0 at 8 years" was told its first year was at or above 1.0
  const loan = { ...PAGE, amount: 1000, project_cost: 4800, users: 100, operating_cost: 3000, co2_avoided_t: 0 };
  const params = withOverrides(PARAMS, { discount_rate: 0, drop_off: 0.5, value_per_user_sport: 1000, asset_life_renovation: 5 });
  const b = breakEven(loan, params);
  const r = b.rows.find((x) => x.param === "asset_life_renovation");
  const c = r.crossings.find((x) => x.value === 8);
  assert.ok(c && c.direction === "down" && c.place === "step_outside", JSON.stringify(r.crossings));
  assert.equal(placeKey(c), "outside_range_step_down");
  assert.match(TEXT.en[placeKey(c)], /first year below 1\.0/);
  assert.match(TEXT.it[placeKey(c)], /primo anno sotto 1,0/);
  assert.equal(placeKey({ place: "step_outside", direction: "up" }), "outside_range_step");
  assert.equal(placeKey({ place: "inside", direction: "down" }), "inside_range");
  assert.equal(placeKey({ place: "outside", direction: "up" }), "outside_range");
});

test("a ratio of exactly 1.0 is not below 1.0 in the verdict", () => {
  // Hub round 23, reviewer B: "base <= 1" in verdictKey passed every test
  assert.equal(verdictKey({ base: 1, holds: true }), "be_holds");
  assert.equal(verdictKey({ base: 1, holds: false }), "be_fragile");
  assert.equal(verdictKey({ base: 0.9999999999, holds: false }), "be_below");
});

test("governance weighs borrower 30, monitoring 30, audited accounts 20 and consultation 20", () => {
  // Hub round 23, reviewer B: swapping the monitoring and audited-accounts weights passed every test
  const r = esgRating({ ...LOAN, borrower: "comune", monitoring_plan: false, audited_accounts: true, community_consulted: false });
  assert.deepEqual(r.pillars.G.map((s) => [s.id, s.weight]), [["G1", 0.3], ["G2", 0.3], ["G3", 0.2], ["G4", 0.2]]);
  assert.equal(r.scores.G, 52);
  const flip = esgRating({ ...LOAN, borrower: "comune", monitoring_plan: true, audited_accounts: false, community_consulted: false });
  assert.equal(flip.scores.G, 24 + 30 + 6 + 8);
});

// Round 24.
test("both method pages say a period's break-even is the first whole year on the far side of 1.0, either way", () => {
  // Hub round 24, reviewer B (HIGH): the Italian page still said "il primo anno intero oltre 1,0"
  const en = readFileSync(new URL("../method.en.html", import.meta.url), "utf8");
  const it = readFileSync(new URL("../method.it.html", import.meta.url), "utf8");
  assert.ok(!it.includes("primo anno intero oltre 1,0"));
  assert.ok(it.includes("primo anno intero dall'altro lato di 1,0 (a 1,0 o oltre salendo, sotto 1,0 scendendo)"));
  assert.ok(en.includes("first whole year on the far side of 1.0 (at or above 1.0 going up, below 1.0 going down)"));
});

test("a ratio just below 1.0 is never shown as 1 beside a below verdict", () => {
  // Hub round 24, reviewer B: the round 23 loan with an 8-year period showed 1 while the verdict said less than one euro
  const loan = { ...PAGE, amount: 1000, project_cost: 4800, users: 100, operating_cost: 3000, co2_avoided_t: 0 };
  const a = assess(loan, withOverrides(PARAMS, { discount_rate: 0, drop_off: 0.5, value_per_user_sport: 1000, asset_life_renovation: 8 }));
  assert.equal(a.sroi.ratio, 1);
  assert.ok(a.break_even.base < 1);
  assert.equal(verdictKey(a.break_even), "be_below");
  assert.deepEqual(ratioShown(a.break_even.base), { value: 1, under: true });
  assert.deepEqual(ratioShown(1), { value: 1, under: false });
  assert.deepEqual(ratioShown(0.994), { value: 0.99, under: false });
  for (const lang of ["en", "it"]) assert.ok(TEXT[lang].just_under_one, lang);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('el("div", { class: "big", text: ratioText(result) })'));
  // the card reads the engine's flag, which is the verdict's own unrounded ratio (round 25 moved it into the result)
  assert.equal(a.sroi.ratio_under, true);
  assert.ok(app.includes("ratioWords(lang, result.sroi.ratio, result.sroi.ratio_under)"));
});

test("a central ratio of exactly 1.0 holds or is fragile by the ranges, never below, end to end", () => {
  // Hub round 24, reviewer B: the round 23 equality test gave verdictKey made-up holds values
  const loan = { ...LOAN, co2_avoided_t: 0, amount: 1, project_cost: 3151817.9062016904 };
  const params = withOverrides(PARAMS, { discount_rate: 0.05 });
  const fragile = breakEven(loan, params);
  assert.equal(fragile.base, 1);
  assert.equal(fragile.holds, false);
  assert.equal(verdictKey(fragile), "be_fragile");
  // only the discount rate ranged: its range ends at exactly 1.0, so the result holds
  const only = Object.fromEntries(Object.entries(params).map(([k, d]) => [k, k === "discount_rate" ? d
    : (d.status === "reviewer" ? { ...d, cited_range: undefined } : { ...d, range: undefined })]));
  assert.ok(Object.entries(only).every(([k, d]) => k === "discount_rate" || !statedRange(d)));
  const holds = breakEven(loan, only);
  assert.equal(holds.base, 1);
  assert.equal(holds.rows.length, 1);
  assert.equal(holds.rows[0].range_lowest, 1);
  assert.equal(holds.holds, true);
  assert.equal(verdictKey(holds), "be_holds");
});

// Round 25.
test("the ratio's words, by behaviour, in both languages, either side of the rounding to 1.00", () => {
  // Hub round 25, reviewers A and B: round 24 checked the page's source for two strings, not what it shows
  const cases = [
    [0.994, "0.99", "0,99", "EUR 0.99", "EUR 0,99", "0.99", "0,99"],
    [0.995, "just under 1", "appena sotto 1", "just under EUR 1", "appena sotto EUR 1", "0.995", "0,995"],
    [0.9960937, "just under 1", "appena sotto 1", "just under EUR 1", "appena sotto EUR 1", "0.996", "0,996"],
    [0.9999999, "just under 1", "appena sotto 1", "just under EUR 1", "appena sotto EUR 1", "0.9999", "0,9999"],
    [1, "1", "1", "EUR 1", "EUR 1", "1", "1"],
    [1.004, "1", "1", "EUR 1", "EUR 1", "1", "1"],
    [1.236, "1.24", "1,24", "EUR 1.24", "EUR 1,24", "1.24", "1,24"],
  ];
  for (const [raw, wEn, wIt, pEn, pIt, xEn, xIt] of cases) {
    const { value, under } = ratioShown(raw);
    assert.equal(ratioWords("en", value, under), wEn, `${raw} en`);
    assert.equal(ratioWords("it", value, under), wIt, `${raw} it`);
    assert.equal(ratioPerEuro("en", value, under), pEn, `${raw} en per euro`);
    assert.equal(ratioPerEuro("it", value, under), pIt, `${raw} it per euro`);
    // the step table's division: four decimals, cut, never 1 for a ratio below 1.0
    assert.equal(ratioExact("en", raw, value, under), xEn, `${raw} en exact`);
    assert.equal(ratioExact("it", raw, value, under), xIt, `${raw} it exact`);
  }
});

test("a shorter period just below 1.0 carries the under flag, as the central ratio does", () => {
  // Hub round 25, reviewer A: the 1-year ratio of this loan is 0.9999 and read "1" with no flag
  const a = assess({ ...LOAN, amount: 1000, project_cost: 32815, users: 100, operating_cost: 0, co2_avoided_t: 0 });
  const one = a.horizons.find((h) => h.years === 1);
  assert.equal(one.ratio, 1);
  assert.equal(one.under, true);
  assert.equal(ratioWords("en", one.ratio, one.under), "just under 1");
  const c = centralValues({ ...LOAN, amount: 1000, project_cost: 32815, users: 100, operating_cost: 0, co2_avoided_t: 0 }, PARAMS);
  assert.ok(sroi({ ...LOAN, amount: 1000, project_cost: 32815, users: 100, operating_cost: 0, co2_avoided_t: 0 }, { ...c, years: 1 }).presentValue
    / a.sroi.inputs < 1);
  for (const h of assess(LOAN).horizons) assert.equal(h.under, false);
  // the central flag is the verdict's: below 1.0 exactly when the verdict says below, among loans rounding to 1.00
  for (const r of syntheticBook().map((l) => assess(l))) {
    assert.equal(r.sroi.ratio_under, r.break_even.base < 1 && r.sroi.ratio >= 1, r.loan.id);
    assert.equal(passport(r).results.sroi.ratio_under, r.sroi.ratio_under);
  }
});

test("every spot on the page that shows an SROI ratio goes through the shared words", () => {
  // Hub round 25, reviewer A: the step table, the shorter periods, the portfolio table, the sector table and the
  // scatter tooltip printed the rounded ratio with no flag
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(!/num\([^()]*(?:ratio|range\.p|\blo\b|\bhi\b|lowest|highest)/.test(app));
  assert.ok(!app.includes("num(s.pv / s.cost)"));
  assert.ok(app.includes("ratioWords(lang, h.ratio, h.under)"));
  assert.ok(app.includes("ratioExact(lang, result.break_even.base, sroi.ratio, sroi.ratio_under)"));
  assert.ok(app.includes("ratioPerEuro(lang, sroi.ratio, sroi.ratio_under)"));
  assert.equal(app.match(/ratioWords\(lang, r\.sroi\.ratio, r\.sroi\.ratio_under\)/g).length, 2);
});

test("the environmental pillar weighs energy class 40, renewables 25, land use 20 and climate risk 15", () => {
  // Hub round 25, reviewer B: swapping the land-use and climate-risk weights left the default loan's score unchanged
  const r = esgRating({ ...LOAN, climate_risk: "high" });
  assert.deepEqual(r.pillars.E.map((s) => [s.id, s.weight]), [["E1", 0.4], ["E2", 0.25], ["E3", 0.2], ["E4", 0.15]]);
  // energy 3 classes = 60, renewables 40, reuse 100, high risk 20
  // within float noise, so a later weight such as 0.35 fails on the rule, not on rounding (round 26, reviewer A)
  assert.ok(Math.abs(r.scores.E - (0.4 * 60 + 0.25 * 40 + 0.2 * 100 + 0.15 * 20)) < 1e-9);
});

// Round 26.
const SPORT = { ...LOAN, region: "umbria", co2_avoided_t: 0, operating_cost: 0 };

test("a ratio of 1.005 reads 1 in the step table as on the card, in both languages", () => {
  // Hub round 26, reviewers A and B: the step table formatted the raw ratio, so 1.005 read 1.01 beside a card of 1
  const cases = [
    [{ ...SPORT, amount: 100, project_cost: 200, users: 1 }, { value_per_user_sport: 201, deadweight: 0, displacement: 0, attribution: 0, discount_rate: 0, asset_life_renovation: 1 }],
    [{ ...SPORT, amount: 1000, project_cost: 1000, users: 201 }, { value_per_user_sport: 5, deadweight: 0, displacement: 0, attribution: 0, discount_rate: 0, asset_life_renovation: 1 }],
  ];
  for (const [loan, over] of cases) {
    const a = assess(loan, withOverrides(PARAMS, over));
    assert.ok(Math.abs(a.break_even.base - 1.005) < 1e-12, String(a.break_even.base));
    for (const lang of ["en", "it"]) {
      assert.equal(ratioExact(lang, a.break_even.base, a.sroi.ratio, a.sroi.ratio_under), ratioWords(lang, a.sroi.ratio, a.sroi.ratio_under));
    }
    assert.equal(ratioExact("en", a.break_even.base, a.sroi.ratio, a.sroi.ratio_under), String(a.sroi.ratio));
  }
});

test("the range and the sensitivity bars carry the under flag, and outside the band is read unrounded", () => {
  // Hub round 26, reviewer A: a central 0.996 below a p10 of 0.998 showed "just under 1" beside a range from 1, with no
  // warning
  const a = assess({ ...SPORT, amount: 1000, project_cost: 67334.06638660871, users: 100 }, withOverrides(PARAMS, { deadweight: 0.9548132317012641 }));
  assert.ok(a.break_even.base < 1 && a.sroi.ratio_under);
  assert.ok(a.range.central_outside);
  assert.equal(a.range.p10, 1);
  assert.equal(a.range.under.p10, true);
  assert.equal(ratioWords("en", a.range.p10, a.range.under.p10), "just under 1");
  // reviewer B: the page's own loan with deadweight at 0.95 bottoms out at 0.997, shown as 1 on the bar
  const b = assess({ ...PAGE, amount: 700000, project_cost: 734119 }, withOverrides(PARAMS, {}));
  const dw = b.sensitivity.find((r) => r.param === "deadweight");
  assert.equal(dw.lowest, 1);
  assert.equal(dw.lowest_under, true);
  assert.equal(ratioWords("it", dw.lowest, dw.lowest_under), "appena sotto 1");
  // a flag only where the shown value is 1
  for (const r of [...assess(LOAN).sensitivity, ...b.sensitivity]) {
    if (r.lowest !== 1) assert.equal(r.lowest_under, false, r.param);
    if (r.highest !== 1) assert.equal(r.highest_under, false, r.param);
  }
  assert.equal(assess(LOAN).range.central_outside, false);
});

test("a five-year ratio just below 1.0 is flagged, and exactly 1 and just above are not", () => {
  // Hub round 26, reviewer A: no test held a five-year ratio that rounds to 1 from below
  const base = { ...SPORT, amount: 1000, users: 100 };
  const c = centralValues({ ...base, project_cost: 1 }, PARAMS);
  const pv5 = sroi({ ...base, project_cost: 1 }, { ...c, years: 5 }).presentValue;
  const five = (target) => assess({ ...base, project_cost: pv5 / target }).horizons.find((h) => h.years === 5);
  assert.deepEqual([five(0.998).ratio, five(0.998).under], [1, true]);
  assert.equal(ratioWords("en", five(0.998).ratio, five(0.998).under), "just under 1");
  assert.equal(ratioWords("it", five(0.998).ratio, five(0.998).under), "appena sotto 1");
  assert.deepEqual([five(1).ratio, five(1).under], [1, false]);
  assert.deepEqual([five(1.002).ratio, five(1.002).under], [1, false]);
});

// Round 27.
test("a bar that crosses 1.0 by less than 0.005 is drawn", () => {
  // Hub round 27, reviewer A: its rounded swing was 0, so the chart left it out in both languages
  const a = assess({ ...PAGE, amount: 1000, project_cost: 3572720.01, operating_cost: 0, co2_avoided_t: 7.1941 });
  const row = a.sensitivity.find((r) => r.param === "carbon_deadweight");
  assert.equal(row.swing, 0);
  assert.equal(row.moves, true);
  assert.ok(row.lowest_under && !row.highest_under);
  assert.equal(barEnds("en", row), "just under 1 to 1");
  assert.equal(barEnds("it", row), "appena sotto 1 a 1");
  // a row that swings by 0.01 or more always moves
  for (const r of assess(LOAN).sensitivity) if (r.swing > 0) assert.equal(r.moves, true, r.param);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("result.sensitivity.filter((r) => r.moves)"));
});

test("every range and bar end flag reaches the words, the median and p90 and a bar's top end too", () => {
  // Hub round 27, reviewer A: forcing the p50, p90 or highest flag off passed every test
  const base = { ...SPORT, amount: 1000, users: 100 };
  const ref = assess({ ...base, project_cost: 100000 });
  const at = (raw, target) => assess({ ...base, project_cost: 100000 * raw / target });  // no running cost: ratios scale with 1/cost
  const p90 = at(sroiRange({ ...base, project_cost: 100000 }, PARAMS).p90, 0.998).range;
  assert.deepEqual([p90.p90, p90.under.p90], [1, true]);
  assert.equal(rangeEnds("en", p90).endsWith("to just under 1"), true);
  const p50 = at(sroiRange({ ...base, project_cost: 100000 }, PARAMS).p50, 0.998).range;
  assert.deepEqual([p50.p50, p50.under.p50], [1, true]);
  assert.equal(ratioWords("it", p50.p50, p50.under.p50), "appena sotto 1");
  const top = ref.sensitivity.find((r) => r.param === "deadweight");
  const raw = sensitivity({ ...base, project_cost: 100000 }, PARAMS).rows.find((r) => r.param === "deadweight").highest;
  const high = at(raw, 0.998).sensitivity.find((r) => r.param === "deadweight");
  assert.ok(top.highest > 1);
  assert.deepEqual([high.highest, high.highest_under], [1, true]);
  assert.equal(barEnds("en", high).endsWith("to just under 1"), true);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.match(/rangeEnds\(lang, (?:r\.)?range\)/g).length, 3);
  assert.ok(app.includes("barEnds(lang, r)"));
});

test("the passport comparison shows a flagged ratio in words and numbers in the page's language", () => {
  // Hub round 27, reviewer B: a central 0.996 showed as 1 there, and the Italian page used a decimal point
  const a = assess({ ...PAGE, amount: 1000, project_cost: 4800, users: 100, operating_cost: 3000, co2_avoided_t: 0 },
    withOverrides(PARAMS, { discount_rate: 0, drop_off: 0.5, value_per_user_sport: 1000, asset_life_renovation: 8 }));
  const pp = passport(a);
  assert.equal(compareCell("en", "results.sroi.ratio", pp.results.sroi.ratio, pp, canonical), "just under 1");
  assert.equal(compareCell("it", "results.sroi.ratio", pp.results.sroi.ratio, pp, canonical), "appena sotto 1");
  assert.equal(compareCell("it", "parameters.deadweight.value", 0.9, pp, canonical), "0,9");
  assert.equal(compareCell("en", "results.esg_grade", "B", pp, canonical), canonical("B"));
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(!app.includes("canonical(d.a)") && !app.includes("canonical(d.b)"));
});

test("the culture label and its note name the activities the source's model covers", () => {
  // Hub round 27, reviewer A (method): age and frequency alone let a library or a workshop in
  for (const words of ["museum", "heritage site", "cinema", "theatre", "concert"]) assert.ok(TEXT.en.users.includes(words), words);
  for (const words of ["musei", "siti del patrimonio", "cinema", "teatro", "concerti"]) assert.ok(TEXT.it.users.includes(words), words);
  assert.ok(PARAMS.value_per_user_culture.note.en.startsWith("Model 1 covers attendance at a museum"));
  assert.ok(PARAMS.carbon_value.note.en.includes("Phase 2 (2026-2030), which replaces the 2021-2025 roadmap"));
  const data = readFileSync(new URL("../DATA.md", import.meta.url), "utf8");
  assert.ok(data.includes("Phase 2, 2026-2030") && data.includes("paragraph 17"));
});

test("the portfolio table shows the score with the card's decimal, so a 64.9 never reads 65 beside a C", () => {
  // Hub round 28, reviewer A: SYN-022 read "C (65)" in the portfolio and score 64.9 when opened; B starts at 65
  const r = assess(syntheticBook().find((l) => l.id === "SYN-022"));
  assert.equal(r.esg.total, 64.9);
  assert.equal(r.esg.grade, "C");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("num(esg.total, 1)") && app.includes("num(r.esg.total, 1)"));
  assert.ok(!/num\((?:r\.)?esg\.total, 0\)/.test(app));
});

test("two passport values that differ never read the same in the comparison", () => {
  // Hub round 28, reviewer A: deadweight 0.9999999 and 1 both read 1, in both languages
  const pp = passport(assess(LOAN));
  const path = "parameters.deadweight.value";
  assert.deepEqual(compareCells("en", path, 0.9999999, 1, pp, pp, canonical), ["0.9999999", "1"]);
  assert.deepEqual(compareCells("it", path, 0.9999999, 1, pp, pp, canonical), ["0,9999999", "1"]);
  assert.deepEqual(compareCells("en", path, 0.25, 0.3, pp, pp, canonical), ["0.25", "0.3"]);
  assert.deepEqual(compareCells("en", "results.esg_grade", "B", "C", pp, pp, canonical), [canonical("B"), canonical("C")]);
  // two flagged ratios that read the same words carry their values
  const under = (v) => ({ results: { sroi: { ratio: v, ratio_under: true } } });
  assert.deepEqual(compareCells("en", "results.sroi.ratio", 0.996, 0.997, under(0.996), under(0.997), canonical),
    ["just under 1 (0.996)", "just under 1 (0.997)"]);
  assert.deepEqual(compareCells("en", "results.sroi.ratio", 0.996, 1.2, under(0.996), pp, canonical), ["just under 1", "1.2"]);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("compareCells(lang, d.path, d.a, d.b, s.a.value, s.b.value, canonical, pathEnds(d.path))"));
});

test("each percentile in the passport comparison reads its own flag", () => {
  // Hub round 28, reviewer A: only the central ratio's flag was tested in the comparison
  const flags = (p10, p50, p90) => ({ results: { range: { under: { p10, p50, p90 } } } });
  for (const [k, i] of [["p10", 0], ["p50", 1], ["p90", 2]]) {
    const on = [false, false, false]; on[i] = true;
    const off = [true, true, true]; off[i] = false;
    assert.equal(compareCell("en", `results.range.${k}`, 0.998, flags(...on), canonical), "just under 1", k);
    assert.equal(compareCell("it", `results.range.${k}`, 0.998, flags(...on), canonical), "appena sotto 1", k);
    assert.equal(compareCell("en", `results.range.${k}`, 1.5, flags(...off), canonical), "1.5", k);
  }
  // opposite flags on p10 and p90 of one passport
  const pp = flags(true, false, false);
  assert.equal(compareCell("en", "results.range.p10", 0.998, pp, canonical), "just under 1");
  assert.equal(compareCell("en", "results.range.p90", 1.4, pp, canonical), "1.4");
});

test("every indicator's rule is shown beside its points in both languages", () => {
  // Hub round 28, reviewer A (method): the step table showed input and points but not the formula between them
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const loans = [LOAN, { ...LOAN, purpose: "new_build", brownfield: true }, ...syntheticBook()];
  const rules = new Set(loans.flatMap((l) => Object.values(esgRating(l).pillars).flat().map((st) => st.rule)));
  assert.equal(rules.size, 12);
  for (const r of rules) assert.ok(new RegExp(`\\n  ${r}: \\{ en: "[^"]+", it: "[^"]+" \\},`).test(app), r);
  assert.ok(app.includes('el("td", { class: "small", text: RULES[s.rule][lang] })'));
  assert.ok(TEXT.en.rule === "Rule" && TEXT.it.rule === "Regola");
  for (const page of ["method.en.html", "method.it.html"]) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    assert.ok(html.includes(page.includes(".en.") ? "shown beside its points in the step table" : "mostrata accanto ai punti"), page);
  }
});

test("the discount note says the guide reports the low end from Catalano et al.", () => {
  // Hub round 28, reviewer B: the guide reports 0.80% from Catalano et al. (2021); it did not compute it
  assert.ok(PARAMS.discount_rate.note.en.includes("which the guide reports from Catalano et al. (2021)"));
  assert.ok(PARAMS.discount_rate.note.it.includes("che la guida riporta da Catalano et al. (2021)"));
  assert.ok(TEXT.en.sector_sum_note.includes("assume no two loans count the same people"));
});

test("two passport values too small for 17 decimals still read apart", () => {
  // Hub round 29, reviewer A: deadweights 1e-18 and 2e-18 both read 0
  const pp = passport(assess(LOAN));
  assert.deepEqual(compareCells("en", "parameters.deadweight.value", 1e-18, 2e-18, pp, pp, canonical), ["0.000000000000000001", "0.000000000000000002"]);
  assert.deepEqual(compareCells("it", "parameters.deadweight.value", 1.5e-18, 2e-18, pp, pp, canonical), ["1,5e-18", "2e-18"]);
});

test("a share next to an end of its range never reads as that end", () => {
  // Hub round 29, reviewer A: a reviewer deadweight of 0.9999 read (1 − 1) in the formula and 100% on the slider,
  // beside a people value of about EUR 203
  assert.equal(digitsNearEnds(0.9999, 3, [0, 1]), 4);
  assert.equal(digitsNearEnds(0.0001, 3, [0, 1]), 4);
  assert.equal(digitsNearEnds(99.99, 1, [0, 100]), 2);
  assert.equal(digitsNearEnds(0.5, 3, [0, 1]), 3);
  assert.equal(digitsNearEnds(1, 3, [0, 1]), 3);
  assert.equal(digitsNearEnds(100, 1, [0, 100]), 1);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  for (const k of ["deadweight", "displacement", "attribution", "carbon_deadweight"]) assert.ok(app.includes(`share(P.${k}.value)`), k);
  assert.ok(!/num\(P\.[a-z_]+\.value, 3\)/.test(app));
  assert.ok(app.includes("const share = (v) => shareText(lang, v);"));
  assert.ok(app.includes("const showParam = (k, v) => (isShare(k) ? `${pct(k, v)}%` : num(v, 0));"));
  const a = assess({ ...LOAN, co2_avoided_t: 0 }, withOverrides(PARAMS, { deadweight: 0.9999 }));
  assert.ok(a.sroi.peopleNet > 0);
});

test("each rule's numbers are the engine's, in both languages", () => {
  // Hub round 29, reviewer A: the rule test checked only that text existed, so "25 points" for E1 passed
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const rule = (k) => {
    const m = app.match(new RegExp(`\\n  ${k}: \\{ en: "([^"]+)", it: "([^"]+)" \\},`));
    assert.ok(m, k);
    return { en: m[1], it: m[2] };
  };
  const pts = (loan, id) => Object.values(esgRating({ ...LOAN, ...loan }).pillars).flat().find((st) => st.id === id).points;
  const numbersIn = (text) => (text.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(",", ".")));
  const has = (k, values) => {
    for (const lang of ["en", "it"]) {
      const found = numbersIn(rule(k)[lang]);
      for (const v of values) assert.ok(found.includes(v), `${k} ${lang} ${v}`);
    }
  };
  has("energy_class_gain", [pts({ energy_class_gain: 1 }, "E1"), pts({ energy_class_gain: 7 }, "E1")]);
  has("land_use", [pts({ purpose: "renovation" }, "E3"), pts({ purpose: "new_build", brownfield: true }, "E3"), pts({ purpose: "new_build", brownfield: false }, "E3")]);
  has("climate_risk", [pts({ climate_risk: "low" }, "E4"), pts({ climate_risk: "medium" }, "E4"), pts({ climate_risk: "high" }, "E4")]);
  assert.equal(pts({ climate_risk: undefined }, "E4"), pts({ climate_risk: "medium" }, "E4"));
  has("users_per_100k", [100, 1, 501, 500]);
  assert.equal(Math.round(pts({ users: 500, project_cost: 100000 }, "S1")), 100);
  const none = { accessible_beyond_minimum: false, free_access_share: 0, youth_or_senior_programme: false };
  has("inclusion", [pts({ ...none, accessible_beyond_minimum: true }, "S3"), pts({ ...none, free_access_share: 1 }, "S3"), pts({ ...none, youth_or_senior_programme: true }, "S3")]);
  has("inner_area", [pts({ inner_area: true }, "S4"), pts({ inner_area: false }, "S4")]);
  has("borrower_transparency", [pts({ borrower: "comune" }, "G1"), pts({ borrower: "sports_association" }, "G1")]);
  assert.equal(pts({ borrower: "school_university" }, "G1"), pts({ borrower: "comune" }, "G1"));
  has("monitoring_plan", [pts({ monitoring_plan: true }, "G2"), pts({ monitoring_plan: false }, "G2")]);
  has("audited_accounts", [pts({ audited_accounts: true }, "G3"), pts({ audited_accounts: false }, "G3")]);
  has("community_consulted", [pts({ community_consulted: true }, "G4"), pts({ community_consulted: false }, "G4")]);
  // the words name what the form asks: hours free or at reduced price, and schools and universities by name
  assert.ok(rule("inclusion").en.includes("free or at reduced price") && rule("inclusion").it.includes("gratuite o a prezzo ridotto"));
  assert.ok(!rule("borrower_transparency").en.includes("public body"));
});

test("local review: a percentage near its own slider's end, a bad number, and a failed result after a language switch", () => {
  // drop-off stops at 99% and the discount rate at 20%, so 0.9896 read 99% and 0.19996 read 20%
  assert.equal(digitsNearEnds(98.96, 1, [0, 99]), 2);
  assert.equal(digitsNearEnds(19.996, 1, [0, 20]), 3);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("const pctEnds = (k) => domainOf(PARAMS[k]).map((e) => Number((e * 100).toFixed(6)));"));
  assert.ok(app.includes("const pct = (k, v) => percentText(lang, decimalTimes(v, 100), pctEnds(k));"));
  for (const k of ["drop_off", "discount_rate"]) assert.ok(app.includes(`pct("${k}", P.${k}.value)`), k);
  assert.ok(!app.includes("digitsNearEnds(v * 100, 1, [0, 100])"));
  // text the browser cannot read as a number is refused, never read as a field left out
  assert.ok(app.includes("else if (input.validity?.badInput) loan[key] = NaN;"));
  for (const k of ["operating_cost", "co2_avoided_t", "energy_class_gain", "renewable_share", "free_access_share"]) {
    assert.ok(validate({ ...LOAN, [k]: NaN }).includes(k), k);
  }
  // a failed result is shown again after a language switch, for the same form
  assert.ok(app.includes("else if (failed && lastForm === canonical(readForm())) render(failed);"));
});

test("round 30: each comparison cell, every percentage, input and points never read as an end they are not", () => {
  // reviewer A: deadweights 0.9999999 and 0.8 read 1 and 0.8; 0.9999999999999999 read 1 past the old 12-decimal limit;
  // a renewable share of 99.99% read 100% and 100 points in the step table
  const pp = passport(assess(LOAN));
  assert.deepEqual(compareCells("en", "parameters.deadweight.value", 0.9999999, 0.8, pp, pp, canonical, [0, 1]), ["0.9999999", "0.8"]);
  assert.deepEqual(compareCells("it", "parameters.deadweight.value", 0.9999999, 0.8, pp, pp, canonical, [0, 1]), ["0,9999999", "0,8"]);
  assert.equal(compareCell("en", "parameters.users.value", 1000.0000001, pp, canonical), "1,000.0000001");
  assert.equal(endText("en", 0.9999999999999999, 3, [0, 1]), "0.9999999999999999");
  assert.equal(endText("en", 1e-25, 3, [0, 1]), "1e-25");
  assert.equal(endText("it", 99.99, 1, [0, 100]), "99,99");
  assert.equal(endText("en", 19.99, 1, [0, 20]), "19.99");
  assert.equal(endText("en", 0.4, 3, [0, 1]), "0.4");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("unit === \"percent\" ? `${endText(lang, x, 1, [0, 100, Math.round(x)])}%` : endText(lang, x, 1, [0, 100, Math.round(x)])"));
  // since round 36 through pointsText, the one formatter for points and the regional gap
  assert.ok(app.includes('el("td", { text: pointsText(s.points) })') && app.includes("const pointsText = (v) => endText(lang, v, 1, [0, 100, Math.round(v)]);"));
  assert.ok(!app.includes("num(s.points, 1)"));
  const e2 = Object.values(esgRating({ ...LOAN, renewable_share: 0.9999 }).pillars).flat().find((st) => st.id === "E2");
  assert.ok(e2.points < 100 && e2.input < 100);
});

test("round 30: each rule ties each condition to its own points, in both languages", () => {
  // reviewer A: the number test ignored order, so an Italian "Basso 20, medio 60, alto 100" passed
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const rule = (k) => {
    const m = app.match(new RegExp(`\\n  ${k}: \\{ en: "([^"]+)", it: "([^"]+)" \\},`));
    assert.ok(m, k);
    return { en: m[1], it: m[2] };
  };
  const pts = (loan, id) => Object.values(esgRating({ ...LOAN, ...loan }).pillars).flat().find((st) => st.id === id).points;
  const ties = (k, pairs) => {
    for (const [en, it] of pairs) {
      assert.ok(rule(k).en.includes(en), `${k} en: ${en}`);
      assert.ok(rule(k).it.includes(it), `${k} it: ${it}`);
    }
  };
  const r = (l, id) => pts(l, id);
  ties("energy_class_gain", [[`${r({ energy_class_gain: 1 }, "E1")} points per class`, `${r({ energy_class_gain: 1 }, "E1")} punti per classe`],
    [`at most ${r({ energy_class_gain: 7 }, "E1")}`, `al massimo ${r({ energy_class_gain: 7 }, "E1")}`]]);
  assert.equal(pts({ renewable_share: 0.4 }, "E2"), 40);
  ties("renewable_share", [["renewable share in percent", "quota rinnovabile in percentuale"]]);
  ties("land_use", [[`reuse ${r({ purpose: "renovation" }, "E3")}`, `riuso ${r({ purpose: "renovation" }, "E3")}`],
    [`brownfield land ${r({ purpose: "new_build", brownfield: true }, "E3")}`, `area dismessa ${r({ purpose: "new_build", brownfield: true }, "E3")}`],
    [`greenfield land ${r({ purpose: "new_build", brownfield: false }, "E3")}`, `suolo libero ${r({ purpose: "new_build", brownfield: false }, "E3")}`]]);
  ties("climate_risk", [[`Low ${r({ climate_risk: "low" }, "E4")}`, `Basso ${r({ climate_risk: "low" }, "E4")}`],
    [`medium ${r({ climate_risk: "medium" }, "E4")}`, `medio ${r({ climate_risk: "medium" }, "E4")}`],
    [`high ${r({ climate_risk: "high" }, "E4")}`, `alto ${r({ climate_risk: "high" }, "E4")}`]]);
  ties("users_per_100k", [[`n = 500 scores ${Math.round(r({ users: 500, project_cost: 100000 }, "S1"))}`, `n = 500 vale ${Math.round(r({ users: 500, project_cost: 100000 }, "S1"))}`]]);
  // the gap: 100 at the region with the lowest rate in the loan's sector, 0 at the highest
  for (const sec of ["sport", "culture"]) {
    const lo = REGIONS.reduce((a, b) => (b.rate[sec] < a.rate[sec] ? b : a)), hi = REGIONS.reduce((a, b) => (b.rate[sec] > a.rate[sec] ? b : a));
    assert.equal(lo.need[sec], 100);
    assert.equal(hi.need[sec], 0);
  }
  ties("regional_need", [["100 at the region with the lowest rate", "100 nella regione con il tasso più basso"], ["0 at the highest", "0 in quella con il più alto"]]);
  const none = { accessible_beyond_minimum: false, free_access_share: 0, youth_or_senior_programme: false };
  ties("inclusion", [[`${r({ ...none, accessible_beyond_minimum: true }, "S3")} if accessible`, `${r({ ...none, accessible_beyond_minimum: true }, "S3")} se accessibile`],
    [`plus ${r({ ...none, free_access_share: 1 }, "S3")} ×`, `più ${r({ ...none, free_access_share: 1 }, "S3")} ×`],
    [`plus ${r({ ...none, youth_or_senior_programme: true }, "S3")} for a programme`, `più ${r({ ...none, youth_or_senior_programme: true }, "S3")} per un programma`]]);
  ties("inner_area", [[`${r({ inner_area: true }, "S4")} in an inner area`, `${r({ inner_area: true }, "S4")} in un'area interna`], [`${r({ inner_area: false }, "S4")} elsewhere`, `${r({ inner_area: false }, "S4")} altrove`]]);
  ties("borrower_transparency", [[`university ${r({ borrower: "comune" }, "G1")}`, `università ${r({ borrower: "comune" }, "G1")}`], [`other borrowers ${r({ borrower: "sports_association" }, "G1")}`, `altri beneficiari ${r({ borrower: "sports_association" }, "G1")}`]]);
  ties("monitoring_plan", [[`${r({ monitoring_plan: true }, "G2")} with a monitoring plan`, `${r({ monitoring_plan: true }, "G2")} con un piano di monitoraggio`], [`${r({ monitoring_plan: false }, "G2")} without`, `${r({ monitoring_plan: false }, "G2")} senza`]]);
  ties("audited_accounts", [[`${r({ audited_accounts: true }, "G3")} with audited accounts`, `${r({ audited_accounts: true }, "G3")} con bilanci certificati`], [`${r({ audited_accounts: false }, "G3")} without`, `${r({ audited_accounts: false }, "G3")} senza`]]);
  ties("community_consulted", [[`${r({ community_consulted: true }, "G4")} if the community was consulted`, `${r({ community_consulted: true }, "G4")} se la comunità è stata consultata`], [`${r({ community_consulted: false }, "G4")} if not`, `${r({ community_consulted: false }, "G4")} se no`]]);
});

test("round 31: no rounding boundary shows an end, S1 keeps its input, the gross value rounds once, the S1 formula is pinned", () => {
  // reviewer A: 0.999995 read 1 and 100%, 0.99999995 read 1 in the comparison, 0.1999995 read 0.2; S1 showed input 0
  // beside 0.6 points; EUR 10.49776 read EUR 11 in the chart and EUR 10 in the step table; log10(1 - n) in Italian passed
  assert.equal(endText("en", 0.999995, 3, [0, 1]), "0.999995");
  assert.equal(endText("it", 0.999995, 3, [0, 1]), "0,999995");
  assert.equal(endText("en", 99.9995, 1, [0, 100]), "99.9995");
  assert.equal(endText("en", 19.99995, 1, [0, 20]), "19.99995");
  assert.equal(compareCell("en", "parameters.deadweight.value", 0.99999995, null, canonical, [0, 1]), "0.99999995");
  const s1 = Object.values(esgRating({ ...LOAN, users: 1, project_cost: 2500000 }).pillars).flat().find((st) => st.id === "S1");
  assert.equal(s1.input, 0.04);
  assert.ok(s1.points > 0);
  assert.equal(endText("en", s1.input, 1, [Math.round(s1.input)]), "0.04");
  const a = assess({ ...LOAN, users: 0, co2_avoided_t: 0.05047 });
  assert.equal(a.waterfall.find((st) => st.id === "gross").value, a.sroi.gross);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("${num(result.loan.co2_avoided_t ?? 0, 6)} t × "));
  const m = app.match(/\n  users_per_100k: \{ en: "([^"]+)", it: "([^"]+)" \},/);
  assert.ok(m[1].startsWith("100 × log10(1 + n) / log10(501) for n participants per EUR 100,000, at most 100"));
  assert.ok(m[2].startsWith("100 × log10(1 + n) / log10(501) per n partecipanti per 100.000 EUR, al massimo 100"));
  // and the engine computes what the rule says
  for (const n of [0, 10, 250, 500, 900]) {
    const pts = Object.values(esgRating({ ...LOAN, users: n, project_cost: 100000 }).pillars).flat().find((st) => st.id === "S1").points;
    assert.ok(Math.abs(pts - Math.min(100, (100 * Math.log10(1 + n)) / Math.log10(501))) < 1e-9, String(n));
  }
});

test("round 32: present value rounds once, S3 reads alike, bars keep raw ends, the rating says it is compensatory", () => {
  // reviewer A: PV EUR 0.4966 read EUR 0 in the chart and EUR 1 in the step table; S3 read 39.96 beside 40 points; a bar
  // from 0.999 to 1.001 had zero width; the method pages did not say strong pillars offset weak ones
  const a = assess({ ...LOAN, users: 0, operating_cost: 0, co2_avoided_t: 0.00025 });
  assert.equal(a.waterfall.find((st) => st.id === "pv").value, a.sroi.presentValue);
  assert.ok(a.sroi.presentValue > 0.49 && a.sroi.presentValue < 0.5);
  const s3 = Object.values(esgRating({ ...LOAN, accessible_beyond_minimum: false, youth_or_senior_programme: false, free_access_share: 0.999 }).pillars).flat().find((st) => st.id === "S3");
  assert.equal(endText("en", s3.input, 1, [0, 100, Math.round(s3.input)]), endText("en", s3.points, 1, [0, 100, Math.round(s3.points)]));
  assert.equal(endText("it", s3.points, 1, [0, 100, Math.round(s3.points)]), "39,96");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("endText(lang, x, 1, [0, 100, Math.round(x)])") && app.includes("text: pointsText(s.points)") && app.includes("const pointsText = (v) => endText(lang, v, 1, [0, 100, Math.round(v)]);"));
  assert.ok(app.includes("const lo = r.lowest_raw, hi = r.highest_raw;") && app.includes("rows.map((r) => r.highest_raw)"));
  const b = assess({ ...PAGE, amount: 1000, project_cost: 3572720.01, operating_cost: 0, co2_avoided_t: 7.1941 });
  const row = b.sensitivity.find((r) => r.param === "carbon_deadweight");
  assert.ok(row.lowest_raw < 1 && row.highest_raw > 1, `${row.lowest_raw} ${row.highest_raw}`);
  for (const [page, words] of [["method.en.html", "The rating is compensatory"], ["method.it.html", "Il rating è compensativo"]]) {
    assert.ok(readFileSync(new URL(`../${page}`, import.meta.url), "utf8").includes(words), page);
  }
});

test("round 33: the undiscounted total, E2's input and points, the central marks and the unrounded inputs", () => {
  // reviewer A (HIGH): 40.89 t a year at a zero discount rate read EUR 102,062 before discounting and EUR 102,061 after
  const a = assess({ ...LOAN, users: 0, operating_cost: 0, co2_avoided_t: 40.89 }, withOverrides(PARAMS, { discount_rate: 0 }));
  const w = Object.fromEntries(a.waterfall.map((x) => [x.id, x.value]));
  assert.ok(Math.abs(w.over_years - w.pv) < 1e-6, `${w.over_years} ${w.pv}`);
  // E2 at 39.96%: input and points read alike
  const e2 = Object.values(esgRating({ ...LOAN, renewable_share: 0.3996 }).pillars).flat().find((st) => st.id === "E2");
  assert.equal(`${endText("en", e2.input, 1, [0, 100, Math.round(e2.input)])}%`, `${endText("en", e2.points, 1, [0, 100, Math.round(e2.points)])}%`);
  // the central tick and the range mark sit at the unrounded ratio
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('class: "tick base", style: `left:${pos(result.break_even.base)}`') && app.includes('class: "mark", style: `left:${pos(result.break_even.base)}`'));
  assert.ok(!app.includes("pos(result.sroi.ratio)") && !app.includes("pos(sroi.ratio)"));
  // running cost and inputs are the engine's own values, unrounded
  const loan = { ...LOAN, operating_cost: 12345.678 };
  const r = assess(loan), raw = sroi(loan, centralValues(loan));
  assert.equal(r.sroi.runningPV, raw.runningPV);
  assert.equal(r.sroi.inputs, raw.inputs);
  assert.equal(r.sroi.presentValue, raw.presentValue);
  assert.ok(raw.runningPV !== Math.round(raw.runningPV * 100) / 100);
});

test("round 34: the ESG total is rounded once, chart positions use unrounded values, inputs add up independently", () => {
  // reviewer A (HIGH): the page default with 42 users weighs 64.9406872115, which is 64.9 and C; rounding the pillars
  // first gave 65 and B
  const r = esgRating({ ...PAGE, users: 42 });
  const raw = (k) => r.pillars[k].reduce((a, st) => a + st.points * st.weight, 0);
  const exact = raw("E") * WEIGHTS.E + raw("S") * WEIGHTS.S + raw("G") * WEIGHTS.G;
  // 64.9378... since round 35, when the regional gap stopped being rounded before weighting
  assert.ok(Math.abs(exact - 64.9378283006) < 1e-6, String(exact));
  assert.equal(r.total, 64.9);
  assert.equal(r.grade, "C");
  // every chart position and scale takes the unrounded ratio or range ends
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  for (const s of ["Math.max(range.p90_raw, result.break_even.base, 1.05)", "left:${pos(range.p10_raw)};width:calc(${pos(range.p90_raw)} - ${pos(range.p10_raw)})",
    "results.map((r) => r.break_even.base), 1.2)", "cy: y(r.break_even.base)", "rows.map((r) => r.highest_raw), result.break_even.base, 1.2)"]) assert.ok(app.includes(s), s);
  assert.ok(!/pos\(range\.p(10|90)\)/.test(app) && !app.includes("y(r.sroi.ratio)") && !app.includes("r.sroi.ratio), 1.2"));
  const a = assess(LOAN);
  assert.ok(a.range.p10_raw <= a.range.p50_raw && a.range.p50_raw <= a.range.p90_raw);
  assert.ok(Math.abs(a.range.p10 - a.range.p10_raw) <= 0.005 + 1e-12);
  // inputs: project cost plus the running cost discounted year by year, computed here on its own
  const loan = { ...LOAN, operating_cost: 12345.678 };
  const p = centralValues(loan), v = sroi(loan, p);
  let running = 0;
  for (let t = 1; t <= v.years; t += 1) running += loan.operating_cost / (1 + p.discount_rate) ** t;
  assert.ok(Math.abs(v.runningPV - running) < 1e-6);
  assert.ok(Math.abs(assess(loan).sroi.inputs - (loan.project_cost + running)) < 1e-6);
});

test("round 35: the regional gap is weighted and plotted unrounded, and the raw range ends are the range's own", () => {
  // the gap worked out here from the printed rates, not from the stored value
  const gap = (sec, id) => {
    const rates = REGIONS.map((g) => g.rate[sec]);
    const hi = Math.max(...rates), lo = Math.min(...rates);
    return (100 * (hi - REGIONS.find((g) => g.id === id).rate[sec])) / (hi - lo);
  };
  const by = (id) => REGIONS.find((g) => g.id === id);
  assert.ok(Math.abs(by("umbria").need.sport - (100 * (53.2 - 39.3)) / (53.2 - 22.9)) < 1e-12);
  assert.ok(Math.abs(by("campania").need.culture - (100 * (46.0 - 31.8)) / (46.0 - 24.9)) < 1e-12);
  for (const sec of ["sport", "culture"]) for (const g of REGIONS) assert.ok(Math.abs(g.need[sec] - gap(sec, g.id)) < 1e-12, `${g.id} ${sec}`);
  // the S2 step carries the gap itself, not 45.9
  const s2 = esgRating(PAGE).pillars.S.find((st) => st.id === "S2");
  assert.equal(s2.points, by("umbria").need.sport);
  assert.notEqual(s2.points, 45.9);
  // reviewer A's case: 42 users and 20.25% free access weigh to 64.949..., so 64.9 and C, where the rounded gap gave 65 and B
  const r = esgRating({ ...PAGE, users: 42, free_access_share: 0.2025 });
  const raw = (k) => r.pillars[k].reduce((a, st) => a + st.points * st.weight, 0);
  const exact = raw("E") * WEIGHTS.E + raw("S") * WEIGHTS.S + raw("G") * WEIGHTS.G;
  assert.ok(Math.abs(exact - 64.9490783006) < 1e-6, String(exact));
  assert.equal(r.total, 64.9);
  assert.equal(r.grade, "C");
  // the scatter places each loan at the stored gap; only the regional table rounds it, for display
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("const need = REGIONS.find((g) => g.id === r.loan.region).need[r.loan.sector];") && app.includes("cx: x(need)"));
  assert.ok(app.includes("pointsText(r.need.sport)") && app.includes("pointsText(r.need.culture)"));
  const regions = readFileSync(new URL("../js/regions.js", import.meta.url), "utf8");
  assert.ok(!/Math\.round/.test(regions));
  // the raw range ends equal the range's own unrounded percentiles exactly, for the default loan and one near 1.0
  for (const loan of [LOAN, { ...PAGE, users: 300 }]) {
    const a = assess(loan), own = sroiRange(loan);
    assert.equal(a.range.p10_raw, own.p10);
    assert.equal(a.range.p50_raw, own.p50);
    assert.equal(a.range.p90_raw, own.p90);
  }
});

test("local review of round 35: the passport's unrounded values use products, not powers, so every browser replays them", () => {
  // ** may differ in the last digit between browsers; products of the same two numbers do not
  const engine = readFileSync(new URL("../js/engine.js", import.meta.url), "utf8");
  const powers = engine.split("\n").filter((l) => l.includes("**") && !l.trim().startsWith("//"));
  // the one other power is on whole BigInt numbers, which is exact in every engine (round 36)
  assert.deepEqual(powers.map((l) => l.trim()), ["const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;", "return Number(`${BigInt(i + f) * BigInt(c) + BigInt(plus) * 10n ** BigInt(scale)}e${-scale}`);"]);
  // the yearly values follow the product rule exactly
  const loan = { ...LOAN, operating_cost: 12345.678 };
  const p = centralValues(loan), v = sroi(loan, p);
  let pv = 0, running = 0, kept = 1, factor = 1;
  for (let t = 1; t <= v.years; t += 1) {
    const value = v.peopleNet * kept + v.carbonNet;
    factor *= 1 + p.discount_rate;
    kept *= 1 - p.drop_off;
    pv += value / factor;
    running += loan.operating_cost / factor;
  }
  assert.equal(v.presentValue, pv);
  assert.equal(v.runningPV, running);
  // and the passport of a fresh assessment replays
  assert.equal(replays(passport(assess(loan))), true);
});

test("round 36: shares times 100 or 40 carry no float noise, the gap reads the same in both tables, raw bar ends are the sensitivity's own", () => {
  // every share with up to four decimals gives its percentage exactly, where share * 100 was off for 2,515 of 10,001
  for (let k = 0; k <= 10000; k += 1) {
    assert.equal(decimalTimes(Number(`${k}e-4`), 100), Number(`${k}e-2`));
    assert.equal(decimalTimes(Number(`${k}e-4`), 40), Number(`${k * 40}e-4`));
  }
  // a share just under 1 keeps every digit, so it never reads 100
  assert.equal(decimalTimes(0.9999999999999999, 100), 99.99999999999999);
  assert.equal(decimalTimes(1e-7, 100), 0.00001);
  assert.equal(decimalTimes(0.0274, 40, 60), 61.096);
  assert.equal(decimalTimes(-0.05, 40, 60), 58);
  for (let k = 0; k <= 10000; k += 1) assert.equal(decimalTimes(Number(`${k}e-4`), 40, 60), Number(`${k * 40 + 600000}e-4`));
  // reviewer B's cases: 28% renewables read 28 as input and points, in both languages
  for (const share of [0.28, 0.56, 0.14, 0.55, 0.07, 0.29, 0.57, 0.58]) {
    const e2 = esgRating({ ...LOAN, renewable_share: share }).pillars.E.find((st) => st.id === "E2");
    assert.equal(e2.points, Number(`${Math.round(share * 100)}`));
    assert.equal(e2.input, e2.points);
    for (const lang of ["en", "it"]) assert.equal(endText(lang, e2.points, 1, [0, 100, Math.round(e2.points)]), String(Math.round(share * 100)));
  }
  const s3 = esgRating({ ...LOAN, free_access_share: 0.2025 }).pillars.S.find((st) => st.id === "S3");
  assert.equal(s3.points, 40 + 8.1 + 20);
  // S3's points are the exact decimal sum; share * 40 gave 60.903999999999996 for 2.26% (one decimal on the page hides
  // it, so this pins the value itself)
  for (const [share, points] of [[0.0226, 60.904], [0.0274, 61.096], [0.0319, 61.276]]) {
    assert.equal(esgRating({ ...LOAN, free_access_share: share }).pillars.S.find((st) => st.id === "S3").points, points);
  }
  // reviewer A: the gap reads 63.03 in the step table and the regional table alike, through one formatter
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("const pointsText = (v) => endText(lang, v, 1, [0, 100, Math.round(v)]);"));
  assert.ok(app.includes("text: pointsText(s.points)") && app.includes("text: pointsText(r.need.sport)") && app.includes("text: pointsText(r.need.culture)"));
  assert.ok(!/num\(r\.need\./.test(app));
  const abruzzo = REGIONS.find((g) => g.id === "abruzzo").need.culture;
  assert.equal(endText("en", abruzzo, 1, [0, 100, Math.round(abruzzo)]), "63.03");
  assert.equal(endText("it", abruzzo, 1, [0, 100, Math.round(abruzzo)]), "63,03");
  // reviewer A: each bar's raw ends equal the sensitivity's own unrounded ends, row by row
  for (const loan of [LOAN, { ...PAGE, users: 300 }]) {
    const a = assess(loan), own = sensitivity(loan).rows;
    assert.equal(a.sensitivity.length, own.length);
    for (const row of a.sensitivity) {
      const o = own.find((x) => x.param === row.param);
      assert.equal(row.lowest_raw, o.lowest);
      assert.equal(row.highest_raw, o.highest);
    }
  }
  // the users count is said to sit inside both the rating and the return, on both method pages
  assert.ok(readFileSync(new URL("../method.en.html", import.meta.url), "utf8").includes("The same users count enters both S1 and SROI"));
  assert.ok(readFileSync(new URL("../method.it.html", import.meta.url), "utf8").includes("Lo stesso numero di utenti entra sia in S1 sia nello SROI"));
});

test("round 37: a whole density reads whole, and a share never reads as a whole percent it is not", () => {
  // reviewer A: users / (cost / 1e5) divided twice, so 42 users on EUR 35,000 gave 120.00000000000001 and the step
  // table showed every digit; a reviewer deadweight of 0.8004 read 80% on the slider and 0.8 in the formula
  const s1 = (users, project_cost) => Object.values(esgRating({ ...LOAN, amount: project_cost, users, project_cost }).pillars).flat().find((st) => st.id === "S1").input;
  for (const [u, c, n] of [[42, 35000, 120], [7, 14000, 50], [42, 28000, 150], [99, 55000, 180], [7, 70000, 10]]) {
    assert.equal(s1(u, c), n, `${u} on ${c}`);
    for (const l of ["en", "it"]) assert.equal(endText(l, s1(u, c), 1, [0, 100, Math.round(s1(u, c))]), String(n), `${u} on ${c} ${l}`);
  }
  assert.equal(percentText("en", 80.04, [0, 100]), "80.04");
  assert.equal(percentText("it", 80.04, [0, 100]), "80,04");
  assert.equal(percentText("en", 98.96, [0, 99]), "98.96");
  assert.equal(percentText("en", 28, [0, 100]), "28");
  assert.equal(percentText("en", 3.5, [0, 20]), "3.5");
  assert.equal(shareText("en", 0.8004), "0.8004");
  assert.equal(shareText("it", 0.8004), "0,8004");
  assert.equal(shareText("en", 0.9999), "0.9999");
  assert.equal(shareText("en", 0.8), "0.8");
  assert.equal(shareText("en", 0.28), "0.28");
  // the page shows a share through these two, from its decimal digits, so 0.28 is 28 and not 28.000000000000004
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("const pct = (k, v) => percentText(lang, decimalTimes(v, 100), pctEnds(k));"));
  assert.ok(app.includes("const share = (v) => shareText(lang, v);"));
  // an overstated count can raise both, not always: S1 stops at 100 points and SROI counts no users at full deadweight
  assert.ok(readFileSync(new URL("../method.en.html", import.meta.url), "utf8").includes("so an overstated count can raise both the rating and the return;"));
  assert.ok(readFileSync(new URL("../method.it.html", import.meta.url), "utf8").includes("quindi un numero sovrastimato può alzare sia il rating sia il ritorno;"));
});
