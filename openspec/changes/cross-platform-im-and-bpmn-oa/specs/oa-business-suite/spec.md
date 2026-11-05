## ADDED Requirements

### Requirement: General enterprise OA scope

系统 SHALL 按 design 的 D/E 批次交付组织员工、工作台、请假报销、出差借款、假勤、采购资产、合同用印、公文知识、会议车辆、工作报告及统计运维；首期入口仅后台 Web。

#### Scenario: Business module completion

- **WHEN** 某模块被报告为已完成
- **THEN** 必须具备其页面、API、持久化、权限、流程、失败路径及端到端验收证据，不能仅凭菜单或通用 CRUD 标记完成

### Requirement: Leave and expense pilot

系统 SHALL 首先交付请假和报销的草稿、发起、条件审批、驳回、撤回、附件、通知、审计闭环，业务规则可配置。

#### Scenario: Leave quota contention

- **WHEN** 同一员工同时提交多个申请使额度不足
- **THEN** 服务端保证不超额占用；驳回/撤回正确释放占用，审批不得重复扣减

#### Scenario: Expense approval is not payment

- **WHEN** 报销审批通过
- **THEN** 进入待支付，只有有权限的财务登记支付后才变为已支付，系统不伪造银行支付结果

### Requirement: Execution separated from approval

采购验收、资产入出库、签署用印和车辆执行 SHALL 与审批状态分离，所有实物/资金状态变化可追踪且幂等。

#### Scenario: Approved purchase

- **WHEN** 采购申请审批通过但尚未验收
- **THEN** 不自动增加库存，验收登记后才按授权和事务更新数量

### Requirement: Exclusive resource reservations

会议室和车辆预订 MUST 检测有效时间区间冲突，取消/超时释放占用，不能只在浏览器检查。

#### Scenario: Simultaneous reservation

- **WHEN** 两人并发预订同一资源的重叠时段
- **THEN** 服务端只接受一个有效占用，另一请求返回冲突

### Requirement: Authorized publication and reporting

公文/知识发布、工作报告和统计导出 SHALL 遵守受众/租户/部门范围及版本规则，敏感导出有审计与过期清理。

#### Scenario: Restricted reader

- **WHEN** 不在发布范围的员工通过深链访问公文或统计导出
- **THEN** 服务器拒绝返回内容，不因知道地址绕过授权
