import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Rehacer',
  'action.redoNothing': 'Nada que rehacer',
  'action.redoNamed': 'Rehacer: {what}',

  'zoom.resetTo': 'Zoom {level}'
}

export default app
