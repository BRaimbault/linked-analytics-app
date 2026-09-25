import log from 'loglevel'
import { getLogLevel } from './debug-mode'

/* A named logger with an unpersisted level: all DHIS2 apps share one origin,
 * so the root logger and its localStorage key would leak into other apps. */
export const logger = log.getLogger('linked-analytics')
logger.setLevel(getLogLevel(), false)
