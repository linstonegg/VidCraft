# M1.1 + M2.1 P0 测试报告

> 环境：`dev:ele`（5555）+ Nitro Mock（5320），Chrome headless；四 Seed 默认 full，M2 主链路使用 `m2Seed=interactive`。  
> 本报告只记录实际运行结果；不把“文档检查”当作 E2E。

## 1. 汇总

| 套件                                  | 结果      |
| ------------------------------------- | --------- |
| `tests/e2e/m11-api-check.mjs`         | **65/65** |
| `tests/e2e/m11-smoke.mjs`             | **38/38** |
| `tests/e2e/m0-smoke.mjs`              | **25/25** |
| `tests/e2e/m1-api-check.mjs`          | **44/44** |
| `tests/e2e/m1-smoke.mjs`              | **14/14** |
| `tests/e2e/m2-api-check.mjs`          | **49/49** |
| `tests/e2e/m2-smoke.mjs`              | **27/27** |
| `tests/e2e/p1-final-gaps.mjs`         | **2/2**   |
| Vitest（creative-video utils）        | **35/35** |
| `typecheck` / `build:ele` / 根级 lint | 通过      |

## 2. M11 API 覆盖（65）

- 旧素材迁移稳定 v1；有 fixture READY、无文件 UNAVAILABLE；
- 内容版本新增不覆盖旧版；拒绝任意外网 fixture；
- 素材用途元数据与反向引用返回具体来源；
- CRM 研究缺口；会话、下一批问题 ≤3；回答生成 USER_NOTE、不重复；跳过仅当前会话；
- CRM 两类冲突；量化 80% `BLOCKED`；自动发送 `NEEDS_REVIEW`；
- 裁决提交/批准生成 R2 DRAFT，R1 仍 active；
- 3D 就绪度 `canEnterM3=true`/`CURRENT`，含镜头/参考图/预演项；
- 依赖影响只读返回引用对象；
- 生成规格未配置为 suggestion，保存后 CURRENT，拒绝大写 mode；
- 证据定位快照绑定修订且可读。

## 3. M11 UI 覆盖（38）

- 研究助手展示缺口/建议问题/USER_NOTE 提示；
- 素材使用位置展示内容历史、用途、反向引用；新增 V2 不清空 V1；
- 素材采用前展示只读影响预览；
- 视觉规范抽屉提供资产引用选择器；
- 生成建议显示四种 generationMode 分组；
- 研究助手确认资料快照后进入 R2 生成页；
- 宣称冲突抽屉展示两类冲突与 BLOCKED；
- 分镜页就绪度显示“可进入 M3 准备”，明细含参考图/预演；
- 预演页生成建议规格可保存首镜并变为 CURRENT；
- 控制台无应用级错误。

截图：`docs/screenshots/m11/`（research、claims、readiness、generation-specs）。

## 4. 原 M1/M2 回归

- M0：四 Seed、菜单切换内容区、Studio 深链、权限；
- M1：URL/上传/快照/理解/Fork/审核/证据；CRM 全量 Seed 后仍可打开；
- M2：15 镜头/120s、参考图、批量确认、Animatic、handoff；
- **重排序**新增：同 Beat 生成新 SB 草稿 + 必要 Shot 草稿，旧 SB 不变；跨 Beat 422；CreativeChangePlan M2.1 投影字段已验证。

## 5. 已知未覆盖 / 未实现

1. P1：概念探索画布、分镜总览、理解 Diff、参考广告、跨项目复用；
2. 资产引用写接口只允许草稿目标；视觉规范已有 Picker + Fork，Shot 侧仍只有 API，且已批准目标需 Fork；
3. 研究助手确认快照后任务失败重试/取消未专门覆盖；
4. Claim 裁决无字段级 R1/R2 Diff；GenerationSpec 无全量编辑；
5. 无真实模型、TTS、视频、计费；M3 仍占位。

## 6. G4 全新进程回归

2026-11-09 已执行：停止服务 → 清空 .data → 删除 .nitro → 重启 → 全量套件；页面切换动画修复见 [g4-transition-20261109.md](../../engineering/g4/g4-transition-20261109.md)；最新完整结果见 [g4-p1-final-20261109.md](../../engineering/g4/g4-p1-final-20261109.md)；历史记录 [g4-ultimate-20261109.md](../../engineering/g4/g4-ultimate-20261109.md)、[g4-last-20261109.md](../../engineering/g4/g4-last-20261109.md)、[g4-final-20261109.md](../../engineering/g4/g4-final-20261109.md)。

- M0 25/25（含 loading、已缓存页面 loading 与原 fade-slide 断言）、M1 API 44/44、M1 UI 14/14、M2 API 49/49、M2 UI 27/27、M11 API 65/65、M11 UI 38/38、Vitest 35/35；
- typecheck/build/lint 均通过；
- 首次启动即从空状态恢复四 Seed、4 切口、15 镜头 handoff 与 canEnterM3=True。

## 7. 签收判断

- P0 合同中的“资产内容版本、研究访谈、宣称冲突/裁决、就绪度、只读依赖影响、建议规格、同 Beat 重排序”已有可运行 Mock + UI + 自动化；
- 未实现项明确列为 P1 或后续 P0 补强，不能把本报告当作 G4 全量 DoD 完成证明；
- 合并前仍需负责人对 `as-built-contract.md` 签字，并执行完整 P0 回归。

## 7. Schema2 集成迁移验证

- fixture：[`state-schema2-20261110.json`](../../engineering/g4/state-schema2-20261110.json)
- 删除 `state.m11`/`state.m21`，`schemaVersion=2`；
- 用 `VIDCRAFT_MOCK_STATE_FILE` 启动 Nitro；
- 验证：4 个项目、3D 研究上下文/1 个 gap、ProductionReadiness=CURRENT、canEnterM3=true。
- 日志：[`schema2-migration-20261110.log`](../../engineering/g4/schema2-migration-20261110.log)
