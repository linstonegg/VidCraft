# G4 最终回归（ReferenceAd 解码/ASR/重新分析）

> 时间：2026-11-10 17:45–17:55（Asia/Shanghai）  
> 日志：[`g4-refad-analyze-20261110.log`](./g4-refad-analyze-20261110.log)

## 结果

| 套件                     | 结果             |
| ------------------------ | ---------------- |
| M0                       | **25/25**        |
| M1 API / UI              | **43/43、14/14** |
| M2 API / UI              | **49/49、20/20** |
| M11 API / UI             | **62/62、27/27** |
| Vitest                   | **35/35**        |
| typecheck / build / lint | 通过             |

## 本轮完成

- ReferenceAd 文件选择后浏览器解码视频元数据（宽高/时长/比例）；
- 生成首帧缩略图（Mock previewDataUrl）；
- 后端保存媒体元数据与 Mock ASR 转写；
- `/references` 显示解码信息、ASR 和“重新分析”；
- `POST /reference-ads/:id/reanalyze` 创建重新分析任务并生成新洞察；
- 跨 Brief 组合 422；
- 研究问题上下文 API/面板；
- Storyboard 历史锚点与 readiness effectiveValidity。

## 边界

- 二进制只保存小文件 data URL（≤2MB），不落真实对象存储；
- ASR/视觉分析仍是固定 Mock，不调用真实模型；
- VIS-026/027/034/036 仍为部分画布展示；
- as-built 未签收，Git 未提交。
