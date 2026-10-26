## Context

后端契约（已逐条核实，证据见文件行号）：

- 信封：`top.continew.starter.web.model.R` + graceful-response，`{"code":"0","msg":"操作成功","data":…,"success":true,"timestamp":…}`；`code` 为**字符串**；`application.yml:154` `default-http-status-code-on-error: 200` → **业务失败也是 HTTP 200**，错误信息只在 `msg`。
- 分页：`PageQuery{page,size}` + `sort` 为 `String[]`，元素形如 `"createTime,desc"`；响应 `BasePageResp{list,total}`。
- CRUD：`@CrudRequestMapping` 派生 `GET <base>`(page) / `GET <base>/list` / `GET <base>/tree` / `GET <base>/{id}` / `POST <base>`(→`data.id`) / `PUT <base>/{id}` / `DELETE <base>`+`{ids:[]}` / `GET <base>/export` / `GET <base>/dict`；权限码自动派生为 `<prefix>:<api小写>`（`guard-find-backend-common/.../BaseController.java:55-84`），另有 42 个 `@SaCheckPermission` 显式码。
- 路由：`GET /auth/user/route` → `List<RouteResp>`，`type` 为 `MenuTypeEnum` 1 目录 / 2 菜单 / 3 按钮，`RouteResp` 带 `@JsonInclude(NON_EMPTY)`（`isExternal/isCache/isHidden=false` 与 `sort=0` **字段整体缺失**），无 `targetType/uri/hidden/status` 字段。
- 登录：`POST /auth/login`，`AccountLoginReq{username,password,captcha,uuid}` + `clientId/authType`，密码 RSA（公钥见 `application-dev.yml:136`，与 `src/utils/Encrypt.ts:45` 当前一致）；`GET /auth/user/info` → `UserInfoResp{…,permissions,roles,pwdExpired,…}`。

前端现状：155 个调用点 → 84 匹配 / 26 动词错 / 45 路径不存在；66 个权限码不合规则；`RequestConfig.ts:167-191` 读后端从不返回的 `errorMessage/showType` → 业务错误提示为空白。

约束：本轮只改 `guard-find-frontend`；`continew-admin-ui` 为只读参照；后端与菜单种子数据（`menu_convention_routing.sql`）不动。

## Goals / Non-Goals

**Goals**

- 让失败请求可见（真实 `msg`）、可归因（404/405 开发期告警）。
- 让 CRUD 闭环（新增/编辑/单删/批删/分页/树）在真实后端下可用。
- 让按钮可见性与后端放行一致。
- 用可量化脚本守住契约回归。

**Non-Goals**

- 不在前端实现后端缺失的 i18n / access-log / chat / announcement 能力。
- 不做 UI 改版、不改 ProTable 视觉与交互。
- 不改后端接口、不新增后端兼容别名路由。
- 本阶段不补齐客户端管理/导入/分片上传等新功能（阶段 6 单独变更）。

## Decisions

**D1 单一事实源放在后端，前端全面靠齐**
备选：后端加别名路由兼容前端。否决理由：权限码由 `@CrudRequestMapping` 自动派生，任何前端命名漂移都会同时造成 UI 与鉴权两层不一致，兼容层只会掩盖漂移。

**D2 引入 `createCrud()` 服务工厂，而非逐函数手工修**
把"动词 + 路径 + `{ids:[]}` + `data.id`"这些规则集中一处，页面只消费语义方法（`page/list/tree/get/create/update/remove/export/dict`）。收益：13 个模块一次收敛，后续 ContiNew 升级只改工厂。代价：需要为 `system/option`、`system/file/recycle`、`user/*` 等非标准形态保留手写导出，工厂需支持 `omit` 与自定义覆盖。

**D3 错误处理按 `code` 分派，忽略 HTTP 状态（除网络层）**
后端恒返回 HTTP 200，因此映射表以 `code` 为主键（`400/401/403/404/405/500/1`），`errorHandler` 只保留一份分支逻辑；`401` 判定后立即 `return`，并复用 `Notify.logout()` 单次弹窗。`404/405` 在非生产环境额外 `console.error('[api-contract]', url)`，把契约漂移变成开发期可见信号。

**D4 `msg` 为唯一消息字段，`R<T>` 与 `ApiResponse` 合并**
删除 `typings.d.ts` 中 `message` 字段与 `GLOBAL.Router` 中后端不存在的字段，避免类型层继续"允许"错误契约。保留 `errorCode/errorMessage/showType` 的兼容读取仅作过渡，标记 deprecated，阶段 5 结束前移除。

**D5 失效模块走"前端隐藏 + 代码标注"，不改数据库**
`RouteUtils` 增加 `OFFLINE_MENU_PATHS` 过滤（`/i18n`、`/monitor/log/access`、`/chat`），服务文件保留但加 `// @deprecated 后端未实现（见 align-backend-contract）`，并在根方案文档登记为"待后端补齐"。理由：菜单来自 `sys_menu`，改数据属后端变更；前端过滤可立即止血，且后端补实现后只需摘掉过滤项。
备选：直接删页面。否决：驾驶舱/工作台等已投入使用的页面与被下线页面混在同一提交里，回滚面过大。

**D6 用户权限以后端返回为准**
页面声明按钮所需的权限码，`AccessControl` 通过统一判定逻辑匹配 `/auth/user/info` 返回的 `permissions`。登录及应用初始化时更新用户信息和本地缓存，运行时读取 `initialState.user`。前端不维护或生成完整权限码清单；`check:contract` 直接扫描后端源码，检查页面声明的权限码是否与后端一致。

**D7 菜单 `component` 字符串与约定式路由建立一致性校验**
后端 `component` 形如 `monitor/log/login/index`，前端靠 UMI convention routes 命中文件。`check-api-contract.mjs` 增加第二项检查：拉取（或读取导出的）`sys_menu` 路径/组件清单，与 `src/pages` 文件树比对，缺失即非零退出。避免"菜单点开白屏"。

## Risks / Trade-offs

- **R1 大范围服务层重写可能引入回归** → 按阶段 1/2/3 分批合并；每阶段以 `check:contract` 计数 + 手工冒烟清单（新增/编辑/删除/分页/树/导出各一条）作为放行条件；工厂化改造保持函数签名兼容，页面改动限于 import。
- **R2 隐藏菜单入口后，DB 仍存在菜单行** → 明确记录为后端待办；新环境部署仍会出现相同漂移，需一次 liquibase 清理。
- **R3 `sort` 数组序列化** → axios 默认 `sort[]=a` 与后端 `String[] sort` 绑定不兼容；当前页面未传 `sort`，故风险未暴露。阶段 2 在 `createCrud` 内统一 `paramsSerializer`（repeat 形式），并在验收里加一条排序用例。
- **R4 Long 精度** → 后端 `big-number-serialize-mode: FLEXIBLE` 使雪花 ID 以字符串下发，前端 `id: number` 断言在比较/拼接处可能出错。阶段 5 统一为 `string | number`，并禁用 `Number(id)`。
- **R5 构建配置遗留** → `requestPrefix/clientId/namespaceName` 仅在 `UMI_ENV` 下注入，默认构建会产生 `"undefined"` 前缀的 localStorage key；阶段 1 一并清理，否则环境相关验证不可信。
- **R6 与既有变更冲突**：`openspec/changes/system-management-module`（0/44 未开工）与 `full-project-replication`（0/41 未开工）以 ballcat-ui-react 为参照，其接口与权限码命名正是本变更要清除的对象。本 change 取代二者，评审通过后应将其标记 superseded 或归档，避免后续实现者照旧文件施工。
- **取舍**：不做后端兼容层意味着本变更必须覆盖全部 71 个失配调用点，短期工作量更大，但不留双轨。

## Migration Plan

1. 阶段 0（0.5d）：脚本与基线；先合入，仅新增 dev 工具。
2. 阶段 1（1.5d）：请求层 + 类型 + 租户/RSA/构建变量；独立可回滚（单文件 `RequestConfig.ts` + `typings.d.ts`）。
3. 阶段 2（2d）：`createCrud` 工厂 + 13 模块迁移；按模块小步提交。
4. 阶段 3（2d）：A 类路径改正 + B 类下线与菜单过滤。
5. 阶段 4（1.5d）：权限码表 + `AccessControl`/`useAccess` 合并。
6. 阶段 5（3d）：菜单 type/RouteResp 缺省、组件一致性校验、字段级 VO 重建。
7. 阶段 6：功能补齐，逐项另立 change。

回滚：每阶段独立 PR；阶段 2 的工厂保留 `legacy.ts` 导出旧函数，直到阶段 3 验证通过后删除。

## Open Questions

- ~~`chat` 是否由 `guard-find-server` 承载？~~ **已核实（2026-09-24，阶段 3）**：`guard-find-backend` 与 `guard-find-server` 两个 Java 服务都没有任何 chat 控制器，因此按"确无后端"处理——`/chat` 菜单与 `ChatFloat` 入口下线，`pages/chat/**` 代码保留，4 个调用点登记进 `scripts/offline-endpoints.json` 由扫描器单列，不计入 CI 门禁。
- 非超管角色的 `sys_role_menu` 数据是否已按 ContiNew 权限码刷库？若仍为 ballcat 码，阶段 4 需与后端数据同步（否则按钮全不可见）。
- 阶段 1+2+3 已作为同一轮实施（均未提交），合并策略按单 PR 还是按阶段拆 3 个 PR 待用户确认。
