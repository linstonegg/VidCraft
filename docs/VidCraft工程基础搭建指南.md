# VidCraft — Vben Admin 工程基础搭建指南（M0 / Mock 版）

> **文档编号**：VC-FE-M0-001  
> **版本**：V1.0  
> **编写日期**：2026-11-06  
> **项目名称**：VidCraft（AI 创意营销视频 Agent，暂用名）  
> **读者**：前端负责人、Vue 工程师、测试工程师、未来后端联调负责人  
> **技术基线**：Vue Vben Admin 5.x + `apps/web-ele`（Element Plus）+ Vue 3 + TypeScript + Vite + Pinia + pnpm + Nitro Mock  
> **本阶段边界**：只搭工程、布局、基础路由、模拟登录、API 契约、Mock Seed 与验收环境；不开发真正的 AI、视频生成、支付、登录探索或 FFmpeg。

---

## 0. 本文档与总需求文档的关系

本文档是《AI创意营销视频Agent_前端研发说明书_Mock版_v1.0.md》中 **M0：工程基线** 的独立执行手册。本次只交付可稳定扩展的工程底座，为后续 M1～M4 页面铺路。

**业务目标不变**：客户输入产品 URL，也可补充授权演示环境、录屏、图片、产品说明文档；Agent 理解产品与用户，寻找“PDF 简历 → 3D 网页简历”这类反常规价值或真实痛点，先交付创意与图文分镜供用户确认，再以单镜头生成、版本回退、逐次报价、最终整片合成的方式完成营销视频。

M0 **不实现**上述业务，只要把它们未来使用的路径、数据模型边界、Mock 接口和工作台外壳准备好。

### 0.1 M0 完成后的可见结果

- 在 Windows 开发机上执行统一命令，即可打开中文 VidCraft 演示站点。
- 能看到登录页、登录后标准布局、项目管理占位页，以及单独的全屏 Studio 布局占位页。
- 使用模拟身份 `owner` / `editor` / `reviewer` 登录，菜单和操作范围有区别。
- 前端通过 API Service 获取 Mock 数据，浏览器 Network 中能看到 HTTP 请求，而不是页面直接 `import mock.json`。
- Mock 服务至少提供四个固定项目（3D 简历、AI 知识库、CRM、营销视频 Agent）与恢复种子操作。
- 具备统一类型定义、错误提示、模拟模式标识、基础测试、构建命令、Git 约定和后续页面交付规范。

### 0.2 核心验收门槛

| 编号 | 门槛 | 不合格情况 |
|---|---|---|
| M0-01 | 固定的 Vben 版本、Node、pnpm，团队可复现安装 | 每个人安装出不同的依赖树 |
| M0-02 | `apps/web-ele` 能开发运行和构建 | 只在一名开发者电脑可启动 |
| M0-03 | VidCraft 中文品牌、默认中文、Mock Banner 可见 | 仍大量保留 Vben 品牌或误认为正式服务 |
| M0-04 | 标准布局和 Studio 布局可独立打开 | Studio 被后台侧栏挤占空间 |
| M0-05 | Mock API、四个种子项目、角色切换可用 | 靠组件内写死 JSON 充数 |
| M0-06 | 权限、网络错误、空态、404 有明确反馈 | 空白页、死循环或无提示 |
| M0-07 | 类型检查、构建、关键冒烟测试通过 | 只看页面视觉效果，不验收工程 |

---

## 1. 技术选型与版本锁定

### 1.1 已确定技术

| 分类 | 选择 | 本阶段用途 |
|---|---|---|
| 应用框架 | Vben Admin **5.x** | 登录、权限、路由、基础 UI、主题、国际化 |
| UI 应用 | `apps/web-ele` | Element Plus 版本；**不使用其他 UI App 作为主业务** |
| 前端 | Vue 3 / TypeScript / Vite | 业务页面、组件及编译 |
| 状态管理 | Pinia + Vben Store | 登录态与业务状态 |
| 路由 | Vue Router + Vben 路由约定 | 标准业务 / 独立 Studio |
| 请求层 | `@vben/request` | HTTP 调用、认证头、错误处理 |
| Mock | **Vben 内置 Nitro**，位置 `apps/backend-mock` | 本地 API、演示登录和项目 Seed |
| 工程 | pnpm workspace + Turbo | 多包依赖、构建与质量检查 |
| 单元测试 | Vitest | 纯业务函数、状态逻辑 |
| 端到端测试 | Playwright Test（如锁定版本尚无则独立配置） | 登录、菜单、Mock、Studio 冒烟 |
| 后续服务端 | ASP.NET Core 8 | **不在 M0 接入**，仅预留契约 |

**重要**：不要把旧版 Vben 2.x 的教程、目录或 webpack 配置复制到 V5 项目。官方 5.x 与 2.x 不兼容。

### 1.2 官方信息核对结果

截至本文编写时，Vben 官方快速开始要求 Node.js **22.18.0 及以上**；所选提交的根 `package.json.engines` 可能更具体，例如仅兼容 Node 22 的指定区间或 Node 24 的指定区间。**以团队锁定的 tag/commit 的 `engines` 字段为准**。

- 主仓库：<https://github.com/vbenjs/vue-vben-admin>
- 快速开始：<https://doc.vben.pro/guide/introduction/quick-start.html>
- Element Plus 演示：<https://ele.vben.pro/>
- 精简版本：<https://doc.vben.pro/guide/introduction/thin.html>

不要在需求文件中永久写死“最新版本 5.x.x”，因为上游会变化。实施者应记录：

```text
Upstream URL:
Upstream Git commit SHA:
Upstream tag（如使用）:
Node version:
pnpm version:
packageManager（根 package.json）:
锁定日期:
负责工程师:
```

并提交 `docs/engineering/upstream-lock.md` 到你们自己的仓库。

### 1.3 统一开发环境（Windows / PowerShell）

建议开发目录：`D:\LSProject\VidCraft`。目录及所有父级目录不要包含中文、空格等特殊字符（Vben 官方对此有提示）。

```powershell
# 开发机环境检查
node -v
npm -v
git --version
corepack --version

# 若 corepack 未安装：
npm install -g corepack

# 启用项目指定的 pnpm 版本
corepack enable

# 克隆到 VidCraft 目录（目标目录必须不存在）
cd D:\LSProject
git clone https://github.com/vbenjs/vue-vben-admin.git VidCraft
cd VidCraft

# 查看当前上游信息、锁定提交和版本要求
git rev-parse HEAD
git remote -v
Get-Content package.json | Select-String 'packageManager|engines|version'

# 如团队指定经验证的 tag/commit，先切换后再安装：
# git checkout <团队已验证的 commit SHA>

# 建立业务开发分支（仅示例）
git switch -c chore/vidcraft-m0

# 检查 pnpm 是否按 packageManager 生效
pnpm -v

# 在 Monorepo 根目录安装依赖
pnpm install

# 启动 Element Plus 应用
pnpm run dev:ele
```

在控制台查看实际显示的 URL（常见为 `http://localhost:5555`），不要假设端口绝对固定。

如果执行 `corepack enable` 遇到 Windows 权限错误：请用有权限的终端进行初次安装/启用，或按公司软件管理规范安装 Corepack；**不要为了绕过错误改用 `npm install` 或生成 `package-lock.json`**。

### 1.4 私有仓库接管建议

不建议在保留 GitHub 上游 `origin` 的情况下，直接把业务代码推送到公共 Vben 仓库。推荐：

```powershell
# 原 origin 改名为 upstream，保留后续查看更新的能力
git remote rename origin upstream

# 下面地址由团队替换成实际创建的私有仓库地址
git remote add origin <YOUR_PRIVATE_GIT_URL>

git remote -v
```

对初始代码的首次提交、历史裁剪等操作，由仓库管理员统一决定。不要未经确认就删除 `.git`、运行 `git push --force` 或重写公共历史。

---

## 2. Vben 初次运行与精简策略

### 2.1 先跑通原版，再开始精简

执行并留存三张截图：原版登录页、登录后的主页、终端服务运行状态。此时无需更改任何业务代码。

确认这些行为：

- 浏览器能访问 Vben 站点，静态资源无 404。
- 使用官方演示登录规则可以登录（以锁定版本 Mock 数据为准）。
- `apps/backend-mock` 提供的登录等接口能被访问。
- 刷新后登录保持行为符合仓库默认设置。
- `pnpm run build:ele` 至少能在原版通过一次。

### 2.2 精简只保留 Element Plus 应用

Vben 5.x 使用 workspace，**不能直接把 `apps/web-ele` 文件夹复制出来，脱离 `packages/` 独立运行**。它依赖多项 workspace 包。

第一轮精简建议：

| 目录/文件 | 处理 | 理由 |
|---|---|---|
| `apps/web-ele` | **保留** | 主业务应用 |
| `apps/backend-mock` | **保留** | Mock 业务 API，当前必需 |
| `packages/**` | **保留** | workspace 依赖，暂不裁剪 |
| `internal/**` | **保留** | 工具、配置、构建链可能依赖 |
| `pnpm-workspace.yaml` | **保留** | workspace 配置 |
| `pnpm-lock.yaml` | **保留并提交** | 安装复现 |
| 根 `package.json` / `turbo.json` | **保留** | 运行/构建脚本 |
| 其他 `apps/web-*` | 先不删除，M0 运行稳定后按需要移除 | 避免未识别的脚本或引用导致安装失败 |
| `docs`、`playground` | 视需要移除 | 删除前检查脚本、依赖和 CI |
| `_core` 登录/错误路由 | **保留** | 认证与路由兜底 |
| 官方示例 Demo 路由和菜单 | 确认无业务依赖后删除 | 避免演示项目污染交付 |

> **精简顺序**：保留原始提交 → 删除一类 Demo → 运行类型检查与构建 → 提交一次 Git commit；不允许一次性删除多个公共包后才集中排错。

### 2.3 根脚本建议

优先直接使用上游已有的脚本：

```powershell
# 根目录
pnpm run dev:ele
pnpm run build:ele

# 精准检查 Element Plus 应用（已核实 web-ele 有 typecheck 脚本）
pnpm --filter @vben/web-ele run typecheck

# 根级质量检查（覆盖全部工作区，工程稳定后执行）
pnpm run lint
```

如果删除其他 app 后，根目录里对应的 `dev:antd`、`build:naive` 等脚本不再适用，可以在精简阶段一并移除。**不要改动仍被 workspace 使用的内部包名。**

---

## 3. 品牌替换与基础环境配置

### 3.1 工程命名

- 对用户展示的产品名称：`VidCraft`
- 中文副标题：`AI 创意营销视频 Agent`
- 代码业务命名空间：`creative-video`
- 根文件夹：`VidCraft`
- Git 仓库名建议：`vidcraft-web` 或 `vidcraft`，由团队确定。
- 登录后主导航标题：`VidCraft 创作平台`

避免只修改网页标题，遗漏 Logo、登录副标题、浏览器 favicon、版权、404 页、页面默认路由和语言配置。

### 3.2 环境变量位置和建议值

在 `apps/web-ele/` 中修改原有 `.env`、`.env.development`、`.env.production`，**以锁定源码中的实际配置字段为准**。以下内容为建议改动，并非要求覆盖原文件的全部字段：

`apps/web-ele/.env`：

```dotenv
VITE_APP_TITLE=VidCraft 创作平台
VITE_APP_NAMESPACE=vidcraft-web-ele
```

`apps/web-ele/.env.development`：

```dotenv
VITE_PORT=5555
VITE_BASE=/
VITE_GLOB_API_URL=/api
VITE_NITRO_MOCK=true
VITE_APP_MOCK_BUSINESS=true
VITE_DEVTOOLS=true
```

说明：

- `VITE_NITRO_MOCK` 是官方已有的开发 Mock 开关。
- `VITE_APP_MOCK_BUSINESS` 是 **VidCraft 自定义开关**，只有团队实现它的逻辑后才有作用。
- `VITE_GLOB_API_URL` 是 Vben 的 API 基地址。业务 API 使用相对路径 `/creative-video/v1/...`，浏览器实际请求为 `/api/creative-video/v1/...`。
- 修改 `VITE_APP_NAMESPACE` 后会切换本地缓存命名空间。旧的 Vben 偏好设置可能仍存于浏览器，测试时要清理旧缓存。
- `VITE_` 环境变量对客户端可见，绝不能包含真实密码、API Key、短信密钥、云服务 Secret 或测试系统登录凭据。

`apps/web-ele/.env.production`：

```dotenv
VITE_BASE=/
VITE_GLOB_API_URL=/api
VITE_NITRO_MOCK=false
VITE_APP_MOCK_BUSINESS=false
```

**必须注意**：正式环境没有 Nitro 业务 Mock，单独构建前端包并不等于具备可运行的真实后端。本期仅用于构建验证；若要向团队演示一个部署后的 Mock 系统，请另外规划受限的“演示环境”，不要把开发用 Mock 直接作为生产接口暴露。

### 3.3 默认中文

修改 `apps/web-ele/src/preferences.ts`。官方推荐使用偏好覆盖：

```ts
import {
  appCopyrightPreferences,
  defineOverridesPreferences,
} from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    locale: 'zh-CN',
    accessMode: 'frontend', // M0：使用前端角色控制，后续接真实权限
  },
  widget: {
    languageToggle: false, // M0 中文优先；保留国际化基础能力
  },
  copyright: appCopyrightPreferences,
});
```

**注意**：上面用于说明需要合并的配置字段；如果锁定版本的 `preferences.ts` 另有覆盖内容，应合并而非直接替换整个文件。若源码的 `accessMode` 类型或默认值变化，以类型提示调整。

建议把业务语言包放在应用自己的 `src/locales/langs/zh-CN/` 等目录，**不要直接修改 Vben 公共语言包来写业务词条**。后续若支持英文，可补齐 `en-US` 对应 key。

示意文案 key：

```json
{
  "vidcraft": {
    "dashboard": "工作台",
    "projects": "项目中心",
    "projectsNew": "新建项目",
    "assets": "素材库",
    "tasks": "生成任务",
    "billing": "积分与账单",
    "studio": "AI 创作工作台"
  }
}
```

让页面通过 `$t` 获取文案，而不是把国际化能力移除。

### 3.4 品牌资产

基础目录建议：

```text
apps/web-ele/public/brand/
  vidcraft-logo.svg
  vidcraft-mark.svg
  og-default.png
```

配套检查：浏览器标题、favicon、导航 Logo、登录背景、缺省头像、空态插图、错误页文案。M0 可先使用简单的自有 SVG 图形或纯文字 Logo；**不得使用未授权的商业品牌素材**。

### 3.5 设计 Token

M0 先统一语义 token，不需要过度定制主题；推荐约定：

```css
/* 自定义业务变量示例，实际文件按当前 CSS 入口引入 */
:root {
  --vc-brand: #6757d7;
  --vc-page-min-width: 1024px;
  --vc-studio-header-height: 56px;
  --vc-border-radius: 12px;
}

.vidcraft-studio {
  min-height: 100vh;
  min-width: 0;
}
```

以上只是项目级示例变量，不能直接替代 Vben / Element Plus 的现有主题变量。全局主题修改前应确定设计稿，以免覆盖上游样式机制。

---

## 4. M0 基础目录规划

以下为**建议新增的业务目录**，不是声称 Vben 原生就有所有这些目录：

```text
VidCraft/
├─ apps/
│  ├─ web-ele/
│  │  ├─ src/
│  │  │  ├─ api/
│  │  │  │  ├─ request.ts                   # Vben 自带，保留并审查
│  │  │  │  └─ creative-video/
│  │  │  │     ├─ client.ts                # 业务 API 适配层
│  │  │  │     ├─ projects.ts
│  │  │  │     ├─ auth.ts                  # 如有必要，封装 mock 角色信息
│  │  │  │     └─ index.ts
│  │  │  ├─ types/creative-video/
│  │  │  │  ├─ common.ts
│  │  │  │  ├─ project.ts
│  │  │  │  └─ auth.ts
│  │  │  ├─ router/routes/modules/
│  │  │  │  └─ creative-video.ts
│  │  │  ├─ views/creative-video/
│  │  │  │  ├─ dashboard/index.vue
│  │  │  │  ├─ projects/index.vue
│  │  │  │  ├─ projects/new.vue
│  │  │  │  ├─ studio/StudioShell.vue
│  │  │  │  └─ studio/ingest/index.vue
│  │  │  ├─ components/creative-video/
│  │  │  │  ├─ DemoModeBanner.vue
│  │  │  │  ├─ PagePlaceholder.vue
│  │  │  │  ├─ EmptyState.vue
│  │  │  │  └─ ErrorState.vue
│  │  │  ├─ stores/creative-video/
│  │  │  │  ├─ session.ts
│  │  │  │  └─ project.ts
│  │  │  ├─ composables/creative-video/
│  │  │  ├─ utils/creative-video/
│  │  │  └─ locales/langs/zh-CN/
│  │  └─ public/brand/
│  └─ backend-mock/
│     └─ api/creative-video/v1/
│        ├─ projects.get.ts
│        ├─ demo/
│        │  ├─ reset.post.ts
│        │  └─ users.get.ts
│        └─ health.get.ts
├─ docs/
│  └─ engineering/
│     ├─ upstream-lock.md
│     ├─ mock-api-contract.md
│     └─ m0-acceptance.md
├─ packages/                         # 上游 workspace：保留
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
└─ package.json
```

所有业务组件/样式尽量只修改 `apps/web-ele`；非必要不要直接修改 `packages/` 中的公共底层包。

### 4.1 目录职责

| 目录 | 用途 | 禁止事项 |
|---|---|---|
| `api/creative-video` | 外部接口访问与响应适配 | 不写页面 UI 状态 |
| `types/creative-video` | 与后端共识的数据结构 | 不混入假数据实例 |
| `stores/creative-video` | 跨页面状态、筛选与草稿摘要 | 不作为钱包和付费的最终真相源 |
| `views/creative-video` | 路由页面 | 不直接导入 Mock fixture |
| `components/creative-video` | 通用业务组件 | 不直接发支付/扣费 API |
| `backend-mock` | 模拟服务、种子和状态 | 不保存用户真实密码 |
| `docs/engineering` | 环境、API、测试与决策记录 | 不放含密钥的配置 |

---

## 5. 基础导航路由与两套布局

### 5.1 M0 需要建立的页面

| 路由 | 作用 | M0 页面级别 |
|---|---|---|
| `/login`（实际登录路由以锁定源码为准） | 模拟登录 | 可用 |
| `/dashboard` | VidCraft 工作台 | 基础概览或占位 |
| `/projects` | 项目中心 | 展示四个 Seed 项目 |
| `/projects/new` | 新建项目 | 占位页，不要求实现完整向导 |
| `/studio/:id/ingest` | 产品资料采集的起点 | **全屏 Studio 占位** |
| `/studio/:id/understanding` | 产品理解 | 仅占位 |
| `/studio/:id/angles` | 创意方向 | 仅占位 |
| `/studio/:id/script` | 时长/剧本 | 仅占位 |
| `/studio/:id/storyboard` | 图文分镜 | 仅占位 |
| `/studio/:id/animatic` | 低成本预演 | 仅占位 |
| `/studio/:id/generate` | 单镜头生成/审核 | 仅占位 |
| `/studio/:id/render` | 最终合成 | 仅占位 |
| `/assets`、`/tasks`、`/billing` | 素材/任务/积分 | 仅占位或隐藏 |
| `/settings/models`、`/settings/brand` | 设置 | 仅占位或隐藏 |

下一阶段 M1 才会真正开始开发 `/projects/new` 与 `/studio/:id/ingest` 的业务交互。

### 5.2 标准布局 vs Studio 布局

**标准布局**（项目列表、任务、账单）：Vben 自带菜单、头部、面包屑、标签页等结构。  
**Studio 布局**（创意编辑、镜头预览）：自有全屏工作台，至少包含：

```text
┌────────────────────────────────────────────────────────────────────┐
│ 返回项目列表 | VidCraft | 项目名 | Mock 标识 | 保存状态 | 用户菜单 │
├────────────────────────────────────────────────────────────────────┤
│ 资料 → 理解产品 → 创意 → 剧本 → 分镜 → 预演 → 镜头 → 成片          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                        当前阶段的内容区                             │
│               M0：显示「功能尚未开始开发」占位组件                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

后续真正的分镜工作台，会在这里扩展成镜头列表 / 预览 / AI 导演的三栏布局；M0 **不做**复杂拖拽时间线。

### 5.3 路由实施方式

参考官方：业务路由应加到 `apps/web-ele/src/router/routes/modules/`，不是覆盖 `core`。顶级 `path` 以 `/` 开头，子路由为相对路径。`meta.noBasicLayout: true` 可使顶级路由不使用 Vben 默认基础布局。

**以下为结构示意代码**；不同锁定版本的路由生成可能对父路由 `component`、嵌套路由和权限元字段有约束，提交前需按该版本现有 `dashboard.ts` 做一次实际访问测试。

```ts
// apps/web-ele/src/router/routes/modules/creative-video.ts
import type { RouteRecordRaw } from 'vue-router';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    path: '/projects',
    name: 'VidCraftProjects',
    meta: {
      icon: 'lucide:folder-open',
      title: $t('vidcraft.projects'),
    },
    children: [
      {
        path: '',
        name: 'VidCraftProjectList',
        component: () => import('#/views/creative-video/projects/index.vue'),
        meta: { title: $t('vidcraft.projects') },
      },
      {
        path: 'new',
        name: 'VidCraftProjectNew',
        component: () => import('#/views/creative-video/projects/new.vue'),
        meta: { title: $t('vidcraft.projectsNew'), hideInMenu: true },
      },
    ],
  },
  {
    path: '/studio/:id',
    name: 'VidCraftStudio',
    component: () => import('#/views/creative-video/studio/StudioShell.vue'),
    meta: {
      title: $t('vidcraft.studio'),
      noBasicLayout: true,
      hideInMenu: true,
    },
    children: [
      {
        path: 'ingest',
        name: 'VidCraftStudioIngest',
        component: () => import('#/views/creative-video/studio/ingest/index.vue'),
        meta: { title: '产品资料' },
      },
      // M0 的其余阶段也按同样规则登记占位组件
    ],
  },
];

export default routes;
```

`StudioShell.vue` 必须保留 `<router-view />`，显示项目 ID、顶部阶段导航和演示状态。**占位页不得因为没有真实项目数据而白屏**；无效 ID 需要展示“项目不存在”并提供返回按钮。

### 5.4 菜单可见性

M0 建议标准菜单仅显示：工作台、项目中心、素材库、任务中心、积分与账单、设置；不要把 Studio 的八个阶段全放进后台菜单。

- Owner：可见全部常规业务菜单。
- Editor：可见项目、素材、任务；只读账单摘要或按设计隐藏具体充值功能。
- Reviewer：可见项目与待审核（先用任务中心占位），不能模拟扣费。
- Admin：运营页面预留，但不能默认获得所有客户演示资料的访问权。

后续完整权限规则参见总需求说明书。M0 只要求菜单与占位按钮演示，不把前端权限等同于真实安全授权。

---

## 6. Mock 登录、角色与会话

### 6.1 不得把真实凭据写进 Mock

模拟登录账户建议使用公开的**非真实账户**标识，仅用于演示角色：

| 测试身份 | 角色编码 | 权限演示 |
|---|---|---|
| 产品拥有者（演示） | `owner` | 全部项目、创意审核、模拟费用授权 |
| 内容编辑（演示） | `editor` | 编辑项目、申请生成（按配置） |
| 审核员（演示） | `reviewer` | 查看、评论与审核，默认不扣费 |
| 系统管理员（演示） | `admin` | 系统设置与全局模拟场景 |

可以在登录页提供“切换演示角色”的快捷选项，但要显著标记为 Mock。不要写入企业真实账号、密码、运营商信息或任何第三方视频模型密钥。

### 6.2 复用 Vben 自带登录链路

不要在 M0 自造第二套完全独立的 token store。优先检查锁定版本的：

```text
apps/web-ele/src/store/auth.*
apps/web-ele/src/api/core/**
apps/web-ele/src/api/request.ts
apps/backend-mock/api/**
```

实施步骤：

1. 明确现有 Mock 的登录请求、用户信息、权限码、token 返回结构。
2. 扩展 Mock 角色数据与示例用户，保留 Vben 自带认证链路。
3. `userInfo.roles` 返回的角色数组与 `meta.authority` 对应。
4. 设置 `accessMode: 'frontend'` 供 M0 权限演示。
5. 登录/登出、角色变化、无权限（403）、token 失效均有明确 UI。
6. 不得依赖“隐藏按钮”替代后续服务端权限校验。

### 6.3 处理 Mock 刷新后的状态

M0 可用 Vben 的已有存储机制管理登录展示状态；但下述数据不能只保存在一个 Vue 组件里：

- 当前角色、当前项目 ID、项目列表请求状态；
- 已选择的 Seed 场景；
- Demo Reset 操作及其结果。

保留接口抽象，真实后端上线后应由服务端负责权限与会话安全。

---

## 7. Mock API 基线：优先 Nitro，路径与返回结构统一

### 7.1 为什么这次不用一堆静态 JSON

项目以后有审核、版本管理、异步视频生成、积分冻结等复杂状态。如果页面直接从 `mockData.ts` 读取数据，后面需要大量重写。

M0 只须建立最小 HTTP 闭环：

```text
Vue 页面 / Pinia
    ↓
API Service（业务模块）
    ↓
Vben RequestClient
    ↓
Vite 开发代理 /api
    ↓
Nitro apps/backend-mock
    ↓
Fixture / 仿真 Service / 模拟仓储
```

Nitro 在项目中作为独立的**开发 Mock 服务**运行；如果团队的 `dev:ele` 只启动前端而 Mock 服务没有启动，应查看锁定版本的根级 `pnpm dev` 任务或后端 Mock 启动脚本，不能直接认定 `dev:ele` 自动启动所有服务。

### 7.2 业务 API 路径规则

与总说明书保持一致，约定业务 API 根路径：

```text
/api/creative-video/v1
```

例如：

```text
GET  /api/creative-video/v1/health
GET  /api/creative-video/v1/projects
GET  /api/creative-video/v1/demo/users
POST /api/creative-video/v1/demo/reset
```

注意区分 **Vben 的基础 URL**（`/api`）与**业务服务路径**（`/creative-video/v1/...`），不要组合出 `/api/api/creative-video/...`。

### 7.3 返回体契约

总 PRD 约定业务层使用：

```ts
export type ApiCode =
  | 'OK'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ApiResponse<T> {
  code: ApiCode;
  message: string;
  data: T;
  requestId: string;
  timestamp: string; // ISO 8601
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

**兼容性注意（必须测试）**：Vben 自带 `requestClient` 默认响应拦截器经常使用数值 `code: 0`，并在正常情况下直接返回 `data`。本项目业务响应约定为字符串 `code: 'OK'`。两者不能不经处理直接混用，否则“HTTP 200”也可能被前端当成失败。

推荐 M0 两种实现任选其一，团队统一，不得各页面自行处理：

**推荐方案 A：业务 API 适配层**。对创意视频业务接口使用 `responseReturn: 'body'`，读取完整业务响应体并由 `creative-video/client.ts` 统一校验 `code === 'OK'`，随后返回 `data`；保留 Vben 原有登录接口的数值 code 逻辑。

**方案 B：定制一份业务 RequestClient**。仅针对 `/creative-video/v1` 这组路由配置 `successCode: 'OK'` 的响应拦截器；务必避免影响已有认证链路。

**不可采用**：修改所有 Mock 登录返回为 `'OK'`，却不更新 Vben 的认证拦截器；或每个页面分别判断数值 0/字符串 OK。

### 7.4 业务 API Service 示例

下例展示方案 A 的思路；导入路径和泛型行为需以锁定版本编译验证：

```ts
// src/api/creative-video/client.ts
import { requestClient } from '#/api/request';
import type { ApiResponse } from '#/types/creative-video/common';

const BASE = '/creative-video/v1';

export async function getBusinessData<T>(path: string): Promise<T> {
  const body = await requestClient.get<ApiResponse<T>>(
    `${BASE}${path}`,
    { responseReturn: 'body' },
  );
  if (body.code !== 'OK') {
    throw new Error(body.message || '业务请求失败');
  }
  return body.data;
}
```

```ts
// src/api/creative-video/projects.ts
import { getBusinessData } from './client';
import type { VideoProject, PageResult } from '#/types/creative-video/project';

export function listProjects() {
  return getBusinessData<PageResult<VideoProject>>('/projects');
}
```

上面例子不包含所有 HTTP 方法，也不表示所有版本自动具有相同 TS 泛型签名。开发人员要以当前 `@vben/request` 的 `responseReturn` 类型进行一次实测。后续补齐 `postBusinessData`、`patchBusinessData`、`deleteBusinessData`。

### 7.5 Nitro Mock 接口示例

示意文件：`apps/backend-mock/api/creative-video/v1/health.get.ts`

```ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return {
    code: 'OK',
    message: 'success',
    data: {
      service: 'vidcraft-mock',
      status: 'ok',
      mode: 'mock',
    },
    requestId: 'req-m0-health',
    timestamp: new Date().toISOString(),
  };
});
```

若锁定的 Nitro 模板使用不同的 API 目录/自动导入约定，以该版本已有接口为准，不要复制路径却忽略服务器实际挂载方式。

**验收**：在浏览器 Network 里访问 `GET /api/creative-video/v1/health`，HTTP 返回 200，`code='OK'`，UI 显示 `Mock 服务可用`。模拟错误时应显示友好的错误态。

### 7.6 Mock 数据状态怎么保存？

建议：**固定种子 → 内存状态 → 可选 Nitro dev storage → Reset 恢复**。

- M0 项目列表可以固定种子返回。
- 后续增删改项目，必须走服务端 Mock Repository。
- 如果要模拟“刷新保留数据”，必须明确是刷新网页保留还是重启 Mock 服务保留。前者可用 Nitro 内存状态；后者需要开发期持久化或固定重置提示。
- 不允许前端本地存储演示环境的真实密码、视频模型 Key 或支付密钥。
- 演示数据不能混入生产数据。

---

## 8. 四个固定项目 Seed（M0 必须可见）

初始项目列表至少有下列固定数据。具体内容由后续 M1/M2 扩充；M0 先确保字段和列表稳定。

| ID | 标题 | 业务类型 | 创意切口 | 目标时长 | 场景 |
|---|---|---|---|---:|---|
| `project_resume_3d` | 3D 网页简历营销片 | 个人展示 | PDF 简历 → 交互式 3D 主页 | 120s | 核心产品样例 |
| `project_knowledge_base` | AI 知识库宣传片 | 效率工具 | 收藏很多、需要时找不到 | 30s | 痛点营销 |
| `project_crm` | CRM 营销短片 | 企业 SaaS | 客户跟进遗漏 | 60s | 演示授权待补充 |
| `project_video_agent` | VidCraft 自身宣传片 | AI 创意工具 | 做好网站却不会推广 | 45s | 元产品样例 |

### 8.1 最小 TypeScript 模型

```ts
export type ProjectStage =
  | 'INGEST'
  | 'UNDERSTANDING'
  | 'ANGLES'
  | 'SCRIPT'
  | 'STORYBOARD'
  | 'ANIMATIC'
  | 'GENERATE'
  | 'RENDER';

export type ProjectStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'WAITING_REVIEW'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface VideoProject {
  id: string;
  title: string;
  productUrl?: string;
  description: string;
  durationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  platform: 'douyin' | 'wechat_channels' | 'bilibili' | 'tiktok' | 'other';
  status: ProjectStatus;
  currentStage: ProjectStage;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 8.2 Mock 返回示例

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "req-m0-projects-001",
  "timestamp": "2026-11-06T00:00:00Z",
  "data": {
    "items": [
      {
        "id": "project_resume_3d",
        "title": "3D 网页简历营销片",
        "productUrl": "https://example.com/3d-resume",
        "description": "PDF 简历到 3D 网页简历的创意营销视频",
        "durationSec": 120,
        "aspectRatio": "9:16",
        "platform": "douyin",
        "status": "IN_PROGRESS",
        "currentStage": "STORYBOARD",
        "ownerId": "demo_owner",
        "createdAt": "2026-11-01T02:00:00Z",
        "updatedAt": "2026-11-05T02:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 4
  }
}
```

> 注：以上仅展示第一条项目，实际 Mock 接口需返回四条 Seed 数据且 `total` 与 `items` 一致；`example.com` 为占位网址，不代表实际产品网站。

### 8.3 Seed 服务验收

1. 登录 owner，项目列表能请求并显示四个项目。
2. 点击 3D 简历项目，进入 Studio 占位页，显示项目名称、120 秒目标和当前阶段。
3. 刷新 Studio 深链不会丢失 URL 中的项目 ID。
4. 使用不存在的 ID 时显示 404/项目不存在，不得白屏。
5. 点击演示重置接口，回到四个固定项目，并向用户显示“已恢复 Mock 初始数据”。

---

## 9. Mock 模式 Banner / 通用状态组件

### 9.1 Mock Banner（必须）

M0 所有登录后页面（含 Studio）顶部或页面明显位置均需显示：

> **演示模式｜当前项目数据、AI 结果、生成任务与积分记录均为模拟数据，不会调用真实 AI 模型、不会产生真实费用。**

在生产服务模式下应隐藏，且显示与否不等于真正的后端安全检查。

示意：

```vue
<script setup lang="ts">
const isMock = import.meta.env.DEV &&
  import.meta.env.VITE_APP_MOCK_BUSINESS === 'true';
</script>

<template>
  <div v-if="isMock" role="status" class="vc-demo-banner">
    演示模式：当前操作仅使用模拟数据，不会调用真实模型或产生真实费用。
  </div>
</template>
```

之后可以让服务端返回 `capabilities.mode = MOCK`，以前端配置与服务端模式**共同**决定标识，避免把编译环境当成唯一事实源。

### 9.2 通用组件至少包括

- `PagePlaceholder`：尚未开发的模块，展示模块说明和预计 M1/M2 承接入口，不伪造可用按钮。
- `EmptyState`：无项目、无任务、无素材时显示引导。
- `ErrorState`：接口错误/无权限/超时，提供重试或返回。
- `LoadingState`：统一加载骨架屏或旋转提示。
- `DemoModeBanner`：模拟模式说明。

### 9.3 全局消息规则

| 事件 | 文案示例 |
|---|---|
| 模拟请求成功 | “项目列表已加载” |
| 模拟请求失败 | “演示服务暂时不可用，请重试” |
| 401 | “登录状态已失效，请重新登录” |
| 403 | “当前演示角色无权访问该页面” |
| 404 | “项目不存在或已被移除” |
| 409 | “项目版本已变化，请刷新后重试” |
| Mock Reset | “演示数据已恢复初始状态” |

不允许将开发错误堆栈、模拟密码或 token 展示给普通用户。

---

## 10. 未来前后端联调的边界，M0 就要统一

### 10.1 请求分层

页面调用顺序：

```text
Page / Component → Composable/Store → Domain API Service
                                      → Request Adapter → HTTP
```

不得出现：

```ts
// ❌ 禁止页面直接 import 演示数据库
import projects from '../../../../../backend-mock/fixtures/projects.json';

// ❌ 禁止页面自己实现“扣费”或假装发起视频模型调用
wallet.balance -= 24;
```

正确方向：

```ts
// ✅ 页面调用统一业务 API；实现由 Nitro / 将来的 .NET 8 提供
const projects = await listProjects();
```

### 10.2 统一错误模型

接口要以 HTTP 状态码 + 业务 `code` 组合表达错误。特别是未来任务冲突、预算不足、镜头版本冲突，不允许全部返回 HTTP 200 + “失败”字符串。

M0 至少模拟：200、401、403、404、409、500，以及慢响应（例如 1～3 秒）与网络断开。后续阶段再补 202 异步任务、429 限流、503 模型不可用等。

### 10.3 预留后续核心对象

M0 不做完整表单和状态机，但文件名、命名空间与 API 合同要考虑这些对象：

- `ProductUnderstandingRevision`：产品理解与证据等级；
- `MarketingAngle` / `CreativeConcept`：传播切口与 3 套创意；
- `DurationPlan` / `ScriptRevision`：30 秒创意适配 120 秒；
- `ShotRevision`：图文分镜内容版本；
- `ShotVideoVersion`：视频候选版本，旧版不可覆盖；
- `GenerationJob`：异步生成任务；
- `GenerationQuote`、`BillingOrder`、`CreditLedger`：报价 / 冻结 / 结算 / 释放；
- `TimelineSnapshot`、`ProjectRender`：整片合成及历史成片版本。

**M0 只预留目录和 TypeScript 类型导出占位**；不要提前实现没有确认的复杂业务模型，避免与总需求文档实际字段偏离。

---

## 11. Git、协作、编码与提交规范

### 11.1 Git 分支

建议：

```text
main                稳定可演示
chore/vidcraft-m0   M0 工程基线
feature/projects    M1 项目创建
feature/studio      M2 创作工作台
fix/<issue>         修复问题
```

团队自行选择 GitHub / Gitee / GitLab 私有仓库，但必须确保上游依赖、内部权限和代码审查符合公司规定。不要把任何真实密钥提交到 Git。

### 11.2 提交规则

采用常见 Conventional Commits：

```text
chore: initialize vidcraft web-ele workspace
feat: add vidcraft brand and mock banner
feat: add project routes and studio shell
feat: add nitro mock seed projects
fix: handle unauthorized project access
```

PR 中至少写明：变更范围、影响路由、Mock 请求示例、运行命令、截图、测试结果和回滚方案。

### 11.3 编码规范

- 组件使用 Vue 3 `<script setup lang="ts">`；启用严格类型检查，不随意使用 `any`。
- API 类型复用统一定义；后端字段以总说明书契约为准，不能各自定义一套。
- 大页面拆分为展示组件与业务状态逻辑，不把 API、权限和 DOM 操作全部放进一个 Vue 文件。
- 不引入第二套 UI 框架；优先使用 Element Plus + Vben 原有组件。
- 尽量不修改 `packages/` 内部实现；必须修改时在 PR 中记录原因和上游升级风险。
- Studio 样式统一使用业务命名空间，避免全局覆盖 Vben 的 CSS。
- 统一使用 ISO 日期、带明确时区的时间；金额、积分等以后必须独立于 UI 状态。
- 所有异常包含用户可理解的行动建议，避免只有 console.error。

### 11.4 不要在 M0 提前做的事

- 不要开发真视频编辑器、拖拽时间线、AI 导演聊天框的完整逻辑。
- 不要接入 Seedance、可灵、Qwen、豆包等真实计费 API。
- 不要开发真充值 / 支付、真演示账号密码收集、Playwright 浏览器登录探索。
- 不要部署面向外部客户的无鉴权 Nitro Mock 服务。
- 不要为了“看起来完成”让无功能按钮假装执行了真实生成。

---

## 12. 质量检查、测试及验收

### 12.1 团队统一执行命令

```powershell
# 根目录依赖安装（锁定后 CI 使用 frozen-lockfile）
pnpm install

# 运行 Element Plus 应用
pnpm run dev:ele

# Element Plus 应用类型检查
pnpm --filter @vben/web-ele run typecheck

# 构建 Element Plus 应用
pnpm run build:ele

# 仓库级 lint（有时会覆盖其他 App；根据精简状态执行）
pnpm run lint
```

正式 CI 建议 `pnpm install --frozen-lockfile`。如果仓库内单元测试或 E2E 脚本路径随版本变化，按**实际锁定的 `package.json.scripts`**执行，不要直接粘贴一个不存在的命令。

### 12.2 M0 冒烟测试用例

| ID | 操作 | 预期结果 | 优先级 |
|---|---|---|---|
| M0-T01 | 新电脑 clone + pnpm install | 无缺依赖、无锁文件改动 | P0 |
| M0-T02 | `pnpm run dev:ele` | 打开前端，无启动错误 | P0 |
| M0-T03 | 打开中文登录页 | 标题为 VidCraft，中文界面 | P0 |
| M0-T04 | 选择 owner 角色登录 | 可见项目中心和模拟余额入口 | P0 |
| M0-T05 | 切换 reviewer | 无编辑/模拟扣费入口 | P0 |
| M0-T06 | 打开 `/projects` | HTTP 返回固定 4 个项目 | P0 |
| M0-T07 | 打开 `/studio/project_resume_3d/ingest` | 全屏 Studio、8 步导航、产品名 | P0 |
| M0-T08 | 在 Studio 刷新页面 | 深链仍能访问，不显示默认 Vben 后台侧栏 | P0 |
| M0-T09 | 打开 `/studio/not_exists/ingest` | 项目不存在，有返回入口 | P0 |
| M0-T10 | 关闭 Mock 服务后刷新项目列表 | 显示可重试错误态 | P0 |
| M0-T11 | 模拟 403 | 角色无权限提示正确 | P0 |
| M0-T12 | 点击 Demo Reset | 恢复四条种子项目 | P1 |
| M0-T13 | 浏览器刷新 / 新标签页 | 登录行为与项目查询状态符合设计 | P1 |
| M0-T14 | Typecheck + build:ele | 零类型错误、构建完成 | P0 |
| M0-T15 | DevTools / Network 检查 | 无真实密钥、无未授权外网 AI 调用 | P0 |
| M0-T16 | 1366 与 1920 宽度打开 Studio | 标题/步骤不重叠，内容可滚动 | P1 |
| M0-T17 | 切换到生产配置构建 | 无 Nitro Mock 作为可调用正式 API 的依赖 | P0 |

### 12.3 M0 交付物

交给项目负责人以下内容：

1. **可运行的前端代码仓库**（带 Vben 固定版本、锁文件、团队分支）。
2. **开发环境 README**，包含 Node/pnpm 版本、启动命令和问题排查。
3. **工程结构说明**与 `docs/engineering/upstream-lock.md`。
4. **Mock API 契约**和四个 Seed 演示项目。
5. **标准布局 + Studio 布局截图**、Mock 登录与角色截图。
6. **类型检查/构建报告**，至少包含 M0-T01～M0-T15 的验收结果。
7. **M1 交接清单**：下一步开发 `/projects/new`、`/studio/:id/ingest`、`/studio/:id/understanding`。

### 12.4 Definition of Done（签收标准）

M0 可签收，当且仅当：**新开发者在自己的机器上能安装、登录、查看四个 Seed 项目、打开独立 Studio 深链，Mock API 与角色行为可复现，同时类型检查、构建和 P0 冒烟用例全部通过**。

只完成 Vben 克隆、修改标题或者创建几个静态页面，**不算完成 M0**。

---

## 13. 常见问题及排查顺序（Windows）

### 13.1 `pnpm` 无法运行或版本不兼容

检查：`node -v`、`corepack --version`、`pnpm -v` 和根 `package.json` 的 `packageManager`、`engines`。优先按官方 Corepack 方式安装指定 pnpm，不随意升级到未验证的大版本。

### 13.2 克隆正常但安装报奇怪路径错误

检查整个项目目录及父目录是否含空格/非 ASCII 字符；Windows 路径过长时，可将仓库存到 `D:\LSProject\VidCraft` 这类短路径，并按团队规范确认 Git 长路径设置。

### 13.3 页面打开但 API 返回 404

先检查 `.env.development` 的 `VITE_GLOB_API_URL=/api`，再检查 Nitro 是否启动、Vite Proxy 是否把 `/api` 转给实际的 Mock 服务。**不要只根据前端端口正常就判断 Mock 正常**。

### 13.4 API 返回 200 但 UI 显示失败

优先检查 `src/api/request.ts` 内默认响应拦截器是否按数值 `code: 0` 判断成功，而新业务 Mock 返回字符串 `code: 'OK'`。按照第 7.3 节配置统一 Adapter，避免乱改所有登录 API。

### 13.5 默认语言改了但仍显示旧文案

检查 Vben 偏好缓存和 `VITE_APP_NAMESPACE`；清除旧缓存并重新登录。查看新增业务词条是否已放在应用级语言包且导入正确。

### 13.6 Studio 仍显示左侧管理菜单

检查 `meta.noBasicLayout` 是否设在**顶级路由**，以及 `StudioShell` 是否自己渲染了 `router-view`。按照锁定版本的路由处理代码查看是否被路由转换逻辑改写。

### 13.7 移除不使用的 App 后 pnpm build 失败

检查根 `package.json.scripts`、`pnpm-workspace.yaml` 和 Turbo 任务是否仍指向已经删除的 App；同时确认未误删 `packages` 或 `internal`。

### 13.8 本地数据刷新后消失

区分三类：Vue 组件状态丢失、浏览器刷新、Nitro Mock 进程重启。M0 可从 Seed 恢复；真正需要持久化时使用 Mock 服务持久层，而不是把账务或认证信息塞进浏览器 `localStorage`。

### 13.9 登录后 403 或菜单不出现

检查 `accessMode`、`userInfo.roles`、路由 `meta.authority` 三处是否匹配，以及鉴权信息是否先于动态路由生成完成。不要靠关掉权限系统来掩盖错误。

### 13.10 离线、国内源和依赖安装

优先确认企业网络允许访问 GitHub/npm，再按团队网络规范使用 registry 镜像。官方快速开始提供 Corepack 镜像配置示例；不要在仓库中提交包含代理认证信息的 `.npmrc`。

---

## 14. 建议的 M0 任务分解

| 任务编号 | 工作项 | 负责人建议 | 前置依赖 | 产出 |
|---|---|---|---|---|
| FE-M0-01 | 上游版本锁定、仓库创建 | 技术负责人 | 无 | lock 文档、私有仓库 |
| FE-M0-02 | Windows 环境与安装验证 | 前端工程师 | 01 | 环境 README、启动截图 |
| FE-M0-03 | Element Plus 主应用精简 | 前端工程师 | 02 | 稳定构建的 web-ele |
| FE-M0-04 | VidCraft 品牌/中文/主题 | UI + 前端 | 02 | 中文品牌界面 |
| FE-M0-05 | 标准导航与 Studio 全屏壳 | 前端 | 02/04 | 可深链的两套布局 |
| FE-M0-06 | Mock 认证与权限角色 | 前端 | 02 | owner/editor/reviewer |
| FE-M0-07 | API 适配层和错误状态 | 前端 | 02 | 统一业务 client |
| FE-M0-08 | Nitro Seed API 与 Reset | 前端 / Mock 负责人 | 07 | 四项目 + health + reset |
| FE-M0-09 | 基础单元/冒烟测试与验收 | QA + 前端 | 03～08 | 测试报告 |

建议并行：品牌与布局、Nitro Mock 可以并行；API 字段和角色约定必须由负责人提前冻结。

---

## 15. M0 完成后如何进入下一阶段

下一阶段顺序：

1. **M1-01：新建项目** `/projects/new`：URL、视频目标、平台、时长、比例，创建项目后进入资料采集。
2. **M1-02：产品资料采集** `/studio/:id/ingest`：模拟公开网页解析、授权演示系统（不保存真实密码）、录屏/图片/文档上传。
3. **M1-03：产品理解确认** `/studio/:id/understanding`：功能事实、用户画像、真实痛点、推测与证据、人工审核。
4. 随后进入 M2：传播切口发现、三套创意、剧本与图文分镜；M3：镜头版本与积分；M4：整片预演及模拟合成。

**建议团队的第一条演示路径**：Mock 登录 → `/projects` 显示四个项目 → 进入 `project_resume_3d` → 全屏 Studio 显示八步流程 → 当前阶段展示“待开发”占位，确认以后能填入真实模块。

---

## 16. 官方参考与核对记录

以下均为 Vben 官方项目文档或公开源代码；实施时先选择固定 tag/commit，再以对应版本源码为最终依据。

1. Vben GitHub：<https://github.com/vbenjs/vue-vben-admin>
2. 快速开始、Node/pnpm 安装：<https://doc.vben.pro/guide/introduction/quick-start.html>
3. 官方精简策略：<https://doc.vben.pro/guide/introduction/thin.html>
4. 配置与环境变量：<https://doc.vben.pro/guide/essentials/settings.html>
5. 路由及 `noBasicLayout`：<https://doc.vben.pro/guide/essentials/route.html>
6. Mock 与 `@vben/request`：<https://doc.vben.pro/guide/essentials/server.html>
7. 默认中文及业务语言包：<https://doc.vben.pro/guide/in-depth/locale.html>
8. 角色与权限：<https://doc.vben.pro/guide/in-depth/access.html>
9. `web-ele` package.json：<https://github.com/vbenjs/vue-vben-admin/blob/main/apps/web-ele/package.json>
10. 根 package.json：<https://github.com/vbenjs/vue-vben-admin/blob/main/package.json>
11. `web-ele/src/preferences.ts`：<https://github.com/vbenjs/vue-vben-admin/blob/main/apps/web-ele/src/preferences.ts>
12. 路由参考示例：<https://github.com/vbenjs/vue-vben-admin/blob/main/apps/web-ele/src/router/routes/modules/dashboard.ts>

**最后提醒**：本文提供的是经过官方文档核对的实施指南和示例代码，尚未实际在你们开发机上执行 `pnpm install`、`pnpm build` 或创建 VidCraft 代码仓库。因此，本文件可作为任务书，但**不能把文档内的示意代码当成已经通过 CI 的成品代码**。工程师必须以锁定版本实测结果为准，按第 12 节验收后再宣布 M0 完成。

---

**文档结束｜VC-FE-M0-001｜下一份文档：M1「新建项目 + 产品资料采集」前端详细设计。**
