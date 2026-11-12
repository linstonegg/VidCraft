# M1.1 + M2.1 P0 Mock API（增量）

> 基础前缀：`/api/creative-video/v1`；返回 `{code,message,data,requestId,timestamp}`。  
> 原 M1/M2 接口全部保留，本文件只列增量。

## 1. 资产内容与使用位置

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/assets/:assetId/content-versions` | 内容版本历史；旧素材至少 v1 |
| POST | `/projects/:id/assets/:assetId/content-versions` | `{expectedAssetVersion, fixtureKey, replacesVersionId?}`；幂等；拒绝外网 URL |
| GET | `/projects/:id/assets/:assetId/usage` | 反向引用：来源/视觉规范/创意情绪板等 |
| GET | `/projects/:id/assets/:assetId/usage-metadata` | 用途、展示权、敏感数据 |
| PATCH | `/projects/:id/assets/:assetId/usage-metadata` | `{expectedVersion, patch}` |
| GET | `/projects/:id/understanding/revisions/:rid/evidence-snapshots` | 已冻结来源版本/摘录；无法证明时 Legacy |

**约束**：`AssetRef.version` 与 `AssetContentVersion.contentRevisionNo` 不同；`ImageAssetVersion` 仍是镜头候选图，不进入概念情绪板。

## 2. 研究访谈

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/research/gaps` | 缺口 + 资料上下文指纹 |
| POST | `/projects/:id/research/gaps/evaluate` | Mock 重新评估（当前同步返回 202 语义） |
| POST | `/projects/:id/research/sessions` | `{basedOnIngestionVersion}` + 幂等；同项目复用 ACTIVE |
| GET | `/projects/:id/research/sessions/:sid` | 会话/问题/答案/有效性 |
| POST | `/projects/:id/research/sessions/:sid/questions/next` | `{expectedVersion,maxCount}`，最多 3 |
| POST | `/projects/:id/research/questions/:qid/answers` | `{answer,expectedVersion}` + 幂等；创建 USER_NOTE |
| POST | `/projects/:id/research/questions/:qid/skip` | 仅当前会话跳过，Gap 保留 |
| POST | `/projects/:id/research/answers/:aid/confirm-fact` | 返回 PROPOSED，不直接 verified |
| GET | `/projects/:id/research/history` | USER_NOTE 与回答 |

新错误码：`RESEARCH_STALE_VERSION` 409、`QUESTION_ALREADY_ANSWERED` 409、`RESEARCH_PERMISSION_DENIED` 403。

## 3. 宣称冲突与主张可用性

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/claims/anchors?revisionId=` | 指定修订内的 ClaimAnchor |
| GET | `/projects/:id/claims/readiness?understandingRevisionId=` | 必须指定修订；BLOCKED/NEEDS_REVIEW/USABLE |
| GET | `/projects/:id/claim-conflicts?status=` | 冲突列表 |
| GET | `/projects/:id/claim-conflicts/:cid` | 冲突 + anchors + 当前 resolution |
| POST | `/projects/:id/claim-conflicts/scan` | Mock 重新扫描（同步返回） |
| POST | `/projects/:id/claim-conflicts/:cid/resolution-preview` | 只读影响预览 |
| POST | `/projects/:id/claim-conflicts/:cid/resolutions` | 提交裁决（SUBMITTED） |
| POST | `/projects/:id/claim-conflicts/resolutions/:rid/approve` | 批准裁决；派生 R2 DRAFT，不改 R1 |

**不变量**：无证据的量化宣称保持 `BLOCKED`；`NEEDS_EVIDENCE` 不产生 RESOLVED；批准裁决 != R2 批准。

## 4. M2.1 就绪、影响与规格

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/production-readiness` | 派生 `items/canEnterM3/effectiveValidity`；FUTURE 不阻塞 |
| POST | `/projects/:id/dependency-impact/preview` | 只读；不创建 ChangePlan/草稿 |
| GET | `/projects/:id/generation-specs` | 每镜头 `ShotGenerationSpecView` |
| PUT | `/projects/:id/generation-specs` | `{expectedApprovedShotRevisionId, spec}`；拒绝过期/大写 mode |

`canEnterM3` 不依赖预算/报价；M2.1 不扣费。

## 5. 重排序修正（原 M2 接口语义补强）

`POST /projects/:id/shots/reorder` 仍接收 `{expectedStoryboardVersion, orderedShotIds}`，但现在是事务性新草稿：

1. 集合必须与原 SB 的 `orderedShotRevisionIds` 对应镜头完全一致；
2. 本期只允许同一 `storyBeatId` 内调整，跨 Beat 返回 422 `STORYBOARD_REORDER_BEAT_CONFLICT`；
3. 转场重叠非法返回 422 `STORYBOARD_REORDER_INVALID_TRANSITION`；
4. 创建新 StoryboardRevision DRAFT，order 变化的镜头创建新 ShotRevision 草稿，旧批准版只读保留；
5. 旧 Animatic 仍保留，当前有效性由生产就绪/失效影响表达。

## 6. P1 参考广告

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/reference-ads` | 列出本项目同一批 `ReferenceAdInsight` |
| POST | `/projects/:id/reference-ads` | `{title,durationSec?,format?,copyrightConfirmed:true}`；未确认权属 422 `COPYRIGHT_REQUIRED` |
| GET | `/projects/:id/reference-ads/:insightId` | 读取同一份洞察；M2 不再上传/解析 |

创建时写入 `REFERENCE_AD` 来源：`analysisScope=CREATIVE_REFERENCE`、`includedInAnalysis=false`、`evidenceIds=[]`；洞察 `canBeUsedAsProductEvidence=false`，不得进入产品事实或证据链。
