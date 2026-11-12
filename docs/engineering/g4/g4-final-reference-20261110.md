# G4 最终回归（Animatic 生产准备 + Schema2 迁移 + ReferenceAd）

> 时间：2026-11-10 10:12–10:20（Asia/Shanghai）  
> 日志：[`g4-final-reference-20261110.log`](./g4-final-reference-20261110.log)

## 执行方式

停止服务 → 删除 `apps/web-ele/.data` → 删除 `.nitro` → 启动全新 `dev:ele`（作业 `pwsh-01773718b8b44e8e`）→ 全量套件 → 质量检查。

首次启动基线：

```text
projects=4
handoff_shots=15
canEnterM3=True
```

## 结果

| 套件                | 结果                   |
| ------------------- | ---------------------- |
| `m0-smoke.mjs`      | **25/25**              |
| `m1-api-check.mjs`  | **43/43**              |
| `m1-smoke.mjs`      | **14/14**              |
| `m2-api-check.mjs`  | **40/40**              |
| `m2-smoke.mjs`      | **14/14**              |
| `m11-api-check.mjs` | **57/57**              |
| `m11-smoke.mjs`     | **21/21**              |
| Vitest              | **32/32**              |
| typecheck           | ✅ exit 0              |
| build:ele           | ✅ exit 0              |
| 根级 lint           | ✅ 0 warning / 0 error |

所有套件在全新进程首次运行通过。

## 本轮闭环

- Animatic 生产准备：
  - 当前快照 ID、总时长、镜头数、采用素材数、目标比例；
  - 按 AI 视频/动效/真实素材/静态图动画分组；
  - 逐镜头时长、比例、来源素材数、参考图数、模型档位（待报价）；
  - M3 占位入口由 `canEnterM3` 控制；
- Schema 2 迁移：
  - 新增纯函数 `normalizePersistedMockState` 与 fixture；
  - schema 1/2/3 归一化、m11/m21 补齐、非法版本拒绝；
  - Vitest 3 项；
- ReferenceAd：
  - 创建/列表/详情 API，`REFERENCE_AD` 来源默认排除产品分析；
  - `/references` 只读页；
  - `/angles` 同一 Insight 的“仅灵感”面板；
  - 未确认权属 422。

## 边界

- P1 Concepts 自由探索、Storyboard 按 Beat/历史版本总览、资产关系图、布局偏好仍未实现；
- `as-built-contract.md` 负责人签收仍待完成；
- 代码未提交 Git。
