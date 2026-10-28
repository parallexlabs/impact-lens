// A small synthetic loan book, made from a fixed seed so every reader sees the same one.
// Every loan here is invented to show the method; none is a real loan or borrower.
import { rng, PURPOSES, BORROWERS } from "./engine.js";
import { REGIONS } from "./regions.js";

export const BOOK_SEED = 20261028;

export function syntheticBook(count = 24, seed = BOOK_SEED) {
  const next = rng(seed);
  const pick = (list) => list[Math.floor(next() * list.length)];
  const loans = [];
  for (let i = 1; i <= count; i += 1) {
    const sector = next() < 0.6 ? "sport" : "culture";
    const purpose = pick(PURPOSES);
    const borrower = sector === "sport"
      ? pick(["comune", "comune", "sports_association", "school_university", "region_province"])
      : pick(["comune", "cultural_body", "cultural_body", "region_province"]);
    const amount = Math.round((150 + next() * 4850) / 10) * 10000;
    const projectCost = Math.round(amount * (1 + next() * 0.4) / 1000) * 1000;
    loans.push({
      id: `SYN-${String(i).padStart(3, "0")}`, synthetic: true, sector, purpose, borrower, region: pick(REGIONS).id,
      amount, project_cost: projectCost, term: pick([10, 15, 20, 25]),
      users: Math.round((projectCost / 1e5) * (40 + next() * 260)),
      energy_class_gain: purpose === "energy" ? 2 + Math.floor(next() * 3) : Math.floor(next() * 2),
      renewable_share: Math.round(next() * 60) / 100, climate_risk: pick(["low", "medium", "medium", "high"]),
      brownfield: next() < 0.5, accessible_beyond_minimum: next() < 0.4, free_access_share: Math.round(next() * 40) / 100,
      youth_or_senior_programme: next() < 0.5, inner_area: next() < 0.3, monitoring_plan: next() < 0.6,
      audited_accounts: next() < 0.7, community_consulted: next() < 0.4,
      co2_avoided_t: purpose === "energy" ? Math.round(10 + next() * 90) : Math.round(next() * 15),
      // extra yearly running cost, 0 to 3 percent of the project cost, so the book shows the full denominator
      operating_cost: Math.round((projectCost * next() * 0.03) / 1000) * 1000,
    });
  }
  return loans;
}
