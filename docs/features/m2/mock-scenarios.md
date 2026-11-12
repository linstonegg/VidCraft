# M2 Mock 场景与种子

> 实现：`apps/backend-mock/utils/creative-video/{fixtures,store,router}.ts`  
> 重置：`POST /demo/reset`（owner/admin），同时恢复 M1/M2 引用，避免悬空。

## 1. Seed 策略

M2 默认 Demo Reset 会为四个项目预置完整、可互相区分的 M2 链路（切口/Brief/3 创意/剧本/视觉规范/分镜/预演/M3 handoff），并补齐演示所需的 M1 已批准理解版本；`project_resume_3d` 保持 `ANGLES` 阶段，其余 Seed 进入 `GENERATE` 占位。

| 项目                     | M2 预置                            | 镜头数 |
| ------------------------ | ---------------------------------- | ------ |
| `project_resume_3d`      | 4 切口、3 套故事、7 节拍、完整预演 | 15     |
| `project_knowledge_base` | 4 切口、3 套故事、4 节拍、完整预演 | 6      |
| `project_crm`            | 4 切口、3 套故事、6 节拍、完整预演 | 6      |
| `project_video_agent`    | 4 切口、3 套故事、6 节拍、完整预演 | 6      |

开发/自动化测试可使用 `POST /demo/reset` body `{"m2Seed":"interactive"}`，只保留 3D 简历的 4 个初始切口，用于从零走生成流程；UI“恢复演示数据”默认 `full`。任何已批准 M1 理解的项目也可通过同一套 `generate` API 生成 M2 数据。

## 2. 主演示数据（3D 简历）

- 4 个切口：`UNCONVENTIONAL`（PDF→3D）、`IDENTITY`（把自己装进链接）、`LIVE_WOW`（现场立体展开）、`PAIN_EMPATHY`（一千份一样简历）；
- 三套故事：纸张跳出来 / 一千份简历 / 装进一条链接，主角、场景、冲突、结构均不同；
- 默认创意自然容量 30s；目标 120s → `CAN_EXPAND`，要求选择 A/B/C；
- 剧本 7 个节拍：10/20/20/25/20/15/10 秒，合计 120000ms；
- 分镜 15 镜头：时长 6/4/10/10/10/10/8/7/10/8/7/5/10/5/10 秒，合计 120000ms；每镜头绑定 7 个 Beat 之一；
- 每镜头有独立 SVG 分镜示意图（`public/demo/m2/resume-3d/shot-01..15.svg`），V1 参考图；生成新候选为 V2 且不覆盖 V1；
- 预演快照引用已批准分镜、视觉规范、每镜头当前图片。

## 3. 场景开关

`scenario` 通过各个 generate 请求传入：

| 场景                     | 结果                                             |
| ------------------------ | ------------------------------------------------ |
| `NORMAL`                 | 稳定成功                                         |
| `SLOW`                   | 任务时长 ×3，可测试离开/返回                     |
| `FAIL_BEFORE_RESULT`     | 约 55% 失败，不创建新版本，旧版保留              |
| `NO_STRONG_ANGLE`        | 只生成 2 个泛化切口并标记资料不足                |
| `HOMOGENEOUS_CONCEPTS`   | 三套方案仍生成，组上标记 `homogeneous`，提示重选 |
| `REFERENCE_IMAGE_FAILED` | 图片任务失败，旧图继续可用                       |

## 4. 任务时间

| 任务 | 正常时长 | 阶段 |
| --- | --: | --- |
| DISCOVER_ANGLES | 2.8s | 读取理解 → 提取价值 → 排序切口 → 绑定风险 |
| GENERATE_CONCEPTS | 3.4s | 读取 Brief → 三套故事 → 差异化检查 → 风险 |
| GENERATE_SCRIPT | 3.0s | 读取创意 → 规划时长 → 写节拍 → 校验 |
| GENERATE_VISUAL_BIBLE | 2.2s | 角色/场景/品牌 |
| GENERATE_STORYBOARD | 3.8s | 剧本 → 映射 Beat → 镜头 → 图片 |
| GENERATE_REFERENCE_IMAGE | 2.4s | 读取规范 → 构图 → 保存 V2 |
| BUILD_ANIMATIC | 2.4s | 校验镜头 → 计算时间线 → 冻结快照 |

任务状态由服务端时间推进；读取项目/阶段数据时也会推进，避免离开页面后永远停在 RUNNING。生成任务会把 jobId 写入 URL query，刷新页面后继续轮询。

## 5. 版本与失效

- 任何可编辑对象带 `version`，PATCH 必须带 `expectedVersion`，冲突返回 409；
- 已批准版本不可改，必须 Fork；
- 修改镜头/剧本/视觉规范/上游资料会把下游标记 `STALE`，旧版仍可查看；
- M1 资料变化（新增素材等）会把 M1 理解与全部 M2 对象标记 STALE；
- 预演快照只在全部镜头批准且分镜批准后构建；上游变化后旧快照 `STALE`，页面只读展示并提示复核。

## 6. 持久化与限制

- M2 与 M1 存在同一 Nitro 内存仓储，持久化到 `.data/vidcraft-m1.json`（schemaVersion=2）；重启恢复；
- 演示账号共享同一实例，Reset 会互相影响；
- 图片为自制 SVG 示意图，不是真实生成图，刷新不会丢失（静态资源）；
- 没有真实 LLM、图像模型、TTS、视频生成或积分结算。
