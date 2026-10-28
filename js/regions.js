// The 20 Italian regions with two public participation rates, as printed by ISTAT (CC BY 4.0):
// sport: people aged 3 and over who practise sport, per 100 (ISTAT, La pratica sportiva in Italia, 2024, Tavola 2);
// culture: people aged 6 and over with two or more cultural activities outside the home in 12 months, per 100
// (ISTAT, Rapporto BES 2025, chapter 2, regional table, 2024 data).
// "need" (0 to 100) is indicator S2: the lower a region's rate in the loan's sector, the higher its need,
// scaled between the lowest and highest region. The rates are cited; the scaling is this prototype's own rule.
export const REGION_SOURCES = {
  sport: { title: "ISTAT, La pratica sportiva in Italia, anno 2024, Tavola 2", url: "https://www.istat.it/comunicato-stampa/la-pratica-sportiva-in-italia/" },
  culture: { title: "ISTAT, Rapporto BES 2025, 2. Istruzione e formazione, regional table (2024 data)", url: "https://www.istat.it/wp-content/uploads/2025/11/02-Istruzione-e-formazione.pdf" },
};

const ROWS = [
  ["abruzzo", "Abruzzo", 37.0, 32.7], ["basilicata", "Basilicata", 28.7, 29.2], ["calabria", "Calabria", 22.9, 24.9],
  ["campania", "Campania", 23.9, 31.8], ["emilia_romagna", "Emilia-Romagna", 41.2, 41.4],
  ["friuli_venezia_giulia", "Friuli-Venezia Giulia", 43.6, 44.0], ["lazio", "Lazio", 44.0, 45.6],
  ["liguria", "Liguria", 39.9, 40.9], ["lombardia", "Lombardia", 43.5, 40.2], ["marche", "Marche", 37.7, 35.3],
  ["molise", "Molise", 31.2, 34.8], ["piemonte", "Piemonte", 37.7, 39.6], ["puglia", "Puglia", 30.4, 30.4],
  ["sardegna", "Sardegna", 33.6, 33.6], ["sicilia", "Sicilia", 28.1, 28.6], ["toscana", "Toscana", 39.6, 40.9],
  ["trentino_alto_adige", "Trentino-Alto Adige/Südtirol", 53.2, 46.0], ["umbria", "Umbria", 39.3, 40.9],
  ["valle_d_aosta", "Valle d'Aosta/Vallée d'Aoste", 49.1, 37.6], ["veneto", "Veneto", 44.3, 38.1],
];

// kept unrounded, so the weighting and the scatter use the gap itself; only the tables round it for display
// (round 35, reviewer A: Umbria's 45.87 rounded to 45.9 first turned a 64.95 total into 65 and B)
const scaled = (rates) => {
  const lo = Math.min(...rates), hi = Math.max(...rates);
  return rates.map((r) => ((hi - r) / (hi - lo)) * 100);
};
const sportNeed = scaled(ROWS.map((r) => r[2]));
const cultureNeed = scaled(ROWS.map((r) => r[3]));

export const REGIONS = ROWS.map(([id, name, sport, culture], i) => ({
  id, name, rate: { sport, culture }, need: { sport: sportNeed[i], culture: cultureNeed[i] }, status: "derived",
}));
