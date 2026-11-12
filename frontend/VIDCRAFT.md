# VidCraft 前端（web-ele）开发说明

VidCraft 是基于 **Vue Vben Admin 5.7.0**（`v5.7.0` / `63a38dc`）的 Element Plus 应用，业务代码集中在 `apps/web-ele`，Mock 服务在 `apps/backend-mock`。

- 产品名称：VidCraft
- 中文副标题：AI 创意营销视频 Agent
- 代码业务命名空间：`creative-video`
- 当前阶段：**M2 创意/剧本/分镜/预演 + M1.1/M2.1 P0 增量（Mock 版）**

## 1. 环境要求

| 项      | 版本                                            |
| ------- | ----------------------------------------------- |
| Node.js | 22.18+（本机验证 22.22.3）                      |
| pnpm    | 10.33.4（由 Corepack 按 `packageManager` 提供） |

```powershell
node -v
corepack --version
corepack pnpm -v
```

## 2. 安装与启动

```powershell
cd D:\LSProject\VidCraft\frontend

corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store

# 开发（默认 http://localhost:5555，实际以控制台为准）
corepack pnpm dev:ele
```

`dev:ele` 在 `VITE_NITRO_MOCK=true` 时会自动在 5320 端口拉起 Nitro Mock，前端通过 Vite 代理 `/api` → `http://localhost:5320/api` 访问业务接口。

## 3. 质量命令

```powershell
# Element Plus 应用类型检查
corepack pnpm --filter @vben/web-ele run typecheck

# 构建
corepack pnpm build:ele

# 单元测试（VidCraft 业务工具函数）
corepack pnpm exec vitest run apps/web-ele/src/utils/creative-video --dom

# M2 API 闭环
node tests/e2e/m2-api-check.mjs

# M2 浏览器主链路
node tests/e2e/m2-smoke.mjs

# M1 API 闭环（回归）
node tests/e2e/m1-api-check.mjs

# M1 浏览器主链路（回归）
node tests/e2e/m1-smoke.mjs

# M0 回归
node tests/e2e/m0-smoke.mjs

# M1.1/M2.1 P0 API
node tests/e2e/m11-api-check.mjs

# M1.1/M2.1 P0 浏览器
node tests/e2e/m11-smoke.mjs
```

冒烟脚本会截图到 `docs/screenshots/`，结果对应 `docs/engineering/m0-acceptance.md`。

## 4. 演示账号

| 角色               | 用户名     | 密码     |
| ------------------ | ---------- | -------- |
| 产品拥有者（演示） | `owner`    | `123456` |
| 内容编辑（演示）   | `editor`   | `123456` |
| 审核员（演示）     | `reviewer` | `123456` |
| 系统管理员（演示） | `admin`    | `123456` |

全部为公开的演示标识，不含任何真实凭据。

## 5. 目录结构（业务部分）

```text
apps/web-ele/src/
├─ api/creative-video/          # client/projects/ingestion/understanding/jobs + M2 + asset-content/research/claims/readiness/specs
├─ components/creative-video/   # 状态组件、ProjectCard、m2/GuardNotice、m11/研究/资产/冲突、m21/就绪/规格
├─ composables/creative-video/  # use-mock-mode、use-job-polling、use-unsaved-changes、use-project-access
├─ locales/langs/{zh-CN,en-US}/ # vidcraft.json、authentication.json（业务词条，不改上游包）
├─ router/routes/modules/       # creative-video.ts（标准布局 + Studio 全屏 + /concepts 子路由）、profile.ts
├─ stores/creative-video/       # session、project、ingestion、understanding
├─ styles/creative-video.css    # 业务 Token 与 vc-* 命名空间样式
├─ types/creative-video/        # M1/M2 DTO + M1.1/M2.1 增量（asset-content/research/claim/readiness/spec/dependency）
├─ utils/creative-video/        # stages、format、errors、project-stage、validation、m2-timeline
└─ views/creative-video/
   ├─ dashboard/                # /dashboard 工作台
   ├─ projects/                 # /projects、/projects/new、/projects/:id
   ├─ studio/                   # StudioShell + ingest、understanding、angles、concepts、script、storyboard、animatic、generate
   ├─ assets|tasks|billing/     # 占位页
   └─ settings/{models,brand}/  # 占位页
apps/web-ele/public/brand/      # logo、mark、favicon、avatar、登录页 slogan、og-default
apps/web-ele/public/demo/m2/    # M2 分镜示意图（resume-3d / shared SVG）
apps/backend-mock/
├─ api/creative-video/v1/        # 统一入口 [...path].ts（鉴权/版本/幂等/场景分发）
└─ utils/creative-video/         # fixtures（四个 Seed）、store（M1+M2 仓储/任务/版本）、router
```

## 6. 关键行为

- 标准布局路由：`/dashboard`、`/projects`、`/projects/new`、`/projects/:id`、`/assets`、`/tasks`、`/billing`、`/settings/{models,brand}`；
- Studio 全屏路由：`/studio/:id/{ingest,understanding,angles,concepts,script,storyboard,animatic,generate,render}`，`/concepts` 是 S3 子步骤，Stepper 仍高亮“创意方向”；
- M1 主链路：列表 → 新建 → 资料采集 → 确认快照 → 理解任务 → 编辑与证据 → 审核确认 → 创意方向门禁；
- M2 主链路：4 个传播切口 → Brief → 三套差异化创意 → 30→120 秒 A/B/C → 7 节拍剧本 → Visual Bible → 15 镜头分镜 → 120 秒预演 → M3 handoff；
- M1.1/M2.1 P0：研究访谈（USER_NOTE 待确认）、宣称冲突/裁决、资产内容版本与使用位置、就绪度、只读依赖影响、生成建议规格；
- 任务由 Nitro 服务端按时间推进，读取页面会推进未完成任务，终态只应用一次结果；
- 写操作携带 `expectedVersion`；创建/分析/生成/确认携带 `Idempotency-Key`；同项目活动任务重复提交返回 409；
- 权限：前端按钮 + Mock 403 同时生效（owner 全流程、editor 编辑/发起任务、reviewer 只读/批注/按项目授权审批）；
- 已批准对象不可直接改，必须 Fork；上游变化会把下游标记 STALE，旧版仍可只读查看；
- 无效项目 ID：StudioShell 展示“项目不存在”并给出返回入口，不白屏；
- 演示模式 Banner：前端 `VITE_APP_MOCK_BUSINESS` 或服务端 `capabilities.mode === 'MOCK'` 任一成立即显示；
- 数据只能通过 `api/creative-video` 的 HTTP 接口获取，页面不直接 `import` Mock 数据。

## 7. 已知限制（M2 / M1.1-M2.1）

- 不调用真实 LLM/图片/TTS/视频模型、不登录第三方、不做真实视频或 FFmpeg；全部为 Mock；
- 默认 Reset 为四个 Seed 预置完整 M2 链路；测试/从零演示可用 `m2Seed=interactive` 仅保留 3D 简历初始切口；
- 图片为自制 SVG 分镜示意图，非真实生成；无真实配音，预演仅字幕+图片；
- 镜头拖拽排序、逐镜头图形化依赖图尚未实现；复制/拆分/合并、同 Beat 重排序、冲突差异面板、失效影响抽屉已支持；
- 版本冲突已提供“保留我的编辑/查看最新/另存新草稿”差异面板（概念/剧本/镜头），但尚无浏览器自动化用例；
- M1.1/M2.1 的 **P1**（概念探索画布、分镜总览、理解 Diff、参考广告、跨项目复用）未实现；
- 研究助手已串通“确认新资料快照 → 生成 R2”，并自动冻结证据定位快照；已批准报告仍只读；
- 资产引用写入仅允许草稿目标（已批准自动 Fork）；全量生成规格逐项编辑、R1/R2 字段级 Diff 尚未实现；
- 上传仅保存文件元数据，刷新后本地预览失效；无逐文件进度/取消；
- Mock 数据保存于 Nitro 进程内存，重启或 Demo Reset 后恢复四个固定项目；
- `pnpm build:ele` 只验证构建，生产构建不包含可用的业务 Mock；
- 其他 `apps/web-*` 上游示例应用仍保留，尚未精简。

更多细节见仓库根目录 `docs/engineering/`、`docs/features/m1/`、`docs/features/m2/`、`docs/features/m1.1-m2.1/`：

- `engineering/upstream-lock.md`：版本锁定与差异记录
- `engineering/m0-acceptance.md`：M0 验收记录
- `features/m1/api-contract.md`：M1 接口、权限、错误码
- `features/m2/api-contract.md`：M2 接口、守卫、版本/幂等
- `features/m2/test-report.md`：M2 测试结果与已知缺口
- `features/m2/demo-and-handover.md`：M2 演示与 M3 交接
- `features/m1/test-report.md`：测试结果与已知缺口
- `features/m1/demo-and-handover.md`：演示脚本与 M2 交接
- `features/m1.1-m2.1/README.md`：M1.1/M2.1 P0 增量与边界
- `features/m1.1-m2.1/api-contract.md`：增量 API
- `features/m1.1-m2.1/test-report.md`：M11/M21 测试结果
- `features/m1.1-m2.1/as-built-contract.md`：G0 源码核对
