import type { DomainCatalog } from '../../domains'

const common: DomainCatalog<'common'> = {
  'provenance.apkSurvey': 'nuestro muestreo de las versiones de XCTrack',
  'provenance.factoryValueCatalogue': 'el catálogo de los valores de fábrica',
  'provenance.measuredOnDevice': 'medido en el dispositivo',
  'provenance.declaredByFile': 'Lo que declara el archivo',
  'provenance.assumedByEditor': 'Lo que supone este editor',

  'common.unknownDate': 'fecha desconocida',

  'factoryValue.same': 'VALOR DE FÁBRICA',
  'factoryValue.setByYou': 'AJUSTADO POR USTED',
  'factoryValue.uncertain': 'VALOR DE FÁBRICA INCIERTO',
  'factoryValue.neverSet': 'NUNCA AJUSTADO',

  /** Mesuré : la chrome espagnole dit « Widget » — jamais *componente*. Voir `fr/common.ts`. */
  'common.widgetCount': {
    one: '{count} widget',
    other: '{count} widgets'
  }
}

export default common
