# VidCraft Mock API 契约（M0）

> 文档编号：VC-FE-M0-API-001  
> 更新时间：2026-11-06  
> 服务位置：`frontend/apps/backend-mock`

## 1. 路径规则

| 层级 | 值 |
| --- | --- |
| Vben 基础 URL | `/api`（`VITE_GLOB_API_URL`） |
| 业务根路径 | `/creative-video/v1` |
| 浏览器实际请求 | `/api/creative-video/v1/...` |
| Nitro 实际路由 | `/api/creative-video/v1/...`（`apps/backend-mock/api/creative-video/v1/**`） |

不要组合出 `/api/api/creative-video/...`。

## 2. 统一返回体

```ts
type ApiCode =
  | 'OK'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

interface ApiResponse<T> {
  code: ApiCode;
  message: string;
  data: T;
  requestId: string;
  timestamp: string; // ISO 8601
}

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

错误以 **HTTP 状态码 + 业务 code** 组合表达，不允许“HTTP 200 + 失败字符串”。

## 3. 接口清单

### 3.1 健康检查

`GET /api/creative-video/v1/health?delay=2000`

- `delay`：可选，模拟慢响应，0～3000ms。
- 200 返回：

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "req-m0-3-k2j1",
  "timestamp": "2026-11-06T04:00:00.000Z",
  "data": {
    "capabilities": {
      "mode": "MOCK",
      "service": "vidcraft-mock",
      "status": "ok"
    },
    "serverTime": "2026-11-06T04:00:00.000Z"
  }
}
```

前端据此与 `VITE_APP_MOCK_BUSINESS` **共同**决定是否展示演示模式标识。

### 3.2 项目列表

`GET /api/creative-video/v1/projects?keyword=&status=&page=1&pageSize=20`

- `keyword`：匹配标题或描述（大小写不敏感）。
- `status`：`DRAFT | IN_PROGRESS | WAITING_REVIEW | COMPLETED | ARCHIVED`。
- `pageSize`：1～100，默认 20。
- `total` 为过滤后的条目总数，与 `items` 语义一致。

### 3.3 项目详情

`GET /api/creative-video/v1/projects/:id`

- 命中：200 + `code: 'OK'` + `data: VideoProject`。
- 未命中：**HTTP 404** + `code: 'NOT_FOUND'`，`message: "项目不存在或已被移除"`。

### 3.4 演示角色

`GET /api/creative-video/v1/demo/users`

返回公开演示角色（`owner / editor / reviewer / admin`），每条包含：

```ts
interface DemoRole {
  code: DemoRoleCode;
  displayName: string;
  scope: string;
  username: string;
}
```

### 3.5 恢复演示数据

`POST /api/creative-video/v1/demo/reset`

- 无请求体。
- 200 返回：`{ "restoredProjects": 4, "resetAt": "..." }`。
- 语义：将 Nitro 进程内项目状态恢复为四个固定种子，不触碰任何真实数据；重启 Mock 进程效果相同。

### 3.6 403 演示

`GET /api/creative-video/v1/demo/forbidden`

- 固定 **HTTP 403** + `code: 'FORBIDDEN'`，用于验收角色无权限提示。

### 3.7 409 / 500 演示

| 接口 | 状态码 | 业务 code | 用途 |
| --- | --- | --- | --- |
| `GET /api/creative-video/v1/demo/conflict` | 409 | `CONFLICT` | 验收“版本已变化，请刷新后重试” |
| `GET /api/creative-video/v1/demo/error` | 500 | `INTERNAL_ERROR` | 验收服务异常提示 |

慢响应与网络断开：

- 慢响应：`GET /api/creative-video/v1/health?delay=2000`（0～3000ms）。
- 网络断开：关闭 Nitro Mock 进程或前端代理后刷新项目列表，应出现可重试错误态。

## 4. 四个固定种子项目

| id | 标题 | 目标时长 | 比例 | 平台 | 状态 | 当前阶段 |
| --- | --- | --: | --- | --- | --- | --- |
| `project_resume_3d` | 3D 网页简历营销片 | 120s | 9:16 | douyin | IN_PROGRESS | STORYBOARD |
| `project_knowledge_base` | AI 知识库宣传片 | 30s | 9:16 | douyin | WAITING_REVIEW | ANGLES |
| `project_crm` | CRM 营销短片 | 60s | 16:9 | wechat_channels | DRAFT | INGEST |
| `project_video_agent` | VidCraft 自身宣传片 | 45s | 1:1 | other | COMPLETED | RENDER |

`ownerId` 统一为 `demo_owner`，`productUrl` 使用 `example.com` 占位域名。

## 5. 前端适配层

位置：`frontend/apps/web-ele/src/api/creative-video/client.ts`

- 单独创建 `businessRequestClient`（`@vben/request`），只服务 `/creative-video/v1/**`；
- **不注册** Vben 默认的数值 `code: 0` 拦截器，避免与业务字符串 `code: 'OK'` 混用；
- 保留原始 `AxiosResponse`（`validateStatus` 恒真），先判断 HTTP 状态，再校验 `code === 'OK'`；
- 统一抛出 `BusinessApiError`，页面只消费 `friendlyErrorMessage()`（`src/utils/creative-video/errors.ts`）；
- 登录、刷新 token 等认证链路仍使用 `src/api/request.ts` 的 `requestClient`。

错误文案映射：

| 场景               | 文案                                             |
| ------------------ | ------------------------------------------------ |
| `VALIDATION_ERROR` | 提交的内容不完整或格式不正确                     |
| `NOT_FOUND`        | 项目不存在或已被移除                             |
| `FORBIDDEN`        | 当前演示角色无权访问该页面                       |
| `CONFLICT`         | 项目版本已变化，请刷新后重试                     |
| `INTERNAL_ERROR`   | 演示服务暂时不可用，请重试                       |
| 网络错误           | 演示服务暂时不可用，请确认 Mock 服务已启动后重试 |
| 超时               | 请求超时，请确认 Mock 服务是否已启动             |

## 6. 演示账号与角色

| 用户名     | 角色编码   | 密码     | 说明                                   |
| ---------- | ---------- | -------- | -------------------------------------- |
| `owner`    | `owner`    | `123456` | 全部常规业务菜单                       |
| `editor`   | `editor`   | `123456` | 项目/素材/任务；账单菜单可见但访问 403 |
| `reviewer` | `reviewer` | `123456` | 项目与任务；无账单、无设置             |
| `admin`    | `admin`    | `123456` | 全部菜单与设置                         |

以上均为公开的演示标识，不是真实账号；禁止把任何真实凭据写入 Mock。

## 7. 调用示例

```powershell
# 健康检查
Invoke-RestMethod http://localhost:5320/api/creative-video/v1/health

# 项目列表
Invoke-RestMethod "http://localhost:5320/api/creative-video/v1/projects"

# 不存在的项目（应返回 404）
try { Invoke-RestMethod "http://localhost:5320/api/creative-video/v1/projects/not_exists" } catch { $_.Exception.Response.StatusCode.value__ }

# 恢复种子
Invoke-RestMethod -Method Post http://localhost:5320/api/creative-video/v1/demo/reset
```

> 通过 Vite 开发服务器访问时把 `5320` 换成前端端口（5555），路径前缀保持 `/api`。
