import { createClient } from '@supabase/supabase-js'
import algoliasearch from 'algoliasearch'
import dotenv from 'dotenv'

export default async function updateAlgolia() {
  dotenv.config()

  const client = algoliasearch('COXN4EEW7D', '948488afa5d14dd4734556836db7676a')
  const index = client.initIndex('students')

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
    await index
      .saveObjects(realData, {
        autoGenerateObjectIDIfNotExist: true,
      })
      .wait()
  }
}
