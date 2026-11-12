# G4 最终回归（ReferenceAd 上传 + Storyboard 锚点）

> 时间：2026-11-10 15:56–16:10（Asia/Shanghai）  
> 日志：[`g4-final-upload-anchor-20261110.log`](./g4-final-upload-anchor-20261110.log)

## 结果

| 套件                     | 结果             |
| ------------------------ | ---------------- |
| M0                       | **25/25**        |
| M1 API / UI              | **43/43、14/14** |
| M2 API / UI              | **48/48、20/20** |
| M11 API / UI             | **59/59、27/27** |
| Vitest                   | **35/35**        |
| typecheck / build / lint | 通过             |

## 本轮新增

- ReferenceAd 真实文件选择：`input[type=file]` 选择视频文件，文件名/大小/MIME 进入 Mock 资产；
- ReferenceAd 采用：`AngleSet.referenceAdInsightId` 复制到新建 `CreativeBrief.referenceAdInsightId`；
- Storyboard 历史卡片写入 `sb/shot/shotRevision` 路由锚点，刷新后可恢复；
- Storyboard `effectiveValidity` 考虑参考图存在/状态/归属/版本和 STALE；
- 之前的研究规则、画布缩放、Schema2 集成验证均在基线内。

## 边界

- ReferenceAd 仍不保存真实二进制文件，只保存 Mock 元数据；
- VIS-026/027/034/036 仍为部分画布展示，不是完整负向场景；
- as-built 未签收，Git 未提交。
