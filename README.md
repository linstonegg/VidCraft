# VidCraft

AI 创意营销视频 Agent —— 前端工程仓库（M2 + M1.1/M2.1 P0 增量）。

用户输入产品网址，可补充演示授权、录屏、图片、说明文档；AI 先交付创意与图文分镜供确认，再以单镜头生成、版本回退、逐次报价、最终整片合成的方式完成 30/60/120 秒营销视频。

> 当前阶段：**M2 闭环 + M1.1/M2.1 P0 增量已落地**（研究访谈/宣称冲突、资产内容版本与使用位置、制作就绪度、只读依赖影响、生成建议规格）。P1 可视化探索/总览未实现。不包含真实爬取、真实登录、真实 AI/图片/语音生成、视频生成、支付或 FFmpeg；所有页面均有“演示模式”标识。

## 目录

```text
VidCraft/
├─ frontend/                 # Vben 5.7.0 workspace（主业务在 apps/web-ele）
│  ├─ apps/web-ele           # VidCraft 前端应用（Vue 3 / TypeScript / Vite / Element Plus）
│  ├─ apps/backend-mock      # Nitro Mock：M1 资料/理解 + M2 创意/剧本/分镜/预演
│  ├─ packages/ internal/    # Vben workspace 依赖与构建链
│  └─ tests/e2e/             # m0/m1/m2/m11 smoke + api-check
├─ docs/
│  ├─ AI创意营销视频Agent前端研发说明书.md
│  ├─ VidCraft工程基础搭建指南.md
│  ├─ VidCraft M1前端详细开发说明书.md
│  ├─ VidCraft_M2_AI创意策划剧本与图文分镜_前端开发说明书_Mock版_V1.0.md
│  ├─ engineering/           # 版本锁定、M0 验收、lint 报告、基线留证
│  ├─ features/m1/           # M1 API 契约 / Mock 场景 / 测试报告 / 演示与交接
│  ├─ features/m2/           # M2 API 契约 / Mock 场景 / 测试报告 / 演示与 M3 交接
│  ├─ features/m1.1-m2.1/    # M1.1/M2.1 增量合同、测试与 G0 核对
│  └─ screenshots/           # M0 / M1 / M2 / M1.1-M2.1 验收截图
└─ .gitignore
```

## 快速开始

```powershell
cd frontend
corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store
corepack pnpm dev:ele
```

- 前端：<http://localhost:5555>（以控制台为准）
- Mock：`http://localhost:5320/api`（`dev:ele` 自动拉起）
- 演示账号：`owner` / `editor` / `reviewer` / `admin`，密码均为 `123456`

## 验证命令

```powershell
corepack pnpm --filter @vben/web-ele run typecheck
corepack pnpm build:ele
corepack pnpm run lint
corepack pnpm exec vitest run apps/web-ele/src/utils/creative-video --dom
node tests/e2e/m2-api-check.mjs   # M2 API 闭环
node tests/e2e/m2-smoke.mjs       # M2 浏览器主链路
node tests/e2e/m1-api-check.mjs   # M1 回归
node tests/e2e/m1-smoke.mjs       # M1 回归
node tests/e2e/m0-smoke.mjs       # M0 回归
node tests/e2e/m11-api-check.mjs  # M1.1/M2.1 P0 API
node tests/e2e/m11-smoke.mjs      # M1.1/M2.1 P0 UI
```

详细说明见 `frontend/VIDCRAFT.md`；M2 文档见 `docs/features/m2/`；M1.1/M2.1 增量见 `docs/features/m1.1-m2.1/`。

## 文档

- [M2 API 契约](docs/features/m2/api-contract.md)
- [M2 Mock 场景与种子](docs/features/m2/mock-scenarios.md)
- [M2 测试报告](docs/features/m2/test-report.md)
- [M2 演示脚本与 M3 交接](docs/features/m2/demo-and-handover.md)
- [M1 文档](docs/features/m1/README.md)
- [M1.1/M2.1 增量说明](docs/features/m1.1-m2.1/README.md)
- [M1.1/M2.1 API 契约](docs/features/m1.1-m2.1/api-contract.md)
- [M1.1/M2.1 测试报告](docs/features/m1.1-m2.1/test-report.md)
- [版本锁定](docs/engineering/upstream-lock.md)
- [M0 验收记录](docs/engineering/m0-acceptance.md)
- [上游原版基线留证](docs/engineering/baseline-evidence.md)
