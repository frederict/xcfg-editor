import type { DomainCatalog } from '../../domains'

const common: DomainCatalog<'common'> = {
  'provenance.apkSurvey': 'our survey of XCTrack releases',
  'provenance.factoryValueCatalogue': 'the catalogue of factory values',
  'provenance.measuredOnDevice': 'measured on the device',
  'provenance.declaredByFile': 'What the file declares',
  'provenance.assumedByEditor': 'What this editor assumes',

  'common.unknownDate': 'date unknown',

  'factoryValue.same': 'FACTORY VALUE',
  'factoryValue.setByYou': 'SET BY YOU',
  'factoryValue.uncertain': 'FACTORY VALUE UNCERTAIN',
  'factoryValue.neverSet': 'NEVER SET',

  /** Mesuré : la chrome anglaise de XCTrack dit « Widget ». Voir `fr/common.ts`. */
  'common.widgetCount': {
    one: '{count} widget',
    other: '{count} widgets'
  }
}

export default common
