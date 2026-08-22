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
  'factoryValue.neverSet': 'JAMAIS RÉGLÉ',

  /* ------------------------------------------------ le mot « gadget », enfin mesuré */

  /**
   * **Le mot que la chrome de XCTrack emploie pour ce qu'on pose sur une page**, dans
   * chacune des cinq langues. Il était le seul mot que le socle refusait de trancher :
   * l'AIR³ dit « Gadget » en français, c'était mesuré, mais ce que disent ses interfaces
   * allemande, néerlandaise et espagnole ne l'était pas — et les catalogues de **noms de
   * gadgets** extraits de l'APK ne répondent pas, puisqu'ils disent « widget » dans les
   * cinq langues, y compris en français où l'appareil dit « Gadget ».
   *
   * **Mesuré le 22 août 2026** sur les 55 relevés complets, dans les ressources de chrome
   * elles-mêmes (`strings.<locale>`, la reprise des `res/values-XX/strings.xml` de
   * l'APK) — et non dans les catalogues de noms. La clé la plus nette est
   * `pagesetCustomizePageConfigureWidgetTitle`, dont la valeur est le substantif seul :
   *
   * | | fr | en | nl | de | es |
   * |---|---|---|---|---|---|
   * | `pagesetCustomizePageConfigureWidgetTitle` | **Gadget** | Widget | Widget | Widget | Widget |
   * | `editmenu_add_widget` | **Ajouter Gadget** | Add Widget | Widget toevoegen | Widget hinzufügen | Agregar Widget |
   *
   * **Identique sur les 55 versions relevées**, de la 0.9.6.2 à la 1.0.3-beta5 : une seule
   * signature, rien n'a bougé. Aucune ressource allemande, néerlandaise ou espagnole ne
   * dit autre chose que *Widget* — ni *Instrument*, ni *Element*, ni *Onderdeel*, ni
   * *Componente*, tous cherchés et tous absents. Il n'y avait donc rien à trancher dans
   * ces trois langues : il y avait à mesurer.
   *
   * **Le seul arbitrage restant était français**, et il est fait ici : la chrome française
   * est incohérente avec elle-même — « Gadget » dans le menu d'édition de page et son
   * dialogue (4 chaînes), « widget » dans les préférences générales et les aides (une
   * trentaine). On garde **« gadget »** : c'est le mot que le pilote a sous les yeux au
   * moment précis où il en pose un sur une page, donc au moment où cet éditeur lui parle.
   *
   * ⚠️ Ce qui reste non vérifié, et qui ne change pas la décision : les relevés donnent
   * clé → chaîne, pas clé → écran. Que cette clé-là soit bien le titre affiché sur l'AIR³
   * est cohérent avec l'observation directe, mais le lien code ↔ écran demanderait le
   * `classes.dex`.
   */
  'common.widgetCount': {
    one: '{count} gadget',
    other: '{count} gadgets'
  }
} as const

export default common

export type FrenchCommon = typeof common
