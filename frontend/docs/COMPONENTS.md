# 组件说明

业务组件位于 apps/web-ele/src/views/creative-video。

| 组件 | 输入/事件 | 用途 |
|---|---|---|
| ProjectWizard | initialName；created(Project)、cancel | 新建目标、规格和授权 |
| IntakePanel | projectId、url、mode | 输入记录、授权与证据确认 |
| UnderstandingPanel | projectId | 产品画像、痛点和理解修订 |
| CreativePanel | projectId、selected；select(index) | 方案选择、收藏和比较 |
| ScriptPlanner | projectId、duration、title、angle；duration | 结构化节拍、修订与时长 |
| ProductionPanel | projectId、duration、stage | 分镜、候选、任务、质检及合成 |
| AnimaticPlayer | shots | 图片和字幕节奏预演 |
| MockVideoPlayer | src、label | 视频控制及失败恢复 |
| VersionCompare | versions、adopted | 候选演示视频和输入快照比较 |
| RenderSettingsPanel | production、settings | 输出参数及人工检查 |
| WorkspaceSyncPanel | 无 | 当前账号工作区的服务端保存恢复 |

保存草稿与明确确认不同。媒体组件卸载时暂停播放。所有视频必须保留演示标识，不可将测试片标为实际生成结果。
