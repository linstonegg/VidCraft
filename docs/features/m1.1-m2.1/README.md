# M1.1 + M2.1 P0 增量交付说明

> 依据：`docs/VidCraft M1.1+M2.1最终统一兼容实施规范.md`（VC-FE-COMPAT-002 / V3.0）。  
> 本目录只记录增量，不替换原 M1/M2 正式基线。

## 1. 已完成（P0 范围）

| 模块 | 交付 |
| --- | --- |
| G0 | [`as-built-contract.md`](./as-built-contract.md)：AB-01～AB-16 与真实文件映射、AS_BUILT_DELTA |
| G1 类型 | `EffectiveValidity`、`AssetContentVersion`、`AssetUsageRef/Metadata`、`ResearchGap/Session/Question/Answer`、`ClaimAnchor/Conflict/Resolution/Readiness`、`EvidenceLocatorSnapshot`、`ProductionReadiness`、`ShotGenerationSpec` |
| G1 Mock | schemaVersion 3；M11/M21 状态分桶；稳定内容版本迁移；旧素材无文件标 `UNAVAILABLE`；CRM 冲突/研究缺口 Seed；证据定位快照 |
| G2 研究 | 缺口、会话、下一批问题、回答、跳过、历史；回答创建 `USER_NOTE` 来源 + `user_confirmed` 证据，不自动 verified |
| G2 宣称 | 冲突列表/详情、claim readiness、裁决预览/提交/批准；批准只派生 R2 草稿，不改 R1 |
| G2 资产 | 内容版本列表/新增、用途元数据、反向使用位置、素材使用位置抽屉 |
| G3 就绪 | `GET /production-readiness`，从 Understanding→Brief→Concept→Script→VB/SB→Animatic 派生；钱包/模型为 FUTURE |
| G3 影响 | `POST /dependency-impact/preview` 只读，不生成第二套 ChangePlan |
| G3 规格 | `GET/PUT /generation-specs`；未配置返回 suggestion，不伪造 ID/version；保存后 CURRENT/OUTDATED |
| UI | 研究助手、素材使用位置、宣称冲突/裁决、制作就绪度、生成建议规格 |
| 测试 | M11 API 58 项、M11 UI 23 项，及原 M0/M1/M2 回归 |

## 2. 保持不动的基线

- 8 阶段路由与 `/concepts` 子页；
- M2 四类小写 `ShotGenerationMode`；
- 已批准 Understanding/Concept/Script/VB/SB/Animatic 不原地改写；
- 参考图必选审核；
- owner/editor/reviewer 权限不扩权；
- 四 Seed 与 120 秒/15 镜头；
- M3 不扣费、不生成真实视频。

## 3. 关键迁移与兼容

- `AssetRef.version` 仍是元数据乐观锁；文件内容由 `AssetContentVersion.id` 表达；
- 旧资产只有 metadata 时生成稳定 `asset-content:<assetId>:v1`，无 `previewUrl` 标 `UNAVAILABLE`；
- 旧 EvidenceRef 无来源版本时生成 `LEGACY_EVIDENCE_UNRESOLVED`，不回填当前文本；
- 旧已批准对象不新增必填字段；新字段均 optional 或独立读模型；
- `reorder` 现在创建新 StoryboardRevision 草稿 + 必要 ShotRevision 草稿，跨 StoryBeat 返回 422。

## 4. 未完成 / 明确后置

- P1：参考广告 Insight、/references、Concepts 双模式基础探索、Storyboard Beat 分组总览已完成；剩余卡片坐标/布局偏好、组合 D、历史多版本丰富数据、资产关系图、VIS-001～036；
- 研究助手已串通“确认资料快照 → 生成 R2”，并自动冻结证据快照；新修订自动生成 ClaimAnchor，R2 批准后冲突闭环 RESOLVED；
- Asset 已提供 `reference-preview/replace-preview`、草稿 `references/delete`、视觉规范 `fork` + AssetReferencePicker；撤权后内容版本 REDACTED 并拒绝新引用；
- GenerationSpec 有每镜头建议、保存首镜与 generationMode 分组；保存时校验资产/图片引用归属与可用性；
- 视觉规范已提供 AssetReferencePicker；ChangePlan 增加影响字段，全局角色会 Fork VisualBible 并派生相关镜头草稿；
- Claim 裁决 UI 只支持提交/批准，未展示 R1/R2 字段 Diff；
- 无 P1 画布坐标存储、无跨 Beat 拖拽、无真实计费/视频。

## 5. 验证

```powershell
node tests/e2e/m11-api-check.mjs
node tests/e2e/m11-smoke.mjs
node tests/e2e/m0-smoke.mjs
node tests/e2e/m1-api-check.mjs
node tests/e2e/m1-smoke.mjs
node tests/e2e/m2-api-check.mjs
node tests/e2e/m2-smoke.mjs
```

结果见 [`test-report.md`](./test-report.md)、[G4 最终 P1 回归](../../engineering/g4/g4-final-p1-20261110.md) 与截图 `docs/screenshots/m11/`。
