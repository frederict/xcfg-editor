import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fous textuels sur l'assemblage — `src/ui/main.ts` et les feuilles de style.
 *
 * `main.ts` n'est pas testé, et pour une bonne raison : c'est le point d'entrée, il monte
 * un DOM entier et branche des écoutes de fenêtre. Mais deux de ses propriétés ne sont
 * **pas** des détails d'exécution, et se relisent :
 *
 * 1. **Les quatre modules d'interface ne sont atteints que par `import()`.** C'est ce qui
 *    tient le poids du morceau principal : le seul catalogue des préférences pèse une
 *    trentaine de kilo-octets transférés, et un pilote qui ne l'ouvre jamais ne doit pas
 *    le télécharger. Un `import` statique glissé par mégarde ne casse aucun test
 *    d'exécution — il ne se voit que dans la table des morceaux de `vite build`, que
 *    personne ne relit à chaque commit. Ce test-ci le voit.
 * 2. **Le chemin d'export ordinaire ne sérialise rien.** La fidélité à l'octet près tient
 *    à une seule ligne : `sharingBytes(result) ?? await exportContainer(container)`. Le
 *    `undefined` que `sharingBytes` rend sur un export ordinaire est un contrat, pas une
 *    commodité.
 *
 * Même famille que `tests/ui/appStyle.test.ts` et `tests/render/style.test.ts` : ce que
 * ni happy-dom ni une assertion de sortie ne peuvent atteindre est relu à la source.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '../..')
const read = (relative: string): string => readFileSync(path.join(root, relative), 'utf8')

const main = read('src/ui/main.ts')

/** Les modules dont le poids interdit l'import statique, et ce qu'ils traînent. */
const LAZY_MODULES: Array<{ specifier: string; carries: string }> = [
  { specifier: './preferencesPage', carries: 'le catalogue des 216 préférences' },
  { specifier: './versionDiagnostic', carries: 'la base des versions de XCTrack' },
  { specifier: './sharingDialog', carries: 'l’anonymisation et sa feuille de style' },
  { specifier: './libraryPanel', carries: 'la bibliothèque et sa feuille de style' },
  { specifier: '../library', carries: 'le magasin IndexedDB et l’import/export d’archive' }
]

/**
 * Toutes les instructions d'import **statiques** du fichier, chacune avec le module
 * qu'elle désigne. Un import peut tenir sur plusieurs lignes : on lit donc de `import`
 * jusqu'au `from '…'` qui le clôt, et non ligne à ligne.
 */
function staticImports(source: string): Array<{ statement: string; specifier: string }> {
  return [...source.matchAll(/^import\s[\s\S]*?from\s+'([^']+)'/gm)].map((match) => ({
    statement: match[0],
    specifier: match[1] ?? ''
  }))
}

describe('assemblage — les quatre modules restent hors du morceau principal', () => {
  for (const { specifier, carries } of LAZY_MODULES) {
    it(`« ${specifier} » n’est importé qu’en type, jamais en valeur`, () => {
      const offenders = staticImports(main)
        .filter((entry) => entry.specifier === specifier)
        .filter((entry) => !entry.statement.startsWith('import type'))
      // Un type disparaît à la compilation ; une valeur, non — et elle emporte alors
      // tout le module dans le premier écran.
      expect(offenders.map((entry) => entry.statement), carries).toEqual([])
    })

    it(`« ${specifier} » est bien atteint par un import() dynamique`, () => {
      // Sans cela, le test précédent serait satisfait par un module simplement oublié.
      expect(main).toContain(`import('${specifier}')`)
    })
  }

  it('aucun catalogue lourd n’entre en statique dans le point d’entrée', () => {
    const specifiers = staticImports(main)
      .filter((entry) => !entry.statement.startsWith('import type'))
      .map((entry) => entry.specifier)
    // `widgetCatalog` est une exception assumée : le module ne pèse rien, ce sont ses 33
    // fichiers de langue qui pèsent, et il les charge lui-même par `import()`.
    expect(specifiers).not.toContain('../catalog/preferenceCatalog')
    expect(specifiers).not.toContain('../catalog/widgetVersions')
    expect(specifiers).not.toContain('../catalog/widgetOptions')
  })
})

describe('assemblage — l’export ordinaire ne fabrique aucun octet', () => {
  it('le chemin de livraison réémet le conteneur quand rien n’est anonymisé', () => {
    // Le contrat de `sharingBytes` : `undefined` veut dire « rends les octets d'origine ».
    expect(main).toMatch(/produced \?\? await exportContainer\(current\.container\)/)
  })

  it('le point d’entrée ne sérialise jamais un document lui-même', () => {
    // Réécrire le JSON d'un fichier non modifié casserait la seule promesse du projet.
    expect(main).not.toContain('serializeJson')
  })

  it('le nom du fichier produit ne reprend plus le radical d’origine', () => {
    // `ui/export.ts` composait `<nom d'origine>-modifie-<horodatage>` — or ce nom porte
    // souvent un prénom. `buildExportFileName` ne garde que l'extension.
    expect(() => read('src/ui/export.ts')).toThrow()
    expect(main).not.toContain('exportFileName(')
    expect(main).toContain("import('../model/sharing')")
  })
})

describe('assemblage — toute boîte qui déborde garde sa fermeture atteignable', () => {
  /**
   * La règle vaut désormais dans cinq feuilles : `app.css` pour la palette, le carrousel
   * et le diagnostic de version ; les feuilles des modules pour le partage et la
   * bibliothèque. Une boîte qui défile sans `padding-top: 0` laisse une bande de contenu
   * glisser au-dessus de la tête collante — et le bouton « Fermer » avec elle.
   */
  const sheets = [
    'src/ui/app.css',
    'src/ui/sharingDialog.css',
    'src/ui/libraryPanel.css'
  ]

  /**
   * Les sélecteurs d'une feuille qui reçoivent la déclaration cherchée. Une liste de
   * sélecteurs est éclatée : `app.css` groupe deux boîtes dans une même règle
   * (`.modal--palette .modal__box, .modal--pages .modal__box`) là où les feuilles des
   * modules l'écrivent chacune dans la leur. Les deux formes valent, et le contrôle ne
   * doit dépendre d'aucune des deux.
   */
  function selectorsDeclaring(css: string, declaration: string): Set<string> {
    // Les commentaires partent d'abord : un commentaire posé au-dessus d'une règle se
    // colle sinon à son sélecteur, et les deux ne se séparent plus.
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const found = new Set<string>()
    for (const match of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!(match[2] ?? '').includes(declaration)) continue
      for (const selector of (match[1] ?? '').split(',')) {
        const cleaned = selector.trim()
        if (cleaned !== '') found.add(cleaned)
      }
    }
    return found
  }

  it('chaque `.modal__box` qui défile passe son rembourrage du haut à la tête', () => {
    const faulty: string[] = []
    for (const sheet of sheets) {
      const css = read(sheet)
      const scrolls = selectorsDeclaring(css, 'overflow: auto')
      const lifted = selectorsDeclaring(css, 'padding-top: 0')
      for (const selector of scrolls) {
        if (!selector.endsWith('.modal__box')) continue
        if (!lifted.has(selector)) faulty.push(`${sheet} : ${selector}`)
      }
    }
    expect(faulty).toEqual([])
  })

  it('la boîte du diagnostic de version reprend le meuble commun', () => {
    const css = read('src/ui/app.css')
    expect(css).toContain('.modal--version .modal__box {')
    expect(css).toMatch(/\.modal--version \{[^}]*max-width: min\(/)
  })
})

describe('assemblage — les deux lectures du fichier sont dans le bandeau du fichier', () => {
  it('le bandeau porte une zone d’actions', () => {
    // Le bandeau décrit déjà ce que le fichier dit de lui-même : les deux lectures qui le
    // prolongent y sont, plutôt que dans une barre de tête qui parle de tout autre chose.
    expect(read('src/ui/app.css')).toContain('.meta__actions {')
    expect(main).toContain("el('div', 'meta__actions')")
  })

  it('la bibliothèque, elle, reste dans la barre de tête et sans fichier ouvert', () => {
    // C'est la seule commande qui a un sens quand rien n'est ouvert : on y vient pour
    // reprendre une configuration rangée.
    expect(main).toMatch(/const libraryButton = el\('button', 'btn', 'Bibliothèque'\)/)
    expect(main).not.toMatch(/libraryButton\.hidden\s*=/)
  })
})

/*
 * Les trois corrections d'ergonomie du 2026-08-21 (§ A.2, A.3, A.4 de l'audit). Chacune
 * tient en un point d'assemblage que ni happy-dom ni une assertion de sortie n'atteint :
 * `main.ts` monte un DOM entier et branche des écoutes de fenêtre. Le calcul, lui, est
 * dans `views.ts` et a ses propres tests d'exécution.
 */
describe('assemblage — le bandeau de réglages s’ouvre quand il a quelque chose à montrer', () => {
  it('l’état d’arrivée est replié', () => {
    // Déployé d'emblée, le bandeau prenait 348 px à la page pour écrire « Aucun gadget
    // sélectionné » : 156 px de page visible sur 331 en fenêtre de 1500 × 950, 43 px à
    // 1100 px de large. Replié, il n'en prend que 49.
    expect(main).toMatch(/^let dockCollapsed = true$/m)
  })

  it('ce n’est pas la hauteur réglée par le pilote qui change', () => {
    // La hauteur vit dans `dockHeight`, relue de `localStorage` au démarrage : le repli
    // initial ne doit toucher ni à sa lecture ni à son écriture.
    expect(main).toContain('let dockHeight: number | undefined = readDockHeight(window.localStorage)')
    expect(main).toContain('function saveDockHeight')
  })

  it('un seul chemin déplie le bandeau, et il ne part que d’un geste du pilote', () => {
    expect(main).toContain('function openDockForSelection(): void')
    // La sélection reposée par `buildEditing` après une reconstruction n'est pas un geste :
    // une annulation ne doit pas rouvrir un bandeau replié à la main.
    expect(main).toMatch(/restoringSelection = true\s*\n\s*editor\.select\(selection\)\s*\n\s*restoringSelection = false/)
  })

  it('replié sans sélection, le bouton nomme la liste — le seul chemin vers les gadgets muraillés', () => {
    expect(main).toContain("'Liste des gadgets'")
  })
})

describe('assemblage — sélectionner un gadget l’amène sous les yeux du pilote', () => {
  it('les trois chemins de sélection défilent vers le gadget', () => {
    // Liste du bandeau, clic sur la page en consultation, calque d'édition : trois
    // entrées, un seul geste attendu.
    expect(main.match(/revealSelection\(\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('le défilement porte sur la fenêtre, jamais sur le zoom', () => {
    // Le pilote a calé son zoom à la règle graduée : le montrer ne doit pas le déranger.
    expect(main).toContain('window.scrollBy({ top: offset')
    expect(main).not.toMatch(/revealSelection[\s\S]{0,600}zoom\s*=/)
  })

  it('la bande visible se mesure, elle n’est pas supposée', () => {
    // La barre de tête passe sur deux lignes sous 1100 px et le bandeau vient peut-être
    // de changer de hauteur : une constante mentirait.
    expect(main).toContain('function visibleBand(): VisibleBand')
    expect(main).toContain('bar.getBoundingClientRect().bottom')
  })

  it('qui a demandé moins d’animation n’en reçoit pas', () => {
    expect(main).toContain("'(prefers-reduced-motion: reduce)'")
  })
})

describe('assemblage — la vue d’ensemble montre les pages avant les constats', () => {
  it('les constats sont triés en deux poids', () => {
    expect(main).toContain('splitWarnings(warningsAt(session.warnings, ')
    expect(main).toContain('function attentionPanel')
    expect(main).toContain('function remarksPanel')
    // L'ancien panneau unique, qui alignait quatre encadrés d'égal poids visuel avant la
    // première vignette, n'existe plus.
    expect(main).not.toContain('function warningPanel')
  })

  it('rien n’est supprimé : la ligne repliée porte tous les constats', () => {
    // Ils disent des choses vraies que rien d'autre ne dit ; ils passent seulement après
    // les pages, qui sont ce que le pilote vient voir.
    expect(main).toMatch(/for \(const warning of warnings\) box\.append\(warningCard\(warning\)\)/)
    expect(main).toContain("el('details', 'remarks')")
  })

  it('la ligne repliée tient sur une ligne, quel que soit le nombre d’intitulés', () => {
    const css = read('src/ui/app.css')
    expect(css).toMatch(/\.remarks__titles \{[^}]*white-space: nowrap/)
    expect(css).toMatch(/\.remarks__titles \{[^}]*text-overflow: ellipsis/)
  })
})
