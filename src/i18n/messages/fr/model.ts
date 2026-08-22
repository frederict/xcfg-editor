/**
 * La prose des couches **sous** l'interface : `src/model/`, `src/library/`,
 * `src/catalog/`.
 *
 * Ces couches ne dépendent pas de `src/i18n/` : elles **reçoivent un traducteur en
 * argument** et n'importent de lui que son type, effacé à la compilation. C'est le motif
 * arrêté pour tout le dépôt — voir `src/i18n/CLAUDE.md` § « La prose hors interface » — et
 * `src/model/personalData.ts` en est l'exemple appliqué.
 *
 * ## Les familles d'énumération portent leur préfixe
 *
 * `personalKind.*`, `personalBasis.*`, `personalHome.*`, `personalReason.*` : le préfixe
 * nomme la famille, comme `factoryValue.*` et `provenance.*` dans `common.ts`. C'est la
 * convention du dépôt pour un jeu de valeurs fermé, et elle rend le `grep` immédiat.
 *
 * ## Ce qui n'est PAS ici, et pourquoi
 *
 * Les **44 raisons des clés de préférences** vivent dans `src/model/personalKeys.json`,
 * qui est **extrait de l'APK** par `tools/extract-preferences.py` et vérifié à chaque
 * exécution des tests. Ce sont des **données**, pas de la prose de code : les traduire
 * demande de faire porter au fichier extrait cinq colonnes, ou de leur donner à chacune
 * une clé — décision qui appartient au lot qui reprendra l'extraction, pas à celui-ci.
 * En attendant, `personalProse.reason()` rend la raison française telle que le fichier la
 * porte, et le dit.
 */
const model = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identité',
  'personalKind.credential': 'identifiant',
  'personalKind.contact': 'contact',
  'personalKind.device': 'appareil',
  'personalKind.location': 'position',
  'personalKind.file': 'fichier',
  'personalKind.freeText': 'texte libre',
  'personalKind.equipment': 'matériel',
  'personalKind.sharing': 'partage',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack le déclare lui-même',
  'personalBasis.inputType': 'XCTrack le saisit en points, comme un mot de passe',
  'personalBasis.declared': 'c’est notre jugement, pas celui de XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Disposition — part avec les pages',
  'personalHome.preferences': 'Préférences — reste chez vous dans un export « pages »',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'titre personnalisé d’un gadget, écrit par vous',
  'personalReason.text': 'contenu entier d’un gadget de texte libre, écrit par vous',
  'personalReason.fullName': 'nom d’une personne enregistrée sur un bouton d’appel',
  'personalReason.phoneNumber': 'numéro de téléphone enregistré sur un bouton d’appel',
  'personalReason.url': 'adresse web saisie, qui peut porter un jeton ou un identifiant',
  'personalReason.title': 'libellé d’un bouton de lancement, écrit par vous',
  'personalReason.name': 'nom de l’application visée par un bouton de lancement',
  'personalReason.action': 'action Android d’un bouton de lancement, qui peut être un URI complet',
  'personalReason.filter': 'filtre de journal que vous avez saisi',
  'personalReason.suffix': 'texte placé après la valeur affichée, écrit par vous',
  'personalReason.event': 'nom d’événement que vous avez saisi',
  'personalReason.unknown': 'texte libre sans règle propre : traité comme personnel, par précaution',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'emplacement présent, mais vide',

  'personal.hiddenStructure': {
    one: 'structure de {count} entrée, non montrée',
    other: 'structure de {count} entrées, non montrée'
  },

  'personal.caveat': {
    one: 'Cet inventaire porte sur les réglages connus de XCTrack {version} : {count} réglage et onze champs de texte libre des gadgets. Le format change à chaque version — un inventaire vide ne prouve donc pas une absence.',
    other: 'Cet inventaire porte sur les réglages connus de XCTrack {version} : {count} réglages et onze champs de texte libre des gadgets. Le format change à chaque version — un inventaire vide ne prouve donc pas une absence.'
  }
} as const

export default model

export type FrenchModel = typeof model
