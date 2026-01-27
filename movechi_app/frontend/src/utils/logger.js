/**
 * Logger utility - debug only in development
 * Production: only warns and errors
 */

const isDev = import.meta.env.DEV

export const logger = {
  debug: (...args) => {
    if (isDev) console.debug('[DEBUG]', ...args)
  },
  
  info: (...args) => {
    if (isDev) console.info('[INFO]', ...args)
  },
  
  warn: (message, error = null) => {
    console.warn(`[WARN] ${message}`, error || '')
  },
  
  error: (message, error = null) => {
    console.error(`[ERROR] ${message}`, error || '')
  }
}

export default logger
