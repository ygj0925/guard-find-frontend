-- ============================================================
-- 后端菜单配置 SQL（ContinueNew Admin）
-- 说明：在后端菜单管理中添加以下菜单，使新页面能通过动态路由加载
-- component 字段对应 pageImports.ts 中的 key
-- ============================================================

-- ==================== Dashboard 模块 ====================

-- Dashboard 工作台
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache)
VALUES ('工作台', '/dashboard/workplace', 'dashboard/workplace/WorkplacePage', 0, 1, 10, 'dashboard', 0, 1);

-- Dashboard 数据分析
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache)
VALUES ('数据分析', '/dashboard/analysis', 'dashboard/analysis/AnalysisPage', 0, 1, 11, 'dashboard', 0, 1);

-- ==================== 监控模块（目录） ====================

-- 如果 "监控" 目录不存在，先创建:
-- INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon)
-- VALUES ('监控', '/monitor', NULL, 0, 0, 30, 'warning');

-- 在线用户（parent_id 替换为"监控"目录的实际 ID）
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('在线用户', '/monitor/online', 'monitor/online/OnlinePage', {监控目录ID}, 1, 1, NULL, 0, 1, 'monitor:online:list');

-- 短信日志
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('短信日志', '/monitor/sms-log', 'monitor/sms-log/SmsLogPage', {监控目录ID}, 1, 2, NULL, 0, 1, 'system:sms:log:list');

-- ==================== 系统管理模块（新增子菜单） ====================
-- parent_id 替换为"系统管理"目录的实际 ID

-- 文件管理
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('文件管理', '/system/file', 'system/file/FilePage', {系统管理目录ID}, 1, 50, NULL, 0, 1, 'system:file:list');

-- 存储管理
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('存储管理', '/system/storage', 'system/storage/StoragePage', {系统管理目录ID}, 1, 51, NULL, 0, 1, 'system:storage:list');

-- 短信配置
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('短信配置', '/system/sms-config', 'system/sms-config/SmsConfigPage', {系统管理目录ID}, 1, 52, NULL, 0, 1, 'system:sms:config:list');

-- ==================== 定时任务模块（目录） ====================

-- 定时任务目录
-- INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon)
-- VALUES ('定时任务', '/schedule', NULL, 0, 0, 40, 'form');

-- 任务管理
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('任务管理', '/schedule/job', 'schedule/job/JobPage', {定时任务目录ID}, 1, 1, NULL, 0, 1, 'schedule:job:list');

-- 任务日志
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('任务日志', '/schedule/log', 'schedule/log/JobLogPage', {定时任务目录ID}, 1, 2, NULL, 0, 1, 'schedule:log:list');

-- ==================== 租户管理模块（目录） ====================

-- 租户管理目录
-- INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon)
-- VALUES ('租户管理', '/tenant', NULL, 0, 0, 50, 'table');

-- 租户列表
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('租户列表', '/tenant/management', 'tenant/management/TenantPage', {租户管理目录ID}, 1, 1, NULL, 0, 1, 'tenant:management:list');

-- 租户套餐
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('租户套餐', '/tenant/package', 'tenant/package/PackagePage', {租户管理目录ID}, 1, 2, NULL, 0, 1, 'tenant:package:list');

-- ==================== 开放平台模块（目录） ====================

-- 开放平台目录
-- INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon)
-- VALUES ('开放平台', '/open', NULL, 0, 0, 60, 'smile');

-- 应用管理
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('应用管理', '/open/app', 'open/app/AppPage', {开放平台目录ID}, 1, 1, NULL, 0, 1, 'open:app:list');

-- ==================== 代码生成器 ====================

-- 代码生成（可放在"开发工具"目录下，或作为独立菜单）
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache, permission)
VALUES ('代码生成', '/code/generator', 'code/generator/GeneratorPage', 0, 1, 70, 'form', 0, 1, 'code:generator:list');

-- ==================== 个人中心（隐藏菜单） ====================

-- 个人中心（不在菜单显示，通过头像下拉进入）
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache)
VALUES ('个人中心', '/user/profile', 'user/profile/ProfilePage', 0, 1, 90, NULL, 1, 1);

-- 消息中心（不在菜单显示，通过铃铛图标进入）
INSERT INTO sys_menu (title, path, component, parent_id, type, sort, icon, is_hidden, is_cache)
VALUES ('消息中心', '/user/message', 'user/message/MessagePage', 0, 1, 91, NULL, 1, 1);

-- ============================================================
-- 注意事项：
-- 1. parent_id 需替换为实际的父菜单 ID（花括号内容需替换）
-- 2. 如果目录不存在，取消注释对应的目录 INSERT 语句
-- 3. permission 字段需与后端 @PreAuthorize 注解一致
-- 4. type: 0=目录, 1=菜单, 2=按钮
-- 5. component 字段必须与 pageImports.ts 中的 key 完全匹配
-- 6. 也可以通过后台"菜单管理"页面手动添加，component 填写上面的值
-- ============================================================
