# G4 最终回归（组合 D + P1 探索）

> 时间：2026-11-10 10:40–10:48（Asia/Shanghai）  
> 日志：[`g4-composition-20261110.log`](./g4-composition-20261110.log)

## 执行方式

停止服务 → 删除 `.data` → 删除 `.nitro` → 全新 `dev:ele`（作业 `pwsh-20b423987e844bcd`）→ 全量套件。

## 结果

| 套件                     | 结果             |
| ------------------------ | ---------------- |
| M0                       | **25/25**        |
| M1 API / UI              | **43/43、14/14** |
| M2 API / UI              | **40/40、17/17** |
| M11 API / UI             | **57/57、21/21** |
| Vitest                   | **32/32**        |
| typecheck / build / lint | 通过             |

## 本轮新增

- 组合创意 D：
  - 基底方案选择；
  - 开场钩子/主角场景/冲突反转/CTA 分别选择来源方案；
  - 先 `forkConcept`，再 `patchConcept`；
  - Fork 由服务端原子加入原 `ConceptGroup`；
  - 只生成 DRAFT，不直接 active；
- Concepts 自由探索：宽松网格 + 仅 UI 聚焦；
- Storyboard 总览：按 StoryBeat 分组、SB 版本选择、viewingContext、activeReferenceImageId；
- 新增 P1 展示层类型：`StudioPresentationPreference`、`CanvasViewport`、`StoryboardOverviewCardVM`、`ExplorationConceptCardVM`；
- Animatic 生产准备、Schema2 迁移、ReferenceAd 均在本次干净 G4 内。

## 边界

- 卡片坐标/缩放/平移偏好尚未持久化（类型已定义）；
- 资产只能 UI 聚焦，尚未做布局拖动；
- Storyboard 历史版本切换已实现，但没有多版本 Seed 的专用 E2E；
- 资产关系图、VIS-001～036 未实现；
- 代码未提交 Git，as-built 签收待完成。
