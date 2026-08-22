import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { exportContainer, openContainer } from '../../src/core/container'
import { sha256Hex } from '../../src/library/digest'
import { PAGES_EXPORT_TYPE } from '../../src/model/scope'
import { NEUTRAL_PHONE_NUMBER } from '../../src/model/sharing'
import { readLayout } from '../../src/model/layout'
import { moveWidgetBy } from '../../src/model/mutations'
import {
  anonymousCosts,
  backupCosts,
  describeLocation,
  displayedReplacement,
  droppedRootKeyLabel,
  FIDELITY_MODIFIED,
  FIDELITY_MODIFIED_DETAIL,
  FIDELITY_UNCHANGED,
  FIDELITY_UNCHANGED_DETAIL,
  planSharing,
  renderSharingDialog,
  sharingBytes,
  type SharingExtra,
  type SharingForm,
  type SharingResult,
  type SharingSource
} from '../../src/ui/sharingDialog'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'
import englishMessages from '../../src/i18n/messages/en'
import spanishMessages from '../../src/i18n/messages/es'
import dutchMessages from '../../src/i18n/messages/nl'
import { ARCHIVE, BACKUP_2026, FORMES_PRESERVEES, PAGES_2026 } from '../fixtures/paths'

/**
 * L'interface d'export partageable, éprouvée sur les fichiers réels du corpus.
 *
 * Trois choses seulement sont vérifiées ici, parce que ce sont les trois seules qui
 * puissent tromper un pilote :
 *
 * 1. **l'inventaire dit vrai** — chaque texte remplacé est montré avec son emplacement,
 *    sa valeur d'origine et la valeur posée, et aucune valeur d'origine ne survit dans le
 *    document produit ;
 * 2. **l'export ordinaire reste à l'octet près** — ouvrir, ouvrir la boîte, renoncer,
 *    exporter : même empreinte SHA-256 qu'à l'entrée. C'est la promesse du projet, et une
 *    boîte de dialogue qui la casserait la casserait en silence ;
 * 3. **le nom produit ne reprend rien du nom d'origine**, et il diffère selon l'issue.
 *
 * Depuis la troisième issue — la sauvegarde entière dont les données personnelles sont
 * remplacées — une quatrième s'y ajoute : **les trois choix se distinguent**, par leur
 * titre, par le nom du fichier produit et par le volet qui montre ce que chacun fera. Un
 * pilote qui confondrait `backup-anon` et `pages-anon` écraserait les préférences de son
 * destinataire, ou lui enverrait un fichier qui ne peut pas répondre à sa question.
 */

/** Le moment que porteront tous les noms de ce fichier : figé, sans quoi rien n'est stable. */
const WHEN = new Date(2026, 7, 21, 15, 32, 7)

/**
 * Le traducteur de **notre prose**, en français : c'est la langue d'écriture, et donc la
 * seule dont les phrases se vérifient au caractère près ici. Les quatre autres sont
 * gardées par `tests/i18n/catalog.test.ts` — repères, formes, coïncidences, vocabulaire.
 */
const tr = makeTranslator('fr', frenchMessages)

/** Les phrases qui étaient des constantes exportées, et qui sont maintenant des messages. */
const ANNEXES_NOTE = tr.t('sharing.annexesNote')
const BACKUP_RESIDUAL_NOTE = tr.t('sharing.backupResidualNote')
const RESIDUAL_NOTE = tr.t('sharing.residualNote')
const SUSPECTS_NOTE = tr.t('sharing.suspectsNote')
const SUSPECTS_NONE_NOTE = tr.t('sharing.suspectsNoneNote')
const ANONYMOUS_COSTS = anonymousCosts(tr)
const BACKUP_COSTS = backupCosts(tr)

function readSource(file: string): ReturnType<typeof parseJson> {
  return parseJson(readFileSync(file, 'utf8'))
}

function shortName(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1)
}

/* ============================================================ le plan, hors interface */

describe('planSharing — trois issues, trois noms', () => {
  it('l’export ordinaire garde l’extension d’origine et ne reprend pas le radical', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: '2022-02-08_marie_ok.xcfg', kind: 'xcfg' },
      WHEN
    )
    expect(plan.plainFileName).toBe('xctrack_2026-08-21-153207_backup.xcfg')
    // Le prénom du nom d'origine ne doit reparaître nulle part.
    expect(plan.plainFileName).not.toContain('marie')
  })

  it('l’archive garde son extension sur le chemin ordinaire', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: 'sauvegarde.xczfg', kind: 'xczfg' },
      WHEN
    )
    expect(plan.plainFileName).toBe('xctrack_2026-08-21-153207_backup.xczfg')
  })

  it('l’export anonymisé se déclare « pages », porte la marque, et sort en .xcfg nu', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: 'sauvegarde.xczfg', kind: 'xczfg' },
      WHEN
    )
    expect(plan.pages.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
    expect(plan.pages.derived).toBe(true)
  })

  it('un export « pages » n’a aucune préférence à retirer', () => {
    const plan = planSharing(
      { document: readSource(PAGES_2026), fileName: shortName(PAGES_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.exportType).toBe('pages')
    expect(plan.pages.droppedRootKeys).toEqual([])
    expect(plan.pages.derived).toBe(false)
    expect(plan.pages.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
  })

  it('un « backup » perd ses deux sections, et l’interface sait les nommer', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.pages.droppedRootKeys).toEqual(['airspaceSelectedChannels', 'preferences'])
    for (const key of plan.pages.droppedRootKeys) {
      expect(droppedRootKeyLabel(key, tr).length).toBeGreaterThan(20)
    }
    // Le repli nomme une clé inconnue sans prétendre savoir ce qu'elle contient.
    expect(droppedRootKeyLabel('cléFuture', tr)).toContain('cléFuture')
  })

  it('la source n’est pas touchée par le calcul du plan', () => {
    const text = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(text)
    planSharing({ document, fileName: shortName(BACKUP_2026), kind: 'xcfg' }, WHEN)
    expect(serializeJson(document)).toBe(text)
  })
})

/* ============================================== l’inventaire sur la fixture au téléphone */

describe('l’inventaire montre ce qui part — formes-preservees.xcfg', () => {
  const plan = planSharing(
    { document: readSource(FORMES_PRESERVEES), fileName: 'formes-preservees.xcfg', kind: 'xcfg' },
    WHEN
  )

  it('le numéro de téléphone et le nom du contact y figurent, avec leur emplacement', () => {
    const phone = plan.pages.replacements.find((r) => r.keyPath === 'contact/phoneNumber')
    expect(phone).toBeDefined()
    expect(phone!.text).toBe('+32 470 00 00 00')
    expect(phone!.replacement).toBe(NEUTRAL_PHONE_NUMBER)
    expect(phone!.orientation).toBe('landscape')
    expect(phone!.pageRank).toBe(1)
    expect(phone!.widgetRank).toBe(2)
    expect(describeLocation(phone!, 'fr', tr))
      .toBe('Paysage · page 1 · gadget 2 · Bouton téléphone')

    const contact = plan.pages.replacements.find((r) => r.keyPath === 'contact/fullName')
    expect(contact!.text).toBe('Jean Exemple')
    expect(contact!.replacement).toBe('Contact 1')
  })

  it('les quatre textes du fichier sont inventoriés, dans l’ordre du fichier', () => {
    expect(plan.pages.replacements.map((r) => r.keyPath)).toEqual([
      'text', 'titletext', 'contact/fullName', 'contact/phoneNumber', 'titletext'
    ])
    // Le titre portrait est bien rattaché à sa page, pas à celle du paysage.
    const last = plan.pages.replacements.at(-1)!
    expect(last.orientation).toBe('portrait')
    expect(last.text).toBe('Sol')
  })

  it('chaque entrée porte une raison en français, prête à afficher', () => {
    for (const entry of plan.pages.replacements) {
      expect(entry.reason.length).toBeGreaterThan(30)
      expect(entry.reason).toMatch(/remplacé|remise|remis/)
    }
  })

  it('aucune valeur d’origine ne survit dans le document produit', () => {
    const produced = serializeJson(plan.pages.document)
    for (const entry of plan.pages.replacements) {
      expect(produced).not.toContain(entry.text)
    }
    expect(produced).not.toContain('Jean Exemple')
    expect(produced).not.toContain('+32 470')
    // Ni les préférences, qui partent avec le format.
    expect(produced).not.toContain('Amélie Exemple')
    expect(produced).toContain(`"exportType": "${PAGES_EXPORT_TYPE}"`)
  })

  it('la chaîne vide posée se dit « (vide) » plutôt que de disparaître', () => {
    expect(displayedReplacement('', tr)).toBe('(vide)')
    expect(displayedReplacement('Titre 1', tr)).toBe('Titre 1')
  })
})

/* ===================================================== les annexes d’une archive */

describe('les annexes d’une archive ne partent pas dans l’anonymisé', () => {
  const EXTRAS: SharingExtra[] = [
    { name: 'media/decollage.jpg', byteLength: 1_482_112 },
    { name: 'media/logo.png', byteLength: 3_204 }
  ]

  const plan = planSharing(
    {
      document: readSource(BACKUP_2026),
      fileName: '2026-08-20_backupwithmedia-00.xczfg',
      kind: 'xczfg',
      extras: EXTRAS
    },
    WHEN
  )

  it('elles sont inventoriées, pas passées sous silence', () => {
    expect(plan.pages.droppedExtras).toEqual(EXTRAS)
    expect(ANNEXES_NOTE).toContain('.xcfg')
    expect(ANNEXES_NOTE).toContain('métadonnées')
  })

  it('le fichier anonymisé est un .xcfg nu', () => {
    expect(plan.pages.fileName.endsWith('.xcfg')).toBe(true)
    expect(plan.pages.fileName).not.toContain('.xczfg')
  })

  it('l’archive réelle du corpus n’en porte aucune, et le plan le dit', async () => {
    const bytes = new Uint8Array(readFileSync(ARCHIVE))
    const container = await openContainer(bytes, shortName(ARCHIVE))
    const real = planSharing(
      {
        document: container.document,
        fileName: container.fileName,
        kind: container.kind,
        extras: container.extras.map((e) => ({ name: e.name, byteLength: e.data.byteLength }))
      },
      WHEN
    )
    expect(real.pages.droppedExtras).toEqual([])
  })
})

/* ================================================== ce que l’anonymisation coûte */

describe('le coût pour le destinataire est écrit, pas sous-entendu', () => {
  it('les six pertes sont nommées', () => {
    const text = ANONYMOUS_COSTS.join(' ')
    for (const word of ['unités', 'thème', 'vario', 'espaces aériens', 'Livetracking', 'capteurs']) {
      expect(text).toContain(word)
    }
  })

  it('la limite de la garantie est dite au lieu d’être tue', () => {
    expect(RESIDUAL_NOTE).toContain('onze')
    expect(RESIDUAL_NOTE).toContain('en clair')
  })
})

/* ================================================================== la boîte, dans le DOM */

function open(
  source: SharingSource,
  onConfirm: (r: SharingResult) => void,
  onCancel?: () => void
): ReturnType<typeof renderSharingDialog> {
  const handle = renderSharingDialog({ source, tr, now: () => WHEN, onConfirm, onCancel })
  handle.open()
  return handle
}

function radios(handle: { element: HTMLDialogElement }): HTMLInputElement[] {
  return [...handle.element.querySelectorAll<HTMLInputElement>('.sharing__radio')]
}

/**
 * Coche l'une des trois issues, **par son nom** et non par son rang : l'ordre des cartes
 * est une décision d'interface, et un test qui l'épingle par un indice numérique se
 * casserait au premier réagencement sans rien avoir mesuré.
 *
 * Les boutons radio ne vivent pas dans un `<form>` — une boîte modale n'en a pas besoin —
 * et la décoche mutuelle n'est donc pas garantie par l'environnement de test : on la fait
 * à la main, comme le ferait le navigateur.
 */
function choose(handle: { element: HTMLDialogElement }, form: SharingForm): void {
  const inputs = radios(handle)
  for (const input of inputs) input.checked = false
  const chosen = inputs.find((input) => input.value === form)!
  chosen.checked = true
  chosen.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Le volet d'une issue : celui qui montre ce qu'elle fera, avant qu'elle le fasse. */
function panel(handle: { element: HTMLDialogElement }, form: SharingForm): HTMLElement {
  return handle.element.querySelector<HTMLElement>(`.sharing__detail--${form}`)!
}

describe('la boîte : ce que le pilote voit et ce qu’il décide', () => {
  it('elle reprend le meuble des autres modales, tête collante comprise', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    expect(handle.element.tagName).toBe('DIALOG')
    expect(handle.element.classList.contains('modal')).toBe(true)
    expect(handle.element.classList.contains('modal--sharing')).toBe(true)
    expect(handle.element.querySelector('.modal__head')).not.toBeNull()
    expect(handle.element.querySelector('.modal__head .btn')?.textContent).toBe('Fermer')
    expect(handle.element.querySelector('.modal__box')).not.toBeNull()
    handle.close()
  })

  it('l’export ordinaire est la position par défaut : anonymiser se demande', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    const [plain, backup, pages] = radios(handle)
    // Trois issues, dans l'ordre de ce qui part : tout, tout sauf vous, les pages seules.
    expect([plain!.value, backup!.value, pages!.value]).toEqual(['plain', 'backup', 'pages'])
    expect(plain!.checked).toBe(true)
    expect(backup!.checked).toBe(false)
    expect(pages!.checked).toBe(false)
    // Aucun inventaire ne s'affiche tant qu'une issue anonymisante n'est pas choisie.
    expect(panel(handle, 'backup').hidden).toBe(true)
    expect(panel(handle, 'pages').hidden).toBe(true)
    handle.close()
  })

  it('le focus initial se pose sur le premier choix, jamais sur « Enregistrer »', () => {
    // Cette boîte décide du sort de données personnelles, et l'option cochée par défaut
    // est celle qui les emporte toutes (« l’export ordinaire est la position par
    // défaut », juste au-dessus). Un clavier qui presse Entrée par réflexe à
    // l'ouverture ne doit pas déclencher l'enregistrement avant d'avoir vu le choix.
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    const [plain] = radios(handle)
    expect(document.activeElement).toBe(plain)
    const confirm = [...handle.element.querySelectorAll<HTMLButtonElement>('.btn')]
      .find((button) => button.textContent === 'Enregistrer')
    expect(document.activeElement).not.toBe(confirm)
    handle.close()
  })

  it('le nom accessible d’un choix ne traîne pas le détail replié « Pour les curieux »', () => {
    // La carte entière est l'étiquette du bouton radio (cible large, pensée pour un
    // pilote ganté) et porte un `<details>` imbriqué. Sans nom explicite, un lecteur
    // d'écran annoncerait tout le contenu de la carte à chaque passage — et le détail
    // technique une fois déplié, ce qui grandirait le nom à chaque interaction.
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    const [plain, backup, pages] = radios(handle)
    expect(plain!.getAttribute('aria-label')).not.toContain('Pour les curieux')
    expect(plain!.getAttribute('aria-label')).toContain('Votre configuration, telle qu’elle est')
    expect(backup!.getAttribute('aria-label'))
      .toContain('Tous vos réglages, sans ce qui vous désigne')
    expect(pages!.getAttribute('aria-label'))
      .toContain('Version partageable, sans données personnelles')
    handle.close()
  })

  it('choisir la version partageable montre l’inventaire et change le nom annoncé', () => {
    const handle = open(
      { document: readSource(FORMES_PRESERVEES), fileName: 'formes-preservees.xcfg', kind: 'xcfg' },
      () => {}
    )
    const nameLine = (): string => handle.element.querySelector('.modal__name')!.textContent ?? ''
    expect(nameLine()).toContain('xctrack_2026-08-21-153207_backup.xcfg')

    choose(handle, 'pages')
    expect(panel(handle, 'pages').hidden).toBe(false)
    expect(nameLine()).toContain('xctrack_2026-08-21-153207_pages-anon.xcfg')

    const shown = handle.element.textContent ?? ''
    expect(shown).toContain('Jean Exemple')
    expect(shown).toContain('+32 470 00 00 00')
    expect(shown).toContain(NEUTRAL_PHONE_NUMBER)
    expect(shown).toContain('Paysage · page 1 · gadget 2')
    handle.close()
  })

  it('le mot affiché est « gadget », jamais « widget »', () => {
    const handle = open(
      { document: readSource(FORMES_PRESERVEES), fileName: 'formes-preservees.xcfg', kind: 'xcfg' },
      () => {}
    )
    choose(handle, 'pages')
    const shown = handle.element.textContent ?? ''
    expect(shown).toContain('gadget')
    expect(shown.toLowerCase()).not.toContain('widget')
    handle.close()
  })

  it('confirmer sans anonymiser ne rend aucun document : les octets d’origine partent', () => {
    let result: SharingResult | undefined
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xczfg' },
      (r) => { result = r }
    )
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()

    expect(result).toBeDefined()
    expect(result!.anonymized).toBe(false)
    expect(result!.document).toBeUndefined()
    expect(result!.kind).toBe('xczfg')
    expect(result!.droppedExtras).toEqual([])
    expect(sharingBytes(result!)).toBeUndefined()
    // La boîte s'est retirée d'elle-même.
    expect(handle.element.isConnected).toBe(false)
  })

  it('confirmer en anonymisant rend le document anonymisé et ses octets', () => {
    let result: SharingResult | undefined
    const handle = open(
      { document: readSource(FORMES_PRESERVEES), fileName: 'formes-preservees.xcfg', kind: 'xcfg' },
      (r) => { result = r }
    )
    choose(handle, 'pages')
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()

    expect(result!.anonymized).toBe(true)
    expect(result!.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
    expect(result!.kind).toBe('xcfg')
    const bytes = sharingBytes(result!)!
    const text = new TextDecoder().decode(bytes)
    expect(text).not.toContain('Jean Exemple')
    expect(text).not.toContain('Amélie Exemple')
    expect(text).toContain(NEUTRAL_PHONE_NUMBER)
  })

  it('renoncer — bouton, « Fermer » ou « Échap » — ne rend rien et retire la boîte', () => {
    for (const giveUp of [
      (h: { element: HTMLDialogElement }) => h.element.querySelectorAll<HTMLButtonElement>('.modal__actions .btn')[0]!.click(),
      (h: { element: HTMLDialogElement }) => h.element.querySelector<HTMLButtonElement>('.modal__head .btn')!.click(),
      (h: { element: HTMLDialogElement }) => h.element.dispatchEvent(new Event('cancel', { cancelable: true }))
    ]) {
      let confirmed = false
      let cancelled = false
      const handle = open(
        { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
        () => { confirmed = true },
        () => { cancelled = true }
      )
      giveUp(handle)
      expect(confirmed).toBe(false)
      expect(cancelled).toBe(true)
      expect(handle.element.isConnected).toBe(false)
    }
  })
})

/* ====================================== la preuve : l’export ordinaire reste à l’octet près */

describe('ouvrir la boîte, renoncer, exporter : la même empreinte', () => {
  for (const file of [BACKUP_2026, PAGES_2026, FORMES_PRESERVEES, ARCHIVE]) {
    it(`${shortName(file)} : le passage par l’interface ne change pas un octet`, async () => {
      const bytes = new Uint8Array(readFileSync(file))
      const container = await openContainer(bytes, shortName(file))
      expect(container.parseError).toBeUndefined()
      const before = await sha256Hex(bytes)

      let result: SharingResult | undefined
      const handle = open(
        {
          document: container.document,
          fileName: container.fileName,
          kind: container.kind,
          extras: container.extras.map((e) => ({ name: e.name, byteLength: e.data.byteLength }))
        },
        (r) => { result = r }
      )
      // On regarde tout, y compris l'inventaire, puis on renonce.
      choose(handle, 'pages')
      choose(handle, 'plain')
      handle.element.querySelectorAll<HTMLButtonElement>('.modal__actions .btn')[0]!.click()
      expect(result).toBeUndefined()

      // Le document en mémoire n'a pas bougé, et le conteneur n'est pas marqué modifié.
      expect(container.modified).toBe(false)
      expect(await sha256Hex(await exportContainer(container))).toBe(before)
    })
  }

  it('même après avoir confirmé l’export ordinaire, l’empreinte tient', async () => {
    const bytes = new Uint8Array(readFileSync(ARCHIVE))
    const container = await openContainer(bytes, shortName(ARCHIVE))
    const before = await sha256Hex(bytes)

    let result: SharingResult | undefined
    const handle = open(
      { document: container.document, fileName: container.fileName, kind: container.kind },
      (r) => { result = r }
    )
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()

    expect(sharingBytes(result!)).toBeUndefined()
    expect(await sha256Hex(await exportContainer(container))).toBe(before)
    expect(result!.fileName).toBe('xctrack_2026-08-21-153207_backup.xczfg')
  })
})

/* ================================================================ garde-fou sur la feuille */

/*
 * Même raison que `tests/ui/appStyle.test.ts` : happy-dom ne calcule pas la cascade d'une
 * feuille externe, et aucune sortie DOM ne distingue une tête collante d'une tête qui
 * défile. Le seul contrôle automatisable est la relecture de la règle — et l'inventaire
 * d'un fichier chargé déborde, donc « Fermer » doit rester atteignable.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, '../../src/ui/sharingDialog.css'), 'utf8')

describe('sharingDialog.css — la fermeture reste atteignable, les deux thèmes suivent', () => {
  it('la boîte défile et son rembourrage du haut appartient à la tête collante', () => {
    const start = css.indexOf('.modal--sharing .modal__box {')
    expect(start).toBeGreaterThan(-1)
    const rule = css.slice(start, css.indexOf('}', start) + 1)
    expect(rule).toContain('padding-top: 0;')
    expect(rule).toContain('overflow: auto;')
    expect(rule).toMatch(/max-height:\s*\d+vh;/)
  })

  it('aucune couleur en dur : tout passe par les variables du cadre', () => {
    // Le cadre est achromatique et suit `prefers-color-scheme` par ses seules variables.
    // Une valeur hexadécimale ou `rgb(` ici ne suivrait pas le thème sombre.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(declarations).not.toMatch(/\brgba?\(/)
  })
})

/* ================================== ce que la boîte a le droit de promettre sur les octets */

/**
 * ⚠️ **La phrase la plus dangereuse de toute l'interface**, parce qu'elle porte sur
 * l'argument central du projet et qu'elle s'affiche à l'instant où le pilote décide s'il
 * ose cliquer.
 *
 * Elle affirmait « le fichier part tel quel, à l'octet près » **dans les deux cas**. C'est
 * vrai d'un document intact, faux d'un document modifié : celui-là est sérialisé, ses
 * octets changent, son empreinte aussi. Un pilote qui aurait comparé les empreintes après
 * coup aurait cessé de croire le reste.
 *
 * Les deux formulations sont donc éprouvées **par la mesure**, pas par relecture : on
 * exporte réellement, dans les deux cas, et on compare les empreintes.
 */
describe('sharingDialog — les octets, dits juste dans les deux cas', () => {
  it('document intact : la garantie forte est vraie, et l’empreinte le prouve', async () => {
    const bytes = new Uint8Array(readFileSync(BACKUP_2026))
    const container = await openContainer(bytes, 'b.xcfg')
    expect(container.modified).toBe(false)

    const produced = await exportContainer(container)
    expect(await sha256Hex(produced)).toBe(await sha256Hex(bytes))

    const plan = planSharing(
      { document: container.document, fileName: 'b.xcfg', kind: 'xcfg', modified: false }, WHEN
    )
    expect(plan.modified).toBe(false)
    // « à l'octet près » a quitté l'interface : il a deux sens, tous deux vrais, et le
    // pilote n'a pas à trancher lequel. La promesse se dit en clair, la preuve se replie.
    expect(tr.t(FIDELITY_UNCHANGED)).toContain('sans une virgule réécrite')
    expect(tr.t(FIDELITY_UNCHANGED)).not.toContain('SHA-256')
    expect(tr.t(FIDELITY_UNCHANGED_DETAIL)).toContain('celle du fichier d’origine')
  })

  it('document modifié : les octets changent, et la boîte ne prétend plus le contraire', async () => {
    const bytes = new Uint8Array(readFileSync(BACKUP_2026))
    const container = await openContainer(bytes, 'b.xcfg')

    // Un seul geste du pilote : déplacer un gadget.
    moveWidgetBy(readLayout(container.document).landscape[0]!.widgets[0]!.node, -100, 0)
    container.modified = true

    const produced = await exportContainer(container)
    expect(await sha256Hex(produced)).not.toBe(await sha256Hex(bytes))

    // … et pourtant, seul ce qui a changé change. Mesuré : la fenêtre qui diffère tient
    // en 48 caractères — les deux coordonnées réécrites — sur les 78 639 du fichier.
    const avant = Buffer.from(bytes).toString('utf-8')
    const apres = Buffer.from(produced).toString('utf-8')
    let debut = 0
    while (debut < avant.length && avant[debut] === apres[debut]) debut++
    let fin = 0
    while (fin < avant.length - debut
      && avant[avant.length - 1 - fin] === apres[apres.length - 1 - fin]) fin++
    expect(avant.length - fin - debut).toBeLessThan(64)
    expect(avant.length).toBe(78639)

    const plan = planSharing(
      { document: container.document, fileName: 'b.xcfg', kind: 'xcfg', modified: true }, WHEN
    )
    expect(plan.modified).toBe(true)
    // La boîte ouvrait sur trois négations d'affilée — « réécrit », « changent », « ne
    // sera plus » — avant de rassurer. Elle ouvre maintenant sur ce que le pilote vient
    // chercher ; l'empreinte, qui est une garantie et non un aveu, est repliée.
    expect(tr.t(FIDELITY_MODIFIED)).not.toContain('à l’octet près')
    expect(tr.t(FIDELITY_MODIFIED)).not.toContain('SHA-256')
    expect(tr.t(FIDELITY_MODIFIED)).toContain('Seul ce que vous avez changé change')
    expect(tr.t(FIDELITY_MODIFIED_DETAIL)).toContain('diffère de celle du fichier d’origine')
    expect(tr.t(FIDELITY_MODIFIED_DETAIL))
      .toContain('sur un document non modifié, elle est identique')
  })

  it('sans information, on suppose modifié : la garantie forte ne s’affirme jamais à vide', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf-8'))
    expect(planSharing({ document, fileName: 'b.xcfg', kind: 'xcfg' }, WHEN).modified).toBe(true)
  })

  it('le premier choix dit ce qu’il est, non « Fichier complet »', () => {
    // Pour un export « pages », le fichier n'a rien de complet : il ne porte pas les
    // préférences. Ce que le mot opposait, c'est « tel qu'il est » à « expurgé ».
    const document = parseJson(readFileSync(BACKUP_2026, 'utf-8'))
    const handle = renderSharingDialog({
      source: { document, fileName: 'b.xcfg', kind: 'xcfg', modified: true },
      tr,
      now: () => WHEN,
      onConfirm: () => {}
    })
    handle.open()
    const titres = [...handle.element.querySelectorAll('.sharing__choiceTitle')]
      .map((one) => one.textContent)
    // Trois titres, et l'ordre est celui de ce qui part : tout, tout sauf ce qui vous
    // désigne, les pages seules. Descendre d'un cran veut toujours dire « donner moins ».
    expect(titres).toEqual([
      'Votre configuration, telle qu’elle est',
      'Tous vos réglages, sans ce qui vous désigne',
      'Version partageable, sans données personnelles'
    ])
    // La garantie technique est là, et elle est repliée.
    const curieux = handle.element.querySelector('.sharing__curious')
    expect(curieux?.tagName).toBe('DETAILS')
    expect((curieux as HTMLDetailsElement | null)?.open).toBe(false)
    expect(curieux?.textContent).toContain('SHA-256')
    handle.close()
  })

  it('la note affichée est celle du cas — et le contenu du fichier est dit à part', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf-8'))
    for (const modified of [false, true]) {
      const handle = renderSharingDialog({
        source: { document, fileName: 'b.xcfg', kind: 'xcfg', modified },
        tr,
        now: () => WHEN,
        onConfirm: () => {}
      })
      handle.open()
      const texte = handle.element.textContent ?? ''
      expect(texte).toContain(tr.t(modified ? FIDELITY_MODIFIED : FIDELITY_UNCHANGED))
      expect(texte).not.toContain(tr.t(modified ? FIDELITY_UNCHANGED : FIDELITY_MODIFIED))
      handle.close()
    }
  })
})

/* ============ la troisième issue : la sauvegarde entière, données personnelles remplacées */

/**
 * Le manque que cette issue comble, dit en une phrase : *un pilote veut demander de l'aide
 * sur un forum à propos de ses réglages de vario, sans publier son nom.*
 *
 * Les deux issues d'avant ne lui répondaient pas. « Telle qu'elle est » envoie son nom,
 * sa voile, ses capteurs et sa tâche en cours. « Version partageable » n'envoie **aucun
 * réglage** — donc aucune question à poser.
 */
describe('la sauvegarde entière : les réglages restent, le pilote part', () => {
  const plan = planSharing(
    { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
    WHEN
  )

  it('le nom du fichier dit « backup », et jamais « pages »', () => {
    // Confondre les deux, c'est écraser les préférences du destinataire — ou lui envoyer
    // un fichier qui ne peut pas répondre. Le format est le seul champ qui les distingue.
    expect(plan.backup.fileName).toBe('xctrack_2026-08-21-153207_backup-anon.xcfg')
    expect(plan.pages.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
    expect(plan.backup.fileName).not.toBe(plan.pages.fileName)
  })

  it('les seize réglages personnels sont traités, et les quatre chiffres sont nommés', () => {
    expect(plan.backup.preferences).toHaveLength(16)
    expect(plan.backup.tally).toEqual({ replaced: 3, dropped: 4, kept: 4, empty: 5 })
    // Ce que la carte annonce avant qu'on déroule quoi que ce soit.
    expect(plan.backup.changed).toBe(7)
  })

  it('le document produit garde les réglages et perd le pilote', () => {
    const produced = serializeJson(plan.backup.document)
    expect(produced).toContain('"exportType": "backup"')
    for (const kept of ['Sound.AcousticVario.CustomProfile', 'Unit.VerticalSpeed', 'Display.Theme']) {
      expect(produced).toContain(kept)
    }
    for (const gone of ['Amélie', 'coupe-exemple-2026', 'Navigation.State']) {
      expect(produced).not.toContain(gone)
    }
  })

  it('l’archive laisse ses annexes derrière elle, comme l’autre issue anonymisante', () => {
    // Même raison, et elle vaut pour les deux : cet éditeur n'inspecte pas les annexes.
    const extras: SharingExtra[] = [{ name: 'media/decollage.jpg', byteLength: 1_482_112 }]
    const archive = planSharing(
      {
        document: readSource(BACKUP_2026),
        fileName: '2026-08-20_backupwithmedia-00.xczfg',
        kind: 'xczfg',
        extras
      },
      WHEN
    )
    expect(archive.backup.droppedExtras).toEqual(extras)
    expect(archive.backup.fileName.endsWith('.xcfg')).toBe(true)
    expect(archive.backup.fileName).not.toContain('.xczfg')
  })

  it('le coût pour le destinataire est écrit, et il est plus court que celui d’un « pages »', () => {
    // Ce que cette issue ne coûte pas, c'est ce qui la justifie : aucune ligne de
    // `BACKUP_COSTS` n'est un réglage, alors que `ANONYMOUS_COSTS` n'énumère que cela.
    const text = BACKUP_COSTS.join(' ')
    for (const word of ['capteurs', 'tâche en cours', 'waypoints', 'cartes hors-ligne']) {
      expect(text).toContain(word)
    }
    expect(text).not.toContain('unités')
    expect(ANONYMOUS_COSTS.join(' ')).toContain('unités')
  })

  it('la limite de la garantie est dite : c’est une liste, et une liste se périme', () => {
    expect(BACKUP_RESIDUAL_NOTE).toContain('44')
    expect(BACKUP_RESIDUAL_NOTE).toContain('en clair')
    // …et la parade est nommée : l'autre issue ne dépend d'aucune liste.
    expect(BACKUP_RESIDUAL_NOTE).toContain('aucune liste')
  })
})

describe('la boîte : trois cartes, trois volets, un seul ouvert', () => {
  it('chaque issue a son volet, et seul celui de l’issue cochée est visible', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    // Le volet suit sa carte : l'inventaire est à côté du choix, pas en pied de boîte.
    const forms: SharingForm[] = ['plain', 'backup', 'pages']
    for (const form of forms) expect(panel(handle, form)).not.toBeNull()

    for (const chosen of forms) {
      choose(handle, chosen)
      for (const form of forms) {
        expect(panel(handle, form).hidden).toBe(form !== chosen)
      }
    }
    handle.close()
  })

  it('le volet de « telle qu’elle est » est vide : rien ne change, rien à annoncer', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    expect(panel(handle, 'plain').childElementCount).toBe(0)
    expect(panel(handle, 'backup').childElementCount).toBeGreaterThan(0)
    handle.close()
  })

  it('le nom annoncé suit l’issue cochée, et les trois diffèrent', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    const nameLine = (): string => handle.element.querySelector('.modal__name')!.textContent ?? ''
    const seen: string[] = []
    for (const form of ['plain', 'backup', 'pages'] as SharingForm[]) {
      choose(handle, form)
      seen.push(nameLine())
    }
    expect(seen[0]).toContain('_backup.xcfg')
    expect(seen[1]).toContain('_backup-anon.xcfg')
    expect(seen[2]).toContain('_pages-anon.xcfg')
    expect(new Set(seen).size).toBe(3)
    handle.close()
  })

  it('le volet montre chaque réglage, son verdict et sa raison', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    choose(handle, 'backup')
    const shown = panel(handle, 'backup').textContent ?? ''

    // Ce qui est remplacé : la valeur d'origine, la valeur posée, et pourquoi.
    expect(shown).toContain('Pilot.Name')
    expect(shown).toContain('Amélie Exemple')
    expect(shown).toContain('Pilote')
    // Ce qui est retiré, dit comme tel plutôt que par une valeur vide.
    expect(shown).toContain('Navigation.State')
    expect(shown).toContain('la ligne entière est retirée')
    // Ce qu'on a refusé de remplacer, dit aussi fort que le reste.
    expect(shown).toContain('Conservés tels quels')
    expect(shown).toContain('Livetrack.Enabled')
    // Et ce qui était vide, qui n'est ni l'un ni l'autre.
    expect(shown).toContain('Présents dans le fichier, mais vides')

    // Les seize réglages sont montrés, aucun n'est passé sous silence.
    expect(panel(handle, 'backup').querySelectorAll('.sharing__item').length).toBe(16)
    handle.close()
  })

  it('le contenu d’une structure n’est jamais déroulé dans la boîte', () => {
    // `Navigation.State` porte la tâche en cours et ses coordonnées. On en dit la taille.
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    choose(handle, 'backup')
    const shown = panel(handle, 'backup').textContent ?? ''
    expect(shown).toContain('non montrée')
    expect(shown).not.toContain('TaskBackToTakeoff')
    handle.close()
  })

  it('confirmer la sauvegarde entière rend un « backup » sans le pilote', () => {
    let result: SharingResult | undefined
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      (r) => { result = r }
    )
    choose(handle, 'backup')
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()

    expect(result!.form).toBe('backup')
    expect(result!.anonymized).toBe(true)
    expect(result!.fileName).toBe('xctrack_2026-08-21-153207_backup-anon.xcfg')
    const text = new TextDecoder().decode(sharingBytes(result!)!)
    expect(text).toContain('"exportType": "backup"')
    expect(text).toContain('"Pilot.Name": "Pilote"')
    expect(text).not.toContain('Amélie')
  })

  it('l’issue ordinaire rend toujours `form: "plain"` et aucun document', () => {
    let result: SharingResult | undefined
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      (r) => { result = r }
    )
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()
    expect(result!.form).toBe('plain')
    expect(result!.document).toBeUndefined()
    expect(sharingBytes(result!)).toBeUndefined()
  })

  it('le focus initial reste sur le premier choix, même avec trois cartes', () => {
    // Une troisième issue ne doit pas ramener le défaut corrigé : la boîte s'ouvrait le
    // clavier sur « Enregistrer », si bien qu'un Entrée réflexe exportait tout en clair.
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    const [plain] = radios(handle)
    expect(radios(handle)).toHaveLength(3)
    expect(document.activeElement).toBe(plain)
    expect(plain!.value).toBe('plain')
    handle.close()
  })
})

/* ================== l’avertissement sur ce qui a l’air écrit sans être déclaré */

describe('la boîte avertit sur ce qu’elle ne remplace pas', () => {
  it('sur un fichier réel, elle dit qu’elle n’a rien trouvé — sans crier', () => {
    const handle = open(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      () => {}
    )
    choose(handle, 'backup')
    expect(panel(handle, 'backup').textContent).toContain(SUSPECTS_NONE_NOTE)
    handle.close()
  })

  it('sur un réglage inconnu qui a l’air écrit, elle le montre et ne le remplace pas', () => {
    const document = parseJson([
      '{',
      '  "info": {',
      '    "exportType": "backup"',
      '  },',
      '  "layout": {',
      '    "landscape": [],',
      '    "portrait": []',
      '  },',
      '  "preferences": {',
      '    "Futur.Note": "Réglage de compétition d’Amélie"',
      '  }',
      '}'
    ].join('\n'))

    let result: SharingResult | undefined
    const handle = open(
      { document, fileName: 'futur.xcfg', kind: 'xcfg' }, (r) => { result = r }
    )
    choose(handle, 'backup')
    const shown = panel(handle, 'backup').textContent ?? ''
    expect(shown).toContain('Futur.Note')
    expect(shown).toContain('Réglage de compétition d’Amélie')
    expect(shown).toContain(SUSPECTS_NOTE)

    // Averti, pas corrigé : le texte part tel quel, et c'est délibéré.
    handle.element.querySelector<HTMLButtonElement>('.btn--primary')!.click()
    expect(new TextDecoder().decode(sharingBytes(result!)!))
      .toContain('Réglage de compétition d’Amélie')
  })
})

/* ============ la preuve : passer par les trois issues ne change pas un octet */

describe('ouvrir, tout regarder, renoncer : la même empreinte', () => {
  for (const file of [BACKUP_2026, PAGES_2026, FORMES_PRESERVEES, ARCHIVE]) {
    it(`${shortName(file)} : les trois volets se regardent sans écrire un octet`, async () => {
      const bytes = new Uint8Array(readFileSync(file))
      const container = await openContainer(bytes, shortName(file))
      const before = await sha256Hex(bytes)

      let result: SharingResult | undefined
      const handle = open(
        {
          document: container.document,
          fileName: container.fileName,
          kind: container.kind,
          extras: container.extras.map((e) => ({ name: e.name, byteLength: e.data.byteLength }))
        },
        (r) => { result = r }
      )
      // On déroule tous les inventaires proposés — dont celui qui traite les préférences —
      // puis on renonce. Le document en mémoire ne doit pas avoir bougé d'un bit.
      const offered = radios(handle).map((input) => input.value as SharingForm)
      for (const form of [...offered].reverse()) choose(handle, form)
      handle.element.querySelectorAll<HTMLButtonElement>('.modal__actions .btn')[0]!.click()

      expect(result).toBeUndefined()
      expect(container.modified).toBe(false)
      expect(await sha256Hex(await exportContainer(container))).toBe(before)
    })
  }
})

/* ============ la troisième issue n'est proposée que là où elle veut dire quelque chose */

describe('un export « pages » ne se voit pas proposer trois fois la même chose', () => {
  it('sans préférences, la troisième issue rendrait le fichier de la deuxième', () => {
    // Sur un fichier sans section « preferences », `anonymizeBackup` et
    // `anonymizeDocument` rendent le même document, sous le même nom. Deux cartes
    // indiscernables valent moins qu'une carte de moins : le pilote cherche la
    // différence, ne la trouve pas, et cesse de croire le reste de la boîte.
    const plan = planSharing(
      { document: readSource(PAGES_2026), fileName: shortName(PAGES_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.forms).toEqual(['plain', 'pages'])
    expect(serializeJson(plan.backup.document)).toBe(serializeJson(plan.pages.document))
    expect(plan.backup.fileName).toBe(plan.pages.fileName)

    const handle = open(
      { document: readSource(PAGES_2026), fileName: shortName(PAGES_2026), kind: 'xcfg' },
      () => {}
    )
    expect(radios(handle).map((input) => input.value)).toEqual(['plain', 'pages'])
    handle.close()
  })

  it('avec des préférences, les trois sont là et se distinguent', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.forms).toEqual(['plain', 'backup', 'pages'])
    expect(serializeJson(plan.backup.document)).not.toBe(serializeJson(plan.pages.document))
  })
})

/* ================== les cinq langues : la gradation des trois issues, et le vocabulaire */

/**
 * **Ce que ces contrôles gardent, et qu'aucun autre ne garde.**
 *
 * La boîte de partage est le seul écran où une traduction fautive ne gêne pas mais fait
 * **fuiter** : le pilote y décide ce qu'il envoie à quelqu'un d'autre. Deux propriétés
 * doivent donc tenir dans les cinq langues, pas seulement en français :
 *
 * 1. **les trois issues restent trois**, dans l'ordre de ce qui part. Deux titres qui se
 *    confondraient dans une langue y rendraient le choix illisible ;
 * 2. **le mot du gadget suit la langue** — « gadget » en français, *widget* ailleurs —,
 *    parce que c'est le mot que le pilote a sous les yeux sur son appareil.
 */
describe('la boîte dans les cinq langues', () => {
  const TRANSLATORS = {
    fr: makeTranslator('fr', frenchMessages),
    de: makeTranslator('de', germanMessages),
    en: makeTranslator('en', englishMessages),
    es: makeTranslator('es', spanishMessages),
    nl: makeTranslator('nl', dutchMessages)
  }

  for (const [code, translator] of Object.entries(TRANSLATORS)) {
    it(`${code} : trois titres distincts, dans l’ordre de ce qui part`, () => {
      const handle = renderSharingDialog({
        source: {
          document: readSource(BACKUP_2026),
          fileName: shortName(BACKUP_2026),
          kind: 'xcfg'
        },
        tr: translator,
        now: () => WHEN,
        onConfirm: () => {}
      })
      handle.open()
      const titles = [...handle.element.querySelectorAll('.sharing__choiceTitle')]
        .map((one) => one.textContent ?? '')

      expect(titles).toEqual([
        translator.t('sharing.plainTitle'),
        translator.t('sharing.backupTitle'),
        translator.t('sharing.pagesTitle')
      ])
      // Trois crans, donc trois titres qu'on ne peut pas confondre. Un pilote qui ne
      // distingue pas le deuxième du troisième choisit au hasard ce qu'il donne.
      expect(new Set(titles).size).toBe(3)
      for (const title of titles) expect(title.length).toBeGreaterThan(10)
      handle.close()
    })

    it(`${code} : le mot du gadget est celui de la chrome de cette langue`, () => {
      const phone = planSharing(
        {
          document: readSource(FORMES_PRESERVEES),
          fileName: 'formes-preservees.xcfg',
          kind: 'xcfg'
        },
        WHEN
      ).pages.replacements.find((one) => one.keyPath === 'contact/phoneNumber')!

      const shown = describeLocation(phone, 'fr', translator).toLowerCase()
      expect(shown).toContain(code === 'fr' ? 'gadget' : 'widget')
      expect(shown).not.toContain(code === 'fr' ? 'widget' : 'gadget')
    })
  }

  it('aucune phrase française ne survit dans la boîte allemande', () => {
    // Le vrai risque d'une extraction : une phrase oubliée dans le code, qui reste
    // française quelle que soit la langue choisie — et que personne ne voit en relisant
    // le catalogue, puisqu'elle n'y est pas.
    const handle = renderSharingDialog({
      source: {
        document: readSource(FORMES_PRESERVEES),
        fileName: 'formes-preservees.xcfg',
        kind: 'xcfg'
      },
      tr: TRANSLATORS.de,
      now: () => WHEN,
      onConfirm: () => {}
    })
    handle.open()
    choose(handle, 'pages')
    const shown = handle.element.textContent ?? ''
    for (const french of [
      'Enregistrer cette configuration',
      'Ce qui ne partira pas',
      'Vos textes dans les gadgets',
      'Nom du fichier produit',
      'Pour les curieux'
    ]) {
      expect(shown, french).not.toContain(french)
    }
    expect(shown).toContain(TRANSLATORS.de.t('sharing.dialogTitle'))
    handle.close()
  })
})
