import { describe, expect, it } from 'vitest'
import {
  MEASURED_MIGRATIONS, MigrationTable,
  type MeasuredCase, type MigrationsFile
} from '../../src/catalog/legacyMigrations'
import { loadVersionDatabase } from '../../src/catalog/widgetVersions'
import { defaultValueAt, DEFAULTS_VERSION_NAME } from '../../src/catalog/widgetDefaults'

/**
 * Le relevé de ce que devient un réglage périmé quand l'instrument le lit.
 *
 * Trois questions, et elles ne se recouvrent pas :
 *
 * 1. **le relevé est-il cohérent avec lui-même** — un verdict « sans effet » dit-il bien
 *    la même valeur avec et sans, un verdict « vivant » deux valeurs différentes ;
 * 2. **est-il cohérent avec le reste du dépôt** — quand le retrait laisse le gadget
 *    **nu**, la colonne « absent » est la valeur d'usine de `widgetDefaults.json`, et les
 *    réglages décrits sont exactement ceux que la base de versions peut rendre `legacy` ;
 * 3. **refuse-t-il de conclure là où rien n'a été mesuré** — c'est tout l'objet de ce
 *    fichier, et la faute qu'il corrige.
 */

const db = await loadVersionDatabase()

/** Un relevé de laboratoire, pour éprouver les bornes sans toucher au vrai. */
function tableOf(file: Partial<MigrationsFile>): MigrationTable {
  return new MigrationTable({
    _source: 'labo',
    _methode: 'labo',
    _limite: 'labo',
    _measuredTiers: '20',
    _measuredVersionCode: 0,
    _measuredVersionName: 'labo',
    migrations: {},
    ...file
  })
}

/** Tous les cas du relevé, avec le réglage auquel ils appartiennent. */
function everyCase(): { key: string; one: MeasuredCase; widgets: string[] }[] {
  const all: { key: string; one: MeasuredCase; widgets: string[] }[] = []
  for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
    const migration = MEASURED_MIGRATIONS.migrationOf(key)
    if (migration === undefined) continue
    for (const one of migration.cases) {
      all.push({ key, one, widgets: one.widgets ?? migration.widgets })
    }
  }
  return all
}

/** L'identité d'un cas dans un message d'échec : la valeur, et son voisinage. */
function label(key: string, one: MeasuredCase): string {
  return `${key}=${one.value} ${JSON.stringify(one.requires ?? {})}`
}

/**
 * Un voisinage vaut « gadget nu **après** le retrait » quand il n'exige que des absences :
 * c'est le seul cas où la colonne « absent » peut se comparer à la valeur d'usine.
 */
function bareOnceRemoved(one: MeasuredCase): boolean {
  return Object.values(one.requires ?? {}).every((expected) => expected === null)
}

/**
 * La valeur d'usine d'un successeur, écrite comme le relevé l'écrit : le texte pour une
 * valeur simple, `champ=valeur champ=valeur` pour une valeur composée. Une seule règle,
 * et c'est elle qui rend la comparaison possible sur `mapWidget_mapAppearance`.
 */
function factoryText(widget: string, successor: string): string | undefined {
  const [key, field] = successor.split('.')
  const value = defaultValueAt(widget, key ?? '', field)
  if (value === undefined) return undefined
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).map(([name, one]) => `${name}=${String(one)}`).join(' ')
  }
  return String(value)
}

describe('le relevé dit la même chose que lui-même', () => {
  it('« sans effet » veut dire la même valeur avec et sans, toujours', () => {
    for (const { key, one } of everyCase()) {
      expect(one.verdict === 'inert', label(key, one)).toBe(one.present === one.absent)
    }
  })

  it('nomme un successeur et au moins un gadget pour chaque réglage', () => {
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      expect(migration?.successor, key).toBeTruthy()
      expect(migration?.widgets.length, key).toBeGreaterThan(0)
      expect(migration?.cases.length, key).toBeGreaterThan(0)
      // Une mesure sans provenance n'est pas une mesure : on saurait le chiffre, pas d'où
      // il vient, et personne ne pourrait le rejouer.
      expect(migration?.measure.length, key).toBeGreaterThan(20)
    }
  })

  it('ne restreint jamais un cas à un gadget étranger au réglage', () => {
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      if (migration === undefined) continue
      for (const one of migration.cases) {
        for (const widget of one.widgets ?? []) {
          expect(migration.widgets, label(key, one)).toContain(widget)
        }
      }
    }
  })

  /**
   * Deux cas d'un même réglage ne doivent jamais décrire le **même** gadget dans le
   * **même** voisinage avec la même valeur : le premier trouvé gagnerait, et le second
   * serait une mesure invisible. C'est arrivé de peu — `nav_use_brackets: false` a deux
   * cas au voisinage vide, l'un vivant, l'autre sans effet — et ce qui les sépare est la
   * classe du gadget, pas le hasard de l'ordre.
   */
  it('n’a jamais deux cas qui décrivent la même situation', () => {
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      if (migration === undefined) continue
      const seen = new Set<string>()
      for (const one of migration.cases) {
        const neighbourhood = JSON.stringify(
          Object.entries(one.requires ?? {}).sort(([a], [b]) => a.localeCompare(b))
        )
        for (const widget of one.widgets ?? migration.widgets) {
          const identity = `${widget}|${one.value}|${neighbourhood}`
          expect(seen.has(identity), `${key} — ${identity}`).toBe(false)
          seen.add(identity)
        }
      }
    }
  })
})

describe('le relevé s’accorde avec le reste du dépôt', () => {
  it('la colonne « absent » d’un gadget rendu nu est la valeur d’usine des 75 gadgets', () => {
    // C'est ce qui donne son sens à la comparaison : « sans le réglage » n'est pas une
    // idée, c'est ce que l'appareil a écrit. Et ce n'est la valeur d'usine QUE si le
    // retrait laisse le gadget sans aucune autre clé périmée — d'où `bareOnceRemoved`.
    expect(DEFAULTS_VERSION_NAME).toBe('1.0.3-beta')
    let checked = 0
    for (const { key, one, widgets } of everyCase()) {
      if (!bareOnceRemoved(one)) continue
      const successor = MEASURED_MIGRATIONS.migrationOf(key)?.successor ?? ''
      for (const widget of widgets) {
        const factory = factoryText(widget, successor)
        if (factory === undefined) continue
        expect(factory, `${widget}.${label(key, one)}`).toBe(one.absent)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  /**
   * La contrepartie du test précédent, et la borne que le 22 août 2026 a fait payer : ce
   * qui s'écarte de la valeur d'usine doit dire **dans quel voisinage** la mesure a été
   * prise. Un cas muet redeviendrait ce qu'était la table de l'après-midi — une
   * comparaison au gadget nu déguisée en mesure.
   */
  it('un relevé qui s’écarte de la valeur d’usine porte son voisinage, écrit noir sur blanc', () => {
    for (const { key, one, widgets } of everyCase()) {
      const successor = MEASURED_MIGRATIONS.migrationOf(key)?.successor ?? ''
      for (const widget of widgets) {
        const factory = factoryText(widget, successor)
        if (factory === undefined || factory === one.absent) continue
        expect(Object.keys(one.requires ?? {}).length, `${widget}.${label(key, one)}`)
          .toBeGreaterThan(0)
        expect(bareOnceRemoved(one), `${widget}.${label(key, one)}`).toBe(false)
      }
    }
  })

  it('décrit exactement les réglages que la base peut rendre « périmés »', () => {
    // Si la base apprend un nouveau reliquat sans que ce relevé apprenne quoi en faire,
    // le nettoyage cessera simplement de le proposer — jamais l'inverse. Ce test le dit
    // à qui touchera la base : la table est à compléter, sur l'appareil.
    const legacy = new Set<string>()
    for (const [widget, keys] of Object.entries(db.schema.attested)) {
      for (const [key, kinds] of Object.entries(keys)) {
        if (kinds.legacy !== undefined) legacy.add(`${widget}/${key}`)
      }
    }
    const described = new Set<string>()
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      for (const widget of MEASURED_MIGRATIONS.migrationOf(key)?.widgets ?? []) {
        described.add(`${widget}/${key}`)
      }
    }
    expect([...legacy].sort()).toEqual([...described].sort())
  })
})

describe('il refuse de conclure là où rien n’a été mesuré', () => {
  const nowhere = (): undefined => undefined
  /** Un gadget qui ne porte que les réglages nommés ici. */
  const carrying = (kept: Record<string, string>) =>
    (key: string): string | undefined => kept[key]

  it('ne dit rien d’un réglage absent de la table', () => {
    expect(MEASURED_MIGRATIONS.removalVerdict('WCompass', 'inventé', 'true', 20, nowhere))
      .toEqual({ verdict: 'unmeasured' })
  })

  it('ne dit rien d’un gadget sur lequel le réglage n’a pas été porté', () => {
    expect(MEASURED_MIGRATIONS.removalVerdict('WCompMap', 'showWind', 'true', 20, nowhere))
      .toEqual({ verdict: 'unmeasured' })
  })

  it('ne dit rien d’une valeur jamais éprouvée', () => {
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'showWind', 'peut-être', 20, nowhere).verdict)
      .toBe('unmeasured')
  })

  it('borne « sans effet » au palier où la mesure a été prise', () => {
    const sibling = carrying({ showWind: 'true' })
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'false', 20, sibling).verdict).toBe('inert')
    for (const tier of [0, 15, 17, 19]) {
      expect(MEASURED_MIGRATIONS
        .removalVerdict('WCompass', 'newWindArrow', 'false', tier, sibling).verdict,
      `palier ${tier}`).toBe('unmeasured')
    }
  })

  it('ne borne PAS « vivant » au palier : un danger mesuré vaut partout', () => {
    for (const tier of [0, 15, 17, 20]) {
      expect(MEASURED_MIGRATIONS
        .removalVerdict('WCompass', 'showWind', 'true', tier, nowhere).verdict,
      `palier ${tier}`).toBe('live')
    }
  })

  /**
   * ⚠️ **La borne du voisinage, et pourquoi elle vaut même contre un « vivant ».**
   *
   * Un verdict mesuré aux côtés d'un autre réglage ne décrit pas un gadget qui ne le
   * porte pas. `mapWidget_showOpenStreet: false` est vivant tant que
   * `mapWidget_showTerrain: true` l'accompagne — le retirer éteint l'ombrage du relief —
   * et sans effet quand il est seul. Deux sorts, une seule clé, une seule valeur.
   */
  it('change de verdict quand le voisinage change, pour la même clé et la même valeur', () => {
    const withTerrain = carrying({ mapWidget_showTerrain: 'true' })
    const live = MEASURED_MIGRATIONS
      .removalVerdict('WCompMap', 'mapWidget_showOpenStreet', 'false', 20, withTerrain)
    expect(live).toEqual({
      verdict: 'live', successor: 'mapWidget_mapAppearance',
      present: 'theme=None terrain=Light', absent: 'theme=None terrain=None',
      effect: 'terrainShadingGone'
    })
    const alone = MEASURED_MIGRATIONS
      .removalVerdict('WCompMap', 'mapWidget_showOpenStreet', 'false', 20, nowhere)
    expect(alone.verdict).toBe('inert')
  })

  it('exige l’ABSENCE d’une clé quand le relevé l’écrit `null`', () => {
    // Le voisinage « gadget nu » de `newWindArrow` a été pris sans `showWind` du tout.
    // Un gadget qui le porte, à n'importe quelle valeur, sort de ce voisinage-là.
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'true', 20, nowhere).verdict).toBe('inert')
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'true', 20, carrying({ showWind: 'true' })))
      .toEqual({
        verdict: 'live', successor: 'windStyle', present: 'ARC', absent: 'ARROW',
        effect: 'windArcBecomesArrow'
      })
  })

  it('ne dit rien d’un voisinage jamais éprouvé', () => {
    // `showWind: peut-être` n'existe pas : le voisinage ne correspond à aucun cas.
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'false', 20, carrying({ showWind: '1' }))
      .verdict).toBe('unmeasured')
  })

  /**
   * Le même réglage, la même valeur, le même voisinage — et deux verdicts opposés selon
   * la classe du gadget. `WThermalAssistant` ne lit pas `nav_use_brackets` du tout ; les
   * deux autres en tirent `nav_label: DISTANCE`.
   */
  it('distingue les gadgets quand la mesure les distingue', () => {
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WThermalAssistant', 'nav_use_brackets', 'false', 20, nowhere).verdict)
      .toBe('inert')
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompMap', 'nav_use_brackets', 'false', 20, nowhere))
      .toEqual({
        verdict: 'live', successor: 'nav_label',
        present: 'DISTANCE', absent: 'DISTANCE_BRACKETS', effect: 'distanceBracketsReturn'
      })
  })

  it('ne dit rien d’un gadget qui ne porte pas le réglage', () => {
    expect(tableOf({
      migrations: {
        k: {
          successor: 'K', widgets: ['W'], measure: 'labo',
          cases: [{ value: 'true', present: 'a', absent: 'a', verdict: 'inert' }]
        }
      }
    }).removalVerdict('W', 'k', undefined, 20, nowhere)).toEqual({ verdict: 'unmeasured' })
  })

  it('rend de quoi expliquer un « vivant » au pilote : le successeur, avec et sans', () => {
    const wind = MEASURED_MIGRATIONS.removalVerdict('WCompass', 'showWind', 'true', 20, nowhere)
    expect(wind).toEqual({
      verdict: 'live', successor: 'windStyle', present: 'ARROW', absent: 'NONE',
      effect: 'windArrowGone'
    })
  })

  /**
   * Le relevé sait qu'un retrait change quelque chose ; encore faut-il qu'il sache le
   * **dire**. Sans `effect`, l'écran de nettoyage retombe sur sa phrase de repli et le
   * pilote relit « windStyle passe de ARROW à NONE » — exactement ce qu'il a dit ne pas
   * savoir lire, le 22 août 2026. Une mesure « vivante » ajoutée demain sans sa
   * conséquence nommée s'arrête donc ici, et pas devant lui.
   */
  it('nomme la conséquence de tout retrait qui change quelque chose', () => {
    let live = 0
    for (const { key, one } of everyCase()) {
      if (one.verdict !== 'live') {
        // La symétrie : un retrait sans effet n'a aucune conséquence à nommer, et lui
        // en prêter une donnerait à lire un danger là où la mesure dit qu'il n'y en a
        // pas.
        expect(one.effect, label(key, one)).toBeUndefined()
        continue
      }
      expect(one.effect, label(key, one)).toBeTruthy()
      live += 1
    }
    expect(live).toBeGreaterThan(0)
  })
})
