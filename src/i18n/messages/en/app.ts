import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Redo',
  'action.redoNothing': 'Nothing to redo',
  'action.redoNamed': 'Redo: {what}',

  'zoom.resetTo': 'Zoom {level}'
}

export default app
