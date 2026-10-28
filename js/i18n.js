// Interface text in English and Italian. Keys missing in one language fall back to English.
export const TEXT = {
  en: {
    title: "Impact Lens (prototype)",
    subtitle: "Ex ante ESG rating and social return on investment (SROI) for one loan request, every step shown.",
    prototype: "Working prototype. Public methods and synthetic data only. Not a credit decision.",
    tab_assess: "Assess a loan", tab_portfolio: "Portfolio (synthetic)", tab_method: "Method and sources",
    sector: "Sector", sport: "Sport", culture: "Culture",
    purpose: "Purpose", new_build: "New facility", renovation: "Renovation", energy: "Energy efficiency",
    accessibility: "Accessibility works", equipment: "Equipment",
    borrower: "Borrower", comune: "Municipality (comune)", region_province: "Region or province",
    sports_association: "Sports association or club", cultural_body: "Cultural body or foundation",
    school_university: "School or university",
    region: "Region", amount: "Loan amount (EUR)", project_cost: "Total project cost (EUR, 2024 prices)", term: "Term (years)",
    users: "Regular adult participants in the first full year at the facility (people, not visits). Sport: adults 16 or over active 150 minutes a week (moderate-intensity equivalent); culture: enter only adults aged 30 to 49 attending a museum, gallery, heritage site, cinema, theatre, opera, ballet or concert every few months or more (the activities the source covers). Deadweight then removes those who would take part anyway", co2: "CO2e avoided per year, gross (tonnes), against the building before the works. Not counted for a new facility: carbon benefits and added emissions of new facilities, replacements of an existing building included, are not modelled",
    energy_gain: "Energy classes gained (new facility: classes above the minimum the rules require)", renewable: "Renewable share of energy use (%)",
    climate_risk: "Physical climate risk at the site", low: "Low", medium: "Medium", high: "High",
    brownfield: "Built on land already in use", accessible: "Accessibility beyond the legal minimum",
    free_access: "Hours free or at reduced price (%)", youth: "Programme for young or older people",
    inner_area: "In an inner area (SNAI)", monitoring: "Monitoring plan with indicators",
    audited: "Audited accounts", consulted: "Community consulted",
    assess: "Assess", result: "Result", rating: "ESG rating", score: "score", sroi: "SROI",
    sroi_range: "Assumption range (10th to 90th percentile)", per_euro: "of social value per euro of inputs (project cost and running costs)",
    steps: "Every step", pillar_E: "Environmental", pillar_S: "Social", pillar_G: "Governance",
    indicator: "Indicator", input: "Input", rule: "Rule", points: "Points", weight: "Weight",
    sroi_steps: "SROI, step by step", gross: "Gross social value per year", net: "Net of deadweight, displacement and attribution",
    years: "Benefit period (years)", pv: "Present value of social value", ratio: "SROI ratio",
    audit: "Audit record", fingerprint: "Fingerprint (SHA-256 of the record)",
    illustrative_warning: "Some numbers are illustrative placeholders, not cited values:",
    need_rule_sport: "100 at the lowest rate of sport practice, 0 at the highest", need_rule_culture: "100 at the lowest rate of cultural participation, 0 at the highest",
    regions_table: "Regional rates and participation gap (S2)", rate_sport: "Practise sport (3+)", need_sport: "Gap, sport", rate_culture: "Cultural participation (6+)", need_culture: "Gap, culture",
    running: "Extra yearly running cost the project adds (EUR, 2024 prices)", reuse: "reuse of land already in use",
    net_people: "People's value after deadweight, displacement and attribution", net_carbon: "Carbon value after its own deadweight and attribution (no displacement or drop-off)",
    people_only: "people's value only", inputs: "Inputs: project cost plus running costs over the period",
    horizon_years: "Horizon in years",
    esg_weights: "ESG pillar weights E / S / G", own_weights: "this prototype's own choice, published so it can be challenged",
    unit_per_year: "a year", "unit_EUR per person per year": "EUR per person a year", "unit_EUR per tonne CO2e": "EUR per tonne CO2e", unit_years: "years",
    transferred_warning: "Transferred values: cited at source, but measured in the UK, not in Italy, and valid only for the adult groups named in the users field:",
    synthetic_label: "SYNTHETIC: every loan below is invented to show the method. None is a real loan or borrower.",
    loan: "Loan", total: "Total", by_sector: "By sector", by_grade: "Loans by rating", open: "Open",
    parameter: "Parameter", value: "Value", range: "Range", source: "Source", status: "Status",
    cited: "cited", illustrative: "illustrative", transferred: "cited, transferred from another country", derived: "derived from cited data", language: "Italiano", not_cited: "not yet cited", seed: "seed", loans: "loans", method_version: "method", range_short: "Range (P10 to P90)", to: "to",
    problems: "Please check:",
    reviewer: "reviewer's value", reset: "Back to the method's values", reviewer_name: "Reviewer (name or initials)",
    assumptions: "Assumptions you can change", draws: "draws",
    assumptions_note: "Move a slider to test your own assumption. The result, the passport and its fingerprint record every change next to the method's value. The assumption range then draws that assumption with your value as its peak, across its published range widened to hold your value.",
    change_mind: "What would change the answer", be_users: "Regular adult participants a year needed for SROI 1.0:", now: "now",
    inside_range: "inside the stated range, so the evidence on this value matters most", outside_range: "outside the stated range", outside_range_step: "the first year at or above 1.0 is in the stated range, but the step to it starts outside it", outside_range_step_down: "the first year below 1.0 is in the stated range, but the step to it starts outside it", just_under_one: "just under 1", just_under: "just under",
    be_scan: "The list is what a fine scan finds. A ratio that only grazes 1.0 between two scan steps can be missed, so an empty list is not proof that no value crosses.",
    sroi_scope: "A partial, illustrative benefit-cost scenario: two values per person and carbon only. Excluded outcomes, such as harms, volunteer time and outcomes the people affected would name, are not assessed for materiality, so leaving them out does not show they are small. See 'What this prototype is not' on the method page.",
    not_comparable: "Sport and culture values come from different methods (wellbeing for sport, health and productivity for culture) and are not directly comparable, so do not rank sport loans against culture loans by this ratio.",
    sector_sum_note: "Sector totals add each loan's value and assume no two loans count the same people or the same outcome.",
    be_below: "At the central values this project returns less than one euro of social value per euro of inputs (project cost and running costs).",
    be_holds: "The scan finds no single assumption that, moved within its stated range, brings SROI below 1.0.",
    be_fragile: "At least one assumption, moved within its stated range, brings SROI below 1.0. Check its evidence first.",
    be_range_below: "SROI is below 1.0 at every value scanned across the stated range of",
    be_range_some_below: "The scan found SROI below 1.0 at some values and at or above 1.0 at others, but could not place the point where it reaches 1.0, within the stated range of",
    card_title: "Partial forecast SROI scenario", median: "median", inputs_short: "Inputs",
    central_outside: "The central result lies outside the simulated assumption range. An assumption whose value in use sits at one end of the range it is drawn from is drawn to one side only. Each such assumption that moves this result, with the way SROI moves at the values sampled across its draws, the others at their values in use:",
    one_way_up: "drawn only above the value in use", one_way_down: "drawn only below the value in use",
    one_way_more: "towards a higher SROI", one_way_less: "towards a lower SROI",
    one_way_both: "towards a higher SROI at some values sampled and a lower one at others",
    one_way_together: "only together with the other draws: with the others at their values in use it moves nothing",
    one_way_with_others: "with the other one-sided assumptions at the middle of their ranges instead,",
    one_way_none: "no assumption that moves this result, alone or with the others drawn, sits at one end of its range; the draws of several assumptions combine unevenly, which can also leave the central result outside the range.",
    transferred_replaced: "a reviewer's value is in use; the method's value it replaces is transferred",
    caution_deadweight_works: "Deadweight is the method's own value, set for the users of a new facility. If these works bring no additional participation and avoid no loss of participation, the users would take part anyway: set deadweight to 100 percent under 'Assumptions you can change'.",
    caution_deadweight_reviewer_new: "Deadweight was set by a reviewer below the method's value, so more users are counted as new. A reviewer's value is not evidence of how many users are new: that needs the project's own evidence.",
    caution_deadweight_reviewer: "Deadweight was set by a reviewer below 100 percent, so some participation is counted as added. A reviewer's value is not evidence that these works add participation or avoid a loss of it: that needs the project's own evidence.",
    caution_participation_range: "The central result counts no participation value, because an assumption in use leaves none. The assumption range draws that assumption inside its range, so the range includes participation value that the central result leaves out.",
    caution_deadweight_full_range: "Deadweight is 100 percent, so the central result counts no participation value. The assumption range still draws deadweight below 100 percent, down to the bottom of its published range, so the range includes participation value that the central result leaves out.",
    caution_energy_no_saving: "An energy-efficiency loan with no carbon saving or no energy class gained entered: check the project facts.",
    be_users_zero: "The carbon value alone reaches 1.0, so no participants are needed for SROI 1.0.",
    no_hash: "fingerprint unavailable here: open the page from localhost or over https",
    co2_new_build: "new facility: no carbon counted",
    be_none: "The scan finds no assumption that, moved alone, brings SROI to 1.0.", lifetime: "Lifetime scenario:", duration_not_evidenced: "The benefit period is the asset's assumed life; how long the benefits last is not evidenced for this project.",
    scatter: "Social return beside the regional participation gap", need_axis: "Regional participation gap (0 to 100)",
    scatter_note: "The participation gap is shown beside the return, never multiplied into it, so an efficient project and one that reaches an underserved area can be compared openly. Hover a dot for the loan.",
    be_list: "Where the scan finds SROI crossing 1.0 as each assumption moves alone, the others at their central values (a benefit period counts whole years):", be_about: "about", be_up: "reaches 1.0 at", be_down: "falls below 1.0 at", ratio_over: "SROI if benefits are counted for only", against_all_inputs: "only the benefits stop; divided by the same inputs as the full period, running cost included; not a Guide scope result", year_one: "year",
    waterfall: "From gross value to net value, one year", wf_gross: "Gross value", wf_deadweight: "Less deadweight",
    wf_displacement: "Less displacement", wf_attribution: "Less attribution", wf_net: "Net value",
    wf_then: "Then, with drop-off:", over: "over", years_short: "years", wf_pv: "discounted to present value",
    sensitivity: "Which assumption moves the result most",
    sensitivity_note: "Each bar moves one assumption alone across its whole stated range (every whole year for a benefit period), the others at their central values, and spans the lowest to the highest SROI seen. The dark tick is the central result; the thin line is 1.0.",
    passport_note: "The passport holds every input, every value with its unit, source and status, and the headline results (rating, pillar scores, SROI, its range and the users needed for 1.0), as canonical JSON; the steps, charts and break-even list follow from these and are recomputed on replay. Its SHA-256 fingerprint shows whether a copy differs from a kept original. Replaying it checks that the results follow from its inputs with this method version; it is a consistency check, not proof of who made it.",
    download: "Download the passport (JSON)", compare: "Compare two passports",
    compare_note: "Load two passports, for example from two reviewers. The page replays each one and lists every field where they differ.",
    passport_a: "Passport A", passport_b: "Passport B", field: "Field", use_current: "Use this assessment as A", this_assessment: "this assessment",
    replays: "consistent: its results follow from its inputs with this method version.", no_replay: "not consistent: edited after export, or made with a different method version.",
    identical: "The two passports are identical.", bad_file: "That file is not a passport (JSON).",
  },
  it: {
    title: "Impact Lens (prototipo)",
    subtitle: "Rating ESG ex ante e ritorno sociale dell'investimento (SROI) per una richiesta di finanziamento, con ogni passaggio visibile.",
    prototype: "Prototipo funzionante. Solo metodi pubblici e dati sintetici. Non è una decisione di credito.",
    tab_assess: "Valuta un finanziamento", tab_portfolio: "Portafoglio (sintetico)", tab_method: "Metodo e fonti",
    sector: "Settore", sport: "Sport", culture: "Cultura",
    purpose: "Finalità", new_build: "Nuovo impianto", renovation: "Ristrutturazione", energy: "Efficienza energetica",
    accessibility: "Interventi di accessibilità", equipment: "Attrezzature",
    borrower: "Beneficiario", comune: "Comune", region_province: "Regione o provincia",
    sports_association: "Associazione o società sportiva", cultural_body: "Ente o fondazione culturale",
    school_university: "Scuola o università",
    region: "Regione", amount: "Importo del finanziamento (EUR)", project_cost: "Costo totale del progetto (EUR, prezzi 2024)",
    term: "Durata (anni)", users: "Partecipanti adulti abituali nel primo anno pieno nella struttura (persone, non ingressi). Sport: adulti di 16 anni o più attivi 150 minuti a settimana (equivalente a intensità moderata); cultura: inserire solo adulti da 30 a 49 anni che frequentano musei, gallerie, siti del patrimonio, cinema, teatro, opera, balletto o concerti ogni pochi mesi o più (le attività coperte dalla fonte). Il deadweight toglie poi chi parteciperebbe comunque", co2: "CO2e evitata all'anno, lorda (tonnellate), rispetto all'edificio prima dei lavori. Non contata per un nuovo impianto: benefici di carbonio ed emissioni aggiunte dei nuovi impianti, sostituzioni di un edificio esistente comprese, non sono modellati",
    energy_gain: "Classi energetiche guadagnate (nuovo impianto: classi oltre il minimo richiesto dalle norme)", renewable: "Quota di energia rinnovabile (%)",
    climate_risk: "Rischio climatico fisico del sito", low: "Basso", medium: "Medio", high: "Alto",
    brownfield: "Costruito su suolo già utilizzato", accessible: "Accessibilità oltre il minimo di legge",
    free_access: "Ore gratuite o a prezzo ridotto (%)", youth: "Programma per giovani o anziani",
    inner_area: "In un'area interna (SNAI)", monitoring: "Piano di monitoraggio con indicatori",
    audited: "Bilanci certificati", consulted: "Comunità consultata",
    assess: "Valuta", result: "Risultato", rating: "Rating ESG", score: "punteggio", sroi: "SROI",
    sroi_range: "Intervallo delle ipotesi (dal 10° al 90° percentile)", per_euro: "di valore sociale per euro di input (costo del progetto e costi di gestione)",
    steps: "Ogni passaggio", pillar_E: "Ambientale", pillar_S: "Sociale", pillar_G: "Governance",
    indicator: "Indicatore", input: "Dato", rule: "Regola", points: "Punti", weight: "Peso",
    sroi_steps: "SROI, passo per passo", gross: "Valore sociale lordo annuo", net: "Al netto di deadweight, spiazzamento e attribuzione",
    years: "Periodo dei benefici (anni)", pv: "Valore attuale del valore sociale", ratio: "Rapporto SROI",
    audit: "Registro di verifica", fingerprint: "Impronta (SHA-256 del registro)",
    illustrative_warning: "Alcuni valori sono segnaposto illustrativi, non valori citati:",
    need_rule_sport: "100 al tasso più basso di pratica sportiva, 0 al più alto", need_rule_culture: "100 al tasso più basso di partecipazione culturale, 0 al più alto",
    regions_table: "Tassi regionali e divario di partecipazione (S2)", rate_sport: "Praticano sport (3+)", need_sport: "Divario, sport", rate_culture: "Partecipazione culturale (6+)", need_culture: "Divario, cultura",
    running: "Costo di gestione annuo aggiuntivo del progetto (EUR, prezzi 2024)", reuse: "riuso di suolo già utilizzato",
    net_people: "Valore per le persone al netto di deadweight, spiazzamento e attribuzione", net_carbon: "Valore del carbonio al netto del proprio deadweight e dell'attribuzione (senza spiazzamento né decadimento)",
    people_only: "solo il valore per le persone", inputs: "Input: costo del progetto più costi di gestione nel periodo",
    horizon_years: "Orizzonte in anni",
    esg_weights: "Pesi dei pilastri ESG E / S / G", own_weights: "scelta propria di questo prototipo, pubblicata perché si possa contestare",
    unit_per_year: "l'anno", "unit_EUR per person per year": "EUR per persona l'anno", "unit_EUR per tonne CO2e": "EUR per tonnellata di CO2e", unit_years: "anni",
    transferred_warning: "Valori trasferiti: citati alla fonte, ma misurati nel Regno Unito, non in Italia, e validi solo per i gruppi di adulti indicati nel campo dei partecipanti:",
    synthetic_label: "SINTETICO: ogni finanziamento qui sotto è inventato per mostrare il metodo. Nessuno è un finanziamento o un beneficiario reale.",
    loan: "Finanziamento", total: "Totale", by_sector: "Per settore", by_grade: "Finanziamenti per rating", open: "Apri",
    parameter: "Parametro", value: "Valore", range: "Intervallo", source: "Fonte", status: "Stato",
    cited: "citato", illustrative: "illustrativo", transferred: "citato, trasferito da un altro paese", derived: "derivato da dati citati", language: "English", not_cited: "non ancora citato", seed: "seme", loans: "finanziamenti", method_version: "metodo", range_short: "Intervallo (da P10 a P90)", to: "a",
    problems: "Controllare:",
    reviewer: "valore del revisore", reset: "Torna ai valori del metodo", reviewer_name: "Revisore (nome o iniziali)",
    assumptions: "Ipotesi modificabili", draws: "estrazioni",
    assumptions_note: "Spostare un cursore per provare una propria ipotesi. Il risultato, il passaporto e la sua impronta registrano ogni modifica accanto al valore del metodo. L'intervallo delle ipotesi estrae poi quell'ipotesi con il proprio valore come picco, sull'intervallo pubblicato allargato fino a comprenderlo.",
    change_mind: "Che cosa cambierebbe la risposta", be_users: "Partecipanti adulti abituali all'anno necessari per uno SROI di 1,0:", now: "ora",
    inside_range: "dentro l'intervallo dichiarato: le evidenze su questo valore contano di più", outside_range: "fuori dall'intervallo dichiarato", outside_range_step: "il primo anno a 1,0 o oltre è nell'intervallo dichiarato, ma il passaggio inizia fuori", outside_range_step_down: "il primo anno sotto 1,0 è nell'intervallo dichiarato, ma il passaggio inizia fuori", just_under_one: "appena sotto 1", just_under: "appena sotto",
    be_scan: "L'elenco è ciò che trova una scansione fine. Un rapporto che sfiora appena 1,0 tra due passi della scansione può sfuggire, quindi un elenco vuoto non prova che nessun valore attraversi 1,0.",
    sroi_scope: "Uno scenario costi-benefici parziale e illustrativo: solo due valori per persona e il carbonio. Gli esiti esclusi, come danni, volontariato ed esiti che le persone coinvolte indicherebbero, non sono valutati per rilevanza, quindi escluderli non dimostra che siano piccoli. Vedere 'Che cosa questo prototipo non è' nella pagina del metodo.",
    not_comparable: "I valori per sport e cultura vengono da metodi diversi (benessere per lo sport, salute e produttività per la cultura) e non sono direttamente confrontabili: non ordinare i finanziamenti sportivi rispetto a quelli culturali con questo rapporto.",
    sector_sum_note: "I totali per settore sommano il valore di ogni finanziamento e assumono che due finanziamenti non contino le stesse persone o lo stesso risultato.",
    be_below: "Ai valori centrali il progetto restituisce meno di un euro di valore sociale per euro di input (costo del progetto e costi di gestione).",
    be_holds: "La scansione non trova alcuna singola ipotesi che, spostata dentro il suo intervallo dichiarato, porti lo SROI sotto 1,0.",
    be_fragile: "Almeno un'ipotesi, spostata dentro il suo intervallo dichiarato, porta lo SROI sotto 1,0. Verificarne prima le evidenze.",
    be_range_below: "Lo SROI è sotto 1,0 in ogni valore esaminato dell'intervallo dichiarato di",
    be_range_some_below: "La scansione ha trovato lo SROI sotto 1,0 in alcuni valori e pari o sopra 1,0 in altri, ma non ha potuto collocare il punto in cui raggiunge 1,0, nell'intervallo dichiarato di",
    card_title: "Scenario SROI previsionale parziale", median: "mediana", inputs_short: "Input",
    central_outside: "Il risultato centrale è fuori dall'intervallo simulato delle ipotesi. Un'ipotesi il cui valore in uso sta a un estremo del suo intervallo di estrazione viene estratta da un solo lato. Ogni ipotesi di questo tipo che sposta questo risultato, con il verso in cui lo SROI si muove nei valori campionati lungo le sue estrazioni, le altre ai valori in uso:",
    one_way_up: "estratta solo sopra il valore in uso", one_way_down: "estratta solo sotto il valore in uso",
    one_way_more: "verso uno SROI maggiore", one_way_less: "verso uno SROI minore",
    one_way_both: "verso uno SROI maggiore in alcuni valori campionati e minore in altri",
    one_way_together: "solo insieme alle altre estrazioni: con le altre ai valori in uso non sposta nulla",
    one_way_with_others: "con le altre ipotesi a un solo lato invece al centro dei loro intervalli,",
    one_way_none: "nessuna ipotesi che sposta questo risultato, da sola o insieme alle altre estrazioni, sta a un estremo del suo intervallo; le estrazioni di più ipotesi si combinano in modo disuguale, il che può lasciare anch'esso il risultato centrale fuori dall'intervallo.",
    transferred_replaced: "è in uso un valore del revisore; il valore del metodo che sostituisce è trasferito",
    caution_deadweight_works: "Il deadweight è il valore del metodo, pensato per gli utenti di una nuova struttura. Se questi lavori non portano partecipazione aggiuntiva né evitano una perdita di partecipazione, gli utenti parteciperebbero comunque: impostare il deadweight al 100 per cento in 'Ipotesi modificabili'.",
    caution_deadweight_reviewer_new: "Il deadweight è stato impostato da un revisore sotto il valore del metodo, quindi più utenti sono contati come nuovi. Il valore di un revisore non prova quanti utenti siano nuovi: servono le evidenze del progetto.",
    caution_deadweight_reviewer: "Il deadweight è stato impostato da un revisore sotto il 100 per cento, quindi una parte della partecipazione è contata come aggiunta. Il valore di un revisore non prova che questi lavori aumentino la partecipazione o ne evitino una perdita: servono le evidenze del progetto.",
    caution_participation_range: "Il risultato centrale non conta alcun valore di partecipazione, perché un'ipotesi in uso non ne lascia. L'intervallo delle ipotesi estrae quell'ipotesi dentro il suo intervallo, quindi l'intervallo include valore di partecipazione che il risultato centrale esclude.",
    caution_deadweight_full_range: "Il deadweight è al 100 per cento, quindi il risultato centrale non conta alcun valore della partecipazione. L'intervallo delle ipotesi estrae comunque il deadweight sotto il 100 per cento, fino al fondo del suo intervallo pubblicato, quindi l'intervallo comprende un valore della partecipazione che il risultato centrale esclude.",
    caution_energy_no_saving: "Un finanziamento per l'efficienza energetica senza risparmio di carbonio o senza classi energetiche guadagnate: verificare i dati del progetto.",
    be_users_zero: "Il solo valore del carbonio raggiunge 1,0, quindi per uno SROI di 1,0 non servono partecipanti.",
    no_hash: "impronta non disponibile qui: aprire la pagina da localhost o via https",
    co2_new_build: "nuovo impianto: nessun carbonio contato",
    be_none: "La scansione non trova alcuna ipotesi che, spostata da sola, porti lo SROI a 1,0.", lifetime: "Scenario sull'intera vita:", duration_not_evidenced: "Il periodo dei benefici è la vita presunta del bene; quanto durano i benefici non è documentato per questo progetto.",
    scatter: "Ritorno sociale accanto al divario regionale di partecipazione", need_axis: "Divario regionale di partecipazione (da 0 a 100)",
    scatter_note: "Il divario di partecipazione è mostrato accanto al ritorno, mai moltiplicato dentro di esso, così un progetto efficiente e uno che raggiunge un'area meno servita si confrontano apertamente. Passare sopra un punto per vedere il finanziamento.",
    be_list: "Dove la scansione trova lo SROI che attraversa 1,0 spostando una sola ipotesi, con le altre ai valori centrali (il periodo dei benefici conta anni interi):", be_about: "circa", be_up: "raggiunge 1,0 a", be_down: "scende sotto 1,0 a", ratio_over: "SROI se i benefici si contano solo per", against_all_inputs: "si fermano solo i benefici; diviso per gli stessi input del periodo pieno, costo di gestione incluso; non un risultato secondo l'ambito della guida", year_one: "anno",
    waterfall: "Dal valore lordo al valore netto, un anno", wf_gross: "Valore lordo", wf_deadweight: "Meno deadweight",
    wf_displacement: "Meno spiazzamento", wf_attribution: "Meno attribuzione", wf_net: "Valore netto",
    wf_then: "Poi, con il decadimento:", over: "in", years_short: "anni", wf_pv: "valore attuale",
    sensitivity: "Quale ipotesi sposta di più il risultato",
    sensitivity_note: "Ogni barra sposta una sola ipotesi lungo tutto il suo intervallo dichiarato (ogni anno intero per il periodo dei benefici), con le altre ai valori centrali, e va dallo SROI più basso al più alto osservato. La tacca scura è il risultato centrale; la linea sottile è 1,0.",
    passport_note: "Il passaporto contiene ogni dato, ogni valore con unità, fonte e stato e i risultati principali (rating, punteggi dei pilastri, SROI, il suo intervallo e gli utenti necessari per 1,0), in JSON canonico; passaggi, grafici ed elenco di pareggio ne derivano e si ricalcolano alla riesecuzione. La sua impronta SHA-256 mostra se una copia differisce da un originale conservato. Rieseguirlo verifica che i risultati derivino dai suoi dati con questa versione del metodo; è un controllo di coerenza, non una prova di chi l'ha prodotto.",
    download: "Scarica il passaporto (JSON)", compare: "Confronta due passaporti",
    compare_note: "Caricare due passaporti, per esempio di due revisori. La pagina riesegue ciascuno e mostra ogni campo in cui differiscono.",
    passport_a: "Passaporto A", passport_b: "Passaporto B", field: "Campo", use_current: "Usa questa valutazione come A", this_assessment: "questa valutazione",
    replays: "coerente: i risultati derivano dai suoi dati con questa versione del metodo.", no_replay: "non coerente: modificato dopo l'esportazione, o prodotto con un'altra versione del metodo.",
    identical: "I due passaporti sono identici.", bad_file: "Il file non è un passaporto (JSON).",
  },
};

// A break-even crossing is found by search and shown rounded, so it is marked as approximate, with shares to two
// decimals of a percent; a benefit period crosses at a whole year and is shown as it is (round 11, reviewer B).
export function crossingShown(unit, value) {
  if (unit === "years") return { approx: false, value, digits: 0, percent: false };
  if (unit === "share" || unit === "per year") return { approx: true, value: value * 100, digits: 2, percent: true };
  return { approx: true, value, digits: 0, percent: false };
}

// The SROI ratio in words, in one place for every spot the page shows it: two decimals, or "just under 1" when a ratio
// below 1.0 rounds to 1.00 (the engine's under flag), so the number never reads 1 beside a verdict of less than one
// euro. The card's line puts the currency first; the step table shows the division to four decimals, cut, not rounded,
// so it never reads 1 either (round 25, reviewers A and B). Every number shown is the engine's rounded ratio, so 1.005
// reads 1 in the step table as on the card (round 26, reviewers A and B).
const numberText = (lang, x, d) => new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-CA", { maximumFractionDigits: d }).format(x);
export const ratioWords = (lang, ratio, under) => (under ? t(lang, "just_under_one") : numberText(lang, ratio, 2));
export const ratioPerEuro = (lang, ratio, under) => (under ? `${t(lang, "just_under")} EUR 1` : `EUR ${numberText(lang, ratio, 2)}`);
export const ratioExact = (lang, raw, ratio, under) => (under ? numberText(lang, Math.floor(raw * 1e4) / 1e4, 4) : numberText(lang, ratio, 2));

// The range's ends and a sensitivity bar's ends, each through the same words, so every flag the engine sets reaches the
// page (round 27, reviewer A).
export const rangeEnds = (lang, range) => `${ratioWords(lang, range.p10, range.under.p10)} ${t(lang, "to")} ${ratioWords(lang, range.p90, range.under.p90)}`;
export const barEnds = (lang, row) => `${ratioWords(lang, row.lowest, row.lowest_under)} ${t(lang, "to")} ${ratioWords(lang, row.highest, row.highest_under)}`;
// A value in the passport comparison: the ratios with their flags, other numbers in the page's language, the rest as
// written in the file (round 27, reviewer B: a central 0.996 showed as 1, and decimals with a point on the Italian page).
const FLAGGED = { "results.sroi.ratio": ["sroi", "ratio_under"], "results.range.p10": ["range", "under", "p10"],
  "results.range.p50": ["range", "under", "p50"], "results.range.p90": ["range", "under", "p90"] };
export function compareCell(lang, path, value, pp, canonical, ends = []) {
  if (typeof value !== "number") return canonical(value);
  const at = FLAGGED[path];
  if (at && pp && pp.results) {
    const under = at.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), pp.results);
    return ratioWords(lang, value, under === true);
  }
  // each number on its own never reads as an end of its range or a whole number it is not (round 30, reviewer A: a
  // deadweight of 0.9999999 read 1 beside 0.8)
  return endText(lang, value, 6, [...ends, Math.round(value)]);
}

// Both cells of one passport comparison row. Two numbers that differ never read the same: digits are added until they
// differ, and two flagged ratios that read the same words carry their values (round 28, reviewer A: a deadweight of
// 0.9999999 and one of 1 both read 1).
export function compareCells(lang, path, a, b, ppA, ppB, canonical, ends = []) {
  const shown = [compareCell(lang, path, a, ppA, canonical, ends), compareCell(lang, path, b, ppB, canonical, ends)];
  if (typeof a !== "number" || typeof b !== "number" || a === b || shown[0] !== shown[1]) return shown;
  for (let d = 7; d <= 17; d += 1) {
    const exact = [numberText(lang, a, d), numberText(lang, b, d)];
    if (exact[0] !== exact[1]) return FLAGGED[path] ? shown.map((w, i) => `${w} (${exact[i]})`) : exact;
  }
  // smaller than 17 decimals can show: the shortest text that reads back as the number (round 29, reviewer A: 1e-18
  // and 2e-18 both read 0)
  const exact = [a, b].map((x) => exactText(lang, x));
  return FLAGGED[path] ? shown.map((w, i) => `${w} (${exact[i]})`) : exact;
}

// The shortest text that reads back as the number, with the page's decimal mark.
const exactText = (lang, x) => (lang === "it" ? String(x).replace(".", ",") : String(x));

// Decimals for a value shown next to an end of its range: one more until it no longer reads as the end it is not, so
// a deadweight of 0.9999 never reads 1 in a formula or 100% on a slider (round 29, reviewer A).
export function digitsNearEnds(x, d, ends, lang = "en") {
  // by the formatted text itself, as the reader sees it, so no rounding boundary can slip through (round 31,
  // reviewer A: 0.999995 read 1 and 0.1999995 read 0.2 when the distance was compared instead)
  let k = d;
  while (k <= 20 && ends.some((e) => x !== e && numberText(lang, x, k) === numberText(lang, e, k))) k += 1;
  return k;
}

// A number with d decimals, or more until it no longer reads as an end it is not; past 20 decimals, its exact text
// (round 30, reviewer A: 0.9999999999999999 still read 1 at the old limit of 12).
export function endText(lang, x, d, ends) {
  const k = digitsNearEnds(x, d, ends, lang);
  return k > 20 ? exactText(lang, x) : numberText(lang, x, k);
}

// A share as a percentage, and as a decimal in a formula: decimals until it reads as neither an end of its range nor
// the nearest whole percent it is not (round 37, reviewer A: a deadweight of 0.8004 read 80% and 0.8)
export const percentText = (lang, p, ends) => endText(lang, p, 1, [...ends, Math.round(p)]);
export const shareText = (lang, v) => endText(lang, v, 3, [0, 1, Math.round(v * 100) / 100]);

export function t(lang, key) {
  return (TEXT[lang] && TEXT[lang][key]) ?? TEXT.en[key] ?? key;
}
