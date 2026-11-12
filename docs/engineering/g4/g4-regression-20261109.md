# G4 全新进程 + 清空 `.data` 回归记录

> 执行时间：2026-11-09 16:28–16:34（Asia/Shanghai）  
> 执行方式：停止开发服务 → 备份并删除 `.data/vidcraft-m1.json` → 删除 `.nitro` 生成目录 → 重新启动 `dev:ele` → 依次执行全部 P0 套件。  
> 完整命令输出：[`g4-regression-20261109.log`](./g4-regression-20261109.log)。  
> 清理前状态备份：[`state-before-clean-20261109.json`](./state-before-clean-20261109.json)（仅为演示数据，无真实凭据）。

## 1. 全新启动基线

清空持久化状态后，首次启动直接由 Seed 生成，未经过任何测试 Reset：

```text
startup_projects=4
resume_angles=4
resume_handoff_shots=15
canEnterM3=True
```

说明：

- 四个 Seed 项目存在；
- 3D 简历 4 个传播切口存在；
- 全量 M2 链路与 15 镜头 M3 handoff 可从空 `.data` 恢复；
- Claim 未阻塞的 3D 简历可进入 M3 准备。

## 2. 自动化结果

| 套件                | 结果                   |
| ------------------- | ---------------------- |
| `m0-smoke.mjs`      | **22/22**              |
| `m1-api-check.mjs`  | **43/43**              |
| `m1-smoke.mjs`      | **14/14**              |
| `m2-api-check.mjs`  | **38/38**              |
| `m2-smoke.mjs`      | **14/14**              |
| `m11-api-check.mjs` | **48/48**              |
| `m11-smoke.mjs`     | **13/13**              |
| Vitest              | **22/22**              |
| `typecheck`         | ✅ exit 0              |
| `build:ele`         | ✅ exit 0              |
| 根级 lint           | ✅ 0 warning / 0 error |

所有套件均以干净进程首次运行通过，未出现重试后通过的情况。

## 3. 覆盖要点

- M0：四个 Seed、菜单切换、Studio 深链、404/403、Demo Reset、Mock 不可用错误态；
- M1：创建、URL 采集、快照、理解任务、Fork/编辑/审核、资料变化 STALE、幂等、权限、复制项目；
- M2：三套创意、120s/7 Beat、15 镜头、参考图、批量审核、预演、M3 handoff、stale-impact、镜头拆/合/复制、同 Beat 重排序、跨 Beat 拒绝；
- M11：内容版本迁移幂等、资产用途/反向引用/预览、引用只写草稿、视觉规范 Fork + Picker、研究问答/跳过/DISMISSED、宣称冲突/裁决/R2、证据快照、就绪度、依赖影响、生成规格、扫描 Job；
- UI：研究助手、素材使用位置、冲突抽屉、就绪度、生成规格、视觉规范 Picker、确认快照进入 R2。

## 4. 边界

- 这是 Mock + 前端环境的 G4，不等于生产后端/真实模型/支付验收；
- P1 可视化画布/分镜总览未实现，未执行 VIS-001～036；
- 素材撤销授权后的 `REDACTED` 字节访问控制、全量生成规格编辑器、Claim R1/R2 字段级 Diff 仍未实现；
- 未提交 Git，未执行生产构建部署验证。

## 5. 结论

在全新 Node/Vite/Nitro 进程且无持久化 Mock 状态下，P0 主链路、M1.1/M2.1 增量与 M0 回归全部通过；四个 Seed、15 镜头、120 秒预演与已批准快照未发生回归。
