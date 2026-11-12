# M2 Mock API 契约

> 文档编号：VC-FE-M2-API-001  
> 实现：`apps/backend-mock/utils/creative-video/{store,router}.ts`；前端：`apps/web-ele/src/api/creative-video/*`  
> 基础规则沿用 M1：`/api/creative-video/v1`、`{code:'OK',data,message,requestId,timestamp}`、Bearer Token、HTTP 状态 + 业务 code。

## 1. 阶段门禁

| 目标 | 必要条件 | 不满足 |
| --- | --- | --- |
| `GET /projects/:id/angles` | M1 存在 `APPROVED` 产品理解 | 409 `STAGE_GUARD_FAILED`，`data.target=/understanding` |
| `POST /concepts/generate` | 存在已批准 Creative Brief | 409 `STAGE_GUARD_FAILED` |
| `POST /scripts/generate` | 已批准创意 + DurationPlan | 409 / 422 |
| `POST /storyboard/generate` | 已批准剧本 + VisualBible | 409 `STAGE_GUARD_FAILED` |
| `POST /animatic/build` | 已批准 Storyboard（全部镜头 APPROVED） | 409 / 422 `INCOMPLETE_STORYBOARD` |
| `GET /animatic/handoff` | 已批准 AnimaticSnapshot + 全链路引用 | 返回 `null` |

前端按钮权限与 Mock API 双重校验：owner 全流程；editor 可编辑/发起任务但不能审批；reviewer 只读、批注，并在项目 `reviewerCanApprove` 时审批。

## 2. 切口与 Brief

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/angles` | `{ angleSet, sets, brief, activeBrief, understanding }` |
| POST | `/projects/:id/angles/generate` | `{ understandingRevisionId, scenario? }` + 幂等键 → `{jobId}` 202 |
| GET | `/projects/:id/angles/sets` | 候选集合列表 |
| PATCH | `/projects/:id/angles/sets/:sid` | `{ expectedVersion, patch.angles }` |
| POST | `/projects/:id/angles/sets/:sid/fork` | 派生候选集合 |
| POST | `/projects/:id/creative-briefs` | 创建 Brief 草稿（不伪造 approved 元数据） |
| POST | `/projects/:id/creative-briefs/:bid/approve` | `{ expectedVersion }`；owner/授权 reviewer |
| GET | `/projects/:id/creative-briefs/active` | 当前正式 Brief |

## 3. 创意故事

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/projects/:id/concepts/generate` | `{ briefId, count:3, scenario? }` + 幂等键 → 202 |
| GET | `/projects/:id/concepts/groups` | 创意组列表 |
| GET | `/projects/:id/concepts/groups/:gid` | `{ group, concepts }` |
| GET | `/projects/:id/concepts/revisions/:rid` | 单套方案 |
| PATCH | `/projects/:id/concepts/revisions/:rid` | `{ expectedVersion, patch }`；批准版拒绝 |
| POST | `/projects/:id/concepts/revisions/:rid/fork` | 派生新草稿 |
| POST | `.../submit-review` | DRAFT → WAITING_REVIEW |
| POST | `.../approve` | 仅 WAITING_REVIEW；owner/授权 reviewer |
| POST | `.../reject` | 退回并记录原因 |
| POST | `/projects/:id/concepts/groups/:gid/select` | 只设候选，不自动审核 |
| POST | `/projects/:id/concepts/groups/:gid/favorite` | 收藏 |
| GET | `/projects/:id/concepts/active` | 当前正式方案 |

同一项目存在活动生成任务时，再次提交返回 409 `CONFLICT`。

## 4. 时长、剧本、视觉规范

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/projects/:id/duration-plans/evaluate` | `{ conceptRevisionId, targetDurationMs }` → DurationPlan |
| GET | `/projects/:id/duration-plans` | 计划列表 |
| PATCH | `/projects/:id/duration-plans/:pid` | `{ expectedVersion, selectedStrategy, acceptedRiskNotes }`；KEEP_SHORT 必须显式接受风险 |
| POST | `/projects/:id/scripts/generate` | `{ conceptRevisionId, durationPlanId, scenario? }` + 幂等键 → 202 |
| GET | `/projects/:id/scripts/revisions` | `{ scripts, latest, active, durationPlans, concept }` |
| GET/PATCH | `/projects/:id/scripts/revisions/:rid` | 读取/编辑草稿；整数组 `beats` 替换语义 |
| POST | `.../fork` `.../submit-review` `.../approve` `.../reject` | 版本/审核闭环 |
| GET | `/projects/:id/scripts/active` | 当前已批准剧本 |
| POST | `/projects/:id/visual-bible/generate` | `{ scriptRevisionId }` → 202 |
| GET | `/projects/:id/visual-bible/revisions` `/active` | 规范版本 |
| PATCH | `/projects/:id/visual-bible/revisions/:rid` | 角色/场景/品牌/画幅 |
| POST | `.../approve` | 批准规范 |

剧本节拍总时长与目标时长允许 ±2000ms；批准的剧本冻结，修改需 Fork。

## 5. 图文分镜与参考图

> 为简化前端，镜头接口使用项目作用域路径（未来后端可提供全局 `/shots/:id` 别名）。

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/projects/:id/storyboard/generate` | `{ scriptRevisionId, visualBibleVersionId }` + 幂等键 → 202 |
| GET | `/projects/:id/storyboard` | `{ latest, storyboards, shots, images, visualBible, script, issues, netDurationMs }` |
| GET | `/projects/:id/storyboard/revisions/:rid` | 分镜集合详情 |
| POST | `/projects/:id/storyboard/revisions/:rid/approve` | 全镜头批准 + 净时长校验 |
| GET | `/projects/:id/shots` | `?storyboardRevisionId=` |
| POST | `/projects/:id/shots` | 新增镜头 |
| DELETE | `/projects/:id/shots/:sid` | 删除镜头并重算时间线 |
| POST | `/projects/:id/shots/reorder` | `{ expectedStoryboardVersion, orderedShotIds }` |
| POST | `/projects/:id/shots/batch-approve` | 原子全成/全失败；失败返回阻塞列表 |
| GET | `/projects/:id/shots/:sid` | 当前最新镜头修订 |
| GET/POST | `/projects/:id/shots/:sid/revisions` | 历史 / 从基础版本派生 |
| PATCH | `.../revisions/:rid` | 编辑草稿（已批准返回 409） |
| POST | `.../revisions/:rid/approve` `/reject` | 逐镜头审核 |
| GET | `/projects/:id/shots/:sid/reference-images` | 图片版本 |
| POST | `.../reference-images/generate` | 生成新图片候选 → 202 |
| POST | `.../reference-images/:imageId/select` | 采用图片；若镜头已批准则派生新草稿 |

图片版本不覆盖旧图；未选择图片的镜头不能批准。

## 6. 预演、导演与交接

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/projects/:id/animatic/build` | `{ storyboardRevisionId }` + 幂等键 → 202 |
| GET | `/projects/:id/animatic` | `{ latest, active, snapshots, shots, images, storyboard }` |
| GET | `/projects/:id/animatic/snapshots` `/:aid` | 快照列表/详情 |
| POST | `/projects/:id/animatic/snapshots/:aid/comments` | `{ atMs, shotId, text }`；已批准快照拒绝 |
| POST | `.../approve` `/reject` | 确认产生不可变快照；确认后项目进入 GENERATE |
| GET | `/projects/:id/animatic/handoff` | M3 交接；无有效快照返回 `null` |
| POST | `/projects/:id/director/change-plans` | `{ scope, targetId, userMessage }` → 变更计划（同步返回，非真实 AI） |
| GET | `/projects/:id/director/change-plans/:id` | 计划详情 |
| POST | `.../apply` `/discard` | 采用后写入草稿；采用前不改数据 |
| GET | `/projects/:id/director/messages` | 按 scope/targetId 的消息 |

## 7. 任务与场景

M2 新增 `MockJobKind`：`DISCOVER_ANGLES`、`GENERATE_CONCEPTS`、`GENERATE_SCRIPT`、`GENERATE_VISUAL_BIBLE`、`GENERATE_STORYBOARD`、`GENERATE_REFERENCE_IMAGE`、`BUILD_ANIMATIC`。

- 时长 2.2～3.8s；`SLOW` ×3；scenario 含 `FAIL` 时约 55% 失败，旧版本保留。
- 任务终态只应用一次结果；读取项目/阶段数据也会推进任务，刷新后可继续查询。
- 同一项目存在活动同类任务时返回 409 `CONFLICT`。

## 8. 错误码

| HTTP / code | 含义 |
| --- | --- |
| 400 `INVALID_INPUT` | 字段校验失败 |
| 403 `FORBIDDEN` | 无编辑/审核权限 |
| 404 `PROJECT_NOT_FOUND` / `NOT_FOUND` | 对象不存在 |
| 409 `VERSION_CONFLICT` | `expectedVersion` 不匹配 |
| 409 `STAGE_GUARD_FAILED` | 前置版本未批准或已失效 |
| 409 `CONFLICT` | 已有活动任务 |
| 409 `UPSTREAM_STALE` | 上游已变化，需重新生成/复核 |
| 422 `INVALID_DURATION` | 时长/节拍非法，或 KEEP_SHORT 未接受风险 |
| 422 `INCOMPLETE_STORYBOARD` | 镜头缺图/未批准/时长不符；`data.blocked` 列表 |
| 422 `UNSUPPORTED_CLAIM` | 未证实宣传主张 |
| 500 `MOCK_JOB_FAILED` | 模拟任务失败，可重试 |

## 9. 已知契约偏差

1. 镜头相关接口使用 `/projects/:id/shots/...` 作用域路径，未实现文档中的全局 `/shots/:shotId` 别名；
2. 创意 Brief 使用单一 `CreativeBrief`（`status: DRAFT|APPROVED|STALE`），未拆独立 `CreativeBriefDraft` 类型；
3. `PLAN_CREATIVE_CHANGE` 任务未异步化，当前同步生成计划；
4. Seed 默认全量预置四个项目；`m2Seed=interactive` 只保留 3D 简历初始切口，用于从零演示。

## 10. 失效影响与 Demo Reset

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/stale-impact` | 返回 `{ items, summary, total, understanding }`；items 含 `type/stage/title/reason/link/version` |
| POST | `/demo/reset` | body `{ m2Seed: 'full' \| 'interactive' }`；owner/admin；默认 `full`，同时重置 M1/M2 |

## 11. 冲突处理前端约定

所有可编辑对象 PATCH 返回 409 `VERSION_CONFLICT` 时，页面必须提供三选差异面板：

- **保留我的编辑**：仅当服务端最新版本未批准时可用，显式覆盖最新草稿；
- **查看最新版本**：放弃本地未保存编辑并刷新；
- **另存为新草稿**：Fork 服务端最新版本后重放本地修改，旧版本保留。

当前已接入概念方案、剧本、镜头三个编辑入口。
