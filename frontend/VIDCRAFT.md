# VidCraft 前端迭代说明

基线：Vue Vben Admin 26706d65c9401a7818cf83369081c26b68990ef7，业务位于 apps/web-ele。

## 启动

Node 22.18+，pnpm 11。

```powershell
pnpm install --store-dir .pnpm-store --registry=https://registry.npmjs.org
pnpm dev:ele
```

使用 Vben 演示账户登录后进入“创意视频工作台”。业务数据存于当前浏览器 localStorage，不跨设备同步。清除 vidcraft-*、production-*、storyboard-approved-* 键可重置演示。

## 当前实现

产品工作台、项目详情、新建向导、搜索排序、归档回收站、复制草稿；项目资料授权与证据确认；三种创意与时长策略；剧本节拍到分镜；分镜参数编辑与历史候选；动态报价、冻结结算、未知结果对账、模拟充值；异步合成快照和 JSON 导出；素材、任务、账单和设置页面。

浏览器回归已覆盖登录到导出主流程，服务层检查覆盖报价、账务、审核、资料、冲突、剧本与项目管理。最新范围见 docs/ACCEPTANCE.md。

## 已知限制

业务数据仍通过 localStorage 持久化，未实现 Nitro 业务接口；钱包已改为浏览器内账户共享，历史项目流水自动汇入；尚未迁移服务端钱包。Mock 角色可以切换，不能视为正式授权。参考画面为程序示意，不是生成的视频。导出为模拟快照 JSON，非 MP4。

尚缺完整媒体资源、版本并排比较、结构化剧本双向同步、视觉规范、完整通知、正式接口契约落实及全部第24章验收。不能作为正式收费系统。

## 回归命令

```powershell
pnpm --filter @vben/web-ele typecheck
node --experimental-strip-types tests/creative-video/production.test.mjs
node --experimental-strip-types tests/creative-video/projects.test.mjs
node --experimental-strip-types tests/creative-video/intake.test.mjs
node --experimental-strip-types tests/creative-video/consistency.test.mjs
node --experimental-strip-types tests/creative-video/story.test.mjs
node tests/e2e/inspect.mjs
```

浏览器测试当前使用本机 Chromium 路径，跨机器运行前需配置浏览器位置。
