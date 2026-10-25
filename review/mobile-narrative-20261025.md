# Mobile 原生叙事改版验证

日期：2026-10-25。工作目录：`E:\bigshoot\qntx.ui`，分支 `mobile`。本轮仅更新 Expo / React Native 应用；桌面与 ≤760px 网页的组件、页面和样式均保持原状。

## 实现

- 原生 `Animated.ScrollView` 驱动开场、组织介绍、纯文字 Protocols 和收尾归位；合并资源页单栏纵向阅读。
- 开场与归位后保持静态 Q；五秒无操作播放待机动画，触摸 / 鼠标操作平滑收回。滚动叙事期间持续播放。
- 360ms 进入、320ms 退出的形变复用原数学算法。触摸计时与帧循环独立，连续操作不会反复重启退出过渡，也不会让整页逐帧重绘。
- 清理旧三页标签状态、深色 About、静态原生 BrandMark 和暗色外链分支。
- 新增私有 `@qntx-ui/mascot` 工作区，提取已有动画目录和路径计算；仅增加本地工作区链接，没有新增或升级第三方库。

## 验证与证据

- `npx oxlint`：零 error。
- 五个 Nx 项目类型检查和依赖边界检查通过；边界探针六种非法访问拒绝、一种合法共享访问通过。
- Mobile 浏览器辅助验收 9 项通过：静态开场、实际滚动、纯文字功能、精确归位、五秒真实计时、连续移动期间按时收回、真实触摸事件、小屏排版、自然阅读回退、尺寸切换与外链保留位置。
- 视口覆盖 320×640、390×844、768×1024，以及 844×390 的矮屏回退。
- Android / iOS Hermes 与 Web 导出通过；Web 静态构建通过。
- Web 回归首轮 19/20 通过；一条动画采样用例与 Hermes 导出并行时只采到 13 种轮廓，未达到原阈值 15。导出结束后单独复跑该条通过，没有修改 Web 测试断言。其余桌面、窄屏和独立 Logo 行为均通过。
- 本轮修改文件的 Oxfmt 检查通过。没有批量重写无关文件的 CRLF 换行。

实际 Nx 依赖图：`web → content / design-tokens / mascot`，`mobile → content / design-tokens / mascot`，`mascot → content`。没有 Web / Mobile 跨端组件导入。

## 范围与限制

浏览器预览端口为 8082，属于 React Native Web；真实手机通过 `npm run dev:mobile` 的 Expo 二维码连接。浏览器预览和 Hermes 导出不能替代原生真机验收，本轮没有生成安装包、应用签名、云构建或商店发布。

系统大字体、安全区域、Android 返回键、VoiceOver / TalkBack 和原生外链需要在设备上复核。浏览器的屏幕阅读器接口固定返回 true，已按平台隔离，避免占位值令普通浏览器预览误入回退布局。

截图保存在忽略上传的 `artifacts/mobile-narrative-20261025/`。README 与 `docs/mobile.md` 已同步更新。
