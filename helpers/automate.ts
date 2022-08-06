import { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import log4js from 'log4js'
import Automation from 'types/Automation'
import CourseOnTermAutomation from 'types/CourseOnTermAutomation'
import runAutomation from './runAutomation'

/**
 * Get each automation (one associated with each user). Then for each user, set their
 * refresh token for google api access. Then get each of their course on term automations,
 * and run the automation
 * @param oAuth2Client google auth client
 * @param supabase supabase api client
 * @returns nothing. return early if there are no automations to run
 */
export default async function automate(
  oAuth2Client: any,
  supabase: SupabaseClient,
  disableLogs?: boolean,
) {
  const log = log4js.getLogger()
  if (!disableLogs) {
    // configure logger for organization
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
    log.trace('Running general automation')
  }

  // make main automation log for timer
  const mainAutomation = await supabase
    .from('AutomationLog')
    .insert([{ Success: true, Message: '{/MainAutomation/}' }])
  if (!disableLogs) {
    if (mainAutomation.data) log.trace('Main AutomationLog created')
    if (mainAutomation.error)
      log.error(
        'Failed to create main AutomationLog. Error message: ' +
          mainAutomation.error.message,
      )
  }

  const fetchAutomations = await supabase.from('Automation').select('*')
  const automations = fetchAutomations.data as Automation[]
  if (!automations) return

  for (const automation of automations) {
    !disableLogs &&
      log.trace(
        `Running automation with AutomationID ${automation.AutomationID}`,
      )

    // set refresh token for api access
    oAuth2Client.setCredentials({
      refresh_token: automation.RefreshToken,
    })

    // fetch all of the user's automations for each course
    const fetchCourseOnTermAutomations = await supabase
      .from('CourseOnTermAutomation')
      .select('*')
      .eq('FK_AutomationID', automation.AutomationID)
    const courseOnTermAutomations =
      fetchCourseOnTermAutomations.data as CourseOnTermAutomation[]
    if (!courseOnTermAutomations) continue

    // run each of the user's automations
    for (const courseOnTermAutomation of courseOnTermAutomations) {
      runAutomation(oAuth2Client, supabase, courseOnTermAutomation, disableLogs)
    }
  }
}
