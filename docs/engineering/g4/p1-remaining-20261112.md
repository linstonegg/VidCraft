# P1 专项补齐结果（2026-11-12）

> 基线：清空数据 G4 已全绿；本文件记录随后补的 P1 浏览器/API 专项。

## 本轮新增覆盖

| 项                             | 证据                                     |
| ------------------------------ | ---------------------------------------- |
| VIS-004 收藏不批准             | M2 浏览器收藏后正式状态不变              |
| VIS-010 历史 Shot 详情         | M11 历史 SB/Shot 锚点定位                |
| VIS-013 M3 不触发生成          | M2 浏览器 M3 占位无生成/计费按钮         |
| VIS-015 参考图 V2 旧图保留     | M2 API 参考图 V2 + 旧版本                |
| VIS-016 参考广告不成为产品事实 | M11 API REFERENCE_AD/排除产品分析        |
| VIS-018 刷新保留私有布局       | M2 浏览器 reload 后 translate/scale 保留 |
| VIS-021 Moodboard v2 绑定      | M2 API v2 绑定 + 历史                    |
| VIS-028 NaN/Infinity 坐标      | M2 浏览器注入非法坐标后刷新不崩溃        |
| VIS-033 历史锚点只读           | M11 历史 SB/Shot 只读定位                |

## 最终关闭

- VIS-008：M2 API ConceptGroup 对比；
- VIS-014：M2 API ProductionReadiness 对比；
- VIS-017：Reviewer 画布编辑入口隐藏 + 生成规格 403；
- VIS-020：p1-final-gaps.mjs 50 卡片浏览器性能；
- VIS-025：favorite/focus 后正式选择不变。

## 最新套件

| 套件                     | 结果         |
| ------------------------ | ------------ |
| M0                       | 25/25        |
| M1 API / UI              | 44/44、14/14 |
| M2 API / UI              | 49/49、27/27 |
| M11 API / UI             | 65/65、38/38 |
| Vitest                   | 35/35        |
| typecheck / build / lint | 通过         |

## 结论

P1 VIS-001–036 全部 PASS；不涉及 P0/M3 合同缺口。
