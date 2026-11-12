# VidCraft — M1.1 + M2.1 最终统一兼容实施规范（Mock 版 · V3.0 · 前端交付基准）

> **文档编号**：VC-FE-COMPAT-002  
> **版本**：V3.0 / 2026-11-09（以原 M1、M2 为正式基线，合并 V2.1 与 8 项阻塞问题、8 项建议级修正）  
> **交付对象**：VidCraft 前端负责人、Vue/TypeScript 工程师、Mock 服务工程师、QA、未来 .NET 8 / Python Agent 接口负责人  
> **现有基线**：M0 工程完成；M1、M2 已开发完成（依据项目方反馈，**未取得现有仓库源码，未运行现有 E2E**）。  
> **目的**：形成前端团队可按依赖顺序实施、逐项验收的唯一增量规范：不重构 M1/M2，不重复对象或 API；统一素材/证据/声明版本链；修复访谈、创意审批、组合、排序、草稿/正式态、生成规格的操作漏洞；可选提供轻量探索与总览。
> **V3.0 执行边界**：P0 必须完成合同与核心业务增强；创意探索和分镜总览属于 **P1 可选增强**，不阻塞 M3。本文取代 V2.0、V2.1 及单独的补丁报告在增量范围内的执行地位；原 M1/M2 的已实现合同保留。  
> **实施范围**：仅前端 + Nitro Mock + 类型/测试；不进行真实网址抓取、真实演示登录、真实付费 LLM/图像视频生成、真实钱包扣费和 FFmpeg 生产渲染。

## 目录

1. 执行方式、版本优先级和不可承诺事项
2. 冻结的 M0/M1/M2 原合同
3. 冲突项逐条裁决（以此替换旧增量文档的冲突描述）
4. 统一数据模型：基础类型、研究访谈、证据冲突、资产内容版本、分镜引用
5. 单一 API 目录与数据所有权
6. 业务事务和状态机：从 M1 资料到 M2 预演
7. M1.1 前端页面增量规格
8. M2.1 前端页面增量规格
9. M3 交接契约（本期仅准备，不扣款）
10. 旧数据兼容、Mock 种子与迁移机制
11. 错误码、边界、安全和性能
12. 验收测试（含禁止回归场景）
13. 分批开发、提交规范和签收标准
14. 设计决策记录、限制及溯源矩阵
15. 可视化创意探索：按现有合同实现的流程与操作规范
16. 上线前不可妥协的不变量、阻塞条件与差异登记

---

# 1. 文档的使用方式与优先级

## 1.1 一句话决定

**原 M1/M2 已交付的功能、路由、核心 DTO 和业务规则是冻结基线。本文件是 M1.1/M2.1 唯一执行规范，只发布增量扩展和显式兼容修正；不是替换 M1/M2，也不意味着已通过源码审计。**

如遇文本矛盾，执行优先级为：

1. 已运行的合法安全约束、用户权益与内容授权边界（不可因旧设计而弱化）。
2. 本文件**明确标注的合同裁决和禁止事项**（解决 M1.1/M2.1 的规范歧义）。
3. 已完成的 M1、M2 正式需求与审批/版本/阶段守卫；其余行为优先沿用，不被增量建议隐式覆盖。
4. M0 框架、RequestClient、权限与工程约定。
5. 原 M1.1、原 M2.1 V1.0、融合 V2.0/V2.1 及独立补丁清单只作为**追溯材料**，不能与本 V3.0 并列作为开发任务书。涉及相同接口、类型、审核门禁时以本 V3.0 为唯一增量口径。
6. 源码若与文档不一致，先记录 `AS_BUILT_DELTA`，**暂停受影响修改**；经负责人批准兼容方案后实施；不得静默修改现有数据库、Mock Seed 或序列化形状。

> 不得将本文档当作“已核实项目源码完全兼容”的证明。没有仓库源码，就无法核验组件真实路径、API handler 名、实际权限策略和 Seed 版本。本文件给出的是**跨文档一致的规范目标 + 不能破坏原有功能的实施步骤 + 必须执行的验证门槛**。未经代码审查不得宣称零冲突。

## 1.2 必须先做的现状核对（不准省略）

前端负责人开工前填写 `as-built-contract.md`，逐项记录**真实代码**，以下 AB-01～AB-16 均须签字：

| 检查编号 | 必须定位现有源码 | 需要记录 | 不一致怎么办 |
|---|---|---|---|
| AB-01 | `ProjectStage` / `ProjectStatus` | 唯一导出文件、枚举值 | 以 M1 稳定公共枚举为准做 adapter；不改现有路由 |
| AB-02 | `SourceKind`, `EvidenceLevel`, `CoverageState` | 原有值、Seed 数据 | 仅新增可选类型；禁止重命名旧值 |
| AB-03 | `AssetRef`, `ImageAssetVersion` | `version`、`id`、图片引用 | 内容版本另建；不改旧批准快照 |
| AB-04 | `IngestionSnapshot` / `UnderstandingRevision` | 创建及确认接口、版本锁 | 继续复用 M1 handler；增加兼容扩展 |
| AB-05 | `VisualBibleRevision` / `ShotRevision` | 角色场景引用、镜头生成方式 | 复用 M2 的四类枚举 |
| AB-06 | `CreativeChangePlan` / `AnimaticSnapshot` | 已批准引用和失效机制 | 增强派生 UI；不设第二套更改计划 |
| AB-07 | Nitro Mock handlers、RequestClient | API 前缀、返回包装、错误码 | 不自行创建第二个 HTTP client |
| AB-08 | owner / editor / reviewer | 实际权限控制位置 | 只添加细粒度操作；不能扩大角色默认权限 |
| AB-09 | M0 四组固定 Seed | ID、reset 规则、老版本数据 | Migration 不允许替换原主键 |
| AB-10 | M2 15 镜头预演 | 时长计算、参考图确认条件 | 严格保持原验收直至单独审批规则变更 |
| AB-11 | `ConceptGroup` + `fork/submit/select/approve/active` | 真实选中与批准顺序、fork 是否自动回写 group | 以原 M2 保守流程为基线；不准画布另设 select |
| AB-12 | 原 `/shots/reorder` handler | `orderedShotIds` 参数、是否新建 SB/Shot 修订与原子性 | 禁止原位更新已批准 Shot，修改前出差异单 |
| AB-13 | EvidenceRef、来源版本与历史报告展示 | 是否冻结 evidence excerpt / source version | 历史来源无法证明时禁将其当新高风险主张的唯一证据 |
| AB-14 | `AnimaticSnapshot`、正式/草稿查询 | 同一项目 active 指针、历史选中与状态投影 | 精确传入版本上下文；不得按“latest”混读 |
| AB-15 | 研究问答和 USER_NOTE | 答案幂等写入、来源更新后是否重问 | 保留已答且有效问题的跨刷新屏蔽 |
| AB-16 | `ShotGenerationSpec` 现存模块 | 旧 Spec、所依赖 Shot/图像/资产版本 | 过期状态只读派生；不自动重绑已批准镜头 |

交付核对表：`现有文件位置 | 实际 DTO 字段 | 本文要求 | 是复用/增量/适配/暂缓 | 负责人 | 测试编号`。无法确认的项不得靠“估计应该是这样”执行强制改造。

## 1.3 范围与优先级

- **P0A（先决合同）**：统一生成方式、资产使用 API、素材内容版本、声明锚点、裁决快照时序、下游影响与 M3 门禁。未完成不得让 M1.1/M2.1 独立提交相互冲突的新模型。
- **P0B（业务增强）**：M1.1 研究助手/缺口动作/宣称核验/素材引用；M2.1 制作就绪度/连续性/既有 `ChangePlan` 增强/生成规格建议。
- **P1（可后置）**：理解 Diff、参考广告抽象分析及 M2 创意灵感采用、**同项目内已授权素材复用**；跨项目资产共享属于独立授权/租户隔离设计，本期禁止；**在 M2 既有 `/concepts` 上增强创意对比，在 `/storyboard` 增加只读/轻交互「分镜总览」视图、资产使用位置可视化**。这些能力不阻塞 M3，且以第 15 章为本版详细实施规范。
- **P2（独立立项）**：通用无限画布引擎、任意节点/边关系编辑、多创意分支并行正式制片、复杂多轨剪辑；须先审查其对 M2/M3 审核和版本合同的影响，**本期不实现**。
- **其他不在本期**：真实视频合成、真实视频模型适配、实际钱包/支付结算、第三方凭证登录、跨租户公共素材库。

---

# 2. 原 M1 / M2 必须保持的正式合同

## 2.1 路由和阶段不得调整

```text
/projects
/projects/new
/studio/:id/ingest               S1 / INGEST
/studio/:id/understanding        S2 / UNDERSTANDING
/studio/:id/angles               S3 / ANGLES
/studio/:id/concepts             S3 子页（不新增 ProjectStage）
/studio/:id/script               S4 / SCRIPT
/studio/:id/storyboard           S5 / STORYBOARD
/studio/:id/animatic             S6 / ANIMATIC
/studio/:id/generate             S7 / GENERATE（目前为 M3 占位）
/studio/:id/render               S8 / RENDER（目前为 M4 占位）
```

```ts
export type ProjectStage =
  | 'INGEST' | 'UNDERSTANDING' | 'ANGLES' | 'SCRIPT'
  | 'STORYBOARD' | 'ANIMATIC' | 'GENERATE' | 'RENDER';

export type ProjectStatus =
  | 'DRAFT' | 'IN_PROGRESS' | 'WAITING_REVIEW'
  | 'COMPLETED' | 'ARCHIVED';

export type EvidenceLevel =
  | 'verified' | 'user_confirmed' | 'hypothesis' | 'unsupported';

export type CoverageState = 'CONFIRMED' | 'TO_VERIFY' | 'MISSING';

export type ShotGenerationMode =
  | 'ai_video' | 'motion_graphics' | 'real_footage' | 'image_animation';
```

不得另起 `CONCEPTS` 阶段，不得把 M2 四个小写生成类型替换成大写字符串。`verified` 在现有 M1 含义是“资料直接支持”，**不是第三方独立功能实测**；界面文案不得夸大为已通过外部验证。

## 2.2 正式版本链及引用

```text
ProductSource (sourceId + sourceVersion)
  ↓ 资料集合冻结
IngestionSnapshot S1
  ↓ `ingestionSnapshotId`
UnderstandingRevision R1 (APPROVED)
  ↓ `understandingRevisionId`
MarketingAngleSet / ApprovedCreativeBrief / CreativeConceptRevision
  ↓
ScriptRevision + DurationPlan
  ↓
VisualBibleRevision / ShotRevision[] / StoryboardRevision
  ↓
AnimaticSnapshot (APPROVED)
  ↓
M3 /generate（仅已确认且当前有效的预演可进入生产准备）
```

**不可变原则**：已批准 R1、已批准分镜或历史 AN1 的内容和上游 ID 不得原位修改。被已批准修订引用的证据摘录也必须可按当时的来源版本重现；若原 M1 的 `EvidenceRef` 存储可被修改，需新增不可变证据摘录快照/版本映射，不能让旧批准报告的证据内容指向“当前最新文本”。新事实/new Logo、新角色修改 → 新候选/新草稿/新审批，旧记录仍可通过历史入口查看。内容及发布访问权可以被撤销（见第 11 章），不可变历史**不等于永远展示原文件字节**。

## 2.3 不破坏原审批门槛

- M1 产品理解审核仍要求：产品摘要、至少一条合规可用功能、至少一个目标用户、有权审核人的明确确认；未支持的确定性声明不得直接使用。
- M2 分镜审核仍要求：当前修订经过校验，**选定有效参考图**，Visual Bible/角色/场景一致、相关剧本已批准、时间线无错误、可宣传事实无阻塞风险。
- M2 Animatic 的批准仍要求分镜全数审核、预演快照和时长有效。原 120 秒/15 镜头 Seed 不变。
- M3 工作台可以进入生产准备 ≠ 已经批准任意付费生成；本期不实现真实付费。
- 局部修改/角色全局替换不得直接修改已批准快照；原 M2 `CreativeChangePlan` 承担修改计划。

> 关于未来放宽参考图门槛：录屏/MG 有时并不需要 AI 参考图，但这是**原 M2 §6.8 明确审核条件的变化**，本期不擅自变更。未来如果单独发布 `QC-REFERENCE-OPTIONAL` 变更提案，必须列明按模式适用的新检查项、旧数据映射和完整 E2E，获批后方可替换。

## 2.4 继续使用原 API 外壳、版本、权限和 Mock

- Service URL 前缀：`/creative-video/v1`；浏览器通常是 `/api/creative-video/v1`（以 M0 实际 RequestClient 配置为准）。
- `ApiResponse<T>` 继续使用 `{code,message,data,requestId,timestamp}`，原 `code:'OK'` 成功规则不变。
- 修改用 `expectedVersion` 或 `If-Match`；创建和审核命令用 `Idempotency-Key`；409 用于版本冲突，403 用于权限；异步 Mock 创建返回 202 + `jobId`。
- `VersionedEntity.version` 是**业务对象的乐观锁序号**，不是 `revisionNo`、视频候选版本，也不是素材文件内容版本。
- 既有 owner/editor/reviewer、四个 Seed 项目、Mock 场景切换、页面刷新持久化，全部保留。
- API 实际命名如与文档已存在历史差异，由 Request Repository 做**单一语义 adapter**；不能让组件分别访问两套不同协议并持续维护双状态。

---

# 3. 二十项冲突与歧义的确定裁决

| ID | 发现位置 | 风险 | **唯一裁决 / 不得再并行实施其他定义** |
|---|---|---|---|
| FIX-01 | M2 `§10.5` vs M2.1 `§6` | `generationMode` 字符串大小写及真实素材语义相异 | `ShotGenerationSpec.mode` 必须是 M2 原 `ShotGenerationMode`；`real_footage` 可有 `footageSubtype`，但不能换成 `SCREEN_CAPTURE` |
| FIX-02 | M1.1 `§11.4` vs M2.1 `§6` | 资产使用路由重复 | 采用 `GET /projects/:id/assets/:assetId/usage`；停用未实施的 `GET /projects/:id/asset-usage?assetId=...` |
| FIX-03 | M2 `§11.6` vs M2.1 `§6` | 两套 AI 改动影响计划 | 自然语言修改复用 `/director/change-plans`；其他跨阶段读影响统一只读 `POST /projects/:id/dependency-impact/preview`；不创建第二套 `ChangePlan` 持久表 |
| FIX-04 | M1 `§7.3` vs M1.1 `§10.4` | `AssetRef.version` 被当作图片文件 V2 | 新增 `AssetContentVersion`，区分素材内容版本与元数据乐观锁；`ImageAssetVersion` 继续是 M2 参考图候选 |
| FIX-05 | M1 `§7.5` vs M1.1 `§10.3` | `claimId` 指向不存在的实体 | 新建轻量 `ClaimAnchor`；原 `ProductFeature`、`prohibitedClaims: string[]` 继续保留 |
| FIX-06 | M1 `§7.4` vs M1.1 `§9.1` | 访谈与裁决冻结位置不明 | 访谈提交 → `USER_NOTE` 来源 → 新 IngestionSnapshot；裁决引用只冻结在新 `UnderstandingRevision` 中，**不放进资料快照** |
| FIX-07 | M1.1 `§3.7` | 跳过题永不再次出现 | `SKIPPED` 仅本资料/访谈上下文有效，来源变化后重评估；`DISMISSED` 有理由但也必须允许按风险重新评估 |
| FIX-08 | M1.1 `§8` vs M2.1 `§4` | 参考广告被当事实/上传两次 | M1 拥有资产与 insight，M2 仅查看、采纳抽象创意；`CREATIVE_REFERENCE` 严禁进入产品事实分析 |
| FIX-09 | M2 `§2.4` vs M2.1 `§2` | “没报价”导致 M3 入口无法打开 | `canEnterM3` 只依赖原 M2 审批与有效版本链；预算/余额/报价只能在 M3 内按单次请求核验 |
| FIX-10 | M2.1 `§3`/`§6` | 报价 DTO 不绑定完整请求 | M3 预留 `GenerationRequestSnapshot` 与 quote 绑定；本期只 Mock 接口合同，不产生真实资金状态 |
| FIX-11 | M1 `§6.12` vs M2 `§9.3` | 新事实导致旧批准内容“被覆盖”或仍可无提示生产 | 保存历史已批准版本不变；新增派生有效性/影响视图；新内容需新分支和重新审核。旧风险分支仅供带风险标记的历史查看 |
| FIX-12 | M2 `§4.2` / `§6.2` 已有对比与排序，新版希望加入探索画布 | 将画布节点/拖动误当业务修订，或新建一套 Concept/Shot/Approval | 视图从原业务修订**派生**；画布位置仅 UI 状态。正式选择、镜头顺序及引用通过原 API + 审核 |
| FIX-13 | M2 `moodboardAssetIds` 与 M1 内容版本 | 把通用 Asset、Shot 绑定的 Image 候选混用 | moodboard IDs 永远是 `AssetRef.id`；新概念修订可选冻结 `ConceptMoodboardBinding`，Usage 支持 `CREATIVE_CONCEPT_REVISION` |
| FIX-14 | USER_NOTE 更新 source set fingerprint | 刚回答又被重复追问 | 根据**答案有效性和关联证据变化**去重，不能仅使用全局来源指纹 |
| FIX-15 | M2 方案选择/审核时序 | 焦点卡被误作正式选择、草稿未审先 select | UI focus 独立；原 M2 保守顺序 `submit-review → group select → approve/active`，实际 handler 差异先 G0 审查 |
| FIX-16 | A/B/C 组合创意 | 跨 Brief、跨项目混合事实，Fork 不入原组 | 同 project、同 approved brief 与兼容上游；合法基底 Fork，原 group 原子纳入，重新审核主张与时长 |
| FIX-17 | Storyboard 重排序 | `shotId` / `shotRevisionId` 混用，旧批准 order 被写 | 传 `orderedShotIds`；单事务生成新 SB 草稿和必要 Shot 草稿；本期仅同 Beat 重排 |
| FIX-18 | 正式基线 vs 工作草稿 vs 历史 | 因未采纳草稿误禁生产或不同版本串图 | 读视图显式标 `viewingContext`、正式与草稿修订 ID；正式链就绪只读派生，保留更严已实施安全策略 |
| FIX-19 | M1 EvidenceRef 不含来源版本 | 旧报告被新资料摘录“追认” | 新增只读 `EvidenceLocatorSnapshot`；冻结来源版本与摘录；无法恢复标 `LEGACY_EVIDENCE_UNRESOLVED` |
| FIX-20 | ShotGenerationSpec `OUTDATED` 语义未落数据合同 | 旧建议参数误当新正式镜头规格 | GET 派生 `ShotGenerationSpecView`，比对镜头/图片/资产/视觉规范；PUT 校验 expectedVersion；M2 无付费授权 |

### 3.1 修改范围保护表

| 原对象/功能 | 本期行为 | 明确禁止 |
|---|---|---|
| `VideoProject` | 仅在已有字段上显示待补资料/风险摘要 | 重命名 `currentStage` 或自创新阶段 |
| `SourceCoverageItem` | 扩展 gap 只读聚合，覆盖状态仍由 M1 维护 | 建立第二个“权威准确率”对象 |
| `ProductSource / EvidenceRef` | 增加访谈来源、可选创意参考 scope | 把用户回答直接标 `verified` |
| `IngestionSnapshot` | 原接口冻结资料集合；无需新审批协议 | 将冲突裁决硬塞为来源快照的新必填字段 |
| `UnderstandingRevision` | 增加可选裁决引用与现有 Fork 流程 | 原地替换已批准 R1 |
| `AssetRef` | 保留主键和乐观锁；挂接内容版本子表 | 用 `version` 或 `blob:` 作为永恒内容版本 ID |
| `VisualBibleRevision` | 候选引用/反向查询，已批准快照只读 | 自动将 Logo V1 替换成 V2 |
| `ShotRevision` | 基于原 enum 填生产模式和引用 | 直接变更 `APPROVED` 内容来同步 M3 spec |
| `CreativeChangePlan` | 扩展影响展示，继续用原 apply/discard | 自建另一套可执行修改命令 |
| `AnimaticSnapshot` | 原确认仍有效；新增**派生当前有效性** | 为了显示“过期”改写历史已确认快照内容 |
| `ProductionReadiness` | 后端/Mock 从现有状态计算而得 | 手动持久化第二套审批结果 |
| 创意探索/分镜总览视图 | 由原 `ConceptGroup`/`CreativeConceptRevision` 与正式 `StoryboardRevision.orderedShotRevisionIds` 计算，画布位置仅 UI 偏好 | 再造独立的 `CreativeBranch`/`CanvasShot`/`CanvasApproval` 作为业务事实；拖动视觉卡片直接改正式镜头顺序 |

---

# 4. 统一 TypeScript 增量合同（供前端实现）

## 4.1 说明与导入原则

以下 DTO 为**合约草案，最终必须先和实际代码文件做差异核对**；示例借用 M1 的 `ID`、`ISODateTime`、`VersionedEntity`、`EvidenceLevel`，以及 M2 的 `ShotGenerationMode`。不要复制或改写原文件中的同名基础类型。已使用的导出/文件名保留，新增类型集中在当前 `types/creative-video` 之下。

- 新 DTO 字段默认优先**可选兼容扩展**，除非服务返回的是一条本期新创建的对象。
- 所有 ID 由 Mock/未来服务生成且稳定；数组顺序不充当业务 ID。
- `contentVersion`、`revisionNo`、`version`、`quoteId`、`snapshotId` 各有不同含义，不得互换。
- 新服务返回的是带 `ApiResponse<T>` 包装的 DTO；UI `selectedTab`、`drawerOpen` 不放进长期业务 DTO。
- **P0 公共类型**：`EffectiveValidity` 是全局版本有效性只读类型，必须定义于 `types/creative-video/common` 或团队既有的唯一公共模块，P0 就绪度及 P1 画布都从同一处导入，不能放在 P1 专属类型模块。

```ts
export type EffectiveValidity = 'CURRENT' | 'REVIEW_REQUIRED' | 'BLOCKED';
```

## 4.2 内容版本（原 M1 AssetRef 不变）

```ts
import type { ID, ISODateTime } from './common';

export interface AssetContentVersion {
  id: ID;                       // 唯一内容版本 ID（不可变）
  projectId: ID;
  assetId: ID;                  // 指向原 AssetRef.id
  contentRevisionNo: number;   // 同一 AssetRef 的真实内容更替序号
  contentHash?: string;        // 正式服务端核验；Mock fixture 可有固定摘要
  mimeType: string;
  storageRef?: string;          // 逻辑存储 key，不是 blob/http 临时 URL
  originalFilename?: string;
  sizeBytes: number;
  createdAt: ISODateTime;
  createdBy?: ID;
  replacesVersionId?: ID;
  status: 'READY' | 'UNAVAILABLE' | 'REDACTED'; // 访问/可用性状态；不改变已冻结内容
}

export interface AssetIdentityView {
  asset: AssetRef;             // 引入原 M1 导出，本文不重定义
  activeContentVersionId?: ID;
  contentVersions: AssetContentVersion[];
}
```

**迁移规则**：原 `AssetRef` 继续为项目素材主身份；旧文件记录只创建可追溯的初始 `AssetContentVersion`。若旧 Mock 只保存文件元信息而没有真正可恢复的二进制内容，迁移时置为 `UNAVAILABLE`，不能伪装成可用素材；已有明确本地 fixture 且可加载才置 `READY`。`previewUrl` 可用于预览但不得当作冻结内容版本的唯一存储标识。

**内容不可变与访问状态的区别**：`AssetContentVersion` 的实际字节/标识/内容序号不可修改；`status` 是权限与可用性投影，可因撤销权利或文件失效更新为 `REDACTED/UNAVAILABLE`，这并不代表创建了内容 V2。

**图片候选关系**：原 `ImageAssetVersion` 保持不变。对由 M1 AssetRef 引入的镜头图片，另加可选映射 `assetContentVersionId?: ID` 或独立映射表；旧 Mock 图片未映射时仍以原 `ImageAssetVersion.id` 运行，不得强制迁移失败。

## 4.3 资产用途、概念情绪板绑定与反向引用（P0 合同；Moodboard 绑定 P1）

### 4.3.1 严格区分四类 ID

| 对象 | 身份 | 可存在哪里 | 不得混用 |
|---|---|---|---|
| `AssetRef.id` | M1 通用素材身份 | M2 原 `moodboardAssetIds[]`、`brandLogoAssetIds[]`、`CharacterBible.imageAssetIds[]` 等原有约定引用 | 不代表固定的内容字节版本 |
| `AssetContentVersion.id` | 同一 M1 素材的一份不可变内容 | 新的 `assetContentBindings[]`、`conceptMoodboardBindings[]` | **不能**直接写入原 `moodboardAssetIds[]` |
| `ImageAssetVersion.id` | M2 特定镜头的候选参考图片；原 M2 `shotId` 必填 | `ShotRevision.referenceImageVersionIds[]/activeReferenceImageId` | **不能**作为无镜头 Concept 的通用 Moodboard 资产 |
| `VersionedEntity.version` | 业务对象乐观锁 | `expectedVersion` / `If-Match` | 不是素材内容版本、不是 R1/R2 修订号 |

```ts
export type AssetPurpose =
  | 'PRODUCT_UI' | 'PRODUCT_DEMO' | 'BRAND_LOGO' | 'BRAND_STYLE'
  | 'CHARACTER_REFERENCE' | 'SCENE_REFERENCE'
  | 'REFERENCE_AD' | 'EVIDENCE_DOCUMENT' | 'OTHER';

export interface AssetUsageMetadata extends VersionedEntity {
  projectId: ID;
  assetId: ID;
  purposes: AssetPurpose[];
  rightsStatus: 'DECLARED' | 'UNCERTAIN' | 'NOT_ALLOWED';
  mayBeShownInFinalVideo: boolean;
  mayBeUsedForAnalysis: boolean;
  containsSensitiveData: boolean;
  notes?: string;
}

export type AssetUseTarget =
  | 'PRODUCT_SOURCE' | 'UNDERSTANDING_REVISION'
  | 'CREATIVE_CONCEPT_REVISION' // P1：情绪板的修订级绑定
  | 'VISUAL_BIBLE_REVISION' | 'STORYBOARD_REVISION'
  | 'SHOT_REVISION' | 'REFERENCE_AD_ANALYSIS';

export interface AssetUsageRef {
  id: ID;
  projectId: ID;
  assetId: ID;
  assetVersionId?: ID; // 可确认时才填 AssetContentVersion.id；legacy 未知须留空
  unresolvedLegacy?: boolean;
  targetType: AssetUseTarget;
  targetId: ID; // 对修订型对象应是当前目标修订 ID
  targetRevisionId?: ID;
  usageRole: string;
  isActiveCandidate: boolean; // 派生
  isInApprovedSnapshot: boolean; // 派生
}

export interface AssetContentBinding {
  assetId: ID;
  assetVersionId: ID; // AssetContentVersion.id
  usageRole: string;
  targetEntityId?: ID;
}
export interface VisualBibleContentExtension {
  assetContentBindings?: AssetContentBinding[];
}
export interface ShotContentExtension {
  assetContentBindings?: AssetContentBinding[];
}

// P1：仅在新 Concept 草稿/修订里记录固定情绪板内容版本。
// 原 CreativeConceptRevision.moodboardAssetIds: ID[] 不改语义、不变必填。
export interface ConceptMoodboardBinding {
  assetId: ID; // 必须出现在该 Concept 的 moodboardAssetIds[]
  assetContentVersionId: ID; // 必须属于相同 assetId 和 projectId
  usageRole: 'MOODBOARD' | 'CHARACTER_IDEA' | 'SCENE_IDEA';
}
export interface CreativeConceptMoodboardExtension {
  conceptMoodboardBindings?: ConceptMoodboardBinding[];
}
```

### 4.3.2 写入权威和跨阶段引用

- `VisualBibleRevision` / `ShotRevision` / `CreativeConceptRevision` 的修订数据为**唯一权威来源**；`AssetUsageRef` 只能依据已提交的修订**派生/重建**，不是独立可编辑的使用记录。
- 原 `moodboardAssetIds[]` 只能存 `AssetRef.id`，新 `conceptMoodboardBindings[]` 冻结同一 `assetId` 的具体内容版本；不允许只绑定一个未列在原数组的 Asset，也不允许版本属于另一个 Asset。
- Concept 阶段的情绪板不能拿 `ImageAssetVersion.id` 当资产。如果要把已有镜头候选图用于 Concept，应先遵守素材授权，将其显式归档为新的或既有的 `AssetRef + AssetContentVersion`；原 Shot 图片引用不受影响。
- 不从当前 `AssetRef` 最新内容自动推断历史已批准 Concept/Shot 使用的版本。历史无法确证时标记 `LEGACY_VERSION_UNRESOLVED`，只展示可证明的元数据，禁止把此历史引用用于新高风险/收费生产输入。
- 旧 `CreativeConceptRevision` 未有绑定属于正常兼容场景：允许照常看原三方案和文本/已有合法预览；UI 展示「历史情绪板内容版本未确定」，不得在复用时暗中绑定最新内容。
- 已批准的 `CreativeConceptRevision` / `VisualBibleRevision` / `ShotRevision` 不可写；替换 Logo 或 Moodboard 先展示影响预览，创建新草稿并重新审核。撤权、删除、清理只影响**内容可访问性投影**，不擦除历史修订 ID。
- 通用资产、角色/场景参考图、产品 UI 的选择器共用一个 Asset Repository；原 `ImageAssetVersion` 的多候选逻辑仍由 Shot Reference Gallery 负责。原 `brandLogoAssetIds[]`、`CharacterBible.imageAssetIds[]`、`SceneBible.referenceAssetIds[]` 继续保留，扩展绑定与原引用保持一致；版本化内容引用优先作为新生产的精确依据。
- 若需要资产引用写入 API `POST /projects/:id/assets/:assetId/references`，它必须委派给**原 M2 目标草稿修订命令**，在同一个业务事务内提交修订与索引重算。不能先独立插入索引再等目标修订异步同步。

### 4.3.3 权属、用途、撤权

可用于研究分析 ≠ 允许在成片展示。每次采用检查：项目归属、来源用途、`AssetContentVersion.status`、使用权限、`mayBeUsedForAnalysis` 和 `mayBeShownInFinalVideo`。当素材 `REDACTED/UNAVAILABLE` 或未经展示授权时，当前候选禁止作为成片来源；历史可显示 ID/审计但不返回可下载的原始字节。Mock 也应按这些规则显示禁用状态。

## 4.4 宣传主张唯一锚点

```ts
export type ClaimOrigin =
  | 'FEATURE' | 'PAIN_POINT' | 'ANGLE' | 'SCRIPT_BEAT'
  | 'SHOT' | 'FREE_TEXT';

export interface ClaimAnchor {
  id: ID;
  projectId: ID;
  origin: ClaimOrigin;
  sourceRevisionId: ID;       // 以具体修订 ID 固定来源
  entityId?: ID;              // ProductFeature.id / ShotRevision.shotId 等
  fieldPath?: string;         // 比如 'narration' / 'subtitles[0]'
  statementSnapshot: string;
  supersedesClaimAnchorId?: ID; // 新修订替代旧主张时保留追溯关系
  sourceEvidenceIds: ID[];
  createdAt: ISODateTime;
}

export interface ClaimReadinessItem {
  claimAnchorId: ID;
  status: 'USABLE' | 'NEEDS_REVIEW' | 'BLOCKED';
  reasonCodes: string[];
  relatedConflictIds: ID[];
  evaluatedForRevisionId: ID;
}
```

**重要语义**：`ClaimAnchor` 是一个**明确修订内的具体主张快照**，不会因为文字改写而原地更新 `statementSnapshot`。如果新修订改了该声明，创建新 Anchor ID，并可选 `supersedesClaimAnchorId` 指向旧 Anchor。多个文字相同却出现在不同镜头的声明属于不同锚点。`prohibitedClaims: string[]` 原字段继续存在；为它建立独立索引映射，不使用数组下标作长期 ID。

对于没有“反向证据”的「提升转化 80%」，建立 `ClaimReadinessItem=BLOCKED`/`QUANTIFIED_CLAIM_UNSUPPORTED`，**不构造假 evidence B**。这是事实风险，不能被仅仅“用户点跳过问题”解除。

### 4.4.1 已批准报告所需证据定位快照（P0，FIX-19）

原 M1 `EvidenceRef` 只有 `sourceId + excerpt + pageNo/timeStartSec/timeEndSec`，**没有**来源内容的具体版本。为避免新资料“追认”旧报告，本期新增独立只读快照，**不修改原 `EvidenceRef` 结构**：

```ts
export interface EvidenceLocatorBase {
  id: ID;
  projectId: ID;
  capturedForRevisionId: ID; // 指定 UnderstandingRevision.id
  ingestionSnapshotId: ID;
  evidenceId: ID;             // 原 EvidenceRef.id
  sourceId: ID;               // 原 EvidenceRef.sourceId
  locator: {
    pageNo?: number;
    timeStartSec?: number;
    timeEndSec?: number;
    screenshotAssetId?: ID;
  };
  capturedAt: ISODateTime;
}

// 可证明历史版本时，版本号、摘录和当时等级都必须完整存在。
export type EvidenceLocatorSnapshot = EvidenceLocatorBase & (
  | {
      recoverability: 'CAPTURED' | 'RECONSTRUCTED';
      sourceVersion: number; // IngestionSnapshot.sourceVersions[sourceId]
      excerptSnapshot: string;
      evidenceLevelAtCapture: EvidenceLevel;
    }
  | {
      recoverability: 'LEGACY_EVIDENCE_UNRESOLVED';
      sourceVersion?: number;     // 有时只能证明版本但无法证明摘录，反之亦然
      excerptSnapshot?: string;
      evidenceLevelAtCapture?: EvidenceLevel;
      unresolvedReason: string;
    }
);
```

**写入时点**：创建新的 UnderstandingRevision 草稿时，按照它所引用的 `IngestionSnapshot.sourceIds/sourceVersions` 冻结证据定位；首次确认前可以补充审阅证据快照，但确认后快照不再编辑。`EvidenceRef` 后续变化不能改变 R1 已冻结的证据摘录。`evidenceLevelAtCapture` 只记录当时审查状态，不代表独立实测。

**数据约束**：对 `CAPTURED/RECONSTRUCTED`，`sourceId` 必须属于其 IngestionSnapshot，`sourceVersion` 必须等于该快照所记来源版本，`excerptSnapshot` 必须存在；对 `LEGACY_EVIDENCE_UNRESOLVED` 允许缺失不可证明的字段，但**禁止**将其当作有效高风险事实佐证。定位、修订 ID 与已冻结摘录均不可原地改写。一个报告同一个 evidence 可以有一个或多个明确定位条目，重复创建使用稳定键/幂等机制去重。ClaimReadiness 的计算必须传**指定 UnderstandingRevision.id + 关联正式制作链 ID**，不得跨 R1/R2 使用相同缓存项。

**旧数据策略**：仅当原持久化历史确实能证明 Source 版本及旧摘录时才记 `RECONSTRUCTED`；不能确定的记 `LEGACY_EVIDENCE_UNRESOLVED`，在报告历史查看中提醒“来源版本无法证实”，仍可阅读旧审核决策，但**不得把该证据当作新高风险营销主张的唯一证明**。不伪造已恢复来源原文件，撤权后仍遵守访问限制。

## 4.5 研究缺口、问题、答案（与原 M1.1 合并而非复制）

继续沿用原 M1.1 `ResearchGap / ResearchQuestion / ResearchAnswer / ResearchSession` 的大部分字段，只统一下面几个增量：

```ts
export interface ResearchContextRef {
  ingestionStateVersion: number;  // M1 IngestionState.version
  ingestionSnapshotId?: ID;       // 若有已确认快照
  sourceSetFingerprint?: string;  // 可选，Mock 服务从 sourceId+version 算
}

export interface ResearchQuestionRules {
  blockingPolicy: 'NON_BLOCKING' | 'CLAIM_SPECIFIC_BLOCK';
  priority: 'P0' | 'P1' | 'P2';
  sourceEvidenceIds: ID[];
  applicableContextFingerprint?: string;
  dismissedReason?: string;
}
```

建议以**可选字段/关联读模型**挂在既有 `ResearchQuestion` 上；不强行移动或改写原 `ResearchGap` 类型。`ResearchGap` 是覆盖缺口，`ResearchQuestion` 是为补缺口的可回答事件：

- `SKIPPED` 是**问题在当前会话/资料版本**的跳过，不是永远清除 Gap。
- `DISMISSED` 是有理由的“该问题不适用”，改变资料版本或发现新严重事实冲突后仍要重评估。
- `ANSWERED` 不等于资料被正式采纳；仅创建/纳入新 `IngestionSnapshot` 后才是 `INCORPORATED`。
- 未回答不阻止整个项目进 M2；高风险宣称是否可用由 `ClaimReadinessItem` 独立决定。

### 4.5.1 访谈问题筛选：关联证据去重，避免“回答后马上又问”（P0，FIX-14）

**原误区**：保存答案会生成 `USER_NOTE`，导致全局 `sourceSetFingerprint` 改变，不能据此判定上一个问题已失效。问题是否再问取决于**答案本身有效性及与该 Gap 相关的证据是否失效/反驳**。

```ts
export type AnswerValidity = 'VALID' | 'STALE' | 'REVOKED' | 'CONTRADICTED';

// 只读投影；不要求改写旧 ResearchQuestion 的必填字段。
export interface ResearchQuestionValidityVM {
  questionId: ID;
  gapId: ID;
  answerValidity?: AnswerValidity;
  gapRelevantEvidenceFingerprint?: string;
  sessionId: ID;
  status: 'SUGGESTED' | 'ASKED' | 'ANSWER_DRAFT'
    | 'ANSWERED' | 'INCORPORATED' | 'SKIPPED' | 'DISMISSED' | 'STALE';
  applicableContextFingerprint?: string;
}

export interface ResearchGapVM {
  id: ID;
  status: ResearchGapState; // 原 M1.1 枚举：OPEN/ANSWER_IN_PROGRESS/RESOLVED/SKIPPED/STALE/DISMISSED
  severity: ResearchGapSeverity; // 原 M1.1 枚举：BLOCKING_CLAIM/IMPORTANT/OPTIONAL
  priorityScore: number;
  relevantEvidenceFingerprint?: string;
  needsReconfirmation?: boolean; // Mock 服务明确依据新反证/撤权设置
}

export function selectNextResearchGaps(
  gaps: ResearchGapVM[], questions: ResearchQuestionValidityVM[],
  sessionId: string, maxCount = 3,
): ResearchGapVM[] {
  const score = (v: ResearchGapVM['severity']) =>
    v === 'BLOCKING_CLAIM' ? 3 : v === 'IMPORTANT' ? 2 : 1;
  return gaps.filter(g => g.status !== 'RESOLVED'
    && !(g.status === 'DISMISSED' && !g.needsReconfirmation))
    .filter(g => !questions.some(q => {
      if (q.gapId !== g.id) return false;
      if (q.status === 'ANSWERED' || q.status === 'INCORPORATED') {
        // 已回答且有效：即使新增 USER_NOTE 或无关文件，也不能重问。
        return q.answerValidity === 'VALID' && !g.needsReconfirmation;
      }
      if (q.status === 'SKIPPED') return q.sessionId === sessionId;
      if (q.status === 'DISMISSED') {
        return !g.needsReconfirmation
          && !!q.gapRelevantEvidenceFingerprint
          && q.gapRelevantEvidenceFingerprint === g.relevantEvidenceFingerprint;
      }
      if (q.status === 'ASKED' || q.status === 'ANSWER_DRAFT') {
        return q.sessionId === sessionId;
      }
      return false;
    }))
    .sort((a, b) => score(b.severity) - score(a.severity)
      || b.priorityScore - a.priorityScore || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(3, maxCount)));
}
```

规则：`VALID` 由 Mock Repository 依据答案和**关联证据**判断，不能由客户端自行宣称；旧记录缺答案有效性时保守显示「需核实」而非无条件视为 `VALID`；`ResearchGapVM.status` 直接复用原 M1.1 `ResearchGapState`，**不要**将 M1 `CoverageState=TO_VERIFY` 误写成 ResearchGap 的新状态。同一 question 保存答案与创建 USER_NOTE 需由原 Repository 按幂等键组成一次原子业务动作，连续提交相同答案不能产生重复来源。删除唯一有效来源、内容被撤销、出现明确反证或用户要求重答时才标记 STALE 并重新建议。`SKIPPED` 仅在当前会话屏蔽；`DISMISSED` 在关联证据环境不变时有效。**问答完成 ≠ 该主张可宣传**，仍受 `ClaimReadiness` 和原 M1 审核约束。

建议断言：Q 答完立即新增 USER_NOTE → 连续两次 `next` + 页面刷新都不再问 Q；新增无关品牌图片也不重问；删除 Q 的唯一证明或出现反证时允许重问；409 冲突与重试不复制 USER_NOTE。

## 4.6 宣传冲突与人工裁决（原有 M1 DTO 兼容扩展）

```ts
export type ConflictType =
  | 'FACTUAL_CONTRADICTION' | 'VERSION_SCOPE'
  | 'QUANTIFIED_CLAIM_UNSUPPORTED' | 'SOURCE_STALENESS'
  | 'POLICY_RESTRICTION';

export type ConflictDecision =
  | 'CONFIRM_A' | 'CONFIRM_B' | 'REWRITE_SAFE'
  | 'EXCLUDE_CLAIM' | 'NEEDS_EVIDENCE' | 'NOT_A_CONFLICT';

export interface ClaimConflict extends VersionedEntity {
  projectId: ID;
  detectedFromSnapshotId: ID;
  conflictType: ConflictType;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'
    | 'DISMISSED_AS_NON_CONFLICT' | 'REOPENED';
  title: string;
  explanation: string;
  claimId: ID;               // **ClaimAnchor.id**
  relatedFeatureIds: ID[];
  evidenceIdsA: ID[];
  evidenceIdsB: ID[];         // 可以是 []，禁止伪造反证
  statementA?: string;
  statementB?: string;
  affectedMarketingClaimIds: ID[]; // 全部 ClaimAnchor.id
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  candidateSafeStatement?: string;
  activeResolutionId?: ID;
  resultingClaimAnchorId?: ID; // 新报告批准后形成的安全主张锚点；未生成时留空
  mocked: true;
}

export interface ConflictResolution extends VersionedEntity {
  projectId: ID;
  conflictId: ID;
  decision: ConflictDecision;
  proposedSafeStatement?: string;
  applicabilityNotes?: string;
  reason: string;
  linkedEvidenceIds: ID[];
  createdBy: ID;
  reviewedBy?: ID;
  reviewedAt?: ISODateTime;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  proposedUnderstandingRevisionId?: ID;
}

// **仅可选增量**：原 UnderstandingRevision 必填字段保持完全不变。
export interface UnderstandingRevisionM11Extension {
  researchSessionIds?: ID[];
  relatedConflictResolutionIds?: ID[];
}
```

`ClaimConflict` 和 `ConflictResolution` 只在本期**新增唯一实现**。如仓库已按照旧 M1.1 实现，应新增 `ClaimAnchor` 映射与迁移，而不是再创建平行的 conflict 表。

### 4.6.1 裁决审批和理解报告审批不是同一步

| 状态/动作 | 数据记录 | 可以当成产品事实用于新 M2 吗？ |
|---|---|---|
| 扫描冲突 | ClaimConflict `OPEN` | 否；有关主张 BLOCKED |
| 提交裁决提议 | ConflictResolution `SUBMITTED`、冲突 `UNDER_REVIEW` | 否 |
| 审核人确认裁决提议 | Resolution `APPROVED`；在**新草稿** UnderstandingRevision R2 建立候选改动和裁决引用 | 否；R2 未批准，旧 R1 不动 |
| 审核人最终批准 R2 | UnderstandingRevision R2 `APPROVED`；冲突有效性投影可变 `RESOLVED`（若该声明已修正且规则满足） | **可以**：仅 R2 新分支和其中已经核实/允许的主张 |
| 裁决为 NEEDS_EVIDENCE | 保持 ClaimReadiness BLOCKED、Conflict 有待办；可产生 R2 草稿记录风险 | 否，不得显示 RESOLVED |
| 决定 NOT_A_CONFLICT | 需提供适用版本/套餐等范围，重新计算声明在当前规格内是否可用 | 按证据和范围决定，不自动通过 |

**结算条件不是“点了裁决批准就自动改写所有 M2 镜头”**。冲突已消除仅指当前产品事实分支，旧 M2 历史展示保持原快照。冲突状态可采用独立事件更新，但**有效的 `ClaimReadiness` 必须由当前审核通过的理解修订与证据即时计算**，不可依靠草稿修改后的 UI 标色作为唯一事实。

## 4.7 参考广告分析隔离（P1）

```ts
export type SourceAnalysisScope = 'PRODUCT_EVIDENCE' | 'CREATIVE_REFERENCE';

// 对 M1 ProductSource 作可选兼容扩展；无字段的历史来源默认 PRODUCT_EVIDENCE。
export interface SourceAnalysisExtension {
  analysisScope?: SourceAnalysisScope;
}
```

- `SourceKind` **仅在实施 P1 时**加入 `'REFERENCE_AD'`；不触碰已有 `PUBLIC_WEB/DEMO_SESSION/SCREEN_RECORDING/SCREENSHOT/DOCUMENT/BRAND_ASSET/USER_NOTE`。
- `REFERENCE_AD` 的默认 `analysisScope=CREATIVE_REFERENCE` 且 `includedInAnalysis=false`；其它历史 M1 来源默认 `PRODUCT_EVIDENCE`。
- M1.1 负责素材上传、权属声明和 `ReferenceAdInsight` 创建；M2.1 如需 `/studio/:id/references` 仅作为查看/采用**已经存在的同一 insight** 的子页；不允许再上传一次或创建另一套 insight ID。
- 创意灵感只进入 `/angles` 或 `/concepts` 的可选启发引用；**不得变成 EvidenceRef 证明本产品功能**。即便参考视频介绍的是用户自己的产品，也必须经产品事实资料路径另行验证。
- 本期 P0 不需要实现；P1 的上传与分析任务同样只用 fixture，不暗中运行真实音视频模型。

## 4.8 生成规格预配置与派生失效状态（M2.1 P0，FIX-20）

```ts
export type FootageSubtype =
  | 'screen_recording' | 'camera_footage' | 'licensed_stock' | 'other';

// 业务对象：仅准备建议，不是模型请求，更不是付费授权。
export interface ShotGenerationSpec extends VersionedEntity {
  projectId: ID;
  shotId: ID;
  shotRevisionId: ID;              // 指定已批准 ShotRevision.id
  mode: ShotGenerationMode;         // 原 M2 的四个小写枚举
  footageSubtype?: FootageSubtype;  // 仅 real_footage 使用
  expectedDurationMs: number;
  referenceAssetVersionIds: ID[];   // 仅 AssetContentVersion.id
  referenceImageVersionIds?: ID[];  // 仅 M2 ImageAssetVersion.id
  visualBibleVersionId: ID;
  outputAspectRatio: '9:16' | '16:9' | '1:1';
  modelId?: string;                 // 仅建议；M3 才确认
  sourceShotRevisionVersion: number;
}

export type SpecValidity = 'NOT_CONFIGURED' | 'CURRENT' | 'OUTDATED' | 'BLOCKED';
// 不存在持久化 Spec 时，仅提供只读的建议，没有 ID/version，也不是报价。
export interface ShotGenerationSpecSuggestion {
  shotId: ID;
  shotRevisionId: ID;
  mode: ShotGenerationMode;
  expectedDurationMs: number;
  referenceAssetVersionIds: ID[];
  referenceImageVersionIds: ID[];
  visualBibleVersionId: ID;
  outputAspectRatio: '9:16' | '16:9' | '1:1';
}
export interface ShotGenerationSpecView {
  shotId: ID;
  spec?: ShotGenerationSpec;              // 已真实保存时才出现
  suggestedSpec?: ShotGenerationSpecSuggestion; // 未配置时只读派生
  specValidity: SpecValidity;
  currentApprovedShotRevisionId?: ID;
  outdatedReasonCodes: Array<
    | 'SHOT_REVISION_CHANGED' | 'SHOT_VERSION_CHANGED'
    | 'VISUAL_BIBLE_CHANGED' | 'ASSET_VERSION_CHANGED'
    | 'REFERENCE_IMAGE_CHANGED' | 'ASPECT_RATIO_CHANGED'
    | 'MISSING_ACTIVE_BASELINE' | 'ASSET_REDACTED'
    | 'UNRESOLVED_LEGACY_VERSION' | 'CLAIM_BLOCKED'
  >;
  comparedAt: ISODateTime;
}
```

**唯一校验规则**：从当前正式 `StoryboardRevision.orderedShotRevisionIds` 精确找已批准的 `ShotRevision`，再对比 `shotRevisionId + sourceShotRevisionVersion + visualBibleVersionId + referenceAssetVersionIds + referenceImageVersionIds + outputAspectRatio`；按 ID 先排序作规范比较，不能仅比较数量。`referenceImageVersionIds` 至少包含当前**实际采用**的 `activeReferenceImageId`，且它属于同一 Shot、可访问且有效。如果不存在持久化 Spec，GET 返回 `specValidity=NOT_CONFIGURED`、`spec` 缺省，并以 `suggestedSpec` 展示只读建议，**不得**伪造持久化的 `id/version` 或报价。

- 新建**尚未批准**的镜头或视觉草稿，不自动修改已有正式镜头所绑定 Spec；除非 G0 确认原 M2 有更严格的阻塞策略，才沿用更严策略。
- 正式批准新 Shot、Visual Bible 或参考图后，旧 Spec 应是 `OUTDATED`（引用/版本变化）；撤权、无有效正式链或高风险主张则是 `BLOCKED`。`BLOCKED` 优先于 `OUTDATED`。
- 不自动将旧 Spec 的 `shotRevisionId`/素材 ID 改为新正式版本；用户重新检查建议配置，保存新 Spec，并由 M3 **重新报价**。
- `mode` 与**当前已批准** `ShotRevision.generationMode` 一致；时长等于其 `durationMs`（供应商特殊时长属于 M3 方案，不能修改原审核版）。`real_footage` 本期仍遵守 M2 原“参考图已选”审核门槛，不能偷偷豁免。
- `GET /generation-specs` 必须返回 `ShotGenerationSpecView[]`，包含过期 Spec 及原因；`PUT` 以 `expectedVersion + expectedApprovedShotRevisionId` 校验，引用过期返回 409/422 并保留用户输入；不修改 `ShotRevision`。
- M2.1 不生成视频、不冻结积分、不创建 GenerationQuote、不扣费。
- `specValidity=NOT_CONFIGURED` **不阻止进入** M3 准备页；它仅表示该镜头尚未保存建议规格。Spec 不是 M2 预演审批条件，只有当前正式版本链/权益/事实校验决定 `canEnterM3`。

## 4.9 创意探索与分镜总览的**展示层**数据（P1，FIX-13/18）

以下类型只属于 `UI ViewModel` 与私有布局偏好，**不新增** Canvas/Concept/Storyboard 的第二套权威数据库表；这些信息必须从**指定修订**和用户个人偏好派生。

```ts
export type StudioViewMode = 'DIRECTOR' | 'EXPLORATION';
export type StoryboardViewMode = 'SHOT_DETAIL' | 'SHOT_OVERVIEW';
export type ViewingContext = 'APPROVED_BASELINE' | 'WORKING_DRAFT' | 'HISTORY';
// EffectiveValidity 从 §4.1 的 P0 公共模块导入，P1 不重复定义。

export interface ExplorationConceptCardVM {
  conceptRevisionId: ID;    // 原 M2 CreativeConceptRevision.id
  conceptGroupId: ID;
  title: string;
  focused: boolean;        // 仅前端焦点，不修改 ConceptGroup.selectedConceptRevisionId
  selectedInGroup: boolean; // 从 M2 Group 精确读取；不是审批
  isActiveApproved: boolean;// 从 M2 /concepts/active 派生
  moodboardAssetIds: ID[]; // 保留原 M2 语义：AssetRef.id
  moodboardBindings?: ConceptMoodboardBinding[];
  moodboardBindingWarnings?: string[];
}

export interface StoryboardOverviewCardVM {
  displayedStoryboardRevisionId: ID;
  viewingContext: ViewingContext;
  shotId: ID;
  shotRevisionId: ID; // 当前视图来自指定 SB 的 orderedShotRevisionIds
  approvedShotRevisionId?: ID; // 若存在正式基线，用于并列对照
  draftShotRevisionId?: ID;    // 若存在待审草稿，仅作提示
  storyBeatId: ID;
  orderIndex: number; // 严格由指定 SB 的 orderedShotRevisionIds 顺序派生
  durationMs: number;
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_CHANGES'
    | 'APPROVED' | 'STALE'; // 历史实际审核字段，不等于当前有效性
  effectiveValidity: EffectiveValidity; // 派生评估
  selectedReferenceImageVersionId?: ID; // 当前具体 ShotRevision.activeReferenceImageId
  referencedCharacterIds: ID[];
  referencedSceneIds: ID[];
  warnings: string[];
}

export interface CanvasViewport {
  scale: number; // 有限数；建议界面范围 0.3~2.5
  panX: number;  // 有限数，平台应裁剪过大值
  panY: number;
}
export interface StudioPresentationPreference {
  projectId: ID;
  userId: ID;
  viewMode: StudioViewMode;
  storyboardViewMode: StoryboardViewMode;
  viewportByContext?: Record<string, CanvasViewport>;
  layoutByContext?: Record<string, Record<ID, { x: number; y: number }>>;
  // contextKey = `${projectId}:${userId}:${contextType}:${contextId}`；只属于当前用户 UI
}
```

**视图的查询上下文**：打开 `/storyboard` 时须知道 `viewingContext + displayedStoryboardRevisionId`。对指定 SB 的 `orderedShotRevisionIds`，逐一获取**该 ID 对应的指定 ShotRevision**，不可无条件把 `/shots/:shotId` 当前最新版填到历史视图。`APPROVED_BASELINE` 显示正式引用链；`WORKING_DRAFT` 显示当前草稿并可对照正式；`HISTORY` 强制只读。现有 M2 `GET /projects/:id/storyboard/revisions/:rid` 和 `GET /shots/:shotId/revisions` 足以按 ID 复原，无需发明另一套镜头主数据 API。

**已选参考图**：严格使用该 ShotRevision 的 `activeReferenceImageId`，校验图片所属 `shotId`、状态、权限、比例和内容可访问性。不能取候选列表第一张、最新一张或其他 Shot 的图片。若缺失显示“待选择/已失效”。

**导航**：从总览打开镜头，至少携带 `projectId`、`storyboardRevisionId`、`shotId`、`shotRevisionId`（例如原 `/studio/:id/storyboard?storyboardRevisionId=...&shotId=...&shotRevisionId=...`）；若历史只读则阻止原位保存，只有 Fork 能编辑。无效/越权 ID 返回明确提示并回退正式视图，不自动指向错误新版本。

**UI 偏好**：画布位置、缩放和平移仅是 UI 状态，绝不成为 `orderedShotIds`、正式 Storyboard 修改或收费授权来源。所有坐标必须为有限数，拖拽前后按范围裁剪，不得存入 NaN/Infinity；使用项目+用户+上下文隔离的私有命名空间，刷新和视图切换不影响业务数据。布局存储可以不实现持久化，临时内存状态也合法。

**动态镜头数**：由 `orderedShotRevisionIds.length` 实时计算，支持 0、1、6、15、50+ 镜头；空、删除/拆分、重复 ID、分页/懒加载及章节缺失均有定义行为。15 是 3D 简历 Mock Seed，不是产品硬限制。


# 5. 单一 API 目录和模块所有权（严禁重复写同一事实）

## 5.1 API 兼容策略

- **既有 M1/M2 接口全部保留**；不改已有 URL、请求结构、错误包裹、状态和列表分页。业务扩展接口只在本章列出一次。
- 表中的 URL 均为 Service 层不含 `/creative-video/v1` 的路径；RequestClient 统一添加 `/api`，不要代码中重复拼接 `/api/api`。
- 新接口在开发期 Nitro Mock 中必须真实修改/计算状态；组件仅调用 Repository Service，不允许自己读写全局 fixture JSON。
- API 采用现有 HTTP 动词含义；`POST /dependency-impact/preview` **只做纯计算**，不创建审核实体、不改变草稿或当前批准引用。
- 本文示例 `:id` 必须校验项目归属；`assetId`、`shotId` 属于路径对象时仍验证其 `projectId` 与路径 `:id` 相同。

## 5.2 已有接口：不动原业务合同

| 既有业务 | 维持原 API | 本次动作 |
|---|---|---|
| 资料提交快照 | `POST /projects/:id/ingestion/confirm` | **复用**；访谈形成的有效 USER_NOTE 参加来源集合 |
| 资料来源列表 | `GET /projects/:id/sources` | **复用**；可选多一个 REFERENCE_AD 来源类型（P1） |
| 上传资产元信息 | `POST /projects/:id/assets` | **复用**；不虚构已存真实二进制 |
| 理解修订编辑 | `PATCH /projects/:id/understanding/revisions/:rid` | **复用**；新增草稿可选裁决 refs |
| 理解修订 Fork | `POST /projects/:id/understanding/revisions/:rid/fork` | **复用**；批准历史不可修改 |
| 理解批准 | `POST /projects/:id/understanding/revisions/:rid/approve` | **复用**；新增按声明风险的服务端校验 |
| Visual Bible 管理 | `/projects/:id/visual-bible/revisions*` | **复用**；候选资产引用版本不动旧批准快照 |
| 单镜头修订 | `/shots/:shotId/revisions*` | **复用**；通过版本保存而不是覆盖已批准 ShotRevision |
| AI 改动计划 | `/projects/:id/director/change-plans*` | **复用**；扩展受影响对象和未来成本风险字段 |
| 预演批准 | `POST /projects/:id/animatic/snapshots/:aid/approve` | **复用**；新增当前有效性检查，不把钱包加进门禁 |
| 任务与进度 | `GET /jobs/:jobId`, `GET /projects/:id/jobs` | **复用**；新的 Mock JobKind 只作扩展 |

## 5.3 M1.1 增量接口（唯一规范）

| Method | Path | 作用与输入 | 输出 | 所属 Repository |
|---|---|---|---|---|
| GET | `/projects/:id/research/gaps` | 查询缺口与覆盖字段关联 | `ResearchGap[]` + 当前上下文 | ResearchRepository |
| POST | `/projects/:id/research/gaps/evaluate` | 重新计算缺口，幂等 + 场景 | `jobId` / 202 | ResearchRepository |
| POST | `/projects/:id/research/sessions` | `{ basedOnIngestionVersion }` + 幂等键 | ResearchSession | ResearchRepository |
| GET | `/projects/:id/research/sessions/:sid` | 会话、问题、答案 | 聚合视图 | ResearchRepository |
| POST | `/projects/:id/research/sessions/:sid/questions/next` | `{ expectedVersion, maxCount? }` | 下一批 ResearchQuestion | ResearchRepository |
| POST | `/projects/:id/research/questions/:qid/answers` | 答案/来源/预期版本 + 幂等键 | Answer + Question 状态 | ResearchRepository |
| POST | `/projects/:id/research/questions/:qid/skip` | 当前资料上下文跳过 | Question 状态 | ResearchRepository |
| POST | `/projects/:id/research/answers/:aid/confirm-fact` | 提议产品方事实，不直接 verified | 待审核建议引用 | ResearchRepository |
| GET | `/projects/:id/research/history` | 分页查看访谈来源 | 分页记录 | ResearchRepository |
| GET | `/projects/:id/claims/anchors` | query revisionId/targetId | ClaimAnchor[] | ClaimRepository |
| GET | `/projects/:id/claim-conflicts` | query status/severity | ClaimConflict[] | ClaimRepository |
| POST | `/projects/:id/claim-conflicts/scan` | `{ingestionSnapshotId, understandingRevisionId?, scenario?}` | `jobId` / 202 | ClaimRepository |
| GET | `/projects/:id/claim-conflicts/:cid` | 含证据/锚点/裁决 | 冲突详情 | ClaimRepository |
| POST | `/projects/:id/claim-conflicts/:cid/resolution-preview` | 决策草稿 + expectedVersion | 纯只读影响预览 | ClaimRepository |
| POST | `/projects/:id/claim-conflicts/:cid/resolutions` | 决策/理由/证据 + 幂等键 | ConflictResolution | ClaimRepository |
| POST | `/projects/:id/claim-conflicts/resolutions/:rid/approve` | 审批提议 + expectedVersion | 批准提议/报告新草稿引用 | ClaimRepository |
| GET | `/projects/:id/claims/readiness` | **必须指定** understandingRevisionId，script/shot 通过明确链版本 ID 可选 | ClaimReadinessItem[] | ClaimRepository |
| GET | `/projects/:id/understanding/revisions/:rid/evidence-snapshots` | 已冻结的证据来源版本与摘录（历史只读；遵守撤权） | `EvidenceLocatorSnapshot[]` | UnderstandingRepository |
| GET | `/projects/:id/assets/:assetId/content-versions` | 列出内容历史 | AssetContentVersion[] | AssetRepository |
| POST | `/projects/:id/assets/:assetId/content-versions` | 新版本元信息或 Mock fixture + 幂等键 | 新内容版本 | AssetRepository |
| GET | `/projects/:id/assets/:assetId/usage` | 反向查询引用（含历史） | AssetUsageRef[] | AssetRepository |
| PATCH | `/projects/:id/assets/:assetId/usage-metadata` | 既有 Metadata 的 expectedVersion | AssetUsageMetadata | AssetRepository |
| POST | `/projects/:id/assets/:assetId/reference-preview` | 指定草稿目标/内容版本 | 纯只读预览 | AssetRepository |
| POST | `/projects/:id/assets/:assetId/references` | 建立**草稿**资产引用 + 版本校验 | AssetUsageRef / 新目标草稿 ID | AssetRepository + M2 目标服务 |
| DELETE | `/projects/:id/assets/references/:refId` | 只删除草稿引用（需版本） | 操作结果 | AssetRepository |
| POST | `/projects/:id/assets/:assetId/replace-preview` | 预览旧版→新版波及对象 | 纯只读影响 | AssetRepository |
| GET | `/projects/:id/understanding/diff` | `fromRevisionId,toRevisionId` | UnderstandingDiff | UnderstandingRepository |

**兼容旧文档**：如果旧 M1.1 已提供 `/understanding/diff?from=R1&to=R2`，Service Adapter 可把传参规范化为**真实修订 ID**，不可让两条接口对应两份 Diff 数据；R1/R2 仅是展示编号，不可靠地用作全局唯一 ID。

**GET AssetUsage 的统一形状**：新可确定引用返回 `assetVersionId`（通用内容版本 ID）、`targetRevisionId`（若有）和是否当前正式使用；历史无法还原版本时必须不返回臆造的 `assetVersionId`。若历史尚无内容版本映射，明确返回 `unresolvedLegacy=true` 的只读兼容 ViewModel 或升级计划，**不要凭空编造可播放 URL**。

## 5.4 M2.1 增量接口（唯一规范）

| Method | Path | 作用 | 输出 | 说明 |
|---|---|---|---|---|
| GET | `/projects/:id/production-readiness` | 从当前 M1/M2 审核与版本链计算就绪度 | ProductionReadiness | **派生视图**，无独立审核按钮 |
| POST | `/projects/:id/dependency-impact/preview` | 只读分析“指定来源/资产/事实变化”的下游引用 | DependencyImpactPreview | 绝不产生可 apply 的第二套 ChangePlan |
| GET | `/projects/:id/generation-specs` | 当前已批准镜头的建议规格 | ShotGenerationSpec[] | 未批准镜头不得成为有效付费输入 |
| PUT | `/projects/:id/generation-specs` | 保存**非付费建议规格**；`expectedVersion + expectedApprovedShotRevisionId` 校验 | Spec/409/422 + 失效原因 | 不得自动重绑新版本，`mode` 与已批准 ShotRevision 一致 |

**V3.0 可视化页面 API 规则（P1）**：`/studio/:id/concepts` 的创意对比/探索视图，复用原 M2 `GET /projects/:id/concepts/groups*`、`GET /projects/:id/concepts/active`、原 select/favorite/fork/approve 接口；`/studio/:id/storyboard` 的分镜总览，复用原 M2 `GET /projects/:id/storyboard/revisions/:rid`、`GET /projects/:id/shots`、原 shots/reorder、ShotRevision/VisualBible/Asset Usage API。不新增 `/canvas/approve`、`/canvas/shots`、`/creative-branches/active` 或第二套视频审核接口。若将来需要服务端保存 UI 坐标，须另行评审一个**只写位置、不写业务**的偏好接口，本期不需要。

停止新建以下重复路由：

- ~~`GET /projects/:id/asset-usage?assetId=...`~~ → 使用 `/assets/:assetId/usage`。
- ~~`POST /projects/:id/change-impact/preview`~~ → 若是自然语言可执行修改，走原 `/director/change-plans`；如是其他事实/资产的纯影响计算，走 `/dependency-impact/preview`。
- 纯创意参考页 `/studio/:id/references` 为 P1 **页面**，不强制设一个独立新的工作流阶段或第二套文件上传服务。

### 5.4.1 修改影响的两个不同操作

**用户输入“镜头 07 人物换机器人”** → `POST /projects/:id/director/change-plans`，生成/读取 M2 原有的 `CreativeChangePlan`，用户点击**应用**才 Fork 新草稿。

**系统提示“产品说明书把自动发送改成提醒”** → `POST /projects/:id/dependency-impact/preview`，只返回关系/严重度/建议动作；如果用户选择进入具体镜头修改，再调用原有 Director/ShotRevision 服务。

两者可复用底层 DependencyGraph 计算器，但**不能复制业务对象或执行语义**。

## 5.5 API 一致性样例

创建或复用单个访问会话：

```http
POST /api/creative-video/v1/projects/project_crm/research/sessions
Idempotency-Key: interview-project_crm-batch01
Content-Type: application/json

{"basedOnIngestionVersion":4}
```

创建新的素材内容版本（Mock 元数据）：

```http
POST /api/creative-video/v1/projects/project_resume_3d/assets/asset_brand_logo/content-versions
Idempotency-Key: logo-v2-demo-001
Content-Type: application/json

{"expectedAssetVersion":3,"replacesVersionId":"asset_logo_content_v1","fixtureKey":"/demo-assets/logo-v2.png"}
```

**说明**：上述请求只展示建议参数。正式参数以已核对的现有 Asset Repository 和安全策略为准；`fixtureKey` 必须指向团队允许的**静态演示资源白名单**，不能成为任意网络 URL/文件读取器。

---

# 6. 端到端事务、版本有效性与状态机

## 6.1 资料补充到新理解版本：唯一规范顺序

```text
原 S1 + Understanding R1(APPROVED) + M2 旧分支
             │
用户补充产品事实 / 回答 ResearchQuestion
             ▼
ResearchAnswer(SUBMITTED) → USER_NOTE ProductSource（草稿/版本）
             │
与已存在资料共同校验是否包含敏感信息和是否可用于当前分析
             ▼
[复用] POST /ingestion/confirm → 新的 IngestionSnapshot S2
             │     仅冻结 ProductSource ID + sourceVersions + coverage
             ▼
[复用] POST /understanding/generate（明确传 S2.id）→ R2(DRAFT)
             │     R2.ingestionSnapshotId = S2.id；访谈答案作为来源证据/可选引用
             ▼
ClaimConflict.scan → ClaimConflict(OPEN)
             │
提出 ConflictResolution(SUBMITTED) → 责任人批准建议
             ▼
冲突裁决**作用于 R2 草稿**，新增相关 resolutionId 引用/安全文案
             │
[复用] UnderstandingRevision R2 的原确认接口/权限/版本校验
             ▼
R2(APPROVED) → 计算当前声明是否真正解除 BLOCKED
             │
M2 以 R2 为新候选上游；旧 R1 / 旧分镜 / 旧预演永久保留
             ▼
查看影响 → 按 M2 原流程生成候选、审核、形成新预演
```

**冻结地点唯一**：访谈是 `USER_NOTE` 对应 `ProductSource`，在新 `IngestionSnapshot` 固定其 sourceId/version；每次生成新 UnderstandingRevision 时冻结本次使用的 `EvidenceLocatorSnapshot`（来源版本与摘录）；`ConflictResolution` 是**产品理解判断和审核决定**，仅以 `relatedConflictResolutionIds?` 固定在 `UnderstandingRevision`。**不将 ConflictResolution 写入已批准资料快照，也不在旧 R1 上修改 `ingestionSnapshotId`。**

### 6.1.1 一个必须明确的事务边界

上面的“先批准冲突提议，再批准 R2”是**两个不同的操作**：

1. 冲突审核只给新 R2 草稿增加候选结论；不可改变旧 R1 的 `APPROVED` 内容，也不能让 M2 立刻认为新功能已审核。
2. **新 S2 必须走原 M1 `/understanding/generate`，并携带 S2.id**：原 `/understanding/revisions/:rid/fork` 只规定 `expectedVersion`，没有定义“切换为另一个资料快照”的能力，不能把 Fork(R1) 当作自动 Rebase。若需要迁移 R1 的人工文字修改，应由用户在 R2 草稿中显式采纳 Diff，不能偷偷覆盖新生成结果。
3. R2 最终批准时，Mock 服务用 `expectedVersion` 原子验证：资料快照未被错误替换、报告本身可审核、相关高风险营销主张已修正或排除、裁决提议仍属于同一项目。
4. 冲突 UI 中有“提议已批准、等待报告 R2 生效”的**中间态**；不能仅见 Resolution.APPROVED 就把 `Conflict.status` 或主张可用性全部显示绿色。
5. 若 R2 审核失败，Resolution 可以保持为已批准的提议但**未成为有效产品事实**；允许从新草稿继续审核，旧分支不变。
6. 冲突被判 `NEEDS_EVIDENCE` 时，该主张保持 `BLOCKED`；除非新报告彻底排除该主张，不能通过该宣称的审核门槛。

**错误处理**：回答保存成功但生成新快照失败，Answer 保持可重试提交状态；S2 创建成功但 R2 生成失败，S2 历史仍可查询、可重试生成 R2；不能为了“回滚整条流程”删除已经正式冻结的历史快照。每步用幂等键避免重复产生多个 S2/R2。

## 6.2 跳过、忽略和重新评价的区别

| 用户动作 | 当前题目 | ResearchGap | ClaimReadiness | 重新出现条件 |
|---|---|---|---|---|
| 选择“暂不回答” | SKIPPED | 仍 OPEN/TO_VERIFY | 不自动解锁 | 新资料上下文、新会话明确恢复 |
| 选择“该问题不适用”并填写原因 | DISMISSED | 按证据评估，未必 RESOLVED | 仍由声明/证据决定 | 来源变化、风险扩大、适用范围变化 |
| 给出答案 | ANSWERED | 等待来源纳入分析 | 不自动解锁 | 回答失效、事实发生变化 |
| 回答被纳入 S2 | INCORPORATED | 重新评价覆盖 | 按证据与 R2 审核 | 若 R2 尚未批准，仍不能当确定事实 |
| 提供有依据的事实/人工审核通过 | — | 根据资料变为 RESOLVED | 可以在 R2 正式通过后 USABLE | 新资料对其反驳时失效 |

**不得把“问题列表空了”当成“产品理解通过”或“所有声明都安全”。** 访谈完成数只是进度，不是准确率。

## 6.3 正式基线、工作草稿与历史：读取和失效矩阵（P0，FIX-18）

**永远区分三类上下文**：`APPROVED_BASELINE`（当前可用于正式生产的已批准版本链）、`WORKING_DRAFT`（用户正在探索/审核的候选）、`HISTORY`（特定旧正式或旧草稿，只读）。上游产品事实不止看单个 Shot 的 `reviewStatus`，而是对**完整版本链**和当前政策、素材访问状态进行判断。

| 事件 | 已批准历史 | 当前可用性 | 原则 |
|---|---|---|---|
| 新增未采用的普通品牌图片或探索卡位置变化 | 内容和批准状态原样保留 | 通常不影响正式链 | 只更新候选/布局；不改变引用 |
| 新建尚未提交/批准的 Concept/VisualBible/Shot 草稿 | 原正式快照原样保留 | 默认**不因存在草稿就自动失效**；如果已实现 M2 有更严格停止生产规则则保留原规则 | 正式指针、草稿指针分开；新草稿不能冒充正式 |
| 上传 Logo V2 但未采用 | 已批准版本仍指 V1 | 当前引用合法时不变 | 不自动把最新内容映射到历史资产 |
| **正式**批准新的 Understanding R2，改变核心产品事实 | 旧 R1/Brief/Script/Shot/Animatic 历史只读保存 | 依据原 M2 §9.3 和依赖引用标 `REVIEW_REQUIRED` 或 `BLOCKED` | 新 R2 不改旧上游 ID；创建新分支与复核 |
| **正式**批准新创意/剧本/视觉规范并更换当前创作基线 | 旧链仍可历史查看 | 受影响下游按依赖失效 | 新链需重新确认分镜及 Animatic |
| 被采用的参考图版本更新 | 旧图与旧镜头审核历史不动 | 对应 Shot 需新审核，受影响预演需复核 | 先 Fork/新修订，再批准 |
| 仅新增未采用参考图版本 | 旧链不动 | 不影响当前正式链 | 旧已选图未变 |
| 正式禁用高风险主张、素材被撤权/不可访问 | 历史保留 ID 和审计（字节访问仍受权限限制） | 依风险 `BLOCKED`，不能新付费生成 | 不允许靠旧审批绕过当前内容权益与事实安全 |

**两个平行状态**：原业务记录的历史审批状态如 `AnimaticSnapshot.status='APPROVED'` 永不因新事实而被原位改写；新增只读 `EffectiveValidity='CURRENT'|'REVIEW_REQUIRED'|'BLOCKED'` 是相对于当前产品事实/权属/当前正式活跃链计算的可用性。旧 `APPROVED + REVIEW_REQUIRED` 合法，旧 `APPROVED + BLOCKED` 也合法。既有 M1/M2 `STALE` 枚举继续保留，不迁移重命名。

**版本读取原则**：在历史 SB1 和草稿 SB2 中切换时必须通过 `orderedShotRevisionIds` 加载它们**各自的** ShotRevision 与 `activeReferenceImageId`；不能因为调用 `/shots/:shotId` 得到“当前最新”就用它覆盖指定修订。`ProductionReadiness` 不能用当前画布卡片/未批准草稿的状态取代正式链输入。

## 6.4 M3 进入条件和付费生成条件分离（P0）

```ts
// 与 §4.9 的 EffectiveValidity 保持同名同源；真实代码只从一个模块导出。
export interface ReadinessItem {
  key: string;
  label: string;
  status: 'PASS' | 'WARN' | 'BLOCKED' | 'NOT_APPLICABLE' | 'FUTURE';
  reason?: string;
  affectedShotIds?: ID[];
  actionRoute?: string;
}
export interface ProductionReadiness {
  projectId: ID;
  understandingRevisionId: ID;
  storyboardRevisionId?: ID;
  animaticSnapshotId?: ID;
  canEnterM3: boolean;
  effectiveValidity: EffectiveValidity; // imported from one canonical module
  evaluatedAt: ISODateTime;
  items: ReadinessItem[];
  hasUnapprovedDrafts?: boolean; // 信息提示而非另一个审批门禁
}
```

`canEnterM3 = true` 仅当原 M2 的**当前正式活跃**链齐全、版本引用一致且当前有效：`UnderstandingRevision → ApprovedCreativeBrief → CreativeConceptRevision → ScriptRevision + DurationPlan → VisualBibleRevision + StoryboardRevision(orderedShotRevisionIds) → AnimaticSnapshot(APPROVED)`，并符合原分镜与预演审核、事实主张与素材权属/可用性校验。链中任一步不一致、当前必需主张 BLOCKED、已选素材不可访问都不允许**新的**正式生产。

- `canEnterM3` **不依赖**钱包余额、M3 报价、费用审批、已生成视频数量或项目预算。进入 M3 是准备/选择/询价，不等于同意支付。
- 如果仅有未采用探索草稿，默认不重定向正式链；若 G0 确认现有 M2 实现了更严格“存在草稿则暂停制作”，保留原规则并在 `as-built-contract.md` 签字，不得无审查放宽。
- 真正付费生成必须在未来 M3 按**镜头、不可变生成请求、报价与用户授权**独立验证，本期不实现资金变动。
- M2 原 `§6.8` 规定审核每个 Shot 必须选择有效参考图。无论 `real_footage`、`motion_graphics` 等类型，本期仍**严格维持**；日后放宽必须另发 `QC-REFERENCE-OPTIONAL` 的合同变更、旧数据迁移与 E2E。
- 当前就绪面板必须说明它检查的是**哪个**已批准 StoryboardRevision 和 AnimaticSnapshot，不能只显示百分比或“已完成 15/15”。

## 6.5 资产内容版本与 M2 镜头版本的正确引用

```text
AssetRef (assetId=brand_logo, version=7: 元数据修改次数)
  ├── AssetContentVersion logo_v1（批准过的旧画面）
  │     ├── AssetUsageRef → VisualBibleRevision VB3
  │     └── AssetUsageRef → ShotRevision shot_12_R4
  └── AssetContentVersion logo_v2（新上传内容）
        └── 草稿候选（未采用）

ImageAssetVersion im_shot07_V3（M2 镜头参考图候选）
  └── 若实际源自同一个 M1 文件，关联 assetContentVersionId=logo_v1
```

当仅上传 logo_v2 时，原正式 VB3 / Shot R4 不应发生任何变化。点击“采用新 Logo”时执行：

1. 查询反向依赖并展示计划受影响的 VisualBible 和镜头列表。
2. 只在新草稿/ Fork 的 VisualBible/ShotRevision 引用 logo_v2。
3. 所有受影响的镜头按照原 M2 的审查门槛重新确认。
4. 新的 AnimaticSnapshot 按更新后的正式引用生成并审核；原 AN1 仍能只读展示（如内容仍获授权）。
5. 不得在运行时把 `AssetRef.activeContentVersionId` 自动替换成历史引用的具体版本。

## 6.6 权限矩阵（以原 M1/M2 已实现的 RBAC 为上界）

| 动作 | owner | editor | reviewer | 必须执行的服务端/Mock 校验 |
|---|---|---|---|---|
| 查看缺口、证据、冲突、历史引用 | 按项目授权 | 按项目授权 | 按项目授权 | 项目归属/租户边界 |
| 访谈提交/补充资料 | 可 | 可 | 默认只读 | source 权限 + expectedVersion |
| 发起冲突裁决建议 | 可 | 可 | 默认只读 | 只改候选，不解锁正式声明 |
| 批准冲突裁决/理解修订 | 有审核权才可 | 依原 RBAC | 在明确授予审核权限时 | 不能绕过 M1 既有 approve 权限 |
| 编辑 Visual Bible/镜头新草稿 | 依原 RBAC | 依原 RBAC | 默认只读 | 批准版本不可写 |
| 批准镜头/Animatic | 依原 RBAC | 依原 RBAC | 依原 RBAC | 与 M2 原审核权限相同 |
| 配置镜头生成建议规格 | 有编辑权限才可 | 有编辑权限才可 | 默认只读 | 必须引用批准 Shot Revision |
| 确认后续真实付费 | **本期没有** | **本期没有** | **本期没有** | M3 另行制定费用授权矩阵 |

**注意**：原 M1.1 文档中某些表格写了“owner 总是可以批准、reviewer 默认可以审核”，这里统一为“**只有项目已有真实 RBAC 允许时才有权**”。新增角色不扩大权限，角色名字不自动等于所有能力。

---
# 7. M1.1 页面改动——在现有 M1 上做增强

## 7.1 `/studio/:id/ingest`：智能研究助手

### UI 布局（不重做资料采集主流程）

原页面 URL 分析、演示授权、文件上传、来源证据列表、覆盖度、资料确认按钮必须完整保留。新增右侧可折叠研究助手 `ResearchAssistantPanel`：

```text
┌ 原有 Studio 顶栏 + 8 阶段 Stepper ──────────────────────────────────────┐
│ 已有：来源列表 / 文件上传 / 授权结果 / 资料覆盖度   [产品研究助手]       │
├───────────────────────────────────────────┬─────────────────────────┤
│ M1 已实现采集区（不删除、不重新造表单）     │ 当前 ResearchGap         │
│ URL / 录屏 / PDF / 截图 / 品牌素材          │ 为什么需要？影响什么？  │
│ 来源列表与证据链接                         │ 选择 / 自由描述 / 跳过  │
│                                           │ [保存回答][上传依据]     │
├───────────────────────────────────────────┴─────────────────────────┤
│ [保存来源] [确认资料快照并模拟分析] [查看产品理解]                      │
└─────────────────────────────────────────────────────────────────────┘
```

窄屏改 Drawer，且不能挡住“保存来源”和“确认快照”。Query 如 `?panel=research&questionId=q_1` 只影响本地 UI 定位，不增加新的 `ProjectStage` 或改变数据服务。

### 可操作行为与验收

| 操作 | 正确行为 | 禁止行为 |
|---|---|---|
| 初次打开 | 按来源缺口展示 1～3 个候选问题 | 所有项目固定弹出相同 10 题 |
| 回答 | 校验输入、保存 ResearchAnswer；创建/关联 USER_NOTE 草稿 | 答案直接将所有产品功能标记 verified |
| 跳过 | 当前会话暂不问，缺口仍可见 | 永久关闭所有类似问题 |
| 提供凭据 | 打开原 M1 上传控件，默认用途；成功后关联 source/evidence | 假定选中文件即上传完成 |
| 从已有来源引用 | 检查同一项目、当前可访问来源，创建关联 | 任意输入别的项目 sourceId 引用 |
| 重新评价 | 来源变化后用固定 Mock 规则重新计算适用问题 | 由组件本地列表决定哪些“真实事实”成立 |
| 确认资料 | 沿用原 `/ingestion/confirm` 生成 S2 | 直接改写原 S1 的来源集合 |

### 问题生成的 Mock 规则

- 输入必须包含 `ResearchGap`、项目类型 Seed、`ResearchContextRef`、历史问题/答案与已确认的 `sourceIds + sourceVersions`。
- `priorityScore` 只用于排序，不展示成模型准确率。
- 来源若补充了真实产品视频但缺少客户痛点，可优先问痛点；如发现“不支持自动发送”的冲突，则高风险事实问题优先。
- 同一个幂等键不得创建两个 ResearchSession 或重复 USER_NOTE；同一个 session/question 的重复答案请求根据业务版本返回原结果或 409。
- 不得将用户自由输入拼入未经转义的 HTML，也不得允许 Mock handler 通过任意 URL 访问网络。

## 7.2 原有 SourceCoverageItem 升级成“缺口行动”

原 M1 `SourceCoverageItem` 的 `code/status/evidenceIds/explanation` 是覆盖事实的唯一数据源。M1.1 `ResearchGap.coverageCode` 指回此项，作为**派生建议**。

展示每个缺口时必须有：

1. 当前覆盖状态：`CONFIRMED / TO_VERIFY / MISSING`（复用 M1）；
2. 为什么不足，依赖哪些来源；
3. 可能影响 M1 的何种价值线索，影响 M2 哪些阶段；
4. 明确的下一步按钮：回答问题、上传资料、查看证据、定位产品能力；
5. 允许本次忽略非关键建议；不允许以忽略解除被禁止的主张。

**不要显示“AI 理解准确度 80%”**。如果展示 4/6，只说明检查项 6 项中有 4 项符合定义，与模型理解准确率无关。检查项状态由 Mock/服务计算，刷新/添加来源后应更新。

## 7.3 `/studio/:id/understanding`：宣称冲突核验

保留原 M1 三栏结构及原有 Feature/Persona/PainPoint 卡片、证据抽屉、编辑、Fork、保存、审核按钮。新增顶部可折叠 `ClaimConflictDrawer`，用户点击某冲突后能看到：

- 争议声明原文、`ClaimAnchor.id` 和来源 `UnderstandingRevision.id`；
- 证据 A/B（可无 B）、来源 URL/文档页码/录屏时间戳；
- 来源是否适用于当前版本、地域、套餐；
- 严重度、当前是否允许用于对外营销、关联功能/剧本/镜头；
- 人工裁决候选、原因输入、预览影响、提交提议、审核状态；
- R1 已批准与 R2 草稿的状态对照。

### 处理两种不同的风险

**真正的互斥事实**：官网说“自动发送客户回访”，当前说明书说“仅提醒”。可裁决为 `REWRITE_SAFE` 并将新 R2 功能改成“跟进提醒”，保留证据和使用范围。

**只有无依据的声明**：“提高转化 80%”找不到统计依据。`evidenceIdsB=[]`；默认 `BLOCKED`，可选择删除/排除/改写为可证实的非量化说法，**不能凭用户点击“确认”把百分比升级成真实结果**。

### 裁决动作矩阵

| 决策 | 最低证据/操作要求 | 主张有效性的最终结果 |
|---|---|---|
| `CONFIRM_A` | 解释 A 适用版本/产品范围，有权审核 | 重新计算，不能一键认定 USABLE |
| `CONFIRM_B` | 同上，通常修改当前 R2 的 Feature | 旧 R1 不变，新 R2 审核后生效 |
| `REWRITE_SAFE` | 填有可核验的安全表述和证据 | 只在 R2 正式批准后可能 USABLE |
| `EXCLUDE_CLAIM` | 明确禁用原宣称（保留审计） | 原 Claim 保持不可用于营销 |
| `NEEDS_EVIDENCE` | 记录待补充事项 | BLOCKED，不能标 RESOLVED |
| `NOT_A_CONFLICT` | 必须记录版本/地区/套餐/语义适用范围 | 依据上下文重新计算，不自动通过 |

避免让 `ClaimConflict.status=RESOLVED` 成为单一“已证实”按钮。UI 必须同时显示**裁决提议审批状态 + 当前报告是否批准 + 当前 ClaimReadiness**。

### 来源/状态绑定说明（开发必读）

`ClaimAnchor.id` 指向某一修订中的原文。`claim-conflicts/scan` 即使未显式传 `understandingRevisionId`，也**必须从同一项目解析到一个具体的现有理解修订**；若目前只有资料快照、尚无理解修订，应先调用原 M1 `understanding/generate`，不能为了填充 `sourceRevisionId` 伪造一个修订 ID。将 R1 的“自动发送”改为 R2 的“提醒”后，R2 产生**新的 ClaimAnchor ID**。旧冲突可以记录 `resultingClaimAnchorId?` 指向替代表达，保留审计闭环。旧 Anchor 不能被覆盖或作为新表达使用。若尚未产出新 Anchor，显示“报告草稿待生成”，不允许伪造引用。

## 7.4 资产用途卡和“查看使用位置”

在原 `/studio/:id/ingest` 的素材卡上新增：

- 用途标签（Logo、真实产品画面、录屏、人物/场景参考等）。
- 资源来源、所有权/授权声明、敏感数据警告、内容版本（有的话）。
- “已在什么地方使用”：M1 来源、理解报告、M2 Visual Bible、镜头修订；按**正式版本/草稿候选/历史**分组。
- “替换内容”：先预览关联，再创建新的 AssetContentVersion；不会自动替换既有已批准分镜。
- “删除/撤销授权”：先显示影响，按照第 11 章做实际访问权限更新，不能以历史不可变阻止合法撤销。

**约束**：项目 A 用户不得查看项目 B 资产；不允许上传不明版权资源作为商业试用默认素材；`mayBeUsedForAnalysis` 与 `mayBeShownInFinalVideo` 两项是不同的用户权限和授权语义。

## 7.5 P1：理解报告差异 Diff（沿用 R1/R2）

- 只读选择 `fromRevisionId`、`toRevisionId`；显示 Feature、Persona、PainPoint、ValueAngleSeed、证据、禁语的**字段级**差异。
- M2 依赖项只显示影响摘要，不能通过 Diff 页面直接覆盖 M2 正式内容。
- “采纳到当前草稿”调用原 M1 PATCH；旧批准修订只读；Diff ViewModel 不拥有独立审核权限。
- 防止通过 `R1/R2` 文本前缀误选另一个项目的版本；所有比较均按项目 ID + revisionId 精确定位。

## 7.6 P1：参考广告（不要混进产品事实）

- 入口放 M1 原资料采集素材区，新的 `REFERENCE_AD` 类型默认属于 `CREATIVE_REFERENCE`，`includedInAnalysis=false`。
- M1 上传/版权说明/Mock 分析产生 `ReferenceAdInsight`（固定示例，无真实解码、ASR 或图像推理）。
- M2 的 `/angles` 可按用户选择读取 `ReferenceAdInsight.id` 的抽象创意语言；M2.1 的 `/references` 可选择**仅展示同一份** Insight（不是额外上传和解析服务）。
- 参考广告中的功能、成绩、品牌文字不能自动写到当前产品 `features[]`、`EvidenceRef` 或 `usableInMarketing=true`。
- 禁止复制他人受版权保护的独特镜头、脚本、角色或配乐；Mock 使用自制/明确授权素材。

---

## 7.7 与可视化创意探索的 M1 交接（V3.0 / P1，不在 M1 加画布）

- **M1 `/ingest` 不新增无限画布或创意方案流程。** 保留原产品资料采集、产品事实证据、研究访谈和资产用途标签。素材卡仅可增加“在创意中使用”的快捷入口，链接到现有 M2 概念/视觉规范并携带 `assetId`，仍受当前项目授权与版本约束。
- 用户的视觉偏好使用 M1 既有 `VideoProject.stylePreferences` / `negativeGuidance`、品牌规范和 `AssetUsageMetadata`；不得为了画布再造一个强制填写的 CreativeBrief，覆盖 M2 已有 `ApprovedCreativeBrief`。
- P1 参考广告仍由第 4.7、7.6 节负责：上传、授权与 `ReferenceAdInsight` 属于 M1 资产/创意参考路径；M2 只接收**抽象规律的 ID 引用**，并由用户明确采用。不能把广告中的竞品功能写成产品事实。
- M1 上传的 Logo、录屏、图片和角色参考资产可为 M2 的候选，资产 ID、内容版本与权属规则完全按第 4.2–4.3 节复用。**引用候选不等于已确认视觉规范/镜头**。

---
# 8. M2.1 页面改动——只增强原 M2 工作台

## 8.1 `/studio/:id/storyboard`：制作就绪度检查

在现有 M2 的分镜列表/编辑区/AI 对话区内选择**一个适合的可收起位置**增加 `ProductionReadinessPanel`；不要破坏 1366px 宽屏下原图文分镜编辑效率。

| 检查项 | 使用现有正式来源 | 显示状态 | 是否影响 `canEnterM3` |
|---|---|---|---|
| 已确认理解报告 | 当前 R1/R2 正式引用 | PASS / WARN / BLOCKED；需复核时另显示 `EffectiveValidity=REVIEW_REQUIRED` | 是；REVIEW_REQUIRED 时不可进入当前正式生产 |
| 创意方案已批准 | M2 既有正式创意版本 | PASS / BLOCKED | 是 |
| 剧本/时长有效 | ScriptRevision/DurationPlan | PASS / BLOCKED | 是 |
| Visual Bible 有效 | 已批准 VisualBibleRevision | PASS / BLOCKED | 是 |
| 当前镜头已批准 | `StoryboardRevision.orderedShotRevisionIds` 与每条 ShotRevision | `PASS/BLOCKED`，辅以已批准数/总数及具体未通过 ID | 是 |
| 参考图有效 | **按原 M2 当前要求** | `PASS/BLOCKED`，辅以有效数/总数及缺失 ID | 是 |
| 整片时长匹配 | 原 M2 的时间线算法 | PASS / BLOCKED | 是 |
| Animatic 已批准且当前有效 | AnimaticSnapshot + 有效性投影 | PASS / BLOCKED | 是 |
| M3 模型待选择 | 尚未开发的收费服务 | FUTURE | **否** |
| M3 预算/积分未批准 | M3 才办理 | FUTURE | **否** |
| 已生成视频进度（如 0/总镜头数） | 后续制作进度，分母由正式 SB 动态计算 | FUTURE | **否** |

每个阻塞项必须有来源的**真实 ID 和精确行动入口**：如“Shot 07 的参考图片版本不可用 → 打开镜头 07”；不能只有一个不可点击的红点。警告、阻塞、未来功能的视觉区分和文案必须准确。

**状态计算**必须从 M1/M2 的正式当前版本和依赖关系得出，不要在 Pinia 另外维护 `readyForM3=true` 导致 UI 与 API 不一致。

## 8.2 Visual Bible 增强：角色/场景/品牌资产引用

原 `CharacterBible`、`SceneBible`、`VisualBibleRevision` 是唯一视觉规则实体，原有 `characterIds/sceneIds`、`imageAssetIds/referenceAssetIds` 继续使用，不额外创建一套“虚拟角色”表。

建议在原抽屉中显示：

- 角色：正/侧/背参考图（如果有）、外观、服饰、禁变条件、使用镜头与修订号；
- 场景：基准图、景别、光照、氛围、引用镜头；
- 品牌：M1 已确认 Logo 内容版本、颜色、字体建议、不得出现的宣称；
- 素材来源：源自用户真实资料/Mock fixture/M2 图片候选，分别标记。

**不是每个镜头强制生成多角度图片**，不得为了 UI 完整把上传一张品牌 Logo 的用户逼去产生多张费用素材。

新增 `AssetReferencePicker` 时只做：选中已有 assetId/contentVersionId → 预览影响 → 在**新草稿 Visual Bible/Shot** 建引用 → 走原 M2 审核按钮。预览层不得为用户自动切换旧批准版本。

连续性警告在 Mock 用确定性 fixture：如“主角发型从蓝发变黑发”的预置不一致；**不得宣称自动用计算机视觉实测了真实素材**。

## 8.3 改动影响：增强原 `CreativeChangePlan`

原 M2 `CreativeChangePlan` 已具有 `impactedShotIds / invalidatedStageNames / risks / durationDeltaMs`。在既有计划 ViewModel 中可增加可选字段（旧记录缺失时默认空列表）：

```ts
export interface CreativeChangePlanM21View {
  changePlanId: ID;
  affectedShotIds: ID[];        // 从原 impactedShotIds 映射/扩充
  affectedAssetIds: ID[];
  affectedReviewSnapshotIds: ID[];
  changeCategory: 'LOCAL_TEXT' | 'LOCAL_VISUAL' | 'CHARACTER_GLOBAL'
    | 'SCENE_GLOBAL' | 'DURATION' | 'CREATIVE_DIRECTION';
  suggestedActions: Array<'EDIT_PROMPT' | 'REGENERATE_IMAGE'
    | 'REGENERATE_VIDEO' | 'RETIME' | 'REVIEW_ONLY'>;
  estimatedFutureCostImpact: 'UNKNOWN' | 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  staleReasons: string[];
}
```

这是**展示层投影**，不创建新的 `CreativeChangePlan` 主表；如给原对象添加字段，也必须全部可选兼容，旧 `MockJob`/Seed 无字段仍可显示。

P0 Mock 场景：把角色 `hero` 换成机器人 → 列出引用该角色的 03/07/08/11 镜头 → 用户确认后 Fork VisualBibleRevision 和相关 ShotRevision → 旧批准内容保留、当前预演有效性失效。仅改旁白一个词 → 只新建对应 Shot 草稿，不能把 15 镜头全部清零。

注意：这里的费用只是**未来可能成本影响的定性提示**，M2.1 既没有实际报价服务也不能消耗积分；实际费用在 M3 必须重新报价。

## 8.4 `/studio/:id/animatic`：预演后生产准备

保留已有播放、Pause/Seek/字幕、时间线、跳镜头、评论、确认 Animatic 的全部能力。

新增区域：

- 当前正式 `AnimaticSnapshot.id`、总时长、镜头数、已采用素材数；
- 按原 `ShotRevision.generationMode` 分组显示：AI 视频、动效、真实素材、静态图动画；
- 每镜头的建议时长、目标画面比例、来源素材和 M3 可选的模型档位；
- 总体费用只显示**“M3 会按实际模型/请求逐次报价”**，不展示未经服务支持的“官方价格”；
- “进入镜头生产工作台”只由原 M2 审核门禁决定；尚未实现 M3 时仍为**带说明的占位入口**。

**混合素材不等于自动免费**：已有真实素材/程序化动效可能仍涉及存储、版权、渲染或收费工具。不能简单用 `mode !== 'ai_video'` 将其标为 0 成本；未来应基于实际计费服务和报价判断。

## 8.5 生成规格保存策略（避免双写）

- 由**指定已批准 ShotRevision** 导出建议规格及 `ShotGenerationSpecView`；默认只读即可交付 P0。若提供“保存生成建议”，须按 §4.8 和 §5.4 的版本校验写入独立**非付费草稿 Spec**。
- `mode`、`durationMs` 与已批准镜头一致；用户修改创作语义必须走原 M2 Fork、提交审核及批准流程。模型档位建议不构成实际计费授权。
- 变更已批准镜头、视觉规范、采用的图片、通用素材内容版本或画幅后，旧 Spec 可读但标 `OUTDATED/BLOCKED` 并展示具体 reasonCodes；不得在读时自动重绑 ID。未采用候选或纯布局变化不能使正式 Spec 无故过期。
- 未来 M3 申请报价时必须根据不可变请求快照重新计算，而不能重用旧 Spec 等同于用户授权。

## 8.6 `/studio/:id/concepts`：创意对比与轻量探索（P1；严格原 M2 审批）

原 M2 `§4.2` **已经有三列方案、情绪板、对比、收藏、选择、再生成及历史组**；因此仅在同一页面增加 **「方案对比（默认）」/「自由探索（可选）」** 的 UI 视图，不做另一个 Concept 管理后台。

### 8.6.1 页面模式与两种“选择”

1. **UI 聚焦**：`focusedConceptRevisionId` / VM `focused=true`，可以聚焦任何有权查看的候选，只影响当前页面、个人展示偏好；不能修改 `ConceptGroup.selectedConceptRevisionId`。
2. **持久组级选择**：只能通过原 `POST /projects/:id/concepts/groups/:gid/select`，其 `selectedConceptRevisionId` 不等同 `APPROVED` 或 `active`。
3. **正式采纳**：只有经原 `submit-review/approve` 且当前有效的 `CreativeConceptRevision` 才能通过 `/concepts/active` 提供给 `/script`。不得把点击/收藏/空间拖动当作审核通过。

**文档基准顺序**（原 M2 §4.5 第 6 点）为 `DRAFT → submit-review → WAITING_REVIEW → group/select → approve → /concepts/active`。G0 必须核实真实 `select/approve` handler：如果已交付代码与上述保守顺序不同，登记 `AS_BUILT_DELTA`，经负责人确定兼容策略和测试后方可改；**不得因画布需求私自替换既有 API 语义**。无论实际先后，`/script` 只接受正式审批版本。

### 8.6.2 Moodboard 内容与元素组合

- Moodboard 使用 M2 `CreativeConceptRevision.moodboardAssetIds` 作为 `AssetRef.id[]`，新增 `conceptMoodboardBindings?` 精确绑定 `AssetContentVersion.id`。不得把 `ImageAssetVersion`（绑定 shotId）当做概念情绪板文件；历史未映射版本显示「未确定」，不得暗示已确定版本。
- 概念阶段的 `ConceptStory.leadCharacter` / `mainSetting` 是**文字设定**，不是后续 `CharacterBible.id` / `SceneBible.id`；组合前不能引用一个尚未创建的正式角色/场景实体。
- 用户组合 A/B/C 的创意维度，必须**同 projectId、同已批准 briefId（与 `ConceptGroup.briefId` 一致），并且对应的理解修订、目标营销规格、素材权属相容**；跨项目、跨 Brief 或来源过期均禁止自动合并，提示先重新确认上游 Brief。
- 选择合法 `baseConceptRevisionId`（建议来自当前 `ConceptGroup`），展示来源 A/B/C 的具体字段和风险，使用原 `POST /concepts/revisions/:rid/fork` 产生新草稿，再 `PATCH` 编辑；**Fork 结果必须由原 Concept Repository 原子加入其合法 `ConceptGroup.conceptRevisionIds`**，保留 `parentRevisionId` 与审计来源（可选 `compositionProvenance[]`，不改原必填 DTO）。若当前 Fork handler 未保证入组，由 G0 先提出兼容修订，不得 UI 私下维护一份 group 关系。
- 对新组合重新计算 `claimEvidenceIds`、主张与素材合法性、`riskNotes`、可支持时长及差异性；不得把 A/B/C 证据的简单并集视为全部可证实。组合产出新 D 草稿，原 A/B/C 三初始候选仍可查、不覆盖。
- 组合 D 走原 `submit-review → select → approve`（或 G0 记录的实际受控兼容序列），批准后下游脚本/分镜/预演依赖关系按原 M2 §9 处理。当前 P1 不支持两个正式 active 制作链并行。

### 8.6.3 交互与权限

- 画布平移/缩放/卡片位置改变**只影响 §4.9 私有偏好**，不调用 `fork`、`approve`、`select`、`shots/reorder`、预算接口。
- 资产展示按权属过滤：可分析不代表可用于最终片；无授权或已撤权图片不渲染原图、不提供下载，历史 ID 和审计仍可读。
- 1366px 以下优先降级为三列对比+抽屉；未采用候选保留，UI 始终标清“预览/已提交审核/已批准/当前有效”。

## 8.7 `/studio/:id/storyboard`：全片总览视图（P1；FIX-17/18）

原三栏逐镜头工作台继续默认使用，新加 **「逐镜头（默认）」/「全片总览」**。按照**用户明确选择的 StoryboardRevision** 渲染其 `orderedShotRevisionIds`，按 StoryBeat/场景分组显示镜头卡、时长、正式审核状态、当前有效性、角色/场景、证据与选定图片。不限定为 15 镜头。

### 8.7.1 读取与导航合同

- 每张卡从该 SB 的具体 `shotRevisionId` 获取 `ShotRevision`；绝不以 `GET /shots/:shotId` 的 latest 作为所有上下文的权威内容。
- 图片只选当前 Shot 的 `activeReferenceImageId`，必须在 `referenceImageVersionIds` 列表内，且所属 shot、可访问状态和比例通过校验；不能用候选列表第一张或最新图替代。
- 页面同时标记 `viewingContext=APPROVED_BASELINE|WORKING_DRAFT|HISTORY`、`reviewStatus` 和派生 `effectiveValidity`，避免把“历史已批准”和“现在仍可生产”混为一谈。
- 点击镜头时保留 `projectId + storyboardRevisionId + shotId + shotRevisionId` 的锚点；目标原 `/storyboard` 根据同版本定位，不自动打开最新版；历史强制只读，编辑必须先 Fork。
- 0/1/6/15/50+ 镜头均可展示；根据原数据动态按 Beat 分组，缺失/重复 ID 要显示阻塞提示，不能靠数组下标或写死 15 个卡片。

### 8.7.2 空间布局与影片顺序是不同操作

**A. 视觉排列卡片（低风险）**：拖动改变 x/y、缩放和平移，只存 §4.9 私有 UI 偏好。不改变 `StoryboardRevision`、`ShotRevision.order`、`storyBeatId`、时间线、审核或预演有效性。卡片 x 坐标**绝不**用于推导播放顺序。

**B. 明确点击「调整影片播放顺序」（高风险）**：进入独立对话框，须满足以下**原 M2 API 不变**的事务：

1. 读取期望的 SB 草稿/正式版本及 `expectedStoryboardVersion`，校验当前用户具有编辑权限；从该 SB 的 `orderedShotRevisionIds` 映射为 `orderedShotIds`，去重并确认**与原集合完全相同、无遗漏无新增**。不可把 revision ID 当 `shotId`。
2. P1 仅允许在**同一个 `storyBeatId` 内**调整顺序；跨 Beat/想更改归属必须返回剧本节拍编辑（改 ScriptRevision 并重新审核），**不能**在排序时静默重写 `storyBeatId`。
3. 先预览前后差异：影响 Shot IDs、相邻镜头转场 `transitionOverlapToNextMs`、章节内节拍时间、净时长及需要重新审核的镜头/预演。转场合法条件不只是 `overlap <= 当前镜头 durationMs`，还应满足 `overlap <= 下一镜头 durationMs`；无效则先修订相关 Shot，不得提交非法排序为正式。
4. 调用原 `POST /projects/:id/shots/reorder`，请求仍为 `{ expectedStoryboardVersion, orderedShotIds }`（以及原 handler 现存的必要身份/幂等信息），在 Mock/未来服务端**单个原子业务命令**中校验全部前置条件，并创建**新的 StoryboardRevision 草稿**；所有因顺序/相邻转场改变而需要更新 `order`/`transitionOverlapToNextMs` 的 ShotRevision 必须通过**新草稿修订**处理，不可原位修改任何已批准 ShotRevision。
5. 新 StoryboardRevision.orderedShotRevisionIds 指向**对应的新或未改变的准确修订 ID**；按原 `ShotRevision.order` 冗余字段与新正式顺序保持一致的合同验算；重新校验故事 Beat 关联、预演净时长、风险/证据/引用和镜头审核。受影响修订需原 M2 审核后才能批准新 SB。
6. 旧 SB1/旧 ShotR1/旧 AN1 保留历史只读；新 SB 必须生成并审核**新 AnimaticSnapshot**才能构成新的生产基线。409 并发失败需保留本地排序意图，刷新最新 SB 后由用户重试，不可局部提交一半。

**注意**：原 M2 `POST reorder` 已存在，本期修改的是服务端 Mock 的事务正确性/差异核对，不创建 `canvas/reorder` 另一路由。如果现有 handler 不支持以上原子性，G0 记录并先修订 handler+测试，绝不能仅用前端顺序数组“补丁”。

### 8.7.3 视觉依赖图、局部修改与历史安全

- 角色/场景/Logo → 使用镜头的关系图是 **只读** AssetUsage + VisualBible + Shot IDs 的投影，不通过拖线直接更改依赖；采用资产通过原 Fork/草稿/审核和版本绑定。
- M2 所称「局部重新生成」仅指参考图/结构化剧本的 Mock 候选；视频片段生成属于 M3。图像候选、字幕/Prompt 草稿和具体镜头审阅状态必须在对应修订里可追溯。
- 视频前置的原 M2 全镜头参考图审核门槛不变；素材撤权时禁止无权访问的缩略图/下载，并让依赖该素材的新生产就绪 `BLOCKED`。
- 单纯拖动位置、切换展示模式、临时放大、浏览未采用候选不能使当前已批准链无故失效。被明确采用或正式批准的改动则按原 M2 §9 的依赖失效规则执行。

# 9. M3 交接合同：只冻结边界，不提前开发收费系统

## 9.1 哪些来自 M2，哪些属于 M3

M2.1 只负责向 M3 **读取**已批准且有效的：

- `projectId`、项目视频比例与语言；
- `understandingRevisionId`、创意/剧本正式修订；
- `storyboardRevisionId`、`orderedShotRevisionIds`；
- `visualBibleVersionId`、角色/品牌素材内容版本；
- `approvedAnimaticSnapshotId`；
- 每镜头 `shotRevisionId`、`generationMode`、`durationMs`、选定参考图版本；
- 当前 `ClaimReadiness` / `EffectiveValidity` 与禁止宣传主张；
- 建议 `ShotGenerationSpec`（如实现）。

M3 将独立承担：具体模型和参数选择、供应商价格版本、真实报价、冻结额度、授权、后台任务与回调、生成视频候选、版本确认、账务与对账。**不得将 M3 的字段反写进已批准的 M2 `ShotRevision` 作为“当前最新生成状态”。**

## 9.2 不可变付费请求快照（M3 的未来标准）

```ts
export interface GenerationRequestSnapshot {
  id: ID;
  projectId: ID;
  shotId: ID;
  shotRevisionId: ID;
  storyboardRevisionId: ID;
  approvedAnimaticSnapshotId: ID;
  visualBibleVersionId: ID;
  referenceAssetVersionIds: ID[];   // AssetContentVersion.id
  referenceImageVersionIds: ID[];   // ImageAssetVersion.id
  generationMode: ShotGenerationMode;
  modelId: string;
  providerId: string;
  modelVersion?: string;
  promptHash: string;
  negativePromptHash?: string;
  durationMs: number;
  resolution: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  audioEnabled: boolean;
  candidateCount: number;
  providerPriceVersion: string;
  createdAt: ISODateTime;
}

export interface GenerationQuote {
  quoteId: ID;
  generationRequestSnapshotId: ID;
  requestHash: string;            // 服务端 canonical 序列化后计算
  credits: number;                // 整数积分；本期仅合同
  expiresAt: ISODateTime;
  priceVersion: string;
}
```

**以下参数若影响实际供应商请求或费用，也必须包含在不可变快照中或由其确定性引用**：模型级别、采样参数、输入文件内容版本、参考图权重、声音/语言、提示词、尺寸、候选数量、时长、服务商价格版本。不能只在前端显示“8 秒，24 积分”而在后台偷偷增加候选或换贵模型。

`requestHash` 由服务端对**规范化的完整请求**计算；客户端不能自行填写费用或哈希绕过审批。`Quote` 只对精确请求、用户、项目、价格版本和有效期有约束，发生任何付费相关变化必须重报价。

### 9.2.1 未来正常交易顺序（此文档只要求前端预留）

```text
M2 当前有效且批准 → M3 选择镜头与模型
  → POST generation-quote（产生请求快照 + quote）
  → 用户看到明确价格/模型/时长/候选数
  → 有权用户手动批准指定 quote
  → 后端原子校验余额/项目预算/版本/权限
  → HOLD 冻结额度并创建幂等 GenerationAttempt
  → SUBMITTED/RUNNING/RECONCILING
  → 成功且候选可用：CAPTURE；明确失败：RELEASE
  → 生成候选 != 用户批准的正式视频版本
  → 用户确认候选 → 更新本镜头采用的视频版本
```

- `已消耗 + 已冻结 + 本次预冻结` 不得超过用户设置的项目预算和钱包余额；并发请求必须在服务器事务里校验。
- 同一个 `Idempotency-Key` + 相同请求只会创建一个尝试；同 key 不同 body 必须报冲突。
- 网络超时但供应商任务状态未知进入 `RECONCILING`，不能立刻自动重复提交和重复冻结。
- 成功候选被用户拒绝不会自动返还已经实际发生的费用；切换到之前已付费的历史候选不重复收模型生成费。
- 所谓 AI Studio 的“超预算止损比例”不等于用户的消费授权，**不能在超过已授权总额时静默执行请求**。
- M3 API 首次生成不要命名为“regeneration-only”。如原增量稿写 `/regeneration-quote`，仅在 M3 需要兼容旧 UI 时做适配；建议统一 `/shots/:shotId/generation-quotes`（M3 接口设计时冻结）。

## 9.3 M2.1 当前阶段允许展示什么

只允许展示：建议生成方式、所需素材、是否缺少预演审核、未来可能存在费用、Mock 模型档位占位、进入 M3 的准确门禁。

**不允许**展示真实“已扣积分”、真实订单编号、已审批支付状态，也不允许调用真实视频模型，除非将来正式进入 M3 且通过新的权限与交易系统验收。

---

# 10. 旧 M0/M1/M2 Seed 的安全迁移和兼容规则

## 10.1 迁移目标

旧 Seed 与持久化项目**必须仍能打开**：项目列表 → 资料采集 → 已确认理解 → 三套创意 → 已批准剧本 → 分镜 → 120 秒 Animatic。升级不是重置测试数据或重新生成全项目 ID。**V3.0 所保留的 `StudioPresentationPreference` 完全可缺省；旧数据不需要创建画布节点或迁移业务主键。**

建议维护 `FeatureSchemaVersion`（仅新扩展模块），不要擅自覆盖已有 Nitro Mock 数据 schema 标志；变更时：备份 → 幂等迁移 → 校验引用 → 执行测试 → 才切换新版 handler。

## 10.2 明确的旧字段映射

| 旧数据字段/场景 | 新系统读取方式 | 必须保持 |
|---|---|---|
| M1 `AssetRef.id` | 继续同一资产身份 | 不能替换成 AssetContentVersion.id |
| M1 `AssetRef.version` | 元数据乐观锁 | 不能当“Logo 内容 V2” |
| M1 旧 asset 只有元数据 | 生成**稳定**初始内容版本记录（若无可用文件标 `UNAVAILABLE`） | 不虚构已经上传成功的真实文件内容 |
| M1 `SourceKind` 七个原值 | 原样读取 | P1 才增 `REFERENCE_AD` |
| M1 `SourceCoverageItem` | 现有覆盖状态 + 新 Gap 关联 | 不能再造覆盖事实表 |
| M1 `EvidenceRef.level` | 保留原四级语义；新理解修订冻结 EvidenceLocatorSnapshot | 用户补充不自动变 verified；旧摘录无法证明时标 Legacy Unresolved |
| M1 `UnderstandingRevision` R1 | 已批准只读 | 新字段可选，不更改原 R1 记录 |
| M2 `ImageAssetVersion.id` | 继续镜头候选图 ID；`shotId` 仍必填 | 不当作通用素材内容版本 ID，不能直接用作 Concept moodboard |
| M2 `CreativeConceptRevision.moodboardAssetIds` | 继续 AssetRef.id[]；P1 可用绑定表冻结 AssetContentVersion | 不混入内容版本 ID 或 Shot 图 ID |
| M2 `ShotRevision.generationMode` | 继续原四个小写值 | 不写入 M2.1 大写字符串 |
| M2 `CreativeChangePlan` | 继续唯一的可执行变更计划 | 不建立第二套 Apply/Discard |
| M2 `AnimaticSnapshot(APPROVED)` | 仍是已批准的历史快照 | 当前是否失效由派生视图表达 |
| M2 15 镜头/120 秒 fixture | 精确保持原时长和审批语义 | 不因 M2.1 类型新增变成“全部待审核” |

## 10.3 迁移算法注意事项

**内容版本初始 ID 必须可重复计算且不会覆盖已真实存在的 ID。** 如统一采用 `asset-content:` + `assetId` + `:v1`，先检测重名和现有迁移状态；实际项目如有数据库主键/UUID 策略，按既有策略生成并写持久映射，**不能每次刷新重新随机生成**。

旧 UnderstandingRevision 与 EvidenceRef 若缺 Source 历史版本，应按 §4.4.1 创建 `LEGACY_EVIDENCE_UNRESOLVED` 只读证据定位快照，不能用现在的证据摘录代替过去内容；新高风险主张不能只依赖无法恢复的旧来源。

旧已批准 CreativeConceptRevision 的 `moodboardAssetIds[]` 只能视为 AssetRef.id[]，无法确认当时的素材内容版本时不得默默绑定最新，P1 可提示另建草稿选择内容版本；旧组/旧候选的审批保持不变。

旧已批准 ShotRevision 可能只持有 `ImageAssetVersion.id`，也可能使用 M1 `AssetRef.id` 作为源；迁移可以新增**兼容引用映射表**供反向查询，不能直接去编辑已批准 ShotRevision 的 JSON。**无法确认旧内容具体字节版本时必须标明 LEGACY_VERSION_UNRESOLVED，不能把旧批准镜头虚假映射到当下最新 Logo 并宣称“历史未变”。**

**只读迁移与内容变更区别**：迁移补充索引/映射可直接进行，但替换已批准业务内容必须走新的业务修订和人工确认。缺少映射时显示“历史素材引用待匹配”，不错误地把最新内容绑定给旧镜头。

## 10.4 需要做的四组 Mock Seed

### Fixture A：3D 简历（原有 120 秒/15 镜头）

- 保留全部项目/剧本/镜头主键和时间线（原 M2 seed）；
- 人物 `hero` 被镜头 03、07、08、11 引用；
- Logo 旧版被 Visual Bible 和片尾镜头引用；
- 新 Logo 只新增 `AssetContentVersion` v2，未采用前不使旧镜头失效；
- 全局换机器人会产生影响预览并要求原 M2 的重新审核。

### Fixture B：CRM 宣称冲突

- 官网证据：“自动发送客户回访”（标明来源类型）；
- 说明书证据：“当前版本仅提供跟进提醒”；
- 将争议功能映射到具体 Feature/ClaimAnchor（存在同项目、同 revision）；
- 数字“转化率提升 80%”是**无依据宣称**，`evidenceIdsB=[]`；
- 用户选择当前仅提醒：产生 R2 草稿及安全表达；R2 审核后，旧 R1/旧创意仍可历史查询但不能被当成当前有效新制作分支；
- 其他没有争议的 CRM 功能可以继续创作，不能将整个项目永久封禁。

### Fixture C：研究问题跳过/恢复

- 用户首次跳过重要问题，当前会话不重复弹题；
- 新资料入库后重新计算 Gap；需要时能够重新提示；
- 即使该题不再出现，旧不实的百分比主张仍 `BLOCKED`。

### Fixture D：创意组合与精确分镜阅读（P1）

- 同一已批准 Brief 的 A/B/C 三方案，可 Fork 组合出 D 草稿，原 Group 同步包含 D、A/B/C 不丢失；跨项目/跨 Brief 组合返回拒绝。
- Concept moodboard 引用 M1 AssetRef.id 并冻结指定 AssetContentVersion.id；旧没有绑定的旧 Concept 显示版本未知。
- SB1 已批准与 SB2 草稿分别含同一 Shot07 不同 ShotRevision/activeReferenceImageId；总览切换必须精确显示各自版本。
- 同 Beat 调整顺序：新 SB 与必要 Shot 草稿，旧已批准历史不变；跨 Beat 拒绝；转场非法不可批准。

### Fixture E：参考广告（P1，明确自制/许可）

- 标记 `CREATIVE_REFERENCE`、`includedInAnalysis=false`；
- 产出抽象 `ReferenceAdInsight`，被 `/angles` 选择后出现“灵感来源”标签；
- 不会改变产品 Feature/Persona/EvidenceLevel 的可信度。

## 10.5 升级与回滚

1. 升级前导出/备份 Seed 和 Mock 当前状态，不假定本地持久化内容可自动恢复。
2. 加载旧数据并运行可重复执行的 migration；同一个迁移执行两次不能产生重复内容版本/冲突锚点。
3. 跑完第 12 章回归；若有一项 P0 失败，不允许声称兼容已经完成。
4. 回滚功能标志时，新数据**只能隐藏/只读**，不能偷偷删除旧业务正式审批记录。
5. 版本不支持时显示“当前 Mock 数据版本不兼容，需要迁移/恢复”的明确提示；不要陷入无限刷新。
6. 生产接入真实 API 前，单独设计多租户及数据库 schema migration；本文件前端/Mock 迁移不能替代真正的数据库迁移。

---

# 11. 安全、权限、错误处理与异常边界

## 11.1 资产撤销、敏感信息与历史快照

- 历史快照结构保留 ID、时间、版本和审计，但**有权撤销的内容、涉敏信息、被禁止传播的素材**不得因为“历史不可变”而被继续提供原文件预览或导出。
- 撤销可令 AssetContentVersion 状态变 `REDACTED`；这属于**访问/可用性层**改变，而不是更改镜头历史内容。旧镜头显示占位+撤销提示，并阻止需要此内容的新生产。
- 上传录屏涉及联系人、账号、客户信息等需在 UI 提醒脱敏；Mock fixture 不得包含真实客户数据或真实登录凭据。
- 开源项目许可：AdCraft 公开仓库的非商业使用限制意味着不能未经授权将受限源码/资产并入 VidCraft 商用产品；AI Studio 的 MIT 许可若复用需保留声明并审查三方内容。本期**只借鉴功能设计模式**。
- 用户参考广告仅能用有合法处理/分析权限的文件；不要为了复刻他人视频而复制独创故事、画面、台词、人物、音乐和品牌。

## 11.2 服务端 / Mock 权限检查

- 所有 GET/POST/PATCH/DELETE 都应校验当前用户、项目、资产/修订所属关系；不能只在页面隐藏按钮。
- 默认 Reviewer 不允许直接提交访谈、改素材、发起收费；Reviewer 的审核能力按现有项目权限决定。
- `Idempotency-Key` 的作用范围包含账号/项目/接口，且同一 key 传不同 body 返回冲突；服务端还必须确保同一版本命令的原子性。
- 不在 `.env`、Pinia、LocalStorage、Mock fixture 中保存真实密码/API Key/长期 session Token。
- `rightsStatus='DECLARED'` 表示用户自述有权，不是平台完成了法律审查；不能自动开启所有外部发布权限。

## 11.3 新错误码（遵循旧 ApiResponse<T>）

| Code | HTTP | 前端行为 |
|---|---|---|
| `RESEARCH_STALE_VERSION` | 409 | 重新读取 Gap/资料上下文并保留未提交答案 |
| `QUESTION_ALREADY_ANSWERED` | 409 | 读取现有答案，不重复写 USER_NOTE |
| `QUESTION_OPTION_INVALID` | 422 | 提示已更新的选项，保留文本 |
| `RESEARCH_PERMISSION_DENIED` | 403 | 显示只读、禁止提交 |
| `EVIDENCE_NOT_FOUND` | 404 | 显示不可访问来源，而不是伪造来源链接 |
| `CONFLICT_DECISION_INCOMPLETE` | 422 | 要求原因/适用版本/安全改写 |
| `CONFLICT_UNRESOLVED` | 409 或 422 | 标明被阻塞的**具体 ClaimAnchor**，不封禁其他卖点 |
| `ASSET_REFERENCE_IN_USE` | 409 | 给出已批准引用和草稿引用，支持预览处理 |
| `ASSET_CROSS_PROJECT_DENIED` | 403 | 拒绝跨项目引用 |
| `ASSET_CONTENT_UNAVAILABLE` | 422 | 不假定历史浏览器 Blob URL 仍可用 |
| `REFERENCE_AD_RIGHTS_NOT_CONFIRMED` | 422 | 不允许 P1 参考广告分析/采用 |
| `REVIEW_EXPECTED_VERSION_CONFLICT` | 409 | 保留用户草稿，拉取新版本对比 |
| `MOCK_SCENARIO_UNAVAILABLE` | 404 | 恢复默认演示场景 |
| `PAID_GENERATION_NOT_AVAILABLE` | 409 | M2.1 无真实生成能力，不能扣费或模拟已付费 |
| `CONCEPT_CROSS_BRIEF_COMPOSITION_DENIED` | 422 | 拒绝跨 Brief/项目组合并保留全部旧候选 |
| `CONCEPT_GROUP_MEMBERSHIP_CONFLICT` | 409 | 合法 Fork 必须原子加入原 Group；不创建游离草稿 |
| `MOODBOARD_ASSET_VERSION_MISMATCH` | 422 | 原 moodboard 数组只接 AssetRef.id；内容版本属于该 Asset 才可绑定 |
| `STORYBOARD_REORDER_BEAT_CONFLICT` | 422 | 本期跨 StoryBeat 排序需先改剧本，不改原镜头关系 |
| `STORYBOARD_REORDER_INVALID_TRANSITION` | 422 | 转场与时长/Beat 区间不合法；不给半成品批准 |
| `EVIDENCE_VERSION_UNRESOLVED` | 422 | 旧证据来源/摘录无法证明，不可当新高风险主张唯一支持 |
| `GENERATION_SPEC_OUTDATED` | 409 | 旧 spec 与正式镜头/素材/画幅不符，要求重新检查保存 |
| `ASSET_RIGHTS_REVOKED` | 403 | 撤权内容不返回原字节与下载链接，历史仅保留安全元数据 |

403/404 不泄露其他项目资产细节；输入校验错误包含 fieldPath 和可读提示，但不回显秘密、原始 Token 或敏感内容。

## 11.4 可操作的加载、空态、失败态

- 访谈正在生成：显示轮询进度和 Mock 标志，可取消，失败可重试；刷新能恢复任务或告知任务已过期。
- 新来源尚未进入资料快照：显示“待纳入分析”，而不是“报告已自动更新”。
- 访问已批准理解旧 R1：可查看历史版本，但若当前最新资料已变化，显式标示“基于旧资料快照”。
- 访问已批准预演旧 AN1：`APPROVED` 与“当前版本需复核”标签可同时出现。
- 显示资产来源缺失：提供重新选择文件/查看元数据，不能加载不明外网地址。
- Demo Reset：明确仅在开发环境开放，生产模式禁用；断网或权限不足不能无提示重置项目资料。

---
# 12. 必跑的回归与跨阶段验收测试

## 12.1 P0：所有原 M1/M2 用例继续通过

测试不是只看 UI 是否能点，而是确认**版本 ID、来源证据、权限、资料快照、已批准内容和真实状态**符合合同。具体如下：

| ID | 操作与前置条件 | 必须断言 |
|---|---|---|
| BASE-001 | owner 登录 → `/projects` | 原有项目列表、M0 四个 Seed、搜索筛选可用 |
| BASE-002 | 创建仅 URL 项目 | 仍进入 `/studio/:id/ingest`，项目配置持久化 |
| BASE-003 | 不填 URL、只上传产品资料 | 保持 M1 允许的创建路径 |
| BASE-004 | 用 M1 旧 Seed 未含任何新增字段 | 页面正常显示，Feature/Source/Evidence 均可读取 |
| BASE-005 | M1 模拟授权成功/失败 | 不收真实密码，不改变原授权状态机 |
| BASE-006 | 原资料集合 S1 冻结 | S1.sourceIds/sourceVersions 冻结，刷新不变 |
| BASE-007 | 理解 R1 编辑后 Fork R2 | R1 内容和批准证据保持不变 |
| BASE-008 | 仅 `hypothesis` 的痛点 | 不显示为独立验证的市场事实 |
| BASE-009 | 未批准理解直接去 `/angles` | 原路由守卫有效 |
| BASE-010 | `/angles` → `/concepts` → `/script` | 原已批准流程与字段不变 |
| BASE-011 | 原 120s/15 镜头 | 15 个镜头 ID 和总时长仍一致 |
| BASE-012 | 原 M2 参考图片版本切换 | 旧批准镜头不被覆盖，新候选需确认 |
| BASE-013 | 原 M2 `CreativeChangePlan.apply/discard` | 所有原命令继续可用 |
| BASE-014 | 原 M2 预演播放/Pause/Seek | 播放头映射和音量/字幕行为不退化 |
| BASE-015 | 原 M2 每镜头确认需要有效参考图 | 仍按原条件阻塞缺失图片 |
| BASE-016 | 原 M2 Approved Animatic | 当前未变更时 `/generate` 门禁可通过（M3 可仍为占位） |
| BASE-017 | owner/editor/reviewer 权限切换 | 原项目 RBAC 没有被新增 UI/Mock 扩权 |
| BASE-018 | 两标签页同时更新理解或分镜 | 409 版本冲突，不丢本地草稿 |
| BASE-019 | 现有 Mock `GET/jobs`, reset | 老任务模型和种子场景保持可用 |
| BASE-020 | 项目已归档或无权访问 | 新增 API 与原 API 都不能越权修改 |

## 12.2 P0：M1.1 研究助手与内容事实

| ID | 输入/场景 | 必须断言 |
|---|---|---|
| M11-001 | CRM 来源缺目标用户痛点 | Gap 关联原覆盖 code，显示为何需要及如何补 |
| M11-002 | 首轮生成问题 | 最多 3 个，优先级有依据，不固定所有项目同题 |
| M11-003 | 回答“客户经常忘记跟进” | ResearchAnswer + USER_NOTE，`EvidenceLevel` 不自动 verified |
| M11-004 | 回答保存后刷新 | 问题答案仍存在，不再重复产生相同来源记录 |
| M11-005 | 相同 Idempotency-Key 重复提交同请求 | 只产生一条 Answer/USER_NOTE；返回同结果 |
| M11-006 | 相同 key 但不同回答内容 | 返回冲突，不覆盖第一次回答 |
| M11-007 | 跳过题目 → 同会话继续 | 不马上重复提问；Gap 未 RESOLVED |
| M11-008 | 跳过题目 → 新来源/上下文 | 可以按规则重新提问 |
| M11-009 | 将题目 DISMISSED 且填写理由 | 相同资料上下文不重复；风险增大时可重新评估 |
| M11-010 | 只剩待补建议，没有新的问题 | 不能据此判“所有主张已通过” |
| M11-011 | 增加 USER_NOTE 但未确认资料快照 | 旧 S1/R1 不变，M2 不偷读这条信息 |
| M11-012 | 确认新资料 S2，再生成 R2 | R2.ingestionSnapshotId===S2.id，S1/R1 不变 |
| M11-013 | 官网“自动发送” vs PDF“仅提醒” | 产生 FACTUAL_CONTRADICTION；证据 A/B 可导航 |
| M11-014 | “转化率提升 80%”没有数据 | 独立 UNSUPPORTED 风险，Evidence B 为空，主张 BLOCKED |
| M11-015 | 提交 REWRITE_SAFE 裁决提议 | 创建 Resolution/R2 草稿，旧 R1 不变，当前主张仍未解锁 |
| M11-016 | Resolution 获批但 R2 仍 DRAFT | 不能用于 M2 的确定性营销声明 |
| M11-017 | R2 确认“仅提醒” | 新安全 ClaimAnchor 生效；旧自动发送 Anchor/冲突记录可追溯 |
| M11-018 | NEEDS_EVIDENCE | 冲突不能仅凭点按钮成为 RESOLVED/USABLE |
| M11-019 | 两个来源只是版本/套餐不同 | NOT_A_CONFLICT 必须填写适用范围，系统不能自动当无条件真实 |
| M11-020 | 冲突纠正了一个功能 | CRM 其他无关合规功能继续存在，不整项目永久封禁 |
| M11-021 | R2 审核失败 | R1/旧 M2 正式内容不变，R2 草稿可修复/重试 |
| M11-022 | reviewer 无该项目裁决权限 | 服务端 403，UI 不能提交 |

## 12.3 P0：资产内容版本与连续性

| ID | 输入/场景 | 必须断言 |
|---|---|---|
| AST-001 | 旧 M1 asset 没有内容版本 | 迁移出稳定映射；如果文件不可恢复，标 UNAVAILABLE |
| AST-002 | 重复运行迁移 / 刷新页面 | 不产生第二个初始内容版本 ID |
| AST-003 | 只改 `AssetRef.filename` / purpose | 只增元数据乐观锁，不创建内容 V2 |
| AST-004 | 上传真正新的 Logo 图片 | 新增 `AssetContentVersion.id`，旧内容版本不变 |
| AST-005 | 原批准 VB3 绑定 Logo V1 | 新 V2 上传后旧引用仍指向 V1 |
| AST-006 | 查看 Logo 使用情况 | 返回明确修订：VB3、shot_12_R4 等，不只显示“使用 2 次” |
| AST-007 | 新稿采用 Logo V2 | 先影响预览，然后 Fork/确认相关 VB/镜头 |
| AST-008 | 当前用户试图删除批准镜头引用 | 返回 409/受限操作，历史记录仍可追溯 |
| AST-009 | 用户撤销 Logo 对外展示权 | 即使历史审批未变，也不允许原字节继续对外展示/输出 |
| AST-010 | 录屏带真实敏感数据 | 提醒脱敏，不将文件上传第三方；演示仅 mock |
| AST-011 | 跨项目引用资产 ID | 服务端 403，无越权资产元数据泄露 |
| AST-012 | M2 图片候选没有通用 content version | 仍通过原 ImageAssetVersion 工作；不强行把 ID 混用 |
| AST-013 | M2 原四类 generationMode Seed | 仍按小写原值展示与序列化 |
| AST-014 | ShotGenerationSpec 试图把 ai_video 改成 SCREEN_CAPTURE | 422；要求走 ShotRevision 的 Fork 和原类型 |
| AST-015 | 同一镜头改动参考图片/角色 | 旧建议规格被标 OUTDATED，当前批准镜头不可自动改写 |
| AST-016 | 新草稿选择 AssetContentVersion V2 | VisualBible/Shot 的正式内容绑定与原字段关联一致，反向索引可重建 |
| AST-017 | 旧批准镜头只有 assetId，无法找回过去的内容字节版本 | 显示 LEGACY_VERSION_UNRESOLVED，不默默绑定最新内容，不允许直接新生产 |

## 12.4 P0：M2.1 就绪度、影响范围、M3 门禁

| ID | 输入/场景 | 必须断言 |
|---|---|---|
| M21-001 | 15/15 原镜头已批准 + 有效 Animatic | `canEnterM3=true`，即使余额未知或无报价 |
| M21-002 | 14/15 镜头已批准 | `canEnterM3=false`，有具体阻塞 Shot ID |
| M21-003 | 某镜头参考图缺失 | 按原 M2 审核规则 BLOCKED，不按 real_footage 免检 |
| M21-004 | 已确认预演但无报价 | 可进入 M3 占位/准备页；**不能付费提交** |
| M21-005 | 用户仅改变 UI 侧栏、评论 | 不改变当前有效性，不生成新的业务修订 |
| M21-006 | 全局人物改机器人 | 显示依赖镜头 03/07/08/11，旧历史快照不覆写 |
| M21-007 | 仅修改 shot_07 字幕 | 只建立对应新草稿，不能让无关镜头全部需要修改 |
| M21-008 | R1 已批准后 R2 改变核心事实 | 当前 M2 创意阶段按原失效规则复核；旧 AN1 只读历史 |
| M21-009 | 更换未采用的参考图候选 | 不影响当前正式镜头/预演 |
| M21-010 | 更换正式采用的参考图 | 当前镜头需复核、现有预演相对当前分支过期 |
| M21-011 | 查看旧 AN1 | 状态仍 APPROVED，另显示 REVIEW_REQUIRED/Blocked，不得显示“现在已获准生产” |
| M21-012 | 引用的证据现在被判不实 | 具体 Claim BLOCKED，旧历史可审计但不能用于新的收费内容 |
| M21-013 | 对资产做依赖影响预览 | 只读查询；没有产生新的 ChangePlan/Shot 草稿 |
| M21-014 | 角色替换经过 ChangePlan.apply | 复用原 M2 端点、原审核机制、旧版保留 |
| M21-015 | 分镜页显示未来模型/钱包准备度 | FUTURE 非 BLOCKED；不造成预演无法确认 |

## 12.5 P1：理解 Diff / 参考广告

| ID | 输入/场景 | 必须断言 |
|---|---|---|
| P1-001 | 比较 R1/R2 | 基于真实 revisionId 显示字段/证据级变化 |
| P1-002 | 用户在 Diff 采纳某改动 | 走原理解修订 PATCH，R1 不变 |
| P1-003 | 参考广告上传 | scope CREATIVE_REFERENCE、`includedInAnalysis=false` |
| P1-004 | 用户未声明分析/使用权限 | 不允许创建 P1 分析任务 |
| P1-005 | 参考广告产出 StoryBeat/Hook 原理 | 只作为灵感，不能新增产品证据/功能 |
| P1-006 | M2 点击采用 Insight | 以 insight ID 引用同一份来源，不重复上传/解析 |

## 12.5.1 V3.0 可视化创意探索回归（P1：仅在实现该功能时执行）

| ID | 场景 | 必须断言 |
|---|---|---|
| VIS-001 | 原 M2 `/concepts` 无新增字段 | 三套方案和原审核流程仍正常打开 |
| VIS-002 | 切换“方案对比/自由探索” | ConceptGroup/ConceptRevision ID、状态和正式指针均不改变 |
| VIS-003 | 在探索视图拖动概念卡片 | 仅 UI 坐标变化，不调用 approve/fork/reorder |
| VIS-004 | 收藏/选择 B 方案 | 调用原 M2 favorite/select；选择不等于正式批准 |
| VIS-005 | 从 A 人物+B 场景组成创意 | 必须形成新草稿/变更计划；旧 A/B 的 APPROVED 修订不改写 |
| VIS-006 | 用户要求并行两套“正式当前创意” | 当前 P1 禁止；提示另建正式分支设计提案，而不是写两个 active 指针 |
| VIS-007 | 旧 120s/15 镜头打开总览 | 顺序和时长由原 `StoryboardRevision.orderedShotRevisionIds` 派生 |
| VIS-008 | 拖动镜头卡片的画布位置 | 不改变 `StoryboardRevision`、`ShotRevision.order`、时间线或预演有效性 |
| VIS-009 | 明确选择“调整影片顺序” | 显示变更预览并调用原 reorder API，创建需要复核的新草稿；旧正式版不变 |
| VIS-010 | 点击总览中的 Shot07 | 打开原 `/storyboard` 对应镜头详情与已选图片版本 |
| VIS-011 | 画布展示角色使用关系 | 依照原 `characterIds/sceneIds` 和 AssetUsage 引用显示，不自创第二份权威关系 |
| VIS-012 | 使用 Logo V2 替换角色/品牌引用 | 先预览影响、Fork 草稿、原审核；旧正式 Logo V1 快照不变 |
| VIS-013 | M2 点击“重新生成该镜头视频” | 不应执行 M3 模型任务或账务；明确引导到 M3（待开放） |
| VIS-014 | 修改未采用素材或布局缩放 | 不产生 `EffectiveValidity=REVIEW_REQUIRED`，M3 readiness 仍据正式链计算 |
| VIS-015 | 修改采用的参考图并通过原操作提交 | 仅关联受影响镜头需复核；旧 AN1 历史可回看但不作为当前可收费生产依据 |
| VIS-016 | 引用参考广告里的竞争产品功能 | `ClaimReadiness` 仍阻塞无证据主张，不自动升级 M1 ProductFeature |
| VIS-017 | 无权限 Reviewer 操作“采用素材到草稿” | UI 只读且 Mock Service 403，不可用画布绕过权限 |
| VIS-018 | 浏览器刷新/切换项目/视图 | 坐标偏好可丢失或恢复，但业务 ID/正式审查状态绝不能被坐标缓存覆盖 |
| VIS-019 | 锁定 M2 参考图缺失的镜头 | 依原审核规则阻塞，不能通过总览视图快速批准绕过 |
| VIS-020 | 15 镜头总览初始渲染与滚动 | 性能符合现有项目预算；无高频全量对象重算和画布资源泄漏 |

## 12.5.2 V3.0 必补的 16 项可视化专项 E2E（VIS-021～036；P1 启用时必须通过）

| ID | 场景 | 严格断言 |
|---|---|---|
| VIS-021 | Concept moodboard v1，随后上传 v2 | 旧批准概念仍绑定 v1；原 `moodboardAssetIds` 只保存 AssetRef.id；新草稿可选 v2 |
| VIS-022 | 把 Shot07 ImageAssetVersion 直接塞进 Concept | 拒绝；须归档为合法 AssetRef+AssetContentVersion 后才能复用 |
| VIS-023 | Concept A/B 不同 project/brief | 禁止组合，组成员和 active 全不变 |
| VIS-024 | 同 Brief A/B/C 合成 D 草稿 | D 经原 Fork 原子进入原 Group；来源可追溯；旧三候选仍在 |
| VIS-025 | UI focus、group select、正式 approve | 焦点不提交业务；严格遵守 G0 确认的 M2 选择/审核序列 |
| VIS-026 | 回答 Q 产生 USER_NOTE，source fingerprint 变 | 连续 next / 刷新 Q 不重复 |
| VIS-027 | Q 的唯一有效证据被撤销/反证 | Q 被标需重新确认，允许再次出现；旧答案不自动 verified |
| VIS-028 | 画布位置、缩放、恶意 NaN/Infinity、用户切换 | 不改业务审批/顺序，不污染其他用户上下文 |
| VIS-029 | 已批准 SB1 与草稿 SB2 切换 | ShotRevision 及选定参考图均对应自身 SB；历史只读 |
| VIS-030 | 同 Beat 内重排序 | 参数为 `orderedShotIds`；新 SB/必要 Shot 草稿生成，旧批准快照未改 |
| VIS-031 | 跨 Beat 拖动并要求更改播放顺序 | 被拒绝并引导原剧本修订/审核 |
| VIS-032 | 调整顺序导致转场或净时长非法 | 返回阻塞细节，不允许批准违规 SB |
| VIS-033 | 从总览打开历史 Shot07 | 带 SB/Shot 修订锚点，禁止历史原位保存 |
| VIS-034 | 画布引用素材被撤权/无权展示 | 原图/下载不可用，历史 ID 可追溯，新生成 blocked |
| VIS-035 | 仅创建未提交/未采用新探索草稿 | 原正式链不被静默取代；若原 M2 已有更严门禁则遵守 |
| VIS-036 | 产品事实 R2 正式批准、旧稿含禁用声明 | 旧历史保留，当前付费准备按引用阻塞/复核，不能靠 R1 避开 |

## 12.5.3 V3.0 P0 补充验收（即使未开发 P1 也必须通过）

| ID | 场景 | 严格断言 |
|---|---|---|
| M11-NEW-01 | 回答 Q 幂等产生 USER_NOTE，来源集合指纹变化 | 不重复提问，不重复创建 Source，保存后刷新状态持久 |
| M11-NEW-02 | R1 引用来源 S1 V1，后更新为 V2 | 查看 R1 显示 V1 冻结摘录；旧来源无法恢复标 `LEGACY_EVIDENCE_UNRESOLVED`，不以 V2 偷换 |
| M11-NEW-03 | 未证实“提升 80%”主张 | 不因用户回答/冲突建议草稿而自动变 USABLE |
| M21-NEW-01 | 构建当前就绪状态 | 严格校验 Understanding→Brief→Concept→Script→VB/SB→Animatic 当前正式链 |
| M21-NEW-02 | 重排序/镜头确认并发，expectedVersion 冲突 | 409，旧批准版本不变，客户本地编辑不丢、无半提交 |
| M21-NEW-03 | ShotGenerationSpec 旧正式 ID/图片撤权/视觉规范改变 | GET 可见 NOT_CONFIGURED/OUTDATED/BLOCKED 等状态及原因，PUT 不接受过期绑定，不会自动沿用旧请求配置 |
| M21-NEW-04 | 只有未采用候选、布局变化 | 不影响生产正式基线；但现有更严格门禁通过 G0 记录并保留 |
| M21-NEW-05 | 同一项目 0/1/6/15/50+ 镜头 | 没有写死 15、重复 ID 有清晰异常，0 不得虚构 APPROVED |

## 12.6 实现层测试建议

使用现有团队 Vitest / Playwright 或已安装测试工具，不强制另装一套框架。尤其要建立**版本不变量测试**：

```ts
// 测试逻辑示意：与实际 Repository 名称对齐后实现
// expect(oldApprovedUnderstanding).toEqual(beforeR1);
// expect(oldApprovedStoryboard).toEqual(beforeSB1);
// expect(oldApprovedAnimatic).toEqual(beforeAN1);
// expect(newAssetContentVersion.id).not.toBe(oldAssetContentVersion.id);
// expect(newSpec.mode).toBe(originalApprovedShot.generationMode);
// expect(readiness.canEnterM3).toBe(true); // 已确认有效预演，尚未报价
// expect(claimReadiness.status).toBe('BLOCKED'); // 无证据的80%量化宣传
```

**重要**：这些是断言示意，不是已经在你的代码仓库通过的测试文件。测试必须覆盖网络失败、重试、重复点击、浏览器刷新、409 并发冲突、混合新旧 Seed、路由前置条件和角色权限。

---

# 13. 研发分批任务、责任和验收签收

## 13.1 必须按依赖顺序开发

| 批次 | 工作包 | 交付内容 | 完成门槛 |
|---|---|---|---|
| G0 | 现状核查 / 冻结合同 | `as-built-contract.md`；唯一 DTO/Service 路由表；本文件差异记录 | 前端负责人审核，未确认项标 BLOCKED |
| G1 | 兼容层与类型修正 | M2 mode 复用、统一 Usage API、AssetContentVersion、ClaimAnchor、可选字段映射 | 旧 M1/M2 Seed 可加载，类型检查通过 |
| G2 | M1.1 P0 | 访谈/缺口/主张冲突/裁决/Fork/资产引用 | CRM 从 R1→R2 的完整流程无旧数据覆盖 |
| G3 | M2.1 P0 | 就绪面板、现有 Visual Bible 资产引用、ChangePlan 增强、生成建议规格 | 3D 简历换 Logo/角色，不破坏历史预演 |
| G4 | 联合回归 | 本章所有 BASE/M11/AST/M21 用例，包含并发/刷新/权限 | 全部 P0 通过，缺陷清零或正式阻塞 |
| G5 | P1 独立功能 | UnderstandingDiff / ReferenceAdInsight | 不能影响 M3 安全闭环的交付 |
| G5A | V3.0 可视化体验 P1（可与 G5 并行或在 M3 后做） | 现有 Concepts 对比增强、Storyboard 总览、布局 UI 状态、素材使用关系入口 | 必须通过 VIS-001–036；**不新增创意/分镜权威实体**，不阻塞 G6 |
| G6 | M3 立项 | 精确报价/任务/计费/候选版本（另发正式 M3 说明） | 先做真实服务端交易安全评审，Mock 不当真钱 |

不可同时安排 M1.1 与 M2.1 各自“先建一个资产索引 API”并无协调地提交；G1 完成前，业务 PR 不得对相同资产/版本语义做独立定义。

## 13.2 推荐任务卡与文件归属

以下是**逻辑目录**，遵循团队现有 feature-based 结构，不要求搬家原文件：

```text
apps/web-ele/src/
  types/creative-video/
    common.ts                     # 旧 M1，原样使用
    source.ts                     # 旧 M1，增可选 scope(P1)
    understanding.ts              # 旧 M1，增可选裁决引用
    storyboard.ts                 # 旧 M2，原模式枚举不变
    asset-content-version.ts      # 新：AssetContentVersion
    asset-usage.ts                # 新：用途/反向引用
    research-interview.ts         # 新：访谈/问题/答案
    research-gap.ts               # 新：缺口状态
    claim-review.ts               # 新：Anchor/Conflict/Resolution/Readiness
    production-readiness.ts       # 新：派生就绪视图
    generation-spec.ts            # 新：建议镜头生成规格
  api/creative-video/
    sources.ts                    # 旧
    understanding.ts              # 旧
    storyboard.ts                 # 旧
    director.ts                   # 旧 M2，复用 apply
    research.ts                   # 新
    claims.ts                     # 新
    asset-references.ts           # 新；唯一反向引用 API
    production-readiness.ts       # 新
    generation-specs.ts           # 新（可只读先行）
  components/studio/
    ResearchAssistantPanel/       # 嵌入原 ingest
    ResearchGapActions/           # 嵌入原 SourceCoverage
    ClaimConflictDrawer/          # 嵌入原 understanding
    AssetUsagePanel/              # 原 asset 卡增强
    ProductionReadinessPanel/     # 嵌入原 storyboard / animatic
    ChangeImpactPreview/          # M2 原 Director 面板增强
    AssetReferencePicker/         # 原 Visual Bible 增强
    GenerationSpecPreview/        # M3 Mock 准备态
    ConceptExplorationView/       # V2.1 P1：M2 现有方案的可视化展示（可选）
    StoryboardOverviewView/       # V2.1 P1：M2 正式分镜的总览视图（可选）
    UsageRelationshipOverlay/     # V2.1 P1：资产/角色/镜头只读引用关系（可选）
```

若已开发 `asset-usage.ts` 或 `research.ts` 等文件，**复用原文件并进行 PR 差异修改**，禁止同时存在 `asset-references-v2.ts` 和另一份同业务 handler。

## 13.3 PR 模板（必须填写）

```markdown
### 本 PR 对应合同修正
- FIX-ID: FIX-XX / 模块：
- 触及的 M1/M2 已有接口/DTO：
- 保留的原行为：
- 新增字段是否为 optional：
- 老 Seed 与新 Seed 的迁移/兼容：
- 旧正式审批快照有无数据修改（应为否）：
- 是否新建了重复 Repository/路由（应为否）：
- P0 自动化测试编号与结果：
- 构建/类型检查/Mock E2E 结果：
- 截图或录屏说明：
- 未解决的 as-built delta 与风险：
```

## 13.4 Definition of Done（任意一项不满足均不得宣称完成）

- [ ] 已从当前真实 VidCraft 源码生成 AB-01～AB-10 合同清单，确认原 DTO/API 与本文映射。
- [ ] 原 M0/M1/M2 页面路由、8 阶段 Stepper、权限和四个旧 Seed 均无回归。
- [ ] 原 M2 四类 `ShotGenerationMode` 完全保留，新增 Spec 没有第五套同义枚举。
- [ ] M1/M2 的 `AssetRef`、`ImageAssetVersion`、`CreativeChangePlan`、`IngestionSnapshot`、`UnderstandingRevision`、`VisualBibleRevision`、`ShotRevision`、`AnimaticSnapshot` 均保持唯一业务权威。
- [ ] `AssetContentVersion` 与元数据乐观锁清楚分离；旧资产在缺失文件内容时不伪装 READY。
- [ ] `ClaimAnchor` 可定位真实文案/来源修订；缺依据宣传不会凭人工跳过变为 USABLE。
- [ ] 访谈与冲突处理生成新的资料快照/理解修订；旧批准数据无变化。
- [ ] 产品事实变更后，原 M2 需要复核的阶段与镜头给出明确提示，旧历史仍可只读查看。
- [ ] M3 入口不要求已有预算或报价；M2.1 不允许真实扣积分。
- [ ] 参考图审核门槛未经正式变更没有被放宽。
- [ ] 旧 Seed 升级和两次迁移幂等；新旧数据混合加载可用。
- [ ] 请求幂等、409、403、404、模拟失败/重试、浏览器刷新场景均可演示。
- [ ] P0 自动化与端到端回归全部通过，并有实际测试日志/截图（不是文档勾选即算）。
- [ ] 产品负责人签收 G0、G1、G4；若有无法确认的源码差异，记为阻塞而不是自行强行实现。

---

# 14. 设计决策记录、边界与来源追溯

## 14.1 最终冻结的关键决定（默认无需团队重新争论）

| 编号 | 最终选定方案 | 不采用方案 |
|---|---|---|
| DEC-01 | 保持 M1 ProjectStage 和 M2 路由 | 新增 CONCEPTS/M1.1/M2.1 项目阶段 |
| DEC-02 | 原 M2 小写 ShotGenerationMode 是唯一枚举 | M2.1 大写的新同义 enum |
| DEC-03 | 原 M1 AssetRef + 新 AssetContentVersion | 用 metadata.version 当文件内容版本 |
| DEC-04 | 原 M2 ImageAssetVersion 保留并可映射 | 把所有 M2 图片 ID 替换成通用 assetVersionId |
| DEC-05 | 唯一 AssetUsage 查询 `/assets/:assetId/usage` | 第二套 `/asset-usage?...` |
| DEC-06 | 原 CreativeChangePlan 继续执行修改，dependency-impact 只读 | 新 change-impact 持久化第二套可 apply 计划 |
| DEC-07 | ClaimAnchor 指向修订内确切主张 | 仅用不存在的 claimId 或数组索引 |
| DEC-08 | IngestionSnapshot 只冻结来源；裁决引用冻结于 UnderstandingRevision | 一个裁决同时写两个相互独立权威快照 |
| DEC-09 | SKIPPED 限上下文、不自动解除风险 | 永久不再追问 |
| DEC-10 | 参考广告属于创意灵感，不是产品事实 | 参考视频证据混进 ProductFeature |
| DEC-11 | M3 入口与单次付费请求授权分离 | 预算未批准不准进入 M3 |
| DEC-12 | 原 M2 参考图必选条件暂时不变 | 为了支持录屏/MG 悄悄跳过该审核 |
| DEC-13 | APPROVED 历史不变、有效性由只读投影判断 | 把历史 approved 状态直接改成 draft |
| DEC-14 | M3 报价绑定服务端不可变 GenerationRequestSnapshot | 前端随便回传价格/模型当成已授权 |
| DEC-15 | 目标修订引用是唯一权威，AssetUsageRef 是可重建的只读反向索引 | 目标修订/索引双份可独立修改的事实 |
| DEC-16 | 原 `/concepts` 的三套方案和 `ConceptGroup` 是创意探索唯一业务数据源 | 创建平行 `CreativeBranch/CanvasConcept` 表来管理正式创意 |
| DEC-17 | 原 `/storyboard` 逐镜头模式为默认，P1 总览只读同一个 StoryboardRevision | 新建平行 `CanvasShot/CanvasApproval` 或替换 M2 审批 |
| DEC-18 | 画布坐标、缩放和分组属于 UI 展示偏好 | 拖动卡片时隐式修改正式影片顺序/剧情/角色引用 |
| DEC-19 | P1 只做轻量探索/总览，完整无限画布+多正式并行分支另行 P2 立项 | 现在将 AdCraft 的无限画布作为 M3 的强制前置 |

## 14.2 和四份原始文档的章节映射

| 本文件章节 | 原文对应位置 | 是否复用 | 变更说明 |
|---|---|---|---|
| §2 路由/类型/审批 | M1 §2、§7、§8；M2 §1、§2、§6、§9、§10 | 保留 | 原路由、核心数据与审核规则不改 |
| §4.2 素材内容版本 | M1 §7.3；M1.1 §10.4；M2 §10.5 | 增量补漏 | 区分 AssetRef.version、AssetContentVersion 与 ImageAssetVersion |
| §4.4 声明锚点 | M1 §7.5；M1.1 §5、§10.3 | 增量补漏 | 明确 claimId 稳定来源 |
| §4.5 访谈与跳过 | M1 §5.8；M1.1 §3、§10.1–10.2 | 增量修正 | 不创建第二套 SourceCoverage；修正 SKIPPED 永久过滤 |
| §4.6 裁决 | M1 §6.9–6.12；M1.1 §5、§10.3 | 增量明确 | 裁决只冻结于新理解修订的 refs |
| §4.7 参考广告 | M1.1 §8、§10.6；M2.1 §4 | P1 合并 | M1 上传分析，M2 仅采用启发结果 |
| §4.8 / §8.5 生成规格 | M2 §10.5；M2.1 §2、§6 | 增量统一 | 原四模式+严格审核不变 |
| §5 API 归属 | M1 §8；M2 §11；M1.1 §11；M2.1 §6 | 合同裁决 | 唯一 API；原接口先保持 |
| §6 版本/失效 | M1 §6.12；M2 §9.3；M1.1 §9；M2.1 §2 | 增强 | 新派生状态，不覆盖旧 APPROVED |
| §7 M1.1 页面 | M1 §5–6；M1.1 §3–8 | 原页增强 | 不重做项目创建/资料采集/理解 |
| §8 M2.1 页面 | M2 §6–8；M2.1 §2 | 原页增强 | 原 Director/Visual Bible/Animatic 可继续用 |
| §9 M3 合同 | M2 §18；M2.1 §3 | 提前约束 | 本期不实际收费或生成 |
| §10–13 测试/迁移 | M1 §13–16；M2 §16–18；原审查报告 §6 | 扩展验证 | 以旧 Seed 与权限不回归为首要目标 |
| §4.9 / §8.6–8.7 / §12.5.1 / §15 | M2 §4.2、§6.2、§9、§10–11；本文件 §4.2–4.3 | P1 增量视图 | 已有候选+已批准分镜单一真相；拖动仅位置；选择仍需审核 |

## 14.3 来源、许可与准确性界限

此次只依据以下**已经提供的开发文档内容**进行规范对照；没有克隆或运行 AdCraft/AI Studio 仓库，也没有审查 VidCraft 当前代码。开源项目功能/许可说明仅作为原增量文档给出的参考背景，不作为已经重新核验的第三方技术结论。

- `VidCraft_M0_Vben工程基础搭建指南.md`（工程约定，V1.0）
- `VidCraft_M1_项目创建资料采集与产品理解_前端开发说明书_Mock版_V1.0.md`（正式 M1 基线）
- `VidCraft_M2_AI创意策划剧本与图文分镜_前端开发说明书_Mock版_V1.0.md`（正式 M2 基线）
- `VidCraft_M1.1_产品理解与素材采集增强_前端增量开发说明书_Mock版_V1.0.md`（待统一的增强稿，**以本文件修正为准**）
- `VidCraft_M2.1_AdCraft_AIStudio_融合优化与M3衔接方案.md`（待统一的增强稿，**以本文件修正为准**）
- `VidCraft_M1.1_M2.1与M1_M2兼容性审查及修正建议_V1.0.md`（冲突清单与建议）

**本文件已完成的是文档层面的合同对齐与规则明确；尚未完成的是和你们的真实代码逐文件比对、运行 Mock E2E、确认现网迁移、验证真实账务可靠性。** 因而不能作出“实际工程保证 100% 无错”的承诺。真正可以签收的无回归结论只以 G0 源码核查 + G4 全部 P0 测试的证据为依据。

---


# 15. 可视化创意探索融合实施规范（V3.0 已落实修正）

> 本章具体落实 P1 的可视化创意探索，同时必须以 §4.3、§4.9、§8.6、§8.7 的严格合同为准。**本章不是对完整无限画布的授权或开工要求**。核心选择：结构化导演工作流为默认；P1 只提供“轻量探索 + 分镜总览”。M1 不新增独立画布，M2 不修改八阶段或正式审核门槛。

## 15.1 四项值得真正融合的能力、原有覆盖和差异

| 能力 | 原 M1/M2 已有 | 本版真正新增 | 模块归属 | 级别 |
|---|---|---|---|---|
| 多创意并排探索 | M2 §4.2 三套方案、moodboard、对比、收藏 | 允许并排查看**同一组现有候选**的视觉元素与故事差异，保留用户自由摆放的 UI 坐标 | `/concepts` | P1 |
| 角色/场景/品牌候选复用 | M1 AssetRef + M2 Visual Bible + 本文 V2.0 AssetContentVersion/Usage | 可视化候选对照、“被哪些镜头引用”和“采用前影响预览”入口 | M1 AssetUsage + M2 VisualBible | P0 原有增强 + P1 展示 |
| 单镜头保留满意结果、修改局部 | M2 ShotRevision / ImageAssetVersion / CreativeChangePlan | 在总览中一眼识别“当前已批准 vs 新候选 vs 需复核”；快捷定位原修改流程 | `/storyboard` | P1 展示 |
| 统一看到整部故事 | M2 ShotNavigator + StoryTimeline + Animatic | 按 Beat/Scene 组织全片镜头卡片，查看人物/风格分布、时长与审核阻塞 | `/storyboard` | P1 |

**不做的内容**：任意节点互连并执行 Agent、节点即能进行付费生成、画布节点跨项目隐式引用、多正式创意时间线并行剪辑、像 Premiere 一样的任意多轨剪辑，这些属于单独 P2 或 M3/M4。

## 15.2 推荐页面体验与准确的操作语义

```text
M1 /ingest（原入口保留）：URL/文档/产品录屏/品牌素材
      │ 只提供已授权素材候选、可选参考广告灵感
      ▼
M1 /understanding（原审批）：产品理解 + ClaimReadiness / Evidence
      ▼
M2 /angles（原逻辑）：传播切口 + 已选择创意启发 ID
      ▼
M2 /concepts（原三方案对比） ⇄ [可选：自由探索视图]
      │ 只有“用户选择 + 原审批”能确定正式 CreativeConceptRevision
      ▼
M2 /script（原逻辑）：时长、ScriptRevision、Story Beats
      ▼
M2 /storyboard（原逐镜头三栏） ⇄ [可选：全片总览]
      │ 故事总览/素材引用只读；真正采用/修改走原版本和审核
      ▼
M2 /animatic（原逻辑）：120s 预演、人工确认
      ▼
M3 /generate：视频模型候选与费用审批（本期不实现）
```

### 关键区别：三种容易混淆的“移动”

- **拖动创意卡片的位置**：更改 `StudioPresentationPreference`，**绝不**修改 `CreativeConceptRevision`、`ConceptGroup.selectedConceptRevisionId` 或正式 approved 概念。
- **拖动分镜卡片在画布中的位置**：同样仅改 UI 坐标，**不改变影片顺序和时长**。
- **明确调整影片播放顺序**：属于业务命令；先展示变化与影响，调用 M2 原 reorder API，得到新 `StoryboardRevision` 草稿；需要原审核流程后才成为正式顺序。

### 另一个关键区别：三种容易混淆的“采用”

- **聚焦 / 收藏 / 组级选择**：聚焦只在 UI；收藏按原 favorite；组级选择调用原 `groups/:gid/select`，并须符合已核验的原 M2 审核前置条件；三者都不等于最终批准。
- **采用角色/场景/参考图到草稿**：形成新 `VisualBibleRevision` 或 `ShotRevision`，原已批准版不变。
- **正式批准**：通过原 M2 approve API，受证据、角色权限、乐观锁、参考图和阶段门禁约束；画布没有独立批准通道。

## 15.3 概念组合场景必须强制 Fork

示例：用户喜欢 Concept A 的“PDF 简历破次元”开场，也喜欢 Concept B 的“招聘官视角”和 Concept C 的视觉色调。

正确流程：用户提出同项目、同批准 Brief 内的组合要求 → 校验上游理解与规格/权属 → 展示 A/B/C 字段及 Claim 风险 → 从合法基底通过**原 M2 fork + patch** 生成 D 草稿，服务端原子加入 ConceptGroup（可用原 ChangePlan 辅助预览）→ 原 submit-review/select/approve 审核 → 变更正式 active 后才按 M2 §9 复核下游。概念人物/场景只是 `ConceptStory` 文本，不能提前当正式 CharacterBible/SceneBible。

**错误流程**：在画布里把 A/B/C 的卡片用线连起来，就悄悄覆盖原 Approved 概念；或者把用户拖动布局当作获得制作授权。

现有 M2 只有**单个当前正式创意链**，P1 不允许并行将 Concept A/B 各自发展为两条都标成“当前正式”的成片。如果将来需要独立并行制作两个完整版本，请单独设计 `ProductionVariant`（包含每条独立的脚本/视觉规范/分镜/预演版本链与成本隔离），不能简单用多个 activeConceptId 解决；**本次不新增该实体**。

## 15.4 Visual Bible 与资产候选的可视化关系

- 角色卡/场景卡支持多角度与多样式候选**展示**，不是强制额外生成。概念 Moodboard 原字段只用 `AssetRef.id`、新 `ConceptMoodboardBinding` 指向 `AssetContentVersion.id`；镜头参考图才用绑定 `shotId` 的 M2 `ImageAssetVersion.id`。两套版本 ID 不得混用。
- 连线建议为**只读引用图**：角色/场景/Logo → 已使用的镜头 ID；点击节点跳转原 `AssetUsagePanel`、`VisualBibleDrawer` 或 `ShotDetailEditor`。
- 真正采用新素材：验证同项目、合法授权和素材内容可用 → `dependency-impact/preview` 只读计算 → 原草稿修订命令 → 原审核确认 → 重算 `ProductionReadiness`。
- `AssetUsageRef` 是由业务修订**派生**的反向索引；画布节点位置不是资产所有权的来源，更不能由坐标推导“这张图已被正式采用”。

## 15.5 内容质量保障：不要让画布降低最终影片质量

新增可视化视图后，仍必须：

1. 在概念阶段防止三套创意同质化和无证据宣传，保持 `ConceptGroup` 原要求。
2. 在分镜阶段检查剧情连贯、角色外观一致、产品事实、镜头时长、**指定 StoryboardRevision 下的 activeReferenceImageId** 与版本锁定。
3. **全片净时长**仍使用 M2 第 5.8 / 7.4 节的整数毫秒及转场重叠公式；视觉卡片 x 坐标没有时间意义。
4. 仅修改未采用的探索候选或视觉布局，不触发 M2 当前正式分镜重审；一旦采用影响正式修订的元素，按原依赖图精确失效。
5. `/animatic` 仍是低成本预演的必经审核关卡；画布里的“看起来很连贯”不能替代完整故事播放。
6. 图文分镜的有效参考图规则和审核状态全部沿用 V2.0 §2.3/§6.4，不因“总览可编辑”而跳过。

## 15.6 最小实现策略和不用新增的代码

优先通过**原页面的 ViewMode 切换**完成，避免重做全屏 Studio 布局：

- 第一版：Concepts 在现有三列方案下增加“展开视觉候选 / 汇总对比”，无需无限画布库。
- 第二版：Storyboard 增加网格/章节式总览，支持点击镜头定位，已经能解决大部分全片可见性问题。
- 第三版（仅证明有需求时）：独立 P2 支持**大规模无限坐标、可执行节点连线及自动布局**的完整画布；P1 仅允许有限缩放/平移与卡片位置偏好；节点 UI 仍绑定同一份业务版本。不得未经评估将第三版作为 M3 开发依赖。
- `ConceptExplorationView`、`StoryboardOverviewView` 仅负责读模型和意图操作；业务修改一律通过已有 Repository；所有 UI 新代码遵守项目已有路由、Mock RequestClient、权限及测试规范。
- 画布无需自定义视频生成服务，不调用真实付费图像/视频 API，不展示非真实的生成成功或扣费。

## 15.7 对开发团队的直接任务分割

| 任务 | 页面 | 实际改动 | 不准动的部分 | 验收 |
|---|---|---|---|---|
| VC-VIS-01 | `/concepts` | 现有三套对比增加视觉探索/素材引用显示 | 三方案审核、ConceptGroup、active concept | VIS-001～006 |
| VC-VIS-02 | `/storyboard` | 增加按 Beat 的动态镜头总览和异常导航（15 只是 Seed） | ShotRevision、StoryboardRevision、原逐镜头详情 | VIS-007～010 |
| VC-VIS-03 | Visual Bible/素材抽屉 | 角色/场景/品牌反向引用可视化 | AssetRef/AssetContentVersion 与原图片候选区分 | VIS-011～012 |
| VC-VIS-04 | Director/版本历史 | 总览可见影响范围、复用原修改与回退 | CreativeChangePlan、AnimaticSnapshot 正式历史 | VIS-013～015 |
| VC-VIS-05 | Mock / E2E | 补齐布局坐标与业务命令隔离测试 | 原 120s/15 shots Seed、权限、Idempotency | VIS-016～020 |

**优先级**：P1，允许 G5A 先单独完成，但不因未完成就阻塞 M3。**高风险操作**（采用新素材、切换正式创意、修改正式分镜顺序）继续执行原版本/审核/确认，无需也不得借“画布新增”跳过。

## 15.8 此阶段仍未证明的事项

本版基于 M1、M2 及用户上传 V2.0 的文档核查，**没有审查真实 VidCraft Git 仓库，也没有完成浏览器 E2E 或性能实测**。因此不能承诺这些修改与尚未提供的实际组件、Store、Mock handler 完全一致。若 G0 `as-built-contract.md` 发现现有源码与文档不同，必须先暂停该项修订并记录兼容方案；不能为追求画布体验隐式迁移原业务数据。

---
# 16. 最终开发不可妥协的合同、不变量与差异登记

## 16.1 单一真相与读写边界（总负责人必须签收）

| 对象 | 唯一权威 | 新增视图/索引 | 必须禁止 |
|---|---|---|---|
| 产品资料 | `ProductSource` + `IngestionSnapshot.sourceVersions` | `ResearchGap`、访谈提示 | 修改已冻结资料快照以反映新资料 |
| 事实证据 | `EvidenceRef` 的当前资料 + `EvidenceLocatorSnapshot` 的历史事实定位 | `ClaimReadinessItem` | 用 Source V2 文本回填 R1 历史验证 |
| 理解结论 | `UnderstandingRevision` | 对比 Diff、冲突裁决只读视图 | 旧 APPROVED R1 原位修改 |
| 创意方案 | `ConceptGroup` + `CreativeConceptRevision` | Explore Card + 私有布局 | CanvasCard 决定正式 active |
| 视觉资产 | `AssetRef` + `AssetContentVersion`；Shot 参考图另用 `ImageAssetVersion` | `AssetUsageRef` 反向索引 | 图片 ID、素材身份 ID、内容版本 ID 混用 |
| 图文分镜顺序 | `StoryboardRevision.orderedShotRevisionIds` | StoryboardOverviewCardVM | 利用 x/y 或 Shot.order 当唯一权威顺序 |
| 镜头审核 | 具体 `ShotRevision` 的 `reviewStatus`、审批信息 | `EffectiveValidity` | 把历史 APPROVED 改成未审核 |
| 整片预演 | `AnimaticSnapshot` 的冻结引用和审批 | `ProductionReadiness` | 只凭已播放/已访问判定已批准 |
| 生成准备 | `ShotGenerationSpec`（建议）+ 正式 Shot 血缘 | `ShotGenerationSpecView.specValidity` | 旧 spec 自动重绑和直接认为付费授权 |

## 16.2 八个不得变更的业务不变量

1. **版本不可变**：所有已批准的 Understanding、Concept、VisualBible、Shot、Storyboard、Animatic 内容及来源 ID 不得写回；权限撤销只影响可访问投影。
2. **事实不可混源**：参考广告只提供 `CREATIVE_REFERENCE` 灵感，不能成为产品 Feature 事实证据；访谈回答不能自动升级 `verified`。
3. **审批不可缩短**：UI focus、favoriting、画布拖动、视觉草稿、生成建议均不能取代 M1/M2 原人工审核。
4. **内容版本不可混写**：`AssetRef.id`、`AssetContentVersion.id`、`ImageAssetVersion.id`、`VersionedEntity.version` 四者互不等价。
5. **时间线顺序不可模糊**：`orderedShotRevisionIds` 唯一决定某个 SB 的正式顺序；`reorder` 请求使用 `orderedShotIds`，并以新 SB 草稿/必要的 Shot 草稿表达修改。
6. **正式链与探索链分开**：未批准、未采用候选不自动变成当前正式；当前事实/素材撤权可使历史批准链相对新环境 `BLOCKED`，但不抹去历史批准记录。
7. **接口只有一个业务真相**：组件通过原 RequestClient/Repository；已有 `/director/change-plans`、`/shots/reorder`、`/assets/:assetId/usage` 不再出现平行替代实现。
8. **Mock 不冒充生产**：不真实付费生图/视频、钱包结算或导出成片；所有看似 AI 分析、进度、预算都是固定/确定性 Mock 标记。

## 16.3 G0 差异登记与停止规则（重要）

前端负责人填写 `as-built-contract.md`，至少包括以下列：`contractId | 原文档定位 | 当前代码文件/handler | 真实输入/输出/状态 | V3 目标 | 兼容方法 | 负责人 | 测试编号 | 是否放行`。发现真实代码与原 M1/M2 正式文档不一致时，**不得让两个模块开发人员分别猜测做法**。先选一条有依据的兼容路径（原实现不变、无损 Adapter、经评审的旧 handler 补强、暂缓），写入 ADR 再修改。

必停事项：改变旧 enum/route 主键；覆盖旧 APPROVED；替换原资产 ID；把用户回答标外部 verified；更换正式创意时不按原审核；跨 Beat 偷改 `storyBeatId`；将旧素材 ID 当新版字节；复制受限开源代码/素材；在 M2 生成视频或扣真钱。

## 16.4 必需交付物与分批门禁

| 门禁 | 必需交付 | 放行条件 |
|---|---|---|
| G0 | `as-built-contract.md`、差异 ADR、原始 Seed 备份 | AB-01～AB-16 已核对，冲突有负责人和不破坏基线的处理方案 |
| G1 | 单一类型/API 合同、迁移、历史证据快照 | 原 M1/M2 路由/DTO/Seed 不被破坏，TS typecheck/build 通过，幂等迁移 |
| G2 | M1.1 研究+Claim+资产 P0 | M11 及 M11-NEW P0 测试通过；CRM R1→R2、历史可追溯 |
| G3 | M2.1 就绪度+引用+建议规格 P0 | M21/M21-NEW P0 测试通过；旧 120 秒/15 镜头仍可播放 |
| G4 | 合并回归 | 原 M1/M2 P0 回归全部通过；无已批准快照静默修改 |
| G5A（可选） | Concept Exploration + Storyboard Overview | VIS-001～VIS-036 全部通过，才声明“可视化探索已完成” |
| M3 立项 | 使用已确认的 AnimaticSnapshot + 请求/报价单独授权 | 不因未开发 P1 画布而阻塞，M3 不可把 M2 建议规格当报价 |

**提交 PR 必须附上**：①修改文件清单；②涉及原合同对照；③新增/迁移对象；④原版本不变量断言；⑤权限/异常/并发测试报告；⑥是否涉及 P1；⑦Mock/真实边界检查。缺实际运行记录时不得写“全部兼容无问题”。

## 16.5 边界裁决：本期明确不做什么

本期不是 AdCraft 复刻版，不建设任意节点执行型无限画布、多条当前正式制作链、画布直接连接生成/计费、真实网页机器人登录、真实模型/支付/FFmpeg、多轨剪辑与真实版权自动鉴别。可参考开源项目的**抽象交互理念**，不得把受非商业许可约束的 AdCraft 源码/素材直接用于收费产品。正式上线前应对所有第三方资产、依赖、模型条款及业务合规另行审查。

## 16.6 验收演示脚本（QA 可直接执行）

**P0 核心**：打开原 CRM Seed → 查看缺口并回答“真实痛点”→ 用户答案成为有来源 USER_NOTE 且不再重复问 → 资料 S2 → R2 草稿 → 查看源 V1/V2 证据冲突 → 提议/批准裁决 → R2 最终批准 → 下游依赖显示影响但旧 R1、旧预演不被覆盖 → 打开原 3D 简历 120 秒分镜 → 换新 Logo 候选（未采用不影响原就绪度）→ 正式采用新 Logo 到草稿 → 关联镜头复核并生成新预演 → 生成建议 Spec 遇上游正式版本改变返回 OUTDATED 而非自动绑定新版本。

**P1 探索（仅 G5A 实施时）**：Concept A/B/C 同 Brief → 只移动卡片、缩放，不改变 group 与 active → A Hook+B 人物+C 风格合成 D 草稿，合法 Fork + 原 Group 归属 + 审核（不能越过 M2 原时序）→ 选择已批准 SB1 显示具体 ShotR/图片 → 创建 SB2 草稿并精准切换 → 同 Beat 排序形成新 SB+必要 Shot 草稿 → 跨 Beat 拒绝 → 转场检查和净时长检查 → 历史 SB1/AN1 完整可回看但按现行权利/事实判断可用性 → 0/1/50+ 镜头及撤权/409/403/失败重试均符合测试。

**签收声明建议文本**：

> 我们已经核对真实源码与 V3.0 的 AB-01～AB-16，P0 M1/M2 原回归及本期增量用例均已运行并通过；对于未实施的 P1 项明确标注未交付；任何仍存在的契约差异均已记录并经过负责人批准。我们不将“需求文档静态一致”冒充“线上代码已验证零缺陷”。

---

# 附录 A：研发人员不应该再执行的旧指令（防止误按 V1.0 开发）

> 以下内容来自原 M1.1/M2.1 的未统一建议，已被本文件明确替代。

| 旧指令 | 现在必须执行的修正 |
|---|---|
| M2.1 `ShotGenerationSpec.mode='AI_VIDEO|MOTION_GRAPHICS|SCREEN_CAPTURE|STILL_ANIMATION'` | 直接引用 M2 `ShotGenerationMode`，不增加同义枚举 |
| M2.1 `GET /projects/:id/asset-usage?assetId=...` | 使用 M1.1 规范 `GET /projects/:id/assets/:assetId/usage` |
| M2.1 `POST /projects/:id/change-impact/preview` | 自然语言走原 Director；纯依赖影响走统一只读 `/dependency-impact/preview` |
| M1.1 `AssetUsageMetadata.assetVersion: number` 当内容版本 | 新实现中不使用；资产内容单独 `AssetContentVersion.id` |
| M1.1 `ClaimConflict.claimId` 不解释来源 | 统一指 `ClaimAnchor.id`，记录源修订与声明快照 |
| 将 ConflictResolution 同时写入 IngestionSnapshot 和 UnderstandingRevision | IngestionSnapshot 固定来源，裁决 refs 仅进入新理解修订 |
| 将 SKIPPED/DISMISSED 设成永久不再触发 | 依据会话和源集版本重评估 |
| M2.1 用预算/模型费用/视频生成数量阻塞 M3 入口 | M3 入口由 M2 批准快照决定，付费操作另作校验 |
| 把 M1 参考广告放入产品 `EvidenceRef` | 参考广告只走 Creative Inspiration，默认不纳入产品分析 |
| 将 M2 审核中“参考图必选”暗改为部分可选 | 未经单独流程变更前维持旧规则 |

# 附录 B：给开发团队的最后执行口径（可复制到任务）

> 基于已经完成的 M0/M1/M2 代码，以新增功能而非重构的方式开发 M1.1+M2.1。先核查真实代码并生成 as-built 对照表；以 M1/M2 的路由、八阶段、正式审核、四类镜头生成方式和已批准版本不可变规则为不可突破的基线；统一资产内容版本、声明锚点、资产反向引用和 AI 修改影响接口；资料问答与冲突裁决只能通过新的来源快照和理解草稿生效，不能覆盖旧批准报告与分镜；制作就绪度只读派生，进入 M3 不能依赖预算和报价；本期不真实生成视频或扣费。**P1 可选**在原 concepts 和 storyboard 页面增加创意探索/分镜总览，但不得增加第二套正式版本、审核或影片顺序，画布坐标仅 UI 偏好；P1 不阻塞 M3。P0 E2E 全量通过、旧 Mock Seed 可回放后方可合并。

**主规范与最终执行门禁见第 16 章；以下附录 A–C 仅供旧文档版本追溯，遇到歧义以正文 §3、§4、§6、§8、§16 为准。**

# 附录 C：原 V2.0 静态核验记录（V3.0 新增内容需项目验证）

> **核验范围：以下记录来自V2.0 文档的历史静态核验，并不证明本次 V2.1 新增 UI 类型或实际 VidCraft 代码通过了编译/联调。** 本次 V3.0 的额外静态校验以文件结构、代码围栏及原合同字段引用为限。

| 检查 | 实际结果 | 限制 |
|---|---|---|
| M1 的 `ProjectStage` / `EvidenceLevel` / `AssetRef` / `IngestionSnapshot` / `UnderstandingRevision` 与本文定义核对 | 已按原 M1 `§7.1–7.5` 保留，增量字段无强制重命名 | 未执行仓库类型检查 |
| M2 的 `ShotGenerationMode` / `ShotRevision` / `VisualBibleRevision` / `ImageAssetVersion` / `AnimaticSnapshot` 与本文核对 | 以原 M2 `§10.5–10.6` 为标准，明确禁止大写新枚举 | 未实际编译当前 M2 项目 |
| 资料与分镜 API 路由核对 | 复用 M1 `§8`、M2 `§11` 已定义端点；冲突旧端点已列为废弃建议 | 需核查真实 Nitro handler 路径 |
| M1.1/M2.1 两份文档同义对象去重 | 统一 AssetUsage/ChangePlan/ReferenceAd 归属，并保留正式版本不变量 | 未确认团队是否已经抢先实现了两个并行 API |
| Markdown 代码块成对 | 已通过静态检查 | 不验证图形渲染兼容 |
| 本文 TypeScript 片段的语法/类型自身一致性 | 提取 TS 片段，使用临时最小原类型 stub 校验，`tsc --strict --noEmit --target ES2022` 无诊断 | **不代表**本工程所有字段、路径、依赖和运行时已通过 TypeScript 构建 |
| E2E 真正执行 | **未执行** | 必须在 G4 完成后才可宣称无回归 |

如开发成员发现任何源码与本文有不一致，必须记录为 `AS_BUILT_DELTA` 并提交明确可回滚的兼容修改方案；**不要在未知原行为的前提下，声称本文本可以不经验证直接覆盖现有工程。**


**V2.1 实施优先级提醒**：第 15 章新增功能全部是可选 P1/P2，必须在维持原 M1/M2 P0 审核与版本不变量的前提下进行；没有真实仓库源码不保证集成零问题。

---

# 附录 D：V3.0 本次交付前的静态检查记录（与项目 E2E 严格区分）

> 本附录记录本次**文档检查的实际执行结果**。它不代表 VidCraft 项目源码已经编译、运行或通过浏览器测试；凡涉及 Repository、Mock handler、路由及授权的实现级结论，都必须在 G0/G4 后才能签收。

| 检查项 | 本次结果 | 结论边界 |
|---|---|---|
| Markdown 代码围栏配对 | 54 处围栏标记，配对完整 | 只证明结构没有明显未闭合围栏 |
| TypeScript 代码段语法解析 | 16 个 `ts` 示例段均通过 TypeScript 5.8.3 语法转译检查 | **未**对整个 VidCraft 工程执行类型检查；跨代码段导入须依 G0 衔接 |
| 访谈问题选择核心函数 | 提取到独立 TS 测试文件并在 `--strict` 下编译；执行 7 项断言全部通过 | 仅验证有效回答、反证、重确认、跳过与已解决等场景的纯函数，不代表 Mock 事务已通过 |
| 冲突裁决编号 | FIX-01～FIX-20 共 20 项，无缺号/重复编号 | 仅检查文档编号 |
| 源码核查编号 | AB-01～AB-16 共 16 项，无缺号/重复编号 | **全部需要开发团队实际填表**，并非已完成 G0 |
| 可视化专项用例 | VIS-001～VIS-036 共 36 项，无缺号/重复编号 | **尚未运行项目 E2E**；仅 P1 实施后应全量执行 |
| 新增 P0 用例 | M11-NEW-01～03、M21-NEW-01～05 共 8 项 | **尚未运行项目 E2E** |
| 原项目阶段/模式/路由 | 文档保留原 8 阶段、M2 4 种小写镜头生成模式以及既定 Studio 路由 | 原工程代码的实际形状仍须 G0 核对 |
| 旧增强方案残留冲突 | 已统一组级选择与焦点、通用素材与镜头图片、访谈防重问、正式/草稿分支、Spec 未配置状态及跨项目资产范围 | 不保证运行时不存在新的数据边界或框架特有缺陷 |

**签收准则**：只有 `as-built-contract.md` 完成、旧 M1/M2 真实测试通过、新 P0 用例执行通过且对应负责人批准时，才能宣布 P0 与现有项目实现兼容。P1 未实现不影响 P0 签收，但不得把 P1 用例写作通过。

**最终交付版本：VC-FE-COMPAT-003 / V3.0 / 2026-11-09**。
