export interface Flow {
  Title: string
  CreatedTime: string
  FlowID: string
  Visibility: string
  Type: string
  UserEnteredDate: string
  WasAutomated: boolean
}

export enum TaskType {
  WORK_ON = 'WORK_ON',
  DUE = 'DUE',
  REVIEW = 'REVIEW',
}

export enum FlowType {
  LECTURE = 'LECTURE',
  DISCUSSION = 'DISCUSSION',
  NOTE = 'NOTE',
  ASSIGNMENT = 'ASSIGNMENT',
  ASSESSMENT = 'ASSESSMENT',
  SYNTHESIS = 'SYNTHESIS',
}
