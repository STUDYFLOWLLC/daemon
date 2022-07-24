export default interface AutomationLog {
  AutomationLogID: number
  Success: boolean
  Message: string
  FileID: string
  FK_CourseOnTermAutomationID: number
}
