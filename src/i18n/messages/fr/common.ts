/**
 * Le vocabulaire employé par **plusieurs** domaines. Rien d'autre.
 *
 * ⚠️ C'est le seul fichier de catalogue que plusieurs lots d'extraction peuvent vouloir
 * toucher : n'y versez un mot que lorsqu'il est déjà employé par deux domaines au moins.
 * Voir `src/i18n/domains.ts`.
 *
 * ## Les trois sens de « relevé », tranchés ici
 *
 * Le français les confond (relevé de langue § B.3), et cette distinction **est** la valeur
 * du projet : ce qui est extrait de l'APK n'est pas ce qui est mesuré sur l'appareil.
 *
 * | Clé | Ce que c'est | Anglais |
 * |---|---|---|
 * | `provenance.apkSurvey` | notre extraction des 47 APK | *survey* |
 * | `provenance.factoryValueCatalogue` | le catalogue des valeurs d'usine | *catalogue* |
 * | `provenance.measuredOnDevice` | ce qui a été observé sur l'AIR³ | *measured* |
 *
 * Les deux dernières lignes de la famille — `declaredByFile` et `assumedByEditor` — sont
 * la formulation modèle de la bibliothèque, celle que le relevé désigne comme « la
 * meilleure phrase de l'application » : elle porte la distinction mesuré / supposé sans
 * un mot de spécialiste.
 */
const common = {
  /* ----------------------------------------------------- « relevé », les trois sens */

  'provenance.apkSurvey': 'notre relevé des versions de XCTrack',
  'provenance.factoryValueCatalogue': 'le catalogue des valeurs d’usine',
  'provenance.measuredOnDevice': 'mesuré sur l’appareil',
  'provenance.declaredByFile': 'Ce que le fichier déclare',
  'provenance.assumedByEditor': 'Ce que cet éditeur suppose',

  /* ---------------------------------------------------------------------- formateurs */

  /** Ce que `format.dateTime` ne dit pas : il rend `undefined`, la prose est ici. */
  'common.unknownDate': 'date inconnue',

  /* ------------------------------------------------- vocabulaire de la valeur d'usine */

  /**
   * « défaut » se lit *anomalie* en français, et le dépôt l'emploie encore 19 fois nu,
   * dont quatre fois en capitales collées au nom du pilote. « valeur d'usine » est court,
   * n'a pas de second sens, et porte exactement l'idée : *ce que le fabricant a posé
   * avant vous*. Le français est la seule des cinq langues où la collision existe.
   */
  'factoryValue.same': 'VALEUR D’USINE',
  'factoryValue.setByYou': 'RÉGLÉ PAR VOUS',
  'factoryValue.uncertain': 'VALEUR D’USINE INCERTAINE',
  'factoryValue.neverSet': 'JAMAIS RÉGLÉ'
} as const

export default common

export type FrenchCommon = typeof common
