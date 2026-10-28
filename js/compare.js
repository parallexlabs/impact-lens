// The two passport slots of the compare panel, apart from the page so their rules can be tested. A slot holds a
// parsed file, or this assessment's passport, with its fingerprint; or nothing. Every choice empties its slot and
// redraws at once, before any read or hash is awaited, so no verdict or comparison ever shows for a file or assessment
// no longer in that slot (round 10, reviewer B, HIGH). A read or hash overtaken by a later choice for the same slot is
// dropped. The fingerprint is taken once, when the slot is filled, so drawing never waits.
// fingerprint(value) returns a promise of the hex text, or of null where hashing is not offered; draw(state) is
// synchronous and reads state.a, state.b and state.bad.
export function passportSlots(fingerprint, draw) {
  const state = { a: null, b: null, bad: { a: false, b: false } };
  const turn = { a: 0, b: 0 };
  // where each slot's latest choice came from: "file", "current" (this assessment) or null
  const from = { a: null, b: null };
  const start = (key, source) => {
    const mine = ++turn[key];
    from[key] = source;
    state[key] = null;
    state.bad[key] = false;
    draw(state);
    return mine;
  };
  const fill = async (key, mine, value) => {
    let fp;
    // a value that cannot even be fingerprinted is not a passport
    try { fp = await fingerprint(value); } catch { if (mine === turn[key]) { state.bad[key] = true; draw(state); } return; }
    if (mine !== turn[key]) return;
    state[key] = { value, fp, from: from[key] };
    draw(state);
  };
  return {
    state,
    // a chosen file; no file (a cancelled picker, which empties the file box) empties the slot too (round 10,
    // reviewers A and C)
    async choose(key, file) {
      const mine = start(key, file ? "file" : null);
      if (!file) return;
      let value;
      try { value = JSON.parse(await file.text()); } catch {
        if (mine === turn[key]) { state.bad[key] = true; draw(state); }
        return;
      }
      if (mine !== turn[key]) return;
      await fill(key, mine, value);
    },
    // the picker's cancel event (round 11, reviewer B): browsers that keep the file send it with no change, and the
    // slot stays; a box left empty empties a slot that held a file, even one still being read; this assessment,
    // chosen by its button, stays, since no file box ever showed it
    async cancelled(key, file) {
      if (file || from[key] !== "file") return;
      await this.choose(key, undefined);
    },
    // a value already in hand, such as this assessment's passport
    async use(key, value) {
      const mine = start(key, "current");
      await fill(key, mine, value);
    },
    // this assessment's passport changed (the reviewer's name): a slot holding it, or still hashing it, is emptied, and
    // a file stays (round 15, reviewer C)
    retire() {
      for (const key of ["a", "b"]) if (from[key] === "current") start(key, null);
    },
  };
}

// The compare panel is rebuilt on every render, a language switch included. Its slots live here instead, one set per
// assessment: a rebuild for the same assessment keeps both passports and their verdicts, and the slots draw into
// whichever panel is current (round 14, reviewer B). A new assessment starts empty slots, so a slot marked as this
// assessment never names an earlier one. An earlier assessment's slots never draw again, so a read or hash it still
// had running cannot land in the new panel (round 15, reviewer A, HIGH).
export function slotsPerResult(fingerprint) {
  let owner = null, slots = null, target = () => {};
  return {
    for(result) {
      if (!slots || result !== owner) {
        owner = result;
        const made = passportSlots(fingerprint, (s) => { if (slots === made) target(s); });
        slots = made;
      }
      return slots;
    },
    // the current panel's draw; the slots are drawn into it at once, so a rebuilt panel shows what they hold
    drawTo(draw) {
      target = draw;
      if (slots) draw(slots.state);
    },
  };
}

// Whether a pointer is pressed now, read from the window's own events in the capture phase, so a hold can wait for its
// release (round 18, reviewer A). Each pointer is kept by its id, so releasing a second finger does not end the first's
// press (round 19, reviewer A).
export function pointerState(win) {
  const down = new Set();
  win.addEventListener("pointerdown", (e) => { down.add(e?.pointerId ?? 0); }, true);
  for (const type of ["pointerup", "pointercancel"]) win.addEventListener(type, (e) => { down.delete(e?.pointerId ?? 0); }, true);
  return { held: () => down.size > 0 };
}

// Keeps a box at its height until a pressed pointer is released. With no pointer pressed (focus left by the keyboard),
// it holds until the next release or five seconds, whichever comes first; the five seconds never cut a pressed pointer
// short (round 17, reviewer A; round 18, reviewer A). Both the five seconds and a release check again that no pointer is
// still pressed, so a press that starts after the hold began, or a second finger, keeps it (round 19, reviewer A).
export function holdHeight(box, win, pointer, wait = setTimeout) {
  box.style.minHeight = `${box.offsetHeight}px`;
  let done = false;
  const release = () => {
    if (done || pointer.held()) return;
    done = true;
    box.style.minHeight = "";
    for (const type of ["pointerup", "pointercancel"]) win.removeEventListener(type, onUp);
  };
  const onUp = () => wait(release, 0);
  for (const type of ["pointerup", "pointercancel"]) win.addEventListener(type, onUp);
  if (!pointer.held()) wait(release, 5000);
}
