import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'

/**
 * # Ce que la documentation promet, et que le dépôt doit tenir
 *
 * `manuels.test.ts` garde la **forme** des cinq manuels ; `intitules.test.ts` garde les
 * **mots de l'interface** qu'ils citent. Restent trois façons pour un texte de devenir
 * faux sans que rien ne s'en aperçoive, et ce fichier les couvre :
 *
 * 1. **une traduction perd une section.** Les cinq README portent le même plan ; un
 *    chapitre sauté ne casse rien, ne se voit pas, et le lecteur néerlandophone ne saura
 *    jamais ce qu'il n'a pas lu.
 * 2. **un chemin cité n'existe plus.** `src/model/inspection.ts`, `tools/…` : un fichier
 *    renommé laisse derrière lui une phrase qui envoie le lecteur nulle part.
 * 3. **une fonctionnalité annoncée n'est atteignable par aucun écran.** C'est le cas qui
 *    a coûté le plus cher : un module écrit, testé, documenté — et branché à rien. Le
 *    README l'annonçait ; l'outil ne le faisait pas.
 *
 * ## Ce que ces contrôles NE font pas
 *
 * - Ils ne lisent pas les **titres** des sections : cinq langues, cinq libellés. C'est le
 *   **plan** qui est comparé, pas le texte. Une section renommée passe ; une section
 *   disparue, non.
 * - Le point 3 ne regarde que `src/model/` et `src/ui/`. `src/catalog/` en est exclu à
 *   dessein : la matière y précède l'usage — `preferenceVersions.ts` est aujourd'hui une
 *   base complète, testée et documentée, qu'aucun écran ne consulte encore. C'est un état
 *   assumé du projet, pas un oubli, et l'y inclure ferait crier ce test à tort dès
 *   maintenant.
 * - Un module **atteignable** peut n'être appelé que par du code mort. La chaîne d'`import`
 *   dit « rien ne peut y arriver », jamais « quelqu'un y arrive ».
 */

const READMES = import.meta.glob<string>('../../README*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
})

const MANUALS = import.meta.glob<string>('../../docs-app/manuel.*.html', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/** Tous les modules du dépôt, chemin relatif à la racine → source. */
const MODULES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../src/**/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default'
    })
  ).map(([key, source]) => [key.replace('../../', ''), source])
)

/** Les pages HTML qui démarrent quelque chose : l'application, et les trois bancs d'essai. */
const PAGES: Record<string, string> = Object.fromEntries(
  Object.entries({
    ...import.meta.glob<string>('../../index.html', {
      eager: true,
      query: '?raw',
      import: 'default'
    }),
    ...import.meta.glob<string>('../../src/ui/*.demo.html', {
      eager: true,
      query: '?raw',
      import: 'default'
    })
  }).map(([key, source]) => [key.replace('../../', ''), source])
)

/**
 * Tout ce qui existe sur le disque et qu'un texte peut citer.
 *
 * Lu par `node:fs` et non par `import.meta.glob` : le glob de Vite ne rend que ce qu'il
 * saurait transformer en module, et laisse donc de côté les scripts `.py` de `tools/` —
 * que le README cite abondamment. Un contrôle d'existence qui ignore la moitié des
 * fichiers cités crie à tort, ce qui est la seule façon sûre de se faire désactiver.
 */
const REPOSITORY_FILES = listFiles(process.cwd())

function listFiles(root: string, prefix = ''): Set<string> {
  const ignored = new Set(['node_modules', 'dist', 'logs'])
  const found = new Set<string>()
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.')) continue
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) for (const nested of listFiles(root, path)) found.add(nested)
    else found.add(path)
  }
  return found
}

function readme(language: UiLanguage): string {
  const path = language === 'fr' ? '../../README.md' : `../../README.${language}.md`
  const source = READMES[path]
  if (source === undefined) throw new Error(`${path.slice(6)} manque`)
  return source
}

/** Le nom de fichier du README d'une langue, pour que l'échec nomme le bon. */
function readmeName(language: UiLanguage): string {
  return language === 'fr' ? 'README.md' : `README.${language}.md`
}

/**
 * Le plan d'un Markdown : la suite des niveaux de titre, hors commentaires HTML.
 *
 * Les recettes de capture vivent dans des commentaires et contiennent des lignes qui
 * commencent par un dièse ; les blocs de code aussi (`# 1. Dépaqueter l'APK`). Ni les uns
 * ni les autres ne sont des titres.
 */
function outline(markdown: string): number[] {
  const text = markdown.replaceAll(/<!--[\s\S]*?-->/g, '').replaceAll(/```[\s\S]*?```/g, '')
  return [...text.matchAll(/^(#{1,6}) /gm)].map((match) => (match[1] ?? '').length)
}

describe('le plan des cinq README', () => {
  it('porte le même nombre de sections de premier niveau', () => {
    const counts = Object.fromEntries(
      UI_LANGUAGES.map((language) => [
        readmeName(language),
        outline(readme(language)).filter((level) => level === 2).length
      ])
    )
    const reference = counts['README.md']
    expect(counts, 'une traduction a perdu ou gagné une section').toEqual(
      Object.fromEntries(Object.keys(counts).map((name) => [name, reference]))
    )
  })

  it('suit le même enchaînement jusqu’aux captures, dans les cinq langues', () => {
    // Le français porte, après « Contribuer », des sous-sections que les traductions
    // renvoient explicitement au README français : les comparer serait leur reprocher un
    // choix assumé. Le corps commun, lui — jusqu'au premier sous-titre, celui des
    // captures — doit avoir exactement la même forme partout.
    const shapes = Object.fromEntries(
      UI_LANGUAGES.map((language) => {
        const levels = outline(readme(language))
        const firstSubsection = levels.indexOf(3)
        return [readmeName(language), levels.slice(0, firstSubsection + 1).join(' ')]
      })
    )
    const reference = shapes['README.md']
    expect(shapes, 'le corps commun des README a divergé').toEqual(
      Object.fromEntries(Object.keys(shapes).map((name) => [name, reference]))
    )
  })
})

/**
 * Les chemins cités entre accents graves par la documentation.
 *
 * Un chemin se reconnaît à son extension. Ce qui est cité sans dossier — `manuel.fr.html`,
 * `extract-widget-labels.py` — se cherche par son seul nom : le texte parle alors d'un
 * fichier que le lecteur retrouvera de toute façon.
 */
function citedPaths(source: string): string[] {
  return [
    ...new Set(
      [...source.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|json|md|html|css|py|yml))`/g)].map(
        (match) => match[1] ?? ''
      )
    )
  ]
}

function fileExists(cited: string): boolean {
  if (REPOSITORY_FILES.has(cited)) return true
  // Cité sans son dossier : un seul nom suffit s'il est unique dans le dépôt.
  if (!cited.includes('/')) {
    return [...REPOSITORY_FILES].some((path) => path.endsWith(`/${cited}`))
  }
  return false
}

describe('ce que la documentation cite du dépôt', () => {
  it('ne renvoie à aucun fichier disparu', () => {
    const missing: Record<string, string[]> = {}
    const texts: Record<string, string> = {
      ...Object.fromEntries(
        UI_LANGUAGES.map((language) => [readmeName(language), readme(language)])
      ),
      ...Object.fromEntries(
        UI_LANGUAGES.map((language) => [
          `manuel.${language}.html`,
          MANUALS[`../../docs-app/manuel.${language}.html`] ?? ''
        ])
      )
    }
    for (const [name, source] of Object.entries(texts)) {
      const gone = citedPaths(source).filter((cited) => !fileExists(cited))
      if (gone.length > 0) missing[name] = gone
    }
    expect(missing, 'chemins cités qui n’existent plus').toEqual({})
  })

  it('ne cite aucune fonction que le dépôt n’a pas', () => {
    // `machin()` entre accents graves est une promesse vérifiable ; un identifiant nu ne
    // l'est pas — le README en cite quarante qui sont des **clés de fichier `.xcfg`**
    // (`navigations`, `WFreeText`, `mapWidget_showTerrain`), pas du code. Les confondre
    // ferait échouer ce test sur des citations parfaitement justes.
    const declarations = Object.values(MODULES).join('\n')
    const missing = new Set<string>()
    for (const source of Object.values(READMES)) {
      for (const match of source.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)\(\)`/g)) {
        const name = match[1] ?? ''
        if (!new RegExp(String.raw`\b${name}\b`).test(declarations)) missing.add(name)
      }
    }
    expect([...missing], 'fonctions citées qui n’existent nulle part').toEqual([])
  })
})

/**
 * Ce que `spécificateur` désigne depuis `from`, quand il désigne un module du dépôt.
 *
 * Les deux formes que Vite résout et qu'il faut donc suivre : `./machin` → `machin.ts`, et
 * `../library` → `library/index.ts`. Le reste — un paquet de `node_modules`, un `.json`,
 * un `.css` — ne mène à aucun module et s'arrête là.
 */
function resolveImport(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  const segments = [...from.split('/').slice(0, -1), ...specifier.split('/')]
  const resolved: string[] = []
  for (const segment of segments) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') resolved.pop()
    else resolved.push(segment)
  }
  const base = resolved.join('/')
  for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
    if (MODULES[candidate] !== undefined) return candidate
  }
  return undefined
}

/** Les modules qu'une page HTML finit par charger, `import()` différés compris. */
function reachableModules(): Set<string> {
  const queue = Object.values(PAGES).flatMap((page) =>
    [...page.matchAll(/src="([^"]+\.ts)"/g)].map((match) =>
      (match[1] ?? '').replace(/^\.?\//, '')
    )
  )
  // Un `src="./main.ts"` d'une page de `src/ui/` désigne `src/ui/main.ts`.
  const entries = queue.map((path) =>
    MODULES[path] === undefined && MODULES[`src/ui/${path}`] !== undefined
      ? `src/ui/${path}`
      : path
  )
  const seen = new Set<string>()
  const pending = [...entries]
  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined || seen.has(current)) continue
    const source = MODULES[current]
    if (source === undefined) continue
    seen.add(current)
    for (const match of source
      .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
      .matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const target = resolveImport(current, match[1] ?? '')
      if (target !== undefined) pending.push(target)
    }
  }
  return seen
}

describe('ce que l’application expose vraiment', () => {
  it('n’a, dans src/model et src/ui, aucun module qu’aucun écran n’atteint', () => {
    // Le cas qui a motivé ce test : un modèle écrit, couvert par ses tests, cité par le
    // README — et importé par aucun écran. Rien ne le signalait. Ni le compilateur, qui
    // ne voit qu'un module valide, ni les tests, qui l'appelaient directement, ni la
    // relecture, qui lisait un fichier juste. La documentation, elle, promettait une
    // fonctionnalité que le pilote ne trouvait pas.
    const reached = reachableModules()
    const orphans = Object.keys(MODULES)
      .filter((path) => path.startsWith('src/model/') || path.startsWith('src/ui/'))
      .filter((path) => !reached.has(path))
    expect(orphans, 'modules qu’aucun écran ne peut atteindre').toEqual([])
  })

  it('part bien des quatre pages du dépôt — sinon ce contrôle ne prouve rien', () => {
    // Un chemin d'entrée mal lu viderait le test précédent : aucun module atteint, donc
    // tout orphelin… ou l'inverse, si la liste des pages tombait à zéro.
    expect(Object.keys(PAGES).sort()).toEqual([
      'index.html',
      'src/ui/libraryPanel.demo.html',
      'src/ui/sharingDialog.demo.html',
      'src/ui/versionDiagnostic.demo.html'
    ])
    expect(reachableModules().size).toBeGreaterThan(100)
  })
})

/**
 * # Les guillemets de la documentation suivent la même règle que le catalogue
 *
 * `tests/i18n/catalog.test.ts` garde les 102 messages ; la même prose vit deux fois de
 * plus — dans les cinq README et dans les cinq manuels, dont **le français est affiché
 * dans l'application** par `manualPage.ts`. Quatre chevrons y tombaient seuls en bout de
 * ligne, mesurés au navigateur à 1 380 px de fenêtre, exactement comme sur l'accueil.
 *
 * La règle est celle du catalogue, langue par langue : espace **insécable** à l'intérieur
 * des chevrons français, rien à l'intérieur des chevrons espagnols, aucun chevron dans
 * les trois autres langues.
 *
 * Les **commentaires HTML sont retirés** avant lecture : les recettes de capture du
 * `README.md` français citent côte à côte les guillemets des cinq langues pour dire au
 * photographe ce qu'il doit lire à l'écran — « … », “ … ”, ‘ … ’, „ … “, «…» — et ce
 * passage-là n'est pas de la prose, il n'est rendu nulle part.
 */
describe('les guillemets de la documentation ne se coupent pas en fin de ligne', () => {
  const FINE = '\u202f'
  const NBSP = '\u00a0'

  /** Le texte rendu d'un fichier : sans ses commentaires HTML. */
  function prose(source: string): string {
    return source.replaceAll(/<!--[\s\S]*?-->/g, ' ')
  }

  /** Les dix fichiers de prose, nommés pour que l'échec dise lequel. */
  function documents(language: UiLanguage): Array<[string, string]> {
    const manualPath = `../../docs-app/manuel.${language}.html`
    const manual = MANUALS[manualPath]
    if (manual === undefined) throw new Error(`${manualPath.slice(6)} manque`)
    return [
      [readmeName(language), prose(readme(language))],
      [`docs-app/manuel.${language}.html`, prose(manual)]
    ]
  }

  it('le français écrit une espace insécable dans ses chevrons', () => {
    for (const [name, text] of documents('fr')) {
      // Parcours par unité de code, jamais par point de code : `[...text]` découperait
      // les émojis du README en un index qui ne serait plus celui de `text[i]`.
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index]
        const around = text.slice(Math.max(0, index - 30), index + 30).replaceAll('\n', ' ')
        if (char === '«') {
          const after = text[index + 1]
          expect(after === FINE || after === NBSP, `${name} : …${around}…`).toBe(true)
        }
        if (char === '»') {
          const before = text[index - 1]
          expect(before === FINE || before === NBSP, `${name} : …${around}…`).toBe(true)
        }
      }
    }
  })

  it('l’espagnol garde ses chevrons collés au mot', () => {
    for (const [name, text] of documents('es')) {
      expect(text, name).not.toMatch(/«\s/u)
      expect(text, name).not.toMatch(/\s»/u)
    }
  })

  it('les trois langues sans chevrons n’en portent aucun', () => {
    for (const language of ['de', 'en', 'nl'] as const) {
      for (const [name, text] of documents(language)) {
        expect(text, name).not.toContain('«')
        expect(text, name).not.toContain('»')
      }
    }
  })

  it('lit bien quelque chose — sinon ce contrôle ne prouve rien', () => {
    // Un `glob` qui rendrait des chaînes vides, ou un retrait de commentaires trop large,
    // ferait passer les trois tests ci-dessus sans rien avoir lu. Le compte du jour est de
    // 100 chevrons ouvrants dans la prose française — 55 dans le README, dont les recettes
    // de capture, en commentaire, en portent 86 de plus, et 45 dans le manuel.
    const chevrons = documents('fr')
      .map(([, text]) => (text.match(/«/g) ?? []).length)
      .reduce((a, b) => a + b, 0)
    expect(chevrons).toBeGreaterThan(80)
  })
})
