# XCTrack configuration editor

[Français](README.md) · **English** · [Nederlands](README.nl.md) ·
[Deutsch](README.de.md) · [Español](README.es.md)

A web editor for the `.xcfg` files of **XCTrack**, the flight application paraglider
pilots use. You open an export from your instrument, you see your pages exactly as the
device draws them, you change them, you export again.

Everything happens **in the browser**. No server, no account, nothing sent: the file
never leaves your machine.

## 👉 [Open the editor](https://frederict.github.io/xcfg-editor/)

**<https://frederict.github.io/xcfg-editor/>** — nothing to install, nothing to sign up
for. Drop in a `.xcfg` or an `.xczfg` exported from your instrument.

The file is read by your browser and sent nowhere: the page is served as static files, it
has no server to talk to.

---

## What it looks like

![The editor open on the first landscape page of the test backup: the page drawn at its
real size, the graduated ruler above it, the widget panel unfolded at the
bottom.](captures/editeur-paysage.png)

*A page from the test backup, drawn to the geometry of an AIR³ 7.2. Nothing shares the
width with it: the widget panel goes underneath. **One single screenshot for all five
languages**: what it shows — the drawn page, the graduated ruler, the bed it rests on —
is the same in every one of them, so it is kept in French.*

## The problem

Setting up your pages with a fingertip, on a seven-inch screen resting on your knees,
takes hours. XCTrack can neither copy a page nor duplicate it to change 10% of it — it is
the most-voted request on its tracker since 2018. And nothing lets you see what a page
will look like before you are in the air.

External editors do exist. The first objection a pilot raises against them, spelled out
on the forum in July 2026, is this one:

> “will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting.”

That is the right question. This project is built around its answer.

## Byte-for-byte fidelity, and exactly what it guarantees

**A file opened and then exported again without a change comes back out with the same
SHA-256 hash.** Not “equivalent”, not “functionally identical”: the same file, byte for
byte.

And when you do change something, **only what you changed changes**. Moving a widget
rewrites its four coordinates and nothing else; the rest of the file — the other 78,000
bytes — comes out untouched.

This is not engineering elegance, it is what makes the tool usable:

- **Your specific settings survive, including the ones the editor does not understand.**
  The `.xcfg` format is undocumented and gains keys with every XCTrack release. An editor
  that rebuilds the file from what it managed to read **silently loses the rest**. This
  one carries unknown keys through exactly as they are.
- **Numbers keep their written form.** `3.0` does not become `3`, `1.0E7` does not become
  `10000000`, `-0.0` does not become `0`, an integer beyond 2^53 is not rounded, and a
  negative Android colour stays negative. A plain `JSON.parse` + `JSON.stringify`
  destroys all five cases — that is the central trap of this format.
- **Key order, duplicate keys and raw UTF-8 are preserved**, because XCTrack writes them
  that way and a reordered file is no longer the same file.

This guarantee is not a promise: it is **proved by the tests**, on a versioned corpus of
files that anyone can run (`npm test`). That is deliberate — a fidelity promise only the
author can check is worth nothing.

## What the tool can do

- **Open** a `.xcfg` or an `.xczfg` (the ZIP archive XCTrack writes when you export “with
  media”). The archive does not always hold an extra file: the strip says what yours holds,
  and how many it carries.
- **Draw the pages** to the geometry of the instrument, on eight screen templates
  (AIR³ 7.2, 7.3, 7.35, and five common ratios), in landscape and in portrait.
- **Flag what is wrong** before you discover it in flight. Seven rules, sorted into the
  two blocks of the overview — only one of them, the two road maps, rises into the
  unfolded block, because a rule belongs there only if it is **both serious and
  established**. Each one says what it is worth:

  - a widget that no press can reach, **covered by the widgets drawn after it** — the
    union of several, none of which covers it on its own, counts too, and so does a
    transparent cover. **This is a hypothesis**: what is measured is that no click
    reaches it while editing; the routing of a press *in flight* has never been observed,
    and that is precisely what matters for a button. The rule **keeps quiet** when the
    geometry warning has already flagged the same arrangement: one problem said twice is
    worth less than once;
  - a page that will never be displayed — the one no navigation type activates, the only
    one a trial on the AIR³ confirmed is skipped when you scroll;
  - several thermal assistant pages in the same orientation, only one of which receives
    the automatic switch to spiralling. **Which one is a guess**: no survey in this
    repository settles it, and no file in the corpus carries two, so nothing has ever
    shown it;
  - a widget **perhaps** too small to be read at arm's length — the threshold comes from
    a standard and applies to the physical size of the **screen template chosen**, but
    the ratio between widget height and text height remains **an assumption owned as
    such**, for want of a measurement campaign on the device;
  - two road maps on the same page;
  - a Pro widget in a file that declares no licence — that one is **a question, not a
    finding**: what XCTrack does with it has never been checked on the device, and the
    rule says so;
  - and a setting written by an earlier release of XCTrack.

  **Four of these seven are guesses**, and present themselves as such: never in the alert
  block, title suffixed “to be confirmed on the instrument”, explanation opening with
  “this is not a measured finding but a question”. The tool **flags, it never corrects on
  its own**.

  What was **removed** on 22 August 2026, and why it is said here: the tool used to mark
  certain pages “hidden outside flight” from their **class** (`WPCompetition`,
  `WPThermalAssistant`) and announced “on the ground, the device shows only 3 of 5”. A
  trial on an AIR³ 7.2 showed the opposite — the thermal assistant page does come back
  into the scroll on the ground, and the only page skipped is the one no navigation
  activates. The mark and the count are gone; what really decides, the `navigations` key,
  is read page by page in “Manage the pages”.

  What was **added** on 22 August 2026, for the same reason: the finding comes down onto
  the **open page**. A test pilot had placed a widget on a dead page with nothing warning
  him — the diagnosis lived in a folded list on the overview and in a side window, never
  on the screen where you work. A discreet band now says **why this particular page** will
  not be shown, and it tells three reasons apart, because they are not repaired the same
  way:

  - the page carries XCTrack's **“Disabled”** setting — the measured case, the one paging
    skips;
  - its **list of navigations is empty** — same consequence, different writing, never
    observed on the device, and the tool says so;
  - the **general settings hold the screen** in the other orientation
    (`Display.Orientation`): every page of that orientation is out of reach, whatever its
    navigations.

  The first two are repaired here: “Enable for all navigations” writes the value XCTrack
  itself writes when all five navigations are active, on the open page as in “Manage the
  pages”, with undo. **Choosing which ones** remains the instrument's business: its
  five-icon box is not reproduced, and writing a list we could not compose would be worse
  than offering nothing. The third is not repaired on the page — it is a setting for the
  whole instrument — and the editor merely says where it lives.
- **Edit**: move, resize, add, delete and reorder widgets; set their options; manage the
  pages (insert, duplicate, delete, reorder, reopen a page no navigation activates).
  Undo / redo.
- **Set the general settings** — the 217 preferences that live outside the pages: units,
  buttons, sensors, sound, airspaces. In the tree of the 23 lines of the instrument's
  menu. In view-only mode, **no form control is built at all**; in editing mode, 77 of
  the 93 lines presented can be set — checkbox, list, slider, number, text, colour — with
  undo and redo like everything else. The other sixteen, the nested JSON value and
  everything the page cannot name are still shown **without a control**, each saying why.
- **Write, remove, restore: three gestures around the factory value**, and they are not
  equivalent — neither to one another, nor depending on the screen you make them on.

  What an **absent** key means is not the same thing on the two sides, and it is measured
  on both. On a **widget**, XCTrack fills in on re-reading the options a file does not
  carry: the factory value applies implicitly (observed on the board of 75 widgets). In
  the **general settings**, it does not: on a “Replace everything” import, the device
  keeps the setting it already has, and a key absent from the file is not touched —
  measured on the AIR³, `Display.Theme` removed from a backup and then re-imported, with
  a control witness in the same round. On a device that has never touched it, the factory
  value necessarily applies: that is a deduction, not a measurement, and the two other
  import modes have not been tested.

  - **“Set this value”** on a widget panel, **“Write this value”** in the general
    settings, writes into the file a factory value that is not there. On both screens. On
    a widget, it changes nothing about what the device does today, and it puts the
    setting out of reach of an XCTrack update that would change that factory value. On a
    general preference, that holds for a device that has never set it — and is false for
    a device already set, whose value the import will replace.
  - **“Remove from the file”** silences the file on a setting: a written value that **already** equals
    the factory value disappears. General settings only, and only in that one state —
    silencing the file on a value you chose would deprive the backup of a deliberate
    setting, and a discreet button must not do that in one click. It is **not** a return
    to the factory value: the device will keep its own.
  - **“Restore the factory value”** replaces a value you chose with the one a fresh
    XCTrack applies. On both screens as well. **It is the only one of the three that
    erases a deliberate setting** — the other two only touch values that already equalled
    the factory one, or that were not written at all. So it does not reveal itself on
    hover: it takes its own line under the setting, shows both values side by side
    *before* the click, and says which XCTrack release the factory value was surveyed on
    as soon as that is not the file's own. It **writes** the factory value rather than
    erasing the key: the line then moves to the factory state, from where “Remove
    from the file” becomes available. Two deliberate clicks, two separate effects.

  No button where the factory value has not been surveyed, where XCTrack computes it at
  start-up, where it publishes two that contradict each other (`Sensors.ManualQnh`: 1013
  and 1013.25), nor where the survey gives only a compound value
  (`{"theme": …, "terrain": …}`) — writing a guessed value would be worse than offering
  nothing.
- **Diagnose the version gap**: you choose your XCTrack release **by its name** — the one
  your device shows, “1.0.3-beta” — among the 46 entries our survey tells apart, and the
  tool starts from the one the file declares itself, already preselected. It then shows
  what the file carries that this release no longer reads, and what that release expects
  and the file does not have. Since several releases often accept exactly the same
  settings, the tool **names the ones its survey cannot tell apart from yours**: choosing
  between two neighbours has no effect, and it is better to say so than to leave you
  guessing. The diagnosis **states facts** — eight families of gap, each with its course
  of action — and carefully distinguishes what is measured from what is not: a setting
  withdrawn by XCTrack, a hole in our own survey, and a setting we are blind to do not
  call for the same course of action.
- **Remove the settings an older release left behind** — and nothing else. XCTrack only
  re-reads a page when it displays it: a 2026 backup still drags along switches from 2023,
  on pages it has never shown.
  This is the only place where the tool offers **of its own accord** to take something
  out of the document, and the sorting is deliberately narrow: a setting is offered only
  when a real file attests to it — the screen calls it **outdated**. A hole in our
  reading of the releases — the setting did exist, our extraction is what missed it — or
  a setting the survey has never seen are called **blind spot** and **unknown**, and are
  **never** offered; even an outdated setting we cannot say since when it stopped being
  used stays in place, because we do not offer to delete what we would not be able to
  explain. Removing nothing breaks nothing, removing wrongly breaks a flight
  configuration: the whole sorting is built on that imbalance.

  Measured on the reference backup of the corpus
  (`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, written by XCTrack 1.0.3-beta):
  **6 settings offered and 3 left in place, across 4 widgets, out of 1,059 widget settings
  examined.** You see the list — each setting with the last XCTrack release that still
  wrote it, and what the device read back with it and without it — you
  untick what you would rather keep, you act with one explicit gesture, and you can go
  back on it right afterwards: put back, the file comes out **byte for byte**. The
  cleanup sits under the version diagnosis, and only in editing mode.

  ⚠️ **A third lock, and it is the most recent one.** *Outdated* means *replaced since*,
  never *without effect*: XCTrack only re-reads a page when it displays it, and when it
  does read it at last, it does not throw these settings away — it first derives its
  present-day settings from them (`showWind` becomes `windStyle`, `mapWidget_showTerrain`
  becomes the terrain shading) and only then erases them. A file that still carries them
  is therefore, by construction, a file the instrument **has not read yet**: which is
  exactly where the cleanup bites. Measured on an AIR³ 7.2 on 22 August 2026 — three
  compasses differing only by `showWind`: removing that setting when it is set to *yes*
  takes the widget from the wind arrow to nothing at all. So a removal is only offered
  when a round trip on the device has shown that the instrument derives **the same thing**
  with and without it (`src/catalog/legacyMigrations.json`, a dated and bounded survey).
  The others are named and left in place, each with its reason **written in plain words in
  the panel where you decide** — “the wind arrow would disappear from this compass” — and
  the measurement right below, in the words the device wrote. There is nothing for the
  pilot to do: they will go on their own.
- **Say what your file reveals about you** before you share it. A `backup` export carries
  your name, your glider, your paired sensors, your waypoint files — down to the name of
  the competition you are flying. So when you save, the tool offers **three outcomes**,
  ordered by how much travels — going down a step always means “giving less”:

  1. **“Your configuration, exactly as it is”**, given back byte for byte;
  2. **“All your settings, minus what identifies you”** — a whole backup, whose lines
     that identify you are replaced, removed, or kept and said to be kept. This is the
     one that lets you ask for help with your vario settings without publishing your
     name;
  3. **“Shareable version, no personal data”** — a `pages` export, with no preference at
     all.

  Each outcome carries its inventory: every line touched, where it sits and why, shown
  *before* the download. The name of the file produced is timestamped and **keeps nothing
  of the original name**, which often contains a first name.
- **Store several configurations under a name**, inside your browser, and come back to
  one of them: one for competition, one for hike-and-fly, one for the school. The bytes
  stored are those of your file, checked by hash when read back. Nothing is sent
  anywhere. Each entry carries a **thumbnail** — the first landscape page your device
  really shows, the one no navigation ever brings up being skipped since you never see it;
  portrait if there is no landscape. The “Identity card” shows it large under the
  “Preview” heading. Two things follow, worth knowing before you store a real
  configuration: **your own texts are masked there** — custom titles, free text, call card
  become grey bars, the widget's frame and place left intact, because an image escapes the
  anonymisation, which only works on the file; and **the library archive carries no
  thumbnail**, neither the image nor the line announcing it, an import believes none, the
  editor rebuilds them here. An entry without one — stored before the feature, back from an
  archive, unreadable — shows a quiet surface, without a word.
- **Speak your language, along two axes that must not be confused.** *Our* prose — the
  interface, the manual, this README — exists in five languages: French, English, Dutch,
  German, Spanish. The names and descriptions *of XCTrack* are the application's own,
  extracted from the APK — 33 languages for the widgets, 34 for their options, 35 for the
  labels of the general settings — and they follow the language of the file you opened;
  only for a file that declares none do they take that of the interface. Those three
  figures are not a choice of ours: they are what the APK carries.
- **Explain itself on the spot**: a user manual in thirteen chapters opens from the
  welcome screen and from the “File” menu, without leaving the page — **in all five
  languages**, and only the one on display is downloaded. It is written for a pilot, not
  for a computer person, and it opens on what you must above all not do — send your
  backup as it is.

### In pictures

*All screenshots are taken on the anonymised fixtures in `tests/fixtures/`, never on a
real configuration — a map on screen can give away a home address to within a building.
The recipe for each one is written as an HTML comment right below it in the French
[`README.md`](README.md), so that people dare to retake it when a screen changes.*

*The six screenshots below exist **in five copies**, one per language, because the text
is what they are about: this README shows the English ones. The widget and setting names
you read on them follow **the language of the open file** whenever it declares one — that
is the separation of the two axes, and it is plain to see on the general-settings screen,
whose fixture declares French.*

![The settings panel of the “Airspace proximity” widget, in editing mode: three “Restore the
factory value” lines showing both values side by side, and at the bottom the block for
the setting this widget does not write, with its “Set this value”
button.](captures/panneau-gadget.en.png)

*A widget panel, and the two factory-value gestures it offers: restore what you set, or
pin down what the file does not say.*

![The “Intégration Android” screen of the general settings, in editing mode: “Remove
from the file” lines carrying a “factory value” pill, “Restore the factory value” lines carrying an amber
“set by you” pill, and two “Write this value” lines marked “missing from the
file”.](captures/reglages-generaux.en.png)

*The general settings, in the tree of the instrument's menu — and the three factory-value
gestures brought together on one screen. This is also where the two language axes show
best: the fixture declares French, so the setting names stay French in all five copies —
only our own prose changes.*

![The “Target version and compatibility” dialog: release 1.0.3-beta preselected, the
sentence about indistinguishable releases, the “Outdated settings” block and its nine
lines, and the “Remove what an older release left behind” section unfolded on its six
tickboxes, followed by the three settings left in
place.](captures/version-et-nettoyage.en.png)

*The version choice, the diagnosis, and the cleanup it opens — six settings offered and
three left in place, across four widgets.*

![The “Save this configuration” box: the three outcomes, then the inventory of the five
replaced texts — each with its page, its widget, the old value struck through, the new
one, and the reason for the replacement.](captures/enregistrer-et-partager.en.png)

*When you save, what the file reveals and what can be replaced — shown before the
download, not after.*

![The “Configuration library” box: two stored configurations, each with its thumbnail, its
size and its count of personal items; on the first, the texts you wrote are replaced by
grey bars. At the foot, “Erase the whole library”.](captures/bibliotheque.en.png)

*The library lives in your browser, and nothing leaves it. Each entry says what it
carries that is personal and what would travel with the pages; its thumbnail masks your
texts with grey bars, because an image escapes the anonymisation. And “Erase the whole
library” sits at the foot of the list, not hidden away in a setting.*

![The user manual as a full page: its thirteen chapters listed on the left, and on the
right a boxed warning “Read this before giving your file to anyone”, then the beginning of
chapter 1.](captures/manuel.en.png)

*The manual takes up a page as wide as the editor. It starts with the warning rather than
with the guided tour, and its contents stay on the left throughout the reading — with the
chapter you are in marked by a rule.*

## What it cannot do, and what remains uncertain

Better said straight away.

- **The `.xcfg` format is undocumented.** Everything the tool knows about it comes from
  observing a corpus of real files (2022 → 2026) and from reading the application. The
  schema changes with every XCTrack release: what is true today may stop being true
  tomorrow. That is precisely why the tool is built to **carry through what it does not
  understand** rather than to model the format.
- **The rendering is an imitation, not the device.** Widget drawings are reconstructed
  from what was observed on an **AIR³ 7.2** — one device, one XCTrack release. The values
  displayed are fixed examples: nothing is simulated. A widget whose drawing has not been
  reproduced is shown in an honest generic shape rather than in a misleading
  approximation.
- **No synchronisation with the instrument.** The round trip goes by SD card or by cable,
  by hand.
- **No suggestions, no automatic corrections.** The tool does not rearrange your pages
  and does not decide for you. The cleanup of outdated settings is no exception: nothing
  goes without you having seen the list and clicked.
- **No community library, no account, no server.** That is a choice: what does not exist
  cannot leak. The configuration library lives **in your browser** (IndexedDB) and only
  leaves it if you export it yourself; clearing the site data erases it, and another
  device does not see it.
- **Not everything can be set in the general preferences.** The nested JSON of the
  `preferences` section (`Sounds`, `Navigation.State`, `Sensors.Configuration`,
  `Sound.AcousticVario.CustomProfile`) comes back out untouched, never rewritten; the
  sixteen lines that open a dialog on the device — the fifteen buttons, the acoustic
  vario table — cannot be set here, for want of knowing their domain; and the eight
  `Unit.*`, whose list XCTrack fills in code, get a text field rather than an invented
  list.
- **One of the seven screenshots exists in French only.** The interface, the manual and
  this README are translated into French, English, Dutch, German and Spanish
  (`src/i18n/`), and six of the seven screenshots follow — each README shows its own. The
  seventh, the whole editor, has a single copy: what it is about is a drawn page, a
  graduated ruler and the bed they rest on, identical in all five languages. Its caption
  says so. XCTrack's own labels — widget names, option names, preference names — do not
  follow the interface language choice but **that of the file**; only failing that, when
  the file declares none, do they take the interface language. These are two distinct
  axes, and confusing them would make a Czech pilot read widget names in English while
  the instrument shows them in Czech. The general-settings screenshot shows it: its
  fixture declares French, so its setting names stay French in all five languages.

## Giving feedback, reporting what is wrong

The tool is written for pilots, and it only improves through what they say about it.
**Feedback goes through GitHub issues:**

**<https://github.com/frederict/xcfg-editor/issues>**

Everything helps: a badly drawn widget, a setting the editor does not show, an obscure
word, an XCTrack release missing from the list, a file that refuses to open — and, now
that the interface exists in five languages, **a translation that rings false or that
names a button differently from the screen**. Saying which device, which XCTrack release
and what you expected saves a great deal of time.

**Write in your own language** — English, French, Dutch, German or Spanish. There is no
need to switch to English to report something.

⚠️ **Never attach your own `.xcfg`.** It carries your name, your sensors, your waypoint
files, sometimes your contact details — and a GitHub issue is public, and forever. If a
file is indispensable to understand the problem, first produce a cleaned version with the
tool itself (the save button), and read through the inventory it shows you before sending
anything at all. Which one to choose depends on your question: **“Shareable version, no
personal data”** if it is about a page, **“All your settings, minus what identifies
you”** if it is about a general setting — vario, sensors, units.

## Installing and running

You need Node.js 22 or newer.

```bash
git clone https://github.com/frederict/xcfg-editor.git
cd xcfg-editor
npm ci
npm run dev          # http://localhost:5173
```

To build the static version:

```bash
npm run build        # produces dist/
npm run preview      # serves dist/ locally
```

`dist/` is a fully static site with no runtime dependency: it drops onto any file host,
including into a subdirectory.

## Contributing: the documentation lives in the French README

Everything a contributor needs — the test conventions, the test corpus, how to regenerate
the XCTrack release database, the general-preferences catalogue, the version dimension of
the preferences, and the domains the screens do not carry — is in
**[`README.md`](README.md)**, in French, and only there.

That is a deliberate decision, not a gap. **The code and its comments are written in
French**: whoever contributes to the code reads French anyway. A translation of those
sections would drift away from the code without anyone noticing, and documentation that
is wrong is worse than documentation that is missing — it wastes time with authority.

## Licence

MIT — see [LICENSE](LICENSE).

XCTrack is an application by [XContest](https://xcontest.org/). This project is neither
affiliated with XContest nor with Air3, nor endorsed by them.
