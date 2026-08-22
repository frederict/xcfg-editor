import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Wiederholen',
  'action.redoNothing': 'Nichts zu wiederholen',
  'action.redoNamed': 'Wiederholen: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Leere Seite',
  'pageKind.freeNote': 'Auf dem Gerät leer angelegt, bereit für Ihre eigenen Widgets.',
  'pageKind.competition': 'Wettkampfseite',
  'pageKind.competitionNote': 'Mit dem Wettkampf-Widgetsatz des Geräts angelegt.',
  'pageKind.thermalAssistant': 'Seite mit Thermikassistent',
  'pageKind.thermalAssistantNote': 'Mit dem Widgetsatz des Thermikassistenten angelegt. Auf ' +
    'diese Seitenklasse schaltet das Gerät beim Kurbeln von selbst um.',
  'pageKind.xcAssistant': 'Seite mit XC-Assistent',
  'pageKind.xcAssistantNote': 'Mit dem Widgetsatz für FAI-Dreieck und Routen angelegt.',
  'pageKind.unknown': 'Unbekannter Seitentyp',
  'pageKind.unknownNote': 'Dieser Editor kennt diesen Seitentyp nicht; sein Inhalt wird ' +
    'trotzdem unverändert angezeigt.',

  'pageKind.missing': '(kein Typ)',

  'view.landscape': 'Querformat',
  'view.portrait': 'Hochformat',

  'view.pageCard': 'Seite {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} Seite',
    other: '{count} Seiten'
  },

  'view.noPage': 'keine Seite',
  'view.emptyOrientation': 'Diese Datei beschreibt in dieser Ausrichtung keine Seite.',

  'view.remarkCount': {
    one: '{count} Anmerkung zu dieser Datei',
    other: '{count} Anmerkungen zu dieser Datei'
  },

  'view.backToOverview': '← Alle Seiten',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Vorige Seite',
  'view.nextPage': 'Nächste Seite',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Mit dem Zeiger über ein Widget fahren, um Name und Maße zu sehen.',
  'view.hoverHintSelectable': 'Mit dem Zeiger über ein Widget fahren, um Name und Maße zu ' +
    'sehen; anklicken, um seine Einstellungen zu lesen.',

  'view.selectedPin': 'ausgewählt',

  'view.widgetSpoken': '{name}, {width} auf {height} Millimeter',

  'view.scaleAdvice': 'Die Seite wird in der Größe gezeichnet, die sie auf dem Gerät hat. Ihr ' +
    'Bildschirm hat nicht zwangsläufig die Pixeldichte, die der Browser annimmt: Stellen Sie ' +
    'den Zoom so ein, dass ein echtes Lineal auf dem Bildschirm mit der Skala übereinstimmt.',

  'editor.moveNamed': '{name} verschieben',
  'editor.resizeNamed': 'Größe von {name} ändern',
  'editor.deleteNamed': '{name} löschen',
  'editor.duplicateNamed': '{name} duplizieren',
  'editor.raiseNamed': '{name} eine Ebene nach vorn holen',
  'editor.lowerNamed': '{name} eine Ebene nach hinten schieben',
  'editor.frontNamed': '{name} ganz nach vorn holen',
  'editor.backNamed': '{name} ganz nach hinten schieben',

  'editor.onlyWidget': 'Einziges Widget der Seite',
  'editor.rank': 'Ebene {index} von {total}',
  'editor.rankFront': 'Ebene {index} von {total}, vorderste',
  'editor.rankBack': 'Ebene {index} von {total}, hinterste',

  'editor.layerLabel': 'Seite bearbeiten: Pfeiltasten zum Verschieben, Umschalt + ' +
    'Pfeiltasten zum Ändern der Größe, Strg + Pfeil auf/ab zum Wechseln der Ebene, ' +
    'Strg + D zum Duplizieren, Entf zum Löschen',
  'editor.toolbarLabel': 'Aktionen für das ausgewählte Widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Ganz nach hinten schieben',
  'editor.sendToBackKeys': 'Strg + Umschalt + Pfeil ab',
  'editor.lowerOne': 'Eine Ebene nach hinten',
  'editor.lowerOneKeys': 'Strg + Pfeil ab',
  'editor.raiseOne': 'Eine Ebene nach vorn',
  'editor.raiseOneKeys': 'Strg + Pfeil auf',
  'editor.bringToFront': 'Ganz nach vorn holen',
  'editor.bringToFrontKeys': 'Strg + Umschalt + Pfeil auf',
  'editor.duplicate': 'Duplizieren',
  'editor.duplicateWidget': 'Widget duplizieren',
  'editor.duplicateKeys': 'Strg + D',
  'editor.delete': 'Löschen',
  'editor.deleteWidget': 'Widget löschen',
  'editor.deleteKeys': 'Entf',

  'editor.noSelection': 'Kein Widget ausgewählt.',
  'editor.selected': '{name} ausgewählt, {size}.',

  'editor.emptyPage': 'Leere Seite',
  'editor.pageTally': {
    one: '{count} Widget auf der Seite',
    other: '{count} Widgets auf der Seite'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, nichts zu ändern.'
}

export default app
