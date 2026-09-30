/**
 * 系统参数类型（后端 `OptionResp` / `OptionReq` / `OptionQuery`）。
 *
 * 参数项由数据库 `sys_option` 种子数据维护：界面只能改值，不能增删。
 * `category` 必须是后端 `OptionCategoryEnum` 的枚举名（大小写敏感，
 * 传小写会被 `@EnumValue` 校验判为"类别无效"）。
 */

export type OptionCategory = 'SITE' | 'PASSWORD' | 'MAIL' | 'LOGIN';

/** 参数项（`OptionResp`） */
export type SysConfigVo = {
  id: number;
  // 参数名称（中文可读，用于表单 label）
  name: string;
  // 参数键，如 SITE_TITLE
  code: string;
  // 参数值：种子数据里通常为 null，此时以 defaultValue 为准
  value?: string | null;
  defaultValue?: string | null;
  description?: string;
};

/** 保存请求体（`OptionReq`）：只允许改 `value` */
export type SysConfig = {
  id: number;
  code: string;
  value: string;
  // 只读展示字段，后端会忽略
  name?: string;
  description?: string;
};

/** 查询条件（`OptionQuery`） */
export type SysConfigQo = {
  name?: string;
  // 后端为 List<String>
  code?: string | string[];
  category?: OptionCategory;
};
