# Tasks

验收指标由 `npm run check:contract`（`scripts/check-api-contract.mjs`，TypeScript AST 扫描）输出。

**AST 基线（2026-09-24 阶段 0 实测）**：后端路由 184 条 / 前端调用点 160 处 →
`matched=90 / verbMismatch=26 / noPath=44 / unusedBackend=94`。
早先正则扫描为 155 / 84 / 26 / 45，故 `doc/appendix-接口契约差异清单.md` 是下界，多出的 5 处（含 `system/dict/data`、dashboard 4 处泛型换行调用）已由 AST 捕获。

## 0. 契约回归基线（0.5d）

- [x] 0.1 新增 `scripts/check-api-contract.mjs`：扫描 `../guard-find-backend` 的 `@CrudRequestMapping`（按 `Api.*` 枚举展开）与 `@*Mapping`，与 `src/**` 中 `request()` 调用点按 verb+path 匹配，输出三类清单与计数（支持 `--json`）
- [x] 0.1.1 采用 TypeScript AST（`ts.forEachChild`）而非正则：覆盖泛型换行、模板插值、`+` 拼接、`method` 大小写；实测可捕获正则漏采的 `services/web/dashboard/index.ts:17,24,37,44` 与 `services/web/system/dict/dict.ts:41`
- [x] 0.2 `package.json` 增加 `check:contract`（人读）与 `check:contract:ci`（`--max-verb-mismatch 26 --max-no-path 44` 门禁）
- [x] 0.3 基线数字已记录（见顶部），随阶段推进下调门禁
- [ ] 0.4 本地已验证；接入 CI 流水线（调用 `npm run check:contract:ci`）仍待办

## 1. 请求层与异常适配（1.5d，P0）

- [x] 1.1 `src/typings.d.ts` — `R<T>` 改为 `{ code: string; msg: string; data: T; success: boolean; timestamp: number }`
- [x] 1.2 `src/utils/RequestConfig.ts` — 按 `code` 分派并读后端 `msg`：`400` warning / `401` 登出 / `403` error / `404|405` 开发期 `[api-contract]` 告警 / `500` error / 其他（含 `1`）notification；删除对 `errorMessage/showType` 的依赖
- [x] 1.3 `401` 由 `Notify.logout()` 接管后抛 `BizError(handled)`，`errorHandler` 对已处理错误直接返回，不再叠加空提示
- [x] 1.4 启用 `showOnce` 去重（1.5s，按 kind+文案）；删除零引用的 `utils/MessageErrorWrapper.ts`
- [x] 1.5 响应拦截器改为异步：`Blob` 且 `content-type` 为 JSON 时解析信封再抛错，避免把错误存成损坏文件
- [x] 1.6 新增 `src/utils/download.ts`（`download` / `saveBlob` / `filenameFromDisposition`）；已替换 `code/generator`（2 处）、`open/app`、`system/sms/log` 的手写 `createObjectURL`（`system/i18n` 待阶段 3 下线，不单独改）
- [ ] 1.7 租户 header 已互斥（登录用 `X-Tenant-Code`，登录后用 `X-Tenant-Id`）；**未**接入 `GET /tenant/common/id` 的租户选择流程（等产品确认入口形态）
- [x] 1.8 `src/utils/Encrypt.ts` — 公钥可由 `process.env.rsaPublicKey` 注入并保留可用默认值；删除 ballcat 遗留 `Aes`/`Pwd`（`==BallCat-Auth==`）
- [x] 1.9 新增 `src/utils/env.ts` 统一读取并回落 `requestPrefix` / `clientId` / `namespaceName` / `companyName`；`config/config.ts` 的 `define` 增加 `RSA_PUBLIC_KEY` / `CLIENT_ID` / `STORAGE_NAMESPACE` 透传；`config/defaultSettings.ts` 命名空间回落 `guard-find-admin/`（localStorage 键前缀不再是 `undefined`，老缓存会失效一次）
- [x] 1.10 移除生产路径 `console.log(error, 'errorHandler')`；新增取消请求（`CanceledError`/`AbortError`）静默分支
- [x] 1.11 验证：`npx tsc --noEmit` 通过；`biome lint` 无新增告警（仅存 3 处未改动文件的历史 `useOptionalChain` 告警）；`npm run build:zy` 成功，产物内已含 `/dev-api`、`guard-find-admin/`、clientId 回落值
- [ ] 1.12 需连真实后端手测：构造"业务重名(500)""无权限(403)""接口不存在(404)""导出返回 JSON"四种响应，确认提示为后端 `msg` 且各只弹一次

## 2. CRUD 动词与批量操作（2d，P0）

阶段 2 完成后计数（2026-09-24 实测）：`matched=136 / verbMismatch=0 / noPath=31`，
其中 `noPath` 31 条**全部**是后端从未实现的 B 类（chat、i18n、notify/announcement、access-log、
`system/menu/grant-list`、`system/user/scope|status|avatar`、`system/dept/revised`、
`system/dict/invalid-hash`、公告 publish/close），归阶段 3 下线。

- [x] 2.1 新增 `src/services/web/crud.ts` — `createCrud(base, opts)` 产出 `page/list/tree/get/create/update(id,body)/remove(ids)/dict/treeDict/exportUrl`，删除统一 `DELETE <base>` + `{ids}`，并集中定义 `LabelValue`、`resolveId`、`toIds`
- [x] 2.2 工厂内 `paramsSerializer=serializeParams`（重复键形式），保证 `sort=createTime,desc` 能被后端 `String[] sort` 绑定；手写服务仍用 axios 默认序列化（目前无页面传 `sort`，阶段 5 统一）
- [x] 2.3 迁移到工厂的服务：`system/user`、`system/role`、`system/menu`、`system/dept`、`system/dict`、`system/dict/item`、`system/storage`、`system/sms/config`、`system/notice`、`open/app`、`tenant/management`、`tenant/package`；`code/generator`、`schedule/job`、`schedule/log` 后端为自定义端点（非 CRUD 派生），保持手写并按真实路径改正
- [x] 2.4 非 CRUD 形态对齐：`system/option`（`GET`/`PUT` 批量改值/`PATCH /value`，移除后端不存在的 create/del 与界面按钮）、`system/file`（`DELETE` + `{ids}`、`PUT /recycle/restore/{id}`）、`user/message`（`PATCH /read` + `{ids}`、`PATCH /readAll`、`DELETE` + `{ids}`）、`user/profile`（全部 `PATCH`，含 `basic/info`、`avatar` 走 multipart `data`）、`monitor/online`
- [x] 2.5 页面适配：**保持服务函数名与签名不变**（`query/create/edit/del`），页面零改动即受益；额外改了 `system/role`（`MenuGrant` 由 `roleCode` 改 `roleId`，走 `GET /system/role/permission/tree` + `GET /system/role/{id}` 的 `menuIds` + `PUT /system/role/{id}/permission`）、`system/user`（`Grant` 改用 `GET /system/user/{id}` 的 `roleIds` + `PATCH /system/user/{id}/role`；角色下拉改用 `GET /system/role/dict` 的 `label/value`）、`system/dict`（`dictData(codes)` 适配为并发 `GET /system/common/dict/{code}` 并组装回 `SysDictData` 结构）
- [x] 2.6 树/列表页去除 `total: list.length` 伪造分页并显式 `pagination={false}`：`system/dept`、`system/menu`、`system/dict`、`system/role`、`system/config`、`system/storage`
- [ ] 2.7 每模块 UI 冒烟"新增 → 编辑 → 单条删除 → 批量删除 → 分页 → 排序"（需真实后端，未执行）
- [ ] 2.8 `create` 返回的 `data.id` 尚未被任何页面消费（现依赖 `reload()`），阶段 5 一并处理

**阶段 2 遗留（须知）**：HTTP 动词与路径已对齐，但**请求体字段名仍是 ballcat 风格**，
例如 `SysUserDto.pass` 对后端 `UserReq.password`、`SysUserDto.userId` 对路径 id、
公告 `AnnouncementDto` 对 `NoticeReq`。由于后端 Jackson 配置
`fail-on-unknown-properties: false`，多余字段被静默忽略 —— 表现是"请求 200 成功但字段没生效"。
这正是阶段 5（字段级契约）要解决的，不要以为动词修完就全部可用。

## 3. 路径修正与失效模块下线（2d，P0）

阶段 3 完成后计数（2026-09-24 实测）：`matched=136 / verbMismatch=0 / noPath=0 / registeredOffline=4`。

- [x] 3.1 A 类改正已在阶段 2 一并完成（`schedule/job/trigger/{id}`、`schedule/log/{stop,retry}/{id}`、
      `system/file/recycle/restore/{id}`、`PATCH user/message/read {ids}`、`PATCH user/profile/basic/info`、
      `tenant/management/{id}/admin/pwd`、`PATCH system/user/{id}/password`、
      `role/permission/tree` + `PUT role/{id}/permission`、`GET system/common/dict/{code}`、`GET system/role/dict`）
- [x] 3.2 验证码与社交登录路径核对：`GET /captcha/sms?phone=`、`GET /captcha/mail?email=`、`GET /auth/{source}`（`@SaIgnore`）均与后端一致
- [x] 3.3 B 类下线（后端从未实现）：删除 `services/web/system/i18n/**` + `pages/i18n/**`、
      `services/web/log/accessLog.ts` + `pages/monitor/log/access/**`、
      零引用的重复模块 `services/web/notify/announcement/**`（公告以 `system/notice` 为准）；
      移除 `menu.listRoleGrant`、`dict.validHash`、`organization.revised` + 部门页"层级校正"按钮、
      `user.getScope/putScope/updateAvatar` + 用户列表头像上传（管理员改他人头像无接口）
- [x] 3.3a 可挽救的两项改为**保功能而非砍功能**：公告"发布/撤回"改走 `GET /system/notice/{id}` 取详情 +
      `PUT /system/notice/{id}`（`NoticeStatusEnum` 1 草稿 / 3 已发布，因 `NoticeReq` 有非空校验必须整体回写）；
      用户"启用/禁用（含批量）"改走"取详情 → 回写 `status`"（`DisEnableStatusEnum` 1 正常 / 2 禁用）
- [x] 3.4 `src/utils/RouteUtils.ts` — 新增 `OFFLINE_MENU_PATHS = ['/i18n','/monitor/log/access','/chat']`
      并在 `serializationRemoteList` 过滤（`sys_menu` 已有这些行，本轮不改数据库），开发期 `console.warn` 一次；
      导出 `isOfflinePath` 供布局复用
- [x] 3.5 chat 处置（已用证据回答原 Open Question）：`guard-find-backend` 与 `guard-find-server` **都**没有 `/chat`
      控制器，因此 `ChatFloat` 挂载与 `/chat` 菜单入口一并下线，`pages/chat/**` 代码保留；
      其 4 个调用点登记进 `scripts/offline-endpoints.json`，扫描器单列 `registeredOffline` 不计入门禁
- [x] 3.6 登记"待后端补齐/待后端清理菜单"：见根方案文档 §5 与 `scripts/offline-endpoints.json`
- [x] 3.7 验证：`noPath=0`、`verbMismatch=0`；`npx tsc --noEmit` 通过、`biome lint` 仅剩 3 处历史告警、
      `npm run build:zy` 通过、`openspec validate --strict` 通过
- [ ] 3.8 需真实后端手测：侧边栏无失效入口；公告发布/撤回、用户批量启停两条新链路

## 4. 权限码对齐与按钮可见性（1.5d，P0）

阶段 4 完成后计数：`unknownPermissions=0`（前端在用 55 个码，全部落在后端 126 个权威码内）。

- [x] 4.1 权威来源选定：**后端种子 SQL 的 `sys_menu.permission` + `@SaCheckPermission` 字面量**，共 126 条，
      由 `check-api-contract.mjs` 每次现算（不是手工清单，避免第二份真相漂移）。
      实测修正了原计划的猜测：ContiNew 的码是 camelCase 模块名，
      `system:smsConfig:*`（非 `system:sms:config:*`）、`system:smsLog:*`（非 `system:sms:log:*`）、
      `system:dictItem:*`、`system:fileRecycle:*`、参数管理按类目分
      `system:siteConfig|securityConfig|loginConfig|mailConfig:get|update`
- [x] 4.2 `src/config/permissionCodes.ts` 由脚本 `--emit-permission-manifest` **自动生成**（派生产物，
      供补全与人工核对；页面仍写字面量，正确性靠门禁）
- [x] 4.3 18 个页面文件批量改写 50 个不合规码 → 合规：`:add/:edit/:del` → `:create/:update/:delete`、
      `system:organization:*` → `system:dept:*`、`notify:announcement:*` → `system:notice:*`、
      `monitor:sms:log:*` → `system:smsLog:*`、`system:config:edit` → `system:siteConfig:update`、
      `system:user:pass` → `system:user:resetPwd`、`system:user:grant` → `system:user:updateRole`、
      `system:role:grant` → `system:role:updatePermission`、`system:file:restore` → `system:fileRecycle:restore`、
      `code:generator:download` → `code:generator:generate`、`tenant:*:password|menu` → `tenant:management:updateAdminUserPwd|tenant:package:update`
- [x] 4.3a 两处**去掉门禁**而不是换成别的码：`user/message` 批量删除（后端 `UserMessageController`
      只做登录校验，加任何权限码都会永久隐藏）；驾驶舱两个"新建任务"按钮（`task:item:create` 是
      ballcat 遗留，且按钮本身没有 `onClick`，属死控件，一并删除）
- [x] 4.4 合并两套判定：新增 `src/utils/access.ts`（唯一实现，支持 `*:*:*` 与超级角色），
      `src/access.ts`（UMI access 插件）与 `src/hooks/useAccess.ts` 都改为委托它；
      `AccessControl` 支持 `mode="hide" | "disable"`（禁用态 + Tooltip 说明原因）并新增 `role` 维度
- [x] 4.5 门禁：`check:contract:ci` 加 `--max-unknown-permissions 0`，引用了后端不存在的权限码即失败；
      `npx tsc --noEmit`、`biome lint`（仅剩 3 处未改动文件的历史告警）、`npm run build:zy` 全通过
- [ ] 4.6 需真实后端 + 受限角色账号手测：非超管登录后各页按钮可见性与后端放行一致

## 5. 路由语义与字段级契约（3d，P1）—— 部分完成

已核实并落地的字段级事实（全部取自后端源码/种子数据，不是猜的）：

| 模块 | 后端权威字段 | 前端原状态 |
| --- | --- | --- |
| `UserReq` | username, nickname, **password**(RSA 密文), email, **phone**, gender, **deptId**, **roleIds**, description, status(1/2) | `pass`/`phoneNumber`/`organizationId`/`roleCodes`，且密码明文 |
| `DeptReq` | parentId, name, sort, **description**, status | `remarks`，无 status |
| `MenuReq` | type(**1目录/2菜单/3按钮**), title, icon, path, name, **component**, **redirect**, **isExternal**, **isCache**, **isHidden**, permission, sort, status | `targetType`/`uri`/`keepAlive`/`hidden`/`remarks` + type 用 0/1/2 |
| `RoleReq` | name, code, sort, description, dataScope, deptIds, deptCheckStrictly（**menuIds 不在此**，走 `PUT /{id}/permission`） | `remarks`/`type`/`scopeType`，且要求 `ROLE_` 前缀（后端无此约束） |
| `NoticeReq` | title, content, **type**, **noticeScope**(1/2), noticeUsers, **noticeMethods**(1系统消息/2登录弹窗), **isTiming**, publishTime, **isTop**, status(1/2/3) | `permanent`/`expireTime`/`receiverType`/`receiverIds`/`notifyType` |
| `OptionResp/OptionReq` | 取值以 **code** 为键、`value` 可为 null（回落 `defaultValue`）；保存 `PUT` body `[{id,code,value}]`；`category` 必须是枚举名 **SITE/PASSWORD/MAIL/LOGIN** | 按 `key/confValue/name` 取值、提交键值对象、category 传小写且杜撰了 `client/sms/storage` 三个类别 |
| `JobReq/JobResp` | groupName, jobName, triggerType, **triggerInterval**, executorType, **executorInfo**, taskType, argsStr, jobStatus(**0禁用/1启用**), nextTriggerAt, **createDt** | `name`/`jobGroup`/`cronExpression`/`targetBean`/`targetMethod`/`targetParams`/`status`/`createTime` |
| `JobLogResp` | jobId, groupName, jobName, **taskBatchStatus**(1待处理…6已取消), operationReason, executionAt, createDt | `status`(0/1/2)、`startTime`/`endTime`/`duration`/`errorMessage` 均不存在 |
| 枚举序列化 | `JacksonAutoConfiguration` 注册 `baseEnumModule`，`BaseEnumSerializer` 输出 `getValue()` → **裸数值/字符串** | 前端按数字判断是对的（原阶段 5.7 疑问已排除） |

- [x] 5.1 `src/typings.d.ts` — 删除后端不存在的 `GLOBAL.Router` 字段（`hidden/uri/targetType/keepAlive/remarks/status`），`type` 注释改为 1 目录 / 2 菜单 / 3 按钮
- [x] 5.2 `src/utils/RouteUtils.ts` — 去掉 `?? item.hidden` 与不存在的 `status` 判断，`isHidden === true` 显式化（`RouteResp` 为 `@JsonInclude(NON_EMPTY)`，`false`/`0` 字段整体不下发）
- [x] 5.4（本轮范围）用户 / 部门 / 菜单 / 角色 / 公告 / 参数(option) / 调度任务与日志 的请求体与响应字段名全部按上表重建；`storage`、`sms/config`、`open/app`、`tenant`、`package` 经核对本就与后端一致，仅补齐 RSA 与路径主键
- [x] 5.4a 顺带修掉三处**必然失败**的实现：新增用户密码明文提交（后端 RSA 解密 → "密码解密失败"）、伪装成参数的 `client/sms/storage` 标签页（category 非法 → 400，且与已有 `/system/storage`、`/system/sms-config` 页面重复，已删）、租户管理员密码（已核实后端 `TenantDataApiForSystemImpl` 走 RSA 解密，前端加密是对的，无需改）
- [x] 5.7 枚举下发形态核实：裸值（`baseEnumModule` + `BaseEnumSerializer.getValue()`），无需改 `Dict/DictTag` 取值方式
- [x] 5.3 `check-api-contract.mjs` 第三项检查：解析 Liquibase `sys_menu` 种子并**应用后续 changeset 的 UPDATE**
      （不应用会把已被改成 `Layout` 的 `/monitor/log` 误报成缺页面），校验 type=2 菜单 `component` 能否命中 `src/pages` 真实文件，共比对 157 条。
      首跑抓出 1 个侧边栏可见菜单指向不存在页面（`/system/sms/log → monitor/sms/log/index`，页面实际在 `system/sms/log`），
      已用别名页 `src/pages/monitor/sms/log/index.tsx` 兜住；另 10 条隐藏深链菜单缺页面，单列不进门禁，归 `sys_menu` 清理项
- [x] 5.6 日期区间参数：`serializeParams` 上移到 `src/utils/params.ts` 并**在请求层全局生效**
      （原先只有 CRUD 工厂用，手写服务的 `createTime` 仍发 `createTime[]=...` → 后端 `List<LocalDateTime>` 绑成 null）；
      新增 `toSearchDateRange` 处理 ProTable `dateRange` 的 dayjs/字符串混合形态并补当天起止时刻，
      `monitor/log/{login,operation}` 改为重复参数下发，`LoginLogQo/OperationLogQo.createTime` 类型改 `string[]`
- [x] 5.8 jest harness 修复：根因是 `jest-environment-jsdom` 仍锁在 29.7.0，其自带 jest-mock 29.7 的 `ModuleMocker`
      没有 `clearMocksOnScope`，被 jest-runtime 30 调用即抛（症状是"任何用例都跑不了"，连 `expect(1+1)` 也失败）。
      升到 30.5.2 后可运行；补 `tests/requestConfig.test.ts`（11 例：成功透传 / `500·400·401·1` 分派 / 显示后端 `msg` 原文 /
      1.5s 去重 / blob 内 JSON 错误识别 / 真二进制放行 / errorHandler 不重复提示 / 取消请求静默 / 真 HTTP 401 登出）
      与 `tests/serializeParams.test.ts`（8 例，含日期区间与 dayjs 形态）。**19 例全绿**
- [x] 5.9 测试驱动发现并修掉一处兼容缺陷：`Blob.text()` 在部分环境不存在（jsdom 的 `Blob` 即无），
      `RequestConfig.readBlobEnvelope` 与 `utils/download` 改为 `Blob.text()` 优先、`FileReader` 兜底
- [ ] 5.5 Long 精度：后端 `big-number-serialize-mode: FLEXIBLE` 仅在超出 JS 安全整数时转字符串；当前主键为自增小整数不受影响，
      若接入雪花 ID（文件/日志类）需把 `id` 改 `string | number` 并禁用 `Number(id)`
- [ ] 5.10 后端待办：一次 Liquibase —— 修正 2050 行 `component`（`monitor/sms/log/index` → `system/sms/log/index`，改完删别名页）、
      清理 10 条指向不存在组件的隐藏深链菜单、删除已下线的 `/i18n`、`/monitor/log/access`、`/chat` 三行

### 阶段 5 过程中发现并修复的自伤缺陷

阶段 2 的 `serializeParams` 返回了带前导 `?` 的查询串，而 axios 0.27 `buildURL` 会自行补 `?`/`&`，
导致**所有走 CRUD 工厂的 GET 请求拼成 `/path??page=1`、分页与筛选参数失效**（tsc/构建/契约扫描都发现不了）。
已改为不带前导 `?`，并用 node 直接跑 `axios/lib/helpers/buildURL` 验证：

```text
修复后(无前导?): /dev-api/system/user?page=1&size=10&deptId=3
修复前(带?)   : /dev-api/system/user??page=1&size=10
数组重复键    : /dev-api/system/log?page=1&size=10&sort=createTime%2Cdesc&sort=id%2Casc
axios 默认数组: /dev-api/system/log?sort[]=createTime,desc   ← 后端 String[] sort 绑不上
```

并在 `serializeParams` 内加开发期断言 + 新增 `tests/serializeParams.test.ts`（harness 修好前无法执行，已在文件内说明）。

## 6. 功能补齐（P2）

**批次 A（已完成，2026-09-24）** —— 只做"让已有页面变完整"的补齐，不新建需要后端菜单行才能露出的页面。
补齐后 `unusedBackendRoutes` 从 48 降到 43，`matched` 136→141，在用权限码 55→60，`unknownPermissions` 仍为 0。

- [x] 6.5a 站点配置注入：新增 `src/utils/siteSettings.ts`，`GET /system/common/dict/option/site`
      （`@SaIgnore`，登录前可取）按 `SITE_TITLE/SITE_DESCRIPTION/SITE_COPYRIGHT/SITE_BEIAN/SITE_FAVICON/SITE_LOGO`
      映射，写 `document.title`、换 favicon、缓存到 localStorage；`app.tsx` 先应用缓存再静默刷新，失败不阻塞启动
- [x] 6.3a 导出：用户 `GET /system/user/export`、部门 `GET /system/dept/export`、
      登录日志 `GET /system/log/export/login`、操作日志 `GET /system/log/export/operation`，
      全部走 `utils/download`（复用阶段 1 的 blob 错误识别），按钮按 `system:user:export` /
      `system:dept:export` / `monitor:log:export` 门禁
- [x] 6.5b 缓存清理：字典行内"清理缓存"→ `DELETE /system/dict/cache/{code}`（`system:dict:clearCache`）；
      菜单工具栏"清理菜单缓存"→ `DELETE /system/menu/cache`（`system:menu:clearCache`）
- [x] 6.7a 任务分组下拉：任务列表与任务日志的 `groupName` 筛选项改为 `GET /schedule/job/group` 动态取值，不再手输
- [ ] 6.5c 租户开关注入 `GET /system/common/dict/option/tenant`（与 1.7 租户选择流程一并做）
- [ ] 6.1 客户端管理 `/system/client` —— 需要新增页面**且**需要后端 `sys_menu` 加菜单行才能露出，留到与 Liquibase 同批

**批次 B（已完成，2026-09-25）** —— 继续只做"后端已有路由、前端补接口"的部分，不新建需要后端菜单行才能露出的页面。
补齐后 `matched` 141→156，`unusedBackendRoutes` 43→28，在用权限码 60→67，`unknownPermissions` 仍为 0；
`npx jest` 由 19 例增至 26 例（新增 `silent` 选项的端到端用例）。

- [x] 6.2 角色授权 UI 完整化：`UserBind` 补"添加用户"（`UserSelect` 弹窗 → `GET /system/user?roleId=` 挑人
      → `POST /system/role/{id}/user` 裸数组）并加批量解绑。两处关键契约：`UserQuery.roleId` 是
      **排除**语义（`buildQueryWrapper` 里 `notIn(id, listUserIdByRoleId(roleId))`），所以列表天然只含未分配用户；
      `DELETE /system/role/user` 的元素是 `sys_user_role.id`（列表行的 `record.id`），不是用户 ID
- [x] 6.3b 用户导入：模板 `GET /system/user/import/template`、解析 `POST /import/parse`（multipart）、
      提交 `POST /import`（`importKey` + 三个重复项策略 + 默认状态），新组件 `pages/system/user/components/ImportModal.tsx`
- [x] 6.7b 消息中心公告：`pages/user/message` 改为 Tabs（我的消息 / 公告），全部走收件人视角
      `/user/message/**`；原公告详情误接管理端 `GET /system/notice/{id}`（要 `system:notice:get`，普通用户必 403），
      已改 `GET /user/message/notice/{id}`；新增未读公告角标（顶栏铃铛 = 未读消息 + 未读公告）
- [~] 6.4 文件能力：新建文件夹 `POST /system/file/dir`、计算目录大小 `GET /system/file/dir/{id}/size`、
      重命名 `PUT /system/file/{id}`、清空回收站 `DELETE /system/file/recycle/clean`、
      秒传 `GET /system/file/check`（SHA-256 + 静默降级）已接；**分片上传 `/system/multipart-upload/*` 未做**
- [ ] 6.6 数据分析看板补齐（`overview/pv|ip`、`timeslot`、`access/trend/{days}`）
- [ ] 6.8 行为验证码 `POST /captcha/behavior`

**批次 B 附带修的缺陷（2026-09-25）**

- `uploadFile` 之前把 multipart 放在 `body:` 字段（axios 只认 `data:`），文件上传实际是空请求体 → 后端
  `@RequestPart MultipartFile file` 必然报"文件不能为空"。已改 `data:` 并补 `parentPath` 查询参数。
- 回收站"永久删除"按钮原先挂 `system:file:delete`（移入回收站的码），后端要的是 `system:fileRecycle:delete`
  → 只被授予回收站权限的角色看不到该按钮、而超管能看到，权限语义错位。已改。
- `formatFileSize` 在文件列表 / 回收站 / 存储统计三处各抄一份且 0 值处理不一致，统一到 `src/utils/format.ts`。
- 新增 `silent: true` 请求级选项（`RequestConfig`）：可选能力（秒传查重、统计卡）失败时不弹全局提示，
  仍抛 `BizError` 供调用方降级；401 不被静默吞掉。
  注意 `system:file:check` 与 `system:file:statistics` 两个码**只有注解、没有 `sys_menu` 行**，
  除超级管理员外任何角色都无法被授予，需要后端补种子数据才能真正开放。


## 7. 收尾

- [x] 7.1 `npm run check:contract` 达标：`verbMismatch=0`、`noPath=0`、`unknownPermissions=0`、`missingPages=0`（门禁见 `check:contract:ci`）
- [x] 7.2 `npx tsc --noEmit` 通过；`biome lint` 仅剩历史告警；`npx jest` 26 例全绿；`npm run build:zy` 通过；
      契约指标 `matched 156 / unusedBackendRoutes 28 / frontendPermissionCodes 67 / unknownPermissions 0`
- [ ] 7.3 更新根 `doc/管理后台前端对齐Continew方案.md` 的实际完成情况与遗留后端待办（每阶段收口时同步）
- [ ] 7.4 `openspec archive align-backend-contract`（阶段 1-5 完成后，含真实后端冒烟通过）
