## ADDED Requirements

### Requirement: 接口契约回归检查

项目 SHALL 提供 `npm run check:contract`，静态比对 `guard-find-backend` 的路由集合与 `src/**` 中全部 `request()` 调用点，输出已匹配、方法不匹配、路径不存在三类清单与计数。

#### Scenario: 计数只准下降

- **WHEN** 方法不匹配或路径不存在的数量高于已记录基线
- **THEN** 检查 SHALL 以非零状态退出并列出新增条目

#### Scenario: 阶段验收

- **WHEN** 阶段 2 完成
- **THEN** 检查输出 SHALL 满足 `verbMismatch = 0`

### Requirement: 菜单与页面文件一致性检查

同一工具 SHALL 比对 `sys_menu` 的 `path` / `component` 与 `src/pages` 文件树，缺失页面即视为失败。

#### Scenario: 菜单指向不存在的页面

- **WHEN** 菜单声明 `component = 'monitor/log/access/index'` 而对应页面已下线
- **THEN** 检查 SHALL 失败并指出该菜单行
