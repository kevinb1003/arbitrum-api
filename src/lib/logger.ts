import { createLogger, format, transports } from 'winston'
import { LOG_LEVEL } from '../constants'

export default (namespace: string) =>
  createLogger({
    level: LOG_LEVEL,
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
    defaultMeta: { component: namespace },
  })
