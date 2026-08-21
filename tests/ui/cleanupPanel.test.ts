import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadVersionDatabase } from '../../src/catalog/widgetVersions'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { readLayout } from '../../src/model/layout'
import { buildCleanupSection, type CleanupEvent } from '../../src/ui/cleanupPanel'
import { buildVersionPanel } from '../../src/ui/versionDiagnostic'
import { BACKUP_2025, BACKUP_2026, GSON_2022 } from '../fixtures/paths'

/**
 * L'écran de nettoyage : ce qu'il dit, ce qu'il exige avant d'agir, et ce qu'il permet de
 * défaire après coup.
 *
 * Le vocabulaire est éprouvé ici autant que le comportement. Le pilote est parapentiste :
 * « clé », « palier » et « schéma » ne lui disent rien, et un message qui l'inquiéterait
 * alors que rien n'est cassé est un défaut, pas un détail de rédaction.
 */
const db = await loadVersionDatabase()

function documentOf(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

interface Harness {
  section: ReturnType<typeof buildCleanupSection>
  events: CleanupEvent[]
  document: JsonNode
  text: () => string
  boxes: () => HTMLInputElement[]
  button: (label: RegExp) => HTMLButtonElement | undefined
}

function harnessOf(path: string, tier: number): Harness {
  const document = documentOf(path)
  const events: CleanupEvent[] = []
  const section = buildCleanupSection({
    db,
    layout: readLayout(document),
    tier,
    onChange: (event) => events.push(event)
  })
  const buttons = (): HTMLButtonElement[] =>
    [...section.element.querySelectorAll('button')]
  return {
    section,
    events,
    document,
    text: () => section.element.textContent ?? '',
    boxes: () => [
      ...section.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    ],
    button: (label) => buttons().find((node) => label.test(node.textContent ?? ''))
  }
}

/* --------------------------------------------------------------- ce que l'écran dit */

describe('ce que l’écran annonce', () => {
  it('dit combien de réglages partent et sur quels gadgets', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    const text = panel.text()
    expect(text).toContain('9 réglages')
    expect(text).toContain('4 gadgets')
    // Les gadgets sont NOMMÉS, pas seulement comptés : c'est ce qui permet au pilote de
    // savoir de quoi on lui parle avant d'ouvrir la liste.
    expect(text).toContain('Carte de la manche (3)')
    expect(text).toContain('Boussole et vent (2)')
    expect(text).toContain('Assistant thermique')
  })

  it('n’inquiète pas : rien n’est cassé, et l’écran le dit avant de proposer', () => {
    const text = harnessOf(BACKUP_2026, 20).text()
    expect(text).toContain('Rien ne presse et rien n’est cassé')
    expect(text).toContain('ne change rien à vos pages')
    for (const alarm of ['erreur', 'corrompu', 'anomalie', 'défaut', 'problème', 'invalide']) {
      expect(text.toLowerCase(), alarm).not.toContain(alarm)
    }
  })

  it('parle la langue du pilote : « gadget », jamais « clé », « palier » ni « schéma »', () => {
    const text = harnessOf(BACKUP_2026, 20).text()
    expect(text).toContain('gadget')
    for (const jargon of ['palier', 'schéma', 'widget ', 'clé', 'JSON']) {
      expect(text, jargon).not.toContain(jargon)
    }
  })

  it('ne dit RIEN quand il n’y a rien à enlever', () => {
    // Un pilote dont la configuration va bien n'a pas à lire un message sur l'état de sa
    // configuration : la section est vide, sans titre, sans coche verte, sans bordure.
    for (const [path, tier] of [[GSON_2022, 1], [BACKUP_2026, 5]] as const) {
      const panel = harnessOf(path, tier)
      expect(panel.section.plan().entries).toEqual([])
      expect(panel.text()).toBe('')
      expect(panel.section.element.childElementCount).toBe(0)
    }
  })

  it('dit jusqu’à quelle version de XCTrack chaque réglage a servi', () => {
    const text = harnessOf(BACKUP_2026, 20).text()
    expect(text).toContain('utilisé jusqu’à XCTrack')
    // Une version publiée, celle que le pilote a pu installer — pas un numéro de palier.
    expect(text).toMatch(/utilisé jusqu’à XCTrack \d/)
  })

  it('montre le nom exact du réglage, et dit pourquoi il n’est pas traduit', () => {
    const text = harnessOf(BACKUP_2026, 20).text()
    expect(text).toContain('mapWidget_showTerrain')
    expect(text).toContain('L’application ne les montre plus dans ses menus')
  })

  it('montre un oui/non, jamais un texte que le pilote aurait écrit', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    expect(panel.text()).toMatch(/réglé sur (oui|non)/)
    // Aucune valeur de chaîne : un texte libre peut porter un nom ou un numéro.
    expect(panel.text()).not.toContain('"')
  })
})

/* --------------------------------------------------- décocher, agir, revenir dessus */

describe('le geste', () => {
  it('propose une case par réglage, toutes cochées au départ', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    const boxes = panel.boxes()
    expect(boxes).toHaveLength(9)
    expect(boxes.every((box) => box.checked)).toBe(true)
    expect(panel.button(/Enlever/)?.textContent).toContain('9')
  })

  it('n’agit pas tant qu’on ne le lui demande pas', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const panel = harnessOf(BACKUP_2026, 20)
    panel.boxes()[0]?.click()
    expect(panel.events).toEqual([])
    expect(serializeJson(panel.document)).toBe(source)
  })

  it('décocher garde le réglage, et le dit avant d’agir', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    const boxes = panel.boxes()
    boxes[0]!.checked = false
    boxes[0]!.dispatchEvent(new Event('change'))
    expect(panel.text()).toContain('8 retenus sur 9')
    expect(panel.text()).toContain('1 réglage restera en place')
    expect(panel.button(/Enlever/)?.textContent).toContain('8')
  })

  it('n’enlève que les réglages restés cochés', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    const kept = panel.section.plan().entries[0]!
    const box = panel.boxes()[0]!
    box.checked = false
    box.dispatchEvent(new Event('change'))
    panel.button(/Enlever/)?.click()

    expect(panel.events[0]?.keyCount).toBe(8)
    const after = serializeJson(panel.document)
    expect(after).toContain(`"${kept.key}"`)
  })

  it('refuse d’agir quand tout est décoché', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    for (const box of panel.boxes()) {
      box.checked = false
      box.dispatchEvent(new Event('change'))
    }
    const button = panel.button(/Aucun réglage retenu/)
    expect(button?.disabled).toBe(true)
    button?.click()
    expect(panel.events).toEqual([])
  })

  it('enlève, puis remet : le fichier ressort à l’octet près', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const panel = harnessOf(BACKUP_2026, 20)

    panel.button(/Enlever/)?.click()
    expect(serializeJson(panel.document)).not.toBe(source)
    expect(panel.text()).toContain('9 réglages enlevés')
    expect(panel.text()).toContain('4 gadgets')

    panel.button(/Remettre/)?.click()
    expect(serializeJson(panel.document)).toBe(source)
  })

  it('dit que l’appareil n’en sait rien tant que le fichier n’est pas enregistré', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    panel.button(/Enlever/)?.click()
    expect(panel.text()).toContain('Votre appareil n’en sait encore rien')
  })

  it('annonce chaque geste sous un libellé de pas d’annulation', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    panel.button(/Enlever/)?.click()
    panel.button(/Remettre/)?.click()
    expect(panel.events.map((event) => event.kind)).toEqual(['applied', 'reverted'])
    expect(panel.events[0]?.description).toBe('Enlever 9 réglages d’une ancienne version')
    expect(panel.events[1]?.description).toBe('Remettre 9 réglages d’une ancienne version')
  })

  it('laisse le retour en arrière en place quand l’hôte recalcule', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    panel.button(/Enlever/)?.click()
    // L'hôte a refait son diagnostic : le plan est vide, mais le pilote doit encore
    // pouvoir revenir en arrière.
    panel.section.refresh(readLayout(panel.document), 20)
    expect(panel.button(/Remettre/)).toBeDefined()
  })

  it('referme le retour en arrière quand on change de version visée', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    panel.button(/Enlever/)?.click()
    panel.section.reset(readLayout(panel.document), 5)
    expect(panel.button(/Remettre/)).toBeUndefined()
    expect(panel.text()).toBe('')
  })

  it('ne retire jamais deux fois le même réglage', () => {
    const panel = harnessOf(BACKUP_2026, 20)
    panel.button(/Enlever/)?.click()
    const after = serializeJson(panel.document)
    // Le plan a été refait : il est vide, et rien ne peut plus être enlevé.
    expect(panel.section.plan().entries).toEqual([])
    expect(panel.events).toHaveLength(1)
    expect(serializeJson(panel.document)).toBe(after)
  })

  it('marche aussi sur la sauvegarde de 2025, à son échelle', () => {
    const source = readFileSync(BACKUP_2025, 'utf8')
    const panel = harnessOf(BACKUP_2025, 17)
    expect(panel.boxes()).toHaveLength(4)
    panel.button(/Enlever/)?.click()
    expect(panel.events[0]?.keyCount).toBe(4)
    panel.button(/Remettre/)?.click()
    expect(serializeJson(panel.document)).toBe(source)
  })
})

/* ------------------------------------------------- l'insertion dans l'écran existant */

describe('dans le panneau de diagnostic', () => {
  it('ne propose rien tant que l’hôte n’ouvre pas le nettoyage', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    expect(panel.cleanupPlan()).toBeNull()
    expect(panel.element.textContent).not.toContain('Enlever ce qu’une ancienne version')
  })

  it('propose le nettoyage sous le diagnostic quand l’hôte l’ouvre', async () => {
    const events: CleanupEvent[] = []
    const document = documentOf(BACKUP_2026)
    const panel = await buildVersionPanel({
      document, database: db, onCleanup: (event) => events.push(event)
    })
    expect(panel.cleanupPlan()?.entries).toHaveLength(9)

    const text = panel.element.textContent ?? ''
    expect(text).toContain('Réglages périmés')
    expect(text).toContain('Enlever ce qu’une ancienne version a laissé')
    // Le constat vient AVANT la proposition d'agir, jamais l'inverse.
    expect(text.indexOf('Réglages périmés')).toBeLessThan(text.indexOf('Enlever ce qu’une'))
  })

  it('refait le diagnostic après un nettoyage, sans escamoter le retour en arrière', async () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const events: CleanupEvent[] = []
    const document = parseJson(source)
    const panel = await buildVersionPanel({
      document, database: db, onCleanup: (event) => events.push(event)
    })
    const act = [...panel.element.querySelectorAll('button')]
      .find((node) => /^Enlever/.test(node.textContent ?? ''))
    act?.click()

    expect(events).toHaveLength(1)
    // Le diagnostic est à jour : les neuf reliquats ont disparu du constat.
    expect(panel.diagnosis()?.counts.legacy).toBe(0)
    const undo = [...panel.element.querySelectorAll('button')]
      .find((node) => /^Remettre/.test(node.textContent ?? ''))
    expect(undo).toBeDefined()

    undo?.click()
    expect(panel.diagnosis()?.counts.legacy).toBe(9)
    expect(serializeJson(document)).toBe(source)
  })

  it('ne propose rien tant qu’aucune version n’est retenue', async () => {
    const panel = await buildVersionPanel({
      document: parseJson('{"info":{"versionCode":100400},"layout":{}}'),
      database: db,
      onCleanup: () => undefined
    })
    expect(panel.tier()).toBeNull()
    expect(panel.cleanupPlan()?.entries).toEqual([])
  })

  it('refait la proposition quand le pilote change de version visée', async () => {
    const panel = await buildVersionPanel({
      document: documentOf(BACKUP_2026), database: db, onCleanup: () => undefined
    })
    expect(panel.cleanupPlan()?.entries).toHaveLength(9)
    const older = [...panel.select.querySelectorAll('option')]
      .find((node) => node.textContent === '0.9.8.7')
    expect(older).toBeDefined()
    panel.select.value = older?.value ?? ''
    panel.select.dispatchEvent(new Event('change'))
    // Sous 0.9.8.7, les écarts sont des réglages APPARUS depuis : rien à enlever.
    expect(panel.cleanupPlan()?.entries).toEqual([])
    expect(panel.element.textContent).not.toContain('Enlever ce qu’une ancienne version')
  })

  it('suit un changement de document', async () => {
    const panel = await buildVersionPanel({
      document: documentOf(BACKUP_2026), database: db, onCleanup: () => undefined
    })
    panel.setDocument(documentOf(BACKUP_2025))
    expect(panel.cleanupPlan()?.entries).toHaveLength(4)
  })
})

describe('le français des libellés', () => {
  it('le démonstratif ne s’accole pas au nombre', () => {
    // « Enlever 9 ces réglages » : le nombre se glisse entre le déterminant et le nom, et
    // il disparaît au singulier — « ce 1 réglage » ne se dit pas davantage. C'est ce que
    // le repère nommé du pluriel permet, et qu'un `s` collé à un mot n'aurait jamais su
    // rendre : la phrase du singulier ne porte pas de nombre, celle du pluriel le porte
    // au milieu.
    const panel = harnessOf(BACKUP_2026, 20)
    expect(panel.button(/Enlever/)?.textContent).toBe('Enlever ces 9 réglages')

    for (const box of panel.boxes().slice(1)) {
      box.checked = false
      box.dispatchEvent(new Event('change'))
    }
    expect(panel.button(/Enlever/)?.textContent).toBe('Enlever ce réglage')
  })
})
