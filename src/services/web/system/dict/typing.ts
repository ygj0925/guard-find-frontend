export type SysDict = {
  id?: number;
  name: string;
  code: string;
  description?: string;
};

// 字典查询参数
export type SysDictQo = {
  name?: string;
  code?: string;
};

// 字典查询返回
export type SysDictVo = {
  id: number;
  name: string;
  code: string;
  description: string;
  isSystem?: boolean;
  createUserString?: string;
  createTime?: string;
};

export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning';
export const badgeStatusArray = ['success', 'processing', 'default', 'error', 'warning'];
export const badgeDefaultColorArray = [
  'pink',
  'red',
  'yellow',
  'orange',
  'cyan',
  'green',
  'blue',
  'purple',
  'geekblue',
  'magenta',
  'volcano',
  'gold',
  'lime',
];

export const tagDefaultColorArray = [
  'pink',
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
  'success',
  'processing',
  'error',
  'warning',
];

export type SysDictItemAttributes = {
  languages?: Record<string, string>;
  tagColor?: string;
  textColor?: string;
  badgeColor?: string;
  badgeStatus?: BadgeStatus;
};

export type SysDictItem = {
  id?: number;
  // 所属字典 ID
  dictId: number;
  // 标签
  label: string;
  // 值
  value: string;
  // 标签颜色
  color?: string;
  // 状态,1：启用 2：禁用
  status?: number;
  // 排序
  sort?: number;
  // 描述
  description?: string;
};

// 字典项查询参数
export type SysDictItemQo = {
  dictId?: number;
};

// 字典项查询返回
export type SysDictItemVo = {
  id: number;
  dictId: number;
  label: string;
  value: string;
  color: string;
  status: number;
  sort: number;
  description: string;
  createTime: string;
};

// 字典项展示数据获取
export type SysDictDataItem = {
  id: number;
  // 文本值
  name: string;
  // 数据值
  value: string;
  // 附加属性值
  attributes: SysDictItemAttributes;
  // 真实数据
  realVal: any;
};

// 字典展示数据获取
export type SysDictData = {
  dictCode: string;
  hashCode: string;
  // 1: 数字; 2: 字符串; 3: 布尔
  valueType: 1 | 2 | 3;
  dictItems: SysDictDataItem[];
  loading: boolean;
};

export type SysDictDataHash = Record<string, string>;
