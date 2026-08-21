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
  { specifier: '../library', carries: 'le magasin IndexedDB et l’import/export d’archive' },
  { specifier: './manualDialog', carries: 'le manuel et sa feuille de style, 16 ko compressés' }
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

describe('assemblage — les deux lectures du fichier sont atteignables partout', () => {
  it('elles ont quitté le bandeau du fichier, que seule la vue d’ensemble affiche', () => {
    // Le bandeau décrit bien ce que le fichier dit de lui-même — mais il ne paraît que
    // dans la vue d'ensemble : depuis une page ouverte, les deux lectures étaient
    // introuvables. Le menu « Fichier », lui, est de tous les écrans.
    expect(read('src/ui/app.css')).not.toContain('.meta__actions {')
    expect(main).not.toContain("el('div', 'meta__actions')")
  })

  it('la bibliothèque est du menu, et n’y est jamais éteinte', () => {
    // C'est la seule commande qui a un sens quand rien n'est ouvert : on y vient pour
    // reprendre une configuration rangée. Les deux lectures, elles, s'éteignent sans
    // fichier — elles n'auraient rien à lire.
    expect(main).toMatch(/const libraryButton = menu\.add\(\s*\n\s*'Bibliothèque…'/)
    expect(main).not.toMatch(/libraryButton\.hidden\s*=/)
    expect(main).not.toMatch(/libraryButton\.disabled = !readable/)
    expect(main).toContain('versionItem.disabled = !readable')
    // Les réglages ont quitté le menu pour la barre — voir plus bas. Ils s'éteignent de
    // la même façon : rien à lire sans fichier.
    expect(main).toContain('preferencesButton.disabled = !readable || onPreferences')
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

describe('assemblage — un gadget déplacé à la flèche reste sous les yeux du pilote', () => {
  const reveal = main.slice(
    main.indexOf('function revealWidget(index: number): void'),
    main.indexOf('/** Le gadget sélectionné, amené dans la bande visible. */')
  )

  it('le déplacement au clavier rappelle le défilement, le glissé non', () => {
    // Une flèche déplace d'une cellule sans changer la sélection : rien d'autre ne
    // ramènerait le gadget dans la bande visible. Un glissé, lui, a le doigt dessus.
    const edit = main.slice(
      main.indexOf('function onWidgetEdit(edit: WidgetEdit): void'),
      main.indexOf('function onStructureEdit')
    )
    expect(edit).toMatch(/if \(keyboardGesture\) \{[\s\S]*revealWidget\(edit\.widgetIndex\)[\s\S]*\} else \{/)
    expect(edit.slice(edit.indexOf('} else {'))).not.toContain('revealWidget')
  })

  it('le gadget est cherché où il est, pas où il était', () => {
    // `Page.widgets` est une photographie prise au dernier `render()` : après cinq
    // flèches elle désigne l'endroit que le gadget a quitté. `currentBounds` relit le
    // document.
    expect(reveal).toContain('currentBounds(page, index)')
    expect(reveal).toContain('bounds.y1 / WIDGET_SCALE')
    expect(reveal).toContain('bounds.y2 / WIDGET_SCALE')
    expect(reveal).not.toMatch(/widget\.y1/)
  })

  it('rien ne bouge tant que le gadget tient dans la bande', () => {
    // `revealOffset` rend zéro dans ce cas : la page ne doit pas frémir sous les doigts
    // du pilote à chaque appui de flèche.
    expect(reveal).toMatch(/if \(offset === 0\) return\s*\n\s*window\.scrollBy/)
  })

  it('la bande est remesurée à chaque appel, et c’est la fenêtre qui défile', () => {
    // Jamais `scrollIntoView` sur la plaque, jamais un `transform` : le zoom calé à la
    // règle graduée reste intact.
    expect(reveal).toContain('visibleBand()')
    expect(reveal).toContain('window.scrollBy({ top: offset')
    expect(main).not.toContain('plate.scrollIntoView')
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

describe('assemblage — l’accueil dit que l’outil modifie', () => {
  it('le premier écran nomme le geste d’édition', () => {
    const landing = main.slice(main.indexOf('function landing()'), main.indexOf('function problem('))
    expect(landing).toContain('Préparez vos pages XCTrack avant de voler')
    expect(landing).toMatch(/Déplacez un gadget/)
    expect(landing).toContain("'Modifier'")
  })

  it('les deux garanties survivent au changement de promesse', () => {
    const landing = main.slice(main.indexOf('function landing()'), main.indexOf('function problem('))
    // Rien ne part de la machine, et ce qu'on n'a pas touché ressort tel quel : ce sont
    // les deux raisons qu'a un pilote de confier sa configuration de vol à un site web.
    expect(landing).toContain('ne quitte pas cette machine')
    expect(landing).toContain('sans une virgule réécrite')
  })

  it('le mot « visionneuse » a disparu de ce que le pilote lit', () => {
    // Il décrivait l'outil, pas l'état, et il décrivait un outil qui n'existe plus. Les
    // commentaires, eux, ont le droit de raconter d'où l'on vient : on ne relit que les
    // chaînes, et il faut donc retirer les commentaires d'abord — leurs apostrophes
    // françaises passeraient sinon pour des délimiteurs.
    const code = main
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^[ \t]*\/\/.*$/gm, ' ')
    const strings = [...code.matchAll(/'([^'\\\n]*)'/g)].map((m) => m[1] ?? '')
    expect(strings.filter((text) => /visionneuse/i.test(text))).toEqual([])
  })

  it('le badge de mode ne paraît que dans le mode qu’il nomme', () => {
    expect(main).toContain("const brandRole = el('span', 'brand__role', 'édition')")
    // Et seulement sur un écran où ce mode veut dire quelque chose : les réglages
    // généraux ne montrent aucune page et n'offrent ni annulation ni sortie.
    expect(main).toContain('brandRole.hidden = !editMode || !editable')
  })
})

describe('assemblage — la barre de tête garde le fréquent et range le reste', () => {
  const barre = main.slice(
    main.indexOf("const actions = el('div', 'app-bar__actions')"),
    main.indexOf("const content = el('main', 'content')")
  )

  it('la barre ne porte que le fréquent et ce qui dit l’état du document', () => {
    // Nom du fichier, annuler/rétablir, les réglages, l'interrupteur de mode, le menu,
    // enregistrer. Rien d'autre : six commandes passaient sur deux lignes sous 1100 px.
    expect(barre).toContain(
      'fileName, undoButton, redoButton, preferencesButton, editToggle, menu.root, fileInput,'
    )
  })

  /**
   * Les réglages généraux sont sortis du menu le jour où ils sont devenus modifiables.
   * Le critère du menu est la fréquence d'usage ; un écran qu'on règle n'est pas un
   * écran qu'on consulte une fois par session.
   *
   * Les deux assertions comptent autant l'une que l'autre : le bouton doit exister, et
   * l'entrée de menu doit avoir **disparu**. Deux chemins vers le même écran, dont l'un
   * caché, est exactement le défaut qu'on vient de corriger ailleurs.
   */
  it('les réglages ont une entrée directe, et une seule', () => {
    expect(barre).toContain('preferencesButton')
    expect(main).toMatch(/const preferencesButton = el\('button', 'btn app-bar__prefs'\)/)
    expect(main).toContain("preferencesButton.append(gearGlyph(), el('span', 'app-bar__prefs-name', 'Réglages'))")
    expect(main).not.toContain("menu.add(\n  'Réglages")
    expect(main).not.toContain('preferencesItem')
    // Le dessin ne nomme rien : c'est le mot qui porte le nom accessible.
    expect(main).toMatch(/svg\.setAttribute\('aria-hidden', 'true'\)/)
  })

  it('le bouton d’enregistrement reste dans la barre, avec son changement d’intitulé', () => {
    // C'est le seul signal visible qu'un travail est en cours : il ne peut pas se cacher.
    expect(main).toContain(
      "exportButton.textContent = modified ? 'Enregistrer les modifications' : 'Enregistrer une copie'"
    )
    expect(barre).toContain('exportButton')
  })

  it('les trois commandes rangées sont celles qui servent une fois par session', () => {
    const menu = main.slice(main.indexOf("const menu = buildMenu('Fichier')"), main.indexOf("const bar = el('header', 'app-bar')"))
    for (const entry of [
      "'Ouvrir un fichier…'", "'Bibliothèque…'", "'Version et compatibilité…'"
    ]) expect(menu).toContain(entry)
    expect(menu).not.toContain("'Réglages généraux'")
  })

  it('les deux lectures ne sont plus prisonnières de la vue d’ensemble', () => {
    // Elles vivaient dans le bandeau du fichier, que seule la vue d'ensemble affiche.
    const meta = main.slice(main.indexOf('function metaStrip('), main.indexOf('ATTENTION_KINDS'))
    expect(meta).not.toContain('preferencesButton')
    expect(meta).not.toContain('versionButton')
    expect(main).toContain('function openPreferences(): void')
  })

  it('« Fermer » rend la vue d’où l’on venait', () => {
    // Sinon on gagne un aller et on perd le retour : quatre gestes pour un aller-retour.
    expect(main).toContain('let viewBeforePreferences: View | undefined')
    expect(main).toContain('viewBeforePreferences = view')
    expect(main).toMatch(/view = previous !== undefined && viewExists\(previous\) \? previous : \{ kind: 'overview' \}/)
    // Un fichier rouvert n'a plus les pages de l'ancien : le retour retenu s'oublie.
    expect(main).toMatch(/if \(view\.kind === 'preferences'\) view = \{ kind: 'overview' \}\s*\n\s*viewBeforePreferences = undefined/)
  })

  it('l’écran d’erreur dit encore où déposer un autre fichier', () => {
    // « Ouvrir un fichier » a rejoint le menu, et cet écran n'a pas de zone de dépôt :
    // sans la phrase, il ne resterait rien à quoi se raccrocher.
    const mark = "'Ce fichier n’a pas pu être ouvert'"
    const echec = main.slice(main.indexOf(mark), main.indexOf(mark) + 700)
    expect(echec).toContain('n’importe où sur cette page')
    expect(echec).toContain('« Fichier »')
  })

  it('l’accueil dit où sont rangées les configurations, et il dit vrai', () => {
    const landing = main.slice(main.indexOf('function landing()'), main.indexOf('function problem('))
    expect(landing).toContain('dans le menu « Fichier »')
  })
})

describe('assemblage — le menu s’ouvre au clavier et ne retient personne', () => {
  const menu = main.slice(
    main.indexOf('function buildMenu(label: string): Menu'),
    main.indexOf("const menu = buildMenu('Fichier')")
  )

  it('le bouton annonce ce qu’il ouvre, et la liste ce qu’elle est', () => {
    expect(menu).toContain("button.setAttribute('aria-haspopup', 'menu')")
    expect(menu).toContain("button.setAttribute('aria-expanded', 'false')")
    expect(menu).toContain("list.setAttribute('role', 'menu')")
    expect(menu).toContain("item.setAttribute('role', 'menuitem')")
  })

  it('les flèches parcourent les entrées avec un tabindex glissant', () => {
    expect(menu).toContain('item.tabIndex = rank === wrapped ? 0 : -1')
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) expect(menu).toContain(key)
  })

  it('Échap referme et rend le focus au bouton', () => {
    expect(menu).toMatch(/event\.key === 'Escape'[\s\S]{0,160}close\(true\)/)
  })

  it('le focus n’est pas piégé : en sortir referme', () => {
    // Tabulation comme clic ailleurs. C'est la différence entre un menu et un piège.
    expect(menu).toContain("root.addEventListener('focusout'")
    expect(menu).toContain("document.addEventListener('pointerdown'")
  })

  it('un fichier déposé referme le menu', () => {
    // Un dépôt n'est pas un clic : ni `pointerdown` ni `focusout` ne le verraient, et le
    // menu resterait posé au-dessus d'une vue qu'il n'a pas ouverte.
    expect(main).toMatch(/closeVersionDialog\(\)\s*\n(\s*\/\/[^\n]*\n)*\s*menu\.close\(\)/)
  })

  it('une entrée éteinte ne prend pas le focus', () => {
    expect(menu).toContain('.filter((item) => !item.hidden && !item.disabled)')
  })

  it('les cibles du menu et les deux flèches passent les 24 px', () => {
    const css = read('src/ui/app.css')
    expect(css).toMatch(/\.menu__item \{[^}]*min-height: 34px/)
    expect(css).toMatch(/\.btn--icon \{[^}]*width: 30px/)
    expect(css).toMatch(/\.btn--icon \{[^}]*height: 30px/)
  })

  it('les deux flèches portent une phrase entière comme nom accessible', () => {
    // Le bouton ne montre qu'un dessin : sans `aria-label`, un lecteur d'écran
    // n'annoncerait que « bouton ».
    expect(main).toContain("undoButton.setAttribute('aria-label', undoName)")
    expect(main).toContain("redoButton.setAttribute('aria-label', redoName)")
    expect(main).toContain("svg.setAttribute('aria-hidden', 'true')")
  })

  it('le menu se pose au-dessus de la page, jamais à côté', () => {
    // Rien ne partage la largeur avec le rendu d'une page, pas même un menu.
    const css = read('src/ui/app.css')
    expect(css).toMatch(/\.menu__list \{[^}]*position: absolute/)
  })
})

/**
 * Le panneau de réglages d'un gadget sait désormais **écrire** une valeur d'usine que le
 * fichier ne portait pas. Deux conséquences dans `main.ts`, toutes deux invisibles à
 * l'exécution mais fausses pour le pilote.
 */
describe('écrire une valeur d’usine depuis le panneau', () => {
  it('le compte de la barre de tête est refait sur le formulaire rendu par l’écriture', () => {
    // `onChange` reçoit en second paramètre le formulaire **reconstruit** après écriture.
    // L'ignorer laissait la barre annoncer un réglage de moins que le panneau n'en montre
    // — jusqu'à la sélection suivante, donc sans que rien ne signale l'écart.
    expect(main).toContain('onChange: (field, fresh) => onPropertyChange(field, widget, fresh)')
    expect(main).toContain('if (fresh) updateDockCount(fresh, true)')
  })

  it('la version du fichier est passée au panneau en édition comme en consultation', () => {
    // Le panneau propose d'écrire des valeurs relevées sur **une** version de XCTrack, et
    // dit lui-même quelle confiance leur accorder. Ne pas lui donner la version en édition
    // le forçait à répondre « version inconnue ici » à l'instant précis où il demande au
    // pilote de se fier à ce relevé.
    const call = main.slice(main.indexOf('const panel = editMode'))
    const editBranch = call.slice(0, call.indexOf(': module.renderProperties'))
    expect(editBranch).toContain('...fileVersion')
  })
})

/**
 * Le nettoyage des réglages d'une ancienne version. C'est la seule fonction de
 * l'application qui **retire** quelque chose du document du pilote : son branchement
 * porte deux pièges que rien n'attrape à l'exécution.
 */
describe('brancher le nettoyage sur la boîte de version', () => {
  it('le geste n’est offert qu’en édition', () => {
    // Hors édition, l'outil promet de ne rien écrire. `onCleanup` absent suffit à
    // désactiver la fonction entière côté panneau — c'est son interrupteur.
    expect(main).toContain('...(editMode ? { onCleanup:')
  })

  it('le rappel redessine sans repasser par le rendu complet', () => {
    // `render()` appelle `syncVersionDialog()`, qui remet le panneau à zéro : l'offre de
    // remise en place disparaîtrait à l'instant même où elle sert. `repaint()` suffit,
    // puisque le nettoyage ne retire que des réglages que la version visée ne lit pas.
    const branch = main.slice(main.indexOf('...(editMode ? { onCleanup:'))
    const body = branch.slice(0, branch.indexOf('} } : {})'))
    expect(body).toContain('current.history.record(event.description)')
    expect(body).toContain('repaint()')
    expect(body).not.toContain('render()')
    expect(body).not.toContain('syncVersionDialog()')
  })

  it('la boîte ne promet plus que rien ne sera supprimé', () => {
    // Elle sait maintenant retirer. Promettre le contraire quelques centimètres au-dessus
    // du bouton qui le fait serait le pire des deux textes.
    expect(main).not.toContain('Rien n’est supprimé ni modifié')
    expect(main).toContain('rien ne bouge tant que vous ne le ')
  })
})
