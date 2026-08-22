import { describe, expect, it } from 'vitest'
import {
  MEASURED_MIGRATIONS, MigrationTable, type MigrationsFile
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
 * 2. **est-il cohérent avec le reste du dépôt** — la colonne « absent » est la valeur
 *    d'usine de `widgetDefaults.json`, et les réglages décrits sont exactement ceux que
 *    la base de versions peut rendre `legacy` ;
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

describe('le relevé dit la même chose que lui-même', () => {
  it('« sans effet » veut dire la même valeur avec et sans, toujours', () => {
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      for (const [value, measure] of Object.entries(migration?.values ?? {})) {
        const same = measure.present === measure.absent
        expect(measure.verdict === 'inert', `${key}=${value}`).toBe(same)
      }
    }
  })

  it('nomme un successeur et au moins un gadget pour chaque réglage', () => {
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      expect(migration?.successor, key).toBeTruthy()
      expect(migration?.widgets.length, key).toBeGreaterThan(0)
      // Une mesure sans provenance n'est pas une mesure : on saurait le chiffre, pas d'où
      // il vient, et personne ne pourrait le rejouer.
      expect(migration?.measure.length, key).toBeGreaterThan(20)
    }
  })
})

describe('le relevé s’accorde avec le reste du dépôt', () => {
  it('la colonne « absent » est la valeur d’usine relevée sur les 75 gadgets', () => {
    // C'est ce qui donne son sens à la comparaison : « sans le réglage » n'est pas une
    // idée, c'est ce que l'appareil a écrit sur un gadget posé nu, à la même version.
    expect(DEFAULTS_VERSION_NAME).toBe('1.0.3-beta')
    let checked = 0
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      if (migration === undefined) continue
      // Sauf quand `requires` dit le contraire : là, les deux colonnes ont été prises
      // dans un voisinage, pas sur un gadget nu, et la valeur d'usine ne les décrit pas.
      if (migration.requires !== undefined) continue
      const [successor, field] = migration.successor.split('.')
      for (const [value, measure] of Object.entries(migration.values)) {
        for (const widget of migration.widgets) {
          const factory = defaultValueAt(widget, successor ?? '', field)
          if (factory === undefined) continue
          expect(String(factory), `${widget}.${key}=${value}`).toBe(measure.absent)
          checked += 1
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('un relevé pris hors du gadget nu porte son voisinage, écrit noir sur blanc', () => {
    // La contrepartie du test précédent : ce qui échappe à la valeur d'usine doit dire
    // pourquoi, sans quoi le saut serait silencieux.
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      if (migration === undefined) continue
      const [successor, field] = migration.successor.split('.')
      for (const measure of Object.values(migration.values)) {
        for (const widget of migration.widgets) {
          const factory = defaultValueAt(widget, successor ?? '', field)
          if (factory === undefined || String(factory) === measure.absent) continue
          expect(migration.requires, `${widget}.${key}`).toBeDefined()
        }
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

  it('ne dit rien d’un réglage absent de la table', () => {
    expect(MEASURED_MIGRATIONS.removalVerdict('WCompass', 'inventé', 'true', 20, nowhere))
      .toEqual({ verdict: 'unmeasured' })
  })

  it('ne dit rien d’un gadget sur lequel le réglage n’a pas été porté', () => {
    expect(MEASURED_MIGRATIONS.removalVerdict('WCompMap', 'showWind', 'true', 20, nowhere))
      .toEqual({ verdict: 'unmeasured' })
  })

  it('ne dit rien d’une valeur jamais éprouvée', () => {
    // `newWindArrow: true` et `mapWidget_showTerrain: false` n'ont jamais été portés sur
    // un appareil. Le relevé les laisse dehors, et le nettoyage s'abstient.
    expect(MEASURED_MIGRATIONS.removalVerdict('WCompass', 'newWindArrow', 'true', 20, nowhere).verdict)
      .toBe('unmeasured')
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompMap', 'mapWidget_showTerrain', 'false', 20, nowhere).verdict)
      .toBe('unmeasured')
  })

  it('borne « sans effet » au palier où la mesure a été prise', () => {
    const sibling = (key: string): string | undefined => key === 'showWind' ? 'true' : undefined
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

  it('ne dit rien hors du voisinage où la mesure a été prise', () => {
    // `newWindArrow: false` n'a jamais été lu qu'aux côtés de `showWind: true`. Seul.
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'false', 20, nowhere).verdict)
      .toBe('unmeasured')
    expect(MEASURED_MIGRATIONS
      .removalVerdict('WCompass', 'newWindArrow', 'false', 20, () => 'false').verdict)
      .toBe('unmeasured')
  })

  it('ne dit rien d’un gadget qui ne porte pas le réglage', () => {
    expect(tableOf({
      migrations: {
        k: {
          successor: 'K', widgets: ['W'], measure: 'labo',
          values: { true: { present: 'a', absent: 'a', verdict: 'inert' } }
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
    for (const key of MEASURED_MIGRATIONS.measuredKeys()) {
      const migration = MEASURED_MIGRATIONS.migrationOf(key)
      for (const [value, measure] of Object.entries(migration?.values ?? {})) {
        if (measure.verdict !== 'live') {
          // La symétrie : un retrait sans effet n'a aucune conséquence à nommer, et lui
          // en prêter une donnerait à lire un danger là où la mesure dit qu'il n'y en a
          // pas.
          expect(measure.effect, `${key}=${value}`).toBeUndefined()
          continue
        }
        expect(measure.effect, `${key}=${value}`).toBeTruthy()
        live += 1
      }
    }
    expect(live).toBeGreaterThan(0)
  })
})
