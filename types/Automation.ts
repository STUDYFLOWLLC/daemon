import CourseOnTermAutomation from './CourseOnTermAutomation'

export default interface Automation {
  AutomationID: number
  RefreshToken: string
  CourseOnTermAutomations: CourseOnTermAutomation[]
  FK_UserID: number
}
