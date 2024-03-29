import AutomationLog from 'types/AutomationLog'

enum FlowType {
  LECTURE = 'LECTURE',
  DISCUSSION = 'DISCUSSION',
  NOTE = 'NOTE',
  ASSIGNMENT = 'ASSIGNMENT',
  ASSESSMENT = 'ASSESSMENT',
  SYNTHESIS = 'SYNTHESIS',
}

enum FlowVisibility {
  HIDDEN = 'HIDDEN',
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum RepetitionType {
  FOURTEN = 'FOURTEN',
  FOURTHIRTY = 'FOURTHIRTY',
  SIXTHIRTY = 'SIXTHIRTY',
}

export default interface CourseOnTermAutomation {
  CourseOnTermAutomationID: number
  FolderID: string
  AutomationLog: AutomationLog[]
  DefaultType: FlowType
  DefaultVisibility: FlowVisibility
  DefaultRepetitionType: RepetitionType
  FK_AutomationID: number
  FK_CourseOnTermID: number
}
