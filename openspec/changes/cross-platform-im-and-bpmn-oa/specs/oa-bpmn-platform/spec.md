## ADDED Requirements

### Requirement: Versioned and validated BPMN releases

系统 SHALL 提供 BPMN 画布、受控属性、XML校验、草稿/发布/停用及图形轨迹；发布绑定不可变流程和表单版本，服务器拒绝不支持或不安全模型。

#### Scenario: New release with running instances

- **WHEN** 模型发布新版本且旧版实例仍在运行
- **THEN** 新发起使用新版本，旧实例仍使用原流程及表单，不自动迁移

#### Scenario: Unsafe imported model

- **WHEN** 导入包含外部实体、任意脚本或非白名单服务任务的 XML
- **THEN** 服务器拒绝保存为可执行发布，不访问外部地址或执行内容

### Requirement: Tenant and task authorization

OA MUST 使用内部员工身份；引擎、业务表、附件、缓存、候选组、异步作业均隔离租户；管理员不天然拥有代签权限。

#### Scenario: Public or cross-tenant actor

- **WHEN** 公众 token 或其他租户员工尝试查看/完成任务
- **THEN** 请求被拒绝，流程状态和敏感数据不受影响

### Requirement: Atomic idempotent decisions

发起和审批命令 MUST 幂等，业务状态、引擎状态、审批审计和通知 outbox 具备明确事务一致性；同一任务不可产生互相冲突的成功决策。

#### Scenario: Duplicate approval

- **WHEN** 审批请求因超时重试或两个处理者并发完成任务
- **THEN** 仅一项有效决策写入，另一请求获得已有结果或冲突，不重复扣假期或记财务流水

### Requirement: Bounded process actions

撤回、退回、驳回、转交、代理、会签、催办和运维终止 SHALL 按 design 中的授权与状态约束执行；未实现动作不得伪装可用。

#### Scenario: Withdraw after approval

- **WHEN** 发起人在已有有效审批动作后申请直接撤回
- **THEN** 拒绝抹除历史，指引独立撤销申请

#### Scenario: Parallel rollback

- **WHEN** 用户尝试跨并行分支任意退回
- **THEN** 首期明确拒绝，不生成悬挂任务或孤立执行流

### Requirement: Private attachments and audit

系统 MUST 对附件按实例/业务范围授权，审批履历记录原审批人与实际操作者并禁止普通业务编辑删除；通知不暴露完整敏感表单。

#### Scenario: Leaked file identifier

- **WHEN** 未授权用户持有 fileId 或过期下载地址
- **THEN** 不能读取附件正文，下载请求重新经过权限校验
