# 上游版本锁定（Vben Admin）

> 文档编号：VC-FE-M0-LOCK-001  
> 更新时间：2026-11-06  
> 负责人：（待团队填写）

## 1. 锁定信息

| 项 | 值 |
| --- | --- |
| 上游仓库 | <https://github.com/vbenjs/vue-vben-admin> |
| 上游 Tag | `v5.7.0` |
| 上游 Commit SHA | `63a38dce49ba109f61607994e21ba921d8e970e9` |
| 锁定日期 | 2026-11-06 |
| 代码位置 | 本仓库 `frontend/`（保留 Vben workspace 结构，不是独立裁剪版） |
| 主业务应用 | `frontend/apps/web-ele`（Element Plus） |
| Mock 服务 | `frontend/apps/backend-mock`（Nitro） |

## 2. 工具链版本

| 项 | 锁定值 | 说明 |
| --- | --- | --- |
| Node.js | `22.22.3` | 满足上游 `engines.node = ^22.18.0 \|\| ^24.0.0` |
| pnpm | `10.33.4` | 由根 `package.json` 的 `packageManager` 指定，通过 Corepack 启用 |
| Corepack | `0.34.6` | 不生成 `package-lock.json`，不使用 npm 安装依赖 |
| 依赖锁文件 | `frontend/pnpm-lock.yaml` | 来自锁定 commit，必须提交 |

## 3. 复现安装

```powershell
cd D:\LSProject\VidCraft\frontend

# 使用 packageManager 指定的 pnpm 版本（无需全局安装 pnpm）
corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store

# 启动 Element Plus 应用（VITE_NITRO_MOCK=true 时会自动拉起 Nitro Mock）
corepack pnpm dev:ele
```

说明：

- `frontend/.npmrc` 使用 `registry=https://registry.npmmirror.com`；本次安装在该源下完成。
- 本地 pnpm store 放在仓库根目录 `.pnpm-store/`，已在 `.gitignore` 中忽略。
- CI 建议使用 `corepack pnpm install --frozen-lockfile`。

## 4. 从上游获取源码的方式（本次实际执行）

```powershell
git clone --depth 1 --branch v5.7.0 https://github.com/vbenjs/vue-vben-admin.git .upstream
# 复制 .upstream/** （不含 .git）到 frontend/
```

> 之所以不使用嵌套 Git 仓库，是因为业务仓库 `VidCraft` 自身就是一个 Git 仓库； `frontend/` 内保留上游文件但不保留上游 `.git`，后续升级时按上述命令重新对照。

## 5. workspace 保留范围（M0）

| 目录 | 处理 | 原因 |
| --- | --- | --- |
| `apps/web-ele` | 保留 | 主业务应用 |
| `apps/backend-mock` | 保留 | Mock 业务 API |
| `packages/**`、`internal/**`、`scripts/**` | 保留 | workspace 依赖与构建链 |
| `playground`、`docs` | 保留 | 上游自带，暂不影响构建；后续按需删除 |
| 其他 `apps/web-*` | 保留 | 避免删除后脚本/引用断裂；M0 稳定后再精简 |

## 6. 与上游的差异（M0 主动改动）

1. `apps/web-ele/.env*`：品牌、端口 5555、Mock 开关、`VITE_APP_MOCK_BUSINESS`、开发环境 `VITE_DEVTOOLS=true`。
2. `apps/web-ele/src/preferences.ts`：中文、`accessMode: 'frontend'`、`defaultHomePath: '/dashboard'`、自有 Logo 与默认头像、主题色、静态头部与 Banner 布局适配。
3. `apps/web-ele/src/router/routes/modules/`：删除上游示例 `dashboard.ts`、`demos.ts`、`vben.ts`；新增 `creative-video.ts`、`profile.ts`（仅保留个人中心路由）。
4. `apps/web-ele/src/views/`：删除 `views/dashboard/**`、`views/demos/**`；新增 `views/creative-video/**`；`views/_core/fallback/**` 改为 VidCraft 品牌文案。
5. `apps/web-ele/src/layouts/basic.vue`：加入演示模式 Banner 与 VidCraft 用户菜单，移除上游演示通知。
6. `apps/web-ele/public/brand/`：新增 logo、mark、favicon.svg、favicon.ico、avatar、登录页 slogan、og-default.png 等自有资产。
7. `apps/web-ele/src/types/creative-video/reserved.ts`：按总需求 10.3 预留后续核心对象类型（仅 id 占位）。
8. `apps/backend-mock/utils/mock-data.ts`：演示账号改为 `owner/editor/reviewer/admin`（公开假账号，密码仅用于本地 Mock）。
9. `apps/backend-mock/api/creative-video/v1/**`：新增 VidCraft 业务 Mock 接口（health / projects / projects/:id / demo/users / demo/reset / demo/forbidden / demo/conflict / demo/error，见 `mock-api-contract.md`）。

## 7. 已知遗留（不阻塞 M0）

- `apps/backend-mock/utils/mock-data.ts` 中仍保留上游 `MOCK_MENUS` / `MOCK_MENU_LIST` 示例数据，仅在把 `accessMode` 切换为 `backend` 时才会被请求；M0 固定使用 `frontend` 模式，因此不参与验收。
- 其他 `apps/web-*` 应用未删除，`pnpm run build` 全量构建会一并编译；M0 验收只要求 `build:ele`。
- 上游 `apps/web-ele/src/views/_core/about` 等页面文件保留但不再注册路由。
