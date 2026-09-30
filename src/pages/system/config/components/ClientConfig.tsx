import { Alert } from 'antd';
import React from 'react';

/**
 * 客户端配置占位页。
 *
 * 后端能力是 `GET/POST/PUT/DELETE /system/client`（`ClientController`），
 * 不是 sys_option 参数：此前这里用 `category=client` 伪装成参数表单，
 * 而 `client` 不在后端 `OptionCategoryEnum` 里，请求必然被 `@EnumValue` 判 400。
 *
 * 真正的客户端管理（含 clientType/authType/activeTimeout/timeout/isConcurrent/
 * replacedRange/maxLoginCount/overflowLogoutMode/status 等字段）尚未接入前端，
 * 登记在 openspec change `align-backend-contract` 阶段 6.1。
 */
const ClientConfig: React.FC = () => (
  <Alert
    type="info"
    showIcon
    message="客户端管理尚未接入"
    description="后端接口为 /system/client（CRUD + 分页 + 导出），前端待实现，见 align-backend-contract 阶段 6.1。"
  />
);

export default ClientConfig;
