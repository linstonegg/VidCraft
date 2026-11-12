# P1：参考广告 ReferenceAdInsight

> 目标：参考广告只提供“怎么讲”的抽象创意语言，绝不进入当前产品事实、EvidenceRef 或 ClaimAnchor。

## API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/projects/:id/reference-ads` | 列出本项目洞察 |
| POST | `/projects/:id/reference-ads` | 创建 Mock 洞察；必须有 `copyrightConfirmed: true` |
| GET | `/projects/:id/reference-ads/:insightId` | 读取单个洞察 |

创建请求：

```json
{
  "title": "参考广告：问题-反转-演示（Mock 授权示例）",
  "durationSec": 30,
  "format": "9:16",
  "copyrightConfirmed": true
}
```

未确认权属返回 `422 COPYRIGHT_REQUIRED`。

## 隔离规则

- 创建时同时生成一条 `REFERENCE_AD` 来源：
  - `analysisScope = CREATIVE_REFERENCE`；
  - `includedInAnalysis = false`；
  - `evidenceIds = []`；
- `ReferenceAdInsight.canBeUsedAsProductEvidence = false`；
- 广告中的功能、成绩、品牌文字不能写入 `features[]` / `EvidenceRef` / `usableInMarketing`；
- 只允许抽象出钩子、结构、节奏、视觉语言、声音、CTA；
- 明确列出 `doNotCopy`，禁止复制镜头、脚本、角色、配乐。

## UI

- `/studio/:id/references`：参考广告洞察只读页；
- 资料采集页增加“添加参考广告”和“参考广告库”入口，创建入口只在 M1 资料页；
- 点击“添加参考广告”生成固定 Mock 洞察与 `REFERENCE_AD` 来源，不调用真实音视频模型；
- 页面明确显示“仅创意参考 / 不能作为产品证据 / 不可复制”。

## 边界

- Mock 不真实解码视频、不做 ASR 或视觉推理；
- `/references` 不提供第二次上传入口；上传/权属声明应在资料采集阶段，当前版本用 Mock 创建代替；
- `/angles` 新增“参考创意语言（可选）”面板，读取同一份 insight 的抽象规律，只作灵感展示；
- 参考广告不参与产品理解、M2 交接或 M3 就绪度计算。

## 测试

M11 API：

- 创建返回 201、`analysisScope=CREATIVE_REFERENCE`、`canBeUsedAsProductEvidence=false`、patterns ≥ 4；
- 来源为 `REFERENCE_AD`、排除分析、scope 正确，列表可读；
- 未确认权属返回 422。

M11 UI：

- `/references` 创建 Mock 洞察后展示隔离提示和“不可复制”；
- `/angles` 读取同一 insight 并显示“仅灵感”面板。

结果见 [test-report.md](./test-report.md)。

## 异步 Mock 分析与采用

- `POST /projects/:id/reference-ads` 返回 `202 { jobId }`，任务种类 `ANALYZE_REFERENCE_AD`；
- 任务完成时创建固定 Mock Insight、`REFERENCE_AD` 来源与视频素材；
- 前端 ingest 轮询 job，成功后进入 `/references`；
- `/angles` 参考语言面板选择后，通过 `PATCH /projects/:id/angles/sets/:sid/reference-insight` 持久化 `referenceAdInsightId`；
- 该字段只记录“参考灵感选择”，不改写产品事实、Brief 正式字段或镜头。

测试：`m11-api-check` 覆盖 202→SUCCEEDED→Insight/来源隔离；`m11-smoke` 覆盖页面读取。

## 画布约束投影

Storyboard 右侧新增只读 `StudioContextSignalsPanel`：

- 研究上下文 fingerprint 与 open gaps；
- 资产 REDACTED/UNAVAILABLE；
- 非 USABLE 主张（ClaimReadiness）；
- 不写镜头、不改变正式链。
