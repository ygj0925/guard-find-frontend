## ADDED Requirements

### Requirement: Reproducible performance evidence

每项性能优化 SHALL 记录环境、规模、并发、冷热缓存、真实 SQL 和前后 p95/p99/吞吐/业务错误率；不得声明未经测量的性能提升。

#### Scenario: Pagination optimization

- **WHEN** 修改用户角色装配或房源索引
- **THEN** 使用相同脱敏数据与查询条件比较 SQL 次数和执行计划，并记录实际请求时延

### Requirement: Authorization-preserving caching

所有菜单、统计和列表缓存 MUST 按适用租户/角色范围隔离，权限变更提交后可靠失效；缓存优化不能扩大数据范围。

#### Scenario: Permission revocation

- **WHEN** 管理员撤销某角色菜单或数据访问权
- **THEN** 撤权后的接口不因旧缓存允许访问，另一个租户缓存不被混用

### Requirement: Browser-verified admin loading

前端 SHALL 对生产构建验证懒加载、长列表、深链和受限角色；流程设计器不得成为所有后台页面首屏必载内容。

#### Scenario: Open a non-OA page

- **WHEN** 用户冷启动进入普通用户管理页
- **THEN** 不加载未使用的 BPMN 设计器 bundle；可见数据和权限行为与优化前一致
