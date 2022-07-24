import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import dotenv from "dotenv"
import { google } from "googleapis"
import Automation from "types/Automation"
import CourseOnTermAutomation from "types/CourseOnTermAutomation"
import { v4 as uuid } from "uuid"
import createDefaultBody from "./utils/createDefaultBody"

const byDay = format(new Date(), "MM-dd-yy")
const byMinute = format(new Date(), "HH:mm")
var log4js = require("log4js")
log4js.configure({
  appenders: {
    default: { type: "file", filename: `logs/${byDay}/${byMinute}.log` },
  },
  categories: { default: { appenders: ["default"], level: "trace" } },
})

dotenv.config()

/**
 * Initialize the two clients needed for automation: google and supabase.
 * Then call start the automation.
 */
function init() {
  const log = log4js.getLogger()
  log.trace("Initializing oauth and supabase")

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "postmessage"
  )

  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_KEY || ""
  )

  automate(oAuth2Client, supabase)
  setInterval(() => automate(oAuth2Client, supabase), 1000 * 60 * 15)
}

/**
 * Get each automation (one associated with each user). Then for each user, set their
 * refresh token for google api access. Then get each of their course on term automations,
 * and run the automation
 * @param oAuth2Client google auth client
 * @param supabase supabase api client
 * @returns nothing. return early if there are no automations to run
 */
async function automate(oAuth2Client: any, supabase: SupabaseClient) {
  // configure logger for organization
  const byDay = format(new Date(), "MM-dd-yy")
  const byMinute = format(new Date(), "HH:mm")
  var log4js = require("log4js")
  log4js.configure({
    appenders: {
      default: { type: "file", filename: `logs/${byDay}/${byMinute}.log` },
    },
    categories: { default: { appenders: ["default"], level: "trace" } },
  })
  const log = log4js.getLogger()
  log.trace("Running general automation")

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

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} folderID The ID of the folder to list.
 */
function runAutomation(
  oAuth2Client: any,
  supabase: SupabaseClient,
  courseOnTermAutomation: CourseOnTermAutomation
) {
  const log = log4js.getLogger()

  // initialize the drive object for api calls
  const drive = google.drive({ version: "v3", auth: oAuth2Client })
  // get the user's files in class folder that have not been automated yet
  drive.files.list(
    {
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, appProperties)",
      q: `'${courseOnTermAutomation.FolderID}' in parents and not appProperties has { key='flowed' and value='yes' }
      `,
    },
    async (err, res) => {
      if (err) return log.error(err.message)

      const files = res?.data.files
      log.trace(
        "Fetched " +
          files?.length +
          " unautomated files for CourseOnTermAutomation " +
          courseOnTermAutomation.CourseOnTermAutomationID
      )
      if (!files) return

      for (const file of files) {
        log.trace("Automating file " + file.id)
        file.appProperties = {
          ...file.appProperties,
          flowed: "yes",
        }
        // @ts-expect-error this works, fix later
        drive.files.update({
          fileId: file.id,
          resource: { appProperties: file.appProperties },
        })
        log.trace("Successfully updated file properties for file " + file.id)

        // create log
        log.trace(
          "Creating AutomationLog for CourseOnTermAutomation " +
            courseOnTermAutomation.CourseOnTermAutomationID
        )
        const logCreate = await supabase.from("AutomationLog").insert([
          {
            Success: true,
            Message: file.name,
            FileID: file.id,
            FK_CourseOnTermAutomationID:
              courseOnTermAutomation.CourseOnTermAutomationID,
          },
        ])
        if (logCreate.data) log.trace("Successfully created log.")
        if (logCreate.error)
          log.trace("Could not create log. Message: " + logCreate.error.message)

        // create flow
        const id = uuid()
        log.trace("Creating flow " + id)
        const flowCreate = await supabase.from("Flow").insert([
          {
            FlowID: id,
            Type: courseOnTermAutomation.DefaultType,
            Title: file.name,
            Body: createDefaultBody(),
            Visibility: courseOnTermAutomation.DefaultVisibility,
            FK_CourseOnTermID: courseOnTermAutomation.FK_CourseOnTermID,
            WasAutomated: true,
          },
        ])
        if (flowCreate.data) log.trace("Successfully created flow " + id)
        if (flowCreate.error)
          log.error(
            "Could not create flow " +
              id +
              ". Message: " +
              flowCreate.error.message
          )
      }
    }
  )
}

init()
