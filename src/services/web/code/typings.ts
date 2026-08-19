export interface GeneratorTableVo {
  id: number;
  tableName: string;
  tableComment: string;
  className: string;
  moduleName: string;
  packageName: string;
  businessName: string;
  author: string;
  parentMenuId: number;
  isConfigured: boolean;
  createTime: string;
}

export interface GeneratorTableDto {
  tableName: string;
  tableComment?: string;
  className?: string;
  moduleName: string;
  packageName: string;
  businessName: string;
  author: string;
  parentMenuId?: number;
}

export interface GeneratorFieldVo {
  id: number;
  tableName: string;
  columnName: string;
  columnComment: string;
  columnType: string;
  fieldName: string;
  fieldType: string;
  formType: string;
  queryType: string;
  isRequired: boolean;
  isListVisible: boolean;
  isFormVisible: boolean;
  isQueryVisible: boolean;
  sort: number;
}

export interface GeneratorFieldDto {
  id: number;
  columnComment: string;
  formType: string;
  queryType: string;
  isRequired: boolean;
  isListVisible: boolean;
  isFormVisible: boolean;
  isQueryVisible: boolean;
  sort: number;
}

export interface CodePreviewVo {
  fileName: string;
  content: string;
}
