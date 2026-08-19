## Why

当前项目缺少系统管理模块，无法进行用户、角色、菜单、组织、字典等基础数据的管理。需要参考 ballcat-ui-react 项目的系统管理功能，在当前 UMI 4 + Ant Design Pro 项目中实现完整的系统管理模块，以支持企业级会议室管理系统的运维需求。

## What Changes

- 新增用户管理功能：用户 CRUD、角色授权、密码管理、状态切换
- 新增角色管理功能：角色 CRUD、菜单权限授权、用户绑定管理
- 新增菜单管理功能：菜单树形 CRUD、支持目录/菜单/按钮三种类型
- 新增组织管理功能：组织树形 CRUD、层级校正
- 新增字典管理功能：字典 CRUD、字典项管理（含状态切换、样式配置）
- 新增系统配置功能：配置 CRUD
- 新增对应的 API 服务层和类型定义
- 新增权限控制组件和字典展示组件

## Capabilities

### New Capabilities

- `user-management`: 用户管理模块，包含用户列表、创建、编辑、删除、授权、密码管理功能
- `role-management`: 角色管理模块，包含角色列表、创建、编辑、删除、菜单授权、用户绑定功能
- `menu-management`: 菜单管理模块，包含菜单树形列表、创建、编辑、删除功能，支持目录/菜单/按钮类型
- `organization-management`: 组织管理模块，包含组织树形列表、创建、编辑、删除、层级校正功能
- `dict-management`: 字典管理模块，包含字典 CRUD、字典项管理、状态切换、样式配置功能
- `system-config`: 系统配置模块，包含配置列表、创建、编辑、删除功能
- `auth-component`: 权限控制组件，支持按钮级权限控制
- `dict-components`: 字典展示组件集，包含 DictTag、DictSelect、DictRadio 等组件

### Modified Capabilities

（无，当前项目为新增功能）

## Impact

- **新增文件**：`src/pages/system/` 目录下 7 个子模块页面及组件
- **新增文件**：`src/services/web/system/` 目录下 API 服务和类型定义
- **新增文件**：`src/components/Auth/` 权限控制组件
- **新增文件**：`src/components/Dict/` 字典展示组件
- **依赖**：使用现有 Ant Design 5、ProComponents 组件库，无新增外部依赖
- **API**：需要后端提供 system/user、system/role、system/menu、system/organization、system/dict、system/config 等接口
