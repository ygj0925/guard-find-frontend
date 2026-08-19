## Context

当前项目是基于 UMI 4 + Ant Design Pro 的企业会议室管理系统。项目已有完整的 API 服务层定义（`src/services/web/system/`），包含用户、角色、菜单、组织、字典、配置等模块的类型定义和 API 函数。但缺少前端页面实现。

参考项目 ballcat-ui-react 使用了自定义的 `Page.Modal` 组件封装 CRUD 页面，而当前项目使用 Ant Design Pro 的 ProComponents 组件库。需要将参考项目的功能用当前项目的技术栈重新实现。

## Goals / Non-Goals

**Goals:**
- 实现完整的系统管理模块，包含 7 个子功能：用户管理、角色管理、菜单管理、组织管理、字典管理、系统配置
- 使用 Ant Design 5 + ProComponents 组件库实现标准 CRUD 页面
- 使用 TailwindCSS 进行样式处理
- 实现按钮级权限控制
- 实现字典数据展示组件
- 实现用户头像裁剪上传功能

**Non-Goals:**
- 不实现国际化功能（当前项目无此需求）
- 不修改现有 API 服务层代码
- 不实现数据权限（scopeType）功能

## Decisions

### 1. 页面组件选型

**决策**: 使用 ProTable + ProForm + Modal/Dashboard 实现 CRUD

**理由**:
- ProTable 提供开箱即用的表格、搜索、分页功能
- ProForm 提供表单验证、布局功能
- Modal/Dashboard 用于弹窗编辑和详情展示
- 与 Ant Design Pro 生态一致，维护成本低

**替代方案**:
- 自定义 Page.Modal 组件：需要额外开发，增加复杂度
- 使用第三方 CRUD 组件：依赖外部维护

### 2. 权限控制方案

**决策**: 使用 AccessControl 组件 + access.ts 权限定义

**理由**:
- UMI 4 内置 access 插件，与框架一致
- 组件级权限控制，粒度细
- 权限标识与后端一致（如 `system:user:add`）

**实现方式**:
- 在 `src/access.ts` 中定义权限映射
- 创建 `AccessControl` 组件封装权限判断
- 页面中使用 `<AccessControl permission="system:user:add">` 包裹按钮

### 3. 字典组件方案

**决策**: 创建独立的字典组件库

**理由**:
- 字典数据需要缓存和刷新机制
- 多个组件复用（Tag、Select、Radio 等）
- 与后端字典接口对接

**组件清单**:
- `DictTag`: 字典标签展示
- `DictBadge`: 字典徽章展示
- `DictSelect`: 字典下拉选择
- `DictRadio`: 字典单选
- `DictProvider`: 字典数据提供者

### 4. 组织树组件方案

**决策**: 使用 Ant Design Tree 组件 + 自定义封装

**理由**:
- Tree 组件原生支持树形数据
- 支持搜索、选择、展开等交互
- 与组织管理页面复用

### 5. 头像裁剪上传方案

**决策**: 使用 react-cropper 库实现头像裁剪

**理由**:
- react-cropper 是成熟的图片裁剪库，支持 React 19
- 提供丰富的裁剪配置选项（比例、缩放、旋转等）
- 裁剪后输出 Blob，可直接用于 FormData 上传

**实现方式**:
- 创建 AvatarCropper 组件封装裁剪逻辑
- 支持图片选择、预览、裁剪、上传完整流程
- 与用户表单集成，支持头像更新

### 6. 目录结构

**决策**: 按功能模块组织页面代码

```
src/pages/system/
├── user/
│   ├── index.tsx          # 用户管理主页面
│   ├── components/
│   │   ├── UserForm.tsx   # 用户表单
│   │   ├── GrantModal.tsx # 授权弹窗
│   │   ├── PassModal.tsx  # 改密弹窗
│   │   └── AvatarCropper.tsx # 头像裁剪组件
│   └── organization-tree.tsx # 组织树组件
├── role/
│   ├── index.tsx          # 角色管理主页面
│   ├── components/
│   │   ├── RoleForm.tsx   # 角色表单
│   │   ├── MenuGrant.tsx  # 菜单授权
│   │   └── UserBind.tsx   # 用户绑定
├── menu/
│   ├── index.tsx          # 菜单管理主页面
│   └── components/
│       └── MenuForm.tsx   # 菜单表单
├── organization/
│   ├── index.tsx          # 组织管理主页面
│   └── components/
│       └── OrgForm.tsx    # 组织表单
├── dict/
│   ├── index.tsx          # 字典管理主页面
│   └── components/
│       ├── DictForm.tsx   # 字典表单
│       └── DictItemModal.tsx # 字典项管理
└── config/
    ├── index.tsx          # 系统配置主页面
    └── components/
        └── ConfigForm.tsx # 配置表单
```

## Risks / Trade-offs

### 风险 1: API 接口不匹配
**风险**: 前端页面与后端 API 接口可能存在字段差异
**缓解**: 使用现有类型定义，发现差异时及时调整

### 风险 2: 权限标识不一致
**风险**: 前端权限标识与后端不一致导致权限控制失效
**缓解**: 与后端确认权限标识规范，使用统一的命名规则

### 风险 3: 组件复用度
**风险**: 各模块 CRUD 页面存在重复代码
**缓解**: 提取通用组件和 hooks，如 useTable、useForm 等

### 风险 4: 性能问题
**风险**: 大量字典数据加载可能影响性能
**缓解**: 使用字典缓存机制，按需加载
