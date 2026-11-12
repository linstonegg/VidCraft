# G4 最终回归（ReferenceAd 上传 + Storyboard 锚点/有效性）

> 时间：2026-11-10 16:28–16:35（Asia/Shanghai）  
> 日志：[`g4-final-p1-complete-20261110.log`](./g4-final-p1-complete-20261110.log)

## 结果

| 套件                     | 结果             |
| ------------------------ | ---------------- |
| M0                       | **25/25**        |
| M1 API / UI              | **43/43、14/14** |
| M2 API / UI              | **48/48、20/20** |
| M11 API / UI             | **59/59、27/27** |
| Vitest                   | **35/35**        |
| typecheck / build / lint | 通过             |

## 本轮完成

- ReferenceAd 真实文件选择（视频文件），文件名/大小/MIME 进入 Mock 资产；
- ReferenceAd 采用 ID 复制到 `CreativeBrief.referenceAdInsightId`；
- Storyboard 历史锚点 `sb/shot/shotRevision`，刷新可恢复；
- `effectiveValidity` 接入 ProductionReadiness，并校验参考图存在/状态/归属/版本/STALE；
- Concepts `viewMode`/聚焦持久化、组合来源展示、1366 三列降级；
- Schema2 真实 fixture 启动验证通过；
- 研究规则服务端化；
- 画布缩放/平移。

## 边界

- ReferenceAd 仅保存 Mock 元数据，不保存真实二进制/解码/ASR；
- VIS-023/026/027/034/036 仍为部分画布展示；
- as-built 未签收，Git 未提交。
