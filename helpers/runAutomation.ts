import { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import log4js from 'log4js'
import { v4 as uuid } from 'uuid'
import CourseOnTermAutomation, {
  RepetitionType,
} from '../types/CourseOnTermAutomation'
import { TaskType } from '../types/Flow'
import bodyFromType from '../utils/bodyFromType'

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

  console.log('hi')

  // initialize the drive object for api calls
  const drive = google.drive({ version: 'v3', auth: oAuth2Client })
  // get the user's files in class folder that have not been automated yet
  drive.files.list(
    {
      pageSize: 1000,
      fields: 'files(id, name, appProperties)',
      q: `'${courseOnTermAutomation.FolderID}' in parents and not appProperties has { key='flowed' and value='yes' }
      `,
    },
    async (err, res) => {
      if (err && !disableLogs) return log.error(err.message)

      const files = res?.data.files
      console.log(files)
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
            Body: bodyFromType(courseOnTermAutomation.DefaultType),
            Visibility: courseOnTermAutomation.DefaultVisibility,
            FK_CourseOnTermID: courseOnTermAutomation.FK_CourseOnTermID,
            WasAutomated: true,
            ForeignLink: file.webContentLink,
          },
        ])
        const fcStackId = uuid()
        const fcStackCreate = await supabase.from('FlashcardStack').insert([
          {
            FlashcardStackID: fcStackId,
            Title: file.name,
          },
        ])
        const repId = uuid()
        const repCreate = await supabase.from('Repetition').insert([
          {
            RepetitionID: repId,
            RepetitionType: courseOnTermAutomation.DefaultRepetitionType,
            FK_FlowID: id,
            FK_FlashcardStackID: fcStackId,
          },
        ])
        const now = new Date().toISOString()
        const flashcards = [1, 2, 3, 4, 5].map((i) => ({
          FlashcardID: uuid(),
          CreatedTime: now,
          FK_FlashcardStackID: fcStackId,
          Position: i,
          Front: '',
          Back: '',
        }))
        const flashcardCreate = await supabase
          .from('Flashcard')
          .insert(flashcards)

        const fourTen = [
          {
            TaskID: uuid(),
            Title: 'Fill out flashcards',
            Completed: false,
            Description: '',
            DueDate: now,
            Type: TaskType.WORK_ON,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(1/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(2/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(3/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 6 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(4/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
        ]

        const fourThirty = [
          {
            TaskID: uuid(),
            Title: 'Fill out flashcards',
            Completed: false,
            Description: '',
            DueDate: now,
            Type: TaskType.WORK_ON,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(1/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(2/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(3/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(4/4) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
        ]

        const sixThirty = [
          {
            TaskID: uuid(),
            Title: 'Fill out flashcards',
            Completed: false,
            Description: '',
            DueDate: now,
            Type: TaskType.WORK_ON,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(1/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(2/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(3/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(4/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(5/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 22 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
          {
            TaskID: uuid(),
            Title: `(6/6) Review ${file.name}`,
            Completed: false,
            Description: '',
            DueDate: new Date(
              new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            Type: TaskType.REVIEW,
            FK_RepetitionID: repId,
          },
        ]

        if (
          courseOnTermAutomation.DefaultRepetitionType ===
          RepetitionType.FOURTEN
        ) {
          await supabase.from('Task').insert(fourTen)
        }
        if (
          courseOnTermAutomation.DefaultRepetitionType ===
          RepetitionType.FOURTHIRTY
        ) {
          await supabase.from('Task').insert(fourThirty)
        }
        if (
          courseOnTermAutomation.DefaultRepetitionType ===
          RepetitionType.SIXTHIRTY
        ) {
          await supabase.from('Task').insert(sixThirty)
        }

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
