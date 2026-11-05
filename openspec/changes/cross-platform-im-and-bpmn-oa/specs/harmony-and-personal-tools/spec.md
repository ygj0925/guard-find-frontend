## ADDED Requirements

### Requirement: Honest Harmony capability support

系统 SHALL 按持久化、随机数、媒体、分享、网络和导航分别提供可验证能力；原生依赖 MUST 经 expo-harmony-cli 管理，不把 unsupported 或 mock 视为实机支持。

#### Scenario: No secure random source

- **WHEN** 设备缺少安全随机数来源
- **THEN** 密码生成功能明确不可用，不使用 Math.random 生成安全凭据

#### Scenario: Process restart

- **WHEN** 鸿蒙应用写入需要持久化的数据后被杀进程重启
- **THEN** 已授权账号的数据可恢复，换号不可读到上一账号缓存；此项须真机验证

### Requirement: Notes and item-location tools

App 和 server SHALL 提供灵感便笺与物品收纳定位的分页 CRUD、检索、归档及冲突反馈；保存失败不得伪装成功。

#### Scenario: Edit conflict

- **WHEN** 两个设备更新同一条已被修改的记录
- **THEN** 后提交的过期版本收到冲突提示，不静默覆盖新内容

### Requirement: Personal data ownership

工具接口 MUST 从登录上下文取得所有者，所有详情/更新/删除按用户隔离，数量非负、内容长度受限。

#### Scenario: Another user guesses an ID

- **WHEN** 其他用户读取或修改不属于自己的便笺或收纳记录
- **THEN** 请求被拒绝且不泄露正文或改变记录
