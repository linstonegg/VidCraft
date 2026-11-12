# M2 演示脚本与 M3 交接

> 文档编号：VC-FE-M2-DEMO-001  
> 适用：Mock 演示、M2 签收、M3 启动对齐

## 1. 演示准备

```powershell
cd D:\LSProject\VidCraft\frontend
corepack pnpm dev:ele
```

浏览器打开 `http://localhost:5555`，使用 `owner / 123456` 登录，先到项目中心点击「恢复演示数据」。

## 2. 主演示：3D 简历 120 秒

1. `/projects` 打开 `3D 网页简历营销片`，进入 Studio；确认 S2 已批准。
2. `/studio/project_resume_3d/angles`
   - 展示 4 个传播切口：反常规 PDF→3D、身份表达、现场惊艳、痛点共鸣；
   - 点「查看依据」展示 M1 证据等级；
   - 主切口选「简历从纸里跳出来」，辅切口选「把自己装进一条链接」；
   - 点「确认 Brief → 创意故事」。
3. `/concepts`
   - 生成三套故事，展示 A/B/C 在主角色、场景、冲突上的差异；
   - 打开 A 编辑 Hook/CTA；点「告诉 AI 怎么改」输入“更关注用户痛点”，展示修改计划与 before/after，采用后生成草稿；
   - 提交审核并「确认方案」，进入剧本。
4. `/script`
   - 展示「当前故事最适合 30 秒，但目标 120 秒」；
   - 选择 A 完整故事扩写，生成 7 节拍；
   - 改一个节拍的旁白/时长，保存草稿，展示总时长 120000ms；
   - 提交审核并确认剧本。
5. `/storyboard`
   - 生成并确认 Visual Bible（角色/场景/品牌/画幅）；
   - 生成 15 镜头，展示镜头列表、图片、动作/运镜/旁白/字幕、时间线；
   - 选中镜头 07，输入“纸张先炸开，再让人物出现”，展示修改计划、影响范围，采用后生成新草稿；
   - 生成参考图 V2，展示旧图保留，采用 V2；
   - 批量确认 15 镜头 → 确认整组分镜。
6. `/animatic`
   - 生成预演，播放/暂停；拖到 `01:05` 应显示镜头 09；
   - 输入“镜头 09 节奏可以再快一点”记录时间戳反馈；
   - 确认预演。
7. `/generate`
   - 展示 M3 交接：动画快照、剧本、分镜、视觉规范、15 个已批准镜头 ID、120s/9:16/抖音。

## 3. 异常演示

- **资料变化失效**：在 M1 资料页新增素材，返回 `/angles` 会被 409 守卫拦截；旧预演仍可在 `/animatic` 只读查看，标记“需要复核”，不能进入 M3。
- **任务失败**：生成创意时选 `FAIL_BEFORE_RESULT`，旧方案保留，页面提示可重试。
- **重复任务**：连续点击生成，第二次返回 409，不产生重复版本。
- **版本冲突**：两个标签页编辑同一剧本/镜头，旧版本保存返回 409，页面保留本地输入。
- **权限**：reviewer 登录只读；无项目审核权时确认按钮不可用，直接调 API 返回 403。
- **拖拽替代**：镜头排序用「上移/下移」按钮；键盘可操作。

## 4. M2 → M3 交接契约

`GET /api/creative-video/v1/projects/:id/animatic/handoff`：

```json
{
  "projectId": "project_resume_3d",
  "understandingRevisionId": "revision_resume_01",
  "approvedCreativeBriefId": "brief_...",
  "approvedConceptRevisionId": "concept_...",
  "approvedScriptRevisionId": "script_...",
  "approvedStoryboardRevisionId": "storyboard_...",
  "approvedVisualBibleVersionId": "visualbible_...",
  "approvedAnimaticSnapshotId": "animatic_...",
  "targetDurationMs": 120000,
  "aspectRatio": "9:16",
  "platform": "douyin",
  "language": "zh-CN",
  "orderedApprovedShotRevisionIds": ["...15 个镜头修订 ID..."],
  "timelineVersion": 2,
  "mockOnly": true
}
```

M3 必须：

1. 只使用 `orderedApprovedShotRevisionIds` 对应的已批准镜头修订与当前已选参考图；
2. 逐镜头读取剧本/字幕、动作、运镜、角色/场景 Bible、证据与禁止主张；
3. 先报价、用户确认后再冻结积分；M2 不产生任何费用；
4. 新视频候选不覆盖旧已批准视频；分镜/参考图变化后需重新评估视频可用性；
5. AnimaticSnapshot 只是低成本预演，不是 MP4 文件 ID，也不是最终成片。

## 5. 已知限制（演示前告知）

- 默认 Reset 为四个 Seed 预置完整 M2 链路；需要从零演示时使用 `POST /demo/reset` body `{"m2Seed":"interactive"}`；
- 图片为自制 SVG 分镜示意图，非真实生成图；
- 无真实 TTS/音频，预演只播放字幕与图片；
- 镜头拖拽排序、逐镜头图形化依赖图尚未实现；复制/拆分/合并已支持；
- 冲突差异面板已覆盖概念/剧本/镜头，但尚未写双标签页自动化用例。
