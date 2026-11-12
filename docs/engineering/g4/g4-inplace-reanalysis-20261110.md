# G4 最终回归（ReferenceAd 原位重新分析 + Storyboard viewMode）

> 时间：2026-11-10 19:01–19:10（Asia/Shanghai）  
> 日志：[`g4-inplace-reanalysis-20261110.log`](./g4-inplace-reanalysis-20261110.log)

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

- ReferenceAd 文件上传后浏览器解码视频宽高/时长/画幅并生成首帧缩略图；
- Mock ASR 转写；
- 小文件 data URL 作为 Mock 二进制保存（≤2MB）；
- 重新分析改为原位更新同一 Insight，版本递增；
- Storyboard `viewMode` 按私有偏好持久化；
- 研究问题上下文 API 和画布列表；
- VIS-023 跨 Brief 422；
- Concepts viewMode/聚焦持久化与 provenance 展示。

## 边界

- 二进制仍是 Mock data URL，不是对象存储；
- ASR/视觉分析仍是固定 Mock；
- VIS-026/027/034/036 仍为部分场景；
- as-built 未签收，Git 未提交。
