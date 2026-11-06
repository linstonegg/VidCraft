# 业务契约（当前本地 Mock）

业务模块位于 apps/web-ele/src/api/creative-video，页面通过服务模块读写，不调用模型。

- projectApi：项目列表、创建、持久化；Project 包含 id/name/url/stage/duration/angle/report。
- assetApi：素材元数据校验、添加、删除；projectId 标识所属项目，不上传文件内容。
- intakeApi：load/save/collect；资料修订 revision 与 confirmedRevision 分离；证据等级为事实、推测、待核实。
- production：generate 冻结，settle 幂等结算或释放；cancel 仅处理运行中任务；adoptVersion/rejectVersion 执行审核权限检查。
- startRender：只能引用已采用且未拒绝的候选；提交后保存不可变 JSON 快照；settle 推进合成状态。
- permissions：演示角色 owner/editor/reviewer/viewer；可在界面切换，仅适用于本地演示，不是安全认证系统。

任务状态：running/success/failed/cancelled/timeout。合成状态：running/success/failed/cancelled。

正式接口尚未实现，未来应使用 Nitro 与 HTTP Repository 替换 localStorage，同时在服务端实现权限、账户钱包、幂等与并发控制。当前数据不可作为正式账务依据。

## Nitro 工作区快照（迁移阶段）

`POST /creative-video/workspace` 使用 Vben 登录令牌识别账号，不接受客户端提供的账号ID。

- `{ action: 'read' }` 返回 `{ revision, updated, data, instance, persistence: 'server-memory' }`。
- `{ action: 'write', expectedRevision, data }` 保存业务键值快照；版本不同返回409，角色不允许返回403，未登录返回401。
- 业务字段白名单不包含登录令牌、密码或演示角色设置。限制快照8MB。
- 服务端仅内存保存，重启清空，通过instance标识检测重置；本地原数据保留。
- 页面恢复会明确提示替换当前账号工作区，导入失败尝试恢复原本地快照。

这不是完整任务和钱包API迁移：当前钱包仍在浏览器执行，本接口负责按账号隔离的工作区读写和版本保护，不应作为正式账务接口。

## 服务端生成与钱包（本轮迁移）

`POST /creative-video/generation` 新增：

- `state`：当前登录账号的任务、流水、余额、revision、instance。
- `topup`：100/500模拟充值；无真实支付。
- `cancel`：运行中任务转费用核对，不立即释放。
- `reconcile`：明确success/failed后结算或释放；重复请求不重复记账。
- `submit`：服务端一次同步操作内校验余额、冻结、创建任务；报价与幂等校验成功前不创建流水。

Studio和任务中心已读取服务端任务/钱包结果，serverManaged任务不由浏览器本地模拟器结算。查询按服务端时间推进Mock任务。服务端为内存状态，重启会重置；尚缺完整重启恢复策略。角色仍为演示头，未完成正式账号角色绑定。项目、审核、合成继续本地运行，尚不能视为整套业务迁移完成。

## 服务端候选审核与合成

- `POST /creative-video/review`：projectId、shotId、versionId、action adopt/reject、expectedRevision；仅演示owner/reviewer；候选必须属于当前账号的成功任务（或受限内置样例）。审核冲突409，事件记录actor/date/revision。
- `POST /creative-video/render`：projectId、shots、settings、idempotencyKey；校验当前正式引用、候选来源、净时长、输出规格与人工检查。创建不可变快照；同幂等键相同请求返回原任务，不同内容409。
- 通过生成state查询同步审核、合成任务；合成状态按服务端时间推进。预置视频仍只是播放器演示，不是对时间线执行FFmpeg。
- 服务重启时前端保留旧成功成片快照；旧运行中合成标记停止并保留时间线。

项目资料、理解、剧本与分镜确认仍未全部迁入服务端API；完整正式权限与持久化尚未完成。

## 项目仓库迁移

`POST /creative-video/projects`：

- action list：返回当前登录账号项目记录、各自revision及服务实例标识。
- action save：project、expectedRevision；新建预期0，更新需匹配版本；软删除/归档保留记录，不删除任务和费用。
- 字段白名单、名称/时长/阶段校验；错误401/403/400/409。

项目新建、手动草稿保存、重命名、复制、归档、软删除恢复已接入；本地仍保留编辑缓存。读取服务端项目仅补充本地缺失项目，不自动覆盖现有草稿。尚缺自动同步与冲突差异合并、服务重启后项目恢复以及全部资料子资源API迁移。

## 理解与剧本修订子资源

`POST /creative-video/resources`：projectId、kind understanding/script、action read/save。

- read 返回current和history，按登录账号隔离。
- save 需expectedRevision；确认理解要求owner/reviewer，草稿写入要求owner/editor。
- 理解确认校验产品定位与至少5条候选；剧本校验节拍及targetSeconds总时长。
- 前端理解确认与剧本保存已同步到Nitro，失败保留本地并阻止继续；同步期间再次修改不会被误标为已保存。

当前仍为内存仓库；资料上传、创意、分镜确认等子资源未全部迁移，资源冲突后的差异合并和跨设备完整恢复仍待完成。

## 资料采集修订

resources.kind新增intake：保存素材元数据（不上传文件内容）、演示授权、脱敏标记及证据列表。确认需要有证据、已脱敏、需要登录时已授权。产品理解确认需引用当前服务端已确认的intake修订，错误引用409。

前端采集与证据确认均同步Nitro；失败保留本地内容与未同步门禁。尚缺文件内容服务、资料覆盖度、解析进度、来源预览、细粒度素材引用及子资源恢复差异界面。

## 登录账号绑定的演示角色

- vben：owner，可在UI降权模拟editor/reviewer/viewer。
- admin：editor，可编辑和付费生成，不可提升为owner或执行候选审核/导出。
- jack：reviewer，可审核，不可付费生成。
- 其他身份默认viewer。

服务端根据有效登录令牌中的已验证账号确定基础角色；x-mock-role仅可降权模拟，不是授权来源。前端同样限制可选角色。本地角色设置不能提升服务端权限。

当前仍无多人项目成员/共享空间授权；数据继续按账号隔离，不是完整团队协作权限。

## 开发任务异常控制

`POST /creative-video/scenario` 接收jobId、scenario success/failure/unknown/duplicate。仅开发环境及已绑定拥有者允许调用；只能影响当前登录账号任务。可选择较晚提交的任务先完成验证乱序，不能用完成顺序自动采用候选。

终态任务不得重新执行成功/失败；duplicate只重复推进并报告是否产生重复候选或流水。unknown保持冻结，failure明确释放。开发UI仍缺模型能力与授权过期等控制，不代表完整20.6节已完成。

## 模型能力元数据

`GET /creative-video/models`：返回示例视频模型能力矩阵。示例A支持5/8/10秒、720p、9:16/16:9；示例B支持1至20秒、720p/1080p及三种画幅。首尾帧、延展、音频等字段仅为Mock能力说明，不承诺真实供应商能力。

报价接口按当前能力拒绝不支持组合，返回422及MODEL_DURATION_UNSUPPORTED / MODEL_RESOLUTION_UNSUPPORTED / MODEL_ASPECT_UNSUPPORTED。Studio展示原因与可用秒数，清晰度和画幅按能力禁用。

尚未实现全部首尾帧/延展/原生音频的输入操作和生成方式分流，不能将能力显示等同于这些操作全部完成。
