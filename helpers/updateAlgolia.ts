import { createClient } from '@supabase/supabase-js'
import algoliasearch from 'algoliasearch'
import dotenv from 'dotenv'

export default async function updateAlgolia() {
  dotenv.config()

  const client = algoliasearch('COXN4EEW7D', '948488afa5d14dd4734556836db7676a')
  const studentIndex = client.initIndex('students')
  const flowIndex = client.initIndex('flows')

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
  )

  const student = await supabase
    .from('User')
    .select('ProfilePictureLink,Username,CreatedTime,UserID,Name,FK_SchoolID')

  if (student.data) {
    const realData = await Promise.all(
      student.data.map(async (item) => {
        const school = await supabase
          .from('School')
          .select('Name')
          .eq('SchoolID', item.FK_SchoolID)

        if (school.data)
          return {
            ...item,
            objectID: item.UserID,
            school: school.data[0].Name,
          }
        return { ...item, objectID: item.UserID, school: '' }
      }),
    )
    await studentIndex
      .saveObjects(realData, {
        autoGenerateObjectIDIfNotExist: true,
      })
      .wait()
  }

  const flow = await supabase
    .from('Flow')
    .select(
      'Title,CreatedTime,FlowID,Visibility,Type,UserEnteredDate,WasAutomated',
    )
    .is('DeletedTime', null)
    .eq('Visibility', 'PUBLIC')

  if (flow.data) {
    await flowIndex
      .saveObjects(
        flow.data.map((flow) => ({
          ...flow,
          objectID: flow.FlowID,
        })),
        {
          autoGenerateObjectIDIfNotExist: true,
        },
      )
      .wait()
  }
}
