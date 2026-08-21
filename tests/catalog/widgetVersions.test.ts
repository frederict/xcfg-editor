import { describe, expect, it } from 'vitest'
import {
  loadVersionDatabase,
  tierInRange,
  type VersionDatabase,
} from '../../src/catalog/widgetVersions'

const db: VersionDatabase = await loadVersionDatabase()

describe('intervalles de paliers', () => {
  it('lit un palier isolé, un intervalle, et une réunion des deux', () => {
    expect(tierInRange('3', 3)).toBe(true)
    expect(tierInRange('3', 4)).toBe(false)
    expect(tierInRange('0-2', 2)).toBe(true)
    expect(tierInRange('0-2', 3)).toBe(false)
    expect(tierInRange('0-2,5', 5)).toBe(true)
    expect(tierInRange('0-2,5', 4)).toBe(false)
  })

  it('un intervalle vide ne contient rien', () => {
    expect(tierInRange('', 0)).toBe(false)
  })
})

describe('paliers', () => {
  it('couvre toutes les versions dont le relevé a réussi', () => {
    for (const version of db.index.versions) {
      expect(version.tier).not.toBeNull()
      expect(db.tiersOf(version.code)).toContain(version.tier)
    }
  })

  it('rend plusieurs paliers pour un versionCode qui en porte plusieurs', () => {
    // 91192 est déclaré par quatre APK dont les inventaires de clés diffèrent : le
    // versionCode n'identifie pas un schéma, et la base ne le cache pas.
    expect(db.tiersOf(91192).length).toBeGreaterThan(1)
  })

  it('numérote les paliers de 0 à n-1, dans l’ordre des versions', () => {
    db.index.tiers.forEach((tier, index) => {
      expect(tier.tier).toBe(index)
      expect(tier.versionCodes.length).toBeGreaterThan(0)
    })
    expect(db.schema.tierCount).toBe(db.index.tiers.length)
  })

  it("ne fabrique aucun palier vide : chacun apporte un changement", () => {
    // Un palier qui ne changerait rien serait un faux choix dans un menu. Le premier
    // est le seul à ne rien avoir « en plus » : il est l'origine.
    for (const tier of db.index.tiers.slice(1)) {
      const changes =
        tier.widgetsAdded.length +
        tier.widgetsRemoved.length +
        Object.keys(tier.keysAdded).length +
        Object.keys(tier.keysRemoved).length
      expect(changes, `palier ${tier.tier} (${tier.firstName})`).toBeGreaterThan(0)
    }
  })

  it('rend un palier connu et rien pour une version inconnue', () => {
    const first = db.index.versions[0]!
    expect(db.tier(first.tier!)?.versionCodes).toContain(first.code)
    expect(db.tiersOf(1)).toEqual([])
  })
})

describe('interrogation', () => {
  const lastTier = db.schema.tierCount - 1

  it('rend les widgets et les clés du dernier palier', () => {
    expect(db.widgetsAt(lastTier).length).toBeGreaterThan(50)
    expect(db.keysAt('WCompass', lastTier)).toContain('_bg')
  })

  it('distingue « lue » de « attestée » de « aveugle » de « absente »', () => {
    expect(db.keyStatus('WCompass', '_bg', lastTier)).toBe('present')
    expect(db.keyStatus('WCompass', 'cle_inventee', lastTier)).toBe('absent')
    expect(db.keyStatus('WidgetInexistant', 'x', lastTier)).toBe('unknown')
    expect(db.keyStatus('WCompass', '_bg', -1)).toBe('unknown')
  })

  it("ne déclare jamais « absente » une clé dont l'extraction est aveugle", () => {
    // Une clé qu'aucun relevé ne retrouve mais qu'un fichier réel porte : on ne peut
    // rien conclure de son absence, et la confondre avec une clé retirée conduirait
    // un outil de nettoyage à supprimer un réglage valide.
    for (const [widget, keys] of Object.entries(db.schema.blind)) {
      for (const key of keys) {
        for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
          expect(db.keyStatus(widget, key, tier), `${widget}.${key} au palier ${tier}`)
            .not.toBe('absent')
        }
      }
    }
  })

  it("distingue le trou d'extraction du reliquat conservé par XCTrack", () => {
    // `fontSize` sur les widgets cartographiques : les fichiers de 2022 la portent,
    // les relevés de l'époque la manquent, les relevés récents la lisent. Trou.
    expect(db.keyStatus('WCompMap', 'fontSize', 0)).toBe('attested')
    expect(db.keyStatus('WCompMap', 'fontSize', db.schema.tierCount - 1)).toBe('present')

    // `showWind` : lue jusqu'au palier 17, remplacée par `windStyle` ensuite, et
    // pourtant encore présente dans un fichier de 1.0.3 — sur la seule boussole que
    // le pilote n'a pas retouchée depuis. Reliquat, donc nettoyable.
    expect(db.keyStatus('WCompass', 'showWind', 0)).toBe('present')
    expect(db.keyStatus('WCompass', 'showWind', db.schema.tierCount - 1)).toBe('legacy')
    expect(db.keyStatus('WCompass', 'windStyle', db.schema.tierCount - 1)).toBe('present')
  })
})

describe('confrontation aux fichiers réels', () => {
  it("n'a aucune clé du corpus déclarée absente de la version qui l'a écrite", () => {
    // La preuve est matérielle : le fichier a été produit par cette version-là. Si la
    // base dit le contraire, c'est la base qui a tort.
    for (const check of db.index.corpus) {
      if (check.tier === null) continue // plusieurs paliers portent ce versionCode
      for (const [widget, keys] of Object.entries(check.unmatched)) {
        for (const key of keys) {
          // `absent` voudrait dire « la base n'a rien à en dire », alors qu'un
          // fichier réel la porte : chaque écart doit être qualifié.
          expect(db.keyStatus(widget, key, check.tier),
                 `${widget}.${key} attendu dans ${check.code}`).not.toBe('absent')
        }
      }
    }
  })

  it('couvre les sept versions du corpus historique, plus la version courante', () => {
    const codes = db.index.corpus.map((c) => c.code)
    expect(codes).toEqual(expect.arrayContaining([90615, 90830, 90840, 90861, 90910, 91192, 91230]))
  })
})
