# Mock 场景与验证

1. 创建项目，输入 http/https URL，添加脱敏文件元数据。
2. 勾选需要登录，未授权时采集应被阻止；授权并脱敏后允许模拟采集。
3. 产品理解中核对证据并确认当前修订，之后才能进入创意。
4. 三种长片策略、编辑剧本；确认分镜后生成。
5. 生成前报价；成功结算，失败、超时、取消释放；成功仅增加候选。
6. 采用候选后提交模拟合成，等待成功；修改分镜不改变旧快照。
7. 切换 reviewer，生成应不可用；viewer 不可编辑。

自动回归：

```powershell
node --experimental-strip-types tests/creative-video/production.test.mjs
node --experimental-strip-types tests/creative-video/intake.test.mjs
pnpm --filter @vben/web-ele typecheck
```

以上是服务层回归；尚未替代文档要求的浏览器 E2E。当前仍缺正式 Nitro 业务持久化、并发冲突保护和完整跨阶段版本失效规则。
