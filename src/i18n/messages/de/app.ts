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
    'den Zoom so ein, dass ein echtes Lineal auf dem Bildschirm mit der Skala übereinstimmt.'
}

export default app
