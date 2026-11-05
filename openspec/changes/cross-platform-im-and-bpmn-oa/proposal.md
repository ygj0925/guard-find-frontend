## Why

现有 IM 的静态检查遗漏了真实运行时问题：小程序无回调的 connectSocket 返回 Promise，App 发送回包推进拉取游标可能漏消息；鸿蒙多项能力仍为 unsupported。后台具备组织、角色、文件等底座，但尚未引入 BPMN 审批引擎，需要先解决正确性和权限，再分批建设可验收的 OA，而非一次堆叠页面。

## What Changes

- 修复 App/server 与 miniapp/backend 各自的消息链路：连接生命周期、单飞增量同步、字符串 ID、分页已读、提交后推送、断线补偿和令牌撤销。
- WebSocket 定位为低延迟通知，不代替业务事务；用于消息、审批待办和异步任务进度，不迁移所有 REST 请求。
- 鸿蒙按实际能力建立验收矩阵，补齐安全随机数和持久化，再按 CLI 管理边界处理媒体、分享等原生能力。
- App 增加灵感便笺、物品收纳定位，server 同批提供隔离到用户的 CRUD；不引入不必要的原生依赖。
- 后台性能建立可复现基线，优先核验用户角色装配、房源索引、文件统计、菜单缓存和懒加载收益。
- OA 全景包含员工组织、工作台、流程/表单设计、审批中心、考勤假勤、费用出差、采购资产、合同用印、公文知识、会议车辆及统计运维。全景并非首批完成声明。
- 首选候选 Flowable 嵌入式 BPMN 引擎配合 bpmn-js；必须先完成实际 Spring Boot/JDK/Jakarta/数据库兼容性验证和许可核查，才锁定版本并写依赖。
- 引入流程/表单版本、任务权限、租户隔离、审批审计、私有附件、幂等和提交后可靠通知。
- **BREAKING**：如现有消息已读和分页接口需要调整，客户端及对应服务端同批发布；已部署用户端需按发布现实选择过渡策略，不直接假设可以同步升级。

## Capabilities

### New Capabilities

- `reliable-im-delivery`: 跨端可靠消息收发、连接与已读语义。
- `harmony-and-personal-tools`: 鸿蒙能力验收及两个用户工具的端到端契约。
- `admin-performance-baseline`: 管理端性能基线、优化门槛与权限回归。
- `oa-bpmn-platform`: 租户隔离的流程设计、发布、执行、审批、附件和审计底座。
- `oa-business-suite`: OA 全景模块及分期交付边界。

### Modified Capabilities

无。当前工作区未建立 openspec/specs 主规格目录；新增契约不改写其他未完成 change。

## Impact

- 本地 OpenSpec 所属仓库：guard-find-frontend；此变更为其后台/OA 实施契约及跨仓协作总设计，不扩大该 CLI 的本地编辑权限。
- 配套实施仓库：guard-find-app、guard-find-server、guard-find-miniapp、guard-find-backend；修改各仓前分别遵守本仓约定。父仓记录各批次子模块指针。
- App 使用 /app 身份域，miniapp 使用 /miniapp 身份域，OA 使用 backend 管理员/员工身份域；默认不合并数据库，不让公众账号自动拥有员工审批权限。
- 候选新依赖：BPMN 引擎、bpmn-js 及表单渲染支持；版本验证前不安装。原生依赖只能由 expo-harmony-cli 管理。
- 数据迁移、引擎表、索引、私有附件与异步通知需要真实测试数据库验收；生产部署、签名和第三方企业接口不包含在 Git 推送授权中。
- 用户已要求实现、自测和推送；必须先确认 OA 的组织接入和首批业务范围，再按验收批次推进，不能把仅有文档/单测通过报告成整套上线完成。
