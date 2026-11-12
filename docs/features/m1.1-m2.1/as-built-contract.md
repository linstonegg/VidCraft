# VidCraft G0 — as-built 合同核对（M1.1 + M2.1 V3.0）

> 依据：`docs/VidCraft M1.1+M2.1最终统一兼容实施规范.md` §1.2、§13.1、§16.3。  
> 本表记录当前仓库真实实现；未完成项标 `BLOCKED`，不得用“应该已实现”代替源码核对。

## 1. 现状结论

| 项 | 当前实现 | 结论 |
| --- | --- | --- |
| 前端框架 | `apps/web-ele`，Vben 5.7.0，Vue 3 + Element Plus | 保留 |
| Mock | `apps/backend-mock`，Nitro，统一路由 `utils/creative-video/router.ts` | 保留 |
| API 前缀 | `/api/creative-video/v1`，`ApiResponse<T>` 包装 | 保留 |
| 状态文件 | `.data/vidcraft-m1.json`，schemaVersion 3 | 已升级，兼容扩展 |
| M1/M2 路由 | 8 阶段 + `/concepts` 子页 | 保留，不新增阶段 |
| 四 Seed | 默认 full 预置 M2 全链路；`m2Seed=interactive` 从零演示 | 保留 |
| 审批/版本 | `expectedVersion` + 409、批准版 Fork、活动任务 409 | 保留 |
| 权限 | owner/editor/reviewer，页面 + Mock 双重校验 | 保留，不扩权 |

## 2. AB-01～AB-16 核对表

| 编号 | 真实位置 | 当前字段/行为 | V3 目标 | 处理 |
| --- | --- | --- | --- | --- |
| AB-01 | `apps/web-ele/src/types/creative-video/project.ts`；`backend-mock/utils/creative-video/domain.ts` | 8 阶段、5 状态，无 CONCEPTS | 保持原枚举 | 复用 |
| AB-02 | `types/creative-video/ingestion.ts`；`domain.ts` | `SourceKind` 七值；`EvidenceLevel` 四值；`CoverageState` 三值 | 不重命名；P1 才加 `REFERENCE_AD` | 复用 |
| AB-03 | `types/creative-video/ingestion.ts` `AssetRef`；M2 `storyboard.ts` `ImageAssetVersion` | `AssetRef.version` 是元数据乐观锁；无内容版本 | 新增 `AssetContentVersion`，`ImageAssetVersion` 保留 | 增量 |
| AB-04 | `types/creative-video/understanding.ts`；`store.ts` snapshots/revisions | S1/R1、Fork、approve 已存在 | 新增可选裁决 refs/证据快照，不改旧 R1 | 增量 |
| AB-05 | `types/creative-video/{visual-bible,storyboard}.ts` | 四类 `ShotGenerationMode` 小写；`characterIds/sceneIds` | 保持原枚举与引用 | 复用 |
| AB-06 | `types/creative-video/creative-change.ts`、`animatic.ts`；`store.ts` | 唯一 `CreativeChangePlan`、`AnimaticSnapshot` | 只增强只读影响视图，不建第二套计划 | 增量 |
| AB-07 | `backend-mock/utils/creative-video/router.ts`；`api/creative-video/client.ts` | Nitro handler + `BusinessApiError` | 新增接口复用同一外壳 | 复用 |
| AB-08 | `useProjectAccess`；router `requireRole` | owner/editor/reviewer；reviewer 审核需 `reviewerCanApprove` | 新操作按现有 RBAC 上界 | 复用 |
| AB-09 | `fixtures.ts`、`store.ts seedM2/seedM2Full` | 四 Seed 固定 ID；默认 full | 迁移不得换主键；旧状态可打开 | 增量迁移 |
| AB-10 | `store.ts applyStoryboardJob` / resume seed | 15 镜头、120000ms、7 Beat | 保持 | 复用 |
| AB-11 | `store.ts` concept select/fork/submit/approve | `submit-review → group select → approve/active`；fork 入组 | 保持；组合 P1 才做 | 复用，记录 |
| AB-12 | `store.ts reorderShots` | 请求 `orderedShotIds`；**当前原地修改同一 StoryboardRevision**，并重算 order | 需改为新建 SB 草稿 + 必要 Shot 草稿；同 Beat 限制 | **AS_BUILT_DELTA（P0 待修）** |
| AB-13 | `Evidence`、`IngestionSnapshot.evidenceCopies`；无 `EvidenceLocatorSnapshot` | 批准报告证据可被当前文本影响 | 新增只读证据版本快照；旧数据 `LEGACY_EVIDENCE_UNRESOLVED` | 增量 |
| AB-14 | `getAnimaticState` | 返回 latest snapshot，旧快照只读；无 `viewingContext` | 增加有效性投影，不改历史 APPROVED | 增量 |
| AB-15 | 无研究访谈 | 无 ResearchSession/Answer | 新增 M11 访谈，USER_NOTE 幂等 | 增量 |
| AB-16 | 无 `ShotGenerationSpec` | 无建议规格 | 新增只读 suggestion + 独立非付费 Spec | 增量 |

## 3. 已登记的 AS_BUILT_DELTA

1. **AB-12 重排序已修复**：`reorderShots` 现在校验集合/同 Beat/转场后，创建新 StoryboardRevision 草稿与必要 ShotRevision 草稿；旧 SB/Shot 保留，跨 Beat 返回 422。
2. **M1 旧素材无内容版本**：迁移只生成稳定 `AssetContentVersion`；无真实可加载文件标 `UNAVAILABLE`，有 `previewUrl` 的 fixture 标 `READY`。
3. **旧证据无来源版本**：迁移生成 `LEGACY_EVIDENCE_UNRESOLVED`，不得回填当前文本。
4. **M2 参考图审核门槛未放宽**：保留 `referenceImageVersionIds`/`activeReferenceImageId` 必选。
5. **旧 Seed 无新增字段**：所有新字段可选；页面加载旧数据不得报错。
6. **`/concepts` 是 S3 子页**，不是新 ProjectStage；`/references`、画布、总览 P1 未实现。

## 4. 本轮实施顺序

- G1：公共类型 + AssetContentVersion/Usage + 迁移 + 研究/Claim/Readiness/Spec 合同；
- G2：研究访谈、Claim 冲突/裁决、资产使用位置 P0；
- G3：ProductionReadiness、dependency-impact、generation-specs；
- G4：原 M1/M2 回归 + M11/AST/M21 P0 自动化。

## 5. 负责人签收

| 角色 | 结论 | 备注 |
| --- | --- | --- |
| 前端负责人 | **已签收（Linstone，2026-11-12）** | 记录见 [signoff-linstone-20261112.md](../../engineering/g4/signoff-linstone-20261112.md) |
| Mock 服务 | 已核对（开发代理） | 路由/状态迁移/回滚已核对 |
| QA | 已核对（自动化） | 清空数据 G4：M0/M1/M2/M11 + Vitest 全绿（M2 UI 27/27，M11 UI 38/38，P1 2/2） |
