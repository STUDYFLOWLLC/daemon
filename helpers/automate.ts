import { SupabaseClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import log4js from "log4js"
import Automation from "types/Automation"
import CourseOnTermAutomation from "types/CourseOnTermAutomation"
import runAutomation from "./runAutomation"

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
  supabase: SupabaseClient
) {
  // configure logger for organization
  const byDay = format(new Date(), "MM-dd-yy")
  const byMinute = format(new Date(), "HH:mm")
  log4js.configure({
    appenders: {
      default: { type: "file", filename: `logs/${byDay}/${byMinute}.log` },
    },
    categories: { default: { appenders: ["default"], level: "trace" } },
  })
  const log = log4js.getLogger()
  log.trace("Running general automation")

  // make main automation log for timer
  const mainAutomation = await supabase
    .from("AutomationLog")
    .insert([{ Success: true, Message: "{/MainAutomation/}" }])
  if (mainAutomation.data) log.trace("Main AutomationLog created")
  if (mainAutomation.error)
    log.error(
      "Failed to create main AutomationLog. Error message: " +
        mainAutomation.error.message
    )

  const fetchAutomations = await supabase.from("Automation").select("*")
  const automations = fetchAutomations.data as Automation[]
  if (!automations) return

  for (const automation of automations) {
    log.trace(`Running automation with AutomationID ${automation.AutomationID}`)

    // set refresh token for api access
    oAuth2Client.setCredentials({
      refresh_token: automation.RefreshToken,
    })

    // fetch all of the user's automations for each course
    const fetchCourseOnTermAutomations = await supabase
      .from("CourseOnTermAutomation")
      .select("*")
      .eq("FK_AutomationID", automation.AutomationID)
    const courseOnTermAutomations =
      fetchCourseOnTermAutomations.data as CourseOnTermAutomation[]
    if (!courseOnTermAutomations) continue

    // run each of the user's automations
    for (const courseOnTermAutomation of courseOnTermAutomations) {
      runAutomation(oAuth2Client, supabase, courseOnTermAutomation)
    }
  }
}
