## ADDED Requirements

### Requirement: Rich Text Editor
系统 SHALL 提供富文本编辑器组件。

#### Scenario: Editor basic editing
- **WHEN** 用户使用编辑器
- **THEN** 编辑器支持文本输入、格式化、图片插入、视频插入等功能

#### Scenario: Editor image upload
- **WHEN** 用户在编辑器中插入图片
- **THEN** 系统支持自定义图片上传（服务端上传或base64）

#### Scenario: Editor video upload
- **WHEN** 用户在编辑器中插入视频
- **THEN** 系统支持自定义视频上传

#### Scenario: Editor read-only mode
- **WHEN** 编辑器设置为只读模式
- **THEN** 用户只能查看内容，不能编辑

#### Scenario: Editor content change callback
- **WHEN** 编辑器内容发生变化
- **THEN** 编辑器触发 onChange 回调，返回HTML内容
