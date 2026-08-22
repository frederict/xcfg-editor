import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import frenchMessages from '../../src/i18n/messages/fr/app'

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

/**
 * La prose de `main.ts` vit désormais dans le catalogue — voir `src/i18n/CLAUDE.md`. Les
 * garde-fous qui portaient sur une **phrase** la cherchent donc ici, et ceux qui portent
 * sur l'**assemblage** continuent de lire le source. La distinction n'est pas cosmétique :
 * une phrase déplacée d'un fichier à l'autre ne doit pas faire tomber un test qui garde un
 * point de montage, et une phrase supprimée doit continuer de le faire.
 */
const app = frenchMessages

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
    expect(main).toContain('const libraryButton = menu.add(')
    expect(app['menu.library']).toBe('Bibliothèque…')
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
    expect(main).toContain("tr.t('dock.widgetList')")
    expect(app['dock.widgetList']).toBe('Liste des gadgets')
  })

  it('le repli tient : une fois le pilote prononcé, plus rien ne rouvre le bandeau', () => {
    // Le dépliage de la première sélection est une amorce, pas une règle. Il se rejouait à
    // chaque sélection : un bandeau replié à la main se rouvrait au clic suivant et
    // reprenait les deux tiers bas de la page — « un combat contre l'interface », dit le
    // pilote d'essai. Une préférence de l'outil ne discute pas avec un geste.
    expect(main).toMatch(/^let dockSetByPilot = false$/m)
    expect(main).toContain('if (dockSetByPilot || !dockCollapsed) return')
    // Le drapeau se lève sur le bouton de repli, et sur lui seul : c'est là, et nulle part
    // ailleurs, que le pilote se prononce sur le bandeau.
    const toggle = main.slice(
      main.indexOf("dockToggle.addEventListener('click'"),
      main.indexOf("head.append(dockTitle")
    )
    expect(toggle).toContain('dockSetByPilot = true')
    expect(main.match(/dockSetByPilot = true/g)).toHaveLength(1)
  })
})

describe('assemblage — la liste des gadgets ne reste pas sur l’ancienne taille', () => {
  it('le redessin d’un geste remet la liste à jour, et depuis le document relu', () => {
    // `Page.widgets` est une photographie prise au dernier `render()` : c'est justement ce
    // que le redimensionnement vient de périmer. `repaint()` relit déjà la mise en page
    // pour redessiner la page — la liste part de la même relecture.
    const repaint = main.slice(
      main.indexOf('function repaint(): void'),
      main.indexOf('function onWidgetEdit')
    )
    expect(repaint).toContain('const page = readLayout(session.container.document)[orientation][view.index]')
    expect(repaint).toContain('widgetList?.refresh(page)')
    // Avant la plaque : un rendu de page absent ne doit pas empêcher la liste de suivre.
    expect(repaint.indexOf('widgetList?.refresh(page)'))
      .toBeLessThan(repaint.indexOf("content.querySelector('.plate')"))
  })

  it('c’est une remise à jour, jamais une reconstruction', () => {
    // `refreshWidgetList()` refait les lignes : il reprendrait au pilote le focus de sa
    // ligne et la position de défilement de la liste, à chaque cran d'un glissé. Il reste
    // réservé aux actions de structure, qui changent le nombre de rangs.
    const repaint = main.slice(
      main.indexOf('function repaint(): void'),
      main.indexOf('function onWidgetEdit')
    )
    expect(repaint).not.toContain('refreshWidgetList()')
    const structure = main.slice(
      main.indexOf('function onStructureEdit'),
      main.indexOf('/** Une option modifiée dans le panneau.')
    )
    expect(structure).toContain('refreshWidgetList()')
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

  /**
   * Le contrôle avant vol n'a pas d'écran à lui : ses constats se joignent à ceux du
   * fichier avant le tri, et se rangent dans les deux mêmes panneaux. Un troisième
   * emplacement serait une rubrique de plus à aller chercher — or c'est ce qu'on
   * vérifie avant de décoller.
   */
  it('le contrôle avant vol se joint aux constats du fichier, sans panneau à lui', () => {
    expect(main).toContain('preflightWarnings({')
    expect(main).toMatch(/splitWarnings\(warningsAt\(session\.warnings, 'import'\)\.concat\(/)
    expect(main).not.toMatch(/function (preflight|inspection)Panel/)
  })

  /**
   * Deux de ses règles dépendent de choses qui bougent sans que le fichier soit rouvert :
   * le gabarit d'écran et la géométrie des pages en mode édition. Figées à l'import,
   * comme `session.warnings`, elles mentiraient dès le premier geste.
   */
  it('il se calcule au rendu, jamais mémorisé dans la session', () => {
    expect(main).not.toMatch(/preflight:/)
    expect(main.indexOf('preflightWarnings({')).toBeGreaterThan(main.indexOf('function render()'))
  })

  /** Le liséré d'alerte suit le panneau : une seule liste, pas deux copies. */
  it('la famille qui alerte et la famille qui se peint en alerte sont la même liste', () => {
    expect(main).toContain('const ATTENTION_KINDS = ATTENTION_WARNING_KINDS')
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
    expect(app['landing.title']).toBe('Préparez vos pages XCTrack avant de voler')
    expect(app['landing.lead']).toMatch(/Déplacez un gadget/)
    expect(app['landing.stepEditTitle']).toBe('Modifier')
  })

  it('les deux garanties survivent au changement de promesse', () => {
    // Rien ne part de la machine, et ce qu'on n'a pas touché ressort tel quel : ce sont
    // les deux raisons qu'a un pilote de confier sa configuration de vol à un site web.
    expect(app['landing.privacy']).toContain('ne quitte pas cette machine')
    expect(app['landing.privacy']).toContain('sans une virgule réécrite')
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
    // La prose est passée au catalogue : c'est là qu'il faut aussi le vérifier.
    expect(Object.values(app).flatMap((entry) =>
      typeof entry === 'string' ? [entry] : Object.values(entry)
    ).filter((text) => /visionneuse/i.test(text))).toEqual([])
  })

  it('le badge de mode ne paraît que dans le mode qu’il nomme', () => {
    expect(main).toContain("const brandRole = el('span', 'brand__role')")
    expect(app['app.editingRole']).toBe('édition')
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
    // Nom du fichier, annuler/rétablir, la langue, les réglages, l'interrupteur de mode,
    // le menu, enregistrer. Rien d'autre : six commandes passaient sur deux lignes sous
    // 1100 px. Le globe est le septième et le seul muet — 30 px, la largeur d'une flèche
    // d'annulation : c'est ce qui lui permet d'entrer sans repousser le repli.
    expect(barre).toContain(
      'fileName, undoButton, redoButton, languageButton, preferencesButton, editToggle,'
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
    expect(main).toContain('preferencesButton.append(gearGlyph(), preferencesName)')
    expect(app['app.settings']).toBe('Réglages')
    expect(main).not.toContain('preferencesItem')
    // Le dessin ne nomme rien : c'est le mot qui porte le nom accessible.
    expect(main).toMatch(/svg\.setAttribute\('aria-hidden', 'true'\)/)
  })

  it('le bouton d’enregistrement reste dans la barre, avec son changement d’intitulé', () => {
    // C'est le seul signal visible qu'un travail est en cours : il ne peut pas se cacher.
    expect(main).toContain(
      "exportButton.textContent = modified ? tr.t('app.saveChanges') : tr.t('app.saveCopy')"
    )
    expect(app['app.saveChanges']).toBe('Enregistrer les modifications')
    expect(app['app.saveCopy']).toBe('Enregistrer une copie')
    expect(barre).toContain('exportButton')
  })

  it('les trois commandes rangées sont celles qui servent une fois par session', () => {
    const menu = main.slice(
      main.indexOf('const menu = buildMenu()'),
      main.indexOf("const bar = el('header', 'app-bar')")
    )
    for (const entry of ['openItem', 'libraryButton', 'versionItem', 'manualItem']) {
      expect(menu).toContain(`const ${entry} = menu.add(`)
    }
    expect(app['menu.openFile']).toBe('Ouvrir un fichier…')
    expect(app['menu.library']).toBe('Bibliothèque…')
    expect(app['menu.version']).toBe('Version et compatibilité…')
    // Les réglages généraux ont quitté le menu pour la barre : aucune entrée ne les nomme.
    expect(menu).not.toContain('preferences')
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
    expect(main).toContain("tr.t('app.openFailedHint')")
    expect(app['app.openFailedHint']).toContain('n’importe où sur cette page')
    expect(app['app.openFailedHint']).toContain('« Fichier »')
  })

  it('l’accueil dit où sont rangées les configurations, et il dit vrai', () => {
    expect(app['landing.returning']).toContain('dans le menu « Fichier »')
  })
})

describe('assemblage — le menu s’ouvre au clavier et ne retient personne', () => {
  const menu = main.slice(
    main.indexOf('function buildMenu(): Menu'),
    main.indexOf('const menu = buildMenu()')
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
    expect(app['app.versionLead']).not.toContain('Rien n’est supprimé ni modifié')
    expect(app['app.versionLead']).toContain('rien ne bouge tant que vous ne le demandez pas')
  })
})

/**
 * Remplacer un document sans demander était le défaut le plus coûteux relevé par le pilote
 * d'essai : « j'ai déposé un autre fichier, l'ancien a disparu, ma modification avec, et
 * la flèche annuler disait "Rien à annuler" ». Il avait relevé lui-même l'incohérence qui
 * rend le correctif simple — le navigateur, lui, le retenait bien avant de fermer
 * l'onglet.
 *
 * Ces contrôles portent sur l'**ordre des opérations** dans `loadBytes`, et sur lui seul :
 * c'est de lui que découlent les trois propriétés attendues, et aucun test d'exécution ne
 * l'atteint — `main.ts` monte un DOM entier et branche des écoutes de fenêtre.
 */
describe('assemblage — un document modifié ne se fait pas remplacer sans un mot', () => {
  const loadBytes = main.slice(
    main.indexOf('async function loadBytes('),
    main.indexOf('async function load(file: File)')
  )

  it('une seule question sert l’avertissement de fermeture et la confirmation', () => {
    // C'est l'incohérence que le pilote a relevée : l'outil savait qu'il avait du travail
    // en cours pour retenir l'onglet, et l'écrasait quand même. Deux réponses à une
    // question unique ne peuvent tenir que si elles sortent du même endroit.
    expect(main).toContain('function unsavedWork(): UnsavedWork | undefined')
    expect(main).toMatch(
      /window\.addEventListener\('beforeunload', \(event\) => \{\s*\n\s*if \(unsavedWork\(\) === undefined\) return/
    )
    expect(main).not.toContain('if (session?.container.modified !== true) return')
  })

  it('la question se pose sans rien clore : l’historique reste où il était', () => {
    // `flushRecord()` en tête de `loadBytes` refermait le pas en cours de regroupement —
    // donc changeait l'historique — avant même de savoir si le pilote accepterait. Le pas
    // en attente se lit désormais tel quel, et n'est clos que par le démontage.
    expect(loadBytes).not.toContain('flushRecord()')
    expect(main).toContain('lastChange: pendingStep?.description ?? current.history.undoDescription()')
    expect(main).toMatch(/function closeDocument\(\): void \{[\s\S]{0,400}flushRecord\(\)/)
  })

  it('la boîte nomme ce qui serait perdu, elle ne demande pas « êtes-vous sûr »', () => {
    // L'historique nomme ses pas (« Régler Volume — Vario ») ; le pilote a cité ces
    // libellés comme un point fort. C'est ce nom-là qu'il faut lui remettre sous les yeux.
    expect(main).toContain("tr.t('app.lastChange', { change: work.lastChange })")
    expect(app['app.lastChange']).toBe('Dernier changement en date : « {change} ».')
    expect(app['app.unsavedTitle']).toBe('Vos modifications ne sont pas enregistrées')
  })

  it('la sortie de secours est celle qui ne perd rien, et elle a le focus', () => {
    const ask = main.slice(
      main.indexOf('function askBeforeReplace('),
      main.indexOf('/** Un fichier illisible, dit sans effacer')
    )
    expect(ask).toContain("el('button', 'btn btn--primary', tr.t('app.keepChanges'))")
    expect(app['app.keepChanges']).toBe('Garder mes modifications')
    expect(ask).toContain('keep.focus()')
    // Échap ferme la boîte et ne fait rien d'autre : aucune reprise n'est nécessaire,
    // puisque rien n'a été démonté.
    expect(ask).toMatch(/dialog\.addEventListener\('cancel', \(\) => dialog\.remove\(\)\)/)
    expect(ask).not.toContain('closeDocument()')
    expect(ask).not.toContain('adopt(')
  })

  it('rien n’est démonté avant que le remplacement ne soit acquis', () => {
    // La propriété entière tient là : `closeDocument()` — le point de non-retour — n'est
    // atteint que depuis `adopt()`, après la lecture des octets ET après l'accord.
    const teardown = [...main.matchAll(/^\s*closeDocument\(\)$/gm)]
    expect(teardown).toHaveLength(2)
    const adopt = main.slice(
      main.indexOf('function adopt(container: Container): void'),
      main.indexOf('interface LoadOptions')
    )
    expect(adopt).toContain('built = buildSession(container)')
    // La session est fabriquée d'abord, démontage ensuite : même une lecture qui échoue
    // en cours de route laisse le document ouvert intact.
    expect(adopt.indexOf('buildSession(container)')).toBeLessThan(adopt.indexOf('closeDocument()'))
  })

  it('un fichier illisible ne détruit pas un travail non enregistré', () => {
    // Le cas que le pilote n'a pas eu à rencontrer pour qu'il compte : un dépôt à la
    // souris ne se confirme pas, et un fichier corrompu remplaçait un document valide par
    // un cul-de-sac. Les deux échecs — l'exception et le contenu inanalysable — comptent.
    expect(loadBytes).toContain('unreadable = container.parseError')
    expect(loadBytes).toContain('unreadable = formatTechnicalDetail(error)')
    expect(loadBytes).toMatch(
      /if \(unreadable !== undefined && work !== undefined\) \{\s*\n\s*tellUnreadable\(name, work\.fileName, unreadable\)\s*\n\s*return/
    )
  })

  it('sans rien à perdre, aucune boîte ne paraît', () => {
    // Une confirmation qui paraît toujours use l'attention et finit par être cliquée sans
    // être lue. Un document intact se remplace sans un mot, comme avant.
    expect(loadBytes).toMatch(
      /if \(work === undefined \|\| options\.confirmed === true\) \{\s*\n\s*adopt\(container\)/
    )
  })

  it('la bibliothèque ne pose pas la question deux fois', () => {
    // `libraryPanel.ts` la pose déjà, et mieux : « ranger d'abord, puis charger » est
    // l'issue qui ne perd rien, et elle n'a de sens que là.
    expect(main).toContain('void loadBytes(bytes.slice(), name, { confirmed: true })')
  })
})

/**
 * # Le sélecteur de langue de l'interface
 *
 * Deux réglages de langue cohabitent dans cet outil et **un seul** agit sur les mots qu'on
 * lit ici (`src/i18n/axes.ts`). Ces garde-fous portent sur les trois endroits où la
 * confusion se glisserait sans qu'aucun test d'exécution ne bronche.
 */
describe('assemblage — changer la langue de l’interface, et rien d’autre', () => {
  const choose = main.slice(
    main.indexOf('function chooseUiLanguage'),
    main.indexOf('/* ------------------------------------------- 1. les préférences générales')
  )

  it('le globe est dans la barre, muet, et n’est jamais éteint', () => {
    // Un pilote qui arrive sur une interface qu'il ne lit pas doit pouvoir en sortir sans
    // lire ce qui l'entoure : c'est le seul cas où un dessin vaut mieux qu'un mot. Et
    // c'est sans fichier ouvert qu'il sert le plus — comme la bibliothèque et le manuel,
    // il ne figure donc pas dans `syncEditControls`.
    expect(main).toContain("const languageButton = el('button', 'btn btn--icon app-bar__lang')")
    expect(main).toContain('languageButton.append(globeGlyph())')
    expect(main).not.toContain('languageButton.hidden')
    expect(main).not.toContain('languageButton.disabled')
  })

  it('son nom accessible nomme l’axe, et porte l’endonyme de la langue courante', () => {
    // « Langue de l'interface : Français » — pas « Langue ». Les deux mentions doivent
    // dire de quel axe elles parlent, sans quoi le pilote croira le sélecteur en panne en
    // voyant « Libellés » ne pas bouger.
    expect(main).toContain(
      "tr.t('app.uiLanguageNamed', { name: UI_LANGUAGE_ENDONYMS[currentUiLanguage] })"
    )
    expect(main).toContain("languageButton.setAttribute('aria-label', named)")
    // Les endonymes viennent du socle : les réécrire ici les ferait diverger.
    expect(main).not.toContain("'Nederlands'")
    expect(main).not.toContain("'Deutsch'")
  })

  it('les deux mentions de langue sont bâties par la même fonction', () => {
    // Le bandeau du fichier et la boîte des langues disent le même fait. Deux
    // formulations pour ce fait seraient exactement l'ambiguïté qu'on cherche à lever.
    expect(main).toContain('add(tr.t(\'app.metaLabels\'), labelLanguageMention(tr, current))')
    expect(main).toContain("el('p', 'lang-axis__value', labelLanguageMention(tr, session))")
    expect(app['app.metaLabels']).toContain('XCTrack')
  })

  it('choisir une langue ne touche jamais à l’axe des libellés', () => {
    // `session.language` vient du fichier ouvert et n'a rien à faire ici : un pilote belge
    // dont l'AIR³ est en anglais lit cette interface en français ET ses libellés en
    // anglais. C'est la promesse centrale de l'outil.
    expect(choose).not.toContain('session.language =')
    expect(choose).not.toContain('resolveLanguage')
    expect(choose).not.toContain('languageFromBrowser =')
    // Le recalcul des avertissements repasse la langue du fichier telle quelle.
    expect(choose).toContain('language: session.language')
  })

  it('le choix n’est mémorisé qu’une fois le catalogue arrivé', () => {
    // L'amorçage attend le catalogue de la langue mémorisée et n'affiche rien avant lui :
    // écrire la préférence AVANT le chargement laisserait, si le morceau ne se télécharge
    // pas, un écran vide à chaque rechargement, sans moyen d'en sortir.
    expect(choose.indexOf('loadTranslator(language)'))
      .toBeLessThan(choose.indexOf('writeUiLanguage(window.localStorage, language)'))
  })

  it('ce qui survit au rendu est refait à la main, et rien d’autre', () => {
    // Trois choses ne passent pas par `render()` : les mots du cadre, le sélecteur de
    // gabarit — qui vit hors de `content` —, et les avertissements du fichier, calculés
    // une seule fois à l'ouverture avec le traducteur d'alors.
    expect(choose).toContain('installChromeProse(loaded)')
    expect(choose).toContain('installDeviceSelector(session.device)')
    expect(choose).toContain('session.warnings = computeWarnings({')
    expect(choose).toContain('render()')
  })

  it('`<html lang>` suit notre prose, jamais les libellés', () => {
    // C'est cette page-ci qu'un lecteur d'écran prononce. L'attribut vaut « fr » dans
    // `index.html` et mentirait dès le premier pilote néerlandophone.
    expect(main).toContain('document.documentElement.lang = currentUiLanguage')
  })

  it('les écrans chargés à la demande reçoivent le traducteur du pilote', () => {
    // Chacun de ces modules porte un repli **français** en attendant que `main.ts` ajoute
    // la ligne (`src/i18n/CLAUDE.md` § 5). Sans elle, quatre écrans restaient en français
    // quelle que soit la langue choisie — et le sélecteur paraissait ne rien faire.
    expect(main).toContain('module.buildPropertyForm(widget, session.language, translator())')
    expect(main).toContain('module.renderProperties({ form, tr: translator(), readOnly: true')
    const palette = main.slice(main.indexOf('const palette = module.renderWidgetPalette({'))
    expect(palette.slice(0, 400)).toContain('tr: translator()')
    const version = main.slice(main.indexOf('module.buildVersionPanel({'))
    expect(version.slice(0, 300)).toContain('tr: translator()')
    const list = main.slice(main.indexOf('const list = renderWidgetList({'))
    expect(list.slice(0, 300)).toContain('tr: translator()')
  })

  it('le nom du fichier porte enfin l’infobulle que la feuille promet', () => {
    // La feuille de style le tronque — plus court encore sous 1 120 px, pour rendre au
    // globe la largeur qu'il prend. Sans infobulle, deux exports du même jour deviennent
    // indiscernables.
    expect(main).toContain("fileName.title = session?.container.fileName ?? ''")
  })
})
