# M1 演示脚本与 M2 交接

> 文档编号：VC-FE-M1-DEMO-001  
> 适用：演示环境（Mock）、M1 签收、M2 启动前对齐

## 1. 演示账号

| 角色 | 账号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 产品拥有者 | `owner` | `123456` | 全流程：创建、采集、编辑、审核 |
| 内容编辑 | `editor` | `123456` | 创建/采集/编辑，不能确认审核 |
| 审核员 | `reviewer` | `123456` | 只读；在 `reviewerCanApprove` 的项目可审核 |
| 系统管理员 | `admin` | `123456` | 只读 + 演示重置 |

## 2. 推荐演示路径（约 8 分钟）

1. owner 登录 → `/projects`，展示四个 Seed 与搜索/筛选（搜 `CRM`）。
2. 点击“新建营销视频”，填写：项目名、产品 URL、目标用户、抖音+视频号、120 秒、9:16、勾选授权 → “创建并采集资料”。
3. 自动进入 `/studio/{id}/ingest`：
   - URL 选择 `PUBLIC_SUCCESS` → 开始模拟采集，观察任务事件；
   - 上传一张截图与一个 PDF（仅元数据）→ 检查覆盖度变化；
   - 打开“演示环境授权”，选择 `AUTH_SUCCESS`，展示只读/域名/到期；再演示 `SESSION_EXPIRED`。
4. 点击“确认资料并开始分析” → 确认弹窗（来源、缺失项、Mock 提示）→ 自动进入 S2，观察任务进度。
5. `/studio/{id}/understanding`：
   - 查看产品定位、2 个画像、功能卡、5 个痛点、价值线索；
   - 打开证据抽屉，说明 `verified / user_confirmed / hypothesis / unsupported`；
   - 编辑痛点并保存草稿，刷新页面确认仍在；
   - 选择“仅重新分析痛点”生成 R2，切换 R1/R2，旧版本保留。
6. 在审核区填写一条“审核意见”（reviewer 也可操作），再点击“确认产品理解”，勾选“知悉仍有 AI 推测”，确认 → 进入 `/studio/{id}/angles`。
7. 展示 M2 交接卡与 JSON：revisionId、snapshotId、时长、平台、证据、候选价值线索、宣传禁区。
8. 返回 `/projects`：新项目在列表，阶段为“创意”，显示“已确认”。

异常演示（可选）：

- URL 选 `LOGIN_REQUIRED`：提示补授权/录屏；
- 重新分析或首次分析选 `UNDERSTANDING_FAILED`：失败可重试；上传场景切到“模拟上传失败”，再点“重试”；
- 两个标签页同时编辑同一修订：旧版本保存返回 409，提示刷新合并；
- reviewer 登录：菜单只读，尝试创建/编辑按钮被禁用，直接调用 API 返回 403。

## 3. 常用命令

```powershell
cd D:\LSProject\VidCraft\frontend
corepack pnpm dev:ele
corepack pnpm --filter @vben/web-ele run typecheck
corepack pnpm build:ele
corepack pnpm run lint
node tests/e2e/m1-api-check.mjs
node tests/e2e/m1-smoke.mjs
node tests/e2e/m0-smoke.mjs
```

## 4. M1 → M2 交接契约

M1 审核通过后，`GET /projects/:id/understanding/handoff` 返回：

```json
{
  "projectId": "project_xxx",
  "ingestionSnapshotId": "snapshot_xxx",
  "productUnderstandingRevisionId": "revision_xxx",
  "productUnderstandingVersion": 2,
  "approvedBy": "demo_owner",
  "approvedAt": "2026-11-06T08:00:00.000Z",
  "evidenceIds": ["evidence_xxx"],
  "selectedValueSeeds": ["seed_xxx"],
  "targetDurationSec": 120,
  "primaryPlatform": "douyin",
  "aspectRatio": "9:16",
  "language": "zh-CN"
}
```

M2 必须继承的约束：

1. 只能以 `APPROVED` 且未 `STALE` 的修订为输入，不得重新从原始 URL 猜测；
2. `prohibitedClaims`、`unsupported`、`hypothesis` 与证据引用必须继续生效，不能升级成确定性宣传语；
3. `selectedValueSeeds` 只是候选，M2 仍需生成 3 套差异化创意并让用户选择；
4. 已确认修订不可直接修改：M2 如需回退，必须基于新修订/新证据，不允许静默覆盖 M1 审核版本。

## 5. 已知限制（演示前告知）

- 所有采集、授权、AI 分析与文件处理均为模拟，不访问真实网站/模型；
- 素材只保存元数据，刷新后本地预览失效；
- Mock 数据保存在 本地 JSON 文件，重启恢复；Reset 回到种子；
- 权限只是演示级前端 + Mock 校验，不是真实安全边界；
- 未实现真实视频生成、计费与 FFmpeg。
