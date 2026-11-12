# G4 最终回归（ReferenceAd/Brief + Storyboard 锚点/有效性 + VIS-023）

> 时间：2026-11-10 17:06–17:15（Asia/Shanghai）  
> 日志：[`g4-p1-remaining-20261110.log`](./g4-p1-remaining-20261110.log)

## 结果

| 套件                     | 结果             |
| ------------------------ | ---------------- |
| M0                       | **25/25**        |
| M1 API / UI              | **43/43、14/14** |
| M2 API / UI              | **49/49、20/20** |
| M11 API / UI             | **60/60、27/27** |
| Vitest                   | **35/35**        |
| typecheck / build / lint | 通过             |

## 本轮完成

- ReferenceAd 真实文件选择（Mock 元数据）；
- ReferenceAd 采用 ID 复制到 CreativeBrief；
- Storyboard 历史 `sb/shot/shotRevision` 锚点与刷新恢复；
- effectiveValidity 接入 ProductionReadiness 和参考图完整性；
- Concepts viewMode/聚焦持久化、组合来源展示、1366 三列降级；
- 跨 Brief 组合返回 422 `CROSS_BRIEF_COMPOSITION`；
- 研究问题上下文 API 和画布约束展示；
- Schema2 真实 fixture 启动验证。

## 边界

- 参考广告只保存 Mock 元数据，不保存真实二进制/解码/ASR；
- VIS-026/027/034/036 仍有部分场景未 PASS；
- as-built 未签收，Git 未提交。
