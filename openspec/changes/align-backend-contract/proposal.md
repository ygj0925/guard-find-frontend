# Align admin frontend with ContiNew backend contract

## Why

`guard-find-frontend` 的页面来自 `vue-to-umi-migration`（已完成 92/97 任务），但服务层与权限码仍带 ballcat 时代残留，与 `guard-find-backend`（ContiNew Admin 派生）的 CRUD 契约大面积不符。静态比对结果：155 个前端调用点中仅 84 个与后端完全匹配，26 个 HTTP 方法错误，45 个路径后端不存在；83 处权限引用中 66 个权限码命名与后端派生规则不一致。

叠加请求层的异常适配缺陷（`RequestConfig.ts` 读取后端从不返回的 `errorMessage/showType`，业务错误提示为空白），导致"改和删静默失败、按钮凭空消失、报错看不到原因"。功能范围上，后端已提供的客户端管理、用户导入、导出、角色权限树、分片上传与秒传、站点配置注入等能力前端未接入，而前端/i18n、访问日志、chat 等入口在后端从未实现。

## What Changes

- **请求层与异常适配**：响应信封类型改为后端真实的 `{code:string, msg, data, success, timestamp}`；错误提示读 `msg`；`401` 短路去重；启用错误去重；blob 业务错误解析；统一 `download()` 工具；建立 `code → UI 行为` 映射表；租户 header 与 RSA 公钥改为配置注入。
- **CRUD 动词与批量操作**：新增 `createCrud()` 服务工厂，按 ContiNew 约定实现 `PUT <base>/{id}`、`DELETE <base>` + `{ids:[]}`、`POST <base>` 返回 `data.id`；13 个模块迁移。
- **路径修正与失效模块下线**：约 15 条"参数顺序写反"的路径改正；`i18n/*`、`chat/*`、`notify/announcement/*`、`system/access-log/page`、`system/user/scope|status|avatar`、`system/dept/revised`、`system/role/select`、`system/menu/grant-list`、`system/dict/invalid-hash` 等后端未实现能力下线并在 `RouteUtils` 增加菜单入口过滤。
- **权限码对齐**：`:add/:edit/:del` → `:create/:update/:delete`，`system:organization:*` → `system:dept:*` 等，建立单一映射表并全量替换；合并 `src/access.ts` 与 `useAccess` 两套判定。
- **路由与字段级契约**：菜单 `type` 语义（1 目录/2 菜单/3 按钮）与 `RouteResp` 的 `@JsonInclude(NON_EMPTY)`（`isHidden/sort` 缺失即默认值）显式化；`sys_menu.component` 与 `src/pages` 一致性校验；`*Vo/*Dto` 类型按后端 `*Resp/*Req` 字段重建，Long 精度（雪花 ID 字符串化）修正。
- **回归基线**：新增 `scripts/check-api-contract.mjs` + `npm run check:contract`，输出匹配/动词错/路径缺失三项计数，作为各阶段验收指标。

## Impact

- Affected specs：`api-request-envelope`、`crud-endpoint-binding`、`permission-code-alignment`、`dynamic-route-contract`、`unsupported-module-offline`、`api-contract-regression`
- Affected code：`src/typings.d.ts`、`src/utils/RequestConfig.ts`、`src/utils/RouteUtils.ts`、`src/utils/{Web,Encrypt,NotifyUtils}.ts`、`src/services/web/**`（13 个 CRUD 模块 + 4 个失效模块）、`src/components/AccessControl`、`src/hooks/useAccess.ts`、`src/access.ts`、`src/pages/**`（83 处权限引用与页面 request 适配）、`config/config.*.ts`、`package.json`
- 不改后端 `guard-find-backend`，不改参考实现 `continew-admin-ui`（只读基线）
- 风险：下线菜单仅在前端过滤，数据库 `sys_menu` 仍保留 `/i18n`、`/monitor/log/access`、`/chat` 行，需后端另立 liquibase 变更清理
- 完整分析与分阶段设计：仓库根 `doc/管理后台前端对齐Continew方案.md`，机器生成差异清单 `doc/appendix-接口契约差异清单.md`
