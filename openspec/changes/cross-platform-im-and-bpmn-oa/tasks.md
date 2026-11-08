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

- [ ] 10.1 发起/草稿/待办/已办/抄送/详情/轨迹 API 和页面，双租户访问回归
- [ ] 10.2 实现幂等完成/驳回/限定撤回/限定退回与不可变审计
- [ ] 10.3 实现候选领取、转交、限时代理，验证同租户和代理环限制
- [ ] 10.4 实现会签策略与并发完成/取消剩余任务回归
- [ ] 10.5 私有附件上传下载与实例授权，越权/过期链接/文件限制测试
- [ ] 10.6 outbox 通知、催办限频、超期计时、失败重试和运维终止授权

10.1/10.2/10.5 浏览器实机验收证据（2026-11-08）：在隔离 MySQL 库 `gf_oa_e2e_1108`、Redis DB 15 上启动完整后端（:8000）与前端（:9002），关闭登录验证码，以 admin/test 真实账号走通员工/岗位页与选择器、表单 v1 + 流程发布 v1、3 个申请的发起填写（日期/人员/附件/文本）、我的申请列表与详情、审批中心待办/已办、审批通过、驳回、申请人撤回及附件下载；验收后删库、清空 Redis DB 15、释放端口并停止进程。数据库核对：申请 1 `APPROVED`（审批通过意见与审计一致，`act_ru_task` 清空、历史实例结束），申请 2 `WITHDRAWN`（含 WITHDRAW 审计），申请 3 `REJECTED`（含 REJECT 审计与 task_id）；`oa_attachment_link` 有归属行，附件下载返回 200 `text/plain`；`form_data` 中 18 位 fileId 与人员 ID 均按字符串保存。验收中修复：`OaAssigneeContext` 误拒默认租户 0；前端 `oaAttachmentFileId` 对雪花 ID 的安全整数校验误判；申请/审批详情 fileId 字符串归一；补齐 `menu.oa.tasks`/`menu.oa.tasks.detail` 中英文案（控制台缺键告警消失）。边界：退回上一人工节点仅单测覆盖（发布模型只有一个审批节点，未做实机退回）；审批详情/申请详情人员字段仍显示用户 ID 而非姓名；隐藏页面自动化下附件删除与重置点击未触发 React 处理器，待常规浏览器复核；抄送、双租户浏览器回归与 outbox 未覆盖，10.1/10.2/10.5 仍不勾选完成。

## 11. D2 请假报销试点

- [ ] 11.1 请假类型/日历/余额/占用账、表单和 BPMN 模板，数据库并发额度测试
- [ ] 11.2 请假申请审批页面及撤回驳回/扣减幂等联调
- [ ] 11.3 报销主明细/金额/附件/财务规则和 BPMN 模板，重复提交回归
- [ ] 11.4 报销审批与支付登记分离页面/接口，越权财务操作回归
- [ ] 11.5 试点普通员工、主管、财务、人事、运维浏览器全流程，量化待办性能

## 12. E1 假勤与差旅

- [ ] 12.1 出差与借款数据/权限/API/表单、BPMN模板和状态测试
- [ ] 12.2 出差/借款/核销页面和幂等核销联调
- [ ] 12.3 排班/考勤受控导入/补卡/加班/外出数据和接口
- [ ] 12.4 假勤页面与审批模板、重叠时段/角色/导入校验验收

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
