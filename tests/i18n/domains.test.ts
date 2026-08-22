import { describe, expect, it } from 'vitest'
import fr from '../../src/i18n/messages/fr'
import { DOMAINS, DOMAIN_PREFIXES, keyPrefix, type Domain, type DomainCatalog } from '../../src/i18n/domains'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'

/**
 * Le découpage en domaines existe pour qu'on puisse verser des messages **à plusieurs, en
 * parallèle**, sans se croiser. Ces tests gardent les quatre propriétés qui rendent ce
 * parallélisme sûr :
 *
 * 1. **une clé n'est définie que dans un domaine** — sans quoi la fusion en garderait
 *    silencieusement une, et le travail de quelqu'un disparaîtrait sans erreur ;
 * 2. **un préfixe appartient à un domaine et à un seul** — c'est ce qui répond
 *    mécaniquement à « où ajouter cette clé ? » et « où est-elle déjà ? » ;
 * 3. **les cinq langues portent le même jeu de clés, domaine par domaine** ;
 * 4. **une clé oubliée dans une traduction ne compile pas** — la propriété que le
 *    découpage ne devait pas faire perdre, vérifiée ici par `@ts-expect-error`.
 *
 * Les fichiers sont ramassés par `import.meta.glob` et non énumérés : un dixième domaine
 * sera couvert sans que personne ait à revenir ici.
 */

interface DomainModule {
  default: Readonly<Record<string, unknown>>
}

const MODULES = import.meta.glob<DomainModule>('../../src/i18n/messages/*/*.ts', { eager: true })

/**
 * Le source de tous les modules du dépôt, pour le contrôle de couches ci-dessous.
 * `?raw` : on lit le texte, on n'exécute rien.
 */
const SOURCES = import.meta.glob<string>('../../src/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/**
 * Les imports de `src/i18n/` d'un module, avec le renseignement qui compte : `import
 * type` ou non.
 *
 * On découpe sur `^import ` plutôt que d'écrire une expression rationnelle par
 * déclaration : le dépôt n'écrit pas de point-virgule et un import peut tenir sur dix
 * lignes, ce qui fait qu'une expression gourmande relie la première déclaration au
 * `from` de la dixième — et accuse le mauvais import.
 */
function i18nImports(source: string): { typeOnly: boolean; from: string }[] {
  const found: { typeOnly: boolean; from: string }[] = []
  for (const statement of source.split(/^import /m).slice(1)) {
    const match = /from '([^']*)'/.exec(statement)
    if (match === null) continue
    const from = match[1] as string
    if (!from.includes('i18n')) continue
    found.push({ typeOnly: statement.startsWith('type '), from })
  }
  return found
}

/** `../../src/i18n/messages/de/library.ts` donne `['de', 'library']`. */
function coordinatesOf(path: string): [string, string] {
  const parts = path.split('/')
  return [parts[parts.length - 2] as string, (parts[parts.length - 1] as string).replace(/\.ts$/, '')]
}

function keysOf(language: string, domain: string): string[] {
  const path = `../../src/i18n/messages/${language}/${domain}.ts`
  const module = MODULES[path]
  if (module === undefined) throw new Error(`fichier de domaine absent : ${path}`)
  return Object.keys(module.default).sort()
}

describe('découpage des catalogues en domaines', () => {
  it('donne à chaque langue les neuf mêmes fichiers, plus leur assemblage', () => {
    const found = new Map<string, string[]>()
    for (const path of Object.keys(MODULES)) {
      const [language, domain] = coordinatesOf(path)
      found.set(language, [...(found.get(language) ?? []), domain].sort())
    }
    const expected = [...DOMAINS, 'index'].sort()
    expect([...found.keys()].sort()).toEqual([...UI_LANGUAGES].sort())
    for (const language of UI_LANGUAGES) {
      expect(found.get(language), language).toEqual(expected)
    }
  })

  it('ne définit aucune clé dans deux domaines à la fois', () => {
    // Le danger propre au découpage : deux lots qui déclarent `library.entryCount` chacun
    // dans son fichier. La fusion en garde une, sans rien dire.
    const owner = new Map<string, Domain>()
    for (const domain of DOMAINS) {
      for (const key of keysOf('fr', domain)) {
        expect(owner.get(key), `${key} est aussi dans « ${owner.get(key) ?? ''} »`).toBeUndefined()
        owner.set(key, domain)
      }
    }
    // Rien ne s'est perdu dans l'assemblage : autant de clés fusionnées que déclarées.
    expect(Object.keys(fr).sort()).toEqual([...owner.keys()].sort())
  })

  it('n’attribue chaque préfixe qu’à un seul domaine', () => {
    const owner = new Map<string, Domain>()
    for (const domain of DOMAINS) {
      for (const prefix of DOMAIN_PREFIXES[domain]) {
        expect(owner.get(prefix), `« ${prefix} » est revendiqué deux fois`).toBeUndefined()
        owner.set(prefix, domain)
      }
    }
  })

  it('ne porte que des clés dont le préfixe est déclaré par leur domaine', () => {
    for (const domain of DOMAINS) {
      for (const key of keysOf('fr', domain)) {
        expect(DOMAIN_PREFIXES[domain], `${key} n’a rien à faire dans « ${domain} »`)
          .toContain(keyPrefix(key))
      }
    }
  })

  it('porte le même jeu de clés dans les cinq langues, domaine par domaine', () => {
    // Le typage l'exige déjà ; ce test le dit **par fichier**, de sorte qu'un catalogue
    // recopié à la main ou repris d'une version antérieure se signale à l'endroit exact.
    for (const domain of DOMAINS) {
      const reference = keysOf('fr', domain)
      for (const language of UI_LANGUAGES) {
        expect(keysOf(language, domain), `${language} / ${domain}`).toEqual(reference)
      }
    }
  })

  it('refuse à la compilation une clé oubliée dans une traduction', () => {
    // **La propriété centrale du socle, et celle que le découpage ne devait pas faire
    // perdre** : le français est la langue d'écriture, les quatre autres en dérivent.
    // `@ts-expect-error` échoue à la compilation s'il n'y a PAS d'erreur — ce test tombe
    // donc le jour où `DomainCatalog` cesserait d'exiger les clés du français.

    // @ts-expect-error — un domaine vide alors que le français y déclare quatre clés
    const incomplete: DomainCatalog<'library'> = {}
    expect(incomplete).toBeDefined()

    const wrongShape: DomainCatalog<'library'> = {
      'library.entryRestored': '…',
      'library.entryRestoredBeside': '…',
      // @ts-expect-error — c'est un pluriel en français : une chaîne ne suffit pas
      'library.entryCount': '…',
      'library.storedLine': '…'
    }
    expect(wrongShape).toBeDefined()
  })

  it('ne laisse aucune couche sous l’interface importer le socle autrement qu’en type', () => {
    // **La décision sur la prose hors interface, gardée par un test.** `src/model/`,
    // `src/library/`, `src/catalog/` et `src/render/` reçoivent un traducteur en argument
    // et n'importent de `src/i18n/` que des **types**, effacés à la compilation. Un
    // `import` de valeur y ferait entrer le socle — et, de proche en proche, un catalogue
    // de langue — dans des couches que la bibliothèque charge sans écran.
    let checked = 0
    for (const [path, source] of Object.entries(SOURCES)) {
      if (path.includes('/src/ui/') || path.includes('/src/i18n/')) continue
      for (const found of i18nImports(source)) {
        checked += 1
        expect(found.typeOnly, `${path} importe « ${found.from} » sans « type »`).toBe(true)
      }
    }
    // Le test ne doit pas devenir vert en cessant de trouver quoi que ce soit.
    expect(checked).toBeGreaterThan(0)
  })

  it('garde le jeu de clés plat : le domaine ne se lit pas dans l’appel', () => {
    // `t('library.entryCount')` s'écrit comme avant le découpage. Un message qui change de
    // fichier garde sa clé, et aucun appelant ne bouge.
    const flat: Record<string, unknown> = fr
    expect(flat['library.entryCount']).toBeDefined()
    expect(flat['library']).toBeUndefined()
  })
})
