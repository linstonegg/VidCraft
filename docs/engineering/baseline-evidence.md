# 上游原版基线留证（M0 §2.1）

> 目的：按《VidCraft工程基础搭建指南》§2.1「先跑通原版，再开始精简」的要求，在**独立目录**运行未经任何修改的上游 Vben，并留存三张基线截图。

## 1. 原版环境

| 项 | 值 |
| --- | --- |
| 目录 | `D:\LSProject\_vben-baseline`（仓库外，避免污染业务仓库） |
| 来源 | <https://github.com/vbenjs/vue-vben-admin> |
| Tag / Commit | `v5.7.0` / `63a38dce49ba109f61607994e21ba921d8e970e9` |
| Node / pnpm | 22.22.3 / 10.33.4（Corepack） |
| 安装命令 | `corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store` |
| 启动命令 | `corepack pnpm dev:ele` |
| 前端地址 | <http://localhost:5777>（上游 `.env.development` 默认端口） |
| Mock 地址 | <http://localhost:5320/api> |

## 2. 基线截图

目录：`docs/screenshots/baseline/`

| 文件 | 内容 |
| --- | --- |
| `baseline-01-login.png` | 原版登录页：Vben Admin Ele、Super 演示账号、滑块验证 |
| `baseline-02-home.png` | 原版登录后主页：默认进入 `/analytics` 分析页 |
| `baseline-03-terminal.png` | 原版终端服务运行状态：Vite 端口 5777、Nitro Mock 5320 |
| `terminal-dev-server.log` | 终端的原始文本输出（UTF-8，供核对） |

说明：

- `baseline-03-terminal.png` 由 `pnpm dev:ele` 的**真实终端输出**渲染为图片（同目录保留了原始日志），不是手写或伪造的截图；渲染仅做去 ANSI 颜色和等宽字体排版。
- 截图时业务仓库的 dev server 已暂停，避免两个 Nitro Mock 争用 5320 端口。

## 3. 原版观察结果（用于对照 M0 改动）

| 项       | 原版行为                                             |
| -------- | ---------------------------------------------------- |
| 品牌     | 浏览器标题/登录页为 `Vben Admin Ele`，英文为主       |
| 登录账号 | `vben` / `admin` / `jack`，密码 `123456`，带滑块验证 |
| 默认主页 | `/analytics`（Vben 演示分析页）                      |
| 菜单     | 概览、演示、项目、关于等官方示例菜单                 |
| Mock     | `apps/backend-mock` 由 Vite 插件自动拉起，端口 5320  |
| 主题     | 默认深色                                             |

## 4. 与 VidCraft M0 交付的差异（已实现）

| 项       | 原版            | VidCraft                                   |
| -------- | --------------- | ------------------------------------------ |
| 标题     | Vben Admin Ele  | VidCraft 创作平台                          |
| 语言     | 英文为主        | 默认中文                                   |
| 登录     | vben/admin/jack | owner/editor/reviewer/admin（演示角色）    |
| 主页     | `/analytics`    | `/dashboard` 工作台                        |
| 菜单     | 官方示例        | 工作台/项目中心/素材/任务/积分/设置        |
| Mock API | 上游演示接口    | `/api/creative-video/v1/**` + 四个种子项目 |
| 布局     | 仅后台布局      | 后台布局 + 全屏 Studio（`noBasicLayout`）  |
| 标识     | 无              | 全站演示模式 Banner                        |

## 5. 复现方式

```powershell
# 1) 独立目录克隆原版（不要放在业务仓库内）
git clone --depth 1 --branch v5.7.0 https://github.com/vbenjs/vue-vben-admin.git D:\LSProject\_vben-baseline

# 2) 安装（复用已有 store 可秒级完成）
cd D:\LSProject\_vben-baseline
corepack pnpm install --store-dir D:\LSProject\VidCraft\.pnpm-store

# 3) 启动（如 5320 被占用，先停掉业务仓库的 dev:ele）
corepack pnpm dev:ele

# 4) 截图脚本（仓库留档：docs/engineering/baseline-capture.mjs）
node capture-baseline.mjs
```

> 采集脚本已归档到本仓库 `docs/engineering/baseline-capture.mjs`，原版目录 `D:\LSProject\_vben-baseline` 仅用于留证，可按需删除（不提交）。
