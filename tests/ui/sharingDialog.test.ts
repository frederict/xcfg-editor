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
  ANNEXES_NOTE,
  ANONYMOUS_COSTS,
  describeLocation,
  displayedReplacement,
  droppedRootKeyLabel,
  FIDELITY_MODIFIED,
  FIDELITY_UNCHANGED,
  formatByteSize,
  planSharing,
  renderSharingDialog,
  RESIDUAL_NOTE,
  sharingBytes,
  type SharingExtra,
  type SharingResult,
  type SharingSource
} from '../../src/ui/sharingDialog'
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
 */

/** Le moment que porteront tous les noms de ce fichier : figé, sans quoi rien n'est stable. */
const WHEN = new Date(2026, 7, 21, 15, 32, 7)

function readSource(file: string): ReturnType<typeof parseJson> {
  return parseJson(readFileSync(file, 'utf8'))
}

function shortName(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1)
}

/* ============================================================ le plan, hors interface */

describe('planSharing — deux issues, deux noms', () => {
  it('l’export ordinaire garde l’extension d’origine et ne reprend pas le radical', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: '2022-02-08_marie_ok.xcfg', kind: 'xcfg' },
      WHEN
    )
    expect(plan.plainFileName).toBe('xctrack_2026-08-21-153207_backup.xcfg')
    // Le prénom du nom d'origine ne doit reparaître nulle part.
    expect(plan.plainFileName).not.toContain('fred')
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
    expect(plan.anonymous.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
    expect(plan.anonymous.derived).toBe(true)
  })

  it('un export « pages » n’a aucune préférence à retirer', () => {
    const plan = planSharing(
      { document: readSource(PAGES_2026), fileName: shortName(PAGES_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.exportType).toBe('pages')
    expect(plan.anonymous.droppedRootKeys).toEqual([])
    expect(plan.anonymous.derived).toBe(false)
    expect(plan.anonymous.fileName).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
  })

  it('un « backup » perd ses deux sections, et l’interface sait les nommer', () => {
    const plan = planSharing(
      { document: readSource(BACKUP_2026), fileName: shortName(BACKUP_2026), kind: 'xcfg' },
      WHEN
    )
    expect(plan.anonymous.droppedRootKeys).toEqual(['airspaceSelectedChannels', 'preferences'])
    for (const key of plan.anonymous.droppedRootKeys) {
      expect(droppedRootKeyLabel(key).length).toBeGreaterThan(20)
    }
    // Le repli nomme une clé inconnue sans prétendre savoir ce qu'elle contient.
    expect(droppedRootKeyLabel('cléFuture')).toContain('cléFuture')
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
    const phone = plan.anonymous.replacements.find((r) => r.keyPath === 'contact/phoneNumber')
    expect(phone).toBeDefined()
    expect(phone!.text).toBe('+32 470 00 00 00')
    expect(phone!.replacement).toBe(NEUTRAL_PHONE_NUMBER)
    expect(phone!.orientation).toBe('landscape')
    expect(phone!.pageRank).toBe(1)
    expect(phone!.widgetRank).toBe(2)
    expect(describeLocation(phone!, 'fr')).toBe('Paysage · page 1 · gadget 2 · Bouton téléphone')

    const contact = plan.anonymous.replacements.find((r) => r.keyPath === 'contact/fullName')
    expect(contact!.text).toBe('Jean Exemple')
    expect(contact!.replacement).toBe('Contact 1')
  })

  it('les quatre textes du fichier sont inventoriés, dans l’ordre du fichier', () => {
    expect(plan.anonymous.replacements.map((r) => r.keyPath)).toEqual([
      'text', 'titletext', 'contact/fullName', 'contact/phoneNumber', 'titletext'
    ])
    // Le titre portrait est bien rattaché à sa page, pas à celle du paysage.
    const last = plan.anonymous.replacements.at(-1)!
    expect(last.orientation).toBe('portrait')
    expect(last.text).toBe('Sol')
  })

  it('chaque entrée porte une raison en français, prête à afficher', () => {
    for (const entry of plan.anonymous.replacements) {
      expect(entry.reason.length).toBeGreaterThan(30)
      expect(entry.reason).toMatch(/remplacé|remise|remis/)
    }
  })

  it('aucune valeur d’origine ne survit dans le document produit', () => {
    const produced = serializeJson(plan.anonymous.document)
    for (const entry of plan.anonymous.replacements) {
      expect(produced).not.toContain(entry.text)
    }
    expect(produced).not.toContain('Jean Exemple')
    expect(produced).not.toContain('+32 470')
    // Ni les préférences, qui partent avec le format.
    expect(produced).not.toContain('Amélie Exemple')
    expect(produced).toContain(`"exportType": "${PAGES_EXPORT_TYPE}"`)
  })

  it('la chaîne vide posée se dit « (vide) » plutôt que de disparaître', () => {
    expect(displayedReplacement('')).toBe('(vide)')
    expect(displayedReplacement('Titre 1')).toBe('Titre 1')
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
    expect(plan.anonymous.droppedExtras).toEqual(EXTRAS)
    expect(ANNEXES_NOTE).toContain('.xcfg')
    expect(ANNEXES_NOTE).toContain('métadonnées')
  })

  it('le fichier anonymisé est un .xcfg nu', () => {
    expect(plan.anonymous.fileName.endsWith('.xcfg')).toBe(true)
    expect(plan.anonymous.fileName).not.toContain('.xczfg')
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
    expect(real.anonymous.droppedExtras).toEqual([])
  })

  it('une taille d’annexe se lit en français', () => {
    expect(formatByteSize(512)).toBe('512 o')
    expect(formatByteSize(3_204)).toBe('3,1 ko')
    expect(formatByteSize(1_482_112)).toBe('1,4 Mo')
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
  const handle = renderSharingDialog({ source, now: () => WHEN, onConfirm, onCancel })
  handle.open()
  return handle
}

function radios(handle: { element: HTMLDialogElement }): HTMLInputElement[] {
  return [...handle.element.querySelectorAll<HTMLInputElement>('.sharing__radio')]
}

/**
 * Coche l'une des deux issues. Les boutons radio ne vivent pas dans un `<form>` — une
 * boîte modale n'en a pas besoin — et la décoche mutuelle n'est donc pas garantie par
 * l'environnement de test : on la fait à la main, comme le ferait le navigateur.
 */
function choose(handle: { element: HTMLDialogElement }, rank: 0 | 1): void {
  const inputs = radios(handle)
  for (const input of inputs) input.checked = false
  const chosen = inputs[rank]!
  chosen.checked = true
  chosen.dispatchEvent(new Event('change', { bubbles: true }))
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
    const [plain, anonymous] = radios(handle)
    expect(plain!.value).toBe('plain')
    expect(plain!.checked).toBe(true)
    expect(anonymous!.value).toBe('anonymous')
    expect(anonymous!.checked).toBe(false)
    // L'inventaire ne s'affiche que quand l'anonymisation est choisie.
    expect(handle.element.querySelector<HTMLElement>('.sharing__detail')!.hidden).toBe(true)
    handle.close()
  })

  it('choisir la version partageable montre l’inventaire et change le nom annoncé', () => {
    const handle = open(
      { document: readSource(FORMES_PRESERVEES), fileName: 'formes-preservees.xcfg', kind: 'xcfg' },
      () => {}
    )
    const nameLine = (): string => handle.element.querySelector('.modal__name')!.textContent ?? ''
    expect(nameLine()).toContain('xctrack_2026-08-21-153207_backup.xcfg')

    choose(handle, 1)
    expect(handle.element.querySelector<HTMLElement>('.sharing__detail')!.hidden).toBe(false)
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
    choose(handle, 1)
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
    choose(handle, 1)
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
      choose(handle, 1)
      choose(handle, 0)
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
    expect(FIDELITY_UNCHANGED).toContain('à l’octet près')
    expect(FIDELITY_UNCHANGED).toContain('celle du fichier d’origine')
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
    expect(FIDELITY_MODIFIED).not.toContain('à l’octet près')
    expect(FIDELITY_MODIFIED).toContain('Seul ce que vous avez changé change')
  })

  it('sans information, on suppose modifié : la garantie forte ne s’affirme jamais à vide', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf-8'))
    expect(planSharing({ document, fileName: 'b.xcfg', kind: 'xcfg' }, WHEN).modified).toBe(true)
  })

  it('la note affichée est celle du cas — et le contenu du fichier est dit à part', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf-8'))
    for (const modified of [false, true]) {
      const handle = renderSharingDialog({
        source: { document, fileName: 'b.xcfg', kind: 'xcfg', modified },
        now: () => WHEN,
        onConfirm: () => {}
      })
      handle.open()
      const texte = handle.element.textContent ?? ''
      expect(texte).toContain(modified ? FIDELITY_MODIFIED : FIDELITY_UNCHANGED)
      expect(texte).not.toContain(modified ? FIDELITY_UNCHANGED : FIDELITY_MODIFIED)
      handle.close()
    }
  })
})
