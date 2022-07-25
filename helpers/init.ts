import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import dotenv from 'dotenv'
import { google } from 'googleapis'
import log4js from 'log4js'
import automate from './automate'

/**
 * Initialize the two clients needed for automation: google and supabase.
 * Then call start the automation.
 */
export default function init() {
  dotenv.config()

  const byDay = format(new Date(), 'MM-dd-yy')
  const byMinute = format(new Date(), 'HH:mm')
  log4js.configure({
    appenders: {
      default: { type: 'file', filename: `logs/${byDay}/${byMinute}.log` },
    },
    categories: { default: { appenders: ['default'], level: 'trace' } },
  })
  const log = log4js.getLogger()
  log.trace('Initializing oauth and supabase')

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage',
  )

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
  )

  automate(oAuth2Client, supabase)
  setInterval(() => automate(oAuth2Client, supabase), 1000 * 60 * 15)
}
