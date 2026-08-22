import type { DomainCatalog } from '../../domains'

/**
 * Die fünf `pages.describe*` werden zweimal gelesen: einmal im Seitenkarussell, einmal —
 * ohne Zusammenhang — als Beschriftung der Schaltfläche „Rückgängig“. Sie stehen daher im
 * Infinitiv am Satzende, wie eine benannte Handlung: „Rückgängig: Seite 3 löschen
 * (Querformat)“ liest sich in einem Zug.
 */
const pages: DomainCatalog<'pages'> = {
  /* ==================================================== `deviceSelector.ts` */

  'device.screenSize': '{width} × {height}',

  'device.templateLabel': 'Bildschirmvorlage',

  'device.commonRatiosGroup': 'Gängige Seitenverhältnisse',
  'device.customGroup': 'Meine Geräte',

  'device.addDevice': 'Gerät hinzufügen…',

  'device.widthPx': 'Breite (px)',
  'device.heightPx': 'Höhe (px)',
  'device.diagonalInches': 'Diagonale (Zoll)',

  'device.note': '{diagonal} · {width} × {height} px — die Geometrie hängt allein vom Seitenverhältnis ab, die wahrgenommene Größe allein von der Diagonale. Diese Wahl wird nie in die Datei geschrieben.',

  'device.namePlaceholder': 'Gerätename',
  'device.widthPlaceholder': 'Breite px',
  'device.widthLabel': 'Breite in Pixeln',
  'device.heightPlaceholder': 'Höhe px',
  'device.heightLabel': 'Höhe in Pixeln',
  /** Das deutsche Wort ist das französische. Siehe `IDENTICAL_ON_PURPOSE` im Test. */
  'device.diagonalPlaceholder': 'Diagonale ″',
  'device.diagonalLabel': 'Diagonale in Zoll',
  'device.add': 'Hinzufügen',
  'device.cancel': 'Abbrechen',

  'device.nameRequired': 'Geben Sie diesem Gerät einen Namen.',
  'device.sizeMustBePositive': 'Breite und Höhe müssen positive Pixelzahlen sein.',
  'device.diagonalMustBePositive': 'Die Diagonale muss eine positive Zahl in Zoll sein.',

  /* ==================================================== Ausrichtungen */

  'pages.landscape': 'Querformat',
  'pages.portrait': 'Hochformat',
  'pages.landscapeInline': 'Querformat',
  'pages.portraitInline': 'Hochformat',

  /* ==================================================== Verlaufsschritte */

  'pages.describeInsert': 'Seite „{type}“ an Position {rank} einfügen ({orientation})',
  'pages.describeDuplicate': 'Seite {rank} auf Position {target} duplizieren ({orientation})',
  'pages.describeRemove': 'Seite {rank} löschen ({orientation})',
  'pages.describeReorder': 'Seite {rank} auf Position {target} verschieben ({orientation})',
  'pages.describeSetClass': 'Typ von Seite {rank} ändern: „{before}“ → „{after}“ ({orientation})',
  'pages.describeEnableNavigations': 'Seite {rank} für alle Navigationen aktivieren ({orientation})',

  'pages.enableAllNavigations': 'Für alle Navigationen aktivieren',
  'pages.enableAllNavigationsFor': 'Seite {rank} für alle Navigationen aktivieren',

  'pages.announcementWithAdvice': '{done}. {advice}',

  'pages.undoRestores': '„Rückgängig“ nimmt diesen Schritt zurück, solange dieser Tab geöffnet bleibt: hier, oder in der Kopfleiste, sobald dieses Fenster geschlossen ist.',

  'pages.undoNow': 'Diesen Schritt rückgängig machen',

  'pages.undone': 'Rückgängig gemacht: {what}. Das Karussell zeigt wieder, was es vor diesem Schritt zeigte.',

  'pages.removalTally': {
    one: '{count} Widget verschwindet mit ihr.',
    other: '{count} Widgets verschwinden mit ihr.'
  },

  'pages.rankRange': '{first} bis {last}',

  /* ==================================================== Folgen einer Handlung */

  'pages.rankIsIdentity': 'Die Position ist die einzige Identität einer Seite: Sie ist es, ' +
    'die Sie im Flug durchblättern.',

  'pages.rankShift': {
    one: 'Aus Seite {from} wird Seite {to}. {identity}',
    other: 'Aus den Seiten {from} werden die Seiten {to}. {identity}'
  },

  'pages.rankShiftReorder': 'Die Seiten {range} wechseln die Position. {identity}',

  'pages.thermalAlreadyPresent': {
    one: 'Diese Datei beschreibt bereits eine Thermikassistent-Seite (Seite {ranks}). XCTrack zielt nur auf eine davon, wenn es von selbst in die Spirale umschaltet; dieser Editor nimmt die LETZTE an, ohne es auf dem Gerät geprüft zu haben. Wenn es tatsächlich diese ist, nimmt eine weitere danach der Seite {last} dieses Umschalten, ohne an ihrem Inhalt etwas zu ändern.',
    other: 'Diese Datei beschreibt bereits Thermikassistent-Seiten (Seiten {ranks}). XCTrack zielt nur auf eine davon, wenn es von selbst in die Spirale umschaltet; dieser Editor nimmt die LETZTE an, ohne es auf dem Gerät geprüft zu haben. Wenn es tatsächlich diese ist, nimmt eine weitere danach der Seite {last} dieses Umschalten, ohne an ihrem Inhalt etwas zu ändern.'
  },

  'pages.lastPageOfOrientation': 'Das ist die letzte Seite dieser Ausrichtung: Die Datei ' +
    'würde gar keine mehr beschreiben.',

  'pages.noNavigablePageLeft': 'Es blieben nur Seiten übrig, die für keine Navigation ' +
    'aktiviert sind: Welche Navigation auch gewählt wird, das Gerät hätte in dieser ' +
    'Ausrichtung keine Seite mehr zu zeigen.',

  'pages.onlyThermalPage': 'Das ist die einzige Thermikassistent-Seite: Das automatische ' +
    'Umschalten in die Spirale hätte kein Ziel mehr.',

  'pages.autoSwitchWouldTarget': 'Das automatische Umschalten in die Spirale würde dann auf Seite {rank} zielen, sofern es tatsächlich auf die letzte zielt — dieser Editor nimmt es an, ohne es geprüft zu haben.',

  'pages.classChangeUnverified': 'XCTrack erlaubt nicht, den Typ einer Seite nach ihrer ' +
    'Erstellung zu ändern: Er wird im Moment der Auswahl festgelegt. Es ist dennoch nur ' +
    'eine Zeile der Datei, und dieser Editor schreibt sie bereitwillig — aber wie sich ' +
    'das Gerät bei einer so geänderten Seite verhält, wurde NICHT geprüft, und die ' +
    'Widgets der Seite werden nicht durch die des neuen Typs ersetzt.',

  'pages.thermalMultiple': {
    one: '{total} Thermikassistent-Seiten (Seiten {ranks}). XCTrack zielt nur auf eine davon, wenn es von selbst in die Spirale umschaltet; dieser Editor nimmt die letzte an, Seite {target}, ohne es auf dem Gerät geprüft zu haben. Seite {others} bleibt ohnehin über „nächste Seite“ erreichbar.',
    other: '{total} Thermikassistent-Seiten (Seiten {ranks}). XCTrack zielt nur auf eine davon, wenn es von selbst in die Spirale umschaltet; dieser Editor nimmt die letzte an, Seite {target}, ohne es auf dem Gerät geprüft zu haben. Die Seiten {others} bleiben ohnehin über „nächste Seite“ erreichbar.'
  },

  'pages.allPagesWithoutNavigation': 'Alle Seiten dieser Ausrichtung sind für keine ' +
    'Navigation aktiviert: Welche Navigation auch gewählt wird, das Gerät hat hier keine ' +
    'Seite zu zeigen.',

  /* ==================================================== das Karussell */

  'pages.regionLabel': 'Seiten im {orientation}',
  'pages.noPage': 'keine Seite',
  'pages.pageCount': { one: '{count} Seite', other: '{count} Seiten' },

  'pages.emptyOrientation': 'Diese Ausrichtung beschreibt keine Seite. Eine neue Seite ' +
    'kommt leer: Ihre Widgets werden anschließend aus der Palette abgelegt oder durch ' +
    'Duplizieren einer vorhandenen Seite.',

  'pages.insertAtRank': 'Seite an Position {rank} einfügen',
  'pages.insertAtEnd': 'Seite an letzter Position einfügen ({rank})',
  'pages.newPageAtRank': 'Neue Seite an Position {rank}',

  'pages.openPage': 'Seite {rank} öffnen, {kind}, {tally}',

  'pages.autoSwitchTargetHere': 'Angenommenes Ziel des automatischen Umschaltens in die ' +
    'Spirale — nicht auf dem Gerät geprüft.',
  'pages.autoSwitchTargetElsewhere': 'Dieser Editor nimmt an, dass das automatische Umschalten auf Seite {rank} zielt, die letzte Thermikassistent-Seite — nicht auf dem Gerät geprüft.',

  'pages.moveBack': 'Seite {rank} eine Position zurück',
  'pages.moveForward': 'Seite {rank} eine Position vor',
  'pages.duplicate': 'Duplizieren',
  'pages.duplicatePage': 'Seite {rank} duplizieren',
  'pages.remove': 'Löschen',
  'pages.removePage': 'Seite {rank} löschen',

  'pages.pageTypeLabel': 'Seitentyp',

  'pages.typeFromFile': '{type} (in der Datei eingetragener Typ)',

  /* ==================================================== `navigations` */

  'pages.shownForAllNavigations': 'Für alle Navigationen angezeigt',
  'pages.shownForNoNavigation': 'Für keine Navigation angezeigt',
  'pages.shownForNavigations': 'Angezeigt für: {list}'

  /*
   * Die fünf Navigationen sind am 22.08.2026 hier ausgezogen — sie sind XCTracks eigene
   * Wörter, nicht unsere, und folgen der Achse `labels`. Siehe
   * `src/catalog/navigationLabels.json`.
   */
}

export default pages
