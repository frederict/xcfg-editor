import { describe, expect, it } from 'vitest'
import {
  loadPreferenceVersions,
  tierInRange,
  type PreferenceVersionDatabase,
} from '../../src/catalog/preferenceVersions'

const db: PreferenceVersionDatabase = await loadPreferenceVersions()

/** Le dernier palier — celui dont `preferenceCatalog.ts` décrit les clés. */
const lastTier = db.schema.tierCount - 1

describe('intervalles de paliers', () => {
  it('lit un palier isolé, un intervalle, et une réunion des deux', () => {
    expect(tierInRange('5', 5)).toBe(true)
    expect(tierInRange('5', 6)).toBe(false)
    expect(tierInRange('0-17', 17)).toBe(true)
    expect(tierInRange('0-17', 18)).toBe(false)
    expect(tierInRange('6,12-14,16-17', 13)).toBe(true)
    expect(tierInRange('6,12-14,16-17', 15)).toBe(false)
  })

  it('un intervalle vide ne contient rien', () => {
    expect(tierInRange('', 0)).toBe(false)
  })
})

describe('paliers', () => {
  it('numérote les paliers de 0 à n-1, dans l’ordre des versions', () => {
    db.index.tiers.forEach((tier, index) => {
      expect(tier.tier).toBe(index)
      expect(tier.versionCodes.length).toBeGreaterThan(0)
    })
    expect(db.schema.tierCount).toBe(db.index.tiers.length)
  })

  it('rattache chaque version à un palier qui la revendique', () => {
    for (const version of db.index.versions) {
      expect(db.tiersOf(version.code)).toContain(version.tier)
      expect(db.tier(version.tier)?.versionCodes).toContain(version.code)
    }
  })

  it('ne fabrique aucun palier vide : chacun apporte un changement', () => {
    // Un palier qui ne changerait rien serait un faux choix dans un menu. Le premier
    // est le seul à ne rien avoir « en plus » : il est l'origine.
    for (const tier of db.index.tiers.slice(1)) {
      const changes = tier.keysAdded.length + tier.keysRemoved.length
      expect(changes, `palier ${tier.tier} (${tier.firstName})`).toBeGreaterThan(0)
    }
  })

  it('rend plusieurs paliers pour un versionCode qui en porte plusieurs', () => {
    // 91192 est déclaré par quatre APK dont les inventaires diffèrent : le versionCode
    // n'identifie pas le schéma, et la base ne le cache pas.
    expect(db.tiersOf(91192).length).toBeGreaterThan(1)
    expect(db.index.versionCodeConflicts.map((c) => c.code)).toContain(91192)
  })

  it('ne connaît pas une version qui n’est pas dans l’archive', () => {
    expect(db.tiersOf(1)).toEqual([])
    expect(db.tier(-1)).toBeUndefined()
    expect(db.tier(db.schema.tierCount)).toBeUndefined()
  })

  it('accorde le nombre de clés annoncé et celles qu’on peut énumérer', () => {
    for (const tier of db.index.tiers) {
      expect(db.keysAt(tier.tier).length, `palier ${tier.tier}`).toBe(tier.keyCount)
    }
  })

  it('tait le nombre de clés PUBLIC des paliers dont la portée n’a pas été lue', () => {
    // Huit versions rendent tout en `PUBLIC` faute d'avoir trouvé l'énumération de
    // portée. Leur compter des clés exportées serait leur prêter une mesure.
    const unread = new Set(
      db.index.versions.filter((v) => !v.scopeRead).map((v) => v.tier),
    )
    expect(unread.size).toBeGreaterThan(0)
    for (const tier of unread) {
      expect(db.tier(tier)?.publicCount, `palier ${tier}`).toBeNull()
    }
    expect(db.tier(lastTier)?.publicCount).toBeGreaterThan(0)
  })
})

describe('statut d’une clé', () => {
  it('distingue « lue », « reliquat », « trou du relevé » et « absente »', () => {
    // `Sensors.ExtTypes` est lue jusqu'au palier 5 et plus jamais ensuite ; un fichier
    // de 0.9.9.1 (palier 6) la porte encore. C'est un reliquat, et c'est nettoyable.
    expect(db.keyStatus('Sensors.ExtTypes', 5)).toBe('present')
    expect(db.keyStatus('Sensors.ExtTypes', 6)).toBe('legacy')
    expect(db.keyStatus('Sensors.ExtTypes', lastTier)).toBe('absent')

    // `Sound.AcousticVario.CustomProfile` n'est lue qu'à partir du palier 18, et
    // pourtant des fichiers de 2023 à 2025 la portent : c'est notre relevé qui a un
    // trou, la clé existait. À ne jamais supprimer.
    expect(db.keyStatus('Sound.AcousticVario.CustomProfile', 18)).toBe('present')
    expect(db.keyStatus('Sound.AcousticVario.CustomProfile', 6)).toBe('attested')
    expect(db.keyStatus('Sound.AcousticVario.CustomProfile', 13)).toBe('attested')
  })

  it('ne sait rien d’une clé qu’aucun palier ne lit, et le dit', () => {
    // « Ne pas savoir » n'autorise pas à effacer : une clé venue d'un appareil que
    // nous n'avons jamais relevé ne doit pas se présenter comme retirée.
    expect(db.keyStatus('Clef.Inventee', lastTier)).toBe('unknown')
    expect(db.knows('Clef.Inventee')).toBe(false)
    expect(db.knows('Display.Theme')).toBe(true)
  })

  it('ne conclut rien hors des bornes de la base', () => {
    expect(db.keyStatus('Display.Theme', -1)).toBe('unknown')
    expect(db.keyStatus('Display.Theme', db.schema.tierCount)).toBe('unknown')
  })

  it('déclare « lue » toute clé que le palier énumère, et réciproquement', () => {
    for (const tier of [0, Math.floor(lastTier / 2), lastTier]) {
      for (const key of db.keysAt(tier)) {
        expect(db.keyStatus(key, tier), `${key} au palier ${tier}`).toBe('present')
      }
    }
  })
})

describe('la règle d’or, éprouvée sur le corpus', () => {
  it('ne déclare jamais « absente » une clé qu’un fichier réel atteste', () => {
    // C'est l'invariant qui protège du pire : proposer la suppression d'un réglage
    // qu'un fichier prouve valide. Toute clé non retrouvée au relevé de sa version
    // doit ressortir en `attested`, `legacy` ou `blind` — jamais en `absent`.
    for (const check of db.index.corpus) {
      for (const tier of check.tiers) {
        for (const key of check.unmatched) {
          expect(
            db.keyStatus(key, tier),
            `${key} au palier ${tier} (versionCode ${check.code})`,
          ).not.toBe('absent')
        }
      }
    }
  })

  it('retrouve dans le relevé toutes les clés des fichiers, sauf celles qu’il liste', () => {
    for (const check of db.index.corpus) {
      expect(check.matched + check.unmatched.length, `versionCode ${check.code}`)
        .toBe(check.keys)
      if (check.tiers.length === 0) expect(check.matched).toBe(0)
    }
  })

  it('ne publie aucun nom de fichier du corpus', () => {
    // Le corpus vit dans un dépôt privé et ses fichiers portent des prénoms. La base
    // est publique : elle compte les fichiers, elle ne les nomme pas.
    for (const check of db.index.corpus) {
      expect(check.fileCount).toBeGreaterThan(0)
      expect(Object.keys(check)).not.toContain('files')
    }
    expect(JSON.stringify(db.index)).not.toMatch(/\.xcfg/)
  })

  it('signale le repli sur la version la plus proche plutôt que de le taire', () => {
    // 91230 (0.9.12.3) est déclaré par des fichiers du corpus et par aucun APK.
    const check = db.corpusCheck(91230)
    expect(check).toBeDefined()
    expect(check?.approximatedBy).not.toBeNull()
    expect(check?.note).toContain('plus proche')
  })

  it('compte à part les exports de pages, qui ne portent aucune préférence', () => {
    // Leur silence n'est pas un accord : le confondre gonflerait le taux de réussite.
    expect(db.index.corpusSkipped.length).toBeGreaterThan(0)
    for (const skipped of db.index.corpusSkipped) {
      expect(skipped.reason).toBeTruthy()
      expect(skipped.fileCount).toBeGreaterThan(0)
    }
  })
})

describe('clés retirées', () => {
  it('ne retient que celles que le dernier palier ne lit plus', () => {
    const current = new Set(db.keysAt(lastTier))
    for (const key of Object.keys(db.schema.retired)) {
      expect(current.has(key), key).toBe(false)
      expect(db.retired(key)?.lastTier).toBeLessThan(lastTier)
    }
    expect(db.retired('Display.Theme')).toBeUndefined()
  })

  it('date la disparition de `Sensors.ExtTypes` au palier qui la lit en dernier', () => {
    expect(db.retired('Sensors.ExtTypes')?.lastTier).toBe(5)
  })

  it('ne prête pas de portée à une version qui n’en a pas livré', () => {
    const unread = new Set(
      db.index.versions.filter((v) => !v.scopeRead).map((v) => v.tier),
    )
    for (const [key, entry] of Object.entries(db.schema.retired)) {
      if (unread.has(entry.lastTier)) expect(entry.scope, key).toBeUndefined()
    }
  })
})

describe('mémoire du chargement', () => {
  it('rend la même base à deux appels', async () => {
    expect(await loadPreferenceVersions()).toBe(db)
  })
})
