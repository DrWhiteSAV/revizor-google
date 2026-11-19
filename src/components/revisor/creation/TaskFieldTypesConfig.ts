import { ReportFieldType } from '../../../types';
import { REPORT_FIELD_TYPES, FieldTypeOption, getFieldTypeMeta } from '../../raport/ReportFieldTypeConfig';

export type TaskFieldType = ReportFieldType;
export type TaskFieldTypeOption = FieldTypeOption;

export const TASK_FIELD_TYPES: FieldTypeOption[] = REPORT_FIELD_TYPES;

export const getTaskFieldTypeMeta = (type: TaskFieldType | string): FieldTypeOption => {
  return getFieldTypeMeta(type as ReportFieldType);
};
