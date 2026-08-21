/**
 * Métriques de texte de l'appareil — relevées au pixel sur deux captures d'AIR³ 7.2
 * (1280 × 720), pas déduites d'une règle de mise en page plausible.
 *
 * Sources :
 * - `docs/reference/captures-air3/2026-08-21_polices-reference.png` — page 1 paysage de
 *   `Exemples/2026-08-20_pages-00.xcfg`, recadrée : décalage horizontal 248 px, échelle
 *   1:1, vérifié sur les filets de séparation (colonnes 150-152 et 526 pour les
 *   frontières normalisées 3125 et 6042, lignes 346-348 et 544-546 pour 4828 et 7586).
 * - `docs/reference/captures-air3/ecran-landscape3-17widgets.png` — `landscape[3]` de
 *   `Exemples/2026-08-20_backup-00.xcfg`, pleine page.
 *
 * Les deux appareils tournaient avec `Display.WidgetTitleSize: 140` (relevé dans les
 * préférences de `2026-08-20_backup-00.xcfg`, le seul fichier du corpus qui les porte —
 * `2026-08-20_pages-00.xcfg` ne contient que des pages, l'appareil garde donc ses
 * propres réglages d'affichage en le chargeant).
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
