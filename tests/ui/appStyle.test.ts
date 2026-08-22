import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fou textuel sur `app.css`, sur le modèle de `tests/render/style.test.ts` : ni
 * happy-dom ni jsdom ne calculent la cascade d'une feuille externe, et aucune sortie DOM
 * ne distingue une tête de modale collante d'une tête qui défile. Le seul contrôle
 * automatisable est donc la relecture de la règle.
 *
 * Ce qui est vérifié tient à un défaut d'usage mesuré au pilote CDP (fenêtre 1500 × 1000,
 * fixture `2026-08-20_pages-00.xcfg`) : la boîte de la palette défile sur 7810 px pour
 * 860 px de cadre. Sans `sticky`, le bouton « Fermer » se retrouvait à 6847 px AU-DESSUS
 * de la fenêtre une fois la liste défilée à fond — hors de portée du clic. La boîte de
 * gestion des pages souffrait du même défaut (643 px au-dessus).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, '../../src/ui/app.css'), 'utf8')

/** Le corps de la règle nommée, accolades comprises. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  expect(start, `règle absente : ${selector}`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start) + 1)
}

describe('app.css — la fermeture d’une modale reste atteignable', () => {
  it('la tête de modale se colle au haut du cadre qui défile', () => {
    const head = rule('.modal__head')
    expect(head).toContain('position: sticky;')
    expect(head).toContain('top: 0;')
  })

  it('la tête est opaque et passe devant le contenu qui glisse dessous', () => {
    const head = rule('.modal__head')
    // Sans fond opaque, la liste se lirait à travers le titre et le bouton.
    expect(head).toContain('background: var(--app-bg);')
    // 10 est le rang de `.pages__choice`, la liste des classes déployée par le « + ».
    expect(head).toMatch(/z-index:\s*1[1-9]\s*;/)
  })

  it('le rembourrage du haut appartient à la tête, non à la boîte', () => {
    // Sinon la tête colle au bord du CONTENU et non au bord du cadre : une bande de liste
    // défilante reste visible au-dessus d'elle.
    expect(css).toMatch(
      /\.modal--palette \.modal__box,\s*\n\.modal--pages \.modal__box \{ padding-top: 0; \}/
    )
    expect(rule('.modal__head')).toContain('margin: 0 -1.4rem;')
  })

  it('les deux boîtes qui débordent partagent cette tête', () => {
    // La palette (75 lignes) et le carrousel des pages : le correctif vaut pour les deux.
    expect(rule('.modal--palette .modal__box')).toContain('overflow: auto;')
    expect(rule('.modal--pages .modal__box')).toContain('overflow: auto;')
  })
})

/**
 * # Le document ne défile jamais en travers
 *
 * Défaut signalé à l'ouverture d'un fichier : la ligne repliée des remarques dépassait le
 * bord droit de la fenêtre, son dernier intitulé tranché en plein mot, et une barre de
 * défilement horizontale apparaissait sur **tout le document**.
 *
 * La ligne sait pourtant se tronquer — `.remarks__titles` porte `min-width: 0`,
 * `overflow: hidden` et `text-overflow: ellipsis` depuis toujours. Ce qui manquait, c'est
 * une **borne** : `.warnings` est une grille, sa colonne implicite se dimensionne sur la
 * taille minimale de contenu de ses enfants, et cette taille-là vaut, pour la ligne des
 * remarques, les neuf intitulés bout à bout en `nowrap`. Mesuré au navigateur (fenêtre de
 * 1 385 px, fixture `2026-08-20_backup-00.xcfg`) : 2 532 px de piste dans un cadre de
 * 1 180, et 2 658 px de document. `minmax(0, 1fr)` autorise la piste à descendre sous
 * cette taille minimale, et l'ellipse se déclenche enfin — 1 385 px de document après
 * correction, soit exactement la fenêtre.
 *
 * ⚠ Ce n'est pas qu'une affaire de confort : le troisième principe du projet veut que la
 * page dessinée soit la seule chose qui puisse dépasser la fenêtre, et qu'elle le fasse
 * dans son propre conteneur (`.stage`, `overflow-x: auto`). Un document qui défile en
 * travers emmène la page avec lui.
 */
describe('app.css — rien d’autre que la page ne dépasse la fenêtre', () => {
  it('la grille des avertissements borne sa colonne', () => {
    expect(rule('.warnings')).toContain('grid-template-columns: minmax(0, 1fr);')
  })

  it('la ligne repliée des remarques garde de quoi tronquer', () => {
    const titles = rule('.remarks__titles')
    expect(titles).toContain('min-width: 0;')
    expect(titles).toContain('overflow: hidden;')
    expect(titles).toContain('text-overflow: ellipsis;')
    expect(titles).toContain('white-space: nowrap;')
  })

  it('le défilement horizontal appartient à la scène, pas au document', () => {
    // La plaque épouse la page (`width: fit-content`) et peut donc être plus large que le
    // cadre : c'est `.stage` qui absorbe le débordement.
    expect(rule('.stage')).toContain('overflow-x: auto;')
    expect(rule('.bed')).toContain('width: fit-content;')
  })
})

/**
 * # Une case à cocher ne quitte pas son libellé
 *
 * Défaut vu en photographiant le panneau de gadget, en **allemand** — la langue qui
 * déborde : « Zeige den nächsten Luftraum, während du in einem anderen Luftraum bist ».
 * La case restait seule sur sa ligne et le texte descendait dessous, ce qui laisse le
 * pilote deviner à quel réglage la case appartient. Mesuré à la fenêtre de 1 380 px,
 * fixture `2026-08-20_backup-00.xcfg`, page paysage 3, gadget « Luftraum-Annäherung » :
 * 2 des 4 cases du panneau étaient dans ce cas, libellé de 446 px dans une ligne de 452.
 *
 * La cause n'est pas la place qui manque — le libellé sait se replier — mais l'ordre des
 * opérations de `flex-wrap: wrap` : le **découpage en lignes** se décide avant la
 * répartition, sur la taille hypothétique de chaque élément. Avec `flex-basis: auto`,
 * cette taille est celle de la phrase entière ; un libellé plus long que la ligne s'en va
 * donc en dessous, seul, et la case reste orpheline au-dessus. Avec `0`, le libellé ne
 * pèse rien au moment du découpage, reste sur la ligne de la case, puis grandit et replie
 * son texte à l'intérieur de sa propre boîte.
 *
 * Les autres lignes du panneau n'ont jamais eu le défaut : elles portent `flex: 1 1 13rem`
 * — une base bornée, qui ne déborde qu'en dessous de 13 rem de panneau. La ligne à case
 * était la seule à `auto`.
 */
describe('app.css — la case à cocher reste avec son libellé', () => {
  it('le libellé d’une ligne à case ne pèse rien au découpage', () => {
    expect(css).toContain('.props__row[data-control="checkbox"] .props__label { flex: 1 1 0; }')
    // `auto` est exactement ce qui produisait le défaut : le refuser nommément.
    expect(css).not.toContain(
      '.props__row[data-control="checkbox"] .props__label { flex: 1 1 auto; }'
    )
  })

  it('les autres lignes gardent leur base bornée', () => {
    // 13 rem : la colonne des intitulés du panneau natif. Rien ici ne change pour elles.
    expect(css).toContain('.props__label { flex: 1 1 13rem;')
  })

  it('la case, elle, ne s’étire ni ne se rétracte', () => {
    // Sans `flex: none`, la case gagnerait la place que le libellé lui laisse et
    // deviendrait un rectangle : c'est l'autre moitié du contrat de la ligne.
    expect(rule('.props__checkbox')).toContain('flex: none;')
  })
})

/**
 * L'entrée directe des réglages généraux. Elle a coûté 40 px à une barre qui repliait
 * déjà : le seuil de sa forme compacte est une mesure, et un changement de valeur doit
 * faire échouer ce test plutôt que de laisser la barre repasser sur deux lignes à
 * 1 024 px sans que personne s'en aperçoive.
 */
describe('app.css — le bouton des réglages tient dans la barre', () => {
  it('bascule en forme compacte au seuil mesuré', () => {
    expect(css).toContain('.app-bar__prefs { flex: none; gap: 0.4rem; }')
    expect(css).toMatch(/@media \(max-width: 1120px\) \{\s*\.app-bar__prefs \{[^}]*width: 30px/)
  })

  it('masque le mot sans le retirer du nom accessible', () => {
    // `clip-path: inset(50%)` cache à l'œil et laisse au lecteur d'écran — `display: none`
    // priverait le bouton de son nom.
    const compact = css.slice(css.indexOf('.app-bar__prefs-name'))
    expect(compact).toContain('clip-path: inset(50%)')
    expect(compact.slice(0, 300)).not.toContain('display: none')
  })
})

/**
 * Le globe des langues, et les 40 px qu'il prend à la barre.
 *
 * Mesuré sur la fixture `2026-08-20_backup-00.xcfg` en édition, document modifié, page
 * ouverte : la barre repassait sur deux lignes sous 1 023 px en français, 1 020 en
 * allemand et 1 028 en néerlandais — au-dessus des 1 024 px de l'écran le plus étroit
 * qu'on vise. Les deux réductions du bloc compact les rendent, et davantage : 957, 954 et
 * 962 px, soit mieux que les 983 / 980 / 988 px d'avant le globe.
 *
 * Ce test garde les deux règles. Les retirer ferait revenir la barre à 95 px de haut sur
 * un écran de 1 024 px, et personne ne le verrait avant un pilote.
 */
describe('app.css — le globe des langues ne repousse pas le repli de la barre', () => {
  const compact = css.slice(
    css.indexOf('@media (max-width: 1120px)'),
    css.indexOf('/* ------------------------------------------------- menu des commandes secondaires')
  )

  it('l’écart des commandes se resserre sous le seuil', () => {
    expect(compact).toContain('.app-bar__actions { gap: 0.4rem; }')
  })

  it('le nom du fichier cède le premier, comme la règle le promet depuis toujours', () => {
    expect(compact).toContain('.app-bar__file { max-width: 18ch; }')
    // Il cède de la PLACE, pas du contenu : l'ellipse et l'infobulle gardent le nom entier.
    expect(rule('.app-bar__file')).toContain('text-overflow: ellipsis;')
  })
})

/**
 * La boîte des langues. Le sélecteur n'en est presque qu'un prétexte : ce qu'elle porte
 * d'irremplaçable, c'est la mise **côte à côte** des deux axes — celui qui se règle et
 * celui qui ne se règle pas. Voir `src/i18n/axes.ts`.
 */
describe('app.css — les deux axes de langue se distinguent avant d’être lus', () => {
  it('l’axe des libellés se peint comme un constat, pas comme une commande', () => {
    // Le liséré et l'aplat le rangent avec ce qui renseigne. Rien dedans n'a l'air
    // cliquable, parce que rien ne l'est.
    const box = rule('.lang-axis--labels')
    expect(box).toContain('border-left: 3px solid var(--app-line-strong);')
    expect(box).toContain('background: var(--app-panel);')
  })

  it('la langue courante est marquée deux fois, dont une qui n’est pas une couleur', () => {
    // Le pilote qui ouvre cette boîte est, par hypothèse, celui qui ne lit pas ce qui
    // l'entoure : l'aplat inversé ne suffit pas, la coche le double.
    expect(rule('.lang-choice--current')).toContain('background: var(--app-ink);')
    expect(css).toContain('.lang-choice__check {')
  })

  it('les cinq entrées s’alignent en pairs', () => {
    // Cinq boutons de largeurs différentes se liraient comme cinq commandes différentes.
    expect(rule('.lang-choice')).toContain('min-width: 8.5rem;')
  })
})

/**
 * # Aucune ressource d'un autre hôte, et personne pour l'oublier
 *
 * Le `README` promet dans cinq langues une page qui « n'a pas de serveur à qui parler ».
 * C'était faux : `index.html` chargeait la feuille de Google Fonts, donc le navigateur du
 * pilote annonçait sa visite — IP, `Referer` — à un tiers, dès le premier affichage et
 * avant tout geste de sa part. Les fontes sont désormais servies par le dépôt
 * (`src/ui/fonts.css`, `src/ui/fonts/`).
 *
 * Ce contrôle est là parce qu'une phrase de commentaire ne tient pas : ajouter un `<link>`
 * vers un CDN est le geste le plus naturel du monde, et rien ne le signalerait à la
 * relecture. Il refuse **toute URL absolue** dans la page d'entrée, dans les deux feuilles
 * et dans les trois bancs d'essai — une fonte, une icône, une mesure d'audience valent la
 * même chose : le pilote parle à quelqu'un qu'il n'a pas choisi.
 *
 * ⚠️ Ce qu'il ne voit pas : une URL construite en JavaScript, et un `fetch` du code. Il
 * garde la porte d'entrée, pas la maison.
 */
describe('rien de cette page ne vient d’un autre hôte', () => {
  const pages = ['index.html', 'src/ui/libraryPanel.demo.html',
    'src/ui/sharingDialog.demo.html', 'src/ui/versionDiagnostic.demo.html']
  const sheets = ['src/ui/app.css', 'src/ui/fonts.css', 'src/ui/style.css']

  /** Les commentaires racontent l'histoire du tiers retiré : ils ne chargent rien. */
  function withoutComments(source: string, html: boolean): string {
    return html
      ? source.replaceAll(/<!--[\s\S]*?-->/g, ' ')
      : source.replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
  }

  function read(relative: string): string {
    return readFileSync(path.join(here, '../..', relative), 'utf8')
  }

  it.each([...pages, ...sheets])('%s ne cite aucun hôte distant', (relative) => {
    const source = withoutComments(read(relative), relative.endsWith('.html'))
    expect([...source.matchAll(/https?:\/\/[^\s"')]+/g)].map((m) => m[0])).toEqual([])
  })

  it('les treize fichiers de fonte que la feuille appelle sont bien là', () => {
    // Sans cette borne, la règle ci-dessus serait verte sur une feuille qui n'appelle
    // plus rien du tout — et le carnet aurait perdu ses fontes sans que rien ne le dise.
    const called = [...read('src/ui/fonts.css').matchAll(/url\(\.\/fonts\/([^)]+)\)/g)]
      .map((match) => match[1]!)
    expect(new Set(called).size).toBe(13)
    for (const name of new Set(called)) {
      expect(existsSync(path.join(here, '../../src/ui/fonts', name)), name).toBe(true)
    }
  })

  it('la licence des deux familles voyage avec elles', () => {
    // La SIL Open Font 1.1 l'exige de qui redistribue les fichiers.
    for (const name of ['OFL-Public-Sans.txt', 'OFL-Spectral.txt']) {
      expect(read(`src/ui/fonts/${name}`)).toContain('SIL Open Font License, Version 1.1')
    }
  })
})

/**
 * # Le bandeau de réglages laisse voir la page sur une fenêtre courte
 *
 * Défaut du second essai pilote (22 août 2026), sa gêne n° 2 : « en 1024 × 640 je ne vois
 * **rien** de ma page ; […] même sur grand écran il cache la moitié basse pendant que je
 * redimensionne ». Reproduit au navigateur sur `2026-08-20_backup-00.xcfg`, page paysage 1,
 * zoom 100 %, fenêtre 1024 × 640 : au premier gadget choisi, le bandeau se déployait à
 * 294 px et il ne restait que 290 px sous la barre de tête pour une plaque qui en demande
 * 361. **Aucune position de défilement ne dégageait la page** — le balayage des 601 px de
 * défilement n'en a trouvé aucune.
 *
 * La cause n'est ni la place du bandeau — il est sous la page, et c'est le troisième
 * principe du projet — ni son état d'ouverture, réglé la veille (`dockCollapsed`,
 * `dockSetByPilot`). C'est son **plafond** : `dockHeightCeiling` promet « jamais plus de la
 * moitié de ce que la barre de tête laisse », et cette moitié a été mesurée sur une fenêtre
 * de 913 px, où elle laissait encore 429 px à la page. Sur une fenêtre courte, la même
 * fraction ne laisse plus rien.
 *
 * Ce que la correction borne n'est donc pas une fraction, mais **ce que le bandeau laisse**.
 * Après correction, même relevé : corps de 152 px, bandeau de 214 px, et la plaque entière
 * dégagée à 406 px de défilement.
 */
describe('app.css — le bandeau laisse la page visible sur une fenêtre courte', () => {
  /** Ce que le bandeau ajoute autour de son corps, mesuré : poignée, barre de tête, bords. */
  const DOCK_CHROME_PX = 62
  /** La barre de tête collante, mesurée à 1024 px de large. */
  const HEAD_BAR_PX = 56
  /** La plaque d'une page paysage à 100 % de zoom sur l'AIR³ 7.2, mesurée. */
  const LANDSCAPE_BED_PX = 361

  /** La valeur en pixels d'une longueur en rem écrite dans la feuille. */
  function rem(value: string): number {
    const match = /^([\d.]+)rem$/.exec(value)
    expect(match, `longueur en rem attendue : ${value}`).not.toBeNull()
    return Number(match![1]) * 16
  }

  function pageRoom(): string {
    const match = /--dock-page-room:\s*([^;]+);/.exec(rule('.dock'))
    expect(match, 'jeton `--dock-page-room` absent de `.dock`').not.toBeNull()
    return match![1]!.trim()
  }

  it('le corps du bandeau est plafonné par ce qu’il laisse, pas seulement par sa hauteur', () => {
    const body = rule('.dock__body')
    // `min` : la plus basse des deux bornes gagne — la hauteur demandée sur une fenêtre
    // haute, la place qui reste sur une fenêtre courte.
    expect(body).toMatch(/max-height:\s*min\(/)
    expect(body).toContain('var(--dock-body-height)')
    expect(body).toContain('calc(100dvh - var(--dock-page-room))')
  })

  it('un plancher garde le bandeau utilisable quand plus rien ne sauve la page', () => {
    // 7 rem, c'est `DOCK_HEIGHT_MIN` : sous cette fenêtre-là, écraser le bandeau
    // davantage ferait perdre les deux au lieu d'un.
    expect(rule('.dock__body')).toMatch(/max\(\s*7rem\s*,/)
  })

  it('ce qui est réservé à la page suffit à une plaque paysage entière', () => {
    // Le calcul que la mesure au navigateur a confirmé : sur une fenêtre de 640 px, ce que
    // le bandeau laisse doit encore tenir la plaque. Changer `--dock-page-room` sans
    // refaire la mesure fait échouer ce test plutôt que de rendre la page invisible.
    const windowPx = 640
    const bodyCap = windowPx - rem(pageRoom())
    const leftToPage = windowPx - HEAD_BAR_PX - (bodyCap + DOCK_CHROME_PX)
    expect(bodyCap).toBeGreaterThanOrEqual(112)
    expect(leftToPage).toBeGreaterThanOrEqual(LANDSCAPE_BED_PX)
  })

  it('la hauteur réglée à la poignée échappe à ce plafond', () => {
    // Une préférence de l'outil ne discute pas avec un geste du pilote — la règle même que
    // `dockSetByPilot` applique au repli. Sans cette ligne, la poignée cesserait de
    // répondre au-delà du plafond, ce qui est pire que le défaut corrigé.
    const sized = rule('.dock--sized .dock__body')
    expect(sized).toContain('height: var(--dock-body-height);')
    expect(sized).toContain('max-height: var(--dock-body-height);')
  })
})
