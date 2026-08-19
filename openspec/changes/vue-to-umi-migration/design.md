## Context

当前 UMI4 项目已建立完善的基础架构：动态路由（patchClientRoutes + pageImports.ts）、权限体系（AccessControl + useAccess）、字典系统（Dict 组件族）、请求层（@umijs/max request + interceptors）。已实现约 15 个页面覆盖系统核心管理功能。

源 Vue 项目（ContinueNew Admin v4.2.0）包含完整的后台管理功能约 30+ 页面，使用 Arco Design Vue + Pinia + Vue Router。两个项目共享同一后端（localhost:8000），API 接口完全一致。

迁移约束：
- 保留 UMI 项目现有架构和编码模式不变
- UI 组件从 Arco Design 映射到 Ant Design 5 + ProComponents
- 保留企业微信登录，不迁移 Vue 的社交登录（Gitee/GitHub/微信）
- API 前缀从 `/sss-task` 切换为 `/dev-api`

## Goals / Non-Goals

**Goals:**
- 功能对等：实现 Vue 项目所有业务页面在 UMI 项目中的等价物
- 架构一致：所有新页面遵循项目已有的 ProTable/ProForm/ModalForm 模式
- API 兼容：使用相同的后端接口，响应格式复用现有 RequestConfig 处理逻辑
- 渐进交付：按 Phase 分批实现，每个 Phase 独立可用

**Non-Goals:**
- 不做 UI 1:1 像素级还原（接受 Arco → Antd 的视觉差异）
- 不迁移 Vue 项目特有的 4 种布局模式（保留 UMI 的 ProLayout top 布局）
- 不迁移 Mock 数据（直接对接真实后端）
- 不实现多语言翻译（保留中文，i18n 框架已有）
- 不迁移 Vue 的版本更新检测机制

## Decisions

### 1. API 前缀策略

**选择**：使用 `/dev-api` 前缀 + proxy pathRewrite 去除前缀

**理由**：与 Vue 项目保持一致的代理模式，后端不需要任何调整。requestInterceptor 中将 `process.env.requestPrefix` 从 `/sss-task` 改为 `/dev-api`。

**替代方案**：
- 直接请求 `http://localhost:8000`（跨域问题）
- 保留 `/sss-task`（与 Vue 项目不一致，增加认知负担）

### 2. 页面组件结构

**选择**：遵循现有模式 —— 每个模块一个目录，主页面 + components 子目录

```
src/pages/<module>/<feature>/
├── <Feature>Page.tsx          # 主页面（ProTable + 搜索 + 操作按钮）
└── components/
    ├── <Feature>Form.tsx      # 新增/编辑表单（ModalForm）
    └── <Feature>Detail.tsx    # 详情弹窗（如有）
```

**理由**：与 SysUserPage、SysRolePage 等已有页面保持一致。

### 3. Service 层组织

**选择**：在 `src/services/web/` 下按后端模块新增目录

```
src/services/web/
├── monitor/         # online, sms-log
├── schedule/        # job, log
├── tenant/          # management, package
├── open/            # app
├── code/            # generator
├── file/            # file management
└── storage/         # storage config
```

每个 service 文件导出：API 函数 + TypeScript 类型定义（与 Vue 项目的 API 参数/返回值对齐）。

**理由**：与已有的 `services/web/system/`、`services/web/log/` 结构一致。

### 4. Dashboard 图表库

**选择**：使用 `@ant-design/charts`（基于 G2Plot 的 React 封装）

**理由**：
- 与 Ant Design 生态一致，开箱即用
- Vue 项目使用 ECharts，但 @ant-design/charts 在 React + Antd 体系下集成更自然
- 提供 Line、Column、Pie、Area 等常用图表

**替代方案**：
- ECharts（echarts-for-react）：更灵活但与 Antd 生态脱节
- Recharts：轻量但图表类型有限

### 5. 文件上传组件

**选择**：使用 Antd `Upload` 组件 + 后端 `/system/file/upload` 接口

**理由**：Antd Upload 原生支持拖拽、进度显示、文件列表。复用 RequestConfig 的 Authorization header。

### 6. 页面路由注册

**选择**：无需手动注册路由 —— 依赖现有 `genPageMap.js` + 动态路由系统

**流程**：
1. 在 `src/pages/` 下创建页面文件
2. 运行 `node scripts/genPageMap.js` 更新 `pageImports.ts`
3. 后端菜单配置中添加对应路由（component 字段指向页面路径）
4. 前端登录后自动获取并渲染

### 7. 权限控制方式

**选择**：复用现有 `<AccessControl permission="xxx">` 组件包裹操作按钮

**理由**：已有成熟方案，与 Vue 的 `v-permission` 指令功能等价。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Dashboard 图表数据格式可能与后端不完全匹配 | 参考 Vue 项目的 `/dashboard` API 调用，编写 adapter 层转换数据 |
| 代码生成器功能复杂（多步骤交互） | 拆分为独立子组件，分步实现，优先保证基本流程 |
| 新增 15+ 页面后 pageImports.ts 体积增大 | 所有页面已使用 React.lazy 动态导入，不影响首屏 |
| 租户管理涉及高危操作（删除租户） | 关键操作加二次确认弹窗 + 权限控制 |
| 文件管理大文件上传可能超时 | 后端已支持分片，前端使用 Upload 的 customRequest 对接 |
| 短信/邮件配置涉及敏感信息 | 密钥字段使用 Password 输入框，列表中脱敏显示 |

## Open Questions

- Dashboard 的统计数据 API 返回格式是否与 Vue 项目一致？（实施时验证）
- 代码生成器是否需要支持在线预览生成的代码？（Vue 项目支持，建议保留）
- 租户套餐的菜单树是否和角色菜单树使用同一接口？（需确认 API）
