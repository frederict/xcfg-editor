import type { DomainCatalog } from '../../domains'

const common: DomainCatalog<'common'> = {
  'provenance.apkSurvey': 'unsere Erhebung der XCTrack-Versionen',
  'provenance.factoryValueCatalogue': 'der Katalog der Werkswerte',
  'provenance.measuredOnDevice': 'am Gerät gemessen',
  'provenance.declaredByFile': 'Was die Datei angibt',
  'provenance.assumedByEditor': 'Was dieser Editor annimmt',

  'common.unknownDate': 'Datum unbekannt',

  'factoryValue.same': 'WERKSWERT',
  'factoryValue.setByYou': 'VON IHNEN GESETZT',
  'factoryValue.uncertain': 'WERKSWERT UNSICHER',
  'factoryValue.neverSet': 'NIE GESETZT',

  /**
   * Mesuré : la chrome allemande dit « Widget » — jamais *Instrument*, *Element* ni
   * *Kachel*, tous cherchés et absents des 55 relevés. Substantif, donc capitale, y
   * compris au milieu d'une phrase. Voir `fr/common.ts`.
   */
  'common.widgetCount': {
    one: '{count} Widget',
    other: '{count} Widgets'
  }
}

export default common
