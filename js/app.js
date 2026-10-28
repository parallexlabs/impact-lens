// The page: a loan form, the assessment with every step, a synthetic portfolio and the method.
import { assess, decimalTimes, withOverrides, passport, canonical, diffPassports, replays, domainOf, rangeNote, verdictKey, placeKey, ratioShown, PURPOSES, SECTORS, BORROWERS } from "./engine.js";
import { PARAMS, WEIGHTS, WEIGHTS_STATUS, BANDS, METHOD_VERSION } from "./params.js";
import { REGIONS, REGION_SOURCES } from "./regions.js";
import { syntheticBook, BOOK_SEED } from "./synthetic.js";
import { t, crossingShown, ratioWords, ratioPerEuro, ratioExact, rangeEnds, barEnds, compareCells, digitsNearEnds, endText, percentText, shareText } from "./i18n.js";
import { slotsPerResult, pointerState, holdHeight } from "./compare.js";

let lang = new URLSearchParams(location.search).get("lang") === "it" ? "it" : "en";
let last = null;
let lastForm = null;  // the form as it was when `last` was assessed, so a language switch never shows a stale result
let failed = null;  // the last failed assessment, so a language switch shows its problems again in the new language
let nameTurn = 0;  // the latest reviewer name change, so an earlier name hashed later never shows
const pointer = pointerState(window);  // whether a pointer is pressed now, for the comparison box's height hold
let opened = null;  // the synthetic loan last opened from the portfolio, kept as provenance while the form matches it
let overrides = {};
let reviewer = "";
// the compare panel's slots, kept outside the panel so a language switch, which rebuilds it, keeps both passports
// (round 14, reviewer B); and whether the panel is open
const compareSlots = slotsPerResult((pp) => sha256(canonical(pp)));
let compareOpen = false;

const INDICATORS = {
  E1: { en: "Energy classes gained (new facility: classes above the legal minimum)", it: "Classi energetiche guadagnate (nuovo impianto: classi oltre il minimo di legge)" },
  E2: { en: "Renewable share", it: "Quota rinnovabile" },
  E3: { en: "Land use", it: "Uso del suolo" },
  E4: { en: "Physical climate risk", it: "Rischio climatico fisico" },
  S1: { en: "Participants entered per EUR 100,000 of cost (only the adults the values cover)", it: "Partecipanti inseriti per 100.000 EUR di costo (solo gli adulti coperti dai valori)" },
  S2: { en: "Regional participation gap", it: "Divario regionale di partecipazione" },
  S3: { en: "Inclusion", it: "Inclusione" },
  S4: { en: "Inner area", it: "Area interna" },
  G1: { en: "Borrower transparency duties", it: "Obblighi di trasparenza del beneficiario" },
  G2: { en: "Monitoring plan", it: "Piano di monitoraggio" },
  G3: { en: "Audited accounts", it: "Bilanci certificati" },
  G4: { en: "Community consulted", it: "Comunità consultata" },
};

// Each indicator's scoring rule as the engine applies it, shown beside its points (round 28, reviewer A: the step
// table showed input and points but not the formula between them).
const RULES = {
  energy_class_gain: { en: "20 points per class gained, at most 100", it: "20 punti per classe guadagnata, al massimo 100" },
  renewable_share: { en: "The renewable share in percent", it: "La quota rinnovabile in percentuale" },
  land_use: { en: "Renovation or reuse 100; new build on brownfield land 70, on greenfield land 20", it: "Ristrutturazione o riuso 100; nuova costruzione su area dismessa 70, su suolo libero 20" },
  climate_risk: { en: "Low 100, medium 60, high 20; medium when not given", it: "Basso 100, medio 60, alto 20; medio se non indicato" },
  users_per_100k: { en: "100 × log10(1 + n) / log10(501) for n participants per EUR 100,000, at most 100 (n = 500 scores 100)", it: "100 × log10(1 + n) / log10(501) per n partecipanti per 100.000 EUR, al massimo 100 (n = 500 vale 100)" },
  regional_need: { en: "100 at the region with the lowest rate in the loan's sector, 0 at the highest, in proportion between", it: "100 nella regione con il tasso più basso nel settore del finanziamento, 0 in quella con il più alto, in proporzione tra i due" },
  inclusion: { en: "40 if accessible beyond the legal minimum, plus 40 × the share of hours free or at reduced price, plus 20 for a programme for young or older people", it: "40 se accessibile oltre il minimo di legge, più 40 × la quota di ore gratuite o a prezzo ridotto, più 20 per un programma per giovani o anziani" },
  inner_area: { en: "100 in an inner area, 40 elsewhere", it: "100 in un'area interna, 40 altrove" },
  borrower_transparency: { en: "A comune, a region or province, or a school or university 80; other borrowers 50", it: "Un comune, una regione o provincia, oppure una scuola o università 80; altri beneficiari 50" },
  monitoring_plan: { en: "100 with a monitoring plan, 0 without", it: "100 con un piano di monitoraggio, 0 senza" },
  audited_accounts: { en: "100 with audited accounts, 30 without", it: "100 con bilanci certificati, 30 senza" },
  community_consulted: { en: "100 if the community was consulted, 40 if not", it: "100 se la comunità è stata consultata, 40 se no" },
};

const DEFAULT = {
  sector: "sport", purpose: "renovation", borrower: "comune", region: "umbria", amount: 800000, project_cost: 1000000,
  term: 15, users: 1200, operating_cost: 20000, co2_avoided_t: 40, energy_class_gain: 3, renewable_share: 0.4, climate_risk: "low",
  brownfield: false, accessible_beyond_minimum: true, free_access_share: 0.2, youth_or_senior_programme: true,
  inner_area: true, monitoring_plan: true, audited_accounts: true, community_consulted: false,
};

// Form fields: [key, kind, options or scale]. Percent fields are shown as 0 to 100 and stored as shares.
const FIELDS = [
  ["sector", "select", SECTORS], ["purpose", "select", PURPOSES], ["borrower", "select", BORROWERS],
  ["region", "region"], ["amount", "number"], ["project_cost", "number"], ["term", "number"], ["users", "number"], ["operating_cost", "number", null, "running"],
  ["co2_avoided_t", "number", null, "co2"], ["energy_class_gain", "number", null, "energy_gain"],
  ["renewable_share", "percent", null, "renewable"], ["climate_risk", "select", ["low", "medium", "high"]],
  ["brownfield", "check"], ["accessible_beyond_minimum", "check", null, "accessible"],
  ["free_access_share", "percent", null, "free_access"], ["youth_or_senior_programme", "check", null, "youth"],
  ["inner_area", "check"], ["monitoring_plan", "check", null, "monitoring"], ["audited_accounts", "check", null, "audited"],
  ["community_consulted", "check", null, "consulted"],
];

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) node.append(kid);
  return node;
};
const eur = (x) => new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-CA", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(x);
const num = (x, d = 2) => new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-CA", { maximumFractionDigits: d }).format(x);
// the central ratio, flagged from the unrounded value the verdict uses (round 24, reviewer B; every spot, round 25)
const ratioText = (result) => ratioWords(lang, result.sroi.ratio, result.sroi.ratio_under);

function buildForm(values) {
  const form = document.getElementById("loan");
  form.replaceChildren();
  for (const [key, kind, options, labelKey] of FIELDS) {
    const id = `f_${key}`;
    const label = t(lang, labelKey ?? key);
    let input;
    if (kind === "select") {
      input = el("select", { id, name: key }, options.map((o) => el("option", { value: o, text: t(lang, o), selected: values[key] === o })));
    } else if (kind === "region") {
      input = el("select", { id, name: key }, REGIONS.map((r) => el("option", { value: r.id, text: r.name, selected: values[key] === r.id })));
    } else if (kind === "check") {
      input = el("input", { id, name: key, type: "checkbox", checked: Boolean(values[key]) });
      form.append(el("label", { class: "check", for: id }, input, el("span", { text: label })));
      continue;
    } else {
      // an absent value stays an empty field, never 0
      const shown = values[key] == null ? "" : kind === "percent" ? Number((values[key] * 100).toFixed(4)) : values[key];
      input = el("input", { id, name: key, type: "number", inputmode: "decimal", min: "0", step: "any", value: shown, "data-kind": kind });
    }
    form.append(el("label", { for: id }, el("span", { text: label }), input));
  }
  form.append(el("button", { type: "submit", class: "primary", text: t(lang, "assess") }));
}

function readForm() {
  const loan = {};
  for (const [key, kind] of FIELDS) {
    const input = document.getElementById(`f_${key}`);
    if (kind === "check") loan[key] = input.checked;
    // text the browser cannot read as a number gives an empty value; it is refused, never read as left out (local
    // review: "2e" in the running cost counted as no cost)
    else if (input.validity?.badInput) loan[key] = NaN;
    // an empty field is left out, never read as 0: a required one is then refused, an optional one is absent
    else if (input.value.trim() === "") loan[key] = undefined;
    else if (kind === "number") loan[key] = Number(input.value);
    else if (kind === "percent") loan[key] = Number(input.value) / 100;
    else loan[key] = input.value;
  }
  return loan;
}

// SHA-256 in hex; null where the browser offers no hashing (a page served over plain http on a network address)
async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// An indicator's input as the reader sees it: ticks for yes and no, labels for codes, numbers in the page's language.
function shownInput(x, unit) {
  if (typeof x === "boolean") return x ? "✓" : "✗";
  // a percentage or a count never reads as 0 or 100 when it is not (round 30, reviewer A: a renewable share of 99.99% read 100%)
  if (typeof x === "number") return unit === "percent" ? `${endText(lang, x, 1, [0, 100, Math.round(x)])}%` : endText(lang, x, 1, [0, 100, Math.round(x)]);
  return t(lang, x);
}

function stepsTable(pillar, steps) {
  return el("table", {},
    el("caption", { text: `${t(lang, `pillar_${pillar}`)} (${num(WEIGHTS[pillar] * 100, 0)}%)` }),
    el("thead", {}, el("tr", {}, ["indicator", "input", "rule", "points", "weight"].map((k) => el("th", { text: t(lang, k) })))),
    el("tbody", {}, steps.map((s) => el("tr", {},
      el("td", { text: `${s.id} ${INDICATORS[s.id][lang]}` }), el("td", { text: shownInput(s.input, s.input_unit) }),
      el("td", { class: "small", text: RULES[s.rule][lang] }),
      el("td", { text: pointsText(s.points) }), el("td", { text: `${num(s.weight * 100, 0)}%` })))));
}

// Points, the regional gap among them, read the same in the step table and the regional table (round 36, reviewer A:
// Abruzzo's culture gap 63.03 read 63 in the regional table)
const pointsText = (v) => endText(lang, v, 1, [0, 100, Math.round(v)]);

// Shares are shown as percentages; money and counts as they are.
const isShare = (k) => ["share", "per year"].includes(PARAMS[k].unit);
// a percentage gets decimals until it no longer reads as an end of its own slider (drop-off stops at 99%, the discount
// rate at 20%; local review of round 29)
const pctEnds = (k) => domainOf(PARAMS[k]).map((e) => Number((e * 100).toFixed(6)));
const pct = (k, v) => percentText(lang, decimalTimes(v, 100), pctEnds(k));
const showParam = (k, v) => (isShare(k) ? `${pct(k, v)}%` : num(v, 0));
// the range ends of a parameter's value in a passport comparison, so it never reads as an end it is not
const pathEnds = (path) => {
  const m = /^parameters\.([a-z_]+)\.value$/.exec(path);
  return m && PARAMS[m[1]] ? domainOf(PARAMS[m[1]]) : [];
};
// a share in a formula, with enough decimals that 0.9999 never reads 1 (round 29, reviewer A)
const share = (v) => shareText(lang, v);
const withUnit = (k, v) => `${showParam(k, v)}${isShare(k) ? (PARAMS[k].unit === "per year" ? ` ${t(lang, "unit_per_year")}` : "") : ` ${t(lang, `unit_${PARAMS[k].unit}`)}`}`;

// A crossing as the break-even list shows it: rounded, so marked "about" unless it is a whole year.
const crossingText = (k, v) => {
  const c = crossingShown(PARAMS[k].unit, v);
  if (!c.approx) return withUnit(k, v);
  const unit = PARAMS[k].unit === "per year" ? ` ${t(lang, "unit_per_year")}` : c.percent ? "" : ` ${t(lang, `unit_${PARAMS[k].unit}`)}`;
  return `${t(lang, "be_about")} ${num(c.value, c.digits)}${c.percent ? "%" : ""}${unit}`;
};

// Reviewer assumptions: one slider per parameter; a change reruns the assessment and is recorded in the passport.
function assumptionsPanel(result) {
  const keys = Object.keys(PARAMS).filter((k) => PARAMS[k].range || k === "discount_rate");
  const rows = keys.map((k) => {
    const d = PARAMS[k];
    const now = result.parameters[k].value;
    const [min, max] = domainOf(d);  // the engine's own domain, so a slider can only set a value the engine accepts
    // whole years and whole euros; shares move freely
    const step = d.unit === "years" || !isShare(k) ? "1" : "any";
    const id = `a_${k}`;
    const out = el("output", { for: id, text: showParam(k, now) });
    const input = el("input", { id, type: "range", min: String(min), max: String(max), step, value: String(now) });
    input.oninput = () => { out.textContent = showParam(k, Number(input.value)); };
    input.onchange = () => { overrides[k] = Number(input.value); rerun(); };
    const changed = result.parameters[k].status === "reviewer";
    return el("label", { for: id, class: changed ? "changed" : null }, el("span", { text: `${d.label[lang]}${changed ? ` (${t(lang, "reviewer")})` : ""}` }), input, out);
  });
  const reset = el("button", { type: "button", text: t(lang, "reset") });
  reset.onclick = () => { overrides = {}; rerun(); };
  const who = el("input", { id: "reviewer", type: "text", value: reviewer, placeholder: t(lang, "reviewer_name") });
  // the name changes the passport, not the result: only the passport's fingerprint and download change, in place, so
  // loaded files stay, open panels stay open and a button pressed as the name field loses focus still gets its click
  // (round 16, reviewer C); a slot holding this assessment's passport is emptied (round 15, reviewer C); an edited form
  // is assessed as before
  who.onchange = async () => {
    reviewer = who.value.trim();
    if (!(last && lastForm === canonical(readForm()))) { rerun(); return; }
    // the comparison box keeps its height while its slot empties, so the page does not shrink and move a button away
    // from a pointer pressed as the field lost focus (round 16, checked in Chromium); it holds until the pointer is
    // released, and only when focus left by the keyboard for at most five seconds (round 17 and 18, reviewer A)
    const box = document.getElementById("compare-out");
    if (box) holdHeight(box, window, pointer);
    compareSlots.for(last).retire();
    const shown = last, mine = ++nameTurn;
    const record = canonical(passport(shown, reviewer));
    // the download takes the new passport at once, so a click while it is hashing never saves the old name's
    // passport (round 17, reviewer A); the fingerprint line follows when the hash is ready
    const hashing = sha256(record);
    showPassport(record, hashing);
    const fingerprint = await hashing;
    if (mine !== nameTurn || shown !== last) return;  // a later name or a new assessment took over
    showPassport(record, fingerprint);
  };
  return el("details", { class: "panel", open: Object.keys(overrides).length > 0 },
    el("summary", { text: t(lang, "assumptions") }),
    el("p", { class: "small", text: t(lang, "assumptions_note") }),
    el("div", { class: "sliders" }, rows),
    el("div", { class: "row" }, el("label", { for: "reviewer" }, el("span", { text: t(lang, "reviewer_name") }), who), reset));
}

// The adjustment waterfall for one year of value, then the years and discounting in one line.
function waterfallChart(result) {
  const w = Object.fromEntries(result.waterfall.map((s) => [s.id, s.value]));
  const top = Math.max(w.gross, 1);
  let level = w.gross;
  const rows = ["gross", "deadweight", "displacement", "attribution", "net"].map((id) => {
    const v = w[id];
    let left = 0, width = v / top;
    if (id !== "gross" && id !== "net") { level += v; left = level / top; width = -v / top; }
    return el("div", { class: "wf" }, el("span", { class: "wf-label", text: t(lang, `wf_${id}`) }),
      el("span", { class: "wf-track" }, el("span", { class: `wf-bar ${id === "gross" || id === "net" ? "pos" : "neg"}`, style: `left:${left * 100}%;width:${width * 100}%` })),
      el("span", { class: "wf-value", text: eur(v) }));
  });
  return el("div", { class: "chart", role: "img", "aria-label": t(lang, "waterfall") }, rows,
    el("p", { class: "small", text: `${t(lang, "wf_then")} ${eur(w.over_years)} ${t(lang, "over")} ${result.sroi.years} ${t(lang, result.sroi.years === 1 ? "year_one" : "years_short")}; ${t(lang, "wf_pv")} ${eur(w.pv)}.` }));
}

// Sensitivity: each assumption alone at either end of its range, widest first, with the central ratio and the 1.0 line.
function tornadoChart(result) {
  const rows = result.sensitivity.filter((r) => r.moves);
  // the central tick stays on the chart when a reviewer's value puts it past every bar
  const top = Math.max(...rows.map((r) => r.highest_raw), result.break_even.base, 1.2) * 1.05;
  const pos = (x) => `${(x / top) * 100}%`;
  return el("div", { class: "chart", role: "img", "aria-label": t(lang, "sensitivity") },
    rows.map((r) => {
      const lo = r.lowest_raw, hi = r.highest_raw;
      return el("div", { class: "wf" }, el("span", { class: "wf-label", text: PARAMS[r.param].label[lang] }),
        el("span", { class: "wf-track" },
          el("span", { class: "wf-bar tor", style: `left:${pos(lo)};width:calc(${pos(hi)} - ${pos(lo)})` }),
          el("span", { class: "tick base", style: `left:${pos(result.break_even.base)}` }), el("span", { class: "tick one", style: `left:${pos(1)}` })),
        el("span", { class: "wf-value", text: barEnds(lang, r) }));
    }),
    el("p", { class: "small", text: t(lang, "sensitivity_note") }));
}

// What would change our mind: the value of each assumption at which the ratio falls to 1.0.
function breakEvenBlock(result) {
  const b = result.break_even;
  const items = [];
  // the users count is exact, not a scan result, so it stands apart from the list
  const usersLine = b.users_at_one != null
    ? el("p", { text: b.users_at_one === 0 ? t(lang, "be_users_zero")
      : `${t(lang, "be_users")} ${num(b.users_at_one, 0)} (${t(lang, "now")} ${num(result.loan.users, 0)}).` }) : null;
  for (const r of b.rows) {
    // a stated range below 1.0 with no crossing inside it: throughout only when every scanned value is (rangeNote)
    const note = rangeNote(r, b.base);
    if (note) items.push(el("li", { class: "flag",
      text: `${t(lang, note === "all_below" ? "be_range_below" : "be_range_some_below")} ${PARAMS[r.param].label[lang]}.` }));
    if (!r.crossings.length) continue;
    // each crossing carries its own inside or outside mark, so one inside crossing never labels another
    const where = r.crossings.map((c) => `${t(lang, c.direction === "up" ? "be_up" : "be_down")} ${crossingText(r.param, c.value)} (${t(lang, placeKey(c))})`).join("; ");
    items.push(el("li", { class: r.inside_range ? "flag" : null, text: `${PARAMS[r.param].label[lang]}: ${where}.` }));
  }
  return el("div", {}, verdict(b),
    usersLine,
    items.length ? [el("p", { class: "small", text: t(lang, "be_list") }), el("ul", {}, items)] : el("p", { class: "small", text: t(lang, "be_none") }),
    el("p", { class: "small", text: t(lang, "be_scan") }));
}

// The break-even verdict, read from the engine, shown on the result card and above the list.
const verdict = (b) => el("p", { class: b.holds ? "ok" : "warn", text: t(lang, verdictKey(b)) });

let renderToken = 0;
async function render(result) {
  const token = ++renderToken;
  const box = document.getElementById("result");
  box.replaceChildren();
  if (!result.ok) {
    last = null;  // a failed form leaves no earlier result to be shown again
    failed = result;  // but its list of problems is shown again, in the new language, after a language switch
    // each problem by its form label, so a yes or no field reads as the reader sees it
    const label = (p) => t(lang, FIELDS.find(([key]) => key === p)?.[3] ?? p);
    box.append(el("p", { class: "problem", text: `${t(lang, "problems")} ${result.problems.map(label).join(", ")}` }));
    return;
  }
  last = result;
  failed = null;
  const P = result.parameters;
  const { esg, sroi, range } = result;
  const record = canonical(passport(result, reviewer));
  const fingerprint = await sha256(record);
  if (token !== renderToken) return;  // a newer assessment started while this one was hashing
  // the central mark stays on the bar when a reviewer's values put it past the range
  const max = Math.max(range.p90_raw, result.break_even.base, 1.05) * 1.15;
  const pos = (x) => `${Math.min(100, (x / max) * 100)}%`;
  box.append(
    el("h2", { text: t(lang, "result") }),
    el("div", { class: "cards" },
      el("div", { class: `card grade g${esg.grade}` }, el("div", { class: "big", text: esg.grade }),
        el("div", { text: `${t(lang, "rating")}, ${t(lang, "score")} ${num(esg.total, 1)} / 100` })),
      el("div", { class: "card" }, el("div", { class: "big", text: ratioText(result) }),
        el("div", { text: `${t(lang, "card_title")}: ${ratioPerEuro(lang, sroi.ratio, sroi.ratio_under)} ${t(lang, "per_euro")}` }),
        // the 1 and 5 year ratios come before the lifetime period and the range, so the period's weight is read first
        // (round 14, expert point 2)
        result.horizons.length ? el("div", { text: `${result.horizons.map((h) => `${t(lang, "ratio_over")} ${h.years} ${t(lang, h.years === 1 ? "year_one" : "years_short")}: ${ratioWords(lang, h.ratio, h.under)}`).join("; ")} (${t(lang, "against_all_inputs")})` }) : null,
        el("div", { class: "small", text: `${t(lang, "lifetime")} ${sroi.years} ${t(lang, sroi.years === 1 ? "year_one" : "years_short")}. ${t(lang, "sroi_scope")}` }),
        // the period comes from the asset's life, not from evidence on how long outcomes last (round 11, reviewer B)
        el("div", { class: "small warn", text: t(lang, "duration_not_evidenced") }),
        el("div", { class: "range", role: "img", "aria-label": `${t(lang, "sroi_range")}: ${rangeEnds(lang, range)}` },
          el("span", { class: "band", style: `left:${pos(range.p10_raw)};width:calc(${pos(range.p90_raw)} - ${pos(range.p10_raw)})` }),
          el("span", { class: "mark", style: `left:${pos(result.break_even.base)}` }),
          el("span", { class: "one", style: `left:${pos(1)}`, title: lang === "it" ? "1,0" : "1.0" })),
        el("div", { class: "small", text: `${t(lang, "sroi_range")}: ${rangeEnds(lang, range)}, ${t(lang, "median")} ${ratioWords(lang, range.p50, range.under.p50)} (${range.draws} ${t(lang, "draws")}, ${t(lang, "seed")} ${range.seed})` }),
        // the central result outside the band: say why, from the values in use, not from the method's own values
        // (round 14, reviewer B, HIGH)
        range.central_outside ? el("div", { class: "small warn", text: outsideText(result) }) : null,
        verdict(result.break_even))),
  );
  // the engine lists only the value this loan's sector uses, and keeps it when a reviewer's value replaces it
  if (result.transferred.length) {
    const named = (k) => `${PARAMS[k].label[lang]}${P[k].status === "reviewer" ? ` (${t(lang, "transferred_replaced")})` : ""}`;
    box.append(el("p", { class: "warn", text: `${t(lang, "transferred_warning")} ${result.transferred.map(named).join("; ")}.` }));
  }
  for (const c of result.cautions) box.append(el("p", { class: "warn", text: t(lang, `caution_${c}`) }));
  if (result.illustrative.length) {
    box.append(el("p", { class: "warn", text: `${t(lang, "illustrative_warning")} ${result.illustrative.map((k) => PARAMS[k].label[lang]).join("; ")}.` }));
  }
  box.append(assumptionsPanel(result));
  box.append(el("h3", { text: t(lang, "change_mind") }), breakEvenBlock(result));
  box.append(el("h3", { text: t(lang, "waterfall") }), waterfallChart(result));
  box.append(el("h3", { text: t(lang, "sensitivity") }), tornadoChart(result));
  box.append(el("h3", { text: t(lang, "steps") }), ...["E", "S", "G"].map((p) => stepsTable(p, esg.pillars[p])));
  const perUser = result.loan.sector === "sport" ? P.value_per_user_sport.value : P.value_per_user_culture.value;
  box.append(el("h3", { text: t(lang, "sroi_steps") }),
    el("table", {}, el("tbody", {},
      el("tr", {}, el("td", { text: t(lang, "gross") }), el("td", { text: `${eur(sroi.gross)} = ${num(result.loan.users, 0)} × ${eur(perUser)} + ${result.loan.purpose === "new_build" ? `0 (${t(lang, "co2_new_build")})` : `${num(result.loan.co2_avoided_t ?? 0, 6)} t × ${eur(P.carbon_value.value)}`}` })),
      el("tr", {}, el("td", { text: t(lang, "net_people") }), el("td", { text: `${eur(sroi.peopleNet)} = ${eur(sroi.userValue)} × (1 − ${share(P.deadweight.value)}) × (1 − ${share(P.displacement.value)}) × (1 − ${share(P.attribution.value)})` })),
      el("tr", {}, el("td", { text: t(lang, "net_carbon") }), el("td", { text: `${eur(sroi.carbonNet)} = ${eur(sroi.carbonValue)} × (1 − ${share(P.carbon_deadweight.value)}) × (1 − ${share(P.attribution.value)})` })),
      el("tr", {}, el("td", { text: t(lang, "years") }), el("td", { text: `${sroi.years}; ${PARAMS.drop_off.label[lang]} ${pct("drop_off", P.drop_off.value)}% (${t(lang, "people_only")}); ${PARAMS.discount_rate.label[lang]} ${pct("discount_rate", P.discount_rate.value)}%` })),
      el("tr", {}, el("td", { text: t(lang, "pv") }), el("td", { text: eur(sroi.presentValue) })),
      el("tr", {}, el("td", { text: t(lang, "inputs") }), el("td", { text: `${eur(sroi.inputs)} = ${eur(result.loan.project_cost)} + ${eur(sroi.runningPV)}` })),
      el("tr", {}, el("td", { text: t(lang, "ratio") }), el("td", { text: `${ratioExact(lang, result.break_even.base, sroi.ratio, sroi.ratio_under)} = ${eur(sroi.presentValue)} / ${eur(sroi.inputs)}` })))));
  box.append(el("h3", { text: t(lang, "audit") }),
    el("p", { class: "small", text: t(lang, "passport_note") }),
    el("p", { class: "mono", id: "fingerprint" }),
    el("button", { type: "button", id: "download", text: t(lang, "download") }),
    comparePanel(result));
  showPassport(record, fingerprint);
}

// The passport's fingerprint line and download, set for the passport as it now reads. The fingerprint may still be
// hashing (a promise): the line shows an ellipsis and a download waits for the hash of this same record.
function showPassport(record, fingerprint) {
  const line = document.getElementById("fingerprint"), button = document.getElementById("download");
  if (!line || !button) return;
  const pending = fingerprint instanceof Promise;
  line.textContent = `${t(lang, "fingerprint")}: ${pending ? "…" : fingerprint ?? t(lang, "no_hash")}`;
  button.onclick = async () => {
    const fp = await fingerprint;
    const a = el("a", { href: URL.createObjectURL(new Blob([record], { type: "application/json" })), download: `impact-lens-passport-${fp ? fp.slice(0, 12) : "unhashed"}.json` });
    a.click();
  };
}

// Why the central result lies outside the range: each assumption the engine finds drawn one way only, with the side
// its draws go and the way they move the result.
function outsideText(result) {
  const list = result.one_way.map((o) => `${PARAMS[o.param].label[lang]}: ${t(lang, `one_way_${o.draws}`)}, ${t(lang, `one_way_${o.value}`)}${o.together ? `, ${t(lang, "one_way_together")}` : ""}${o.with_others ? `; ${t(lang, "one_way_with_others")} ${t(lang, `one_way_${o.with_others}`)}` : ""}`);
  return `${t(lang, "central_outside")} ${list.length ? `${list.join("; ")}.` : t(lang, "one_way_none")}`;
}

// Two reviewers can disagree: load two passports, see each field where they differ, and check that each replays.
function comparePanel(result) {
  const out = el("div", { id: "compare-out" });
  const inputs = {};
  // drawn at once from what each slot holds, with no wait, so a slot just emptied never shows its old verdict
  const draw = (s) => {
    const parts = [];
    for (const key of ["a", "b"]) {
      const slot = s[key];
      if (!slot) continue;
      const pp = slot.value;
      const ok = replays(pp);
      // the reviewer field is shown only when it is text, so a crafted file cannot break the page
      const who = pp && typeof pp.reviewer === "string" && pp.reviewer ? pp.reviewer : "?";
      parts.push(el("p", { class: ok ? "ok" : "warn",
        text: `${t(lang, `passport_${key}`)}${slot.from === "current" ? ` (${t(lang, "this_assessment")})` : ""}: ${who}, ${slot.fp ? `${slot.fp.slice(0, 16)}…` : t(lang, "no_hash")} ${ok ? t(lang, "replays") : t(lang, "no_replay")}` }));
    }
    if (s.a && s.b) {
      let diff = null;
      try { diff = diffPassports(s.a.value, s.b.value); } catch { diff = null; }  // a file nested too deep to walk
      if (diff) {
        parts.push(diff.length
          ? el("div", { class: "scroll" }, el("table", {}, el("thead", {}, el("tr", {}, ["field", "passport_a", "passport_b"].map((k) => el("th", { text: t(lang, k) })))),
            el("tbody", {}, diff.map((d) => compareCells(lang, d.path, d.a, d.b, s.a.value, s.b.value, canonical, pathEnds(d.path))).map((c, i) => el("tr", {}, el("td", { class: "mono", text: diff[i].path }), el("td", { text: c[0] }), el("td", { text: c[1] }))))))
          : el("p", { class: "ok", text: t(lang, "identical") }));
      }
    }
    // a slot whose file could not be read as a passport: its message shows beside the other slot's verdict
    for (const key of ["a", "b"]) {
      if (s.bad[key]) parts.push(el("p", { class: "problem", text: `${t(lang, `passport_${key}`)}: ${t(lang, "bad_file")}` }));
    }
    out.replaceChildren(...parts);
  };
  // the same slots for the same assessment, so a language switch keeps them; drawn into this panel from now on
  const slots = compareSlots.for(result);
  const picker = (key) => {
    const id = `pp_${key}`;
    const input = el("input", { id, type: "file", accept: "application/json,.json" });
    inputs[key] = input;
    // a box rebuilt by a language switch is empty while its slot keeps the file chosen before, so a cancel in a box
    // that never held a file leaves the slot alone (round 14)
    let picked = false;
    // a cancelled picker empties the file box in some browsers and sends no file: the slot is emptied with it
    input.onchange = () => { picked = true; slots.choose(key, input.files?.[0]).catch(() => {}); };
    input.addEventListener("cancel", () => { if (picked) slots.cancelled(key, input.files?.[0]).catch(() => {}); });
    return el("label", { for: id }, el("span", { text: t(lang, `passport_${key}`) }), input);
  };
  const useCurrent = el("button", { type: "button", text: t(lang, "use_current") });
  useCurrent.onclick = () => {
    if (!last) return;
    // this assessment replaces whatever file A was being read, and the file box is emptied so its name is not shown
    // beside it and the same file can be chosen again
    inputs.a.value = "";
    slots.use("a", JSON.parse(canonical(passport(last, reviewer)))).catch(() => {});
  };
  const panel = el("details", { class: "panel", open: compareOpen }, el("summary", { text: t(lang, "compare") }),
    el("p", { class: "small", text: t(lang, "compare_note") }),
    el("div", { class: "row" }, picker("a"), useCurrent, picker("b")), out);
  panel.addEventListener("toggle", () => { compareOpen = panel.open; });
  compareSlots.drawTo(draw);
  return panel;
}

// The form's loan, with the synthetic loan's id and flag kept while every field still matches the loan opened.
function formLoan() {
  const loan = readForm();
  const same = (a, b) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b);
  if (opened && FIELDS.every(([key]) => same(loan[key], opened[key]))) Object.assign(loan, { id: opened.id, synthetic: true });
  return loan;
}

function rerun() {
  const loan = formLoan();
  lastForm = canonical(readForm());
  render(assess(loan, withOverrides(PARAMS, overrides)));
}

// Need beside return, never inside it: each synthetic loan by regional need (across) and central SROI (up), coloured by rating.
function scatter(results) {
  const W = 640, H = 300, pad = 40;
  const top = Math.max(...results.map((r) => r.break_even.base), 1.2) * 1.1;
  const x = (need) => pad + (need / 100) * (W - 2 * pad);
  const y = (ratio) => H - pad - (ratio / top) * (H - 2 * pad);
  const ns = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "scatter", role: "img", "aria-label": t(lang, "scatter") });
  root.append(svg("line", { x1: pad, x2: W - pad, y1: H - pad, y2: H - pad, class: "axis" }),
    svg("line", { x1: pad, x2: pad, y1: pad / 2, y2: H - pad, class: "axis" }),
    svg("line", { x1: pad, x2: W - pad, y1: y(1), y2: y(1), class: "oneline" }),
    svg("text", { x: W - pad, y: y(1) - 4, "text-anchor": "end", class: "lbl" }, `SROI ${lang === "it" ? "1,0" : "1.0"}`),
    svg("text", { x: W / 2, y: H - 8, "text-anchor": "middle", class: "lbl" }, t(lang, "need_axis")),
    svg("text", { x: 12, y: H / 2, transform: `rotate(-90 12 ${H / 2})`, "text-anchor": "middle", class: "lbl" }, "SROI"));
  for (const r of results) {
    const need = REGIONS.find((g) => g.id === r.loan.region).need[r.loan.sector];
    const dot = svg("circle", { cx: x(need), cy: y(r.break_even.base), r: 6, class: `dot g${r.esg.grade}` });
    dot.append(svg("title", {}, `${r.loan.id}: ${REGIONS.find((g) => g.id === r.loan.region).name}, SROI ${ratioWords(lang, r.sroi.ratio, r.sroi.ratio_under)}, ${r.esg.grade}`));
    root.append(dot);
  }
  return el("div", { class: "chart" }, root, el("p", { class: "small", text: t(lang, "scatter_note") }));
}

function renderPortfolio() {
  const box = document.getElementById("portfolio");
  const results = syntheticBook().map((loan) => assess(loan));
  const counts = Object.fromEntries(BANDS.map((b) => [b.grade, 0]));
  const sectors = { sport: { amount: 0, pv: 0, cost: 0 }, culture: { amount: 0, pv: 0, cost: 0 } };
  for (const r of results) {
    counts[r.esg.grade] += 1;
    const s = sectors[r.loan.sector];
    s.amount += r.loan.amount; s.pv += r.sroi.presentValue; s.cost += r.sroi.inputs;  // all inputs, as in each loan's ratio
  }
  const most = Math.max(...Object.values(counts), 1);
  const bars = el("div", { class: "bars", role: "img", "aria-label": t(lang, "by_grade") },
    Object.entries(counts).map(([g, n]) => el("div", { class: "bar" },
      el("span", { class: `fill g${g}`, style: `height:${(n / most) * 100}%` }), el("b", { text: `${g}: ${n}` }))));
  box.replaceChildren(
    el("p", { class: "synthetic", text: t(lang, "synthetic_label") }),
    el("p", { class: "small", text: `${t(lang, "seed")} ${BOOK_SEED}, ${results.length} ${t(lang, "loans")}, ${t(lang, "method_version")} ${METHOD_VERSION}` }),
    el("h3", { text: t(lang, "by_grade") }), bars,
    el("h3", { text: t(lang, "scatter") }), scatter(results), el("p", { class: "small", text: t(lang, "not_comparable") }),
    el("h3", { text: t(lang, "by_sector") }),
    el("p", { class: "small", text: t(lang, "not_comparable") }),
    el("p", { class: "small", text: t(lang, "sector_sum_note") }),
    el("table", {}, el("thead", {}, el("tr", {}, ["sector", "amount", "inputs_short", "pv", "ratio"].map((k) => el("th", { text: t(lang, k) })))),
      el("tbody", {}, Object.entries(sectors).map(([k, s]) => el("tr", {}, el("td", { text: t(lang, k) }), el("td", { text: eur(s.amount) }),
        el("td", { text: eur(s.cost) }), el("td", { text: eur(s.pv) }), el("td", { text: ratioWords(lang, ratioShown(s.pv / s.cost).value, ratioShown(s.pv / s.cost).under) }))))),
    el("h3", { text: t(lang, "tab_portfolio") }),
    el("div", { class: "scroll" }, el("table", {},
      el("thead", {}, el("tr", {}, ["loan", "sector", "purpose", "region", "amount", "rating", "sroi", "range_short", ""].map((k) => el("th", { text: k ? t(lang, k) : "" })))),
      el("tbody", {}, results.map((r) => el("tr", {},
        el("td", { text: r.loan.id }), el("td", { text: t(lang, r.loan.sector) }), el("td", { text: t(lang, r.loan.purpose) }),
        el("td", { text: REGIONS.find((x) => x.id === r.loan.region).name }), el("td", { text: eur(r.loan.amount) }),
        el("td", { class: `g${r.esg.grade}`, text: `${r.esg.grade} (${num(r.esg.total, 1)})` }), el("td", { text: ratioWords(lang, r.sroi.ratio, r.sroi.ratio_under) }),
        el("td", { text: rangeEnds(lang, r.range) }),
        el("td", {}, el("button", { type: "button", "data-open": r.loan.id, text: t(lang, "open") }))))))));
  box.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = () => {
      const loan = results.find((r) => r.loan.id === b.dataset.open).loan;
      overrides = {};
      opened = loan;
      show("assess"); buildForm(loan); rerun();
    };
  });
}

function renderMethod() {
  const box = document.getElementById("method");
  const status = (s) => el("span", { class: `status ${s}`, text: t(lang, s) });
  box.replaceChildren(
    el("h2", { text: t(lang, "tab_method") }),
    el("div", { id: "method-text" }),
    el("h3", { text: t(lang, "parameter") }),
    el("div", { class: "scroll" }, el("table", {},
      el("thead", {}, el("tr", {}, ["parameter", "value", "range", "source", "status"].map((k) => el("th", { text: t(lang, k) })))),
      el("tbody", {},
        Object.entries(PARAMS).map(([k, d]) => el("tr", {}, el("td", { text: d.label[lang] }), el("td", { text: withUnit(k, d.value) }),
          el("td", { text: d.range ? `${showParam(k, d.range[0])} ${t(lang, "to")} ${showParam(k, d.range[1])}` : "" }),
          el("td", {}, d.source ? el("a", { href: d.source.url, rel: "noopener", text: d.source.title }) : t(lang, "not_cited"),
            d.note ? el("div", { class: "small", text: d.note[lang] }) : null), el("td", {}, status(d.status)))),
        el("tr", {}, el("td", { text: t(lang, "esg_weights") }), el("td", { text: `${num(WEIGHTS.E * 100, 0)}% / ${num(WEIGHTS.S * 100, 0)}% / ${num(WEIGHTS.G * 100, 0)}%` }), el("td"), el("td", { text: t(lang, "own_weights") }), el("td", {}, status(WEIGHTS_STATUS))),
        ["sport", "culture"].map((sec) => el("tr", {}, el("td", { text: `S2 ${INDICATORS.S2[lang]}: ${t(lang, sec)}` }),
          el("td", { text: t(lang, `need_rule_${sec}`) }), el("td", { text: `${num(Math.min(...REGIONS.map((r) => r.rate[sec])), 1)}% ${t(lang, "to")} ${num(Math.max(...REGIONS.map((r) => r.rate[sec])), 1)}%` }),
          el("td", {}, el("a", { href: REGION_SOURCES[sec].url, rel: "noopener", text: REGION_SOURCES[sec].title })), el("td", {}, status("derived")))))),
    el("h3", { text: t(lang, "regions_table") }),
    el("div", { class: "scroll" }, el("table", {},
      el("thead", {}, el("tr", {}, ["region", "rate_sport", "need_sport", "rate_culture", "need_culture"].map((k) => el("th", { text: t(lang, k) })))),
      el("tbody", {}, REGIONS.map((r) => el("tr", {}, el("td", { text: r.name }), el("td", { text: `${num(r.rate.sport, 1)}%` }), el("td", { text: pointsText(r.need.sport) }),
        el("td", { text: `${num(r.rate.culture, 1)}%` }), el("td", { text: pointsText(r.need.culture) })))))),
  ));
  const asked = lang;
  fetch(`method.${asked}.html`).then((r) => (r.ok ? r.text() : "")).then((html) => {
    const target = document.getElementById("method-text");
    if (asked !== lang) return;  // the language changed while this page was loading
    if (target && html) target.innerHTML = html;  // our own static file, shipped with the page
  }).catch(() => {});
}

function show(tab) {
  for (const id of ["assess", "portfolio", "method"]) {
    document.getElementById(id).hidden = id !== tab;
    document.querySelector(`[data-tab="${id}"]`).setAttribute("aria-pressed", String(id === tab));
  }
  if (tab === "portfolio") renderPortfolio();
  if (tab === "method") renderMethod();
}

function paint() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((n) => { n.textContent = t(lang, n.dataset.t); });
  document.getElementById("lang").textContent = t(lang, "language");
  document.title = t(lang, "title");
  const hadForm = Boolean(document.getElementById("f_sector"));
  // the number fields keep what was typed, digit for digit: rebuilding from the read values rounded percentages, so the
  // result was cleared by a language switch alone (round 13, reviewer B)
  const typed = hadForm ? FIELDS.map(([key]) => document.getElementById(`f_${key}`)).filter((n) => n?.type === "number").map((n) => [n.id, n.value]) : [];
  buildForm(hadForm ? readForm() : DEFAULT);
  for (const [id, value] of typed) { const n = document.getElementById(id); if (n) n.value = value; }
  // show the last result again only for the form it was made from; edits not yet assessed clear it
  if (last && lastForm === canonical(readForm())) render(last);
  else if (failed && lastForm === canonical(readForm())) render(failed);
  // a cleared result also retires any assessment still hashing, so it cannot come back after the switch
  else if (hadForm) { last = null; failed = null; renderToken += 1; document.getElementById("result").replaceChildren(); }
  const open = document.querySelector('[aria-pressed="true"]')?.dataset.tab ?? "assess";
  if (open !== "assess") show(open);
}

document.getElementById("lang").onclick = () => { lang = lang === "en" ? "it" : "en"; paint(); };
document.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => show(b.dataset.tab); });
document.getElementById("loan").addEventListener("submit", (e) => { e.preventDefault(); rerun(); });
paint();
rerun();
