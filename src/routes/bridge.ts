import { Router } from 'express'
import {
  handleBridgeTransaction,
  handleTokenApproval,
} from '../handlers/bridge'

const getRoutes = (router: Router) => {
  router.post('/', handleBridgeTransaction)
  router.post('/approve/token', handleTokenApproval)

  return router
}

export default getRoutes
