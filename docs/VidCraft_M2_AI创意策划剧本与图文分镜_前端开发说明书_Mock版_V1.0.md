# VidCraft — M2 前端详细研发说明书：传播切口、创意方案、智能剧本、图文分镜与低成本预演（Mock 版）

> **文档编号**：VC-FE-M2-001  
> **文档版本**：V1.0  
> **编制日期**：2026-11-09  
> **产品名称**：VidCraft / AI 创意营销视频 Agent  
> **读者**：前端负责人、Vue 工程师、UI/UX 设计师、测试工程师、后续 .NET / Python Agent 对接人员  
> **工程基线**：已完成 M0、M1；Vue Vben Admin 5.x + `apps/web-ele`（Element Plus）+ Vue 3 + TypeScript + Pinia + Nitro Mock；以项目实际锁定 commit/tag 为准  
> **开发范围**：前端页面、UI 状态、完整可交互 Mock API、版本和审核闭环、低成本 Animatic 浏览器预演；**不调用真实大模型、图片/视频生成、语音合成、FFmpeg、第三方网站或计费服务**。  
> **依赖文档**：`VidCraft_M0_Vben工程基础搭建指南.md`；`VidCraft_M1_项目创建资料采集与产品理解_前端开发说明书_Mock版_V1.0.md`；`AI创意营销视频Agent_前端研发说明书_Mock版_v1.0.md`。  
> **执行优先级**：本文 P0 是 M2 必须交付；P1 应尽量交付；P2 是后续预留。需求冲突时以前一阶段已经实际落地的接口/类型为起点，变更需出兼容迁移说明，不得擅自推翻 M0/M1。  

---

# 0. 给研发团队的执行摘要

## 0.1 M2 一句话目标

M1 已使用户能够**创建项目 → 提供 URL / 演示环境素材 / 录屏 / 截图 / 产品文档 → 审核产品理解结果**。M2 要让用户继续：

**已确认产品理解 → AI 发现传播切口 → 生成/比较至少三套创意 → 选定并确认创意 → 按目标时长策划完整剧本 → 生成为每镜头配图的分镜 → 用户逐镜头修改和审核 → 低成本浏览整片预演 → 确认交付 M3。**

不要把 VidCraft 做成“输入网址播放功能说明”的工具。核心价值是**自动识别产品最值得传播的独特价值，并创作观众愿意主动观看的故事**：反常规、新体验、真实问题、结果变化、身份表达、可信证明、悬念、视觉奇观等。

例如用户的 3D 简历产品，不应只生成“支持 3D 人物、在线编辑、网页简历”，而应发现“PDF/Word 静态简历 → 会动、可互动的 3D 网页个人形象”的**认知反差**；但不能虚构“必然提高录用率”。

## 0.2 M2 完成后必须可演示的用户旅程（P0）

1. 用户打开 M1 已确认产品理解的 `project_resume_3d`，从 `/studio/:id/understanding` 点击「进入创意策划」。
2. 进入 `/studio/:id/angles`，看到基于 `UnderstandingRevision` 的事实/待验证/不支持主张、至少 3 个主传播切口，能够切换切口、解释来源并让 Mock Agent 再推荐。
3. 在 `/studio/:id/concepts` 同屏比较三套**故事结构、角色/场景与开场 Hook 明显不同**的创意，编辑文案、收藏、反馈、再生成、选择正式候选；用户确认前不能进入真正的正式剧本生产状态。
4. 进入 `/studio/:id/script`，设目标 `120s`；Mock 发现创意的天然容量为 `30s`，明确提醒并提供：**完整故事扩写 / 多章节 / 保留短片**。用户选择“故事扩写”并得到七个故事节拍，长度总计 120 秒。
5. 编辑某个节拍的台词/叙事目的/时长，模拟 AI 局部改写，保留 `R1/R2/R3` 修订与差异；确认整套剧本。
6. 进入 `/studio/:id/storyboard`，生成带参考图片、人物设定、画面、动作、镜头运动、旁白、字幕、音效、产品植入和来源的 **15 个镜头**，支持拖拽排序、调整时长、局部修改、图片版本、逐镜头确认。
7. 用户说“镜头 07 中让纸张先炸开，再让人物出现”，系统先显示 AI 修改计划/影响范围，确认后创建**新分镜修订**，不覆盖旧修订；需要复核的镜头明确标记。
8. `15/15` 镜头均确认、视觉规范锁定、时长通过检查后，进入 `/studio/:id/animatic`；播放用图片+字幕+简易运动构建的 120 秒故事预演，支持播放/暂停/Seek/跳镜头/音量或静音、发现问题后回到指定镜头。
9. 用户点击「确认预演」，产生不可变 `AnimaticSnapshot`，项目可进入 `/studio/:id/generate`（M3 占位）。
10. 全程 Mock API、草稿自动/手动保存、刷新恢复、权限控制、业务错误及数据版本冲突都必须真实可操作；不能靠在页面写死数据“表演”。

## 0.3 本阶段不做（但必须预留接口）

- 不真实抓取 URL、不代用户登录第三方网站、不收演示账号密码；继续复用 M1 已确认的产品报告和来源证据。
- 不调用任何真实 LLM/Seedance/可灵/图像模型/TTS/付费 API；页面所有结果必须显著标记 **Mock 演示**。
- 不执行真正的视频片段生成、单镜头视频重生成、积分冻结结算；它们属于 M3。
- 不执行 FFmpeg 合成、完整成片多版本管理、最终导出 MP4；它们属于 M4。
- 不做全功能 Premiere 式多轨剪辑器、复杂关键帧编辑器、多人实时协同编辑、真实投放数据与广告转化评估。
- 不让「确认分镜」等同于「同意收费」；M2 不发生视频生成账务。

## 0.4 必须坚持的十个产品原则

1. **传播切口 ≠ 视觉表现**：痛点、反常规是“为什么值得讲”；幽默、悬念、拼贴、3D 动画是“怎么讲”。
2. **产品事实必须有来源**：`verified`、`user_confirmed`、`hypothesis`、`unsupported` 四种证据级别持续传递；不能让 AI 重新把推测写成硬性宣传。
3. **创意先于完整剧本**：先比较故事概念与切口，再结合时长生成完整结构。
4. **时长不能硬凑**：30 秒故事扩展到 120 秒要增加故事节拍的新信息，不是慢镜头、重复台词、机械凑字幕。
5. **先图文，后视频**：M2 的画面参考图和分镜文本要一一对应；确认后才由 M3 付费生成镜头视频。
6. **已确认修订不可变**：修改已确认版本只能 Fork 新草稿，不能覆盖原版本。
7. **局部修改先出计划**：明确修改对象、是否影响全局角色、哪些分镜需复核、是否会导致时长变化。
8. **时间线净时长可校验**：包含转场重叠与独立插入时长，不用简单求和掩盖问题。
9. **真实交互优于静态效果**：所有按钮有明确可验证行为；Mock 任务可失败、可恢复、可重复演示。
10. **可替换的契约**：UI 只通过统一 API/Repository 使用数据，不直接与 Fixture JSON 耦合。

---

# 1. M0 / M1 兼容基线：不允许重新发明接口

## 1.1 工程与配置

- 根目录建议仍为 `VidCraft`；M2 在既有 Monorepo 的 `apps/web-ele` 内开发。
- 使用已锁定的 Vben 5.x、Element Plus、Pinia、pnpm、TypeScript、Vite、Nitro Mock；**不要在 M2 擅自升级 Vben 或换 UI 库**。
- 品牌为 `VidCraft 创作平台`；界面简体中文，代码英文标识；保留 M0 Mock 模式 Banner。
- 业务前缀：浏览器 `/api/creative-video/v1/...`；API Service 内 `/creative-video/v1`，由请求 Client 追加 `/api`。
- API 正常响应：`ApiResponse<T> = { code:'OK', message, data, requestId, timestamp }`；业务错误保持 HTTP 状态码 + 错误 `code`。
- 复用已存在的统一登录/权限、Toast、错误处理、API Client、Mock Seed/Reset、时间格式和主题 Token。
- Studio 采用已完成的**独立全屏布局**；不能挤进常规 Vben 左侧后台菜单的狭窄内容区。

## 1.2 既有 URL、阶段与路由不可改名

| 阶段 | 路由 | 负责里程碑 | 状态 |
|---|---|---|---|
| S1 资料采集 | `/studio/:id/ingest` | M1 | 已完成 |
| S2 产品理解 | `/studio/:id/understanding` | M1 | 已完成 |
| S3 传播切口/创意方向 | `/studio/:id/angles` | M2 | 本期实现 |
| S3 子页 创意故事比较 | `/studio/:id/concepts` | M2 | 本期新增子路由；顶部 Stepper 仍显示 S3 |
| S4 智能剧本 | `/studio/:id/script` | M2 | 本期实现 |
| S5 图文分镜 | `/studio/:id/storyboard` | M2 | 本期实现 |
| S6 低成本预演 | `/studio/:id/animatic` | M2 | 本期实现 |
| S7 镜头视频 | `/studio/:id/generate` | M3 | M2 仅守卫/占位 |
| S8 最终合成 | `/studio/:id/render` | M4 | M2 仅守卫/占位 |

M1 `ProjectStage` **保持完全不变**：`INGEST | UNDERSTANDING | ANGLES | SCRIPT | STORYBOARD | ANIMATIC | GENERATE | RENDER`。新增 `/concepts` 是 `ANGLES` 的子步骤，不增加 `CONCEPTS` 阶段枚举。顶部 8 步 Stepper 沿用 M1：`资料 → 理解产品 → 创意方向 → 剧本 → 图文分镜 → 预演 → 镜头视频 → 成片`。

## 1.3 跨阶段输入契约（M2 不重新推测产品）

进入 M2 必须取得以下引用：

```json
{
  "projectId": "project_resume_3d",
  "ingestionSnapshotId": "ingest_snapshot_002",
  "productUnderstandingRevisionId": "understanding_revision_003",
  "productUnderstandingVersion": 3,
  "evidenceIds": ["evidence_resume_feature_01"],
  "selectedValueSeeds": ["angle_seed_pdf_to_3d"],
  "targetDurationSec": 120,
  "primaryPlatform": "douyin",
  "aspectRatio": "9:16",
  "language": "zh-CN"
}
```

同时读取 `UnderstandingRevision`：`productSummary`、`personas`、`features`、`painPoints`、`valueAngleSeeds`、`prohibitedClaims`、`brandGuidelines`、`missingInformation`、`usedEvidenceIds`、`status`、`revisionNo/version`；`VideoProject`：`durationSec`、`platforms`/`platform`、`aspectRatio`、`language`、`targetAudience`、`stylePreferences`、`negativeGuidance` 等。

**前置门禁**：只有 M1 报告 `status=APPROVED`、且与当前资料快照相容时，允许生成切口/创意；否则展示提示「请先确认产品理解报告」，并指向 `/understanding`。若 M1 后续变更资料或理解报告，M2 相关版本可能变 `STALE`，详见第 9 章。

## 1.4 基础枚举与权限复用

```ts
export type ProjectStage =
  | 'INGEST' | 'UNDERSTANDING' | 'ANGLES' | 'SCRIPT'
  | 'STORYBOARD' | 'ANIMATIC' | 'GENERATE' | 'RENDER';

export type EvidenceLevel =
  | 'verified' | 'user_confirmed' | 'hypothesis' | 'unsupported';

export type ReviewStatus =
  | 'pending' | 'approved' | 'rejected' | 'needs_changes';

export type VideoRatio = '9:16' | '16:9' | '1:1';
```

M1 角色 `owner`、`editor`、`reviewer`、预留 `viewer`：owner 可全流程、editor 可编辑和发起 Mock 任务、reviewer 可查看/批注/根据项目授予的审核权确认、viewer 只读。**审核权限不得以角色名简单等于“可审核”**，应复用 M1 的项目授权；前端控件隐藏/禁用 + Mock API 返回 403 双重校验。

## 1.5 既有四个 Seed 项目 ID 不变

- `project_resume_3d`：3D 网页简历（非寻常创新）
- `project_knowledge_ai`：AI 知识库（收藏/搜索痛点）
- `project_crm_demo`：CRM（客户跟进和丢单风险）
- `project_vidcraft`：VidCraft 自身（网站上线后不会营销）

如果项目实际 M0/M1 Seed ID 与上面建议值存在差异，**以已落地 M0/M1 ID 为准，M2 通过 Seed Mapping 适配**；不得删除或覆盖既有项目与用户数据。M2 Seed 是追加故事、剧本、分镜等对象。

---

# 2. 页面信息架构、步骤守卫和主要状态

## 2.1 M2 五个页面的职责划分

| 编号 | 页面 | 作用 | P0 关键行为 | 主要输出 |
|---|---|---|---|---|
| P5 | `/studio/:id/angles` | 挖掘候选传播切口，解释为何值得拍 | 查看证据、对比、锁定候选切口、再分析 | `MarketingAngleSet` |
| P6 | `/studio/:id/concepts` | 由切口生成 3 套真正不同的创意故事 | 生成、对比、编辑、选择、确认 | `CreativeConceptRevision` |
| P7 | `/studio/:id/script` | 时长适配、故事节拍、完整脚本 | 选择扩写策略、编辑/改写、版本/确认 | `ScriptRevision`, `DurationPlan` |
| P8 | `/studio/:id/storyboard` | 图文分镜、视觉规范和每镜头审核 | 图片/剧本联动、修改、排序、确认 | `StoryboardRevision`, `ShotRevision` |
| P9 | `/studio/:id/animatic` | 浏览器内播放低成本整片预演 | 播放、Seek、反馈、确认快照 | `AnimaticSnapshot` |

## 2.2 顶部 Studio 固定区域

所有 M2 页面必须呈现：项目名称、返回项目中心、8 步 Stepper、当前阶段/修订号、保存状态、Mock 模式标识、用户头像/权限、右上角「历史版本」入口、帮助/说明；预留“模拟积分余额”只作 M3 入口，不在 M2 扣费。

状态提示至少有：`未开始`、`草稿`、`Mock 任务中`、`待审核`、`已确认`、`需复核`、`已过期`、`失败`。状态颜色用统一设计 Token，不用组件内散落硬编码的十几种颜色。

## 2.3 推荐阶段细粒度状态

```ts
export type CreativePhaseStatus =
  | 'NOT_STARTED' | 'QUEUED' | 'RUNNING'
  | 'DRAFT_READY' | 'WAITING_REVIEW'
  | 'APPROVED' | 'REJECTED' | 'FAILED' | 'STALE';

export type VersionStatus =
  | 'DRAFT' | 'WAITING_REVIEW' | 'APPROVED'
  | 'REJECTED' | 'STALE' | 'SUPERSEDED';

export type ShotReviewState =
  | 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_CHANGES'
  | 'APPROVED' | 'STALE';
```

`ProjectStatus` 沿用 M1 只描述**项目全局状态**，不要被 M2 的阶段状态覆盖。

## 2.4 守卫矩阵（必须实测）

| 目标路由 | 必要条件 | 不满足时 |
|---|---|---|
| `/angles` | M1 产品理解当前有效且 `APPROVED` | 导向 `/understanding`，保留用户原访问意图 |
| `/concepts` | 已有候选切口集合或用户手动建立切口 | 导向 `/angles`，说明前置资料缺失 |
| `/script` | 有已批准创意修订 + 目标时长/视频规格 | 导向 `/concepts` |
| `/storyboard` | 有已批准剧本修订 + 视觉规范初稿 | 导向 `/script` |
| `/animatic` | 当前分镜集合有效且所有必须镜头 `APPROVED`，时长校验通过 | 导向 `/storyboard` 并定位阻塞项 |
| `/generate` | 当前有效 `AnimaticSnapshot` 已确认 | M2 未完成则禁用；完成后显示 M3 占位 |

不能只用“用户是否访问过上一页”作为门禁；必须校验服务器/Mock 业务状态与引用的上游版本。

## 2.5 页面离开、草稿和并发

- 编辑页面支持 `保存草稿`、`撤销局部操作`（可选）、`放弃本次未保存更改`、`确认提交`。
- 保存后显示时间与修订 ID；自动保存是可选辅助，但绝不应偷偷将草稿变为批准。
- 编辑未保存时，切换 Stepper、返回项目列表、切换修订时先提示；刷新前可使用浏览器原生离开提醒，但不能保证所有移动浏览器都响应。
- M2 所有可编辑对象带 `version`；请求传 `expectedVersion`，冲突则返回 HTTP 409；界面弹窗呈现「保留我的编辑 / 查看最新版本 / 另存为新草稿」的合理选择，**不得盲目覆盖**。
- 在 Mock 演示环境里模拟其他人更新时，必须展示真实 409 和刷新恢复行为。

## 2.6 生命周期与审核要素

任何阶段必须区分：`已生成/已保存草稿`、`已提交审核`、`已批准用于下游`。生成成功不等于批准。批准结果不可修改，只能 Fork；只有批准的正式版本进入下一阶段。未来自动托管模式预留 `reviewMode='PROFESSIONAL'|'MANAGED'`，M2 默认只有 `PROFESSIONAL` 真正可用。

---

# 3. P5 传播切口发现 `/studio/:id/angles`

## 3.1 目标和误区

Agent 在看完 M1 的产品理解结果后，**不是直接从十个广告模板中任选一种**；而是先归纳“为什么值得让观众了解这个产品”，选出最有传播潜力的价值，并展示理由、证据和不确定性。

示例：3D 简历的核心反差不是“效率提升 80%”，而是“以前发静态 PDF/Word，现在可以分享可交互的 3D 网页简历”。功能存在与否需 M1 证据支持；夸大招聘效果不得通过。

## 3.2 界面布局建议

```text
┌ 项目名称 / Stepper: 创意方向 / 当前理解R3 / 保存状态 / Mock ─────────────┐
│ 左：产品事实摘要     │ 中：传播切口候选卡                  │ 右：证据与风险 │
│ - 目标用户           │ [切口A：PDF→3D]  推荐原因            │ 功能证据链接   │
│ - 核心功能           │ [切口B：表达被记住]                  │ 假设和限制     │
│ - 关键痛点           │ [切口C：现场视觉惊艳]                │ 缺失素材       │
│ - 禁用宣传主张       │ [组合/调整权重/再发现]              │ AI解释性摘要   │
├──────────────────────────────────────────────────────────────────────┤
│ 返回理解报告 / 保存草稿 / 比较候选 / 确认候选切口 → 创意方案             │
└──────────────────────────────────────────────────────────────────────┘
```

建议桌面三栏，宽屏中心为主；1366 以下右栏抽屉化；平板改单列卡片，证据作为抽屉。

## 3.3 内置 10 类“吸引力切口库”（需配置化）

**注意：下列是可选择的分析标签，不是强制套用的十种固定视频模板；每个产品允许主/辅组合。**

| 代码 | 中文名 | 观众反应 | 示例 | 主维度 |
|---|---|---|---|---|
| `UNCONVENTIONAL` | 反常规、认知刷新 | 原来还能这样？ | PDF 简历 → 3D 网页 | 价值 |
| `PAIN_EMPATHY` | 真实痛点、情绪共鸣 | 这不就是我？ | 收藏几千篇内容却找不到 | 价值 |
| `BEFORE_AFTER` | 结果蜕变、前后反差 | 变化这么大？ | 手工报表 → 自动可视化 | 价值/结构 |
| `IDENTITY` | 身份认同、自我表达 | 这就是我想呈现的形象 | 个人品牌与数字形象 | 价值 |
| `MYSTERY` | 悬念揭秘、好奇心 | 接下来会发生什么？ | 给 AI 一个网址会发生什么？ | 表达 |
| `BENEFIT` | 极致收益、效率价值 | 能省下这些麻烦？ | 省去重复录入 | 价值 |
| `ASPIRATION` | 梦想愿景、新可能 | 我也想拥有 | 一个人的数字工作室 | 价值 |
| `PROOF` | 真实案例、信任证明 | 它真的有效吗？ | 可核实的真实操作或案例 | 证明 |
| `LIVE_WOW` | 现场惊艳、眼见为实 | 这效果太有意思 | 图片变可互动 3D 人物 | 视觉/产品展示 |
| `HUMOR` | 幽默、娱乐传播 | 好笑，想分享 | AI 员工在电脑里争工作 | 表达 |

可扩展的**表现方式标签**单独配置：`SUSPENSE`, `REVERSAL`, `CINEMATIC`, `3D_CARTOON`, `MOTION_GRAPHICS`, `PAPER_COLLAGE`, `KINECTIC_TYPE`, `SPLIT_SCREEN`, `VISUAL_METAPHOR`, `DOCUMENTARY`, `UGC`。别将 `HUMOR/MYSTERY` 等表达元素误用为产品真实价值证据。

## 3.4 每个传播切口卡必须有的字段

- `id`、`title`、`primaryCode`、`secondaryCodes[]`、`expressionTags[]`。
- `oneLiner`：一句话价值切口，不是功能清单。
- `oldApproach`、`newApproach`（有反常规对比时）；`targetPersonaIds[]`、`relatedPainPointIds[]`、`relatedFeatureIds[]`。
- `audienceReaction`：观众可能的心理反应。
- `whyItMatters`：为什么这点让目标用户在意。
- `openingHook`：建议首 3 秒开场话术/画面钩子。
- `evidenceRefs[]`、`evidenceLevel`、`assumptions[]`、`prohibitedClaimsHit[]`。
- `visualPotential`、`clarity`、`relevance`、`novelty`、`trustworthiness`：启发式 1～5 维度评分（标注“Mock 启发式”），不是市场实际转化数据。
- `estimatedProductionComplexity`（LOW/MEDIUM/HIGH），`missingAssets[]`，`rationale`。

## 3.5 交互列表（全部能操作）

1. `发现传播切口`：提交异步 Mock 任务，显示进度和阶段事件，返回按项目类型不同的候选集合。
2. `查看依据`：证据面板跳转到 M1 Evidence 源，明确 `verified/user_confirmed/hypothesis/unsupported`。
3. `切换主切口`、`组合辅切口`、`设置禁用角度`：形成“创意 Brief”草稿；不修改 M1 原始产品事实。
4. `添加自定义切口`：用户可手工写新切口，但必须指定依据或标注“待验证”，不能默认作为事实。
5. `让 AI 再给一些方向`：新建候选集合版本，保存原集合，可回看；Mock 无真实推理费用。
6. `查看解释性摘要`：展示适配目标用户、证据与风险，而非“AI 评分 99 分”这种虚假确定性。
7. `确认创意 Brief`：锁定主/辅方向与创意边界、来源 ID、上游理解版本，然后前往 `/concepts`。
8. `返回补充资料`：跳到 M1 `/ingest`，并说明修改资料可能使现有创意过期。

## 3.6 不足以形成强切口时怎么处理

Mock Seed 包括 `NO_STRONG_ANGLE`：仅发现泛化卖点，系统提示「目前资料不足以支撑独特创意，建议补充差异化功能、实际场景或客户案例」。可选 `补资料` 或 `仍继续（风险自担）`，但不能由 Mock 自动凭空补出“百万客户/收益翻倍”等证据。

## 3.7 审核规则

- 上游理解已批准；当前切口集合引用已批准的 `understandingRevisionId`。
- 主切口恰好一个，辅切口 0～2；每条可用于正式广告的事实必须有支持证据。
- 存在 `unsupported` 主张必须移除或修正；`hypothesis` 必须确认是创意场景假设而非产品性能承诺。
- `prohibitedClaims` 应进行简单文本检查 + 人工审核确认。
- 通过后发布 `ApprovedCreativeBrief` 不可变快照；再生成三套故事。

---
# 4. P6 创意故事方案 `/studio/:id/concepts`

## 4.1 页面定位

本页不能只是把传播切口复制成三段文案。用户需要感受到“原来我的产品还能用这种方式讲”。同一产品的三套概念必须在**人物/场景/冲突/结构/产品出现方式**方面形成实质区别。

产品核心体验：三个创意方案同时可看、有图、有故事、有目标受众、有钩子、有风险；用户直接改故事或用自然语言提出意见；选择一个确认，另两个仍保存为备选。

## 4.2 推荐 UI

- 顶部固定 `Creative Brief`：主切口、辅切口、目标受众、营销目标、平台、目标时长、禁止主张；点击跳回 `/angles` 修改。
- 中央 `Concept A / B / C` 三列或三卡标签：各有标题、海报主视觉/情绪板 1～3 张、开头钩子、故事梗概、冲突、反转、高潮、产品自然植入、CTA。
- 下方方案对比矩阵：`受众共鸣 / 新奇感 / 视觉可实现性 / 真实性 / 内容容量 / 预期制作复杂度`，全部是 Mock 启发式评分，明确不代表实际投放结果。
- 右侧可展开 AI 导演讨论面板：选中方案上下文、用户修改意见、修改计划、引用素材、变更预览。
- 固定底栏：`返回切口` / `保存草稿` / `再生成三套` / `确认选择该方案 → 剧本`。
- 方案详情应能预览 **完整的“发生什么”**，不能只展示一句营销口号。

## 4.3 三套方案的最低差异化标准

每个方案记录 `storyStructure`、`leadCharacter`、`mainSetting`、`centralConflict`、`emotionalTone`、`primaryAngleId`。Mock 在生成时检查三套中**任两套至少两个本质维度不同**；否则对该方案标记“创意同质化”，重选 Fixture 或提供重生成选项。

以 3D 简历为例：

| 方案 | 切口 | 故事主角/冲突 | 开头 Hook | 产品自然出现 |
|---|---|---|---|---|
| A「简历从纸里跳出来」 | 反常规 + 视觉奇观 | 求职者捧着普通 PDF，纸张化为 3D 世界 | “简历还能活过来？” | 主角最终进入真实 3D 简历网页 |
| B「一千份一样的简历」 | 真实痛点 + 情绪共鸣 | 招聘者面对千篇一律的简历，难了解人的特点 | 成堆纸张淹没镜头 | 以网页展示作品和个人风格 |
| C「把自己装进一条链接」 | 身份表达 + 悬念 | 创作者尝试把经历变成互动数字空间 | “我把自己装进了一个网址” | 数字人、作品展示后出现产品入口 |

以 CRM 为例，三套可以是：`客户跟进忘记回电`、`销售会议人物反转`、`一张混乱客户关系网被整理`，不能复制 3D 简历的“纸张爆炸”作为所有产品的统一模板。

## 4.4 单套 CreativeConcept 必备内容

- 元信息：`id`、`projectId`、`briefId`、`conceptGroupId`、`revisionNo`、`status`、`version`。
- 策略：标题、`logline`、`primaryAngleId`、`secondaryAngleIds`、`targetPersonaIds`、营销目标。
- 吸引力：前三秒 `openingHookText` + `openingVisualHook`、预期观众反应、为何适合产品。
- 剧情：主角、场景、开端、冲突、升级、反转、价值呈现、情绪高潮、产品露出、CTA。
- 美术：`visualStyles`、`moodboardAssetIds`、推荐画幅、音频氛围、创意隐喻。
- 真实性：`claimEvidenceIds`、`riskNotes`、`missingAssets`、`prohibitedClaims`。
- 制作：`suggestedDurationSec`、`minimumViableDurationSec`、`maximumUsefulDurationSec`（只是建议范围）、复杂度 `LOW/MEDIUM/HIGH`、大致素材类型。
- 版本：输入快照 `understandingRevisionId`、`approvedBriefId`、创建人、父版本、评论记录、提交审核/确认信息。

## 4.5 编辑与 AI 改写交互

1. 点击卡片：打开分栏编辑抽屉，能编辑 Hook、故事关键句、人物设定、冲突、反转、CTA 和视觉风格。
2. 点击「告诉 AI 怎么改」：文本输入；Mock 分析修改类型（钩子/剧情/人物/风格/产品植入/真实性风险），显示**建议差异预览**；用户确认后 Fork 新版。
3. 点击「更大胆一点」「增加幽默」「更关注用户痛点」「减少广告味」等快捷指令应生成不同确定性结果；不是只弹“修改成功”。
4. 用户可上传/引用 M1 素材作为 moodboard 的资料来源；Mock 可引用本地预置图片，不真实生图。
5. 点击「再生成三套」：新 `ConceptGroup` + 新异步 `MockJob`；旧组及已收藏方案不删除。
6. 方案确定：只能选**当前已提交审核的有效草稿**；审核通过形成不可变 `CreativeConceptRevision`；切换正式方案时，下游剧本/分镜/预演按第 9 章失效规则处理。
7. 不允许从未审核方案直接进入正式分镜；使用右上角「另存为草稿」也不得绕过门禁。

## 4.6 用户审核问题清单（在页面明显展示）

- 观众前三秒会被什么吸引？
- 看完整条视频，观众能说出什么产品价值？
- 故事展示的功能和产品实际能力一致吗？
- 故事是否只是把痛点写成套路化广告？
- 视频是否只是堆砌炫酷素材，而缺少产品关联？
- 时长能否自然延展到需求目标？

审核可以给出 `接受`、`需要修改`、`弃用该方案`。拒绝必须有原因；接受后保留备选方案供后续参考，不删除。

## 4.7 异常与空状态

- `NO_CONCEPTS`：没有可用方案，显示重试及返回切口按钮。
- `HOMOGENEOUS_CONCEPTS`：三套方案雷同；显示醒目提示并提供“重新构思差异化方案”。
- `UNSUPPORTED_CLAIM`：含未经证实效果/数据，禁止直接确认，支持剔除或将表达改为假设语气。
- `MISSING_BRAND_ASSET`：建议补充，但非硬性阻塞（根据业务类型判断）。
- `MOCK_JOB_FAILED`：保持已有候选，显示错误原因、可重试按钮。
- `VERSION_CONFLICT`：加载最新版本，显示差异，不静默覆盖。

---

# 5. P7 智能剧本、故事节拍与时长规划 `/studio/:id/script`

## 5.1 目的

把**已确认的创意概念**变成可执行、可验证时长、可修改的完整脚本；这里的核心对象是 `ScriptRevision`（结构化故事节拍）而非一大段不带结构的文案。目标时长必须在**写完整剧本前**参与规划。

## 5.2 布局

```text
┌ 项目 / 当前创意 C-R2 / 目标120秒 / 9:16 / 抖音 / 剧本R3状态 ────────┐
│ 左：创意指南          │ 中：剧本节拍编辑区                │ 右：AI导演 │
│ 主切口、目标人群       │ 00:00-00:10  钩子                 │ 修改意见   │
│ Hook、品牌/禁用主张    │ 00:10-00:30  冲突                 │ 修改计划   │
│ 时长适配建议          │ 00:30-00:50  认知转折             │ 事实风险   │
│ 时长规划策略          │ ...                              │ 来源说明   │
│                      │ [新增/删除/拆分/合并/重排节拍]    │            │
├─────────────────────────────────────────────────────────────────────┤
│ 故事节奏条：120s / 7 beats / 叙事重复风险 / 旁白估计 / 保存与审核     │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.3 支持的视频规格

- M1 默认提供 `30s / 60s / 120s`，M2 可在编辑器提供 `15 / 30 / 45 / 60 / 90 / 120` 秒扩展快捷选项；自定义时长先预留 `15～180s`，必须受产品业务规则约束。
- 画幅 `9:16`、`16:9`、`1:1`；平台 `douyin`、`wechat_channels`、`bilibili`、`tiktok`、`website`、`sales`、`other`。
- 规格修改不直接修改已批准剧本：生成新的 `DurationPlan` 和草稿剧本，旧版仍可查看；比例变更标记后续镜头构图需复核。
- 视频语言默认中文 `zh-CN`；可预留旁白声音、情绪、语速，不需要真实 TTS。

## 5.4 智能时长适配：不能用凑时长的方式扩展

系统根据当前创意天然内容容量及目标时长给出：

```ts
export type DurationFit =
  | 'SUFFICIENT'           // 内容足够
  | 'CAN_EXPAND'           // 可以扩展为长故事
  | 'NEEDS_NEW_CHAPTERS'   // 需要增加新价值章节
  | 'NOT_RECOMMENDED';     // 缺少支撑长片的内容

export type ExpansionStrategy =
  | 'NATURAL_STORY_EXPANSION'  // 增加有意义的故事节拍
  | 'MULTI_CHAPTER'           // 多章节同主题影片
  | 'KEEP_SHORT';             // 不强行拉长
```

### 5.4.1 30 秒构思 → 用户需要 120 秒（必须有完整演示）

页面展示：

> **AI 时长建议**：当前故事最适合约 30 秒，但目标为 120 秒。直接放慢画面或重复卖点会降低吸引力。请选择：
>
> - **A：扩展为 120 秒完整故事**：增加真实背景、人物动机、冲突、反转、价值深化、产品落地。
> - **B：拆成 120 秒多章节影片**：同一产品从几个互有关联的角度自然展开。
> - **C：保留 30 秒高密度版本**：修改本项目目标时长需再次明确确认；可另外派生 120 秒版本。

选择 A/B 后模拟生成新的故事结构；选择 C 后**不悄悄修改项目 120 秒需求**，必须明确提示并二次确认实际交付时长或另建项目版本。

### 5.4.2 缺少产品信息时

当 `DurationFit=NOT_RECOMMENDED`，显示“缺少可支撑 120 秒的具体内容”。支持：补充素材 → 重新审核 M1 → 重新生成创意，或接受质量风险继续。但后者不能解锁虚构案例、收益、用户评价等非法主张。

## 5.5 故事节拍字段规范

`StoryBeat` 必须包含：

- 唯一 `id`（拖动顺序不改变）；`order`、`title`、`narrativeRole`（HOOK / SETUP / CONFLICT / TURN / REVEAL / VALUE / CTA / OTHER）。
- `durationMs`；显示起止时间由顺序计算，不把易变化的绝对时间写成唯一真相。
- `plot`、`visualIntent`、`characterMotivation`、`conflictOrChange`、`newInformation`。
- `voiceover`、`dialogue`、`onScreenText`、`audioMood`。
- `relatedFeatureIds`、`relatedPainPointIds`、`evidenceRefs`、`claimRisk`、`productPlacement`。
- `emotionalIntensity` 1～5、`transitionToNext`、`reviewStatus`、`editorNotes`。

重点：每个新增节拍都要写清楚**“观众在这一段获得了什么新的信息/情绪/转折”**。无法回答的节拍标记为 `LOW_NARRATIVE_VALUE`，作为质量警告。

## 5.6 120 秒 3D 简历 Seed（必须可真实编辑）

| 序号 | 起止 | 时长 | 叙事角色 | 故事内容 | 新增价值 |
|---|---|---:|---|---|---|
| B01 | 00:00–00:10 | 10s | HOOK | 面试官被一堆相似 PDF 简历包围 | 引发视觉反差 |
| B02 | 00:10–00:30 | 20s | CONFLICT | 求职者不断调整格式仍难展示个人特色 | 建立共鸣 |
| B03 | 00:30–00:50 | 20s | TURN | 为什么简历只能是平面文件？ | 认知刷新 |
| B04 | 00:50–01:15 | 25s | REVEAL | 文件裂开，人物跃入 3D 世界 | 视觉高潮 |
| B05 | 01:15–01:35 | 20s | VALUE | 项目、技能、经历围绕数字形象展开 | 展示新的表达方式 |
| B06 | 01:35–01:50 | 15s | PROOF | 真实网页中呈现可交互作品和个人形象 | 证明产品形式 |
| B07 | 01:50–02:00 | 10s | CTA | 自然展现品牌和网址 | 行动引导 |

上表仅是**故事节拍**，不等于七个视频生成调用；分镜可以拆为 15～25 个 3～12 秒的镜头。用户改动节拍时长，需要把总时长同步显示。

## 5.7 编辑行为规范

- 支持新增、删除、复制、拆分、合并、拖拽重排节拍；输入负时长、零时长、无意义重复时禁用确认并说明原因。
- 文字修改按字段保存草稿；AI 改写先给出 Diff（改哪一段、为什么、哪些旧事实会保留），点击采用后生成新草稿修订。
- 对话示例：用户说“这段太平淡，加点反转”；Mock 必须改写具体目标节拍，修改前后文本可对比。
- 支持局部 Undo/Redo（P1），至少提供版本历史与回退（P0）。
- `脚本生成`、`保存草稿`、`提交审核`、`审核通过` 操作明确区分。
- 审核通过后才允许生成分镜，回退旧已批准脚本应创建新的工作分支并触发下游失效检查。

## 5.8 时间计算与校验（核心）

从**故事节拍总和**得出初步剧本时长：`beatDuration = sum(durationMs)`。在 M2 剧本编辑时为用户显示 `targetDurationMs - beatDuration` 差额；默认允许 `±2000ms` 的创作容差，但在正式视频 M3/M4 输出前应重新校验真实镜头时间线。

在分镜阶段，计算最终净时长时需考虑转场重叠：

```ts
const finalDurationMs = sumShotDurationMs
  - sumOverlapTransitionMs
  + sumStandaloneInsertDurationMs;
```

示例：15 个镜头总长 120000ms，如果有两个 500ms 的交叠转场，净时长为 119000ms。**不能继续显示“严格 120 秒”**。在剧本阶段画布可暂时零转场重叠，后续修改则实时提示。

`durationMs` 是整数毫秒，UI 以 `mm:ss.S` 或 `mm:ss` 展示；不得将 `0.1 + 0.2` 浮点秒计算误差累积到长片时间线。

## 5.9 剧本确认条件

- 所有故事节拍存在合理角色与时长；总体净时长满足交付约束或已经明确接受偏差。
- 开头 3 秒有视觉/叙事钩子；中间至少有冲突/推进；产品植入真实；结尾 CTA 不能与核心目标矛盾。
- 无明确 `unsupported` 声明；带敏感事实、量化收益和客户评价必须有可核验来源。
- 所选创意仍是有效已批准版；修改上游后需重新确认。
- `APPROVED` 版本冻结；用户继续修改需 Fork 新草稿。

---

# 6. P8 图文分镜工作台 `/studio/:id/storyboard`（M2 最核心）

## 6.1 目标与 UI 原则

在不调用视频模型前，让用户能够准确看到：**每个镜头长什么样、讲什么、人物怎么动、镜头怎么走、字幕/音效是什么、产品什么时候出现、哪条证据支持说法、后续用哪种生成模式**。

图片只是未来生成视频的**可追溯参考素材**，不可将不相关的漂亮素材冒充该镜头正式参考；Mock 图片也要和画面描述有基本对应关系，保持统一角色/风格，不能十几个镜头都显示同一占位图。

## 6.2 桌面工作台建议布局

```text
┌ 返回项目 | 3D简历营销片 | 图文分镜 R2 | 120秒 | 审核12/15 | Mock ─────┐
│ S1 ✓  S2 ✓  S3 ✓  S4 ✓  [S5 图文分镜]  S6预演  S7视频  S8成片    │
├─────────────────┬────────────────────────────────┬──────────────────┤
│ 左侧镜头列表     │ 中央参考画面 + 详细脚本           │ 右侧AI创意导演     │
│ [01 6s ✓]       │ ┌────────────────────────────┐ │ - 对话历史         │
│ [02 4s ✓]       │ │ 图文参考图/多版本           │ │ - 修改建议         │
│ [03 10s ✓]      │ └────────────────────────────┘ │ - 变更范围         │
│ [07 8s 待审]    │ 剧情/动作/景别/运镜/台词/字幕     │ - 版本对比         │
│ [12 10s 待审]   │ 音效/音乐/转场/来源证据/费用提示   │ - 审核评论         │
│ [+新增镜头]     │ [保存] [图片重生成] [审核通过]     │ [输入修改要求]     │
├─────────────────┴────────────────────────────────┴──────────────────┤
│ 底部：分镜缩略时间线 + 起止时间 + 画幅安全区 + 时长差额 + 分组操作  │
└──────────────────────────────────────────────────────────────────────┘
```

宽屏三栏；`<=1366px` 右侧 AI 面板抽屉化；平板左侧镜头列表可折叠；移动端仅提供查看/评论/审核，不强制复杂拖拽；建议主要创作体验以桌面优先。

## 6.3 必须拆出的独立 UI 组件

| 组件 | 核心职责 |
|---|---|
| `StoryboardShell` | 统一布局、路由与状态 |
| `ShotNavigator` | 按序镜头缩略图、状态、起止时间、筛选 |
| `ShotPreview` | 当前图片/多张参考图、尺寸适配、安全区 |
| `ShotDetailEditor` | 场景、动作、台词、镜头运动和视觉风格编辑 |
| `ShotReferenceGallery` | 图片候选/参考图版本锁定与来源 |
| `ShotReviewActions` | 草稿、提交审核、确认、退回 |
| `VisualBibleDrawer` | 人物、场景、品牌、音频与画面风格规范 |
| `AIDirectorPanel` | 自然语言修改、计划、Diff、影响范围 |
| `StoryTimeline` | 片段宽度、拖动排序、调整时长、净时长 |
| `EvidencePopover` | 调用 M1 源证据与主张风险 |
| `RevisionHistoryDrawer` | 分镜历史、父子关系、只读旧版、Fork |
| `ReviewIssueList` | 阻塞项、风险建议、点击定位镜头 |

## 6.4 ShotRevision 必备字段（不能只存图片+一句话）

| 字段 | 必需性 | 用途 |
|---|---|---|
| `shotId`、`revisionNo`、`version` | 必须 | 永久 ID、修订号、乐观锁 |
| `scriptRevisionId`、`storyBeatId` | 必须 | 上游追溯 |
| `order`、`durationMs` | 必须 | 镜头顺序和时长 |
| `title`、`narrativePurpose` | 必须 | 叙事目的 |
| `referenceImageVersions[]`、`activeReferenceImageId` | 必须 | 当前图片版本与历史 |
| `sceneDescription` | 必须 | 场景环境 |
| `actionDescription`、`characterIds[]` | 必须 | 动作及出场角色 |
| `cameraPlan` | 必须 | 景别、视角、镜头移动 |
| `visualStyle`、`sceneIds[]` | 必须 | 美术约束 |
| `narration`、`dialogue` | 必须 | 旁白与对话 |
| `subtitles`、`onScreenText` | 必须 | 安全区及屏幕字 |
| `musicCue`、`sfx[]` | 必须 | 音乐、音效 |
| `transitionIn`、`transitionOut` | 必须 | 与前后衔接，含重叠时长 |
| `productPlacement` | 必须 | 产品自然露出方式 |
| `claimEvidenceIds[]`、`riskNotes[]` | 必须 | 营销事实风控 |
| `generationMode` | 必须 | 预留 M3 模型/程序化动效决策 |
| `visualBibleVersionId` | 必须 | 全片角色/风格一致性 |
| `reviewStatus`、`approvedAt/By` | 必须 | 独立镜头审核 |
| `aiPrompt`、`negativePrompt` | 应有 | 供 M3 参考的生成指令快照 |
| `estimatedCredits` | 可选 | 仅 M3 粗估/不能在 M2 扣费 |

分镜引用真实 Logo、截图时需保留 `AssetRef` 与来源；涉及品牌名称或真实网页文本要提示**尽量用合成层叠加，而非要求视频模型精确生成文字**。

## 6.5 分镜操作（P0）

- 新建/复制/删除/拆分/合并镜头。删除镜头前显示关联剧本节拍和时间线变化，提供撤销或通过历史版本恢复。
- 拖拽排序：更新 `order`，保持 `shotId` 不变。前端要禁用拖动时无意义的全页重渲染。
- 修改单镜头 `durationMs`：即时更新镜头结束时间、后续镜头开始时间、全片净时长及 `DurationFit` 提示。
- 修改剧情、动作、运镜、旁白、字幕、角色、场景、产品植入；自动标记受影响字段，保存产生新的版本或 Fork 修改草稿。
- 点击参考图片时，同步定位镜头文本、当前镜头时间线、相应角色/场景规范。
- 参考图可以重生成 Mock 候选：生成新 `ImageAssetVersion`，旧图不覆盖；用户需点击「采用该图」。**M2 的图片操作不收视频生成积分。**
- 用户自然语言提修改：先展示 `ChangePlan`，包含类型、字段差异、影响镜头、时长变化、质量风险、预估未来成本影响；用户明确采用后再生成新修订。
- 用户审核一个镜头时，只审核当前有效修订，不能因为旧 V1 已确认就把最新 V2 自动视为已确认。
- 多选镜头批量确认需在 UI 列出将确认的修订 ID；阻塞的证据风险/时长错误不能被批量确认绕过。
- 版本切换：已批准版本只读，修改需 Fork；历史版本随时可预览和恢复为新草稿。
- 左侧支持状态筛选 `待审核/待修改/已确认/过期`，定位第一个阻塞镜头。

## 6.6 图文分镜参考图片管理

每张图具有 `assetId`、`versionNo`、`sourceType`（`mock_generated` / `uploaded` / `m1_source` / `user_selected`）、`width/height`、`aspectRatio`、`visualBibleVersionId`、`promptSnapshot`、`mockUrl`、`status`。

要求：

1. 同一镜头可有 V1/V2/V3 多个图片候选；默认只将用户**选择并确认**的版本放进预演与 M3 输入。
2. 角色一致性校验依据 Visual Bible，换图后若发型/服装等明显变化，应显示提醒（Mock 使用预置 warning，不宣称真实视觉识别）。
3. 图像不能泄露 M1 演示凭据；外部参考图片无法使用时显示失效占位，不能破坏页面渲染。
4. 图片许可、品牌权属由用户确认，Mock 中所有演示资源应具有可复用授权或自制来源，不复制不明版权的第三方商用图片。
5. 参考图版本改变之后，预演快照可能失效，不应继续显示“已确认”。

## 6.7 全片视觉风格规范 Visual Bible

支持抽屉/侧栏管理：

- **角色设定**：`characterId`、名字、形象描述、服装/发型/色彩、性格、参考图、禁止变化项。
- **场景设定**：`sceneId`、地点、灯光、材质、气氛、关键物体、连续性约束。
- **品牌规范**：Logo AssetRef、主/辅色、字体族（不得打包付费字体）、产品截图、禁用内容。
- **视觉语言**：3D 卡通、实拍、MG、拼贴、动态大字、运镜、粒子、剪辑节奏。
- **声音规范**：语言、旁白角色、情绪、说话速度、背景音乐/音效原则。
- **画面规格**：比例、目标分辨率、字幕安全区、帧率（仅展示 Mock 目标值）。

修改全局设定时列出受影响镜头，例如 `07/08/11`；这些镜头已确认的草稿状态改为 `STALE` 或生成新的待审核修订，**不覆写旧已批准记录**。确认 Visual Bible 的版本 ID 应进入每条镜头的快照。

## 6.8 逐镜头审核和批量确认

确认条件建议：

- 镜头当前修订是草稿/待审核且通过必填字段校验。
- 已选择有效参考图，角色和视觉规范引用一致。
- 时长 > 0；转场重叠时长不超过相邻镜头允许区间；镜头不会创建负时间。
- 引用的上游脚本已确认且未过期。
- 宣传主张无 `unsupported` 且未命中 `prohibitedClaims`；`hypothesis` 只能作为创意假设场景，不能当成确定效果。
- 确认时携带 `expectedVersion`，并将该版本快照冻结。

整组确认条件：全部当前镜头 `APPROVED`、剧本与视觉规范仍有效、时间线误差在允许范围内、没有阻塞级 QC 问题；此时允许创建 StoryboardSnapshot / 进入 S6。

## 6.9 “单镜头修改计划”业务定义

| 用户反馈 | 意图分类 | Mock 修改建议 | 影响范围 |
|---|---|---|---|
| “纸张先破碎，人物再出现” | `MOTION_ACTION` | 调整先后动作及运镜，不换主角 | 本镜头或邻镜头衔接 |
| “不要这么生硬的宣传词” | `SCRIPT_TEXT` | 重写旁白及字幕 | 本镜头 + 预演字幕 |
| “主角变成机器人” | `GLOBAL_CHARACTER` | 更新 Visual Bible 角色、对应分镜 | 多个相关镜头 |
| “声音再温柔一点” | `NARRATION_AUDIO` | 修改音频规范/旁白风格 | 音频相关镜头 |
| “这个镜头加 5 秒” | `TIMELINE` | 增时 + 重新排后续起止时间 | 本镜头及整片节奏 |
| “整体改成竖屏” | `ASPECT_RATIO` | 重新检查所有构图、安全区 | 全局 |
| “删掉第三段” | `STRUCTURE` | 同步改脚本/分镜/预演 | 受影响的故事节拍及镜头 |
| “改为搞笑反转” | `STORY_DIRECTION` | 可能需回到创意/剧本阶段 | 多阶段 |

修改前必须显示「预计需更新 N 个镜头」「是否需要重新审核」「未来 M3 是否可能产生重新生成费用」。Mock 不应声称能精确替换真实生成视频中人物的单个动作；M3 也需按模型实际能力决定可否编辑。

## 6.10 故事节拍与镜头关系

- `ScriptRevision.beats[]` 是故事结构；`ShotRevision.storyBeatId` 是镜头对应关系。
- 允许一个节拍拆多个镜头；镜头跨节拍原则上不建议，确有需要定义 `beatRange` 或归属主节拍。
- 变更故事节拍，相关镜头至少变为 `STALE/待复核`；如果无关镜头不变，应保留其批准状态。
- 拆分镜头时，新镜头 ID 独立，旧镜头保留历史并标记 `SUPERSEDED`；不能用同一个 ID 偷偷代表完全不同镜头。

## 6.11 120 秒 / 15 镜头 Seed 时间线（精确合计 120 秒）

> 为便于 M2 验收，初始 Seed 中没有交叠转场；用户可修改转场重叠并看到净时长变化。

| Shot | 所属 Beat | 起止 | 时长 | 核心画面/叙事 |
|---|---|---|---:|---|
| 01 | B01 | 00:00–00:06 | 6s | 简历山压向桌面 |
| 02 | B01 | 00:06–00:10 | 4s | 面试官被淹没，夸张表情 |
| 03 | B02 | 00:10–00:20 | 10s | 求职者反复修改排版 |
| 04 | B02 | 00:20–00:30 | 10s | 简历在海量 PDF 中消失 |
| 05 | B03 | 00:30–00:40 | 10s | 求职者望向显示屏，产生想法 |
| 06 | B03 | 00:40–00:50 | 10s | 平面文件出现空间裂缝 |
| 07 | B04 | 00:50–00:58 | 8s | 纸张碎裂，3D 人物跃出（用于重生成演示） |
| 08 | B04 | 00:58–01:05 | 7s | 人物进入彩色数字世界 |
| 09 | B04 | 01:05–01:15 | 10s | 3D 网页空间展开 |
| 10 | B05 | 01:15–01:23 | 8s | 项目卡片围绕角色旋转 |
| 11 | B05 | 01:23–01:30 | 7s | 技能标签与数字人互动 |
| 12 | B05 | 01:30–01:35 | 5s | 作品成果进一步呈现，完成价值深化 |
| 13 | B06 | 01:35–01:45 | 10s | 真实产品官网与作品界面出现 |
| 14 | B06 | 01:45–01:50 | 5s | 真实网页交互和产品细节 |
| 15 | B07 | 01:50–02:00 | 10s | 用户分享链接，Logo / URL / CTA 自然收束 |

**本表已计算 `6+4+10+10+10+10+8+7+10+8+7+5+10+5+10=120` 秒。** 15 个镜头与第 5.6 节的七个 Story Beat 起止严格对齐；最终 Fixtures 必须通过 `shot.storyBeatId` 与时间区间一致性校验。

---
# 7. P9 低成本整片预演 `/studio/:id/animatic`

## 7.1 预演目的

预演是「图文分镜 → 真实视频生成」之间的**关键省钱关卡**。用户可以在此以低成本方式观察一条 30/60/120 秒故事的剧情与节奏，然后决定是否进入 M3 的付费镜头生成。不得把预演称为真实模型生成的成片。

明确显示：`低成本预演 · 使用分镜图片和字幕模拟，画质及运动不代表最终效果`。

## 7.2 页面布局

- 左：故事章节/镜头目录，显示时长、审核状态、问题标签。
- 中：根据项目画幅显示 9:16 / 16:9 / 1:1 预演播放器。竖屏时两侧保持空白/控制区，不强行拉伸。
- 下：总时间轴，镜头卡片、播放头、进度刻度、点击跳转和起止时间；未过期的版本状态。
- 右：旁白/字幕同步、问题反馈、风险提示、回到镜头按钮。
- 顶：当前 `StoryboardSnapshotId`、`VisualBibleVersionId`、`duration`、`播放/暂停`、`字幕开关`、`静音`、`全屏`、`预演确认`。

## 7.3 播放功能验收

| 控件 | 预期行为 |
|---|---|
| 播放 | 0s 或当前播放头开始，按镜头顺序自动推进 |
| 暂停 | 冻结时间与当前图像动画，继续播放恢复原时间 |
| 进度条 Seek | 精确定位 `startTime <= t < endTime` 所在镜头 |
| 上/下一镜头 | 跳到镜头起点，不更改审核状态 |
| 镜头循环 | 仅在当前镜头范围播放 |
| 字幕开关 | 展示/隐藏当前台词；样式遵循画幅安全区 |
| 静音 | 静音已有模拟音轨；无真实音轨时明确显示“无配音素材” |
| 调速 | P1，0.75/1.0/1.25 倍，播放状态与时间标签明确区分 |
| 反馈 | 用户输入「镜头 07 太平淡」等，创建带时间戳的评论 |
| 返回编辑 | 打开指定 ShotRevision，修改后旧预演标记过期 |
| 确认预演 | 全部约束达成后冻结 `AnimaticSnapshot`，进入 M3 占位 |

## 7.4 Mock 预演技术实现

建议采用浏览器内 `requestAnimationFrame` + 时间差进度（仅示意代码，项目须做可见性/焦点等异常处理），通过预先计算出的 `TimelineSegment[]` 找到当前镜头，再显示对应图片与字幕。可以用简单 CSS Transform/Opacity 模拟推拉、淡入淡出；不要在 M2 开发真实 Canvas 多轨渲染引擎。

模拟素材来源可按优先级选择：`approvedReferenceImageId` → 已确认的 M1 真实产品截图 → 自制/可授权 Demo 资源 → 明确标注的占位图。

若未接入 TTS，不得假装配音已生成：可以只播放字幕，或使用本地有授权的演示音轨。若音轨长度与脚本不匹配，应显示警告，不自动宣称精准对口型。

### 7.4.1 播放头与镜头映射（示例）

```ts
interface TimelineSegment {
  shotId: string;
  shotRevisionId: string;
  startMs: number;
  endMs: number;       // 左闭右开区间
  durationMs: number;
  overlapWithNextMs: number;
  referenceImageId?: string;
}

function findCurrentShot(segments: TimelineSegment[], timeMs: number) {
  const shot = segments.find(
    (s, index) =>
      timeMs >= s.startMs &&
      (timeMs < s.endMs || (index === segments.length - 1 && timeMs === s.endMs)),
  );
  return shot ?? null;
}
```

如果未来加入重叠转场，两条镜头在某段时间同时存在，此函数只能用于选定**主镜头**；画面合成需要用单独的 `activeSegmentsAtTime` 找到全部生效轨道。M2 可将转场简单化为不叠加的硬切/淡入，保留元数据。

### 7.4.2 时间轴规划算法

```ts
interface TimelineShotInput {
  id: string;
  durationMs: number;
  overlapToNextMs: number;
}

function buildTimeline(shots: TimelineShotInput[]) {
  let cursor = 0;
  const segments: Array<{
    shotId: string;
    startMs: number;
    endMs: number;
  }> = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (shot.durationMs <= 0) throw new Error('INVALID_DURATION');
    const overlap = i < shots.length - 1 ? shot.overlapToNextMs : 0;
    if (overlap < 0 || overlap > shot.durationMs) {
      throw new Error('INVALID_OVERLAP');
    }
    segments.push({
      shotId: shot.id,
      startMs: cursor,
      endMs: cursor + shot.durationMs,
    });
    cursor += shot.durationMs - overlap;
  }
  return { segments, totalDurationMs: cursor };
}
```

演示版本可将 `overlapToNextMs=0` 作为默认值。正式生产需进一步限制“重叠量不能超过下一镜头”等规则，确保每段有效区间可播放。

## 7.5 时间线版本和审核

预演必须引用：`approvedScriptRevisionId`、`storyboardSnapshotId`、`visualBibleVersionId`、每个 `shotRevisionId` 与 `referenceImageId`。确认后生成不可变 `AnimaticSnapshot`，而不是只把项目字段 `animaticApproved=true`。

如果上游脚本、图文分镜、参考图、配音方案或画幅发生变化，则旧预演在页面上显示 `STALE`，不可当成最新已确认预演；旧版仍可进入历史预览。

## 7.6 预演质量提醒

页面至少自动显示：总时长是否在允许范围、是否连续 20 秒无新信息（Mock 依据 Seed 标签）、画面是否与旁白主题冲突（Mock 预置提醒）、品牌/Logo 真实素材缺失、字幕安全区风险、主张引用失效、前 3 秒钩子是否存在。

这些提醒**仅是前端模拟质检结果**，禁止写“AI 已确认视频转化率高”“保证观众看完”等无法验证的话。

---

# 8. AI 导演对话与局部修改的统一体验

## 8.1 M2 范围内“AI 修改”的真实含义

M2 没有真实 AI。模拟 Agent 的回复必须来自规则映射或确定性 Fixture，并且真正改变**草稿结构化数据**；不能仅返回一段鼓励性文字。

支持作用域：`CREATIVE_BRIEF`、`CONCEPT`、`SCRIPT_BEAT`、`SHOT`、`VISUAL_BIBLE`、`ANIMATIC_FEEDBACK`。

## 8.2 统一修改流程

`输入用户反馈 → 确定作用域/意图 → 展示变更计划及影响 → 用户确认采用 → Fork 草稿 → 更新字段 → 触发下游依赖检查 → 保存/等待审核`。

展示 `before / after`，至少做到文本 Diff（P0）；图片更换则有前后图片对比；时长更改必须显示时间线差额。用户放弃计划后不得修改当前草稿。

## 8.3 统一修改分类

```ts
export type ChangeIntent =
  | 'HOOK' | 'VALUE_ANGLE' | 'STORY_DIRECTION'
  | 'SCRIPT_TEXT' | 'STRUCTURE' | 'TIMELINE'
  | 'MOTION_ACTION' | 'CAMERA_MOTION'
  | 'CHARACTER_EXPRESSION' | 'GLOBAL_CHARACTER'
  | 'VISUAL_STYLE' | 'REFERENCE_IMAGE'
  | 'NARRATION_AUDIO' | 'BRAND_PLACEMENT'
  | 'FACTUAL_CLAIM' | 'OTHER';
```

Mock 策略：先匹配测试语句优先级，再进入兜底建议；未知话术不能自动修改全局，应显示「无法确定修改范围，请选择修改当前镜头/当前剧本/整片设定」。

## 8.4 修改影响图示例

用户：“主角改成机器人”，此时 `ChangePlan` 标出：

- 变化字段：Visual Bible `characters[hero]`。
- 依赖：镜头 03、07、08、09、11；其中已批准镜头 07/08 状态需复核。
- 可能影响剧本叙事：需用户确认机器人是否适用于“求职者个人形象”的设定。
- 当前动作：**仅更新草稿和审核标记**，M2 不产生真实视频费用。
- 未来 M3：用户应知道可能需要重新生成相关镜头并另行报价。

## 8.5 AI 对话消息基础结构

```ts
export interface DirectorMessage {
  id: string;
  projectId: string;
  stage: 'ANGLES' | 'SCRIPT' | 'STORYBOARD' | 'ANIMATIC';
  scope: 'BRIEF' | 'CONCEPT' | 'BEAT' | 'SHOT' | 'VISUAL_BIBLE' | 'FEEDBACK';
  targetId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  changePlanId?: string;
  createdAt: string;
  mocked: true;
}
```

所有消息要带具体修改对象，不要一个项目一个混杂、无法定位的“全局聊天记录”。

---

# 9. 版本管理、阶段依赖、失效传播和回退

## 9.1 版本对象必须分层

- `UnderstandingRevision`：M1 的正式理解版本。
- `MarketingAngleSet` / `ApprovedCreativeBrief`：切口候选与已确认方向。
- `CreativeConceptRevision`：完整创意故事版本。
- `DurationPlan` + `ScriptRevision`：时间规划与结构化剧本版本。
- `VisualBibleRevision`：角色、视觉及品牌规范版本。
- `StoryboardRevision`：整个分镜集合的版本/排序/构成快照。
- `ShotRevision`：单镜头的文字、图片引用和时间线内容版本。
- `ImageAssetVersion`：单镜头参考图片历史。
- `AnimaticSnapshot`：预演所用镜头和视觉规则的冻结引用。

**禁止用单个 `project.version` 代替所有对象版本。** 项目更新不会天然意味着每个镜头都修改；镜头修改也不应导致所有其他镜头重新生成。

## 9.2 基础版本操作

| 行为 | 系统动作 | 旧版本 |
|---|---|---|
| 编辑草稿 | PATCH + `expectedVersion` | 同一草稿版本计数递增，保存审计 |
| 编辑已批准版本 | Fork 新 DRAFT `revisionNo+1` | 永久保留不可变 |
| AI 再生成候选 | 创建新的候选集合/修订 | 旧集合仍可看 |
| 用户确认 | 锁定当前版本并更新正式引用 | 历史依然存在 |
| 审核退回 | 标 `NEEDS_CHANGES` + 原因 | 不覆盖批准记录 |
| 回退某历史版本 | 基于旧版 Fork 新草稿并提交审核 | 不直接将旧文件覆盖最新 |
| 删除镜头 | 在新分镜集合中排除，保留历史 | 原镜头仍可追溯 |
| 生成预演 | 按批准引用创建快照 | 不根据“当前草稿”自由拼 |

## 9.3 依赖失效矩阵（必须实现）

| 变更 | 切口 | 创意 | 剧本 | 分镜 | 预演 |
|---|---|---|---|---|---|
| M1 理解事实变化 | 待复核 | 待复核 | 待复核 | 受影响镜头待复核 | 过期 |
| M1 品牌/禁用宣称变化 | 待复核 | 待复核 | 待复核 | 引用该主张的镜头待复核 | 过期 |
| 切口主方向变化 | 保留原批准/新稿 | 待复核 | 待复核 | 待复核 | 过期 |
| 创意故事选定版本变化 | 保留 | 新正式版 | 待复核 | 待复核 | 过期 |
| 剧本某节拍旁白变化 | 保留 | 保留 | 新草稿 | 关联镜头待复核 | 过期 |
| 剧本总时长变化 | 保留 | 保留 | 新草稿 | 时间线整体重算 | 过期 |
| 单镜头动作变化 | 保留 | 保留 | 通常保留 | 当前镜头新草稿/邻镜头检查 | 过期 |
| 单镜头参考图片变化 | 保留 | 保留 | 保留 | 当前镜头需确认 | 过期 |
| 全局角色外观变化 | 保留 | 可能需复核 | 可能需复核 | 关联角色镜头需复核 | 过期 |
| 仅改评论、不改内容 | 保留 | 保留 | 保留 | 保留 | 保留 |

失效不是级联删除！应保留旧版，给出**继续查看旧结果 / 重新审核 / 新建分支**的用户选项。

## 9.4 失效信息 UI 必须可解释

错误示例：“操作失败，状态不对”。

正确示例：“您刚修改了第 07 镜头的角色设定，当前已确认的预演基于旧版本，需重新审核第 07/08/09 镜头后重新生成预演。”

点击“查看影响详情”可定位依赖；点击“继续查看旧预演”必须标识只读历史版本。

## 9.5 避免确认竞态

- 用户打开 Shot R2 后长时间编辑；另一角色确认 R3，则其提交 R2 的 `expectedVersion` 应返回 409。
- Mock 后台对 `approval`、`setActiveRevision`、`fork` 保证一次操作一个版本，且幂等请求不会重复生多个版本。
- 已批准镜头被修改时**不得改变其 `APPROVED` 的旧修订快照**。新工作版本记为 `DRAFT`/`STALE`；页面要显示“正式已确认旧版”与“当前未审核改版”两种身份。
- 批量确认采用原子或明示部分成功语义。推荐 P0：**原子全成/全失败**，失败时列出所有阻塞镜头，避免只确认一半造成数据难以恢复。

---
# 10. TypeScript 数据模型与前后端契约（建议可直接落库）

> **重要**：以下接口是对 M1 既有 `VideoProject`、`UnderstandingRevision`、`VersionedEntity` 等类型的**增量设计**。实施时应从 M1 的 `src/types/creative-video/` 统一导出，避免创建同名而语义不同的第二套类型。服务端未来可按需要拆表或变更数据库模型，但对外 DTO 语义应一致。

## 10.1 类型目录建议

```text
apps/web-ele/src/types/creative-video/
  common.ts               # M1 已存在：ID / ApiResponse / ProjectStage ...
  project.ts              # M1 已存在：VideoProject
  source.ts               # M1 已存在：Source / Asset / Evidence
  understanding.ts        # M1 已存在：UnderstandingRevision
  creative-angle.ts       # M2 新增
  creative-concept.ts     # M2 新增
  script.ts               # M2 新增
  visual-bible.ts         # M2 新增
  storyboard.ts           # M2 新增
  animatic.ts             # M2 新增
  creative-change.ts      # M2 新增
  creative-job.ts         # M2 对 M1 MockJob 的增量扩展
```

## 10.2 传播切口与创意 Brief

```ts
import type { ID, EvidenceLevel, ISODateTime, VersionedEntity } from './common';

export type MarketingAngleCode =
  | 'UNCONVENTIONAL' | 'PAIN_EMPATHY' | 'BEFORE_AFTER'
  | 'IDENTITY' | 'MYSTERY' | 'BENEFIT' | 'ASPIRATION'
  | 'PROOF' | 'LIVE_WOW' | 'HUMOR';

export type ProductionComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScoreBreakdown {
  relevance: number;        // 1..5 模拟判断，不是市场预测
  clarity: number;
  novelty: number;
  visualPotential: number;
  trustworthiness: number;
}

export interface MarketingAngle {
  id: ID;
  title: string;
  primaryCode: MarketingAngleCode;
  secondaryCodes: MarketingAngleCode[];
  expressionTags: string[];
  oneLiner: string;
  oldApproach?: string;
  newApproach?: string;
  targetPersonaIds: ID[];
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  audienceReaction: string;
  whyItMatters: string;
  openingHook: string;
  rationale: string;
  evidenceIds: ID[];
  evidenceLevel: EvidenceLevel;
  assumptions: string[];
  prohibitedClaimsHit: string[];
  score: ScoreBreakdown;
  estimatedProductionComplexity: ProductionComplexity;
  missingAssets: string[];
}

export interface MarketingAngleSet extends VersionedEntity {
  projectId: ID;
  understandingRevisionId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  angles: MarketingAngle[];
  status: 'DRAFT' | 'APPROVED' | 'STALE';
}

export interface ApprovedCreativeBrief extends VersionedEntity {
  projectId: ID;
  understandingRevisionId: ID;
  angleSetId: ID;
  primaryAngleId: ID;
  secondaryAngleIds: ID[];
  excludedAngleCodes: MarketingAngleCode[];
  targetPersonaIds: ID[];
  marketingGoal: string;
  extraInstructions: string;
  prohibitedClaims: string[];
  riskAcknowledgements: string[];
  approvedBy: ID;
  approvedAt: ISODateTime;
  status: 'APPROVED' | 'STALE';
}
```

## 10.3 创意方案

```ts
export interface ConceptStory {
  leadCharacter: string;
  mainSetting: string;
  centralConflict: string;
  storyStructure: string;
  emotionalTone: string;
  openingHookText: string;
  openingVisualHook: string;
  setup: string;
  escalation: string;
  twist: string;
  climax: string;
  productReveal: string;
  callToAction: string;
}

export interface CreativeConceptRevision extends VersionedEntity {
  projectId: ID;
  briefId: ID;
  conceptGroupId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  status: 'DRAFT' | 'WAITING_REVIEW' | 'APPROVED'
    | 'REJECTED' | 'STALE';
  title: string;
  logline: string;
  primaryAngleId: ID;
  secondaryAngleIds: ID[];
  targetPersonaIds: ID[];
  story: ConceptStory;
  visualStyles: string[];
  moodboardAssetIds: ID[];
  recommendedAspectRatio: '9:16' | '16:9' | '1:1';
  musicMood: string;
  suggestedDurationSec: number;
  minimumViableDurationSec: number;
  maximumUsefulDurationSec: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  claimEvidenceIds: ID[];
  riskNotes: string[];
  missingAssets: string[];
  reviewerNotes?: string;
  approvedBy?: ID;
  approvedAt?: ISODateTime;
}

export interface ConceptGroup extends VersionedEntity {
  projectId: ID;
  briefId: ID;
  conceptRevisionIds: ID[];
  generationJobId: ID;
  selectedConceptRevisionId?: ID;
  favoriteConceptRevisionIds: ID[];
  status: 'GENERATING' | 'READY' | 'FAILED' | 'STALE';
}
```

## 10.4 剧本、时长与故事节拍

```ts
export type NarrativeRole =
  | 'HOOK' | 'SETUP' | 'CONFLICT' | 'TURN'
  | 'REVEAL' | 'VALUE' | 'PROOF' | 'CTA' | 'OTHER';

export interface DurationPlan {
  id: ID;
  projectId: ID;
  conceptRevisionId: ID;
  targetDurationMs: number;
  naturalDurationMs: number;
  status: 'SUFFICIENT' | 'CAN_EXPAND'
    | 'NEEDS_NEW_CHAPTERS' | 'NOT_RECOMMENDED';
  selectedStrategy?: 'NATURAL_STORY_EXPANSION'
    | 'MULTI_CHAPTER' | 'KEEP_SHORT';
  recommendedBeatCount: number;
  rationale: string;
  riskNotes: string[];
  acceptedRiskNotes: string[];
  version: number;
}

export interface StoryBeat {
  id: ID;
  order: number;
  title: string;
  narrativeRole: NarrativeRole;
  durationMs: number;
  plot: string;
  visualIntent: string;
  characterMotivation: string;
  conflictOrChange: string;
  newInformation: string;
  voiceover: string;
  dialogue: string;
  onScreenText: string;
  audioMood: string;
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  evidenceIds: ID[];
  riskNotes: string[];
  productPlacement: string;
  emotionalIntensity: number;
  transitionToNext: string;
  reviewStatus: 'pending' | 'approved' | 'needs_changes';
  editorNotes?: string;
}

export interface ScriptRevision extends VersionedEntity {
  projectId: ID;
  conceptRevisionId: ID;
  durationPlanId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  status: 'DRAFT' | 'WAITING_REVIEW' | 'APPROVED'
    | 'REJECTED' | 'STALE';
  title: string;
  synopsis: string;
  targetDurationMs: number;
  beats: StoryBeat[];
  visualPrinciples: string[];
  narrationPrinciples: string[];
  prohibitedClaims: string[];
  riskNotes: string[];
  approvedAt?: ISODateTime;
  approvedBy?: ID;
}
```

## 10.5 视觉规范、分镜与参考图

```ts
export interface CharacterBible {
  id: ID;
  name: string;
  look: string;
  clothing: string;
  personality: string;
  imageAssetIds: ID[];
  mustRemainConsistent: string[];
}

export interface SceneBible {
  id: ID;
  name: string;
  lighting: string;
  mood: string;
  keyObjects: string[];
  referenceAssetIds: ID[];
}

export interface VisualBibleRevision extends VersionedEntity {
  projectId: ID;
  scriptRevisionId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  status: 'DRAFT' | 'APPROVED' | 'STALE';
  characters: CharacterBible[];
  scenes: SceneBible[];
  brandLogoAssetIds: ID[];
  brandColors: string[];
  typographyGuidance: string;
  visualLanguageTags: string[];
  narrationGuidance: string;
  musicAndSfxGuidance: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  subtitleSafeAreaPercent: number;
  targetFps: number;
}

export type ShotGenerationMode =
  | 'ai_video' | 'motion_graphics'
  | 'real_footage' | 'image_animation';

export interface ImageAssetVersion {
  id: ID;
  shotId: ID;
  versionNo: number;
  sourceType: 'mock_generated' | 'uploaded' | 'm1_source' | 'user_selected';
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: string;
  visualBibleVersionId: ID;
  promptSnapshot: string;
  mockUrl: string;
  status: 'READY' | 'FAILED' | 'EXPIRED';
}

export interface ShotRevision extends VersionedEntity {
  projectId: ID;
  shotId: ID;
  scriptRevisionId: ID;
  storyBeatId: ID;
  visualBibleVersionId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  order: number;
  durationMs: number;
  title: string;
  narrativePurpose: NarrativeRole;
  sceneDescription: string;
  characterIds: ID[];
  sceneIds: ID[];
  actionDescription: string;
  cameraPlan: string;
  visualStyle: string;
  narration: string;
  dialogue: string;
  subtitles: string[];
  onScreenText: string[];
  musicCue: string;
  sfx: string[];
  transitionIn: string;
  transitionOut: string;
  transitionOverlapToNextMs: number;
  productPlacement: string;
  evidenceIds: ID[];
  riskNotes: string[];
  referenceImageVersionIds: ID[];
  activeReferenceImageId?: ID;
  generationMode: ShotGenerationMode;
  aiPrompt: string;
  negativePrompt: string;
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW'
    | 'NEEDS_CHANGES' | 'APPROVED' | 'STALE';
  approvedBy?: ID;
  approvedAt?: ISODateTime;
}

export interface StoryboardRevision extends VersionedEntity {
  projectId: ID;
  scriptRevisionId: ID;
  visualBibleVersionId: ID;
  revisionNo: number;
  parentRevisionId?: ID;
  status: 'DRAFT' | 'WAITING_REVIEW' | 'APPROVED' | 'STALE';
  orderedShotRevisionIds: ID[];
  totalDurationMs: number;
  approvedBy?: ID;
  approvedAt?: ISODateTime;
}
```

**关于 `ShotRevision.order`**：为了简化前端，草稿中可以存冗余 `order` 供展示；但**正式顺序**应以 `StoryboardRevision.orderedShotRevisionIds` 为准。拖拽排序时在一个事务/Mock 原子动作内调整，不允许两个字段长期互相矛盾。

## 10.6 预演与修改计划

```ts
export interface AnimaticSnapshot extends VersionedEntity {
  projectId: ID;
  scriptRevisionId: ID;
  storyboardRevisionId: ID;
  visualBibleVersionId: ID;
  orderedShotRevisionIds: ID[];
  selectedReferenceImageVersionIds: ID[];
  totalDurationMs: number;
  status: 'DRAFT' | 'APPROVED' | 'STALE';
  comments: Array<{
    id: ID;
    atMs: number;
    shotId: ID;
    text: string;
    authorId: ID;
    createdAt: ISODateTime;
  }>;
  approvedBy?: ID;
  approvedAt?: ISODateTime;
}

export interface CreativeChangePlan extends VersionedEntity {
  projectId: ID;
  scope: 'BRIEF' | 'CONCEPT' | 'BEAT' | 'SHOT' | 'VISUAL_BIBLE';
  targetId: ID;
  intent: string;
  userMessage: string;
  operations: Array<{
    fieldPath: string;
    operation: 'replace' | 'add' | 'remove';
    before?: unknown;
    after?: unknown;
  }>;
  impactedShotIds: ID[];
  invalidatedStageNames: string[];
  durationDeltaMs: number;
  risks: string[];
  mockReasoningSummary: string; // 简述建议理由，不是模型隐藏思维链
  state: 'PROPOSED' | 'APPLIED' | 'DISCARDED';
}
```

## 10.7 类型实现的工程准则

1. ID 均为 string，不要用数组索引作为业务主键。
2. 时间和金额等计量统一整数：剧本/分镜时长毫秒；M3 费用将用整数积分/最小货币单位。
3. 所有修订可查 `version`、`createdAt`、`updatedAt`、`parentRevisionId`，历史对象只读。
4. 证据引用使用 M1 原有 `EvidenceRef` ID，不要复制一份散落在 M2 的“自定义证据字符串”。
5. 图片通过资产 ID + 版本 ID 引用，不让任意浏览器 Blob URL 成为永久数据。
6. 接口 DTO 和组件局部 ViewModel 分离，UI 的 `selectedTab`、`panelOpen` 不应写入长期业务 DTO。
7. 新增字段需为 M1 既有 Seed 做 schema migration / default mapping。

---

# 11. REST Mock API / Repository 合同（与未来 .NET 8 对接）

## 11.1 协议规则

- 所有路径均以 `/creative-video/v1` 为 Service 层业务前缀，经 RequestClient 变为浏览器 `/api/creative-video/v1`。
- 保留 `ApiResponse<T>` 外壳：`code=OK` 代表成功；HTTP 状态表达语义，异步创建返回 HTTP 202。
- 创建/生成/确认动作使用 `Idempotency-Key`；编辑/审核使用 `expectedVersion` 或 `If-Match`。
- 所有 GET 响应含关联上游正式版本 ID；不得根据一个项目名称猜测关联报告。
- API 内部校验用户权限和项目归属，前端隐藏按钮不足以代替授权。
- 读写接口在 Nitro Mock 也必须具备真实状态变化、任务持续性、冲突、超时和失败场景。
- 正式后端接入时可使用 SignalR 通知进度；M2 使用已有 M1 `JobUpdatesRepository` 轮询抽象。

## 11.2 传播切口与 Creative Brief API

| Method | Path（不含公共前缀） | 核心请求 | 返回 |
|---|---|---|---|
| GET | `/projects/:id/angles` | 可选状态/版本 | 当前候选集合 + 已批准 Brief |
| POST | `/projects/:id/angles/generate` | `{ understandingRevisionId, excludedCodes, scenario? }` | `{ jobId }`，202 |
| GET | `/projects/:id/angles/sets` | — | `MarketingAngleSet[]` |
| GET | `/projects/:id/angles/sets/:setId` | — | 版本详情 |
| PATCH | `/projects/:id/angles/sets/:setId` | `{ expectedVersion, patch }` | 新草稿状态 |
| POST | `/projects/:id/angles/sets/:setId/fork` | `{ expectedVersion }` | 新候选集合草稿 |
| POST | `/projects/:id/creative-briefs` | `{ angleSetId, primaryAngleId, secondaryAngleIds, ... }` | 草稿 `ApprovedCreativeBrief`（实际应返回 BriefDraft） |
| POST | `/projects/:id/creative-briefs/:bid/approve` | `{ expectedVersion, acknowledgedRisks }` | 正式 `ApprovedCreativeBrief` |
| GET | `/projects/:id/creative-briefs/active` | — | 当前正式 Brief |

**简化建议**：创建 Brief 的初始返回结构不应伪造 `approvedBy`、`approvedAt`。正式类型推荐拆 `CreativeBriefDraft` 与 `ApprovedCreativeBrief`；上面 `ApprovedCreativeBrief` 类型仅表达正式态，创建草稿 DTO 为其字段子集。在实际 TS 实现中必须分开定义，避免草稿强制填入虚假的审核元数据。

## 11.3 创意方案 API

| Method | Path | 请求 | 返回 |
|---|---|---|---|
| POST | `/projects/:id/concepts/generate` | `{ briefId, count:3, excludedIds?, scenario? }` | `{ jobId }`，202 |
| GET | `/projects/:id/concepts/groups` | — | `ConceptGroup[]` |
| GET | `/projects/:id/concepts/groups/:gid` | — | Group + 概念详情 |
| GET | `/projects/:id/concepts/revisions/:rid` | — | 单套 `CreativeConceptRevision` |
| POST | `/projects/:id/concepts/revisions/:rid/fork` | `{ expectedVersion }` | 新草稿修订 |
| PATCH | `/projects/:id/concepts/revisions/:rid` | `{ expectedVersion, patch }` | 草稿修订 |
| POST | `/projects/:id/concepts/revisions/:rid/submit-review` | `{ expectedVersion }` | 待审核 |
| POST | `/projects/:id/concepts/revisions/:rid/approve` | `{ expectedVersion, reviewerNote? }` | 确认版本/项目阶段 |
| POST | `/projects/:id/concepts/revisions/:rid/reject` | `{ expectedVersion, reason }` | 退回 |
| POST | `/projects/:id/concepts/groups/:gid/select` | `{ revisionId, expectedVersion }` | 选中候选引用；并不自动审核 |
| POST | `/projects/:id/concepts/groups/:gid/favorite` | `{ revisionId, favorite }` | 收藏状态 |
| GET | `/projects/:id/concepts/active` | — | 当前正式已批准方案 |

> **兼容总需求文档**：总需求最初的 `/projects/:id/angles/:aid/select` 表示简化的“切口选择”。M2 采用 `creative-briefs` 与 `concepts` 拆分，是为了避免“切口已选 = 故事已审”的语义冲突。旧路径如 M1 已实现，应保留 deprecated 适配层并写迁移测试，不要直接删掉。

## 11.4 时长计划与剧本 API

| Method | Path | 请求 | 返回 |
|---|---|---|---|
| POST | `/projects/:id/duration-plans/evaluate` | `{ conceptRevisionId, targetDurationMs }` | `DurationPlan` 或 `{jobId}` |
| PATCH | `/projects/:id/duration-plans/:pid` | `{ expectedVersion, selectedStrategy, acceptedRiskNotes }` | 更新计划 |
| POST | `/projects/:id/scripts/generate` | `{ conceptRevisionId, durationPlanId, scenario? }` | `{ jobId }`，202 |
| GET | `/projects/:id/scripts/revisions` | — | 修订列表 |
| GET | `/projects/:id/scripts/revisions/:rid` | — | 完整剧本 |
| POST | `/projects/:id/scripts/revisions/:rid/fork` | `{ expectedVersion }` | 新草稿修订 |
| PATCH | `/projects/:id/scripts/revisions/:rid` | `{ expectedVersion, patch }` | 更新草稿 |
| POST | `/projects/:id/scripts/revisions/:rid/submit-review` | `{ expectedVersion }` | 待审核 |
| POST | `/projects/:id/scripts/revisions/:rid/approve` | `{ expectedVersion, reviewerNote? }` | 正式版本 |
| POST | `/projects/:id/scripts/revisions/:rid/reject` | `{ expectedVersion, reason }` | 退回 |
| GET | `/projects/:id/scripts/active` | — | 当前已批准剧本 |

> 总需求中 `/projects/:id/scripts/:rid` 为简化路径，M2 细分后在同一个 Service 里保持兼容重定向/别名，不要让前端调用同时存在两个风格且缺乏映射的接口。

## 11.5 分镜、角色规范和图片 API

| Method | Path | 请求 | 返回 |
|---|---|---|---|
| POST | `/projects/:id/visual-bible/generate` | `{ scriptRevisionId }` | `{ jobId }` |
| GET | `/projects/:id/visual-bible/revisions` | — | 所有修订 |
| PATCH | `/projects/:id/visual-bible/revisions/:rid` | `{ expectedVersion, patch }` | 更新草稿 |
| POST | `/projects/:id/visual-bible/revisions/:rid/approve` | `{ expectedVersion }` | 批准规范 |
| POST | `/projects/:id/storyboard/generate` | `{ scriptRevisionId, visualBibleVersionId }` | `{ jobId }`，202 |
| GET | `/projects/:id/storyboard/revisions` | — | 集合版本列表 |
| GET | `/projects/:id/storyboard/revisions/:rid` | — | 集合详情及镜头 ID |
| GET | `/projects/:id/shots` | `storyboardRevisionId,reviewStatus` | `ShotRevision[]` |
| GET | `/shots/:shotId` | — | 当前/正式修订及参考图 |
| GET | `/shots/:shotId/revisions` | — | 镜头历史 |
| POST | `/shots/:shotId/revisions` | `{ baseRevisionId, patch, expectedVersion }` | 新草稿修订 |
| PATCH | `/shots/:shotId/revisions/:rid` | `{ expectedVersion, patch }` | 编辑草稿 |
| POST | `/shots/:shotId/revisions/:rid/approve` | `{ expectedVersion }` | 当前修订确认 |
| POST | `/shots/:shotId/revisions/:rid/reject` | `{ expectedVersion, reason }` | 退回 |
| POST | `/shots/:shotId/reference-images/generate` | `{ revisionId, scenario? }` | `{ jobId }`，202 |
| GET | `/shots/:shotId/reference-images` | — | 图片候选版本 |
| POST | `/shots/:shotId/reference-images/:imageId/select` | `{ expectedVersion }` | 新镜头草稿 / 图片采用结果 |
| POST | `/projects/:id/shots/reorder` | `{ expectedStoryboardVersion, orderedShotIds }` | 新分镜草稿顺序 |
| POST | `/projects/:id/shots/batch-approve` | `{ storyboardRevisionId, items:[{ shotId, revisionId, expectedVersion }] }` | 原子结果 / 阻塞列表 |
| POST | `/projects/:id/storyboard/revisions/:rid/approve` | `{ expectedVersion }` | 批准集合快照 |

其他编辑操作：`POST /projects/:id/shots` 创建镜头；`POST /shots/:sid/duplicate`；`POST /shots/:sid/split`；`POST /projects/:id/shots/merge`；`DELETE /shots/:sid` 均需携带期望版本并受权限控制。实际落地时也可用统一 `storyboard/commands` 事务命令接口，只要前端 Service 对外保持稳定。

## 11.6 AI 导演变更计划与预演 API

| Method | Path | 请求 | 返回 |
|---|---|---|---|
| POST | `/projects/:id/director/change-plans` | `{ scope, targetId, userMessage, scenario? }` | `{ jobId }` |
| GET | `/projects/:id/director/change-plans/:changeId` | — | `CreativeChangePlan` |
| POST | `/projects/:id/director/change-plans/:changeId/apply` | `{ expectedVersion, expectedTargetVersion }` | 更新草稿、失效报告 |
| POST | `/projects/:id/director/change-plans/:changeId/discard` | `{ expectedVersion }` | 丢弃 |
| GET | `/projects/:id/director/messages` | `scope,targetId,page` | 消息列表 |
| POST | `/projects/:id/animatic/build` | `{ storyboardRevisionId, visualBibleVersionId, expectedVersion? }` | `{ jobId }`，202 |
| GET | `/projects/:id/animatic/snapshots` | — | 预演版本列表 |
| GET | `/projects/:id/animatic/snapshots/:aid` | — | 预演快照 |
| POST | `/projects/:id/animatic/snapshots/:aid/comments` | `{ atMs, shotId, text }` | 评论 |
| POST | `/projects/:id/animatic/snapshots/:aid/approve` | `{ expectedVersion }` | 已批准快照及下一阶段权限 |
| POST | `/projects/:id/animatic/snapshots/:aid/reject` | `{ expectedVersion, reason }` | 退回 |

## 11.7 Mock 异步任务 API 复用 M1

`GET /jobs/:jobId`、`POST /jobs/:jobId/cancel`、`GET /projects/:id/jobs` 沿用 M1；仅扩展 `MockJobKind`：

```ts
export type M2MockJobKind =
  | 'DISCOVER_ANGLES' | 'GENERATE_CONCEPTS'
  | 'EVALUATE_DURATION' | 'GENERATE_SCRIPT'
  | 'GENERATE_VISUAL_BIBLE' | 'GENERATE_STORYBOARD'
  | 'GENERATE_REFERENCE_IMAGE' | 'PLAN_CREATIVE_CHANGE'
  | 'BUILD_ANIMATIC';

export type CreativeMockJobKind =
  | import('./existing-m1-job').MockJobKind
  | M2MockJobKind;
```

> 上述 `import('./existing-m1-job')` 是占位的 TypeScript 类型路径，必须改为项目实际 M1 导出位置；开发中优先扩展原 `MockJobKind`，避免维护两个不同任务系统。

状态沿用 `CREATED/QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED`，`resultRefId` 指向对应修订/集合/快照。

## 11.8 常见错误码与前端处理

| HTTP / 业务码 | 含义 | UI 必须做的事 |
|---|---|---|
| 400 `INVALID_INPUT` | 数据格式/校验错误 | 标红字段、保留输入 |
| 401 `UNAUTHENTICATED` | 会话失效 | 复用 M0 登录策略 |
| 403 `FORBIDDEN` | 权限不足 | 说明角色权限，不假装成功 |
| 404 `PROJECT_NOT_FOUND` | 项目不存在或无访问权 | 返回项目中心 |
| 409 `VERSION_CONFLICT` | 乐观锁冲突 | 提示新旧版差异/重新加载 |
| 409 `UPSTREAM_STALE` | 已批准上游版本变化 | 定位最新可用阶段 |
| 409 `STAGE_GUARD_FAILED` | 前置审核未完成 | 显示阻塞项链接 |
| 422 `UNSUPPORTED_CLAIM` | 未证实宣传主张 | 定位风险字段与 M1 证据 |
| 422 `INVALID_DURATION` | 时长校验失败 | 标明差额和相关节拍/镜头 |
| 422 `INCOMPLETE_STORYBOARD` | 镜头缺少批准/参考图 | 列出镜头 ID |
| 429 `MOCK_RATE_LIMIT` | 演示频率限制 | 告知稍后重试，不重复提交 |
| 500 `MOCK_JOB_FAILED` | 模拟执行失败 | 保持旧版并允许重试 |
| 503 `MOCK_SERVICE_UNAVAILABLE` | Mock 服务不可用 | 错误页和重试按钮 |

## 11.9 典型请求/响应样例

```http
POST /api/creative-video/v1/projects/project_resume_3d/concepts/generate
Content-Type: application/json
Idempotency-Key: demo-concept-group-001

{
  "briefId": "brief_resume_001",
  "count": 3,
  "scenario": "NORMAL"
}
```

```json
{
  "code": "OK",
  "message": "已创建模拟创意生成任务",
  "data": { "jobId": "job_concepts_001" },
  "requestId": "req_demo_001",
  "timestamp": "2026-11-09T00:00:00Z"
}
```

```http
PATCH /api/creative-video/v1/projects/project_resume_3d/scripts/revisions/script_resume_r2
Content-Type: application/json

{
  "expectedVersion": 3,
  "patch": {
    "beats": [
      {
        "id": "beat_resume_07",
        "order": 7,
        "title": "产品自然露出",
        "durationMs": 10000,
        "narrativeRole": "CTA",
        "plot": "用户分享3D网页链接，品牌自然露出"
      }
    ]
  }
}
```

> **PATCH 注意**：示例中的 `beats` 是概念性部分数组。如果后端采用**整数组替换**语义，就不能只发送一个 Beat，否则其他六个会被删除。正式契约须采用 `beatPatches:[{ beatId, patch }]` 这样的局部变更操作，或提交完整七个 Beat；M2 实现请选择一种语义并在类型、Mock、测试中保持一致。推荐统一使用命令型局部 Patch。

```json
{
  "code": "VERSION_CONFLICT",
  "message": "剧本已经由其他成员更新，请先处理版本冲突",
  "data": {
    "expectedVersion": 3,
    "currentVersion": 4,
    "latestRevisionId": "script_resume_r2"
  },
  "requestId": "req_demo_002",
  "timestamp": "2026-11-09T00:00:01Z"
}
```

---
# 12. 前端目录结构、模块职责与路由

## 12.1 建议目录（在 M1 基础上增量创建）

```text
apps/web-ele/src/
  api/creative-video/
    creative-angle.ts
    creative-concept.ts
    script.ts
    storyboard.ts
    animatic.ts
    director.ts
    jobs.ts                   # 复用 M1 任务 Service；不重复定义

  types/creative-video/
    creative-angle.ts
    creative-concept.ts
    script.ts
    visual-bible.ts
    storyboard.ts
    animatic.ts
    creative-change.ts

  views/studio/
    angles/
      index.vue
      AngleCandidateCard.vue
      CreativeBriefEditor.vue
      AngleEvidenceDrawer.vue
    concepts/
      index.vue
      CreativeConceptCard.vue
      ConceptComparison.vue
      ConceptEditorDrawer.vue
    script/
      index.vue
      DurationDecision.vue
      StoryBeatEditor.vue
      ScriptVersionDrawer.vue
      ScriptTimeline.vue
    storyboard/
      index.vue
      ShotNavigator.vue
      ShotPreview.vue
      ShotDetailEditor.vue
      ReferenceImageVersions.vue
      VisualBibleDrawer.vue
      ReviewIssueList.vue
      StoryTimeline.vue
    animatic/
      index.vue
      AnimaticPlayer.vue
      AnimaticTimeline.vue
      AnimaticCommentPanel.vue

  components/creative-video/
    StudioStepper.vue
    CreativeReviewBar.vue
    EvidenceTag.vue
    ClaimRiskTag.vue
    VersionSelector.vue
    DirectorChatPanel.vue
    ChangePlanDiff.vue
    StageGuardNotice.vue
    DurationRuler.vue

  stores/creative-video/
    useCreativeAngleStore.ts
    useCreativeConceptStore.ts
    useScriptStore.ts
    useStoryboardStore.ts
    useAnimaticStore.ts
    useDirectorStore.ts

  composables/creative-video/
    useStageGuard.ts
    useVersionConflict.ts
    useDirtyLeaveGuard.ts
    useCreativeJob.ts
    useTimeline.ts
    useAnimaticPlayback.ts

  utils/creative-video/
    timeline.ts
    evidence.ts
    creative-differentiation.ts
    duration-fit.ts
    version-impact.ts

apps/backend-mock/
  ...                      # 以 M0/M1 锁定源码目录为准
  # 追加相应 endpoints、fixtures、jobs、persistence
```

该目录是**建议的 VidCraft 业务扩展**，不是声称 Vben 官方已经具备这些文件。尤其 Nitro Server 的具体文件路径、路由约定与初始化方式，必须以团队 M0 已锁定版本和 M1 实际代码为准。

## 12.2 分层职责

| 层 | 可以做 | 不应该做 |
|---|---|---|
| `views` | 排版、交互、按钮事件、页面状态 | 硬编码三套创意/直接改 Mock 数据库 |
| `components` | 复用展示、局部输入、清晰 emit | 发起不受控的全局 API 副作用 |
| `stores` | 当前项目、已选对象、缓存、保存状态 | 把所有源数据混成一个巨大 store |
| `api`/`repository` | 请求、响应转换、错误语义 | 业务页面内散落多个 `fetch` 封装 |
| `mock` server | 校验身份、状态迁移、幂等、Fixtures | 绕过审核或无条件成功 |
| `utils` | 纯时间线/差异化/证据校验函数 | 读 DOM、访问网络 |

所有持久化业务数据应由 Mock 服务实现一致性，Pinia 只是前端状态缓存。刷新后必须重新向 API 加载当前正式版本，而不是盲信内存里“已批准”的状态。

## 12.3 路由 Meta 建议

```ts
// 仅示意，实际 Meta 字段名称须与 M0/Vben 已有类型对齐
const m2Routes = [
  { path: '/studio/:id/angles', name: 'StudioAngles' },
  { path: '/studio/:id/concepts', name: 'StudioConcepts' },
  { path: '/studio/:id/script', name: 'StudioScript' },
  { path: '/studio/:id/storyboard', name: 'StudioStoryboard' },
  { path: '/studio/:id/animatic', name: 'StudioAnimatic' },
];
```

- 所有页面使用 `StudioLayout`，由一套共享 `StudioStepper` 管理步骤状态。
- `/concepts` 为 S3 子步骤，在上方 Stepper 中不新增“第 9 步”。
- 保证输入不存在的项目 ID、无权项目 ID、已归档项目、上游未批准项目均有正确路由/只读提示。

## 12.4 页面数据加载及缓存建议

进入 Studio 页面：先加载 `Project` 与 `Understanding.active`，再加载当前阶段 Active/History。分镜页面优先加载镜头列表的缩略元信息，当前选中镜头详情按需请求；图片采用懒加载与缩略图；AI 对话按 `scope/targetId` 分页。

任何审核/确认成功后，使关联 Query 缓存失效并重新读取服务端权威状态。中断的 Mock Job 恢复后需要再次 GET，不依赖页面之前的浏览器定时器。

---

# 13. Mock 数据与状态机：确保真实可演示

## 13.1 Mock 种子与目标

必须保留 M0/M1 原有项目、用户、理解报告和素材，M2 通过引用追加数据，不覆盖客户已编辑数据。建议种子分为：

| Seed | 传播逻辑 | 目标时长 | 必备结果 |
|---|---|---:|---|
| 3D 网页简历 | 反常规 + 身份表达 + 视觉奇观 | 120s | 3 个创意、7 节拍、15 镜头、完整预演 |
| AI 知识库 | 收藏过多找不到 → 情绪共鸣/幽默 | 30s | 3 个不同故事，至少 5 镜头 |
| CRM 系统 | 忘记跟进客户 → 业务损失风险/结果对比 | 60s | 包含 M1 演示授权来源证据与风险提示 |
| VidCraft 自身 | 网站上线却不懂营销 → 创意导演能力 | 45s | 反常规/痛点/结果三套可比较方案 |

这些数据是**模拟演示内容**，不能用来证明各类产品在真实市场的效果。

## 13.2 3D 简历固定数据示例

```json
{
  "projectId": "project_resume_3d",
  "upstreamUnderstandingRevisionId": "understanding_revision_003",
  "approvedBrief": {
    "id": "brief_resume_001",
    "primaryAngleId": "angle_resume_unconventional",
    "secondaryAngleIds": ["angle_resume_identity"],
    "riskAcknowledgements": [],
    "status": "APPROVED"
  },
  "conceptGroup": {
    "id": "concept_group_resume_001",
    "selectedConceptRevisionId": "concept_resume_a_r1",
    "conceptRevisionIds": [
      "concept_resume_a_r1",
      "concept_resume_b_r1",
      "concept_resume_c_r1"
    ]
  },
  "script": {
    "id": "script_resume_r1",
    "targetDurationMs": 120000,
    "durationPlanId": "duration_plan_resume_120s",
    "storyBeatCount": 7
  },
  "storyboard": {
    "id": "storyboard_resume_r1",
    "shotCount": 15,
    "targetDurationMs": 120000,
    "currentReviewProgress": "12/15"
  }
}
```

正式 Fixture 必须补齐第 10 章所定义的全部必填字段，不得把上述简写示例直接作为生产结构。

## 13.3 15 镜头时长算法与 Seed 一致性

推荐最终固定如下 15 镜头时长（秒）：

```ts
const resumeShotDurations = [
  6, 4,   // B01 0-10
  10, 10, // B02 10-30
  10, 10, // B03 30-50
  8, 7, 10, // B04 50-75
  8, 7, 5,  // B05 75-95
  10, 5,    // B06 95-110
  10,       // B07 110-120
];

console.assert(resumeShotDurations.reduce((a, b) => a + b, 0) === 120);
```

对应 `startMs` 由 `buildTimeline` 计算，前端页面不得手工将 `00:58` 等时间写死在 UI 字符串里。运行种子校验时必须检测每一镜头 `storyBeatId` 的起止区间合法，并检查所有 `ImageAssetVersion`/`VisualBible`/`Evidence` 真实存在。

## 13.4 Mock 任务状态演进（确定性）

建议用可重放任务状态机：

```text
CREATED (0%)
  ↓
QUEUED (5%)
  ↓
RUNNING (15%: 读取已确认资料)
  ↓
RUNNING (45%: 提取传播方向/生成故事结构)
  ↓
RUNNING (75%: 组织结果与约束核验)
  ↓
SUCCEEDED (100%) / FAILED / CANCELLED
```

任务进度显示的是**Mock 演示进度**，不暗示真实 AI 模型生成速度。可以选择小于几秒的确定性时长方便测试，不要制造数分钟无意义等待。

任务在服务端持久化 `createdAt`、`runAt`、`shouldFinishAt`、`status`、`resultRefId`、`scenario`，每次查询根据时间/状态推进或由测试时钟驱动；**刷新页面后任务不会回到 0%**。

示例场景：

| `scenario` | 结果 |
|---|---|
| `NORMAL` | 稳定成功 |
| `SLOW` | 人为延迟，测试用户离开/返回 |
| `FAIL_BEFORE_RESULT` | 任务失败，不创建新修订 |
| `TIMEOUT_UNKNOWN` | 展示结果未知、允许查询恢复，禁止重复发起 |
| `HOMOGENEOUS_CONCEPTS` | 三套方案高度同质化，允许再生成 |
| `NO_STRONG_ANGLE` | 无明显传播切口，提示补资料 |
| `UNSUPPORTED_CLAIM` | 发现风险宣称，阻止批准 |
| `INSUFFICIENT_DURATION` | 30s 创意要求扩 120s，需选策略 |
| `VERSION_CONFLICT` | 制造 409 冲突供测试 |
| `REFERENCE_IMAGE_FAILED` | 图片 Mock 生成失败，旧图仍可用 |
| `PERMISSION_DENIED` | 模拟 403，审核按钮不可越权 |
| `UPSTREAM_CHANGED` | 上游理解报告被替换，下游变 STALE |

## 13.5 Idempotency（即使 Mock 也不能敷衍）

同一用户、同一 `Idempotency-Key`、同一请求摘要，应返回同一已创建任务/对象；同一 key 对应不同请求体应返回冲突而不是重复成功。建议用 `scope + actorId + key` 构建唯一索引，并保留请求哈希。

`generate` 异步请求应先提交后台状态，再返回 `jobId`；任务成功时**原子**写入修订/集合并标记完成；错误时保留旧版，避免 UI 出现“成功但数据不存在”。

## 13.6 Mock 持久化方案

- 优先沿用 M1 已选的 Nitro Mock 持久化方案（本地 JSON Store 或测试数据库），避免 M2 自建一套与 M1 不同步的 localStorage。
- 本地页面偏好（面板宽度、选中标签）可以存 Pinia/localStorage，但**审核状态、已批准版本、关联快照**只能由 Mock API 权威返回。
- 如多人开发并行使用同一个 Mock 服务器，建议按演示账号或测试会话 namespace 隔离 Seed；否则相互修改会导致演示不稳定。
- 提供 `POST /demo/reset` 的受限入口，重置时同时恢复 M0/M1/M2 引用的统一种子，确保没有悬空关联。
- 测试和演示使用固定种子/固定模拟时钟，避免随机结果导致 E2E 不稳定。

## 13.7 Mock 图片与素材约定

- 建议准备 `public/demo/creative-video/project_resume_3d/shot-01.png` 等本地有授权资源；不同镜头使用不同构图。
- 如资源生成时间不足，可用**风格统一的自制简易示意图**，但必须明确标注“分镜示意图”，并与该镜头动作、旁白对应。
- 图片需要尺寸/比例元数据；无效路径显示兜底，支持断图及慢加载测试。
- M1 上传的本地浏览器临时 Blob 内容刷新后可能失效；保留元数据并提示“需重新上传”，不可冒充已经拥有云端永久素材。
- 不可使用外部未经授权的广告视频、音乐及品牌素材作为你们 SaaS 的商业演示内容。

## 13.8 事实/版权/安全场景

- `prohibitedClaims` 命中时不允许继续审核；`unsupported` 不可被用户简单勾选“我已知晓”就变成事实。
- AI 推测的人物情节可以作为虚构剧情表现，但不应虚构产品实测指标、客户评价、获得的资质。
- Mock 输入内容视为不可信字符串：前端和服务端要转义，避免 XSS；不把用户文本直接作为富 HTML 注入。
- 录屏、截图中真实客户数据应该由 M1 做好脱敏，M2 只引用已批准素材，不能无授权公开展示。

---

# 14. 前端交互视觉、性能与可访问性细则

## 14.1 整体设计

- 全平台使用简体中文、统一组件尺寸、明确主次操作；视频创作工作台强调画面、故事，而不是表格。
- 第一个视觉重点是**创意方案是否让用户眼前一亮**；第二个是图文分镜图片是否和脚本对应；第三个是用户能否立即理解“当前审核到哪一步”。
- 保留 Vben 的亮色/暗色主题，分镜画布可固定中性深灰作为预览背景，不能因为全站切换主题导致图片颜色失真。
- 标签“生成完成”“待审核”“已批准”“过期”“推测”需要对应语义与文本，不仅用颜色区分。

## 14.2 响应式规范（建议）

| 窗口 | 布局策略 |
|---|---|
| ≥ 1600px | 创意/剧本/分镜三栏，右侧 AI 导演固定 |
| 1280–1599px | 三栏压缩或右侧抽屉 |
| 768–1279px | 双栏/抽屉，时间线简化 |
| < 768px | 主要支持查看、审核、反馈；复杂拖拽显示建议用桌面编辑 |

## 14.3 关键可访问性要求

- 图片有描述性 alt；全屏播放器有键盘暂停/播放和进度可读文本。
- 所有可拖拽排序操作提供键盘替代（上移/下移按钮）。
- 证据/风险状态不只靠红绿颜色区分，增加图标和标签。
- 模态确认有焦点管理、Esc 关闭规则，危险变更不得 Esc 隐式确认。
- 低成本预演有关闭快速闪烁/减少动画选项（尽可能遵守 `prefers-reduced-motion`）。
- 语音/音效不存在时允许纯文字预览，不将功能设为不可用。

## 14.4 性能目标（验收建议，不是已测量数据）

- 15～25 个镜头卡片滚动流畅；图片有懒加载和缩略图，避免一次加载全部原图。
- 改单条字幕不导致全部镜头复杂组件重新挂载。
- Mock Job 轮询频率可配置，离开页面取消订阅，重新进入可以根据 jobId 恢复。
- 动态预演可在普通开发办公机播放 120s，无明显时间漂移、暂停后跳帧、反复建计时器泄漏。
- 内存使用观察：反复打开/关闭预演播放器 10 次，不应累积 10 个 RAF 或音频对象。

---

# 15. 详细研发任务拆分与推荐实施顺序

## 15.1 优先级定义

- **P0**：M2 必须交付，否则不能宣称阶段完成。
- **P1**：用户体验与质量增强，资源允许时交付。
- **P2**：后续迭代预留，不阻塞 M2。

## 15.2 任务列表

| ID | 优先级 | 工作包 | 预期交付 |
|---|---|---|---|
| M2-001 | P0 | M1 契约审查/路由守卫 | S3～S6 路由、Mock 基线贯通 |
| M2-002 | P0 | M2 DTO / API Service | 统一类型、API、错误处理 |
| M2-003 | P0 | M2 Mock Store/Seed/任务机 | 四个项目完整增量演示数据 |
| M2-004 | P0 | `/angles` | 主/辅切口、证据、风险、Brief 确认 |
| M2-005 | P0 | `/concepts` | 三套差异化故事、版本/比较/选择/确认 |
| M2-006 | P0 | `/script` 时长决策 | 30→120 的 A/B/C 交互和完整策略 |
| M2-007 | P0 | StoryBeat 编辑器 | 增删、调整、Diff、版本/确认 |
| M2-008 | P0 | `VisualBible` | 角色/品牌/场景规范及依赖提示 |
| M2-009 | P0 | `/storyboard` | 15 镜头图文预览、编辑、排序与审核 |
| M2-010 | P0 | AI 修改计划 | 文本反馈 → 变更计划 → 更新草稿 |
| M2-011 | P0 | 参考图片版本 | 图片选择、模拟再生成、历史回退 |
| M2-012 | P0 | 审核/失效传播 | 上游变更与下游待复核机制 |
| M2-013 | P0 | `/animatic` | 按时间线预演、同步字幕、Seek、反馈 |
| M2-014 | P0 | S6 确认与 M3 交接 | AnimaticSnapshot + M3 占位守卫 |
| M2-015 | P0 | E2E/单测 | 主路径、异常、冲突、时间线验收 |
| M2-016 | P1 | Beat/镜头拖拽细节 | 动画/占位/键盘替代 |
| M2-017 | P1 | 高级创意对比 | 两创意并排 Compare/Diff |
| M2-018 | P1 | 质量启发式可视化 | 视觉节奏/信息密度提示 |
| M2-019 | P1 | 分镜局部撤销/重做 | 草稿操作历史 |
| M2-020 | P2 | 多人实时协作 | CRDT/审阅与评论实时同步 |
| M2-021 | P2 | 真实 TTS 动态预演 | 独立模型和收费能力后续评估 |
| M2-022 | P2 | 专业多轨编辑器 | 复杂转场、关键帧和音轨工具 |

## 15.3 推荐开发批次（按依赖关系，不承诺工期）

**批次 A — 数据契约和最小页面骨架**：锁定 M1 API、创建 DTO、路由守卫、四 Seed、MockJob 扩展、Studio 统一历史/保存状态。

**批次 B — 创意大脑**：`/angles`、`/concepts`、三套差异化数据、证据审核、创意版本与选中。

**批次 C — 剧本与时长**：`/script`、A/B/C 决策、StoryBeat CRUD、120 秒 Seed、版本审批。

**批次 D — 图文分镜**：`/storyboard`、Visual Bible、参考图、单镜头修改与版本、时间线、审核。

**批次 E — 预演与联调**：`/animatic`、版本快照、上游失效、异常场景、端到端自动化与修复。

## 15.4 推荐并行开发方式

- 工程师 A：M2 API/Mock/状态机/种子/任务恢复。
- 工程师 B：创意切口、创意故事卡片及用户审核。
- 工程师 C：剧本、节拍、时长适配和时间计算纯函数。
- 工程师 D：分镜、视觉规范、参考图片和版本编辑。
- 工程师 E 或测试：Animatic、端到端测试、验收脚本（人数不足可由 A/B/C/D 分担）。

并行之前，必须冻结 DTO、MockSeed ID、API 路径、角色权限和 `expectedVersion` 规则。否则多位工程师会各自生成互不相容的分镜结构。

---
# 16. 测试用例与验收矩阵（QA 必须执行）

## 16.1 创意方向与证据测试

| ID | 步骤 | 预期结果 | 优先级 |
|---|---|---|---|
| ANG-001 | M1 产品理解未批准，直接打开 `/angles` | 明确拦截并跳转理解审核页 | P0 |
| ANG-002 | 3D 简历项目开始传播切口发现 | Mock 任务成功并显示主/辅角度 | P0 |
| ANG-003 | 查看“PDF→3D”依据 | 能定位 M1 对应功能证据 | P0 |
| ANG-004 | CRM 项目发现传播切口 | 与 3D 简历不同，不错误使用数字人简历模板 | P0 |
| ANG-005 | 标记 `unsupported` 的宣传主张 | 阻止确认，指出证据风险 | P0 |
| ANG-006 | 用户创建自定义切口 | 保存来源/假设级别，不能自动变 verified | P0 |
| ANG-007 | 选择主切口 + 两个辅切口 | Brief 正确保存并可恢复 | P0 |
| ANG-008 | 主切口超过一个或辅切口超过两个 | 阻止提交并说明规则 | P0 |
| ANG-009 | `NO_STRONG_ANGLE` 情景 | 展示补资料或接受风险继续，保留事实限制 | P0 |
| ANG-010 | 重复点击切口生成 | 幂等返回相同任务，不生成重复版本 | P0 |
| ANG-011 | 刷新页面/换浏览器标签 | 已确认 Brief 与草稿从 Mock API 恢复 | P0 |
| ANG-012 | 模拟上游理解报告变化 | 当前 Brief 变过期，下一步被阻止 | P0 |

## 16.2 创意故事测试

| ID | 步骤 | 预期结果 | 优先级 |
|---|---|---|---|
| CON-001 | 输入已确认 Brief 并生成故事 | 产生三套不同 Story Concept | P0 |
| CON-002 | 比较 A/B/C | 展示 Hook、冲突、反转、产品植入和风险 | P0 |
| CON-003 | 检查 3D 简历三套方案 | 主角/冲突/场景/结构至少两项本质区别 | P0 |
| CON-004 | 修改 A 的开场 Hook | 只改 A 草稿，B/C 不变 | P0 |
| CON-005 | 请求 AI 修改“不要太像广告” | 先出现变更计划，确认后真正修改文案 | P0 |
| CON-006 | 用户放弃修改计划 | 原草稿数据不变 | P0 |
| CON-007 | 再生成三套 | 生成新组，旧组仍可查看 | P0 |
| CON-008 | `HOMOGENEOUS_CONCEPTS` | 提示同质化并提供再生成 | P0 |
| CON-009 | 收藏备用方案 | 历史中可查，刷新仍存在 | P0 |
| CON-010 | 选中但未审核 A，直接打开 Script | 被守卫拦截 | P0 |
| CON-011 | 审核批准 A | Active 方案为 A 的准确修订 ID | P0 |
| CON-012 | 切到已批准 B | 下游剧本标记过期，旧版本仍保留 | P0 |
| CON-013 | Reviewer 无授权批准 | UI 不可操作，Mock API 返回 403 | P0 |
| CON-014 | 两人同时保存同一方案 | 第二个请求 409，未发生覆盖 | P0 |

## 16.3 时长与剧本测试

| ID | 步骤 | 预期结果 | 优先级 |
|---|---|---|---|
| SCR-001 | 3D 简历创意适合 30s，目标 120s | 提示时长不匹配与 A/B/C 选择 | P0 |
| SCR-002 | 选 A 故事扩写 | 产出七节拍，内容有新情节而非重复旁白 | P0 |
| SCR-003 | 选 B 多章节 | 结构与 A 有明显差异 | P0 |
| SCR-004 | 选 C 保留短片 | 提示与原交付目标冲突，要求显式确认变更 | P0 |
| SCR-005 | 3D 简历默认七节拍 | 初始节拍和镜头目标均为 120000ms | P0 |
| SCR-006 | 把某节拍 +5000ms | 差额显示 +5s，原始镜头尚未自动批准 | P0 |
| SCR-007 | 删除必要节拍/时长清零 | 阻止审核，显示阻塞原因 | P0 |
| SCR-008 | 只修改一个 Beat 台词 | 其他 Beat 不丢失；PATCH 语义正确 | P0 |
| SCR-009 | AI 改写冲突情节 | 先展示 Diff，采用后保存新修订 | P0 |
| SCR-010 | 审核批准 R1 后修改 | 自动 Fork R2 草稿，R1 只读可回看 | P0 |
| SCR-011 | 未确认剧本直接打开分镜页 | 守卫阻止，返回 Script | P0 |
| SCR-012 | `NOT_RECOMMENDED` 但用户坚持 120s | 明确风险，不能虚构成果 | P0 |
| SCR-013 | 模拟版本冲突 | 409 处理不会丢未保存内容 | P0 |
| SCR-014 | 用户输入禁用宣称 | 出现阻塞风险，不能批准 | P0 |

## 16.4 图文分镜与版本测试

| ID | 步骤 | 预期结果 | 优先级 |
|---|---|---|---|
| STO-001 | 已批准 120s 剧本生成分镜 | 15 张不同镜头，图片/剧本一一对应 | P0 |
| STO-002 | 点击镜头 07 | 预览图、文本、时间轴、角色同步选中 | P0 |
| STO-003 | 修改镜头 07 动作描述 | 只产生镜头 07 草稿修订；其他不被无故覆盖 | P0 |
| STO-004 | AI 反馈“纸张先炸裂再出人物” | 显示修改计划、Diff、影响范围，采用才生效 | P0 |
| STO-005 | 反馈“主角换机器人” | Visual Bible + 关联镜头待复核 | P0 |
| STO-006 | 镜头 07 参考图生成 V2 | V1 保留，可选择 V2，未自动覆盖旧批准图片 | P0 |
| STO-007 | 图片生成失败 | 旧图可用，任务显示失败 | P0 |
| STO-008 | 用户删除镜头 | 显示影响范围，新集合/时间线更新，可回退历史 | P0 |
| STO-009 | 重新排序 07/08 | 永久 ID 不变化，起止时间重算 | P0 |
| STO-010 | 调整镜头 03 时长 | 后续时间重算，显示净时长变化 | P0 |
| STO-011 | 增加 500ms 重叠转场 | 120000ms 变为 119500ms，不错误显示 120s | P0 |
| STO-012 | 视觉规范修改主角色服装 | 指出引用该角色的镜头并要求复核 | P0 |
| STO-013 | 逐镜头审核 15/15 | 全部有效才允许确认整组分镜 | P0 |
| STO-014 | 14/15 已批准，直接进入预演 | 被拦截并定位缺失镜头 | P0 |
| STO-015 | 已批准镜头修改 | 新版本待审核，旧批准版本仍可查看 | P0 |
| STO-016 | Mock API 返回 409 | 页面显示差异，保留本地编辑，不能覆盖新数据 | P0 |
| STO-017 | `unsupported` 主张出现在字幕 | 拒绝批准并定位相关主张 | P0 |
| STO-018 | 图片地址失效 | 显示图像占位和重选入口，不导致页面崩溃 | P0 |
| STO-019 | `ShotRevision` 链接到错误 `StoryBeat` | Seed 校验/接口返回异常，禁止批准 | P0 |
| STO-020 | 分镜刷新 | 审核状态/版本/已选图片正确恢复 | P0 |

## 16.5 预演、任务与体验测试

| ID | 步骤 | 预期结果 | 优先级 |
|---|---|---|---|
| ANI-001 | 15/15 已批准，生成预演 | 生成引用当前快照的 Animatic | P0 |
| ANI-002 | 点击播放 | 按起止时间显示对应镜头图/字幕 | P0 |
| ANI-003 | 暂停/继续 | 播放头保持/恢复，无重复 RAF | P0 |
| ANI-004 | Seek 1:05 | 正确命中 Shot 09 对应画面 | P0 |
| ANI-005 | 跳到最后 2 秒 | 正确显示 CTA 镜头，播放结束停止 | P0 |
| ANI-006 | 关闭字幕 | 不影响播放计时，刷新偏好可按设计恢复 | P0 |
| ANI-007 | 无音频素材 | 告知无音频，不显示虚假的 TTS 成功 | P0 |
| ANI-008 | 反馈“镜头 07 太快” | 评论关联时间和 Shot ID，可返回编辑 | P0 |
| ANI-009 | 已确认预演后修改镜头图 | 预演变 `STALE`，旧版只读，M3 不可继续 | P0 |
| ANI-010 | 批准有效预演 | 保存 AnimaticSnapshot，解锁 `/generate` 占位 | P0 |
| ANI-011 | 播放器反复开关 10 次 | 无定时器/音频资源泄漏 | P1 |
| JOB-001 | Mock 任务进行中刷新 | 进度可恢复，不重置或重复创建 | P0 |
| JOB-002 | 生成失败后重试 | 旧版本保留，新任务唯一 | P0 |
| JOB-003 | 相同幂等键连点 | 不出现重复修订 | P0 |
| UI-001 | 1366px/1920px/平板 | 版面可用，抽屉/时间线无覆盖 | P0 |
| UI-002 | `owner/editor/reviewer` 切换 | 权限操作与 Mock API 校验一致 | P0 |
| UI-003 | 减少动画设置 | 预演不出现不可控快速闪烁 | P1 |
| UI-004 | 输入含 HTML/脚本字符串 | 文案按文本渲染，无 XSS | P0 |

## 16.6 建议单元测试（Vitest 或项目现有方案）

- `buildTimeline`：零重叠、正常重叠、负时长、超额重叠、空列表、精度。
- `validateStoryboard`：缺图、未确认、证据 unsupported、剧本过期、时长差值。
- `isStageAccessible`：多阶段门禁，最新有效批准版本判断。
- `computeChangeImpact`：局部镜头修改 vs 全局角色变更影响的镜头 ID。
- `ensureConceptDiversity`：三方案雷同、两维度差异、明显不同。
- `durationPlan`：30→120 自然扩展/多章节/保留短版的状态条件。
- `approveRevision`：版本冲突、旧版不可变、重复幂等批准。
- `mockJobPersistence`：重载后同一任务状态连续、结果关联正确。

## 16.7 端到端演示脚本（负责人逐步签收）

**演示 A：3D 简历 120 秒营销片**

1. 用 M0 owner 登录，打开 M1 的已确认 3D 简历项目。
2. 点击「进入创意策划」，查看三个传播方向的推荐理由与来源。
3. 选择“PDF → 3D 网页”的主切口，辅切口选“身份表达”。
4. 生成三套不同故事，比较后选择 A；修改开场对白，再审核确认。
5. 进入剧本页；系统提醒 30 秒创意不宜直接拉成 120 秒；选择“完整故事扩写”。
6. 浏览 7 个节拍，编辑第二节拍、保存 R2、审核通过。
7. 生成 15 镜头分镜，逐个查看参考图/动作/旁白/镜头语言；将镜头 07 改成“先碎纸再出人物”。
8. 展示修改计划与前后对比，采用后确认镜头 07 新版；查看旧版仍在。
9. 全部 15 镜头审核通过，净时长 120 秒，进入预演。
10. 播放第 01→15 镜头；跳到 `01:05` 与 `01:55` 查看正确画面；提交一次时间戳评论。
11. 确认 AnimaticSnapshot，进入 M3“镜头视频生成”占位；无需调用任何收费模型。

**演示 B：CRM 与真实痛点**

1. 选择 CRM Seed，查看 M1 已确认的模拟授权来源。
2. 切口强调“业务跟进场景”，不是照搬 3D 简历“纸张爆炸”。
3. 三套创意分别围绕“遗忘客户跟进”、“销售团队协作困境”、“客户信息可视化反差”。
4. 呈现证据等级；“保证收入增长 50%”一类 unsupported 主张被系统阻止。

**演示 C：修改上游带来的失效**

1. 先批准 3D 简历整套预演，再返回 M1 修改重要产品功能事实。
2. 系统明确提示下游切口/剧本/镜头/预演将需要复核。
3. 返回 M2，展示旧预演仍可只读查看，但无法用旧版直接进入 M3。
4. 重新选择/审核有效的创意和镜头后，生成新预演并确认。

**演示 D：异常与权限**

1. 模拟创意生成失败，用户看到原因和重试，旧结果不消失。
2. 模拟两次相同 Idempotency-Key，只有一个 job。
3. 模拟 409 版本冲突，用户能检查最新版本而不丢本地编辑。
4. 切换 reviewer/viewer 模拟角色，编辑/审核权限符合 M1 的授权规则。

---

# 17. M2 Definition of Done（验收签收条件）

只有以下全部满足，才能宣布 M2 开发完成。

- [ ] 已完成 `/angles`、`/concepts`、`/script`、`/storyboard`、`/animatic` 页面，与 M1 路由无冲突。
- [ ] 兼容已完成的 M0/M1 技术基线、Auth、Mock、Seed、API Service、项目阶段及审核事实引用。
- [ ] M1 未确认时严禁进入有效创意生产，M2 内部各阶段也具备守卫。
- [ ] 创意切口有依据，能区分产品价值与叙事表现方法；十类切口以配置驱动而非硬编码十套固定模板。
- [ ] 四个产品 Seed 体现不同创意逻辑，3 套方案在内容上明显不同。
- [ ] 创意故事有图片/情绪板、开场钩子、冲突、反转、产品植入、CTA 与风险提示。
- [ ] 可以选择、编辑、反馈、重新生成、审核创意方案；历史可追溯。
- [ ] 30→120 秒冲突有 A/B/C 三种用户处理路径；不静默拉长或更改时长。
- [ ] 完整结构化剧本支持故事节拍编辑、版本、时长校验、审核。
- [ ] 图文分镜包含图片、场景、动作、运镜、台词、字幕、音效、过渡、产品关联、来源、视频生成模式。
- [ ] 独立管理 Visual Bible、镜头修订、图片版本；用户能修改单镜头并回退，已批准旧版本永不覆盖。
- [ ] 修改全局角色/时长/事实时，合理标记关联镜头及下游预演过期。
- [ ] 15 个镜头与 7 个故事节拍一致，实际净时长 120000ms（默认无交叠），运行自动校验通过。
- [ ] 15/15 镜头确认和分镜集合批准后才允许预演确认。
- [ ] Animatic 能播放/暂停/Seek/跳镜头/字幕开关/提交反馈、确认快照；无真实音频时明确告知。
- [ ] API 异步任务有稳定进度、失败、重试、幂等、刷新恢复、冲突处理。
- [ ] M2 所有 UI 均保持 Mock 明示，无真实模型、视频、计费、网站登录或 FFmpeg 调用。
- [ ] Owner/Editor/Reviewer/Viewer 权限符合 M1，并在 Mock API 二次验证。
- [ ] 类型检查、构建、关键单元测试、P0 E2E 均通过；提交可复现操作说明与测试结果。

## 17.1 交付物清单

1. M2 前端页面、共享组件、Store、Composables、API Service 的完整代码。
2. M2 类型文件与接口契约，所有新增路径有 README / OpenAPI 草稿或接口表。
3. Nitro Mock API、Fixtures、版本/任务状态机、幂等和重置机制。
4. 四 Seed 的图片/剧本/分镜数据，演示图片使用授权明确的资源。
5. 单元测试、E2E 测试、手动测试报告（含正常/异常/冲突/权限场景）。
6. 页面主要状态截图或录屏、清晰的演示操作步骤。
7. M2→M3 交接契约与已知缺陷/待决策清单。

## 17.2 推荐代码验收命令

```powershell
# 在项目根目录，实际脚本名称以已完成 M0 的 package.json 为准
pnpm install --frozen-lockfile

# 启动 Element Plus 应用（根据 M0 已确认脚本执行）
pnpm dev:ele

# 类型检查/构建（项目脚本可能已命名不同）
pnpm --filter @vben/web-ele typecheck
pnpm --filter @vben/web-ele build

# 运行项目已安装的测试脚本，如：
pnpm test
```

上述脚本均需要与实际仓库 `package.json` 核对；**不要因为文档举例就新增一个没有意义的空脚本假装 CI 通过**。所有 P0 测试必须有运行记录。

---

# 18. M2 → M3 精确交接契约

M3 的单镜头视频生成、重生成、版本和积分管理必须依赖 M2 的**已批准素材快照**，不能拿未经确认的最新草稿自动发起收费任务。

建议至少交付：

```json
{
  "projectId": "project_resume_3d",
  "understandingRevisionId": "understanding_revision_003",
  "approvedCreativeBriefId": "brief_resume_001",
  "approvedConceptRevisionId": "concept_resume_a_r2",
  "approvedScriptRevisionId": "script_resume_r2",
  "approvedStoryboardRevisionId": "storyboard_resume_r2",
  "approvedVisualBibleVersionId": "visual_bible_resume_r1",
  "approvedAnimaticSnapshotId": "animatic_resume_001",
  "targetDurationMs": 120000,
  "aspectRatio": "9:16",
  "platform": "douyin",
  "language": "zh-CN",
  "orderedApprovedShotRevisionIds": [
    "shot_01_r1", "shot_02_r1", "shot_03_r1",
    "shot_04_r1", "shot_05_r1", "shot_06_r1",
    "shot_07_r2", "shot_08_r1", "shot_09_r1",
    "shot_10_r1", "shot_11_r1", "shot_12_r1",
    "shot_13_r1", "shot_14_r1", "shot_15_r1"
  ],
  "timelineVersion": 2,
  "mockOnly": true
}
```

M3 取 `shotRevisionId` 后，应该能读取：当前已选参考图版本、脚本/字幕、镜头运动、人物和场景 Bible、素材引用、真实产品 Logo/截图、`generationMode`、时长、来源证据及禁止主张。

与之前约定的 M3 规则保持一致：

- 用户对单镜头生成费用先确认报价，再冻结模拟积分，成功交付候选后结算；M2 不做这些账务动作。
- M3 每次新视频生成产生 `ShotVideoVersion` 候选；不自动覆盖旧已批准视频。
- 分镜版本变化使对应镜头候选的可用性需要重新评估，已经生成的历史视频仍保留。
- M4 根据已经用户确认的全部视频候选和时间线执行合成，允许只重新生成一个镜头，而不是整个 120 秒视频。
- 低成本预演永不应被当作最终模型视频，也不能把 AnimaticSnapshot ID 直接当成视频 MP4 文件 ID。

---

# 19. 研发决策记录与待确认事项

| 事项 | 已确定的策略 | 后续允许调整的点 |
|---|---|---|
| 前端基线 | Vben 5.x Element Plus，沿用 M0 | 必须经专项技术评审才升级 |
| 数据来源 | M1 已批准理解报告 | 后端正式 AI 实现可以换模型，不改变事实约束 |
| 创意比较 | 至少 3 套有实质差异方案 | 未来可由用户选择 2/4/更多 |
| 创意审核 | 用户分阶段确认 | 未来可增加预算托管模式 |
| 时长策略 | 先评估并确认，再完整写剧本 | 未来可扩更多时长模板 |
| 图文分镜 | 每镜头有图+详细脚本 | 未来可加多视角和 3D 场景 |
| 图片版本 | 新版候选不覆盖已批准旧版 | M3 可以接真实图像生成服务 |
| 长视频 | 分故事节拍/镜头，不受单模型时长限制 | 将来按模型能力选择调用 |
| 成本控制 | M2 不收费视频，M3 才发生视频积分事务 | 图片生图额度未来可单列 |
| 预演 | 浏览器图片/字幕粗剪 | 将来可加 TTS/粗剪渲染服务 |
| 合成 | M4 FFmpeg / Remotion | 不属于本阶段 |
| 审美质量 | 以人工评审和结构化质量规则为基准 | 真实投放数据后续闭环 |

**待团队评审但不阻塞 M2 的问题**：是否允许高阶自定义画幅/时长、用户上传的品牌字体使用许可、故事衍生多平台版本的计费、图片生成未来是否收费、真实多角色协作审核机制、Agent 是否在用户许可后访问公开评价/竞品信息、将来哪些模型支持视频精确编辑等。

---

# 20. 给前端负责人可以直接复制的开工任务书

> **任务名：VidCraft M2 — AI 创意导演与图文分镜 Mock 工作流**
>
> 在已完成 M0、M1 的 `VidCraft` Vue Vben Admin 5.x + Element Plus 工程上，实施 M2 五个页面：`/angles`、`/concepts`、`/script`、`/storyboard`、`/animatic`。严格复用 M1 的项目/产品理解版本、API 规范、Mock Server、权限模型和素材证据。
>
> 首先实现传播切口发现与 3 套不同创意方案的选择/审核；然后实现创意时长智能评估、30→120 秒扩展决策、结构化七节拍剧本、版本修改；最后实现 15 镜头图文分镜、参考图及全局角色规范、局部 AI 修改计划、逐镜头审核、120 秒浏览器预演与快照确认。
>
> 所有操作必须是可交互、有状态、有版本、可回退、可刷新恢复的 Mock 实现。模拟 Agent 产生的内容应根据产品变化，不得四个项目使用同样剧本；所有影响真实宣传的主张必须显示证据或假设状态；不能使用真实付费 AI/视频/TTS、真实登录演示环境、真实积分结算或 FFmpeg。
>
> **完成标准**：负责人可以从 M1 已批准 3D 简历项目出发，一次操作走到 M2 已批准 120 秒、15 镜头、图文对应的预演，并进入 M3 占位；能现场演示镜头 07 修改、参考图版本回退、失效传播、AI 任务失败重试和版本冲突。所有 P0 测试通过。

---

# 附录 A. 关于产品“独特传播切口”的研发提醒

创意策划不是把 UI 做成 10 个分类单选框。应围绕以下三个问题判断：

1. **真实价值**：目标用户为什么会在意产品？它替代了旧方式、解决痛点、创造新的体验、帮助表达身份，还是用真实成果证明了效果？
2. **注意力机制**：用什么画面/语言把真实价值表现得吸引人？悬念、反转、视觉奇观、共鸣、幽默是表现方式，不是需要虚构的产品功能。
3. **可验证性**：观众看到的是否与实际产品相符？创意允许虚构人物和情节，但不允许捏造产品能力、实际客户数据、认证或用户结果。

### 最佳示例：3D 简历

- 旧方式：PDF/Word 简历。
- 非寻常新表达：可以分享有 3D 形象和交互呈现的网页简历。
- 观众反应：原来简历还可以这样讲？
- 创意钩子：纸张/文件变成立体个人空间。
- 产品真实价值：新的个人展示方式；不承诺招聘效果。
- 视觉语言：夸张 3D 角色、动态文字、特写、纸张变形、视觉反差、自然品牌露出。

### 第二示例：CRM

- 用户场景：多个客户待跟进、信息散落、销售人员忙碌。
- 痛点假设：忙碌可能导致跟进遗漏（需用户或公开证据验证）。
- 传播切口：把“差点错过一位客户”的紧张场景讲成带反转的短剧。
- 产品价值：客户跟进提醒和进度可视化（仅当系统确实具备时）。
- 风险：不得宣称使用后“丢单率下降 60%”等无证据效果。

### 第三示例：AI 知识库

- 旧方式：大量收藏导致信息碎片化。
- 痛点/情绪：需要某个知识点时找不到，产生“收藏但没有真正利用”的挫败感。
- 表达方式：知识卡片变成巨山、最后通过搜索/整理功能归位。
- 真实价值：有序归档与检索（以功能证据为准）。
- 风险：AI 不得说“自动理解所有平台私密内容”除非功能证据支持。

---

# 附录 B. 文档维护与变更控制

1. 任何影响 `ProjectStage`、核心路由、证据枚举、Approved 版本、任务幂等、时间线算法的变化必须经过前端负责人评审。
2. 调整 M2 API 时，维护变更说明、旧路径兼容映射与 M1→M2 集成测试。
3. 生成真实视频或支付接入之前，应进行独立的供应商能力、数据安全、版权授权和成本评估。
4. 数据模型示例应以实际代码、OpenAPI 和测试为最终落地标准；文档为研发规格，不应假设示意代码已经在当前代码库运行通过。
5. 完成 M2 后，将真实页面、接口、Fixture、可用/不可用功能和已知限制回填本说明书，形成 V1.1 实施记录。

**文档结束｜VC-FE-M2-001｜下一阶段 M3：单镜头视频生成、AI 重生成、版本审核、生成任务及模拟积分计费。**
