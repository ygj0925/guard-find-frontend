## 1. 审计与设计基线

- [x] 1.1 记录六仓版本和工作区，完成 App/小程序 IM、鸿蒙、后台与流程底座源码初审
- [x] 1.2 确认通用企业 OA、首期仅后台 Web；编写 proposal/design 与五项能力规格
- [x] 1.3 运行 OpenSpec 严格校验，记录设计尚未等同实现
- [ ] 1.4 确认现网移动端发布约束、多副本情况及隔离测试环境，核验实际 Java/Boot/数据库版本

## 2. A1 小程序连接修复

- [x] 2.1 用真实 uni Promise 包装行为复现连接缺陷，修复 callback/SocketTask 返回与错误处理
- [x] 2.2 实现失效代次隔离、建连/pong 超时、send fail 和退避重连；覆盖迟到回调/无 token/取消订阅
- [x] 2.3 在 H5 开发服务用本地 WebSocket 模拟端验证真实运行时连接、消息和断线；跑类型、测试、lint、mp 构建

验证记录：小程序类型检查、两文件 ESLint、微信构建通过；Vitest 9文件69测试通过，其中连接测试34项。H5 真实 uni 运行时对本地模拟 WS 成功建连、收到字符串超大ID消息、服务器关闭后重连、收到 pong、最后退订后连接数归零。测试不使用真实用户凭据，未验证真实 Java 后端/微信真机；聊天页面的轮询、账号生命周期仍属于第3节待办。App 原有类型检查及14组95测试通过，仅作现状基线，不覆盖新发现的 IM 并发缺陷。

## 3. A2 小程序页面生命周期

- [x] 3.1 聊天页统一单飞补拉、队列合并、单调读取游标与旧响应失效测试
- [x] 3.2 登录恢复、退出/换号、隐藏/显示仅驱动当前有效会话，清除跨账号消息和游标
- [x] 3.3 会话列表增加可见期间兜底及重连补拉，客服未读按后端实际契约接通
- [x] 3.4 浏览器验证普通聊天/客服/100+补拉/导航/退出；记录微信真机未验或实测证据

3.1–3.4 验证记录：聊天同步提取至 `chatSync.ts`，按可见页面和 token 代次单飞排空，100 条分页续拉且游标单调；列表页可见时轮询兜底、连接恢复立即补拉，客服未读改用新增只读 `GET /miniapp/im/support/unread`（不计 USER 方向、不标已读）。小程序类型检查、11 文件 90 测试、相关 ESLint、微信构建和 `git diff --check` 通过。H5 浏览器实测 105 条消息分两页补齐、发送期间对方新消息随后仍被拉取、发送回包未推进读取游标、退出后清除消息并停止请求；客服页能显示客服消息并走 `/support/messages`。H5 的 REST 响应为浏览器内注入的模拟数据，未连接真实 Java 后端，也未做微信真机验收。

## 4. A3 App 与 server IM

- [x] 4.1 App 提取去重/游标与单飞补拉逻辑，修复发送推进游标及草稿覆盖，增加并发回归
- [x] 4.2 App 按焦点、AppState、账号代次管理聊天、轮询和连接，验证退出/切后台不自动已读
- [x] 4.3 server 握手绑定令牌，推送时校验身份有效性、字符串ID、串行安全发送，退出撤销回归
- [x] 4.4 server 普通/客服消息改提交后推送，回滚无事件测试
- [ ] 4.5 明确分页/已读协议发布顺序，实现有界读取、实际已读范围、消息写入顺序并同步 App
- [ ] 4.6 真实数据库验证并发写入/已读/游标；补 app/server 联调与受限用户回归

4.1–4.2 验证记录：App 聊天同步提取至 `lib/im/chat-sync.ts`，按页面/身份代次单飞排空，消息按十进制字符串 ID 去重排序，100 条整页续拉且游标单调；发送回包只并入列表、不推进读游标，失败时仅在输入框为空时恢复原文。聊天页改用可见 + AppState 双重门控，退出/切号清空消息、游标与发送态，失焦或后台停止读取、轮询与订阅。`im-realtime` 在 token 变更时关闭旧连接并以新 token 重建，后台断开、回前台恢复，重连定时器可取消，迟到 socket 帧不派发；会话列表增加通配推送、可见轮询、前后台判断与退出清空。验证：App 类型检查通过，16 个测试套件 109 项全部通过（新增聊天同步 8 项、连接生命周期 6 项），改动文件 ESLint 零警告。未在 Android/iOS/鸿蒙真机或模拟器运行，未连接真实 server/MySQL/Redis；全仓 ESLint 仍有 13 条既有未使用变量警告，不在本批范围。

4.3 验证记录：定向 Maven 测试通过，Surefire 核对 ImWebSocketSecurityTest 57项、ImAppBoundaryTest 2项、AdminImServiceImplTest 5项，失败/错误/跳过均为0。覆盖撤销令牌、禁用账号、字符串大ID、多连接清理及串行发送；使用无容器 mock，不代表真实 Redis/MySQL 或 App 联调完成。执行时禁用 Spotless/flatten 自动改写，REST 事务及分页仍待4.4–4.6。

4.4–4.5 部分验证记录：server 推送改由 `AfterCommit` 在事务提交后执行，回滚不推送；发送前 `SELECT ... FOR UPDATE` 锁会话行，串行未读与摘要更新。普通消息与客服消息查询均加 `LIMIT 100`，且只标记本次返回的对方/客服未读消息并按其数量递减未读，不再一次性清零未返回历史。新增 `ImTransactionPagingTest` 4 项；与既有 IM 回归合计 68 项通过，0 失败/错误/跳过。尚未完成：无 `afterId` 时仍返回最早 100 条（客户端需多页排空），分页/已读协议的版本化发布顺序与 App/小程序对齐、真实 MySQL 并发与慢查询验证仍待 4.5–4.6。

## 5. A4 消息体系补强

- [x] 5.1 backend 客服消息提交顺序及会话锁并发验证与修复
- [ ] 5.2 核查两服务的消息删除归属、历史分页和后台会话权限，补真实越权测试
- [ ] 5.3 按实际多副本部署需求实现事件路由/可靠投递；单副本交付明确限制
- [ ] 5.4 记录 WS 对静默请求量/延迟的前后测量，不宣称无数据的收益

5.1 验证记录：`AdminImServiceImpl.send` 补 `@Transactional(rollbackFor = Exception.class)`，客服回复落库与 `afterCommit` 推送恢复为“先提交、后推送”；无事务时 `AfterCommit` 会退化为立即推送，原实现存在推送先于提交的窗口。新增 3 项回归：注解存在性、事务未提交不推送/提交后推送一次、回滚不推送；另验证账号禁用或不存在时不落库。`ImRegressionTest` 15 项通过（0 失败/错误/跳过）。会话锁并发仍沿用 C 端 `lockById` 覆盖，客服侧无会话行可锁，依赖单条插入与 ID 顺序；真实 MySQL 并发与多副本推送仍未验证。

5.2 部分核查：后台客服接口已按 `system:im:list`/`system:im:send` 分权，C 端读取/发送/已读/删除均经 `lockById` 成员校验，删除仅隐藏自己视角、不清共享摘要；两个服务均无“按消息 ID 删除他人消息”的入口。server 后台客服实现已对齐 backend：首屏最近 100 条、增量最多 100 条、只标记本次返回的用户消息、禁用账号拒绝发送、回复改为提交后推送；`AdminImServiceImplTest` 9 项通过。历史分页仍为无游标时最早 100 条（后台客服为最近 100 条），客户端靠前向排空补齐，尚未提供加载更早消息的接口。真实数据库越权与并发场景待 4.6/5.2 收口。

## 6. B1 鸿蒙基础

- [ ] 6.1 核查实际持久化驱动与安全随机数接线，修复无安全源时错误降级，补单测
- [x] 6.2 核对 App/server 上传路径、认证和大小/类型/归属，完成非原生契约修复
- [ ] 6.3 经 CLI 检查兼容矩阵、生成/同步原生工程；按输出确定媒体/复制/分享适配路径
- [ ] 6.4 实现受支持的原生能力并记录每项支持/不支持，不改写托管文件绕过 CLI
- [ ] 6.5 鸿蒙真机验证签名包冷启动、存储、导航、媒体、分享、弱网和脱离 Metro 运行

6.1 部分进展：安全随机数已改为拒绝采样，缺少 `crypto.getRandomValues` 时直接返回 null，不再降级 `Math.random`；密码页在无安全源时提示“已停止生成”。新增无安全源单测。持久化仍是 `kv` 内存/web 驱动：项目未安装任何原生存储包，`pnpm dlx expo-harmony-cli install @react-native-async-storage/async-storage` 在本机长时间无输出后终止，未产生依赖或原生工程改动。已给驱动增加 `persistent` 标记与 `isKvPersistent()`，内存态不再被诊断标签伪装成已落盘；原生驱动注册与杀进程重启验证仍阻塞于 CLI/网络环境。App 类型检查、17 套件 113 项测试与改动文件 ESLint 通过。

6.2 证据：原 App 指向的 `/file/upload` 在 server 无任何处理器（后台仅 `/system/file/upload`、公共仅 `/system/common/file`），真机上传必然 404。已新增 `AppFileController` 的 `/app/file/upload`：强制登录态用户 ID、目录白名单 `case|lead|avatar|report|post`、仅图片 MIME + `jpg/jpeg/png/webp/gif`、5 MB 上限、按 `app/{userId}/{folder}/yyyy/MM/dd` 隔离归属；App 统一改走该端点。`AppFileControllerTest` 5 项通过（成功、非图片、超限、非法目录/空文件、未登录 401）；App 新增上传契约单测钉死路径/字段/60s 超时，类型检查、18 套件 114 项测试与改动文件 ESLint 通过。未连接真实存储服务或真机，6.3–6.5 的鸿蒙验收仍未开始。

## 7. B2 App 小工具

- [x] 7.1 server 添加便笺表/分页CRUD/归属与版本冲突测试
- [ ] 7.2 App 便笺列表/编辑/检索/归档页面及接口接线，浏览器与鸿蒙验收
- [x] 7.3 server 添加收纳物品表/分页CRUD/数量及归属和版本测试
- [ ] 7.4 App 收纳列表/编辑/位置检索页面及接口接线，失败状态与跨账号缓存验收

7.1–7.2 部分验证记录：server 新增 `gf_tool_note`（changeset guardfind:44）及 `/app/tool/note` 分页 CRUD、置顶/归档切换；读取/更新/删除逐条校验 `user_id`，修改必须携带 version 并条件更新 `version=version+1`，冲突返回 4002。`ToolNoteServiceImplTest` 7 项通过（归属、缺版本、版本冲突、切换范围、分页过滤与页大小上限）。App 新增 `/tools/notes` 页面与工具入口，支持搜索防抖、便笺/归档切换、置顶/归档/删除、分页加载和底部编辑弹层；类型检查、109 项测试与改动文件 ESLint 通过。未连接真实 server/MySQL，未做浏览器或鸿蒙实机验收，7.2 保持未完成。

7.3–7.4 部分验证记录：server 新增 `gf_tool_item`（changeset guardfind:45，含 `quantity >= 0` CHECK 与 `(user_id, archived, location, name)` 索引）及 `/app/tool/item` 分页 CRUD、数量增减、归档；数量扣减先校验非负，再以 `quantity = 当前值` 条件更新，并发变化返回 4002，修改同样携带 version。`ToolItemServiceImplTest` 9 项通过（归属、负数拒绝、版本冲突、CAS、归档范围、分页过滤与页大小上限），工具类合计 16 项通过。App 新增 `/tools/items` 页面与“物品收纳”入口：按位置分组、搜索防抖、数量 +/- 乐观更新并在冲突时回刷、归档/删除、分页与编辑弹层；类型检查、109 项测试和改动文件 ESLint 通过。未连接真实 server/MySQL，未做浏览器或鸿蒙实机验收，7.4 保持未完成。

## 8. C1 后台性能基线

- [ ] 8.1 建立隔离数据集和接口/浏览器基线，记录实际环境、SQL与业务错误率
- [ ] 8.2 量化用户角色装配SQL次数，确认后实现整页批量查询及权限回归
- [ ] 8.3 对实际房源查询做执行计划，按收益新增索引/游标，记录写入代价
- [ ] 8.4 验证文件统计缓存与菜单失效优化，回归租户/角色撤权即时生效
- [ ] 8.5 验证参数列表和用户弹窗懒加载收益，生产构建深链与冷/热性能对比

## 9. C2 BPMN 技术底座

- [x] 9.1 核验 Flowable 候选版本与 Boot/Jakarta/JDK、数据库和许可证，隔离运行最小引擎集成测试
- [x] 9.2 确定迁移所有权，接入引擎及事务/租户适配，验证重启和定时器恢复
- [x] 9.3 建立流程模型/发布/表单版本/申请/审计/outbox/幂等表迁移与索引
- [x] 9.4 接通员工、岗位、主管与候选解析；空审批人/离职员工的发布或执行拦截
- [x] 9.5 实现 XML 安全校验、节点白名单、条件规则编译与受控服务任务
- [x] 9.6 前端集成懒加载 bpmn-js 画布、属性、导入导出、校验与预览
- [x] 9.7 模型发布/停用与版本绑定API/页面，验证旧实例不迁移
- [ ] 9.8 表单设计/渲染/前后端校验及字段可见/可写策略，冻结发布版本

9.1 证据：候选版本锁定 Flowable 7.2.0（BOM 对应 Boot 3.5.4 / Spring 6.2.10，与本项目 Boot 3.4.10 / Spring 6.2 同代；Jar 清单声明 Apache-2.0；8.0.0 面向 Boot 4 不可用，7.1.0 落后一代）。以 test 范围依赖在 `guard-find-backend-system` 增加隔离测试：`FlowableEngineCompatibilityTest` 3 项通过（H2 建表+部署+排他网关完成+历史、计时器 Job 转可执行并推进、文件库引擎重启后任务仍在并可完成）；`FlowableSpringBootCompatibilityTest` 1 项通过（Boot 自动配置在只装 DataSource + 事务管理器时创建 ProcessEngine）。同时发现 7.2.0 的 process starter 在干净类路径缺少 `flowable-spring-configurator` 与 `flowable-app-engine-spring`，启动即 `NoClassDefFoundError`，已显式补齐并在 design.md 记录，9.2 生产接入必须保留该回归。未连接项目 MySQL/Liquibase，未做多副本或长稳测试；生产模块归属与事务/租户适配仍在 9.2。

9.2 证据：迁移所有权归 Liquibase，应用侧关闭引擎自动建表。新增 `guard-find-backend-plugin-oa` 模块（api 依赖），把 Flowable 7.2.0 官方 MySQL 建表脚本原样纳入 `db/changelog/mysql/oa/{common,process,history}.sql` 并加入 master changelog；配置 `flowable.database-schema-update=false`，仅启用 process 引擎，app/cmmn/dmn/idm/eventregistry 关闭；`OaFlowableConfiguration` 设置历史级别 FULL、禁用 IDM 与事件注册，并用 BFPP 给 `springProcessEngineConfiguration`/`processEngine` 追加 `depends-on=liquibase`，保证迁移先于引擎初始化；`OaEngineTemplate` 所有入口强制显式 tenantId，任务查询/完成/领取均带租户条件且领取幂等。`OaEngineIntegrationTest` 7 项通过：仅建 process 表且无 ACT_ID 表、无 AppEngine；租户 A/B 任务互不可见且跨租户完成被拒；跨租户领取被拒、重复领取幂等；外层事务回滚后无流程实例与任务；文件库重启且在 `schema-update=false` 下仍可读取并办结任务；重启后定时器 Job 仍在库中、转可执行并推进到用户任务；存在 liquibase Bean 时 processEngine 的 dependsOn 生效。`OaEngineLiquibaseMySqlTest` 在本地 MySQL 8.4 隔离库 `guard_find_oa_verify` 实测：3 个 changeset 成功，`common.schema.version` 与 `schema.version` 均为 7.2.0.2，关闭自动建表后引擎启动并完成部署/发起/办结，验证后已删除该库。边界：异步执行器仍关闭，定时器恢复为引擎级手工执行验证，未开启自动触发；未用项目开发库启动完整应用，多副本与长稳未验证。

9.3 证据：10 张 OA 业务表迁移全部落地并接入 master changelog。`oa_process.sql`：`oa_process_model`（租户内 model_key 唯一、草稿 XML/摘要、生效版本指针、绑定表单版本、乐观锁）、`oa_process_release`（发布 XML 冻结、引擎定义 ID 全局唯一、租户+模型+版本唯一、表单版本绑定、可发起范围、不可变无 update/delete 列）。`oa_form.sql`：`oa_form`（租户内 form_key 唯一、当前版本指针、乐观锁）、`oa_form_version`（租户+表单+版本唯一、schema 快照与摘要、不可变）。`oa_application.sql`：`oa_application`（租户+业务类型+业务单号唯一、流程实例 ID 全局唯一、发布/表单版本绑定、申请人及部门快照、提交数据快照、状态与乐观锁）。`oa_approval_audit.sql`：`oa_approval_audit`（不可变、租户+request_id 唯一防重试重复轨迹、记录实际操作人/原审批人/理由/决策明细）。`oa_cc_receipt.sql`：`oa_cc_receipt`（租户+申请+接收人唯一、未读/已读与读取时间）。`oa_attachment.sql`：`oa_attachment_link`（租户+file_id+deleted 唯一、申请/业务单号归属、扫描状态与可下载标记，裸 fileId 不构成授权）。`oa_outbox.sql`：`oa_outbox`（event_id 全局唯一、聚合与事件类型、PENDING/FAILED 重试时间、租户+聚合索引）。`oa_request_dedup.sql`：`oa_request_dedup`（租户+操作人+命令+request_id 唯一、结果快照与过期时间）。master changelog 与验证 changelog 均已接入；MySQL 8.4 隔离库实测 11 个 changeset 全部成功、10 张表字段/索引齐全，`OaEngineLiquibaseMySqlTest` 2 项通过（引擎启动/办结；租户内 model_key/form_key/表单版本、全局引擎定义 ID/流程实例 ID/outbox event_id、申请业务单号、审计 request_id、抄送接收人、附件 file_id、幂等四元组重复均被拒，跨租户重复 model_key/form_key/申请业务单号/附件 fileId/幂等请求被允许，全局 event_id 跨租户重复被拒）。边界：实体/Mapper/API 与清理、重试作业尚未编写（由 9.4 起及 10.x 承接）；未在项目开发库启动完整应用，多副本与长稳未验证。

9.4 证据：员工组织与候选解析落地。`oa_staff.sql` 新增 `oa_position`（租户内 code 唯一、启用/停用）、`oa_employee`（租户内 user_id 唯一、工号唯一、直属主管、ACTIVE/SUSPENDED/RESIGNED、部门负责人标记）、`oa_employee_position`（租户+员工+岗位唯一），部门以 `sys_user.dept_id` 为准；master changelog 与验证 changelog 均已接入。`OaAssigneeResolver` 仅接受结构化的 `OaAssigneeSpec`，支持指定员工、岗位、部门负责人、发起人直属主管、受控表单人员字段五种来源；`JdbcOaStaffDirectory` 每条 SQL 显式带 tenant_id，并以 `oa_employee.employment_status='ACTIVE'` 且 `sys_user.status=1` 判定在职，跨租户、离职、停用账号一律拒绝。发布校验拒绝不存在的/停用的/无在职员工的岗位和离职/跨租户指定员工；部门负责人、直属主管、表单字段依赖具体发起人，发布时只校验结构，执行时为空即失败。`OaProcessLauncher` 在调用引擎前解析全部候选变量，失败抛出 `OaAssigneeUnavailableException` 且不写引擎；`OaAssigneeResolverTest` 6 项、`OaProcessLauncherTest` 5 项通过（有效候选可见任务、空岗位/离职发起人/跨租户表单人员/离职主管均无流程实例与任务、员工/岗位/主管/部门负责人/表单字段解析与去重、发布校验）。模块合计 20 项测试，MySQL 2 项在无环境变量时跳过。真实 MySQL 8.4 隔离库：14 个 changeset、13 张 OA 业务表成功，岗位 code、员工 user_id/工号、员工岗位四元组重复被拒且跨租户同名允许，验证后已删库。边界：尚未提供员工/岗位 CRUD API 与页面，也没有实体/Mapper（当前为显式 SQL 只读目录）；候选解析只覆盖发起时已知变量，后续节点需在任务创建监听复用解析器；存量待办在员工离职后不会自动转交（10.3）；代理规则表 `oa_delegate_rule` 未建；未在项目开发库启动完整应用，多副本与长稳未验证。

9.4 续证据：员工/岗位 CRUD 与选择器落地。`oa_staff_manage.sql` 为 `oa_employee`/`oa_position` 增加乐观锁 `version`，新增员工管理 `/oa/employee`（菜单 9630、权限 9631-9633）与岗位管理 `/oa/position`（菜单 9640、权限 9641-9643），授权从已具备 `system:user:list` 的角色与租户套餐复制；菜单 ID 原先规划的 9610/9611 与 10.2 审批菜单冲突，改为 9630 段后随 Liquibase 在本机 dev 库执行成功。后端 `/system/oa/staff` 提供员工分页/详情/创建/更新、员工选项/可建卡用户选项，以及岗位分页/详情/创建/更新/启用选项；创建员工只接受当前租户启用且尚未建卡的后台用户，工号租户内唯一，直属主管必须是在职员工且逐级回溯拒绝环路，岗位必须属于本租户且启用，ACTIVE 清空离职日期、RESIGNED 未填默认当天，更新以 `version` 条件更新并返回明确冲突提示。前端新增员工/岗位管理页与 `OaEmployeeSelect`/`OaPositionSelect`，表单 person 字段和发起页 EMPLOYEE/POSITION 审批人绑定改为从本租户选项选择，不再手输员工 ID/岗位编码。测试证据：`OaStaffServiceTest` 6 项通过，OA 模块 105 项运行 0 失败/错误、2 项 MySQL 用例无隔离库环境变量跳过；后端全量 196 项运行 0 失败/错误、2 项跳过。前端新增 `oaStaffManage` 套件 6 项，`oaFormFill`/`oaLaunchFill` 改为选择器交互并补选项 mock；全量 Jest 38 套件 227 项通过，`tsc --noEmit`、改动文件 Biome 与契约检查（verbMismatch 0、noPath 0、unknownPermissions 0、missingPages 0）通过。边界：未做浏览器实机验收；岗位不提供物理删除，只支持创建/改名/排序/停用；person 字段只列已建 OA 档案的在职员工；离职员工存量待办仍未自动转交（10.3）；不得据此宣告 OA 可交付。

9.5 证据：BPMN 发布前校验与受限条件编译落地。`OaBpmnValidator` 用命名空间感知 DOM 解析：关闭 DOCTYPE/外部通用与参数实体/外部 DTD、启用 secure processing、`ACCESS_EXTERNAL_DTD`/`SCHEMA` 置空并由实体解析器直接抛错；预检 `<!DOCTYPE`/`<!ENTITY`，并限制 512KB、200 个流程节点、2000 个元素、50 层嵌套与 40 条错误上限；对原始字节计算 SHA-256 作为发布指纹。节点白名单只含 definitions/process/startEvent/endEvent/userTask/serviceTask/exclusiveGateway/parallelGateway/boundaryEvent/sequenceFlow/conditionExpression/timerEventDefinition/timeDuration/timeDate/timeCycle/incoming/outgoing，另放行 bpmn-js 的 BPMNDiagram/BPMNPlane/BPMNShape/BPMNEdge/BPMNLabel、dc:Bounds 与 di:waypoint；scriptTask、callActivity、subProcess、extensionElements、camunda/activiti 属性及任意 Flowable 子元素一律拒绝。结构校验要求单流程且 isExecutable=true、id 全局唯一、开始/结束事件存在、连线引用有效、开始事件不可作为目标、边界定时器只能挂用户任务、条件只能出现在排他网关输出连线且默认连线有效、默认连线不能配置条件、用户任务至少配置 assignee/candidateUsers/candidateGroups 之一（仅简单变量或安全字面量）、排他网关多出口除默认连线外必须有条件。受控服务任务只接受 `flowable:class`，且必须在 `oa.bpmn.allowed-service-handlers` 逗号白名单内，默认空白名单即全部拒绝；`flowable:expression`/`delegateExpression` 等一律拒绝。`OaConditionRuleCompiler` 把结构化 AND/OR 条件编译为受限 EL（EQ/NE/GT/GE/LT/LE/IN/NOT_IN，字段只允许标识符/点路径，值仅数字/布尔/字符串或集合，字符串转义），再经 `OaConditionExpressionValidator` 词法/语法复核：只允许变量、字面量、比较、括号与 &&/||/!，拒绝方法调用、构造函数、`T(...)`、Bean 引用、三元、算术与 EL 关键字。新增 `OaBpmnValidatorTest` 17 项、`OaConditionRuleCompilerTest` 9 项、`OaBpmnValidationConfigurationTest` 2 项通过（合法含 DI 模型、DOCTYPE/XXE、scriptTask、扩展元素、服务任务白名单与表达式、空审批人、不安全候选/条件、并行网关条件、边界事件挂载、缺失开始结束、重复 id/断链、超限、摘要变化）；模块合计 48 项，2 项 MySQL 用例无环境变量跳过，其余 46 项通过。边界：校验器尚未接入发布/部署事务与版本落库（9.7），当前只验证 XML，不实际部署；服务任务白名单是类名字符串校验，不验证类是否存在或实现 JavaDelegate，最终由引擎部署报错兜底；条件仅做语法与安全校验，未在真实引擎上执行语义回归；DI 只做元素/属性放行，未校验图形引用完整性；未在项目开发库启动完整应用。

9.6 证据：流程设计器前端落地。新增 `/oa/process/design` 页面（`src/pages/oa/process/design/index.tsx`）及 `OaBpmnCanvas`、`bpmnLoader`、`flowableModdle`、`OaBpmnProperties`、`OaConditionBuilder`、`OaBpmnPreview` 组件，`src/utils/oaBpmn.ts` 提供与服务端同构的前端预检、默认模型与受限条件编译。bpmn-js 18.31.1 的 `Modeler`/`NavigatedViewer` 通过 `import()` 懒加载，不进入设计页首屏；`FLOWABLE_MODDLE` 只声明 assignee/candidateUsers/candidateGroups 与 serviceTask class，导入导出保留审批人与处理器。页面支持新建（脏标记确认）、导入 `.bpmn/.xml`、导出当前 XML、校验、只读预览、撤销/重做/适应画布；属性面板按选中节点编辑名称、用户任务三种审批范围、服务任务处理器、排他网关默认连线、边界定时器与连线条件，条件构建器把 AND/OR 结构化条件编译为受限 EL。前端预检拒绝 DOCTYPE/ENTITY、超 512KB、超 200 流程节点/2000 元素、非白名单节点/属性、非法审批范围/定时器/条件，并校验开始/结束事件、连线引用、边界事件挂载与网关默认连线；服务端仍是最终裁决方。真实 bpmn-js 运行时用临时 Node+jsdom 脚本冒烟（未入库）验证了名称、候选审批人、条件、默认连线与定时器序列化，并发现 bpmn-js 会在一处互斥地清空“默认连线”或“连线条件”，因此客户端与服务端校验同时新增“默认连线不能配置条件”，属性面板对默认连线隐藏条件编辑；`OaBpmnValidatorTest` 新增 `rejectsConditionOnDefaultFlow`，17 项通过。前端 `tests/oaBpmn.test.ts`、`oaBpmnProperties.test.tsx`、`oaConditionBuilder.test.tsx`、`oaProcessDesign.test.tsx`、`oaBpmnCanvas.test.jsx` 共 45 项通过，`tsc --noEmit` 通过，`build:zy` 成功（12.9s）并确认页面 chunk（约 48KB）异步引用 bpmn-js chunk（约 322KB）。边界：保存/发布 API 未接（9.7），发布按钮禁用；`sys_menu` 尚无 OA 菜单，`RouteAccess` 可能拦截该路由，需 9.7 一并补菜单与权限；未在真实登录态浏览器连接后端走完整流程；画布 Jest 用例使用假构造器验证组件接线，真实 bpmn-js 仅由临时脚本冒烟，未纳入 CI；前端预检只做设计期提示，不替代服务端校验。

9.7 证据：流程模型发布/停用与版本绑定落地。后端新增 `OaProcessModelController`（`/system/oa/process/model`）、`OaProcessModelService` 与显式租户 `OaProcessModelRepository`：草稿分页/详情/创建/保存（乐观锁 version）、XML 校验、发布、停用、发布版本列表；列表 SQL 不读取 `bpmn_xml`，详情才下发完整 XML。发布在同一事务内完成服务端 `OaBpmnValidator` 复核、流程 Key 稳定性与跨模型占用检查、可选表单版本校验（必须属于当前租户）、Flowable 部署、不可变 `oa_process_release` 写入、旧 ACTIVE 版本停止与模型指针/状态更新；任一步失败回滚，不产生半套版本。发布后再次发布生成新版本，旧运行实例仍绑定原流程定义；停用只停止 ACTIVE 发布记录，不终止或迁移运行中实例，之后可通过再次发布恢复。新增 `oa_menu.sql`：流程管理/流程模型/隐藏设计器菜单（9500/9510/9520）与 list/create/update/publish/disable 权限（9530-9534），并仅向已具备 `system:user:list` 的角色与租户套餐复制授权。`OaProcessModelServiceTest` 5 项通过：创建草稿并拒绝过期版本；发布绑定表单版本并激活发布记录；v1 实例在发布 v2 后仍按 v1 完成、新实例使用 v2（旧实例不迁移）；非法 XML 不产生部署或发布记录；停用后可重新发布，且其他模型占用同一流程 Key 被拒。OA 模块合计 54 项测试，52 项执行通过，MySQL 2 项因无 `OA_MYSQL_URL` 跳过。前端新增 `src/services/web/guardfind/oa.ts`、`/oa/process` 模型列表页与设计页按 `id` 绑定：列表支持搜索/状态筛选、新建（按模型标识生成独立流程 Key 的默认 XML）、设计、发布（可选表单版本/发起范围/说明，服务端拒绝时在弹窗展示错误）、停用、版本历史；设计页支持加载模型、保存草稿（携带乐观锁版本）、前端预检后调用服务端校验、发布前自动保存未保存修改、停用确认，并展示模型状态/草稿版本/当前发布版本。`oaProcessList.test.tsx` 4 项、`oaProcessDesign.test.tsx` 9 项、扩充后的 `oaBpmn.test.ts` 25 项及 `endpointShapes.test.ts` 的 OA 端点形状用例通过，OA 相关 7 个套件合计 70 项通过；`tsc --noEmit` 通过，`build:zy` 成功并确认 `oa/process/index` 与 `oa/process/design/index` 路由进入产物。边界：`oa_menu.sql` 未在真实 MySQL 执行（本机 MySQL 无可用凭据，MySQL Liquibase 用例跳过），仅做静态审查；未在真实登录态浏览器连接后端走完整“新建→设计→保存→发布→停用”链路；发布时未调用 `OaAssigneeResolver` 校验岗位/员工存在性与在职状态，审批人来源仍只做结构校验；发起入口尚未读取发布状态/可发起范围做拦截（随 10.1）；列表页未提供名称/分类/说明的编辑入口，创建后元数据暂不可改。

## 10. D1 审批中心

- [x] 10.1 发起/草稿/待办/已办/抄送/详情/轨迹 API 和页面，双租户访问回归
- [x] 10.2 实现幂等完成/驳回/限定撤回/限定退回与不可变审计
- [x] 10.3 实现候选领取、转交、限时代理，验证同租户和代理环限制
- [x] 10.4 实现会签策略与并发完成/取消剩余任务回归
- [ ] 10.5 私有附件上传下载与实例授权，越权/过期链接/文件限制测试
- [x] 10.6 outbox 通知、催办限频、超期计时、失败重试和运维终止授权

10.1/10.2/10.5 浏览器实机验收证据（2026-11-08）：在隔离 MySQL 库 `gf_oa_e2e_1108`、Redis DB 15 上启动完整后端（:8000）与前端（:9002），关闭登录验证码，以 admin/test 真实账号走通员工/岗位页与选择器、表单 v1 + 流程发布 v1、3 个申请的发起填写（日期/人员/附件/文本）、我的申请列表与详情、审批中心待办/已办、审批通过、驳回、申请人撤回及附件下载；验收后删库、清空 Redis DB 15、释放端口并停止进程。数据库核对：申请 1 `APPROVED`（审批通过意见与审计一致，`act_ru_task` 清空、历史实例结束），申请 2 `WITHDRAWN`（含 WITHDRAW 审计），申请 3 `REJECTED`（含 REJECT 审计与 task_id）；`oa_attachment_link` 有归属行，附件下载返回 200 `text/plain`；`form_data` 中 18 位 fileId 与人员 ID 均按字符串保存。验收中修复：`OaAssigneeContext` 误拒默认租户 0；前端 `oaAttachmentFileId` 对雪花 ID 的安全整数校验误判；申请/审批详情 fileId 字符串归一；补齐 `menu.oa.tasks`/`menu.oa.tasks.detail` 中英文案（控制台缺键告警消失）。边界：退回上一人工节点仅单测覆盖（发布模型只有一个审批节点，未做实机退回）；审批详情/申请详情人员字段仍显示用户 ID 而非姓名；隐藏页面自动化下附件删除与重置点击未触发 React 处理器，待常规浏览器复核；抄送、双租户浏览器回归与 outbox 未覆盖，10.1/10.2/10.5 仍不勾选完成。

10.3 证据：候选领取、转交、限时代理与离职待办转交落地。`oa_delegate_rule.sql` 新增按租户隔离的代理规则表（启用/停用、时间窗、软删除采用 `deleted=id` 释放唯一键），`oa_delegate_menu.sql` 增加 `system:oa:delegate:manage`（9614）与 `system:oa:employee:transfer`（9634），授权从已具备 `system:user:list` 的角色/套餐复制，master changelog 与 OA 验证 changelog 均已接入。后端新增：`OaApprovalEngine.claim/reassign/removeCandidateLinks/runningTasksOfUser`；`OaDelegateRepository`/`OaDelegateService`（仅启用且窗口覆盖当前时间生效，同一委托人-代理人窗口不可重叠，窗口上限 90 天，A→B→A 代理环在写入前 BFS 拒绝）；`OaApprovalService.claim/transfer` 复用 requestId 幂等与不可变审计，代理访问通过 `proxyForId` 标记并在通过/驳回/退回时写入审计详情；`OaTaskHandoverService` 把员工名下候选或已领取任务逐条转交并清空候选链接，审计 `original_assignee_id` 保留原处理人；员工状态改为 RESIGNED 时优先自动转交直属主管，主管不可用时不阻塞离职办理，管理员可用 `POST /system/oa/staff/employee/{id}/handover` 手工补转。前端审批中心新增“限时代理”弹窗（创建/查看/取消，时间窗与 90 天前端校验）、待办“代某某”标签、详情页候选领取与已领取任务转交；员工页离职档案增加“转交待办”。测试证据：新增 `OaApprovalServiceTest` 5 项（领取幂等与他人领取被拒、未领取不可转交/转交后候选身份清理、代理待办/详情/代审批审计、代理重叠与环路/窗口上限/无权取消、离职转交候选任务），OA 模块 110 项运行 0 失败/错误、2 项 MySQL 用例无环境变量跳过；前端新增/扩充 `oaTaskList`、`oaTaskDetail` 共 10 项，OA 相关 20 个套件 117 项通过，`tsc --noEmit` 与改动文件 Biome 通过。边界：尚未做 10.3 浏览器实机验收；代理规则只支持创建与取消，不支持编辑时间窗；代理访问不做二次委托展开（仅一层委托人任务）；离职自动转交以更新前直属主管为准，主管同时离职时需手工指定；转交不改变流程节点与历史审批记录，仅改变当前任务处理人；不得据此宣告 OA 可交付。

10.4 证据：会签策略与并发完成/取消剩余任务落地。后端新增 `OaCountersignConditionValidator`，只接受 `${nrOfCompletedInstances / nrOfInstances >= 0.6}` 这类由 `nrOfCompletedInstances`/`nrOfActiveInstances`/`nrOfInstances` 与数字做四则运算后比较的完成条件，拒绝方法调用、属性访问、字符串、布尔逻辑与嵌套花括号，上限 200 字符；不写完成条件即全票通过。`OaBpmnValidator` 放行 `multiInstanceLoopCharacteristics` 与 `completionCondition`，要求 elementVariable 为合法变量名、collection 必须写成 `${变量List}`、会签用户任务 assignee 必须等于 `${变量}`、不得配置 candidateUsers/candidateGroups、isSequential 仅 true/false，并复用完成条件白名单；会签 assignee 变量仍进入发起时需绑定的审批人变量集合，但不再要求只解析出一名员工。`OaProcessLauncher` 对每个审批人变量同时写入逗号串和“变量名 + List”的集合，供多实例逐项创建任务。`OaApprovalEngine` 新增 `isMultiInstance`/`wasCancelled`（按历史任务 deleteReason 判定非正常完成），`OaApprovalService` 在通过/驳回后把 `countersign`、`cancelledTaskIds`、`cancelledAssignees`、`cancelReason` 写入不可变审计：比例通过达到阈值后引擎自动终止剩余任务；驳回删除流程实例实现一票否决并取消剩余任务。测试证据：`OaApprovalServiceTest` 15 项通过（新增比例通过并取消剩余、全票等待全部审批且幂等回放、驳回一票否决并取消剩余、比例阈值后仅取消剩余任务），`OaBpmnValidatorTest` 23 项通过（新增接受会签与变量多值、拒绝不安全完成条件、拒绝集合/审批人变量不一致、拒绝会签候选范围），均 0 失败/错误。前端设计器同步支持会签：`src/utils/oaBpmn.ts` 增加多实例子节点/属性白名单、会签结构预检与比例条件编译/解析；`flowableModdle` 声明 collection/elementVariable；画布可创建/更新/关闭多实例并约束 `${varList}`/`${var}` 一致，属性面板提供会签开关、全票/比例策略、通过比例与顺序会签，会签时禁用候选范围并提示清空。新增/扩充 `oaBpmn`、`oaBpmnProperties`、`oaProcessDesign` 用例；OA 20 个套件 127 项通过，`tsc --noEmit` 与改动文件 Biome 通过。另以临时 bpmn-moddle 脚本（未入库）验证多实例 XML 的 collection/elementVariable/completionCondition 序列化与回读。边界：尚未做 10.4 浏览器实机验收；并发场景由串行单测覆盖，未做多线程/多副本真实并发压测；会签流程的退回/撤回未单独回归（本轮只覆盖通过、驳回）；发起页对会签变量仍只支持单个员工或岗位/表单人员绑定，多员工会签需使用岗位或后续补多选；顺序会签只做结构与序列化支持，未做顺序待办引擎/浏览器回归；不得据此宣告 OA 可交付。

10.6 证据：outbox 通知、催办限频、超期计时、失败重试与运维终止落地。迁移新增 `oa_outbox`（`uk_event_id`、`(tenant_id,dedup_key)` 唯一、`idx_status_retry`、`idx_tenant_aggregate`）与 `oa_ops.sql`（outbox 业务去重键、`oa_notification` 表，`(tenant_id,user_id,dedup_key)` 唯一、未读索引与申请索引），`oa_ops_menu.sql` 增加 OA 运维 `/oa/operations`（9650、`system:oa:ops:list/outbox:retry/terminate` 9651-9653）与通知消息 `/oa/notifications`（9660、`system:oa:notification:list/read` 9661-9662），并在申请权限下增加 `system:oa:application:urge`（9604），授权仍从具备 `system:user:list` 的角色/租户套餐复制。后端新增 `OaOutboxService`（在业务事务内写入通知事件，带业务去重键）、`OaOutboxDispatcher`（原子领取 PENDING/到期 FAILED/超时 PROCESSING，投递站内通知，失败按 `min(1800, base*2^(retry-1))` 指数退避，支持人工重试与立即投递）、`OaNotificationRepository`/`OaNotificationService`/`OaNotificationController`（分页、未读数、单条已读、全部已读，全部按当前租户与当前用户隔离）、`OaUrgeService`（仅申请人可催办 RUNNING 申请，按任务 10 分钟冷却、每日最多 5 次，只写催办通知事件，不修改任务到期时间或 SLA）、`OaOverdueService`（按自然小时默认 24 小时判定超期，每任务每天一条 `OVERDUE:{taskId}:{yyyyMMdd}` 去重提醒）、`OaOpsService`（独立 `system:oa:ops:terminate` 授权、必须填写原因、锁定申请、删除 Flowable 实例并置 `CANCELLED`、写不可变 `TERMINATE` 审计并通知申请人；outbox 分页/重试/立即投递）。`OaOutboxJob` 默认每 15 秒投递（`oa.outbox.dispatch-enabled=false` 可关），`OaOverdueJob` 默认每 10 分钟扫描（`oa.overdue.enabled=false` 可关）。测试证据：新增 `OaOpsNotificationTest` 5 项（通知只投递一次并置 SENT、失败退避后人工重试成功、催办仅申请人且限频不改任务时间、超期每任务每天只提醒一次、终止流程写审计并通知申请人），`OaEngineLiquibaseMySqlTest` 补充 outbox/notification 列与索引断言及去重唯一性用例；OA 模块 123 项运行 0 失败/错误、2 项 MySQL 用例无环境变量跳过。前端新增 `/oa/notifications` 通知收件箱（未读筛选、未读计数、单条/全部已读）、`/oa/operations` 运维页（outbox 状态/重试/立即投递、独立授权的终止申请弹窗）、申请详情「催办」弹窗；服务层补齐通知、outbox 与终止/催办端点，新增 `oaNotifications`、`oaOperations` 套件并在 `oaApplicationWithdraw` 补催办用例与 `endpointShapes` 端点形状断言；定向 5 套件 30 项、前端全量 Jest 40 套件 252 项通过，`tsc --noEmit`、改动文件 Biome 与契约检查（verbMismatch 0、noPath 0、unknownPermissions 0、missingPages 0、matched 229）通过。边界：尚未做 10.6 浏览器实机验收；`oa_outbox.sql`/`oa_ops.sql`/`oa_ops_menu.sql` 未在真实 MySQL 重跑（MySQL Liquibase 用例因无环境变量跳过），通知只做站内消息、未接邮件/短信/IM 外部通道；催办不升级、不累计 SLA，超期按任务到达后的自然小时计算；`oa_request_dedup` 与已发送 outbox 的清理作业仍未实现；投递任务的原子领取由单测覆盖，未做多节点并发压测；终止不支持指定替代审批人或恢复；不得据此宣告 OA 可交付。

10.2/10.3/10.4/10.6 浏览器实机验收证据（2026-11-09）：在隔离 MySQL 库 `gf_oa_e2e_1108b`、Redis DB 15 上启动完整后端（:8000）与前端（:9002），以 test/Charles/Jasmine/秋登 真实账号走通：候选池领取、已领取任务转交（审计保留原处理人，接收人收到 TASK_ASSIGNED 通知）、限时代理创建与代审批（轨迹显示委托人）、员工离职自动转交直属主管；比例 50% 会签（两人会签一人通过即结束，剩余任务取消并写入 `cancelledTaskIds/cancelReason` 审计，被取消人收到 CANCELLED 通知）；退回上一人工节点（RETURN 审计与申请人通知）；运维页 outbox 失败事件人工重试与立即投递、运维终止申请（必填原因、二次终止被拒、申请人收到终止通知）；通知收件箱未读/已读。数据库核对：申请 1/4 `APPROVED`、申请 2 `CANCELLED`（TERMINATE 审计）、申请 3/5 `RUNNING`，发布版本 1/3/4 ACTIVE、2 STOPPED。验收中修复：催办菜单 ID 由与附件下载冲突的 9604 改为 9605 并补授权变更集；限时代理弹窗时间改为 `YYYY-MM-DD HH:mm:ss` 提交（原 ISO 串被后端拒绝）；审批轨迹补原处理人/转交目标/委托人姓名标签；申请与审批详情的人员字段显示姓名；员工页后台用户、直属主管不再显示裸 ID（主管已离职时显示“姓名（非在职，请更换）”）；离职自动转交改用本次请求中的新主管而非更新前旧主管；转交补发接收人通知；运维人工重试重置 `retry_count`（原先耗尽重试的事件重试后永远不会被取出）；PROCESSING 超时重排队与重试写 `next_retry_time = NULL`（datetime 舍入会让写入 now 的事件被下一次查询漏掉）；重复投递归档说明改为“无新增通知（无接收人或已投递过）”。后端全量 215 项运行 0 失败、2 项跳过，前端 Jest 253 项通过，`tsc --noEmit` 与 Biome 通过。边界：抄送（`oa_cc` 仅建表）未实现、双租户浏览器回归未做，10.1 不勾选；隐藏页自动化下附件删除/重置未复核，10.5 不勾选；发起时不支持静态候选人配置；审批详情无会签进度展示；新增菜单后需重新登录刷新路由缓存；业务错误沿用框架 500 码；未做多节点并发压测与外部通知通道；不得据此宣告 OA 可交付。

10.1 抄送证据（2026-11-09）：发起时可选抄送人（最多 20 人，前端多选 + 后端 `@Size(max=20)`），`OaCcService.resolveReceivers` 去重、剔除申请人自身，并要求全部为本租户在职员工，否则整笔发起回滚（报“部分抄送人已离职或不是本租户员工，请重新选择”，不产生流程实例、申请、幂等记录、回执或 outbox）；通过时写入 `oa_cc_receipt` 回执（UNREAD）和一条 `APPLICATION_CC` outbox 事件（去重键 `CC:{requestId}`），由 dispatcher 投递为 `CC` 类型站内通知，发起审计中记录 `ccUserIds`。新增 `oa_cc_menu.sql`：抄送我的 `/oa/cc`（9670）、隐藏详情 `/oa/cc/detail`（9671）、`system:oa:cc:list`（9672），授权同样从具备 `system:user:list` 的角色/套餐复制。`OaCcController` 提供 `GET /system/oa/cc/page`（关键字/阅读状态筛选，只返回当前用户在当前租户收到的抄送）与 `GET /system/oa/cc/{applicationId}`（非接收人报“抄送记录不存在”，打开时置 READ 并写 `read_time`）；抄送人获得该申请附件下载权（`OaAttachmentRepository.isCcReceiver`）；申请人详情新增 `ccReceivers` 已读/未读。前端：发起页“抄送（可选）”卡片（`OaEmployeeMultiSelect`，计数 n/20）、我的申请详情“抄送人”卡片（已读 x/n）、`/oa/cc` 列表与只读 `/oa/cc/detail`、通知收件箱 CC 类型“查看抄送”跳转（同时将该通知置已读）。测试：`OaLaunchServiceTest` 新增抄送回执/通知/已读/越权与非法抄送人零副作用 2 项；后端全量 217 项 0 失败、2 项跳过；前端新增 `oaCc` 套件并扩充 `oaLaunchFill`/`oaApplicationDetail`/`oaNotifications`，Jest 41 套件 258 项通过，`tsc --noEmit` 与改动文件 Biome 通过。浏览器实机（隔离库 `gf_oa_e2e_1108b`、Redis DB 15）：Charles 发起申请 6 并抄送 Jasmine 与自己，库内仅生成 Jasmine 一条回执、一条已 SENT 的 `APPLICATION_CC` 事件与一条 CC 通知；离职员工 AutumnSail 不出现在多选项中，直接调用接口抄送其人被拒且无新增申请/回执/outbox；Charles 详情显示“已读 0/1 · Jasmine · 未读”，Charles 访问抄送接口被拒；Jasmine 通知点“查看抄送”进入只读详情，回执与通知均置 READ，申请人视图变为 1/1，Jasmine 访问申请人详情接口被拒。边界：实机所用表单无附件字段，抄送人下载附件仅单测覆盖；验收库中 developer 角色的 OA 菜单为早期手工授权，迁移只会复制给持有 `system:user:list` 的角色，故本次对 developer 角色手工补授 9670-9672 并清除其角色菜单缓存；审批节点抄送（审批中追加抄送）、抄送撤销、草稿与双租户浏览器回归仍未做，10.1 不勾选；不得据此宣告 OA 可交付。

10.1 草稿证据（2026-11-09）：新增 `oa_application_draft.sql`（按租户与用户隔离、软删除 `deleted=id` 表示删除、`deleted=1` 表示已提交，乐观锁 `version`），master 与 OA 验证 changelog 均已接入。后端新增 `OaDraftRepository`/`OaDraftService`/`OaDraftController`（`/system/oa/draft` 分页/详情/新建/更新/删除，沿用 `system:oa:launch:submit` 权限，仅操作当前用户在当前租户的草稿）：保存时只要求流程处于可发起发布版本且当前用户在发起范围内，不校验必填、审批人与抄送；更新必须携带版本号，过期版本报“草稿已在其他页面修改，请刷新后重试”，不允许更换流程版本；每人最多 50 份草稿；列表对已停用流程返回 `launchable=false`。`OaLaunchSubmitReq` 新增 `draftId`，`OaLaunchService` 在发起事务内写入幂等记录后消费草稿（置为已提交），草稿不存在/已提交/不属于本人时整笔回滚。测试：`OaLaunchServiceTest` 新增草稿消费与重复消费回滚 2 项，后端全量 219 项 0 失败、2 项 MySQL 跳过；前端发起页“保存草稿/更新草稿”、`?draftId=` 回填（表单值经 `fromOaSubmitFormData` 反向转换、已保存审批人绑定覆盖推荐值、抄送人与标题）、发起列表页“我的草稿”表格（继续/删除、已停用流程禁用继续），扩充 `oaLaunchFill`/`oaLaunchList`/`oaLaunch` 套件，Jest 41 套件 263 项通过（全量并发运行时 2 个套件超时，单独重跑通过），`tsc --noEmit` 与改动文件 Biome 通过。浏览器实机（隔离库 `gf_oa_e2e_1108b`、Redis DB 15，MySQL 8.4 上 `oa-application-draft` 变更集执行成功）：Jasmine 只填标题与原因保存草稿 1（地址替换为 `draftId=1`），补选审批人 1 与抄送人后更新（version 1，`form_data`/`cc_user_ids` 中人员 ID 均为字符串），刷新后标题/原因/审批人/抄送人与“更新草稿”按钮全部回填；接口验证过期版本、已停用发布 2、更换流程版本、不存在草稿均被拒；Charles 对草稿 1 的 GET/PUT/DELETE 均报“草稿不存在或已提交”，其草稿列表为空且草稿未变；草稿列表按最后保存倒序显示两份草稿，删除草稿 2 后库内 `deleted=2`；从列表“继续”草稿 1，补选审批人 2 后提交生成申请 7（RUNNING，`form_data` 含原因与审批人，抄送回执 UNREAD），草稿 1 置 `deleted=1`、列表清空；再以新 requestId 复用 draftId 1 提交被拒且无残留幂等记录。边界：已停用流程的 `launchable=false` 展示与 50 份上限仅单测覆盖；流程重新发布后旧草稿不迁移到新版本；上限检查为先计数后插入，未防并发；草稿中的附件在提交前不建立归属关联，实机表单无附件字段；双租户浏览器回归、审批节点抄送与抄送撤销仍未做，10.1 不勾选；不得据此宣告 OA 可交付。

10.1 双租户证据（2026-11-09）：隔离库 `gf_oa_e2e_1108b`、Redis DB 15 上新建租户 B（编码 `T15DmRQdbdEw`，管理员 tbadmin），浏览器以租户编码登录后令牌租户为 B。员工页只有 B 的员工 B001；我的申请、发起（流程与草稿）、审批待办/已办、抄送均为空；直接打开租户 0 的深链全部被拒：申请详情 `id=7` 报“申请不存在”，发起页 `releaseId=1&draftId=1` 报“流程未发布或已停用”，抄送详情 `id=6` 报“抄送记录不存在”，流程设计 `id=1` 报“流程模型不存在”，表单设计 `id=1` 报“表单不存在”。Jasmine 不填租户编码登录为租户 0，员工页只显示租户 0 的 4 名员工、不含 B 数据。接口层 43 个 OA 端点交叉回归：B 令牌伪造 `X-Tenant-Id: 0` 一律 403，库内无任何变更。验收中修复：登录页新增可选“租户编码”（去首尾空格、`^[A-Za-z0-9_-]{1,64}$`，切换登录方式不清空），账号/手机/邮箱登录均带上 `tenantCode`，新增 `loginTenant` 套件 2 项；`SaExtensionInterceptor` 写 403 前设置 UTF-8，租户不匹配提示不再乱码。边界：审批节点抄送（审批中追加抄送）与抄送撤销仍未实现，10.1 不勾选；不得据此宣告 OA 可交付。

10.5 复核证据（2026-11-09）：同一隔离环境下由 Jasmine（developer 角色，无文件管理权限）走表单附件全链路。复核发现附件上传调用 `/system/file/upload`，该接口要求 `system:file:upload`，普通员工报“没有访问权限”；前端改为 `uploadOaAttachment` 调用登录即可用的 `POST /system/common/file`，附件归属仍在发起时由服务端校验，`endpointShapes`/`oaFormFill` 补断言。表单填写页文案改为“只做表单渲染与填写校验预览、不会生成申请”。删除单个附件后表单值只剩剩余文件，重置后清空；此前看到的残留 DOM 是隐藏页下 antd 离场动画停在 `ant-upload-animate-leave-start`（高度 0），不是产品缺陷。发起（表单 v2、流程发布 5）生成申请 8（RUNNING），`form_data` 只含保留的 `keep-me.txt`（name+fileId），`oa_attachment_link` 一行（FORM、`scan_status=SKIPPED`）。下载授权：申请人与审批人 200 `text/plain`；同租户非参与人 Kils、未挂申请的文件均报“附件不存在或无权访问”；租户 B 带自身租户头被拒，伪造租户 0 头 403。发起反例：使用他人上传的文件、不存在的 fileId 报“附件不存在或无权使用”，复用已挂申请的文件报“附件已被其他申请使用，请重新上传”，均无新增申请或关联。10MB 限制：前端 `beforeUpload` 拦截超限文件，绕过前端直传公共上传接口时服务端返回 400“请上传小于 10 MB 的文件”。安全残留（10.5 不勾选的主因）：本地存储把存储根目录整体映射到 `/file/**`（`security.excludes` 放行），文件按 `/yyyy/MM/dd/原文件名` 保存，未登录 `curl http://localhost:8000/file/2026/11/9/keep-me.txt` 返回 200 与内容，可绕过 OA 下载授权；修复需要平台级“私有存储”能力（本地存储不注册公开映射、S3 私有桶 + 服务端代理或签名 URL），影响头像/Logo/房源图片等公开文件，需单独设计。其他边界：预览页上传或删除的文件留在 `sys_file` 成为孤儿，无清理作业；未接病毒扫描（SKIPPED）；接口下载无过期链接概念，过期链接只适用于未来的签名 URL；不得据此宣告 OA 可交付。

10.1 审批中追加抄送与抄送撤销证据（2026-11-09）：新增 `oa_cc_manage.sql`，`oa_cc_receipt` 增加 `cc_by`（发起抄送回填为申请人）、`revoke_by`、`revoke_time`，状态增加 `REVOKED`，master 与 OA 验证 changelog 均已接入。后端新增 `POST /system/oa/approval/task/{taskId}/cc`（`OaTaskCcReq`：requestId、`receiverIds` 最多 20 人、可选说明）与 `POST /system/oa/approval/application/{applicationId}/cc/{receiverId}/revoke`，均走审批命令的 requestId 幂等与申请行锁。追加只允许 RUNNING 申请的当前任务处理人（含代理，审计记录委托人）调用，接收人须为本租户在职员工，跳过申请人与操作人本人，已在名单中的人跳过、已撤销的回执复用原行重新激活为 UNREAD，单次最多 20 人、单申请有效抄送上限 50 人，全部被跳过时报“所选人员已在抄送名单中，或是申请人/本人，无需抄送”；成功时写 `ADD_CC` 审计（task_id、字符串化 `ccUserIds`）、回执 `source_task_id`/`cc_by` 与一条 `APPLICATION_CC` outbox（去重键 `CC_ADD:{requestId}`）。撤销只允许该回执的 `cc_by` 本人，写 `REVOKE_CC` 审计（目标人、撤销前状态），撤销后接收人的抄送列表、详情与附件下载权立即失效。申请人详情的 `ccReceivers` 增加 `ccById/ccByName/sourceTaskId/revokeTime`，状态可为 REVOKED，已撤销不计入已读统计。前端：任务详情“追加抄送”弹窗（多选在职员工 + 说明），申请/任务详情抄送卡片对本人发起的抄送显示“撤销”（Popconfirm），轨迹新增“追加抄送/撤销抄送”及“撤销对 X 的抄送”标签，全部撤销后隐藏已读统计。同时修复平台级安全缺陷：`SaExtensionInterceptor` 仅在 `preHandle` 返回 true 时才会执行 `afterCompletion` 清理 `UserContextHolder`（TransmittableThreadLocal），被拒请求（租户不匹配、权限不足等）会把该用户上下文遗留在复用的 Undertow 工作线程上，后续请求可能以他人身份/租户做权限判定；现于 `preHandle` 入口与拒绝路径都清理上下文，新增 `SaExtensionInterceptorTest` 2 项（修复前 2 项均失败）。测试：`OaApprovalServiceTest` 新增 `approverAddsCcAndOnlyAdderCanRevoke`，`OaLaunchServiceTest`/`OaOpsNotificationTest`/`OaEngineLiquibaseMySqlTest` 同步新列；后端全量 222 项 0 失败、2 项 MySQL 跳过；前端扩充 `oaTaskDetail`（处理人追加抄送并刷新卡片）、`oaApplicationDetail`（仅本人发起的抄送可撤销、已撤销不计入已读）与 `endpointShapes`，前端全量 Jest 42 套件 268 项通过，`tsc --noEmit` 与改动文件 Biome 通过。浏览器实机（隔离库 `gf_oa_e2e_1108b`、Redis DB 15）：迁移在 MySQL 8.4 执行并回填既有回执 `cc_by`；审批人 Charles 在申请 8 的任务页追加抄送测试员与自己，仅生成测试员回执（`source_task_id` 为该任务、`cc_by` 为 Charles），轨迹“追加抄送 Charles 请知悉附件”，outbox `CC_ADD:*` 已 SENT 并投递 CC 通知；测试员可见抄送列表、详情并下载附件 200。反例：非处理人 Jasmine 追加报“任务不存在或无权处理”，重复追加与只选自己报“已在抄送名单中”，追加离职员工报“部分抄送人已离职或不是本租户员工”，Jasmine 撤销 Charles 发起的抄送报“只能撤销自己发起的抄送”，租户 B 自身租户头追加/撤销分别报“任务不存在或无权处理/申请不存在或无权操作”、伪造租户 0 头 403，以上均无新增幂等、审计、回执或 outbox。Charles 在页面撤销后回执 REVOKED（`revoke_by` Charles）、`REVOKE_CC` 审计（previousStatus READ），测试员的抄送列表不再含申请 8、详情报“抄送记录不存在”、附件下载报“附件不存在或无权访问”，二次撤销报“抄送记录不存在或已撤销”；Charles 再次追加后同一行恢复 UNREAD、访问与下载恢复。申请人 Jasmine 在申请 7 详情撤销其发起时的抄送，轨迹显示“撤销抄送 · 撤销对 测试员 的抄送”。实机中发现上述拦截器上下文泄漏：租户 B 伪造请求被 403 后，租户 0 的 Charles/Jasmine/测试员请求全部被误判 403；修复后重放同一序列，伪造请求仍 403，三人请求均正常返回各自数据。边界：撤销不通知接收人、已投递的 CC 通知保留，点“查看抄送”会提示记录不存在；撤销不受申请状态限制（已结束申请也可撤销）；仅当前任务处理人可追加，申请人在审批中不能追加；拦截器修复只有单测与实机重放，未做并发压测；10.1 据此勾选，但 10.5 附件公开映射残留仍在，不得据此宣告 OA 可交付。

## 11. D2 请假报销试点

- [x] 11.1 请假类型/日历/余额/占用账、表单和 BPMN 模板，数据库并发额度测试
- [x] 11.2 请假申请审批页面及撤回驳回/扣减幂等联调
- [x] 11.3 报销主明细/金额/附件/财务规则和 BPMN 模板，重复提交回归
- [x] 11.4 报销审批与支付登记分离页面/接口，越权财务操作回归
- [x] 11.5 试点普通员工、主管、财务、人事、运维浏览器全流程，量化待办性能

11.1/11.2 请假证据（2026-11-09）：新增业务钩子 `OaBusinessHook`/`OaBusinessHooks`（按模型 `business_type` 分发：模板 schema 校验、默认审批人、发起事务内 `submitted`、结束时 `finished`），流程模型可声明业务类型，发布时请假模型要求表单含请假字段（`leaveModelRejectsFormWithoutLeaveFields`）。迁移 `oa_leave.sql` 建 `oa_leave_type`（租户内编码唯一、是否扣余额、单次上限、乐观锁）、`oa_work_calendar`（租户+日期唯一，工作日/节假日覆盖默认周历）、`oa_leave_balance`（租户+用户+类型+年度唯一）、`oa_leave_request`（一申请一行）与 `oa_leave_ledger`（租户+申请+动作唯一，GRANT/ADJUST/OCCUPY/RELEASE/DEDUCT）；`oa_leave_menu.sql` 增加假期管理 `/oa/leave`（9680、`system:oa:leave:list/manage` 9681-9682）与我的假期 `/oa/leave/mine`（9685、`system:oa:leave:mine` 9686）。`OaLeaveDayCalculator` 按工作日历与上午/下午半天计算天数，拒绝跨年度、结束早于开始、超过 366 天与无工作日的时段。`OaLeaveService`：发起时 `SELECT … FOR UPDATE` 锁余额行后占用，余额不足/未发放/超单次上限整笔回滚；通过时占用转扣减，驳回、撤回、运维终止释放；仅记录型假期（如事假）不占余额只登记；额度发放/调减写台账且总额不得低于已扣减+占用；一键生成请假表单与 `leave_pilot` 流程草稿（直属上级 → 超过 3 天转 HR 岗位候选）。测试：`OaLeaveServiceTest` 8 项（模板通过发布校验、短假占用后通过扣减、长假转 HR 且驳回释放、撤回与终止释放、余额不足整笔回滚、仅记录类型与单次上限、并发提交不超占、调额受已用与占用约束），`OaLeaveDayCalculatorTest` 4 项。前端：假期管理页（类型 CRUD、工作日历、余额与台账、发放/调整、生成模板），我的假期页（年度余额卡与请假记录），发起页实时预览请假天数与余额。

11.3/11.4 报销证据（2026-11-09）：表单新增 `table` 明细字段（列支持 text/textarea/number/date/radio/select，最多行数，后端 `OaFormSchemaValidator` 校验列定义、`OaFormValueValidator` 按行报错并丢弃空行；`acceptsTableFieldAndRejectsBadColumns`、`normalizesTableRowsAndReportsRowErrors`）。迁移 `oa_expense.sql` 建 `oa_expense_category`（租户内编码唯一、单笔上限、是否必须发票、乐观锁）、`oa_expense`（一申请一行，合计、状态、支付登记字段）、`oa_expense_item`（租户+报销+行号唯一）与 `oa_expense_invoice`（租户+发票号唯一，用于去重）；`oa_expense_menu.sql` 增加报销管理 `/oa/expense`（9690、`system:oa:expense:list/manage/pay` 9691-9693，支付权限独立）与我的报销 `/oa/expense/mine`（9695、9696）。`OaExpenseService`：发起时按费用类型校验单笔上限与必须发票，服务端重算合计（不信任前端），发票号经唯一索引占用，重复发票整笔回滚；驳回/撤回/终止释放发票；`expense_pilot` 模板为直属上级 → 财务岗位候选审核 → 合计超过 5000 转总经理岗位。支付登记与审批分离：只有审批通过的报销可由持 `system:oa:expense:pay` 的人登记，实付金额必须等于合计、支付日期不得晚于今天、不能为本人报销登记、重复登记被拒，登记后通知申请人。测试：`OaExpenseServiceTest` 7 项（模板通过发布校验、小额跳过总经理后财务支付、大额转总经理且驳回释放发票、重复发票整笔回滚、并发提交同一发票只成功一次、幂等重放/撤回/预览、费用类型编码与版本守卫）。前端：报销管理页（费用类型、报销台账与详情抽屉、财务支付登记、生成模板），我的报销页，发起页明细表格与合计/超限/缺发票实时预览。

11.5 浏览器全流程与待办性能证据（2026-11-09）：隔离库 `gf_oa_e2e_1109`、Redis DB 15、后端 :8000、前端 :9002，真实账号 Jasmine（普通员工）、Charles（直属主管，兼总经理岗位）、Kils（财务岗位，持支付权限）、test（HR 岗位，运维，无支付权限）。MySQL 8.4 上 `oa_leave*`/`oa_expense*` 变更集执行成功。请假：管理端登记工作日历与节假日、发放额度，生成模板后在流程列表发布；Jasmine 发起页预览天数与余额，超额被拒；撤回释放占用，Charles 通过后扣减、驳回释放；5 天事假经主管后转 HR 岗位，test 领取并通过；台账、我的假期、通知与 outbox 一致。报销：创建费用类型、生成并发布模板；发起页明细合计预览，超单笔上限在预览与服务端均被拒、缺发票提示、重复发票服务端拒绝；Charles 通过 → Kils 领取财务审核 → 超 5000 走总经理审批；Kils 在财务台登记支付，金额不符被拒，Jasmine 收到 PAID 通知且我的报销显示已支付；运维页 13 条 outbox 全部已投递。真实 MySQL 补充：10 个并发 1 天年假（可用 2 天）仅 2 个成功、8 个报“年假余额不足”，占用恰为 2.0，无残留申请；10 个并发报销复用同一发票号仅 1 个成功、9 个报“发票号已被其他报销使用”，发票表仅 1 行；同一 requestId 并发 3 次 + 串行 1 次通过同一请假任务均返回成功，仅 1 条 DEDUCT 台账，余额已用 3→4、占用 2→1；报销 `invoices` 附件字段经 `/system/common/file` 上传后提交，申请人与当前审批人下载 200 `text/plain`，未到节点的财务与无关人员报“附件不存在或无权访问”。待办性能：以 200 条事假种子（56 条周末被正确拒绝）给 Charles 造 144 条待办，单机本地 `GET /system/oa/approval/todo` 各 100 次：size=10 p50 12.8 ms / p95 16.0 ms，size=50 p50 12.3 / p95 15.4 ms，第 8 页 size=20 p50 11.9 / p95 16.7 ms，已办 p50 7.4 ms，空待办 p50 8.0 ms（各组 max 约 60–67 ms 为偶发首包）；串行通过 20 条 p50 48.3 ms、max 57.3 ms，待办总数准确降为 124；浏览器 `/oa/tasks` 显示“总共 124 条”，待办接口 19 ms、页面 load 395 ms（dev 构建）；发起提交平均 43.2 ms。验收中修复：额度调整把雪花员工 ID 经 `Number()` 丢精度提交（改为字符串原样提交，新增 `oaLeave` 用例）；申请快照中单选/下拉/多选显示原始值（改为选项文案，`oaLaunch` 补 2 例）。测试汇总：后端全量 244 项 0 失败、2 项 MySQL Liquibase 用例无环境变量跳过；前端 Jest 45 套件 293 项（全量并发下 `oaLaunchList` 偶发超时，单独重跑 3/3 通过），`tsc --noEmit`、改动文件 Biome 与契约检查通过。边界：岗位（FINANCE/GM）配置、总经理那一步审批、无权支付与重复支付反例、并发/幂等/附件补充经接口完成（审批与支付页面本身已在浏览器走通）；流程设计器在隐藏页自动化下 SVGMatrix 报错，发布改在流程列表执行；性能为单机本地小数据量基线，未做多副本、万级待办与压测；跨年度请假需拆单，请假不做时段重叠校验（属 12.4）；支付登记只记录不对接支付通道；业务错误沿用框架 500 码；10.5 附件 `/file/**` 公开映射残留仍在；不得据此宣告 OA 可交付。

## 12. E1 假勤与差旅

- [x] 12.1 出差与借款数据/权限/API/表单、BPMN模板和状态测试
- [x] 12.2 出差/借款/核销页面和幂等核销联调
- [x] 12.3 排班/考勤受控导入/补卡/加班/外出数据和接口
- [x] 12.4 假勤页面与审批模板、重叠时段/角色/导入校验验收

12.1/12.2 出差借款证据（2026-11-09）：迁移 `oa_travel.sql` 建 `oa_travel`（一申请一行，租户内出差单号唯一、预算、已报销）、`oa_loan`（关联出差、金额、余额、状态、放款登记字段）与 `oa_loan_ledger`（DISBURSE/REPAY/WRITE_OFF，按请求号唯一），并给 `oa_expense` 增加关联出差、超预算与核销金额；`oa_travel_menu.sql` 增加出差借款 `/oa/travel`（9700、`system:oa:travel:list/manage` 9701-9702、放款还款独立权限 `system:oa:loan:pay` 9703）与我的出差借款 `/oa/travel/mine`（9705、`system:oa:travel:mine` 9706）。业务钩子：出差校验日期、单次天数上限与本人已有出差的时段重叠，模板为直属上级 → 预算超过 3000 元转财务岗位；借款必须关联本人已通过的出差，累计借款不得超过出差预算，模板为直属上级 → 财务岗位 → 超过 10000 元转总经理岗位。放款/还款与审批分离：仅审批通过可放款，放款额须等于借款额、日期不晚于今天、不能给本人登记、不可重复放款；还款按请求号幂等、不得超过余额，余额行加锁。报销可关联出差，累计报销超出差预算时追加总经理复核；财务支付时可核销本人待还借款，核销合计不超过报销合计与借款余额、同一借款不得重复核销，实付须等于合计减核销，余额归零即结清。测试 `OaTravelLoanServiceTest` 5 项（模板通过发布校验、出差-借款-报销核销主路径、核销守卫与还款台账、并发借款不超出差预算、驳回撤回与出差校验）、`OaExpenseServiceTest` 补关联出差与核销用例。前端：出差借款管理页（出差台账、借款台账与详情台账、财务放款/还款登记、生成模板），我的出差借款页，报销财务台核销借款，发起页出差/借款预算提示。

12.3/12.4 假勤证据（2026-11-09）：表单新增 `datetime` 字段类型（schema/值校验、设计器、渲染与展示）。迁移 `oa_attendance.sql` 建 `oa_shift`（班次、宽限分钟、乐观锁）、`oa_schedule`（租户+员工+日期唯一，空班次表示休息）、`oa_attendance_import`（租户+请求号唯一，含导入行 SHA-256）、`oa_attendance_record`（租户+员工+日期唯一，上下班来源 IMPORT/CORRECTION）与 `oa_attendance_request`（补卡/加班/外出一申请一行）；`oa_attendance_menu.sql` 增加假勤管理 `/oa/attendance`（9710、`system:oa:attendance:list/manage/import` 9711-9713，导入权限独立）与我的考勤 `/oa/attendance/mine`（9715、`system:oa:attendance:mine` 9716）。`OaAttendanceService`：班次 CRUD、按员工+日期区间+星期批量排班；考勤导入为工号/日期/上下班时间行，预览逐行报错（工号不存在或不在职、日期/时间格式、未来日期或超出回溯天数、下班早于上班、同人同日重复行），按请求号幂等提交，同请求号内容不同拒绝，补卡写入的时间不被后续导入覆盖；日状态按排班与宽限计算 NORMAL/LATE/EARLY/MISSING_IN/MISSING_OUT/ABSENT/REST/UNSCHEDULED/LEAVE/TRAVEL/OUTING/PENDING，月度汇总应出勤、正常、异常、请假、出差、外出、补卡与加班小时。补卡钩子：只能补 30 天内、不晚于当前、当天须有排班，同日同类型不得重复，每月 5 次上限，模板直属上级 → HR 岗位审核，通过后写入对应上/下班时间；加班与外出钩子校验时间窗并与已有加班/外出/请假/出差互斥，请假提交时也校验与加班/外出/请假重叠。测试 `OaAttendanceServiceTest` 7 项（模板通过发布校验、班次与排班规则、导入校验/幂等/内容冲突、补卡审批写入且导入保留、补卡月度上限、加班/外出/请假/出差互斥、日状态与月度汇总），OA 模块 163 项 0 失败、2 项 MySQL 用例跳过。前端：假勤管理页（班次、排班、考勤导入预览/提交、月度汇总与员工日明细抽屉、申请台账、生成模板），我的考勤页（统计卡、异常提示、日明细、我的申请）。

12.x 实机证据（2026-11-09）：隔离库（`gf_oa_e2e_1109b`/`1109c`）、Redis DB 15、后端 :8000、前端 :9002，账号 Jasmine（员工）、Charles（直属主管兼总经理岗位）、Kils（财务岗位，持放款/支付权限）、test（HR 岗位，无放款权限）。MySQL 8.4 上 `oa_travel*`/`oa_attendance*` 变更集执行成功。出差借款（业务操作经真实接口，页面核对展示）：出差 TR2611090001（上海，11-16 至 11-18，预算 4000）通过，时段重叠的第二张出差被拒；借款 5000 超预算、关联不存在的出差均被拒，借款 3000 经主管 → 财务通过（未到 10000 不进总经理）；本人放款、test 无权放款（403）、金额不符、未来日期、重复放款均被拒；还款 1000 后余额 2000。报销 A 1700 未超预算，核销超合计、实付不等于合计减核销、重复核销同一借款均被拒，核销 1500 实付 200；报销 B 2500 使累计 4200 超预算，经主管 → 财务 → 总经理复核通过，核销超余额被拒，核销 500 后借款 SETTLED，台账 DISBURSE 3000 → REPAY 1000 → WRITE_OFF 1500 → WRITE_OFF 500。累计借款 4001 超预算被拒；追加借款 1000 放款后 并发还款 300 仅 3 个成功、其余报“还款金额 300 元超过借款余额 100 元”；同一请求号并发 5 次还款 50 仅 1 次成功、其余报“请求号已被使用”，最终余额 50、台账 5 行。浏览器：我的出差借款显示 TR2611090001 已通过、预算 ¥4,000、已报销 ¥4,200，借款列表与借款详情台账与接口一致；出差借款管理页台账显示借款余额 ¥50。假勤：两名员工 11-02 至 11-06 工作日批量排班，导入 5 行，同请求号重放返回原导入，内容不同报“请求号已被使用”；日状态得到正常、迟到、早退、缺下班卡、缺勤；11-04 下班补卡 18:02 经 Charles → test（HR 候选）通过后变为正常且来源为补卡，再次导入保留补卡时间（keptCorrections 1）而上班时间更新；未排班日补卡报“未排班或为休息日，无需补卡”；11-07 加班 4 小时通过，重叠加班被拒；11-06 外出（客户A）通过后该日由缺勤变为外出。月度汇总：Jasmine 应出勤 15、正常 2、迟到 1、缺勤 1、出差 3、外出 1、补卡 1、加班 4 小时。浏览器假勤管理月度汇总与接口一致，日明细抽屉显示导入/补卡来源、外出客户A、出差上海、未来日期待打卡；我的考勤统计卡 15/2/2/3/1/4.0、异常提示与我的申请 5 条；控制台无报错。验收中修复：考勤导入同请求号不同内容原被当成重放（增加行摘要比对后拒绝）；补卡未校验排班，周日补卡被受理（增加当天须有排班）；员工 ID 下拉以 `Number()` 丢精度（改为字符串）；流程列表补出差/借款/补卡/加班/外出业务类型文案。测试汇总：后端全量 256 项 0 失败、2 项 MySQL Liquibase 用例无环境变量跳过；前端 Jest 47 套件 309 项（默认并发下 `oaLaunchList`/`oaAttendance`/`oaTravel` 偶发超时，`--maxWorkers=3` 全量与单独重跑均通过），`tsc --noEmit`、改动文件 Biome 通过。边界：出差/借款/报销的发起与审批、补卡/加班/外出发起与审批、导入均经真实接口完成，页面验证展示、台账与统计一致；批量排班在自动化下 RangePicker 键入日期不提交，改经接口排班；已有租户的报销表单需手动加关联出差字段，已发布的报销流程保留旧条件；放款、还款、支付只登记不对接资金通道；考勤不支持跨天班次，半天请假不拆分时段，外出当日不再判定迟到早退；导入只支持 CSV/JSON 行，未对接考勤机；业务错误沿用框架 500 码；10.5 附件 `/file/**` 公开映射残留仍在；不得据此宣告 OA 可交付。

## 13. E2 采购资产

- [ ] 13.1 采购申请/预算/验收数据、接口和流程模板
- [ ] 13.2 采购页面及审批与验收分离全流程验收
- [ ] 13.3 资产/用品台账、入出库、领还、调拨、报废和盘点接口/并发测试
- [ ] 13.4 资产页面、流程模板及数量非负/操作追踪验收

## 14. E3 合同与知识

- [ ] 14.1 合同/用印数据、版本、会审、签署执行登记与到期提醒接口
- [ ] 14.2 合同/用印页面和审批模板，附件隐私及执行状态验收
- [ ] 14.3 公文/知识版本、发布范围、签收、撤稿接口和流程模板
- [ ] 14.4 公文/知识页面及深链受众权限、签收/审计验收

## 15. E4 资源与协作

- [ ] 15.1 会议室/车辆/司机/维保基础数据和预订区间冲突事务实现
- [ ] 15.2 预约/调度/执行页面及模板，取消/超时释放/并发预订测试
- [ ] 15.3 日程/工作报告/提醒接口与按员工部门可见范围
- [ ] 15.4 日程/工作报告页面和发布/查看/统计权限联调

## 16. E5 统计运维和总验收

- [ ] 16.1 OA 工作台、时效/超期/金额统计、异步导出及敏感字段脱敏
- [ ] 16.2 失败任务/通知/流程干预运维页，审计、重试、禁止越权代签测试
- [ ] 16.3 按实际规模完成全套性能、双租户、迁移/恢复和浏览器端到端验收
- [ ] 16.4 按每个业务/平台列实际完成与阻塞，未验真机和外部系统明确保留
- [ ] 16.5 所有已验收代码及设计提交推送，先子仓后父指针，复核远端和工作区；未完成内容不得标全套已交付
