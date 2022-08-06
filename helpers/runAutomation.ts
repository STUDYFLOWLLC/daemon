import { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import log4js from 'log4js'
import CourseOnTermAutomation from 'types/CourseOnTermAutomation'
import { v4 as uuid } from 'uuid'
import createDefaultBody from '../utils/createDefaultBody'

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} folderID The ID of the folder to list.
 */
export default function runAutomation(
  oAuth2Client: any,
  supabase: SupabaseClient,
  courseOnTermAutomation: CourseOnTermAutomation,
  disableLogs?: boolean,
) {
  const log = log4js.getLogger()

  // initialize the drive object for api calls
  const drive = google.drive({ version: 'v3', auth: oAuth2Client })
  // get the user's files in class folder that have not been automated yet
  drive.files.list(
    {
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, appProperties)',
      q: `'${courseOnTermAutomation.FolderID}' in parents and not appProperties has { key='flowed' and value='yes' }
      `,
    },
    async (err, res) => {
      if (err && !disableLogs) return log.error(err.message)

      const files = res?.data.files
      !disableLogs &&
        log.trace(
          'Fetched ' +
            files?.length +
            ' unautomated files for CourseOnTermAutomation ' +
            courseOnTermAutomation.CourseOnTermAutomationID,
        )
      if (!files) return

      for (const file of files) {
        !disableLogs && log.trace('Automating file ' + file.id)
        file.appProperties = {
          ...file.appProperties,
          flowed: 'yes',
        }
        // @ts-expect-error this works, fix later
        drive.files.update({
          fileId: file.id,
          resource: { appProperties: file.appProperties },
        })
        !disableLogs &&
          log.trace('Successfully updated file properties for file ' + file.id)

        // create log
        !disableLogs &&
          log.trace(
            'Creating AutomationLog for CourseOnTermAutomation ' +
              courseOnTermAutomation.CourseOnTermAutomationID,
          )
        const logCreate = await supabase.from('AutomationLog').insert([
          {
            Success: true,
            Message: file.name,
            FileID: file.id,
            FK_CourseOnTermAutomationID:
              courseOnTermAutomation.CourseOnTermAutomationID,
          },
        ])
        if (logCreate.data && !disableLogs)
          log.trace('Successfully created log.')
        if (logCreate.error && !disableLogs)
          log.trace('Could not create log. Message: ' + logCreate.error.message)

        // create flow
        const id = uuid()
        !disableLogs && log.trace('Creating flow ' + id)
        const flowCreate = await supabase.from('Flow').insert([
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
        if (flowCreate.data && !disableLogs)
          log.trace('Successfully created flow ' + id)
        if (flowCreate.error && !disableLogs)
          log.error(
            'Could not create flow ' +
              id +
              '. Message: ' +
              flowCreate.error.message,
          )
      }
    },
  )
}
