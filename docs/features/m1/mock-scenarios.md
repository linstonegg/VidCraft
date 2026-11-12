# M1 Mock 场景与种子数据

> 文档编号：VC-FE-M1-SCN-001  
> 实现位置：`frontend/apps/backend-mock/utils/creative-video/{fixtures,store,router}.ts`

## 1. 固定种子（ID 不变）

| ID | 项目 | 时长 | 当前阶段 | 资料状态 | 理解状态 |
| --- | --- | --: | --- | --- | --- |
| `project_resume_3d` | 3D 网页简历营销片 | 120s | ANGLES | CONFIRMED（3 来源 / 2 素材） | R1 APPROVED（含 5 痛点、3 价值线索） |
| `project_knowledge_base` | AI 知识库宣传片 | 30s | UNDERSTANDING | CONFIRMED（2 来源） | R1 WAITING_REVIEW |
| `project_crm` | CRM 营销短片 | 60s | INGEST | READY_TO_CONFIRM（LOGIN_REQUIRED + 过期授权） | 无 |
| `project_video_agent` | VidCraft 自身宣传片 | 45s | INGEST | READY_TO_CONFIRM（官网 + 录屏 + 截图 + 品牌） | 无 |

种子内容按附录 A 的要求做了差异化：3D 简历强调“PDF → 3D 网页”的反常规价值；知识库强调“收藏即遗忘”；CRM 强调漏跟进并标注登录后能力待验证；VidCraft 强调“会做产品不会推广”。所有结果类宣称（面试率、转化率）均列入宣传禁区。

## 2. 演示场景开关

在开发环境通过请求体 `scenario` 或页面上的“演示场景”下拉选择：

| 分类 | scenario | 表现 |
| --- | --- | --- |
| URL | `PUBLIC_SUCCESS` | 生成公开页面摘要与证据，状态 PUBLIC_SUCCESS |
| URL | `PARTIAL` | 只生成部分来源，覆盖度标出缺失 |
| URL | `LOGIN_REQUIRED` | 提示公开页面不足，建议模拟授权或上传资料 |
| URL | `FETCH_FAILED` | 任务约 55% 失败，来源标记失败，可重试 |
| URL | `SLOW_COLLECT` | 12 秒慢任务，可观察进度（页面可离开再回来） |
| 授权 | `AUTH_SUCCESS` | ACTIVE、只读、30 分钟到期 |
| 授权 | `MFA_REQUIRED` / `ACCESS_DENIED` / `NO_DEMO_DATA` | 对应失败状态 |
| 授权 | `SESSION_EXPIRED` | 会话过期，不能继续探索 |
| 理解 | `UNDERSTANDING_SUCCESS` | 约 4.2 秒生成新草稿修订 |
| 理解 | `UNDERSTANDING_FAILED` | 约 55% 失败，可重试 |
| 理解 | `UNDERSTANDING_SLOW` | 15 秒慢任务 |

未知 URL 的返回是**泛化的待验证结果**（明确“未真实读取该站点”），不会伪造 3D 简历数据。

## 3. 任务与幂等

- 任务状态由 Mock 服务端按 `createdAt + duration` 推进，轮询 800～1500ms；读取项目、资料、修订或任务列表时也会推进任务，因此离开页面后再次进入仍可完成；
- 任务终态只应用一次结果（`applied` 标记），刷新不会重复生成修订；
- `Idempotency-Key` 适用于创建项目、URL 分析、确认快照、生成理解、上传素材；同键不同体 → 409；
- 同一项目已有活动理解任务时，再次生成返回 409 `CONFLICT`；
- 版本锁：项目 / 来源 / 素材 / 理解修订均校验 `expectedVersion`；归档、删除、复制项目同样校验。

## 4. 数据生命周期

| 数据 | 保存位置 | 刷新浏览器 | 重启 Mock |
| --- | --- | --- | --- |
| 项目、资料元数据、快照、理解修订、任务 | 本地 JSON 文件 | 保留 | 保留 |
| 上传文件内容 | 不保存（仅元数据 + 当前会话 blob 预览） | 预览失效，提示重新选择 | 无 |
| 演示授权会话 | 本地脱敏摘要 | 保留（不含密码/Cookie/Token） | 恢复并校验到期时间 |
| 前端筛选/表单草稿 | Pinia（页面级） | 丢失（有意，避免伪造保存） | — |

## 5. 重置与隔离

- “恢复演示数据”会重置所有项目、资料、报告与任务，**只在本地演示实例使用**；
- 共享 Mock 实例时不同开发者的 Reset 会互相影响，M1 未实现租户隔离（已列为已知限制）；
- 演示账号均为公开假账号，密码仅用于本地 Mock；不包含真实凭据。
