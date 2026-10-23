# 页面减法版本验收

日期：2026-10-23。分支：`codex/simplify-panels`，基于 `main` 的 `a047b26`。原四屏设计保留在 `main`，本次不更新远端或线上部署。

## 按截图删减

- Overview：移除顶端辅助标语、Open / Agent-first / On-chain 三列特点及其下的 “Open standards. Common ground.”，移除整个右侧 SVG 网络组件。保留标题、介绍、两个行动入口及三个协议链接。
- Protocols：移除 “02 / THE BUILDING BLOCKS” 和底部 “OPEN PROTOCOLS” 说明块；保留标题、介绍、探索入口及四张协议卡片。
- Build：从面板组合、顶栏导航与页脚进度中移除，滚轮与键盘从 Protocols 直接进入 About。
- About：仅移除 “04 / THIS IS QUANTX”，保留其余内容与悬停反馈。

Overview 改为居中的单栏内容，标题、介绍与协议链接共用左对齐基线；宽屏限制内容宽度，矮屏收紧字号与间距，手机保持完整可读。Protocols / About 使用原有垂直居中布局，删去的文案不保留空白占位。

导航、进度、活动状态、读屏提示和计数使用同一份三屏数据；About 为 03，计数总数由 `sections.length` 计算。首页停止加载已移除网络组件的交互脚本；原组件源码与独立 `/logo-check/` 演示保留。

## 验证

- `npm run dev`：可通过 `http://127.0.0.1:4321/` 访问。
- `npm run check`：32 个文件，0 errors / warnings / hints。
- `npm run lint`：通过，Oxlint 无 error。
- `npm run format` 与 `npm run format:check`：通过。
- `npm run build`：通过，首页与独立 Logo 演示两条路由均生成。
- 浏览器用例共 36 项，已全部验证通过；涵盖三屏滚轮切换、手势合并、键盘与锚点、无 JavaScript 导航、移动端阅读、文本对比度、Protocols 所有链接悬停及独立 Logo 演示。
- 首页在 Chrome 原生 80%、90%、100%、110% 缩放下验证；1280×600、1024×600、1440×900、1920×1080 与 390×844 的对应测试通过，无首页或全局纵向溢出。

桌面三个面板已在本地浏览器逐屏检查。当前本地截图位于 `artifacts/simplified-20261023/`：`overview-desktop.png`、`protocols-desktop.png`、`about-desktop.png`、`overview-mobile.png`。该目录沿用现有 `.gitignore` 规则，不提交截图及测试产物。
