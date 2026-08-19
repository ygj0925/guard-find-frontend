## Why

将 ContinueNew Admin Vue 前端（D:\code\continew\frontend-bck）的全部业务功能迁移到当前 UMI4 React 项目中，实现功能对等。后端服务（localhost:8000）已就绪，前端已完成核心框架搭建（登录/路由/权限/字典），但大量业务页面尚未实现，需要补齐以替代原 Vue 前端上线使用。

## What Changes

- **配置层**：将 API 代理前缀从 `/dev-api` 改为 `/dev-api`，添加 pathRewrite 去除前缀，确保请求正确到达后端
- **Dashboard 模块**：新增工作台和数据分析两个仪表盘页面
- **个人中心**：新增用户资料编辑、头像上传、密码/手机/邮箱修改页面
- **消息中心**：新增消息列表、已读标记、公告查看页面
- **在线用户监控**：新增在线用户列表及强制下线功能
- **文件管理**：新增文件上传/列表/删除/回收站/统计页面
- **存储管理**：新增存储配置 CRUD 及默认设置页面
- **系统配置增强**：补全站点/安全/邮件/登录/存储/短信/客户端子配置页
- **短信管理**：新增短信平台配置和短信发送日志页面
- **定时任务**：新增任务管理（CRUD/触发/暂停）和执行日志页面
- **租户管理**：新增租户 CRUD 和租户套餐管理页面
- **开放平台**：新增应用管理（CRUD/密钥管理）页面
- **代码生成器**：新增表/字段配置、代码预览/下载页面

## Capabilities

### New Capabilities
- `dashboard-workplace`: 工作台首页，含快捷入口、待办事项、统计卡片、最近动态
- `dashboard-analysis`: 数据分析页，含多维度图表、趋势线、排名列表
- `user-profile`: 个人中心，含基本信息编辑、头像裁剪上传、密码/手机/邮箱修改、社交账号管理
- `user-message`: 消息中心，含消息列表、已读/删除操作、公告详情查看
- `monitor-online`: 在线用户监控，含用户列表查询、强制下线操作
- `system-file`: 文件管理，含文件上传、列表浏览、删除、回收站、存储统计
- `system-storage`: 存储配置管理，含存储方式 CRUD、设为默认、状态切换
- `system-config-pages`: 系统配置子页面，含站点/安全/邮件/登录/存储/短信/客户端 7 个独立配置表单
- `system-sms-config`: 短信平台配置，含平台 CRUD 和设为默认
- `monitor-sms-log`: 短信发送日志，含日志列表、删除、导出
- `schedule-job`: 定时任务管理，含任务 CRUD、立即触发、暂停/恢复状态切换
- `schedule-log`: 定时任务日志，含执行日志列表、停止执行、重试
- `tenant-management`: 租户管理，含租户 CRUD、修改管理员密码
- `tenant-package`: 租户套餐管理，含套餐 CRUD、菜单权限分配
- `open-app`: 开放平台应用管理，含应用 CRUD、获取/重置密钥、导出
- `code-generator`: 代码生成器，含数据表配置、字段配置、代码预览、批量下载生成
- `api-proxy-config`: API 代理配置变更，将 /dev-api 切换为 /dev-api 并正确代理到后端

### Modified Capabilities
<!-- 无需修改已有 spec，所有变更都是新增功能 -->

## Impact

- **配置文件**：`config/proxy.ts`、`config/config.dev.ts`、`config/config.prod.ts` 需修改代理前缀
- **Service 层**：新增约 12 个 API 模块（`src/services/web/` 下新增 monitor、schedule、tenant、open、code、file、storage、sms 等）
- **Page 组件**：新增约 15+ 页面目录（`src/pages/` 下），每个含主页面和表单/弹窗子组件
- **路由注册**：新页面通过后端菜单配置动态加载，需确保 `pageImports.ts` 自动生成映射
- **依赖**：可能需要新增图表库（@ant-design/charts）用于 Dashboard 页面
- **现有功能不受影响**：所有已实现的页面（用户/角色/菜单/组织/字典/配置/日志/公告等）保持不变
