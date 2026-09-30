## MODIFIED Requirements

### Requirement: 统一响应信封解析

前端 SHALL 以后端实际下发的信封 `{ code: string, msg: string, data, success: boolean, timestamp: number }` 作为唯一契约；`code` 为字符串，消息字段为 `msg`。业务失败时 HTTP 状态 SHALL 为 200，因此成功判定 SHALL 以 `success` / `code` 为准，而非 HTTP 状态。

#### Scenario: 成功响应

- **WHEN** 后端返回 `{code:"0", success:true, data:{list,total}}`
- **THEN** 调用方 SHALL 拿到完整信封对象，页面读取 `response.data.list` 与 `response.data.total`

#### Scenario: 业务失败响应

- **WHEN** 后端返回 `{code:"500", msg:"名称为 [技术部] 的部门已存在", success:false}`
- **THEN** 请求层 SHALL 抛出携带该 `msg` 的业务错误，并使界面显示 `"名称为 [技术部] 的部门已存在"`

### Requirement: 错误码到界面行为的映射

请求层 SHALL 按 `code` 分派唯一一份处理逻辑：`400` 警告提示、`401` 单次登出、`403` 错误提示、`404/405` 开发期契约告警、`500` 错误提示、`1` 通知提示。

#### Scenario: 登录态失效只登出一次

- **WHEN** 响应 `code === "401"`
- **THEN** 请求层 SHALL 触发登出流程并终止该请求的后续处理，SHALL NOT 再叠加业务错误提示

#### Scenario: 404/405 暴露为契约漂移

- **WHEN** 非生产环境收到 `code` 为 `"404"` 或 `"405"`
- **THEN** 请求层 SHALL 输出 `[api-contract]` 前缀的控制台告警并带上请求 URL

#### Scenario: 提示去重

- **WHEN** 相同错误消息在 1.5 秒内重复出现
- **THEN** 界面 SHALL 只展示一次提示

### Requirement: 文件下载的失败可见性

导出/下载接口返回业务错误（JSON 信封）时，请求层 SHALL 解析出 `msg` 并抛错，而不是把 JSON 当文件保存。

#### Scenario: 导出接口返回业务错误

- **WHEN** `responseType: 'blob'` 的请求收到 `content-type` 为 `application/json` 的响应体
- **THEN** 界面 SHALL 显示后端 `msg`，且 SHALL NOT 触发文件下载
