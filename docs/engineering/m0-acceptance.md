> 最新遗漏补齐与验证：[复查记录](../features/m1/gaps-followup-2026-11-08.md)。本文件保留各阶段历史结果。

# M0 验收记录（工程基线）

> 文档编号：VC-FE-M0-ACC-001  
> 验收日期：2026-11-06  
> 代码位置：`frontend/`（Vben 5.7.0 / `63a38dc`）  
> 演示地址（开发）：<http://localhost:5555>

## 1. 本次交付范围

- Vben 5.x workspace 基线（保留 `apps/web-ele`、`apps/backend-mock`、`packages/**`、`internal/**`）；
- VidCraft 中文品牌、自有 Logo/Favicon、默认中文、登录页演示角色；
- 标准布局菜单：工作台、项目中心、新建项目、素材库、生成任务、积分与账单、设置；
- 全屏 Studio 布局 `/studio/:id/*`：八个阶段路由 + 阶段导航 + 项目信息 + 无效 ID 错误态；
- Nitro Mock 业务接口：`health`、`projects`、`projects/:id`、`demo/users`、`demo/reset`、`demo/forbidden`、`demo/conflict`、`demo/error`（覆盖 200/401/403/404/409/500 与慢响应）；
- 四个固定种子项目与 Demo Reset；
- 统一业务适配层（`code: 'OK'` 契约）与统一错误文案；
- 演示模式 Banner（前端开关 + 服务端 `capabilities.mode` 共同判定）；
- 类型检查、构建、单元测试与浏览器冒烟脚本。

## 2. 核心门槛结果

| 编号 | 门槛 | 结果 | 说明 |
| --- | --- | --- | --- |
| M0-01 | 固定 Vben / Node / pnpm 版本可复现 | ✅ | Vben `v5.7.0`（`63a38dc`），Node 22.22.3，pnpm 10.33.4（Corepack），见 `upstream-lock.md` |
| M0-02 | `apps/web-ele` 可开发运行和构建 | ✅ | `dev:ele` 与 `build:ele` 均通过 |
| M0-03 | VidCraft 中文品牌、默认中文、Mock Banner 可见 | ✅ | 标题/Logo/Favicon/登录副标题/版权/Banner 均为 VidCraft |
| M0-04 | 标准布局与 Studio 布局可独立打开 | ✅ | `/dashboard` 等使用基础布局；`/studio/:id/*` 为 `noBasicLayout` 全屏 |
| M0-05 | Mock API、四个种子项目、角色切换可用 | ✅ | 四个种子项目经 HTTP 返回；owner/editor/reviewer/admin 角色可登录 |
| M0-06 | 权限、网络错误、空态、404 有明确反馈 | ✅ | 403 页面、可重试错误态、空态、项目不存在均验证 |
| M0-07 | 类型检查、构建、关键冒烟测试通过 | ✅ | 类型检查 exit 0、`build:ele` 完成、冒烟 18/18 |

## 3. 验收命令与结果

```powershell
# 依赖安装（已完成）
corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store

# 类型检查
corepack pnpm --filter @vben/web-ele run typecheck   # exit 0

# 构建
corepack pnpm build:ele                              # 完成

# 单元测试
corepack pnpm exec vitest run apps/web-ele/src/utils/creative-video --dom
# 1 file / 6 tests passed

# 浏览器冒烟（需 dev:ele 已启动）
node tests/e2e/m0-smoke.mjs                          # 22 passed（含菜单切换回归）

# 根级 lint（oxfmt + oxlint + eslint + stylelint）
corepack pnpm run lint                               # 通过，见 lint-report-m0.log
```

浏览器冒烟脚本覆盖：

```text
PASS  M0-T03 中文登录页 + VidCraft 标题
PASS  M0-T04 owner 登录到工作台 + Mock Banner
PASS  M0-T06 项目列表显示四个种子项目（cards=4）
PASS  M0-T06 项目数据来自 HTTP 业务接口
PASS  M0 种子标题存在
PASS  M0-T07 卡片进入 Studio 深链
PASS  M0-T07 Studio 全屏 + 八步导航 + 项目名
PASS  M0-T07 Studio 不渲染后台侧栏
PASS  M0-T08 Studio 刷新保持深链
PASS  M0-T09 无效项目不白屏且有返回入口
PASS  M0-T16 1366 宽度 Studio 可用
PASS  M0-T16 1920 宽度 Studio 可用
PASS  M0-06 未知路由显示 VidCraft 404 文案
PASS  M0-T04 owner 可访问积分与账单
PASS  M0-T13 新标签页保持登录态并加载项目
PASS  M0-T05 reviewer 无设置菜单
PASS  M0-T11 无权限路由给出 403 反馈
PASS  M0-T12 Demo Reset 恢复四个项目并有提示
PASS  M0-T10 Mock 不可用时显示可重试错误态
PASS  M0-T10 重试后恢复项目列表
PASS  M0 控制台无应用级错误
```

## 4. 冒烟用例对照

| ID | 操作 | 结果 |
| --- | --- | --- |
| M0-T01 | 新机器安装依赖 | ✅ 本次在 `frontend/` 用 corepack pnpm 完成，锁文件未变更 |
| M0-T02 | `corepack pnpm dev:ele` | ✅ 前端 5555，Nitro Mock 5320 |
| M0-T03 | 打开中文登录页 | ✅ 标题与界面为 VidCraft 中文 |
| M0-T04 | owner 登录 | ✅ 项目中心与账单入口可见 |
| M0-T05 | reviewer 登录 | ✅ 无设置菜单；账单访问被 403 拦截 |
| M0-T06 | 打开 `/projects` | ✅ 固定 4 个项目，HTTP 200 |
| M0-T07 | 打开 `/studio/project_resume_3d/ingest` | ✅ 全屏、8 步导航、项目名与时长 |
| M0-T08 | Studio 刷新 | ✅ 深链保持，无后台侧栏 |
| M0-T09 | `/studio/not_exists/ingest` | ✅ “项目不存在或已被移除” + 返回入口 |
| M0-T10 | 关闭/拦截 Mock 后刷新项目 | ✅ 可重试错误态，恢复后列表回来 |
| M0-T11 | 模拟 403 | ✅ 拒绝访问页面 |
| M0-T12 | Demo Reset | ✅ 恢复 4 个项目并提示 |
| M0-T13 | 浏览器刷新 / 新标签 | ✅ 登录态由 Vben 存储机制保持，项目数据重新请求 |
| M0-T14 | Typecheck + build:ele | ✅ 零类型错误、构建完成 |
| M0-T15 | DevTools / Network | ✅ 仅本地 `/api` 请求，无外部 AI 调用与密钥 |
| M0-T16 | 1366 / 1920 宽度 Studio | ✅ 标题与步骤不重叠，可滚动 |
| M0-T17 | 生产配置构建 | ✅ `VITE_NITRO_MOCK=false`，构建产物不依赖 Mock 服务 |

## 5. 截图

位于 `docs/screenshots/`：

| 文件                           | 内容                                |
| ------------------------------ | ----------------------------------- |
| `m0-01-login.png`              | 中文登录页、演示角色、品牌副标题    |
| `m0-02-dashboard.png`          | owner 工作台、Mock Banner、服务健康 |
| `m0-03-projects.png`           | 四个种子项目                        |
| `m0-04-studio-ingest.png`      | 全屏 Studio + 八步导航              |
| `m0-05-studio-reload.png`      | 刷新后深链保持                      |
| `m0-06-studio-not-found.png`   | 无效项目 ID 错误态                  |
| `m0-07-studio-1366.png`        | 1366 宽度 Studio                    |
| `m0-08-reviewer-forbidden.png` | reviewer 访问受限页面 403           |
| `m0-09-projects-error.png`     | Mock 不可用的可重试错误态           |
| `m0-10-studio-1920.png`        | 1920 宽度 Studio                    |
| `m0-11-not-found.png`          | 未知路由的 VidCraft 404 文案        |

### 5.1 上游原版基线（§2.1）

| 文件                                | 内容                             |
| ----------------------------------- | -------------------------------- |
| `baseline/baseline-01-login.png`    | 原版登录页（Vben Admin Ele）     |
| `baseline/baseline-02-home.png`     | 原版登录后主页（`/analytics`）   |
| `baseline/baseline-03-terminal.png` | 原版 `pnpm dev:ele` 终端运行状态 |
| `baseline/terminal-dev-server.log`  | 终端原始日志                     |

详见 [baseline-evidence.md](baseline-evidence.md)。

## 6. 与文档的偏差记录（如实说明）

以下为 M0 实施中与《VidCraft工程基础搭建指南》不完全一致之处，均不影响第 2 节门槛，但需要团队确认或后续补齐：

| 文档条款 | 实际情况 | 原因 / 处理建议 |
| --- | --- | --- |
| §2.1 先跑通原版并留三张原版截图 | 已在独立目录 `D:\LSProject\_vben-baseline` 跑通上游 v5.7.0 并补拍三张基线截图 | 见 [baseline-evidence.md](baseline-evidence.md) |
| §10.3 预留后续核心对象类型 | 已补 `types/creative-video/reserved.ts`（仅 id 占位，未实现字段/状态机） | 按“只预留、不提前实现”原则 |
| §11.1 / §12.3-1 Git 分支与提交 | 尚未创建 `chore/vidcraft-m0` 分支，也未提交 | 等待负责人确认后执行；旧实现仍在 `ad816d5` |
| §12.1 根级 `pnpm run lint` | 已执行根级 lint，修复本仓库新增文件的问题后通过（oxfmt / oxlint / eslint / stylelint） | 最终结果见 `lint-report-m0.log`；修复项包括重复 locale key、导入顺序、模板格式、`structuredClone` 等 |
| §7.3 方案 A：`responseReturn: 'body'` | 采用同一思路但独立 `RequestClient` + 保留 AxiosResponse 以读取 HTTP 状态 | 避免与 Vben 数值 code 拦截器混用，并保留 403/404/409/500 精确状态；已写入契约文档 |
| §7.5 health 返回体示例 | 采用 §9.1 的 `capabilities { mode, service, status }` 结构 | 与“前端配置 + 服务端模式共同判定”一致 |
| §5.4 reviewer 不应看到扣费入口 | reviewer 菜单可见“积分与账单”，点击进入 403 页面 | 为满足 M0-T11 的 403 演示；如需严格隐藏，应改为隐藏菜单并接受直接 URL 走 404 |
| §9.3 “项目列表已加载”成功提示 | 未在每次列表加载时弹提示 | 避免页面进入即 toast；仅在 Demo Reset 等显式操作给出成功提示 |
| §12.2 M0-T13 刷新/新标签 | 已验证新标签与 Studio 刷新；未验证“角色切换后菜单立即刷新” | 角色切换依赖登出重登，Vben 路由重建机制未专项测试 |
| §3.4 品牌资产 | 已补 logo/mark/favicon.svg/favicon.ico/avatar/slogan/og-default.png | favicon.ico 由品牌图标重新生成 |
| §3.4 缺省头像 | 已改为 `/brand/vidcraft-avatar.svg` | 不再请求 unpkg 外部头像 |
| 图标加载 | 菜单图标仍会请求 `https://api.iconify.design` | 上游 Vben 图标机制；离线环境部分图标缺失，接入内网前需预置图标集 |

## 7. 已知限制与 M1 交接

1. 所有业务页面为 M0 占位，不含真实 AI、视频生成、支付、FFmpeg；
2. Mock 状态保存在 Nitro 进程内存，重启或 Demo Reset 回到四个种子项目；
3. 权限只是前端路由过滤演示，不等于服务端安全授权；
4. 生产构建不包含可用 Mock；部署演示环境需单独规划；
5. M1 下一步：`/projects/new` 完整向导、`/studio/:id/ingest` 资料采集、`/studio/:id/understanding` 理解确认；
6. 若切换 `accessMode` 为 `backend`，上游 `MOCK_MENUS` 示例数据仍会返回旧 Demo 菜单，需在接入真实菜单前清理。
