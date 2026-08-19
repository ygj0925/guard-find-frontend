## 1. 国际化基础设施

- [ ] 1.1 安装依赖：@wangeditor/editor、@wangeditor/editor-for-react、react-color、react-copy-to-clipboard
- [ ] 1.2 创建 locales 目录结构（zh-CN/en-US）
- [ ] 1.3 创建 common.ts 通用翻译文件（成功/失败/确认/取消等）
- [ ] 1.4 创建 login.ts 登录翻译文件
- [ ] 1.5 创建 system.ts 系统管理翻译文件（用户/角色/菜单/组织/字典/配置）
- [ ] 1.6 创建 log.ts 日志翻译文件
- [ ] 1.7 创建 notify.ts 通知翻译文件
- [ ] 1.8 配置 UMI 4 locale 插件

## 2. 通用组件

- [ ] 2.1 创建 Editor 富文本编辑器组件
- [ ] 2.2 创建 Lov 关联选择组件
- [ ] 2.3 创建 Copy 一键复制组件
- [ ] 2.4 创建 Color 颜色选择器组件
- [ ] 2.5 创建 SelectOrganization 组织选择器组件

## 3. 日志管理服务层

- [ ] 3.1 创建访问日志 API（src/services/web/log/accessLog.ts）
- [ ] 3.2 创建登录日志 API（src/services/web/log/loginLog.ts）
- [ ] 3.3 创建操作日志 API（src/services/web/log/operationLog.ts）
- [ ] 3.4 创建日志类型定义（src/services/web/log/typings.ts）

## 4. 日志管理页面

- [ ] 4.1 创建访问日志页面（src/pages/log/access-log/AccessLogPage.tsx）
- [ ] 4.2 创建登录日志页面（src/pages/log/login-log/LoginLogPage.tsx）
- [ ] 4.3 创建操作日志页面（src/pages/log/operation-log/OperationLogPage.tsx）

## 5. 通知管理服务层

- [ ] 5.1 创建公告 API（src/services/web/notify/announcement.ts）
- [ ] 5.2 创建公告类型定义（src/services/web/notify/typings.ts）

## 6. 通知管理页面

- [ ] 6.1 创建公告管理页面（src/pages/notify/announcement/AnnouncementPage.tsx）
- [ ] 6.2 创建公告表单组件（含富文本编辑器、接收人筛选）

## 7. 国际化管理页面

- [ ] 7.1 创建国际化数据页面（src/pages/i18n/I18nDataPage.tsx）
- [ ] 7.2 实现国际化数据导入导出功能

## 8. 现有页面国际化改造

- [ ] 8.1 用户管理页面国际化
- [ ] 8.2 角色管理页面国际化
- [ ] 8.3 菜单管理页面国际化
- [ ] 8.4 组织管理页面国际化
- [ ] 8.5 字典管理页面国际化
- [ ] 8.6 系统配置页面国际化

## 9. 字典组件国际化

- [ ] 9.1 DictTag 支持国际化文本显示
- [ ] 9.2 DictSelect 支持国际化选项显示
- [ ] 9.3 DictRadio 支持国际化选项显示

## 10. 菜单国际化

- [ ] 10.1 修改动态路由加载逻辑，支持 i18nTitle
- [ ] 10.2 菜单显示时优先使用翻译后的标题

## 11. 测试和提交

- [ ] 11.1 测试所有新功能
- [ ] 11.2 测试国际化切换
- [ ] 11.3 运行 lint 检查
- [ ] 11.4 提交代码并推送到远程
