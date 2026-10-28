# Impact Lens (prototype)

A working prototype. One loan request goes in: purpose, sector, borrower type, region, amount, term and a few project facts. Out come an ex ante ESG rating and a forecast social return on investment (SROI), with every step shown. A portfolio view runs the same method over a small synthetic loan book. English and Italian.

Public methods and synthetic data only. Not a credit decision, and not a copy or estimate of any lender's own platform.

## What it shows
- **SROI step by step**: people's value takes deadweight, displacement, attribution and a yearly drop-off; the avoided-carbon value takes its own deadweight (central 0) and attribution, and a new facility counts none. The central result counts the benefit over the facility's life, a lifetime scenario; where the benefit period is longer, the card also shows SROI with benefits counted for only 1 year and 5 years, divided by the same inputs as the full period. All are discounted and divided by all inputs: the project cost plus the running costs the project adds (never by the loan alone). The ratio is a partial, illustrative benefit-cost scenario, not a full SROI. Every money value is in 2024 euros.
- **An assumption range**, not one number: 2,000 seeded draws over the ranged assumptions, the benefit period included, 10th to 90th percentile. It shows sensitivity to assumptions, not statistical confidence.
- **What would change the answer**: for each assumption, each value at which a fine scan finds SROI crossing 1.0 (a benefit period counts whole years), each marked inside or outside the stated range, and for users the number needed for 1.0. A crossing is inside when the range holds values on both sides of it; a ratio of exactly 1.0 counts as at or above 1.0, in the list and the verdict alike. A ratio that only grazes 1.0 between scan steps can be missed, so the list is not proof that no other value crosses.
- **Sensitivity**: each assumption alone across its whole range, from the lowest to the highest SROI seen, widest first.
- **Reviewer sliders**: change any assumption; the change is recorded beside the method's value.
- **A passport**: every input, value, unit, source, status and result as canonical JSON with its SHA-256 fingerprint. The page reruns a passport and says whether its results follow from its inputs (a consistency check, not proof of who made it), and compares two passports field by field.
- **The regional participation gap beside return, never inside it**: indicator S2 uses the region's sport practice or cultural participation rate from ISTAT, and the portfolio plots each loan by gap and by return.

## Where the numbers come from
Every value in `js/params.js` and `js/regions.js` carries its source and a status, shown in the page's method table:
- **cited**: checked at source. Social discount rate (European Commission, Economic Appraisal Vademecum 2021-2027) and carbon value (EIB Climate Bank Roadmap, Table A6, uprated from 2016 to 2024 euros by the euro area HICP).
- **transferred**: checked at source but measured in the UK, so it shows an order of magnitude, not an Italian value. Value of an active adult (Sport England, 2023-24) and of regular cultural engagement (Frontier Economics for DCMS, 2024, Table 3), converted at 2024 purchasing power parity (World Bank).
- **derived**: the regional participation gap, scaled from ISTAT rates (CC BY 4.0).
- **illustrative**: deadweight (people and carbon), displacement, attribution, drop-off and benefit periods, each with a range. No public source sets these for a given project; they are placeholders with stated ranges.
- The ESG weights and bands are this prototype's own, published so they can be challenged.

## Run
A static page with no server and no build step. Serve the folder with any static web server, for example `python3 -m http.server`, then open http://127.0.0.1:8000/. Add `?lang=it` for Italian.

## Test
`node --test test/engine.test.js` (Node 20 or later) checks the engine: the SROI arithmetic by hand, the waterfall, sensitivity, break-even, reviewer overrides, canonical passports, replay of exact and altered passports, the two passport slots of the compare panel (slow reads and hashes, a cancelled picker, a file that is not a passport), and the regional participation gap.

## Files
- `js/engine.js`: the method, as pure functions. A loan may also carry `horizon_years`, a shorter period the lender wants to count; the page does not ask for it, but a passport may set it. Unlike the card's 1-year and 5-year ratios, it shortens the whole period, running cost included.
- `js/compare.js`: the two passport slots of the compare panel, apart from the page so their rules can be tested.
- `js/params.js`: every number the method uses, with its source, note and status.
- `js/regions.js`: the 20 regions with their ISTAT rates.
- `js/synthetic.js`: the seeded synthetic loan book.
- `js/app.js`, `js/i18n.js`, `index.html`, `css/style.css`, `method.en.html`, `method.it.html`: the page.
