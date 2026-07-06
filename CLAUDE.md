# Groove Scribe — Arturo's fork

A personal fork of Groove Scribe (drum-groove notation editor). The engine
(playback, notation, MIDI, URL encoding) is considered **perfect and must not be
rewritten** — all work is UI/UX. Primary real-world use: build a groove → copy
the notation to clipboard → paste into Figma.

## Two workstreams (branches)

- **`sidebar`** (PR open): light restyle of the *legacy* Groove Scribe app
  (`index.html` + `css/groove_writer_orange*`). Grouped Time Sig / Subdivision /
  Metronome panels driven over the untouched engine via `js/ui_sidebar.js`.
- **`ritmo-engine`** (active, current direction): a clean-slate shell called
  **Ritmo** (`prototypes/ritmo/index.html`, originally vibe-coded in Dia) wired
  onto the real Groove Scribe engine. This is where new work happens.

## Path B architecture (ritmo-engine)

Ritmo keeps its own shell / grid / toolbar / state / Tone.js sequencer, but
**delegates notation, sound, and export to the engine** (`js/groove_utils.js`,
loaded untouched alongside `abc2svg-1.js` + `jsmidgen.js`). Bridge points, all in
`prototypes/ritmo/index.html`:

- **Notation**: `stateToGrooveUrl()` maps Ritmo's pattern → a Groove Scribe URL
  string, then `GU.getGrooveDataFromUrlString()` → `GU.createABCFromGrooveData()`
  → `GU.renderABCtoSVG().svg` into `#notArea`. Note-letter map mirrors the
  engine's `tablatureToABCNotationPerNote` (groove_utils.js:548).
- **Audio**: real Groove Scribe drum samples (`soundfont/NewDrumSamples/OGG/`)
  loaded into `Tone.Players`, triggered by Ritmo's sequencer (`SAMPLE_FILES`).
- **Playhead**: reuses the engine's `highlightNoteInABCSVGByIndex()` +
  `#abcNoteNum_<uid>_<N>` rects; `onStep` highlights `#sounding-steps-so-far`.
- **Export**: MIDI via `GU.create_MIDIURLFromGrooveData(gd,'general_MIDI')`;
  copy-PNG rasterizes the engine SVG to the clipboard.
- **Divisions**: `spm/spb` derive from `GU.calc_notes_per_measure` (triplets +
  time sigs accurate); toolbar Subdivision popover = note value × Straight/Triplets.
- **Controls**: tempo/time-sig/subdivision/metronome live in **toolbar popovers**
  (`.tb-ctrl > [data-pop] + .pop`, `wirePopovers()/syncControls()`), not the sidebar.

**Do not edit the engine JS** (`groove_utils.js`, `groove_writer.js`) — the whole
premise is a new shell over the proven engine.

## Running / previewing

- Preview server: `python3 -m http.server 8765` (see `.claude/launch.json`).
- Ritmo: **http://localhost:8765/prototypes/ritmo/index.html**
  (must be served over HTTP — it uses relative `../../js` paths; `file://` breaks).
- **Playback playhead & popover animations need a *visible* browser tab** — the
  automated preview runs the tab backgrounded, where `requestAnimationFrame`
  (and thus `Tone.Draw`/`onStep`) is paused. Verify animation in a real tab.

## Conventions

- **No all-caps UI copy** — Title/sentence case only.
- Legacy main app caches hard: bump the `?v=N` query on `css/groove_writer_orange*`
  and `js/*` links in the root `index.html` when editing them (Ritmo has no `?v=`).
- `gh` CLI is not installed — push branches and open PRs via the GitHub web URL.

## Where the running plan lives

Session-to-session state (decisions, todos, next steps) is in Claude memory:
`memory/project_ui_refactor_plan.md` (+ `feedback_no_all_caps.md`).
