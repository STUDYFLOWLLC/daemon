import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import dotenv from 'dotenv'
import { google } from 'googleapis'
import log4js from 'log4js'
import automate from './automate'
import updateAlgolia from './updateAlgolia'

/**
 * Initialize the two clients needed for automation: google and supabase.
 * Then call start the automation.
 */
export default function init(disableLogs?: boolean) {
  dotenv.config()

  if (!disableLogs) {
    const byDay = format(new Date(), 'MM-dd-yy')
    const byMinute = format(new Date(), 'HH:mm')
    log4js.configure({
      appenders: {
        out: { type: 'stdout' },
        everything: {
          type: 'dateFile',
          filename: `logs/${byDay}/${byMinute}.log`,
          pattern: 'old/yyyy-MM/yyyy-MM-dd-hhmmss0000', // added seconds so can roll fast without waiting
          keepFileExt: true,
          numBackups: 5, // total 6 files (1 hot + 5 backups)
        },
      },
      categories: {
        default: { appenders: ['out', 'everything'], level: 'debug' },
      },
    })
    const log = log4js.getLogger()
    log.trace('Initializing oauth and supabase')
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage',
  )

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
  )

  automate(oAuth2Client, supabase, disableLogs)
  updateAlgolia()
  setInterval(() => {
    automate(oAuth2Client, supabase, disableLogs)
    updateAlgolia()
  }, 1000 * 60 * 15)
}
