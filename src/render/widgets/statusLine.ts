import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { widgetBoolean } from '../defaults'

/**
 * Rendu de `WStatusLine` — le bandeau d'indicateurs en haut d'écran : réception GPS,
 * `LIVE`, état des capteurs, batterie, de gauche à droite, sur un fond gris clair uni
 * `#e8e8e8`.
 *
 * **Refait sur `docs/reference/captures-air3/2026-08-21_barre-etat-reelle.png`** — la
 * barre d'état seule d'un AIR³ 7.2, 500 × 100 px, découpe 1:1 du widget réel
 * (6042..10000 × 0..1379, soit 507 × 99 px sur un écran 1280 × 720). Le recoupement avec
 * `2026-08-21_polices-reference.png`, qui montre la même barre non recadrée à gauche,
 * donne les mêmes tailles au pixel près. Ce que le rendu précédent ratait :
 *
 * - **le texte était trois fois trop petit** : il partait de la police du document
 *   (16 px dans le repère de rendu) alors que les capitales de `LIVE` mesurent 37 px et
 *   les chiffres de `100%` 39 px, soit une police d'environ 53 px ;
 * - **les éléments étaient collés à droite** ; sur l'appareil, ils remplissent la barre
 *   d'un bord à l'autre (0..493 sur 500) avec des écarts réguliers, ce qui revient à un
 *   groupe centré ;
 * - **le pictogramme des capteurs n'était pas le bon** : c'est un parapente, et c'est de
 *   loin le plus grand élément de la barre (87 px de haut sur 99, contre 33 pour le GPS
 *   et 32 pour la batterie) ;
 * - **la batterie n'a pas la forme retenue jusqu'ici** : pas un contour vide à demi
 *   rempli, mais un corps plein sombre (`#231f20`, relevé au pixel) portant des cellules
 *   vertes (`#8dc63f`) régulièrement espacées.
 *
 * ## La taille du texte — TRANCHÉE, et c'est la LARGEUR qui manquait
 *
 * Ce module a longtemps posé une police **constante** (environ 53 px), sur la foi de deux
 * captures de barres hautes de 74 et 99 px qui donnaient la même hauteur de capitale.
 * L'explication était fausse, et la réserve écrite ici l'a été jusqu'à ce qu'une page de
 * diagnostic portant **six barres** la tranche
 * (`captures-air3/2026-08-21_barre-etat-tailles.png`, hauteur du glyphe « % ») :
 *
 * | largeur × hauteur | hauteur du « % » |
 * |---|---|
 * | 1280 × 50 | 33 |
 * | 1280 × 99 | 70 |
 * | 1280 × 199 | 99 |
 * | 251 × 198 | 19 |
 * | 402 × 198 | 30 |
 * | 627 × 198 | 49 |
 *
 * À hauteur CONSTANTE (198 px), le texte passe de 19 à 49 px selon la largeur. Le modèle
 * qui rend compte des six mesures est un minimum de deux contraintes :
 *
 * > hauteur d'encre ≈ min( 0,70 × hauteur du widget ; 0,077 × largeur du widget )
 *
 * Il réconcilie **exactement** les deux captures qui se contredisaient : 507 × 99 →
 * min(69 ; 39) = 39, mesuré 39 ; 1280 × 100 → min(70 ; 98) = 70, mesuré 71. Autrement dit
 * une barre large est limitée par sa hauteur, une barre étroite par sa largeur — et la
 * barre du propriétaire est étroite (3958/10000 de la page), ce qui explique que son texte
 * paraisse deux fois plus petit qu'attendu. La formule vit dans `.xc-status` (style.css),
 * où les deux dimensions sont disponibles.
 *
 * Ce que le relevé laisse ouvert : le **nombre d'éléments affichés** devrait entrer dans le
 * facteur de largeur, puisque le contenu se répartit toujours de bord à bord. Les six
 * barres portent les mêmes six éléments — **NON VÉRIFIÉ**.
 *
 * Les pictogrammes, eux, ne suivent proprement ni la hauteur ni une taille fixe entre les
 * deux captures (GPS 40 px sur la barre de 74, 33 px sur celle de 99) : on suit la capture
 * de référence, la plus fraîche et la seule prise en pleine résolution du widget. **NON
 * TRANCHÉ**, et distinct de la taille du texte, qui l'est désormais.
 *
 * **Ce qui est délibérément NON reproduit — état de l'appareil, pas trait du widget.**
 * Le fichier `.xcfg` ne porte aucune clé de ces états ; les inventer ferait dire au rendu
 * quelque chose que la configuration ne dit pas.
 * - **L'éclair de charge** blanc en travers de la batterie : l'AIR³ était branché en USB
 *   au moment de la capture. Rien dans le fichier ne le commanderait.
 * - **`100%`** : niveau réel de l'instant. On garde un pourcentage d'exemple, comme les
 *   valeurs des widgets numériques (`numeric.ts`), et les cellules vertes le suivent.
 * - **Le trait rouge** qui barre `LIVE` ou le parapente quand le service ou les capteurs
 *   sont indisponibles (visible sur les deux, au sol, dans `ecran-landscape3-17widgets`).
 *
 * **`LIVE` est noir.** Trois états ont été vus successivement, ce qui vaut la peine
 * d'être posé clairement plutôt que de remplacer une supposition par une autre :
 * 1. au sol, 2026-08-20 : texte NOIR, barré de rouge (rendu-observe.md) ;
 * 2. en rejeu de trace : texte VERT avec un point vert, barré de rouge lui aussi
 *    (rendu-en-vol.md § 5) — d'où la correction qui avait fait passer notre rendu au
 *    vert ;
 * 3. au sol, 2026-08-21, appareil connecté : texte NOIR, point NOIR plein, **pas de
 *    trait**.
 * Le noir est donc la couleur de base de l'indicateur, le vert un état d'exécution
 * (suivi actif) et le trait rouge un autre (service indisponible) — ni l'un ni l'autre
 * n'a de clé dans le fichier. `showLive` dit seulement si l'indicateur doit APPARAÎTRE.
 * Une visionneuse statique dessine donc la forme neutre, celle qui n'affirme rien :
 * noir, non barré. C'est aussi, et ce n'est pas un hasard, ce que montre la capture la
 * plus récente et la seule prise en pleine résolution du widget.
 *
 * **Une clé absente vaut son DÉFAUT, pas `false` — et c'est ce qui vidait la barre.**
 *
 * Ce module a longtemps lu `readBoolean(node, key) === true`, sur la foi des 35
 * occurrences du corpus (5 fichiers) où chaque indicateur visible portait sa clé à
 * `true`. Le raisonnement était le même que celui, faux, qui avait été corrigé sur
 * `_title`/`_unit` (numeric.ts) : un corpus où la clé est toujours écrite ne dit rien de
 * ce qui se passe quand elle ne l'est pas. La planche des 75 widgets répond, elle :
 * écrite avec ses seules huit clés universelles, relue par l'appareil puis ré-exportée,
 * elle donne `showGps`, `showSensors`, `showLive`, `showLiveLabel`, `showBatteryIcon`,
 * `showBatteryPercent` à **`true`** et `showTime` à `false`
 * (`src/catalog/widgetDefaults.json`), et la capture
 * `captures-air3/2026-08-21_planche-sol-9-barre-etat-live-journal-web.png` montre la
 * barre complète là où notre rendu ne dessinait **rien du tout** — une bande grise vide.
 * Le défaut frappait tout fichier écrit par notre propre éditeur, et `WStatusLine` est
 * le premier widget que voit un pilote en haut de sa page.
 *
 * Les deux profils du corpus restent lisibles ainsi, et le second cesse d'être
 * indécidable :
 * - `landscape[0..4]` (20 occurrences identiques) : les six clés à `true`, `showTime` à
 *   `false` — le jeu de la capture de référence, inchangé.
 * - `portrait[0..2]` (15 occurrences) : seules `showTime` et `showLiveLabel` sont
 *   écrites. `showLive` étant absente, elle vaut désormais son défaut (`true`) : le
 *   groupe LIVE s'affiche, et l'heure avec, ce que `showLiveLabel: true` rendait de
 *   toute façon incohérent autrement. Toujours **aucune capture portrait** pour le
 *   confirmer, mais ce n'est plus une lecture arbitraire : c'est la même règle que
 *   partout ailleurs.
 *
 * **`soundMode` reste délibérément non dessiné**, et la raison est maintenant précise
 * plutôt que faute de mieux. Le catalogue d'options donne les trois valeurs de la clé et
 * le libellé de son défaut : `WARN_MUTED` = « Afficher l'icône d'avertissement
 * **uniquement en mode silencieux** » (`DISABLED`, `SHOW_VOLUME` étant les deux autres).
 * Le haut-parleur barré sur fond orange de la capture est donc l'affichage d'un **état
 * de l'appareil** — le son coupé au moment du cliché —, exactement comme l'éclair de
 * charge ou le trait rouge sur `LIVE`, qu'on ne dessine pas davantage. Le fichier ne
 * porte pas cet état ; le dessiner ferait dire au rendu ce que la configuration ne dit
 * pas. C'est le seul élément à fond coloré de la barre, et c'est le prix de ne rien
 * inventer.
 */

/** Corps de la pile de batterie — mesuré au pixel sur la capture (35,31,32). */
const BATTERY_BODY = '#231f20'

/** Cellules vertes à l'intérieur du corps — mesuré au pixel (141,198,63). */
const BATTERY_GREEN = '#8dc63f'

/**
 * Pourcentage de batterie statique — valeur d'exemple, comme les valeurs des widgets
 * numériques (numeric.ts) : le niveau réel est un état d'exécution que le fichier ne
 * contient pas. Il commande aussi le nombre de cellules allumées.
 */
const EXAMPLE_BATTERY_PERCENT = 82

/** Heure statique — même exemple que WTime dans numeric.ts, pour rester cohérent. */
const EXAMPLE_TIME = '14:32'

/** Nombre de cellules du pictogramme de batterie. */
const BATTERY_CELLS = 5

/**
 * Icônes SVG en ligne — consigne explicite : pas d'emoji, pas de police d'icônes.
 *
 * GPS : parabole pleine en bas à gauche et deux arcs concentriques vers le haut à droite
 * (« antenne » émettant vers le satellite). La capture montre des traits plus épais et
 * plus effilés que ce dessin ; seule la structure est reprise, pas le tracé exact.
 */
const ICON_GPS = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
  <path d="M2 22 L2 15 A7 7 0 0 1 9 22 Z" fill="currentColor" stroke="none"/>
  <path d="M3 10.5 A13.5 13.5 0 0 1 16.5 24"/>
  <path d="M4.5 3 A20 20 0 0 1 24 22.5"/>
</svg>`.trim()

/**
 * Capteurs : le parapente vu de face de XCTrack — voile en arc au-dessus, aile et
 * suspentes convergeant vers le pilote en dessous. Relevé sur la capture : le glyphe
 * occupe 76 × 87 px dans une barre de 99, l'arc de voile la moitié haute (y 6..45), le
 * corps la moitié basse (y 52..89). Silhouette reprise, tracé approché.
 *
 * Il n'est PAS barré ici : le trait rouge de la capture du 2026-08-20 signale des
 * capteurs indisponibles, un état d'exécution qu'aucune clé du fichier ne porte — même
 * raisonnement que pour `LIVE`, voir le commentaire de tête.
 */
const ICON_SENSORS = `
<svg viewBox="0 0 80 92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M24 44 C 24 -2, 55 -2, 55 44" stroke-width="6"/>
  <path d="M4 51 L30 59" stroke-width="8"/>
  <path d="M75 51 L49 59" stroke-width="8"/>
  <path d="M29 59 L38.5 78" stroke-width="7"/>
  <path d="M50 59 L38.5 78" stroke-width="7"/>
  <path d="M38.5 74 L38.5 88" stroke-width="7"/>
  <path d="M13 70 L27 75" stroke-width="8"/>
  <path d="M66 70 L52 75" stroke-width="8"/>
</svg>`.trim()

/**
 * Batterie : corps plein sombre, téton à droite, cellules vertes à l'intérieur —
 * proportions relevées sur la capture (corps 77 × 32, téton 5 × 16, total 82 × 32, soit
 * un rapport 2,56). Le nombre de cellules allumées suit le pourcentage d'exemple ; la
 * capture, à 100 %, les montre toutes vertes.
 */
function batteryIcon(percent: number): string {
  const lit = Math.max(1, Math.min(BATTERY_CELLS, Math.round((percent / 100) * BATTERY_CELLS)))
  const cells: string[] = []
  for (let index = 0; index < lit; index += 1) {
    cells.push(`<rect x="${(3 + index * 6.7).toFixed(1)}" y="3" width="5.2" height="10" fill="${BATTERY_GREEN}"/>`)
  }
  return `
<svg viewBox="0 0 41 16" aria-hidden="true">
  <rect x="0" y="0" width="38" height="16" rx="2.5" fill="${BATTERY_BODY}"/>
  <rect x="38" y="5" width="3" height="6" rx="1" fill="${BATTERY_BODY}"/>
  ${cells.join('\n  ')}
</svg>`.trim()
}

function iconElement(className: string, svgMarkup: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.innerHTML = svgMarkup
  return span
}

/**
 * Vrai si l'indicateur doit apparaître : la clé du fichier si elle y est, **sinon la
 * valeur par défaut de XCTrack** (`render/defaults.ts`). Une clé que ni le fichier ni le
 * relevé ne portent ne s'affiche pas — c'est le seul cas où l'absence vaut `false`.
 *
 * Le `=== true` d'avant faisait de toute clé absente un `false`, et vidait donc
 * entièrement la barre d'un fichier écrit par notre propre éditeur : c'était exactement
 * le défaut `_title`/`_unit` de `numeric.ts`, resté entier ici.
 */
function shown(widget: Widget, key: string): boolean {
  return widgetBoolean(widget, key) ?? false
}

export function drawStatusLine(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'xc-status'

  if (shown(widget, 'showGps')) {
    bar.append(iconElement('xc-status__icon xc-status__gps', ICON_GPS))
  }

  if (shown(widget, 'showLive')) {
    const live = document.createElement('span')
    live.className = 'xc-status__live'

    const dot = document.createElement('span')
    dot.className = 'xc-status__dot'
    live.append(dot)

    if (shown(widget, 'showLiveLabel')) {
      const label = document.createElement('span')
      label.className = 'xc-status__live-text'
      label.textContent = 'LIVE'
      live.append(label)
    }

    bar.append(live)
  }

  if (shown(widget, 'showSensors')) {
    bar.append(iconElement('xc-status__icon xc-status__sensors', ICON_SENSORS))
  }

  const showBatteryIcon = shown(widget, 'showBatteryIcon')
  const showBatteryPercent = shown(widget, 'showBatteryPercent')
  if (showBatteryIcon || showBatteryPercent) {
    const battery = document.createElement('span')
    battery.className = 'xc-status__battery'

    if (showBatteryIcon) {
      battery.append(iconElement('xc-status__icon xc-status__battery-icon', batteryIcon(EXAMPLE_BATTERY_PERCENT)))
    }

    if (showBatteryPercent) {
      const percent = document.createElement('span')
      percent.className = 'xc-status__percent'
      percent.textContent = `${EXAMPLE_BATTERY_PERCENT}%`
      battery.append(percent)
    }

    bar.append(battery)
  }

  // Position non confirmée par une capture (aucune ne porte showTime: true dans le
  // bandeau lui-même — voir le commentaire de tête) : placée en dernier, à l'extrémité
  // droite, par cohérence avec l'ordre du reste du bandeau.
  if (shown(widget, 'showTime')) {
    const time = document.createElement('span')
    time.className = 'xc-status__time'
    time.textContent = EXAMPLE_TIME
    bar.append(time)
  }

  return bar
}
