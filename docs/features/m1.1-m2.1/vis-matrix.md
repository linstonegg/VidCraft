# P1 可视化专项矩阵（VIS-001–036）

> 依据规范 §12.5。VIS-001–036 均有实际测试证据。

## Concepts（VIS-001–006）

| ID | 场景 | 当前状态 | 证据/缺口 |
| --- | --- | --- | --- |
| VIS-001 | 原 `/concepts` 三套方案和审核流程 | PASS | `m2-smoke` 三套概念/提交/确认 |
| VIS-002 | 方案对比/自由探索切换不改 ID/状态 | PASS | `m2-smoke` P1-CON-01/02 |
| VIS-003 | 拖动概念卡片只改 UI | PASS | `m2-smoke` P1-CON-04 + localStorage |
| VIS-004 | 收藏/选择 B 不等于批准 | PASS | M2 浏览器收藏后批准状态不变 |
| VIS-005 | A 人物+B 场景组合必须新草稿 | PASS | `m2-smoke` P1-CON-03 Fork/Patch |
| VIS-006 | 禁止并行两套正式 active | PASS | 第二次批准会 STALE 旧 APPROVED，仅一个 active |

## Storyboard（VIS-007–010）

| ID | 场景 | 当前状态 | 证据/缺口 |
| --- | --- | --- | --- |
| VIS-007 | 旧 120s/15 镜头按 SB 顺序显示 | PASS | `m11-smoke` 15/7 Beat |
| VIS-008 | 拖动卡片不改 SB/Shot/时间线 | PASS | M2 API 对比 ConceptGroup 选择/集合不变 |
| VIS-009 | 调整播放顺序走原 reorder | PASS | 浏览器实际创建新 SB，显示 R2 草稿 |
| VIS-010 | 点击 Shot07 打开对应详情/图片 | PASS | M11 历史 SB/Shot 锚点只读定位 |

## 关系/权限/有效性（VIS-011–020）

| ID | 场景 | 当前状态 | 证据/缺口 |
| --- | --- | --- | --- |
| VIS-011 | 角色使用关系只读图 | PASS | `AssetRelationshipPanel` + P1-UI-03 |
| VIS-012 | Logo V2 替换走 Fork/审核 | PASS | v2 写入草稿，旧批准版本保持 APPROVED/版本不变 |
| VIS-013 | “重新生成视频”不触发 M3 | PASS | M2 浏览器验证 M3 占位无生成/计费按钮 |
| VIS-014 | 布局/未采用素材不使正式链失效 | PASS | M2 API 对比 ProductionReadiness 不变 |
| VIS-015 | 采用参考图需复核、旧快照保留 | PASS | M2 API 验证参考图 V2 生成且旧图保留 |
| VIS-016 | 参考广告不能升级产品事实 | PASS | M11 API 验证 REFERENCE_AD/排除产品分析 |
| VIS-017 | Reviewer 不能画布越权 | PASS | 隐藏视觉规范/镜头编辑/排序入口 + 生成规格 403 |
| VIS-018 | 刷新/切项目不覆盖业务状态 | PASS | M2 浏览器刷新后布局保留 |
| VIS-019 | 缺参考图不能绕过审核 | PASS | 清空参考图后 approve 返回 422 |
| VIS-020 | 15 镜头总览性能/资源 | PASS | 50 卡片浏览器重复切换 + heap 预算 |

## V3.0 必补（VIS-021–036）

| ID | 场景 | 当前状态 | 证据/缺口 |
| --- | --- | --- | --- |
| VIS-021 | Moodboard v1→v2 绑定保持 | PASS | M2 API 验证 v2 绑定与旧版本保留 |
| VIS-022 | Shot Image 不能直接塞 Concept | PASS | 使用 image 版本 ID 返回 422 |
| VIS-023 | 跨 project/brief 禁止组合 | PASS | 跨项目 404；跨 Brief 422 CROSS_BRIEF_COMPOSITION |
| VIS-024 | 同 Brief A/B/C 合成 D | PASS | Fork + PATCH + 原 Group；组合字段 |
| VIS-025 | focus/select/approve 分离 | PASS | favorite/focus 后正式选择不变 |
| VIS-026 | USER_NOTE 后不重复追问 | PASS | M11 API 验证同上下文不追问 + 画布点击/高亮 |
| VIS-027 | 唯一证据撤销后重新出现 | PASS | revoke answer 后来源排除，问题重新 ASKED |
| VIS-028 | 恶意 NaN/Infinity 坐标 | PASS | M2 浏览器注入非法坐标后刷新不崩溃 |
| VIS-029 | SB1/SB2 切换对应自身修订 | PASS | 实际创建 R2 草稿并在版本选择器显示 |
| VIS-030 | 同 Beat 重排序 | PASS | M2 API 已有 |
| VIS-031 | 跨 Beat 重排拒绝 | PASS | M2 API 已有 |
| VIS-032 | 转场/净时长非法阻塞 | PASS | 非法 overlap 排序返回 422 |
| VIS-033 | 历史 Shot07 锚点只读 | PASS | M11 历史 SB/Shot 锚点只读定位 |
| VIS-034 | 撤权素材不渲染/不下载 | PASS | 浏览器设置授权不确定后显示阻断/无下载入口 |
| VIS-035 | 新探索草稿不替换正式链 | PASS | Fork/D 后组级 selected 不变 |
| VIS-036 | R2 批准后旧禁用声明阻断 | PASS | 浏览器创建 R2 后画布显示 R2 diff/新增禁用声明/受影响镜头 |

## 结论

- VIS-001–036 全部 PASS；证据以 M2/M11 API/UI 与 p1-final-gaps.mjs 为准。
