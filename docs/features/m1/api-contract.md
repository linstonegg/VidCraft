# M1 Mock API 契约

> 文档编号：VC-FE-M1-API-001  
> 适用版本：VidCraft M1（基于 M0 `v5.7.0` 工程）  
> 实现位置：`frontend/apps/backend-mock/utils/creative-video/router.ts` + `store.ts`  
> 前端适配层：`frontend/apps/web-ele/src/api/creative-video/**`

## 1. 基础规则

| 项 | 约定 |
| --- | --- |
| 浏览器路径 | `/api/creative-video/v1/...` |
| 业务 Service 前缀 | `/creative-video/v1` |
| 成功响应 | `{ code: 'OK', message, data, requestId, timestamp }` |
| 身份 | Vben 登录 Bearer Token；业务接口必须带 `Authorization`，否则 401 |
| 角色 | `owner` / `editor` / `reviewer` / `admin`（路由层 `frontend` 模式） |
| 版本锁 | 可修改对象带 `version`；PATCH 必须传 `expectedVersion`，不匹配返回 409 |
| 幂等 | `Idempotency-Key` 头：相同用户 + 相同键 + 相同请求体返回首次结果；同键不同体返回 409 |
| 时间 | ISO 8601 UTC 字符串 |

> 认证接口（`/api/auth/login` 等）仍使用 Vben 的数值 `code: 0` 契约；业务接口统一使用字符串 `code: 'OK'`，由 M0 的独立业务 RequestClient 处理，两者不混用。

## 2. 权限矩阵（Mock 强制）

| 操作 | owner | editor | reviewer | admin |
| --- | :-: | :-: | :-: | :-: |
| 读取项目 / 资料 / 证据 / 理解报告 | ✓ | ✓ | ✓ | ✓ |
| 创建项目、编辑项目、复制 | ✓ | ✓ | — | — |
| 归档 / 恢复 / 软删除 / 恢复删除 | ✓ | — | — | — |
| URL 采集、资料编辑、素材上传/删除、模拟授权 | ✓ | ✓ | — | — |
| 确认资料快照、生成理解、编辑报告、重新分析 | ✓ | ✓ | — | — |
| 确认产品理解 | ✓ | — | 仅 `reviewerCanApprove = true` 的项目 | — |
| 恢复演示种子 | ✓ | — | — | ✓ |

前端按钮会按角色禁用/隐藏，**同时**服务端返回 403；隐藏按钮不等于权限通过。

## 3. 接口清单

### 3.1 健康与演示

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 公开；返回 `capabilities.mode = MOCK` |
| GET | `/demo/users` | 演示角色清单 |
| GET | `/demo/scenarios` | URL / 授权 / 理解三类演示场景枚举 |
| POST | `/demo/reset` | owner/admin；恢复四个 Seed 与全部 M1 状态 |
| GET | `/demo/forbidden` `/conflict` `/error` | 固定 403 / 409 / 500，供错误态演示 |

### 3.2 项目

| Method | Path | 请求 / 说明 |
| --- | --- | --- |
| GET | `/projects` | `page,pageSize,keyword,status,stage,platform,sort(updated\|created\|name),includeDeleted` → `PageResult<VideoProject>` |
| POST | `/projects` | `CreateProjectRequest` + `Idempotency-Key`；201 |
| GET | `/projects/:id` | 不存在 → 404 `PROJECT_NOT_FOUND` |
| PATCH | `/projects/:id` | `{ expectedVersion, patch }` |
| POST | `/projects/:id/duplicate` | `{ expectedVersion?, copyAssetRefs? }`；复制基础配置、资料元数据与（可选）素材引用，不复制授权会话 |
| POST | `/projects/:id/archive` `/restore` | owner；body `{ expectedVersion }` |
| DELETE | `/projects/:id` | owner；软删除（`deletedAt`），body `{ expectedVersion }` |
| POST | `/projects/:id/undelete` | owner；恢复软删除，body `{ expectedVersion }` |

### 3.3 资料采集

| Method | Path | 请求 / 说明 |
| --- | --- | --- |
| GET | `/projects/:id/ingestion` | `IngestionState`（含 sources/assets/demoSession/coverage/status） |
| POST | `/projects/:id/ingestion/analyze-url` | `{ url, scenario? }` + 幂等键 → `{ jobId }`，202 |
| POST | `/projects/:id/ingestion/confirm` | `{ expectedVersion, includedSourceIds }` → `IngestionSnapshot`，201 |
| GET | `/projects/:id/ingestion/snapshots` | 快照列表 |
| GET | `/projects/:id/sources` | 来源列表 |
| PATCH | `/projects/:id/sources/:sid` | `{ expectedVersion, patch.includedInAnalysis }` |
| GET / POST | `/projects/:id/assets` | 素材元数据；POST 只接收元数据，不保存真实文件；支持 `Idempotency-Key` |
| PATCH / DELETE | `/projects/:id/assets/:aid` | 重命名、用途、删除；PATCH/DELETE 均校验 `expectedVersion` |
| GET / POST / DELETE | `/projects/:id/demo-session` | 模拟授权会话（只读、脱敏、30 分钟到期） |
| GET | `/projects/:id/evidence` | `?sourceId=&level=` |

### 3.4 产品理解

| Method | Path | 请求 / 说明 |
| --- | --- | --- |
| POST | `/projects/:id/understanding/generate` | `{ ingestionSnapshotId, scope: FULL\|PAIN_POINTS\|VALUE_ANGLES, scenario? }` + 幂等键 → `{ jobId }`，202；同项目已有活动任务时 409 `CONFLICT` |
| GET | `/projects/:id/understanding/active` | `{ active, latest, draft }` |
| GET | `/projects/:id/understanding/revisions` | 修订列表（R1/R2…） |
| GET | `/projects/:id/understanding/revisions/:rid` | 单个修订 |
| PATCH | `/projects/:id/understanding/revisions/:rid` | `{ expectedVersion, patch }`；APPROVED 版本拒绝直接修改 |
| POST | `/projects/:id/understanding/revisions/:rid/fork` | 从已确认版本派生新草稿 |
| POST | `/projects/:id/understanding/revisions/:rid/submit-review` | 草稿 → 待审核，同时把项目 `status` 置 `WAITING_REVIEW` |
| POST | `/projects/:id/understanding/revisions/:rid/comment` | `{ expectedVersion?, note }`；owner/editor/reviewer 追加审核意见与 reviewLog |
| POST | `/projects/:id/understanding/revisions/:rid/approve` | `{ expectedVersion, acceptHypotheses, reviewerNote? }` |
| POST | `/projects/:id/understanding/revisions/:rid/reject` | `{ reason }` |
| GET | `/projects/:id/understanding/handoff` | M2 交接引用；没有已确认版本时返回 `null` |

### 3.5 异步任务

| Method | Path                  | 说明                       |
| ------ | --------------------- | -------------------------- |
| GET    | `/jobs/:jobId`        | 服务端按时间推进状态与事件 |
| POST   | `/jobs/:jobId/cancel` | 终态不可取消               |
| GET    | `/projects/:id/jobs`  | 最近 20 条任务             |

任务时间轴（演示配置）：

```text
COLLECT_URL：0ms CREATED → 250ms QUEUED → RUNNING → 3200ms SUCCEEDED（SLOW_COLLECT 12000ms）
UNDERSTANDING：0ms CREATED → 250ms QUEUED → RUNNING → 4200ms SUCCEEDED（SLOW 15000ms）
UNDERSTANDING_FAILED：约 55% 进度时 FAILED
```

任务保存在 Nitro 内存，刷新浏览器不会丢；Nitro 重启从本地状态文件恢复。

## 4. 统一错误码

| HTTP | code | 前端处理 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 字段/参数错误 |
| 401 | `UNAUTHORIZED` | 登录失效 |
| 403 | `FORBIDDEN` | 无权限提示 |
| 404 | `PROJECT_NOT_FOUND` / `ASSET_NOT_FOUND` / `NOT_FOUND` | 返回项目中心或重新选择素材 |
| 409 | `VERSION_CONFLICT` | 刷新并合并修改（`data.currentVersion/expectedVersion`） |
| 409 | `IDEMPOTENCY_CONFLICT` | 使用新请求键重新发起 |
| 409 | `CONFLICT` | 已有活动任务/状态冲突，先等待或取消 |
| 422 | `NO_VALID_SOURCE` | 返回资料采集补充来源 |
| 422 | `UNDERSTANDING_NOT_READY` | 功能/画像/推测确认不足 |
| 422 | `UNSUPPORTED_CLAIM` | 有 disabled 主张仍被用于宣传 |
| 500 | `MOCK_PROCESSING_FAILED` | 可重试 |
| 503 | `SERVICE_UNAVAILABLE` | 服务不可用 |

## 5. 资料变化与 STALE

确认快照后，以下操作会立即把资料状态置为 `STALE`，并把所有 `APPROVED` 理解修订置为 `STALE`，同时 `GET /understanding/handoff` 返回 `null`：

- 新增素材（`POST /assets`）；
- 删除素材（`DELETE /assets/:id`）；
- 修改素材用途/文件名；
- 排除/恢复来源，或修改来源标题/摘要。

页面据此提示“资料发生变化”，要求重新分析或复核，不允许静默沿用旧报告进入 M2。

## 6. 关键响应示例

创建项目（201）：

```json
{
  "code": "OK",
  "message": "created",
  "requestId": "req-m1-...",
  "timestamp": "2026-11-06T08:00:00.000Z",
  "data": {
    "id": "project_mw4...",
    "title": "3D 数字简历推广视频（测试项目）",
    "status": "DRAFT",
    "currentStage": "INGEST",
    "version": 1,
    "platforms": ["douyin", "wechat_channels"],
    "durationSec": 120,
    "aspectRatio": "9:16"
  }
}
```

版本冲突（409）：

```json
{
  "code": "VERSION_CONFLICT",
  "message": "报告已被其他操作更新，请刷新并合并修改",
  "data": {
    "resourceType": "UNDERSTANDING_REVISION",
    "resourceId": "revision_...",
    "expectedVersion": 1,
    "currentVersion": 2
  }
}
```

## 7. 已知 Mock 边界

1. 不抓取真实 URL、不登录第三方系统、不解析真实文件内容；
2. 素材接口只收元数据，文件预览仅当前浏览器会话有效（blob）；
3. 数据保存在 本地 JSON 文件，服务重启恢复；
4. 权限为演示级，真实系统必须由服务端重新校验；
5. 未实现：分片上传、SSE/SignalR 推送、租户隔离、演示数据跨机器隔离。

## 8. 前端调用约定

- 统一走 `src/api/creative-video/*`，禁止页面直接 `fetch`；
- 页面只消费 `friendlyErrorMessage()`，不自行判断业务 code；
- 所有写操作携带 `expectedVersion`；创建/分析/确认类请求携带 `Idempotency-Key`。
