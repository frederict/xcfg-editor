import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Wiederholen',
  'action.redoNothing': 'Nichts zu wiederholen',
  'action.redoNamed': 'Wiederholen: {what}',

  'zoom.resetTo': 'Zoom {level}'
}

export default app
