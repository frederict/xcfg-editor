/**
 * Métriques de texte de l'appareil — relevées au pixel sur deux captures d'AIR³ 7.2
 * (1280 × 720), pas déduites d'une règle de mise en page plausible.
 *
 * Sources :
 * - `docs/reference/captures-air3/2026-08-21_polices-reference.png` — page 1 paysage de
 *   `Exemples/2026-08-20_pages-00.xcfg`, recadrée : décalage horizontal 248 px, échelle
 *   1:1, vérifié sur les filets de séparation (colonnes 150-152 et 526 pour les
 *   frontières normalisées 3125 et 6042, lignes 346-348 et 544-546 pour 4828 et 7586).
 *   ⚠️ Les deux **colonnes** ne sont pas aimantées : la grille de rendu de `canvas.ts`
 *   donne 154 et 530. Les lignes, elles, concordent. Voir son § « Trois relevés du dépôt
 *   que cette loi contredit » — NON TRANCHÉ.
 * - `docs/reference/captures-air3/ecran-landscape3-17widgets.png` — `landscape[3]` de
 *   `Exemples/2026-08-20_backup-00.xcfg`, pleine page.
 *
 * Les deux appareils tournaient avec `Display.WidgetTitleSize: 140` (relevé dans les
 * préférences de `2026-08-20_backup-00.xcfg`). La règle est celle du **format**, pas celle
 * d'un fichier : tout export `backup` porte les réglages d'affichage, aucun export `pages`
 * n'en porte — `2026-08-20_pages-00.xcfg` ne contient que des pages, l'appareil garde donc
 * ses propres réglages en le chargeant. Trois des cinq fixtures d'export portent la clé, et
 * dix-sept des vingt et un fichiers réels. Le docblock a dit « le seul fichier du corpus
 * qui les porte » jusqu'au 22 août 2026, et c'est cette exclusivité qui servait d'argument
 * à la phrase suivante ; `tests/docs/chiffres.test.ts` tient maintenant le compte.
 *
 * **Le fait central, contraire à ce que faisait notre rendu** : la hauteur du TITRE ne
 * dépend pas de la taille du widget. Elle vaut 15-17 px de haut (hauteur de casse 15,
 * hampes 16, hauteur d'x 11) sur les huit widgets mesurés de la page 1, dont la hauteur
 * va de 124 à 199 px, et 15-17 px de nouveau sur les neuf widgets de `landscape[3]`,
 * hauts de 75 à 149 px. Dix-sept mesures, une seule taille.
 *
 * Voir `docs/reference/rendu-observe.md` § « Tailles de texte » pour le tableau complet.
 */

/**
 * Taille de police du titre, en fraction du **petit côté** de la page, à
 * `Display.WidgetTitleSize = 100`.
 *
 * Calibrage : hauteur de casse mesurée 15 px (« GPS » de « Altitude GPS »), hampes 16 px,
 * hauteur d'x 11 px — trois mesures cohérentes avec la police Roboto de l'appareil
 * (casse 0,711 em, hampe 0,747 em, x 0,528 em), qui donnent une taille de police de
 * 21,1 px. Le réglage de l'appareil valant 140, la base à 100 est 21,1 / 1,4 = 15,05 px,
 * soit 2,09 % des 720 px de haut de l'écran.
 *
 * Le **petit côté** plutôt que la hauteur : en paysage les deux se confondent (720 px),
 * mais le repère de rendu d'une page portrait (voir `REFERENCE_WIDTH` dans `canvas.ts`)
 * est bien plus haut que large. Rapporter la taille au petit côté garde au texte la
 * même taille physique dans les deux orientations. Aucune capture portrait ne le
 * confirme : c'est la lecture la plus cohérente, pas une mesure.
 */
export const TITLE_SIZE_RATIO = 0.0209

/**
 * Largeur moyenne d'un caractère de titre, en cadratins, mesurée sur les neuf libellés
 * lisibles des deux captures : « Altitude GPS » 0,451, « Vitesse du vent » 0,437,
 * « Niveau de vol » 0,431, « Hauteur sol » 0,436, « Durée du vol » 0,431, « Finesse /
 * 2s » 0,419, « Direction du vent » 0,419, « Vitesse verticale / 2s » 0,395, « Heure »
 * 0,503 — moyenne 0,436.
 *
 * La valeur retenue est volontairement un peu plus large : la police du navigateur n'est
 * pas le Roboto de l'appareil, et une estimation trop courte laisserait le titre déborder
 * (c'est-à-dire se tronquer, `text-overflow: ellipsis`), exactement le défaut à corriger.
 * Sert uniquement de garde-fou : elle ne réduit le titre que lorsqu'il ne tiendrait pas.
 */
const TITLE_GLYPH_EM = 0.47

/** Largeur estimée d'un titre, en cadratins de sa propre police. */
export function titleWidthEm(text: string): number {
  return Math.max(1, text.length * TITLE_GLYPH_EM)
}

/**
 * Largeur d'un caractère de VALEUR, en cadratins — même démarche que `TITLE_GLYPH_EM`,
 * mais les valeurs sont courtes et hétérogènes (« +0,0 », « 10:03 », « 1234 »), et une
 * moyenne unique y coûterait cher : une virgule et un chiffre ne prennent pas la même
 * place, et c'est justement sur les valeurs à ponctuation que notre rendu débordait.
 * Trois familles suffisent, calibrées sur les avances de Roboto (chiffre 0,568 ;
 * ponctuation étroite 0,26 ; `m` 0,87).
 */
export function valueGlyphEm(character: string): number {
  if ('.,:'.includes(character)) return 0.3
  // Les crochets des valeurs estimées (`use_brackets`, voir `numeric.ts`) : une avance
  // de 0,335 em dans Roboto, entre la ponctuation étroite et le chiffre. Les compter
  // comme des chiffres surestimerait de 40 % la largeur d'un « [37] », et le budget de
  // largeur réduirait la valeur sans raison.
  if ('[]'.includes(character)) return 0.35
  if ('+-'.includes(character)) return 0.55
  if ('mMwW'.includes(character)) return 0.87
  if (character === ' ') return 0.28
  return 0.58
}

/** Largeur estimée d'un texte de valeur, en cadratins de sa propre police. */
export function valueWidthEm(text: string): number {
  let total = 0
  for (const character of text) total += valueGlyphEm(character)
  return total
}

/**
 * Famille de police du rendu — **doit rester identique à `.xc-page` (style.css)**, sinon
 * la mesure ci-dessous porterait sur une autre police que celle qui dessine.
 */
export const RENDER_FONT_FAMILY = 'system-ui, sans-serif'

/** Graisse de la valeur (`.xc-num__value`) et de son unité (`.xc-num__unit`). */
export const VALUE_FONT_WEIGHT = 600
export const UNIT_FONT_WEIGHT = 400

/**
 * Taille de mesure. Arbitraire : on ne garde que le RAPPORT largeur/taille, invariant
 * d'échelle, ce qui rend la mesure valable quelle que soit la taille de rendu — y
 * compris à l'intérieur du `viewBox` qui met la page à l'échelle (canvas.ts).
 */
const MEASURE_SIZE = 100

/**
 * Contexte de mesure, créé une fois. `null` mémorise un environnement sans canvas —
 * `happy-dom` en test, par exemple — pour ne pas retenter à chaque widget.
 */
let measureContext: CanvasRenderingContext2D | null | undefined

function context(): CanvasRenderingContext2D | null {
  if (measureContext === undefined) {
    try {
      measureContext = document.createElement('canvas').getContext('2d')
    } catch {
      measureContext = null
    }
  }
  return measureContext
}

/**
 * Largeur RÉELLE d'un texte dans la police qui va le dessiner, en cadratins.
 *
 * **Pourquoi cette mesure existe alors que les estimations ci-dessus suffisaient.** Le
 * budget de largeur des valeurs numériques (`unitWidthH`, numeric.ts, et
 * `--xc-value-fit`, style.css) sert à ne JAMAIS trancher un chiffre — l'appareil ne le
 * fait pas, nous le faisions. Mais il ne peut pas être calibré sur le Roboto de
 * l'appareil, parce que ce n'est pas Roboto qui dessine : c'est la police système du
 * navigateur. Mesuré sur les 32 valeurs de la planche, le rapport « largeur réelle /
 * largeur estimée » s'étale de **0,94 à 1,05** — les chiffres y sont 8 % plus larges que
 * dans Roboto (0,63 cadratin contre 0,568) et les figures y sont proportionnelles (le
 * « 1 » ne fait que 0,47) là où Roboto les rend toutes de même largeur. Une marge
 * forfaitaire couvrant ces 5 % d'incertitude coûtait jusqu'à 10 % de hauteur de chiffre
 * sur les widgets dont l'estimation était généreuse : autant réduire l'incertitude à la
 * source.
 *
 * Le commentaire de tête de `numeric.ts` écartait cette mesure au motif qu'elle
 * « supposerait une police effectivement chargée par le navigateur cible, invérifiable
 * sans lui ». C'était vrai du raisonnement fait hors ligne ; c'est faux à l'exécution,
 * où le navigateur cible EST celui qui mesure.
 *
 * Rend `undefined` quand aucun canvas n'est disponible — l'appelant retombe alors sur
 * l'estimation, qui reste donc le comportement des tests et de tout environnement sans
 * rendu graphique.
 */
export function measuredWidthEm(text: string, weight: number): number | undefined {
  if (text.length === 0) return 0
  const ctx = context()
  if (ctx === null) return undefined
  ctx.font = `${weight} ${MEASURE_SIZE}px ${RENDER_FONT_FAMILY}`
  const width = ctx.measureText(text).width
  if (!Number.isFinite(width) || width <= 0) return undefined
  return width / MEASURE_SIZE
}
