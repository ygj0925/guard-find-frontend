## ADDED Requirements

### Requirement: Runtime-correct socket lifecycle

客户端 SHALL 使用平台真实 SocketTask/WebSocket API；连接失败、建连超时、心跳超时、退出/换号和后台切换均有明确清理，旧连接不得影响新代次。

#### Scenario: Uni promise wrapper

- **WHEN** uni-app 会在无 callback 时把 connectSocket 包装成 Promise
- **THEN** 客户端传 callback 获取 SocketTask，测试模拟真实包装行为，不通过错误 unsupported 标志掩盖连接失败

#### Scenario: Expired connection callback

- **WHEN** 已失效连接在重连前后触发 open/message/close
- **THEN** 不更新连接状态，不分发消息，不关闭新连接

#### Scenario: Missing pong

- **WHEN** 服务端不回复 pong 或握手超过截止时间
- **THEN** 客户端关闭本次连接并退避重连，同时保留授权范围内的 REST 补偿

### Requirement: Single-flight authoritative synchronization

客户端 SHALL 将推送和轮询汇入单飞补拉；消息 ID 使用字符串，去重排序，发送回包不推进读取游标；页面和账号代次失效后不得应用响应。

#### Scenario: Send races with receive

- **WHEN** 自己发送成功前有尚未拉取的对方消息
- **THEN** 下一次增量读取仍能获取对方消息，自己消息只显示一次

#### Scenario: Reconnect after missed events

- **WHEN** 用户在列表或聊天页断线期间收到消息后恢复连接
- **THEN** 自动补拉遗漏数据；列表未读更新，不依赖再次进入或手工下拉

### Requirement: Authorized committed delivery and bounded reads

服务端 MUST 校验有效身份/会话成员，消息提交后才推送，撤销的凭据不能继续接收；消息读取有上限且已读仅覆盖读取/确认范围，计数与并发写入保持一致。

#### Scenario: Rollback and token revocation

- **WHEN** 发送事务回滚，或连接令牌被撤销
- **THEN** 不推送回滚消息，不向被撤销连接继续发送正文

#### Scenario: Concurrent unread message

- **WHEN** 已读与新消息发送并发，且新消息不在已确认范围
- **THEN** 新消息仍计入未读，后续分页能够读取且不被游标永久跳过
