import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Opnieuw',
  'action.redoNothing': 'Niets om opnieuw te doen',
  'action.redoNamed': 'Opnieuw: {what}',

  'zoom.resetTo': 'Zoom {level}'
}

export default app
