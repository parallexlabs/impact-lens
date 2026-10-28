// Every number the engine uses lives here, with its source and status.
// status "cited": checked at the named source. "transferred": checked at the named source, but measured in another
// country, so it shows the order of magnitude, not an Italian value. "illustrative": a placeholder that shows how
// the method works; it is not a cited value and the page labels it so.
export const METHOD_VERSION = "0.4.36";
// Price base: every money value is in 2024 euros. Enter project and running costs in 2024 euros too.
export const PRICE_BASE = "EUR, 2024 prices";

export const PARAMS = {
  discount_rate: {
    value: 0.03, range: [0.008, 0.05], unit: "per year", domain: [0, 0.2],
    label: { en: "Social discount rate", it: "Tasso di sconto sociale" },
    note: { en: "3% is the guide's reference for EU-funded projects in 2021 to 2027 where no national value exists. Low end from the same guide: 0.80% for Italy, which the guide reports from Catalano et al. (2021), calculated by the social rate of time preference method. High end: 5%, the rate the 2014 to 2020 rules set for major projects in cohesion countries, kept as a stress case, not as a current Italian value.",
      it: "Il 3% è il riferimento della guida per i progetti cofinanziati dall'UE nel 2021-2027 in assenza di un valore nazionale. Estremo basso dalla stessa guida: 0,80% per l'Italia, che la guida riporta da Catalano et al. (2021), calcolato con il metodo del saggio sociale di preferenza intertemporale. Estremo alto: 5%, il tasso che le regole 2014-2020 fissavano per i grandi progetti nei paesi della coesione, tenuto come caso di stress, non come valore italiano attuale." },
    source: { title: "European Commission, Economic Appraisal Vademecum 2021-2027 (2022), pp. 13 and 21",
      url: "https://jaspers.eib.org/files/library/2021/economic-appraisal-vademecum-2021-2027-general-principles-and-sector-applications.pdf" },
    status: "cited",
  },
  deadweight: {
    value: 0.8, range: [0.6, 0.95], unit: "share",
    label: { en: "Deadweight (would happen anyway)", it: "Deadweight (sarebbe accaduto comunque)" },
    note: { en: "Set high on purpose: the values per person below are for being active or engaged at all, and most regular users of a new facility would have been active or engaged anyway. For works that bring no additional participation and avoid no loss of participation (an energy retrofit of a facility that stays open either way, for example), set it to 100 percent. Accessibility works can add participation without adding capacity. At 100 percent the central result counts no participation, but the assumption range still draws deadweight below 100 percent, down to the bottom of its published range, so the range counts some participation the central result leaves out.",
      it: "Volutamente alto: i valori per persona qui sotto valgono per chi diventa attivo o partecipe, e la maggior parte degli utenti abituali di una nuova struttura lo sarebbe stata comunque. Per lavori che non portano partecipazione aggiuntiva né evitano una perdita di partecipazione (per esempio l'efficientamento di una struttura che resterebbe aperta comunque), impostarlo al 100 per cento. Gli interventi di accessibilità possono aumentare la partecipazione senza aumentare la capienza. Al 100 per cento il risultato centrale non conta alcuna partecipazione, ma l'intervallo delle ipotesi estrae comunque il deadweight sotto il 100 per cento, fino al fondo del suo intervallo pubblicato, quindi l'intervallo conta una parte di partecipazione che il risultato centrale esclude." },
    source: null, status: "illustrative",
  },
  displacement: {
    value: 0.1, range: [0.0, 0.25], unit: "share",
    label: { en: "Displacement (outcomes lost elsewhere)", it: "Spiazzamento (esiti persi altrove)" },
    note: { en: "Outcomes lost elsewhere because of the project, beyond deadweight: for example, people who stop taking part when another facility loses users or income and cuts its offer. People who simply move from another facility were active or engaged anyway, so deadweight already removes them; they are not counted again here.",
      it: "Esiti persi altrove a causa del progetto, oltre al deadweight: per esempio persone che smettono di partecipare quando un'altra struttura perde utenti o entrate e riduce la propria offerta. Chi si sposta semplicemente da un'altra struttura era già attivo o partecipe, quindi il deadweight lo toglie già; qui non si conta di nuovo." },
    source: null, status: "illustrative",
  },
  attribution: {
    value: 0.2, range: [0.1, 0.35], unit: "share",
    label: { en: "Attribution to others", it: "Attribuzione ad altri" },
    note: { en: "The share of the outcomes due to other programmes or organisations that are not part of the project. Capital co-funders are already in the project cost, so they are not attributed again. The same share is taken from the carbon saving, a simplification.",
      it: "La quota degli esiti dovuta ad altri programmi o organizzazioni esterni al progetto. I cofinanziatori del capitale sono già nel costo del progetto, quindi non sono attribuiti di nuovo. La stessa quota si toglie dal risparmio di carbonio, una semplificazione." },
    source: null, status: "illustrative",
  },
  drop_off: {
    value: 0.05, range: [0.02, 0.1], unit: "per year",
    label: { en: "Drop-off", it: "Decadimento annuo (drop-off)" },
    note: { en: "The net yearly decline of the first year's value: outcomes that fade, and participants who leave and are not replaced by new joiners. Near 0 if the facility keeps the same number of regular participants and the outcomes do not fade.",
      it: "Il calo annuo netto del valore del primo anno: esiti che svaniscono e partecipanti che lasciano senza essere sostituiti da nuovi. Vicino a 0 se la struttura mantiene lo stesso numero di partecipanti abituali e gli esiti non svaniscono." },
    source: null, status: "illustrative",
  },
  value_per_user_sport: {
    value: 2347, range: [1083, 2347], unit: "EUR per person per year",
    label: { en: "Wellbeing value of an active adult", it: "Valore di benessere di un adulto attivo" },
    note: { en: "GBP 2,600 a year for an active adult (150 minutes or more a week of moderate-intensity equivalent activity); low end GBP 1,200 for a fairly active adult. England, 2024 prices, converted at purchasing power parity, EUR 0.902845 per GBP (World Bank PPP for GDP, 2024: Italy 0.599627, United Kingdom 0.664153 per international dollar). At the 2024 market rate it would be about 30 percent higher. The value is for an adult (16 or over) and is the wellbeing shift of being active rather than inactive, so the users counted are regular adult participants who meet that activity level; deadweight removes those who would have been active anyway. It is a WELLBY (life satisfaction) value; the culture values here are health (QALY) and productivity based, so the two are not directly comparable. Sport England states on the research page linked below that the national model's outputs 'would need bespoke adaptation and tailoring to meet the evaluation needs of a project or programme': here they show an order of magnitude only. The value is active against inactive; a user who moves from fairly active to active gains about GBP 1,400 (EUR 1,264), so where most new regulars were already fairly active, the honest case is nearer the low end.",
      it: "GBP 2.600 l'anno per un adulto attivo (150 minuti o più a settimana di attività equivalente a intensità moderata); estremo basso GBP 1.200 per un adulto abbastanza attivo. Inghilterra, prezzi 2024, convertiti a parità di potere d'acquisto, EUR 0,902845 per GBP (PPP del PIL della Banca Mondiale, 2024: Italia 0,599627, Regno Unito 0,664153 per dollaro internazionale). Al cambio di mercato del 2024 sarebbe circa il 30 per cento più alto. Il valore riguarda un adulto (16 anni o più) ed è lo scarto di benessere tra essere attivo e inattivo, quindi gli utenti contati sono partecipanti adulti abituali con quel livello di attività; il deadweight toglie chi sarebbe stato attivo comunque. È un valore WELLBY (soddisfazione di vita); i valori per la cultura qui usati si basano sulla salute (QALY) e sulla produttività, quindi i due non sono direttamente confrontabili. Sport England afferma nella pagina di ricerca indicata sotto che i risultati del modello nazionale richiederebbero un adattamento su misura per le esigenze di valutazione di un progetto o programma ('would need bespoke adaptation and tailoring'): qui mostrano solo un ordine di grandezza. Il valore confronta attivo e inattivo; chi passa da abbastanza attivo ad attivo guadagna circa GBP 1.400 (EUR 1.264), quindi dove la maggior parte dei nuovi abituali era già abbastanza attiva il caso onesto è vicino all'estremo basso." },
    source: { title: "Sport England, Social value of sport and physical activity 2023-24, summary report, p. 14 (values) and p. 10 (all figures in 2024 prices)",
      url: "https://www.sportengland.org/research-and-data/research/social-value-and-return-investment-sport-and-physical-activity" },
    status: "transferred",
  },
  value_per_user_culture: {
    value: 896, range: [404, 896], unit: "EUR per person per year",
    label: { en: "Health and productivity value of regular cultural engagement", it: "Valore per salute e produttività della partecipazione culturale abituale" },
    note: { en: "Model 1 covers attendance at a museum, art exhibition or gallery, heritage site or stately home, cinema, theatre, opera, classical music concert or ballet, or concert (Table 2). GBP 992 a year for general engagement every few months or more (general health, adults 30 to 49); low end GBP 448 for participation once a week or more and mental health in the same age group (model 2b). Table 3, 2024 prices (report section 4.2: all estimates are annual and in 2024 prices); GBP 854 of the 992 is the individual's health value and GBP 138 productivity, paid and unpaid (unpaid covers volunteering and work in the home). Converted at purchasing power parity, EUR 0.902845 per GBP (World Bank, 2024). The two ends are two different models (general health from engagement every few months, mental health from weekly participation), not two levels of one; the range shows the gap between them, not a measured spread. Both are for adults aged 30 to 49. The low end is a different outcome model, not an age adjustment: for other ages neither value is supported, so leave those people out of the users entered until a value is justified for their age group.",
      it: "Il modello 1 copre la frequentazione di musei, mostre d'arte o gallerie, siti del patrimonio o dimore storiche, cinema, teatro, opera, concerti di musica classica o balletto, o concerti (Tabella 2). GBP 992 l'anno per una partecipazione generale ogni pochi mesi o più (salute generale, adulti da 30 a 49 anni); estremo basso GBP 448 per partecipazione una volta a settimana o più e salute mentale nella stessa fascia d'età (modello 2b). Tabella 3, prezzi 2024 (sezione 4.2 del rapporto: tutte le stime sono annuali e a prezzi 2024); dei 992 GBP, 854 sono il valore per la salute della persona e 138 la produttività, retribuita e non retribuita (quest'ultima comprende volontariato e lavoro domestico). Convertiti a parità di potere d'acquisto, EUR 0,902845 per GBP (Banca Mondiale, 2024). I due estremi sono due modelli diversi (salute generale dalla fruizione ogni pochi mesi, salute mentale dalla partecipazione settimanale), non due livelli dello stesso; l'intervallo mostra lo scarto tra loro, non una dispersione misurata. Entrambi riguardano adulti da 30 a 49 anni. L'estremo basso è un modello di esito diverso, non un aggiustamento per età: per altre età nessuno dei due valori è supportato, quindi quelle persone vanno escluse dagli utenti inseriti finché non si giustifica un valore per la loro fascia d'età." },
    source: { title: "Frontier Economics for DCMS, Health and wellbeing benefits of culture and heritage (2024), Table 3",
      url: "https://assets.publishing.service.gov.uk/media/678e2ecf432c55fe2988f615/rpt_-_Frontier_Health_and_Wellbeing_Final_Report_09_12_24_accessible_final.pdf" },
    status: "transferred",
  },
  carbon_value: {
    value: 208, range: [208, 314], unit: "EUR per tonne CO2e",
    label: { en: "Value of a tonne of CO2e avoided", it: "Valore di una tonnellata di CO2e evitata" },
    note: { en: "EIB shadow cost of carbon, Table A6, in 2016 euros: EUR 165 for 2025 and EUR 250 for 2030, kept by the EIB in its 2023 progress report (paragraph 17: \"The current EIB shadow cost of carbon values will be maintained, as approved under the roadmap\"), to which the roadmap's Phase 2 (2026-2030), which replaces the 2021-2025 roadmap, refers for these values (p. 17, note 20); uprated to 2024 euros by the euro area HICP (Eurostat prc_hicp_aind, 2015=100: 100.23 in 2016, 126.07 in 2024). The path rises after 2030 (EUR 390 in 2035, EUR 800 in 2050, 2016 euros); holding it at the 2025 to 2030 values understates carbon value on purpose. It is the EIB's cost of meeting an emissions target (an abatement shadow cost), not a value stated by the people affected.",
      it: "Costo ombra del carbonio della BEI, Tabella A6, in euro 2016: EUR 165 per il 2025 e EUR 250 per il 2030, confermato dalla BEI nel rapporto di avanzamento 2023 (paragrafo 17: i valori attuali del costo ombra del carbonio \"will be maintained\"), a cui rinvia per questi valori la Fase 2 della roadmap (2026-2030), che sostituisce la roadmap 2021-2025 (p. 17, nota 20); rivalutato a euro 2024 con l'HICP dell'area euro (Eurostat prc_hicp_aind, 2015=100: 100,23 nel 2016, 126,07 nel 2024). Il percorso sale dopo il 2030 (EUR 390 nel 2035, EUR 800 nel 2050, euro 2016); tenerlo ai valori 2025-2030 sottostima di proposito il valore del carbonio. È il costo per la BEI di raggiungere un obiettivo di emissioni (un costo ombra di abbattimento), non un valore indicato dalle persone interessate." },
    source: { title: "EIB Group Climate Bank Roadmap 2021-2025 (2020), Annex 5, Table A6",
      url: "https://www.eib.org/files/publications/thematic/eib_group_climate_bank_roadmap_en.pdf" },
    status: "cited",
  },
  carbon_deadweight: {
    value: 0, range: [0, 0.5], unit: "share",
    label: { en: "Carbon deadweight (saved anyway)", it: "Deadweight sul carbonio (risparmiato comunque)" },
    note: { en: "The share of the saving that minimum energy rules or a cleaner grid would have brought anyway. The saving entered is gross: the project's measured or engineered saving against the building before the works. A new facility counts no carbon saving: carbon benefits and added emissions of new facilities, replacements of an existing building included, are not modelled. Central 0 assumes no rule or grid change would have brought it without the project. Ranged so its effect shows; at the method's own values, like the values per person, its draws go one way only (towards less value). A reviewer's value can change the direction; the result card names, from the values in use, each assumption drawn one way only.",
      it: "La quota del risparmio che le regole minime sull'energia o una rete più pulita avrebbero portato comunque. Il risparmio inserito è lordo: quello misurato o progettato del progetto rispetto all'edificio prima dei lavori. Un nuovo impianto non conta alcun risparmio di carbonio: benefici di carbonio ed emissioni aggiunte dei nuovi impianti, sostituzioni di un edificio esistente comprese, non sono modellati. Il valore centrale 0 presuppone che nessuna regola o modifica della rete l'avrebbe portato senza il progetto. Ha un intervallo perché se ne veda l'effetto; ai valori del metodo, come i valori per persona, le sue estrazioni vanno in una sola direzione (verso meno valore). Il valore di un revisore può cambiare la direzione; la scheda del risultato indica, dai valori in uso, ogni ipotesi estratta in una sola direzione." },
    source: null, status: "illustrative",
  },
  asset_life_build: {
    value: 25, range: [15, 40], unit: "years",
    label: { en: "Benefit period, new facility", it: "Periodo dei benefici, nuovo impianto" },
    note: { en: "How many years the yearly people benefit is counted: a lifetime scenario over the facility's life, longer than the outcome periods SROI studies usually evidence, so the result also shows the ratio over 1 year and 5 years. Ranged, since it moves the result; the sensitivity chart shows by how much against the other assumptions.",
      it: "Per quanti anni si conta il beneficio annuo per le persone: uno scenario sull'intera vita dell'impianto, più lungo dei periodi di esito che gli studi SROI di solito documentano, perciò il risultato mostra anche il rapporto su 1 anno e su 5 anni. Ha un intervallo perché sposta il risultato; il grafico di sensibilità mostra quanto, rispetto alle altre ipotesi." },
    source: null, status: "illustrative",
  },
  asset_life_renovation: {
    value: 15, range: [8, 25], unit: "years",
    label: { en: "Benefit period, renovation, energy or accessibility works", it: "Periodo dei benefici, ristrutturazione, efficienza o accessibilità" },
    source: null, status: "illustrative",
  },
  asset_life_equipment: {
    value: 8, range: [5, 12], unit: "years",
    label: { en: "Benefit period, equipment", it: "Periodo dei benefici, attrezzature" },
    source: null, status: "illustrative",
  },
};

// Pillar weights of the ESG rating. A lender for sports and culture weighs the social pillar most.
export const WEIGHTS = { E: 0.3, S: 0.45, G: 0.25 };
export const WEIGHTS_STATUS = "illustrative";

// Rating bands on the weighted score (0 to 100).
export const BANDS = [
  { grade: "A", min: 80 }, { grade: "B", min: 65 }, { grade: "C", min: 50 }, { grade: "D", min: 35 }, { grade: "E", min: 0 },
];
