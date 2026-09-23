export interface GeneratorTableVo {
  tableName: string;
  comment?: string;
  classNamePrefix?: string;
  moduleName?: string;
  packageName?: string;
  businessName?: string;
  author?: string;
  tablePrefix?: string;
  isOverride?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface GeneratorTableDto {
  tableName: string;
  comment?: string;
  moduleName: string;
  packageName: string;
  businessName: string;
  author: string;
  tablePrefix?: string;
  isOverride?: boolean;
}

export interface GeneratorFieldVo {
  id: number;
  tableName: string;
  columnName: string;
  columnType: string;
  columnSize?: number;
  fieldName: string;
  fieldType: string;
  fieldSort?: number;
  comment?: string;
  isRequired?: boolean;
  showInList?: boolean;
  showInForm?: boolean;
  showInQuery?: boolean;
  formType?: string;
  queryType?: string;
  dictCode?: string;
  createTime?: string;
}

export interface GeneratorFieldDto {
  id: number;
  comment?: string;
  formType?: string;
  queryType?: string;
  isRequired?: boolean;
  showInList?: boolean;
  showInForm?: boolean;
  showInQuery?: boolean;
  fieldSort?: number;
}

export interface CodePreviewVo {
  path?: string;
  fileName: string;
  content: string;
  backend?: boolean;
}
