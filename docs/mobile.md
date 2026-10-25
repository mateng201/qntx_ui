# 手机端开发说明

当前实现位于 `mobile` 分支，与 Web 共用 npm 锁文件和 Nx 工作区。Mobile 是原生 React Native 组件，不是把现有网站嵌入 WebView。

## 日常运行

在仓库根目录执行：

```powershell
npm ci
npm run dev:mobile
```

这个命令直接启动 Mobile 工作区的 Expo / Metro，并在 PowerShell、VSCode 集成终端等交互式终端中显示二维码与键盘快捷键。它等价于 `npm run start --workspace=mobile`。构建、检查、依赖边界与项目图仍由 Nx 管理。

交互式启动不经过 Nx 的 `stream` 日志转发：当前 Nx 版本在 Windows 上默认关闭伪终端支持，转发后的 Expo 会把输出识别为非交互式环境，只打印 `Waiting on http://localhost:8081`，省略二维码和快捷键菜单。在 CI、输出重定向或编辑器的非交互式输出面板中，也不保证显示二维码。

若端口被之前的服务占用，先在对应终端按 `Ctrl+C` 停止，再重新运行。也可以指定其他端口：

```powershell
npm run dev:mobile -- --port 8091
```

`Both an oxfmt and a prettier config were found` 是 Nx 发现两种格式化配置的提示，不会阻止 Expo 启动。项目有意保留两者：Oxfmt 处理普通文件，Prettier 处理 `.astro` 文件，统一使用 `npm run format`。

- Android：可连接真机或使用配置了 Android SDK / ADB 的模拟器。
- iOS：可连接支持当前 SDK 的客户端；本地 iOS 模拟器和原生编译需要 macOS / Xcode。
- 手机连接开发电脑时需要可访问其开发服务，通常使用同一局域网。
- 当前使用 Expo SDK 58。Expo Go 客户端必须支持该 SDK；若客户端版本不匹配，使用支持该 SDK 的 development build，而不是混装不同版本的原生模块。

在浏览器先看排版与交互：

```powershell
npm run dev:mobile:web
# http://localhost:8082/
```

这是 React Native Web 的辅助预览，不会替换 `http://127.0.0.1:4321/` 的 Astro 网站。Web 与 Mobile 的全局样式和运行脚本分别属于自己的应用。

## 页面与交互

2026-10-25 更新只针对 Expo / React Native 应用；≤760px 的 Astro 窄屏网页继续保留原三个面板。

| 阶段     | 手机端行为                                                                            |
| -------- | ------------------------------------------------------------------------------------- |
| 开场     | 吉祥物在可用视口中央显示静态 Q，导航栏左侧只有 QuantX 字样与归位槽位                  |
| 触摸滚动 | Q 平滑展开为动画，逐渐退为背景；组织介绍 → Protocols 四项功能说明原地切换             |
| 收尾     | 吉祥物缩小并移动到导航栏槽位，平滑收回静态 Q；Overview / About 合并内容以单栏继续阅读 |
| 停止操作 | 开场和归位后五秒无操作时播放待机动画；触摸或预览中的鼠标移动会平滑收回 Q 并重置计时   |

Protocols 的四张功能说明保留全部共享文案，没有跳转或点击操作。合并版面的探索、标准和三条资源入口仍通过 React Native Linking 打开；浏览器辅助预览打开独立窗口，保留当前滚动位置。顶部只保留品牌与 GitHub / Docs，底部标签和 About 深色主题已移除。

静态 Q → 动画约 360ms，动画 → 静态 Q 约 320ms；复用与网页相同的原动画目录、路径起点对齐和形变算法，连续输入从当前形状衔接。滚动叙事期间持续播放，操作不会中断背景动画。进入后台时暂停，返回前台重新按当前阶段决定播放与计时。

页面使用 `Animated.ScrollView` 与原生 `Animated`：位移、缩放、透明度在原生平台使用 native driver；SVG 轮廓在 JS 线程计算，计算与绘制一起限制为约 30fps。Android/iOS 通过现有 `react-native-svg` 的 `setNativeProps` 更新变化的路径，不在每帧触发 React 状态与协调；浏览器辅助预览保留 React 路径更新。没有新增动画库、UI 库或路由库。

触摸 / 鼠标活动通过局部控制器更新待机截止时间，不在每次输入时更新整页状态，也不反复创建 / 清除定时器。动画帧循环独立于操作计时，连续操作不会重复重启收回 Q 的 320ms 过渡。滚动只在语义阶段改变时更新页面状态，原生滚动事件映射保持稳定。

标题和正文保留系统字体缩放。可用高度低于 600px、字体缩放大于 1.15 或屏幕阅读器开启时，切换为自然纵向阅读，避免把内容压缩进固定视口；收尾资源始终可以正常纵向读完。系统开启减少动态效果时保持静态 Q。安全区域仍由 `react-native-safe-area-context` 处理。

屏幕阅读器检测只在 Android/iOS 使用原生 API。React Native Web 的该接口固定返回 true，无法代表浏览器的实际状态，因此辅助预览不根据这项占位结果强制切换布局，仍按尺寸选择叙事 / 自然阅读模式。

点击 QuantX 返回开场；Android 在已滚动时按系统返回键先回顶部，顶部再交给系统。窗口尺寸改变时回到开场并重新测量，归位坐标位于安全区域内的实际应用框架。

## 实现与 Nx 边界

| 文件 / 项目                                       | 职责                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `apps/mobile/src/App.tsx`                         | 安全区域、精简导航、原生滚动驱动、阶段切换、归位和 Android 返回 |
| `apps/mobile/src/components/Mascot.tsx`           | 原生 SVG、静态 / 待机 / 叙事播放、双向形变与生命周期            |
| `apps/mobile/src/animation/playback.ts`           | 独立帧循环、五秒计时、形变与后台暂停；限制实际轮廓计算频率      |
| `apps/mobile/src/components/NarrativeContent.tsx` | 组织介绍、纯文字功能与浅色合并版面的原生组件                    |
| `apps/mobile/src/hooks/useReducedMotion.ts`       | 系统减少动态效果与屏幕阅读器偏好                                |
| `packages/mascot`                                 | 两端共用的动画目录、静态轮廓、插值和 SVG 路径计算               |

`@qntx-ui/mascot` 是新增的本地 npm workspace，不是第三方依赖；其 Nx 标签为 `platform:shared` / `type:lib`，只依赖 content，没有 React、React Native 或 DOM。网页控制器通过公开入口导入它，手机端没有跨目录引用 Web 组件。安装时仅增加本地工作区链接，没有升级锁定的 Expo / React Native / React 等外部依赖。

清理了原生版旧底部标签与页面选择状态、深色 About 样式、旧静态 BrandMark 组件和外链组件的深色分支。网页表现保持现状，仅动画数学的存放位置调整为共享包。

## 配置与版本

Nx 24.0.0 通过通用任务执行器接入两端，无需将 Astro 或 Expo 强行接入另一套构建器。Metro 使用 Expo 默认工作区解析，仅将并行 worker 限制为两个，以控制本地开发的资源占用；没有人为配置 React 别名或跨目录复制依赖。

Expo 58.0.17、React Native 0.88.0、React / React DOM 19.3.0 继续沿用已经锁定的组合。所有依赖在根锁文件中记录，不在子应用分别维护锁文件。

共享包使用 TypeScript 源码 exports，由 Astro / Metro 分别处理；无需先构建或发布到 npm。`content`、`design-tokens` 与 `mascot` 是私有工作区包，其 `@qntx-ui/*` 名称与上游 qntx 工程配置包不同。

## 检查与产物

```powershell
npm run check
npm run lint
npm run lint:boundaries
npm run test:boundaries
npm run doctor:mobile
npm run build:mobile
npm run test:mobile
npm run test:mobile:animation
```

`build:mobile` 只生成 `apps/mobile/dist/` 下的平台 JS / Hermes 资源及浏览器文件。它不是安装包构建命令。

安装包可在具备 Android SDK 的机器上进行本地原生构建，iOS 使用 Xcode，或后续单独配置 EAS。当前没有执行云构建、登录 Expo、上传代码、应用签名或商店发布。`org.qntx.mobile` 是开发配置中的应用标识，正式发布前应确认使用有权限的标识与签名。

## 本机验证的限制

本轮浏览器检查覆盖真实触摸滑动、五秒真实计时、双向形变、Logo 归位、320×640 / 390×844 / 768×1024 排版、矮屏自然阅读、尺寸切换与外链保留位置。浏览器预览与原生 Hermes 导出都属于开发验证，不等同于真机安装。

本轮没有进行真机安装或原生模拟器运行。已执行的是类型检查、两个原生平台 Hermes 导出，以及浏览器预览的功能与布局检查。原生安装、真实安全区域、Android 系统返回键、VoiceOver / TalkBack、原生浏览器跳转和系统字体缩放仍需设备验收，不能从浏览器结果推断已经通过。

## 真机卡顿排查与优化（2026-10-25）

用户在 Redmi K50 系列（天玑 8100、12GB、Android 14 / HyperOS 2.0.10.0.ULNCNXM）的 Expo Go 中反馈动画起止与滚动卡顿。检查确认原实现存在额外 JS 开销：30fps 限制只包住绘制提交，轮廓仍按屏幕刷新频率计算；每次采样重建约 2,400 个三维模型点，多次计算相同旋转的三角函数，并将中间轮廓生成 SVG 后重新解析为点；原生路径更新还经过每帧 React 状态更新。

修复将采样放到帧率判断之后。Mobile 选择共享引擎的 `directGeometry` 分支：缓存不变的模型点、逐帧预计算旋转函数、直接传递轮廓点。保留原来的 96 点轮廓、坐标精度、目录动作与时序；Web 仍走默认分支。形变起点对齐只为最终选中的顺序分配数组，取消每个候选顺序的临时数组，并提前结束不可能胜出的距离比较。

电脑端 Node 24 基准中，60 秒目录采样的中位耗时约从 2.02ms 降到 0.84ms，P95 从 3.14ms 降到 1.26ms；这只是 JS 采样耗时，不包含真机原生 SVG 绘制，也不能换算为手机 FPS。逐帧几何对比没有差异。`test:mobile:animation` 模拟 60/90/120Hz，验证实际采样约 30 次 / 秒，并覆盖待机计时、连续输入、后台暂停和形变对齐。

`npm run dev:mobile` 默认启用开发模式。React Native 官方说明开发模式会明显增加 JS 线程开销；需要在设备上比较关闭开发模式后的表现：

```powershell
# 先在原 Metro 终端 Ctrl+C 停止，再启动，重新扫码 / 完全重开 Expo Go 中的项目
npm run dev:mobile -- --no-dev --minify
```

此命令由现有脚本传给 `expo start`，不升级依赖、不生成安装包；运行生产模式 JS 仍不同于最终 release 原生安装包。不要同时开元素检查器、录制分析和性能浮层来判断最终体验。若仍卡顿，分别记录普通滑动、五秒切换和归位时的 JS / UI 帧率，再用 React Native DevTools 定位剩余工作；SVG 路径仍属于 JS 更新，约 30fps 的轮廓节奏也不等于 60/120fps 的原生位移。

参考：[React Native 性能说明](https://reactnative.dev/docs/performance)、[Expo 开发与生产模式](https://docs.expo.dev/workflow/development-mode/)。本次没有直接连接该真机，设备帧率与体感改善仍待复测。

## Web 部署路径

仓库根目录执行 `npm run build`，产物改为 `apps/web/dist/`。迁移分支上线时，应同步修改 Cloudflare 的产物目录；无需为 Mobile 部署另一份 Astro，也不要把 Expo 导出目录作为官网产物。本次没有修改现有线上配置。
