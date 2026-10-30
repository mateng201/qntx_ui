# QuantX UI 工程说明

本仓库通过 npm workspaces 和 Nx 管理 Astro Web、Expo / React Native Mobile，以及三个平台无关的共享库。本文说明工程入口、文件职责、依赖边界和维护方式；历史验收记录位于 `review/`。

## 1. 安装、运行与构建

所有命令都在仓库根目录执行，项目使用一个 `package-lock.json`。

```powershell
cd E:\bigshoot\qntx.ui
npm ci
```

`npm ci` 按锁文件重新安装依赖，适用于首次克隆、CI 和严格复现。依赖已安装且锁文件未变化时，可以直接启动；增加或更新依赖时使用 npm 更新清单与锁文件。

| 命令                              | 实际入口与用途                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev` / `npm run dev:web` | Nx `web:dev` → Astro 开发服务，默认 `http://127.0.0.1:4321/`。                     |
| `npm run dev:mobile`              | 直接启动 Mobile 工作区的 `expo start`，用于 Expo Go / 原生客户端连接。             |
| `npm run dev:mobile:web`          | Nx `mobile:preview` → Expo Web，地址 `http://localhost:8082/`。                    |
| `npm run build`                   | Nx `web:build` → Astro 静态构建，输出 `apps/web/dist/`。                           |
| `npm run preview`                 | 预览 Web 构建产物，需先执行 `npm run build`。                                      |
| `npm run build:mobile`            | Nx `mobile:export` → 导出 Android / iOS Hermes 与 Web 资源到 `apps/mobile/dist/`。 |

三个开发入口分别在独立终端运行。Astro 网站与 Expo Web 是两个应用，使用不同的运行时和组件树；Expo Web 用于辅助验证 Mobile 代码，不能替代原生真机测试。

### Mobile 调试条件

- 手机须能访问电脑的 Metro 服务，通常连接同一局域网；Expo Go 需支持项目锁定的 SDK。
- `dev:mobile` 有意直接进入 Expo，保留交互式终端的二维码和快捷键。Nx 的 Windows `stream` 转发可能让 Expo 判定为非交互式终端；构建、检查和边界任务仍由 Nx 管理。
- 本地 Android 原生编译需要 Android SDK / ADB；本地 iOS 原生编译与模拟器需要 macOS / Xcode。
- `build:mobile` 生成 JS / Hermes 资源，不生成 APK、AAB 或 IPA。原生安装包、签名与发布需要另行配置。

```powershell
# 自定义 Metro 端口
npm run dev:mobile -- --port 8091

# 停止旧服务后清理 Metro 缓存，适用于切换工程结构后的解析异常
npm run dev:mobile -- --clear

# 使用生产模式 JS 比较性能；仍不同于 release 原生安装包
npm run dev:mobile -- --no-dev --minify
```

### 锁定的主要版本

| 范围            | 版本                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------- |
| 项目 Node / npm | `node` 包 `24.22.0`；`packageManager` 声明 `npm@10.9.2`。                                         |
| 工作区工具      | Nx `24.0.0`，TypeScript `6.0.3`。                                                                 |
| Web             | Astro `7.4.0`，`@astrojs/react` `7.1.0`，Tailwind `4.3.3`。                                       |
| 两端 React      | React / React DOM `19.3.0`；根 `overrides` 保持版本一致。                                         |
| Mobile          | Expo `58.0.17`，React Native `0.88.0`，React Native Web `~0.21.4`，`react-native-svg` `15.16.0`。 |

准确安装结果以根锁文件为准；版本提示不等于运行错误，不应因单条提示混装不同 SDK 的依赖。

## 2. 根目录文件

应用代码位于 `apps/`，共享源码位于 `packages/`。根目录承担依赖安装、任务入口和统一规则。

下面按目录逐个说明文件。职责表先用白话概括用途，再保留技术细节；单独展开的文件也按同样顺序介绍。

命名按职责区分：`HomePage` 是网页结构，`MobileHomeScreen` 是原生首页，`HomeSections` 是原生内容区块；`home-page-scroll` 控制滚动，`mascot-playback` 控制播放，`SvgMascotRenderer` 负责将计算结果写入 SVG。内容区块使用 `opening / about / protocols / resources`，动画阶段使用 `opening / scrolling / docked`；二者分别由区块 ID 和播放阶段类型表达。

| 文件                                             | 职责                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [package.json](package.json)                     | 整个仓库的依赖清单和命令入口，决定安装什么、如何启动与检查各项目。 声明 `apps/*` / `packages/*` 工作区、根命令、公共开发依赖、React 版本覆盖和包管理器版本。            |
| [package-lock.json](package-lock.json)           | 记录实际安装的依赖版本，让其他电脑和构建服务器尽量装出同一套环境。 锁定第三方版本及本地 workspace 链接；两个应用不单独维护锁文件。                                      |
| [nx.json](nx.json)                               | 告诉 Nx 哪些任务需要重跑、哪些结果可以复用，以及任务之间怎样配合。 设置 `main` 比较基线、任务输入、公共配置依赖及构建 / 导出 / 检查缓存；当前关闭 daemon 和交互式 TUI。 |
| [eslint.config.mjs](eslint.config.mjs)           | 检查代码有没有越界引用，例如网页误用手机端代码、共享库反过来依赖应用。 加载 Nx 依赖边界规则；为 `.astro` 配置专用解析器；限制共享库使用浏览器全局和框架依赖。           |
| [oxlint.config.ts](oxlint.config.ts)             | 指定代码质量检查规则，发现常见写法问题和潜在错误。 导入 qntx React 预设并合并忽略范围、CSS / Metro 初始化导入规则。                                                     |
| [oxfmt.config.ts](oxfmt.config.ts)               | 指定大多数项目文件如何自动排版，以及哪些文件应跳过。 导入 qntx 格式预设，排除 `.astro`、锁文件、缓存、测试输出及原生产物。                                              |
| [.prettierrc.json](.prettierrc.json)             | 专门配置 Astro 模板的自动排版。 加载 `prettier-plugin-astro`，负责 `.astro` 模板格式化。                                                                                |
| [tsconfig.base.json](tsconfig.base.json)         | 为整个仓库提供共同的 TypeScript 检查基础。 继承 qntx `strictest`，提供公共目标、模块解析、JSON 导入等设置，供各项目补充环境。                                           |
| [tsconfig.json](tsconfig.json)                   | 检查根目录的配置和工具代码，不负责把所有应用放进同一种环境。 检查根目录配置与纳入范围的工具脚本；不作为 Web / Mobile 的统一运行环境。                                   |
| [wrangler.jsonc](wrangler.jsonc)                 | 告诉 Cloudflare 要部署哪个站点，以及到哪里读取已构建的网页文件。 声明 Cloudflare Worker 名称、兼容日期和 `./apps/web/dist` 静态资源目录。                               |
| [.npmrc](.npmrc)                                 | 控制 npm 从哪里下载包，以及下载失败时的重试方式等。 项目 npm 源、重试和审计输出设置。                                                                                   |
| [.gitignore](.gitignore)                         | 告诉 Git 哪些本地文件不要跟踪和上传。 排除依赖、缓存、构建结果、测试输出、环境变量和本地备份等生成资料。                                                                |
| [qntx-ui.code-workspace](qntx-ui.code-workspace) | 让 VS Code 把这个目录作为一个工作区打开。 以当前目录打开 VS Code 工作区。                                                                                               |
| [README.md](README.md)                           | 说明项目怎么运行、每个文件管什么，以及维护时应遵守的约定。 当前工程的统一维护说明。                                                                                     |

### `.vscode/`

| 文件                                               | 职责                                                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [.vscode/settings.json](.vscode/settings.json)     | 让 VS Code 在这个项目中使用正确的检查工具、TypeScript 和格式化方式。 保存时格式化、Oxc 使用的项目 Node、TypeScript SDK 与 Tailwind 入口；项目迁移路径后需要核对 `oxc.path.node`。 |
| [.vscode/extensions.json](.vscode/extensions.json) | 向打开项目的人推荐需要的 VS Code 扩展。 推荐编辑器扩展，不参与生产构建。                                                                                                          |

`oxc.path.node` 解决 Oxc 加载 `.ts` 配置的运行时问题；`js/ts.tsdk.path` 选择编辑器的 TypeScript 语言服务，两者用途不同。项目内 Node 不会直接替换系统 Node。

## 3. `apps/web/`

### 3.1 配置文件

| 文件                                                           | 职责                                                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/web/package.json](apps/web/package.json)                 | 单独列出网站需要的依赖和网站自己的运行命令。 声明 Astro / React / Tailwind 与共享库依赖，提供该应用的 `dev`、`build`、`preview`、`check` 命令。       |
| [apps/web/project.json](apps/web/project.json)                 | 把网站登记给 Nx，让根目录命令能找到并执行网站的任务。 注册 Nx `web` 项目、标签、构建输出及开发 / 检查 / 测试目标；通过 `nx:run-commands` 调用 Astro。 |
| [apps/web/astro.config.mjs](apps/web/astro.config.mjs)         | 配置 Astro 如何使用 React 和 Tailwind，以及如何生成网站。 接入 React 集成和 Tailwind Vite 插件，设置站点地址，沿用 Astro 静态输出。                   |
| [apps/web/tsconfig.json](apps/web/tsconfig.json)               | 让 TypeScript 按 Astro 网页环境检查这部分代码。 在公共配置后继承 Astro 严格配置，补齐 React JSX、Astro / Node 类型及生成文件范围。                    |
| [apps/web/playwright.config.ts](apps/web/playwright.config.ts) | 规定网页自动测试用哪个浏览器、怎样启动网站，以及失败后留下什么证据。 Web 浏览器测试目录、Chrome 通道、视口、4321 服务与失败时截图 / trace。           |

### 3.2 `src/pages/`

Astro 根据此目录中的文件生成 URL。当前仅保留首页路由，由同一个开发服务提供。

| 文件                                                             | 职责                                                                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/web/src/pages/index.astro](apps/web/src/pages/index.astro) | 网站首页的唯一入口，把响应式网页结构、样式和滚动脚本接起来。`/` 路由只输出 `HomePage`，将共享颜色映射为 CSS 变量，初始化滚动控制器，并在 Astro 页面退出前调用清理函数。 |

页面中的 React 组件由 Astro 在构建时输出 HTML / SVG；当前没有通过 `client:*` 指令进行 React 客户端水合。浏览器交互由下面的 TypeScript 控制器接管。

这里的 `client:*` 是 Astro 客户端指令的统称，例如 `client:load` 表示页面加载时启动组件的客户端代码；水合就是让浏览器中的 React 接管已生成的 HTML，接上 React 的事件和状态更新。本项目不使用这条路径，而是由独立脚本操作页面元素。

### 3.3 `src/components/`

| 文件                                                                         | 职责                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/web/src/components/HomePage.tsx](apps/web/src/components/HomePage.tsx) | 搭出所有屏幕共用的 HTML / SVG 结构，滚动和动画由独立脚本控制。通过 `data-*` 标记提供场景、路径和测量槽位；布局由同一份响应式 CSS 调整，不重复输出手机版结构。 |
| [apps/web/src/components/Icon.tsx](apps/web/src/components/Icon.tsx)         | 提供网页共用的箭头和 GitHub 小图标。统一 SVG 结构、尺寸入口和无障碍处理。                                                                                     |

`data-*` 是 HTML 的自定义属性，后缀由项目约定，例如 `data-home-page`、`data-page-section`；脚本用这些标记找到需要控制的元素，属性本身不会自动产生交互。网页在所有宽度都使用同一套结构和纵向滚动控制器；`npm run dev:mobile:web` 则启动另一个应用的 Expo Web 预览。

### 3.4 `src/data/` 与环境声明

| 文件                                                   | 职责                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/web/src/data/site.ts](apps/web/src/data/site.ts) | 网站读取共享资料的统一入口，方便定位数据来源。转出 `@qntx-ui/content` 中的组织资料、链接、协议、标准及静态 Logo 路径；实际值仍只在共享库维护。 |
| [apps/web/src/env.d.ts](apps/web/src/env.d.ts)         | 让编辑器和类型检查认识 Astro 提供的环境类型。 声明 Astro 客户端类型环境。                                                                      |

### 3.5 `src/scripts/`

#### `home-page-scroll.ts`

把网页的纵向滚动距离换算成位置、透明度和当前阶段；窗口变窄、设备仿真或浏览器缩放时仍使用这个控制器。

[源码](apps/web/src/scripts/home-page-scroll.ts)。入口为 `initializeHomePageScroll(root): () => void`。它读取轨道、SVG 容器、目标槽位和场景节点；将原生文档滚动换算为归一化进度，并通过连续插值更新 DOM 样式。

目标位置来自 `getBoundingClientRect()`，而不是固定百分比。控制器同时测量每个场景的实际内容高度：能全部放进视口时使用 `data-scroll-layout="pinned"` 的单屏叙事；内容超高时使用 `data-scroll-layout="document"`，全部内容进入自然文档流。两种排版共用同一 DOM，恢复可用空间后可自动回到叙事排版。滚动事件通过单个 `requestAnimationFrame` 合并；`ResizeObserver` 负责重新测量。活动场景同时更新 `inert`、`aria-hidden` 和指针状态，避免不可见区域接收操作。该控制器不拦截 wheel / touch 输入，不再存在横向切屏或另一套宽度分支。

销毁时中止事件监听、断开 observer、取消帧任务、销毁动画控制器，并移除增强产生的属性与内联样式。

#### `mascot-playback.ts`

控制网页 SVG 什么时候播放、暂停或切换形状，并把每一帧计算结果画到已有的 SVG 上。

[源码](apps/web/src/scripts/mascot-playback.ts)。包含两个入口：`createSvgMascotRenderer()` 返回 `SvgMascotRenderer`，通过 `renderFrame()` / `resetToStaticLogo()` 更新三个 SVG path；`initializeMascotPlayback()` 返回 `MascotPlaybackController`，管理播放状态、输入计时、过渡与生命周期。

控制器接收 `setPlaybackPhase()`，使用共享引擎和轮廓插值生成帧，通过 SVG 属性更新绘制，不依赖 React 重渲染。文档可见性与媒体偏好决定暂停条件；`dispose()` 负责取消 RAF、计时器及事件监听并复位绘制。此文件拥有浏览器 API，不能放入共享库。

### 3.6 `src/styles/`

| 文件                                                                   | 职责                                                                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [apps/web/src/styles/global.css](apps/web/src/styles/global.css)       | 设置整个网站共用的基础样式。提供 Tailwind 入口、基础元素规则、字体和全局变量，不再加载另一套窄屏网站样式。                                                         |
| [apps/web/src/styles/home-page.css](apps/web/src/styles/home-page.css) | 为同一套网页结构适配宽屏、窄屏和矮屏。定义字号、栅格、导航尺寸及滚动叙事定位；能放进单屏时增强为 sticky 叙事，内容超高时保留自然文档排版，并支持减少动态效果偏好。 |

### 3.7 `public/`

| 文件                                                       | 职责                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| [apps/web/public/favicon.svg](apps/web/public/favicon.svg) | 浏览器标签页上使用的网站小图标。 以 `/favicon.svg` 提供的站点图标。 |

### 3.8 `tests/`

| 文件                                                                   | 职责                                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [apps/web/tests/home-page.spec.ts](apps/web/tests/home-page.spec.ts)   | 自动检查滚动叙事和 SVG 动画是否正常。覆盖轮廓插值、目标定位、尺寸变化、无脚本与无障碍分支。                              |
| [apps/web/tests/responsive.spec.ts](apps/web/tests/responsive.spec.ts) | 检查设备仿真、触摸、窗口调整和大字体下是否仍是同一个纵向网页。覆盖窄屏、横向持机、内容超高回退、无嵌套滚动与无脚本阅读。 |

## 4. `apps/mobile/`

### 4.1 配置与注册入口

| 文件                                                                 | 职责                                                                                                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/mobile/package.json](apps/mobile/package.json)                 | 单独列出手机应用需要的依赖、运行命令和启动入口。 声明 Expo、React Native、React Native Web、SVG、安全区域及共享库依赖；`main` 指向 `index.ts`。            |
| [apps/mobile/project.json](apps/mobile/project.json)                 | 把手机应用登记给 Nx，让根目录能统一调用它的检查、导出和测试任务。 注册 Nx `mobile` 项目，定义启动、辅助预览、导出、类型检查、边界、doctor 与两类测试目标。 |
| [apps/mobile/app.json](apps/mobile/app.json)                         | 设置 Expo 应用的名字、平台身份、屏幕方向等基本信息。 Expo 应用名、slug、scheme、平台标识、方向和 Web 输出配置；当前原生应用标识为 `org.qntx.mobile`。      |
| [apps/mobile/metro.config.mjs](apps/mobile/metro.config.mjs)         | 配置手机应用打包器如何读取源码，并限制并行处理数量。 使用 Expo 默认工作区解析，只额外设置 `maxWorkers = 2`；没有手写 React 别名或跨目录复制方案。          |
| [apps/mobile/tsconfig.json](apps/mobile/tsconfig.json)               | 让 TypeScript 按 Expo / React Native 环境检查手机应用代码。 叠加公共严格设置与 Expo 环境，包含 React / React Native / Node 类型；应用检查不包含 `tests/`。 |
| [apps/mobile/playwright.config.ts](apps/mobile/playwright.config.ts) | 规定怎样在电脑浏览器中自动测试手机应用的 Web 版本。 Expo Web 的 Chrome 辅助测试、390×844 默认视口、8082 服务和失败证据输出。                               |
| [apps/mobile/index.ts](apps/mobile/index.ts)                         | 把 App 交给 Expo 注册，是手机应用启动时首先执行的入口。 初始化 Metro Web runtime，通过 Expo `registerRootComponent(App)` 注册 React 根组件。               |

### 4.2 `src/App.tsx`

手机应用的总装配层，把内容、滚动容器、吉祥物和安全区域放到一起，并协调尺寸与滚动位置。

[源码](apps/mobile/src/App.tsx)。这是原生应用的组合与坐标控制层：创建安全区域容器，维护视口测量、ScrollView 引用、滚动值与离散场景状态，组合其他原生组件。

`Animated.ScrollView` 通过稳定的 `Animated.event` 更新 `Animated.Value`。Android/iOS 的位移、缩放和透明度使用 native driver，浏览器辅助预览使用 Web 可用的实现。JS 监听只在阶段变化时通知 React；实际尺寸改变时重新测量并重置滚动位置。

Android 返回键通过 `BackHandler` 根据滚动位置决定返回顶部或交还系统。触摸和指针活动通过 `MascotActivityHandle.notifyActivity()` 传给局部控制器，不为每个移动事件更新整页状态。

### 4.3 `src/components/`

| 文件                                                                                           | 职责                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/mobile/src/components/HomeSections.tsx](apps/mobile/src/components/HomeSections.tsx)     | 把共享资料组织成手机应用能显示的原生文字和区块。 导出 `AboutSection`、`ProtocolsSection`、`ResourcesSection`；用 `View` / `Text` 及各自 StyleSheet 组织共享数据，接受紧凑布局参数，不读取 DOM。 |
| [apps/mobile/src/components/ExternalLink.tsx](apps/mobile/src/components/ExternalLink.tsx)     | 统一处理手机应用的外链点击，以及打不开链接时的提示。 用 `Pressable`、原生 `Linking.openURL` 和 `Alert` 封装外链；提供链接语义、触摸尺寸、按下态及共享颜色。                                     |
| [apps/mobile/src/components/AnimatedMascot.tsx](apps/mobile/src/components/AnimatedMascot.tsx) | 把动画计算结果画到手机端 SVG 上，并连接应用前后台状态。 将绘制与应用组件树分开；连接播放控制器、SVG 引用和 `AppState`，对外提供活动通知句柄。                                                   |

`AnimatedMascot.tsx` 在 Android/iOS 通过 `setNativeProps` 只更新变化的路径，避免每帧 React 协调；Expo Web 使用局部 React state 更新 SVG。Web 传递 `aria-hidden`，原生平台传递各自的无障碍属性，避免原生属性泄漏到 SVG DOM。

### 4.4 `src/animation/mascot-playback.ts`

手机动画的播放控制器，决定何时计算下一帧、何时暂停，以及静态形状和动画怎样平滑衔接。

[源码](apps/mobile/src/animation/mascot-playback.ts)。导出 `createMascotPlaybackController()`、`MascotPlaybackPhase`、`MascotActivityHandle` 和 `MascotPlaybackController`，以 `updateOptions()` 接收播放条件、以 `notifyActivity()` 接收用户活动，负责采样、形变、待机截止时间、前后台与减少动态效果的协调。

应用只提供阶段和活动信号，绘制函数通过 `onRenderFrame(paths)` 接收结果。控制器先判断是否达到约 30fps 的预算，再执行完整轮廓计算；Mobile 启用共享引擎的 `directGeometry` 分支。计时器采用截止时间重排，连续输入不反复创建定时器，也不重复重启尚未完成的退出过渡。`dispose()` 释放 RAF 和计时器。

该文件依赖 Mobile 的调度环境，但不导入 React / DOM，便于用 Node 假时钟单独测试。

### 4.5 `src/hooks/useReducedMotion.ts`

读取并持续关注系统的减少动态效果和屏幕阅读器设置，供手机应用选择合适的交互与排版。

[源码](apps/mobile/src/hooks/useReducedMotion.ts)。提供 `useReducedMotion()` 和 `useScreenReader()`，封装系统偏好读取、订阅、卸载清理及异步读取后的存活判断。

原生端使用 `AccessibilityInfo`。Web 分支不把该库固定返回的 screen-reader 占位结果视为真实用户状态。应用在可用高度低于 `600`、字体缩放超过 `1.15` 或原生屏幕阅读器开启时采用自然文档布局；安全区域由 `react-native-safe-area-context` 处理。

### 4.6 `tests/mobile-preview.spec.ts`

在电脑浏览器里操作 React Native Web 版本，自动检查手机应用代码的交互、布局和报错情况。

[源码](apps/mobile/tests/mobile-preview.spec.ts)。使用 React Native Web 验证组件树、滚动坐标、路径过渡、活动计时、多尺寸、尺寸改变、触摸与外链。入口用例同时检查 `pageerror` 和 `console.error`，覆盖 React 控制台警告。

它不证明原生系统返回键、VoiceOver / TalkBack、真实安全区域或设备 FPS 已通过；这些需要原生设备验收。

## 5. `packages/` 共享源码

三个库都以私有 npm workspace 发布入口的形式导出 TypeScript 源码，由 Astro / Metro 分别处理，不需要预先构建或发布到 npm。

### 5.1 `packages/content/`

| 文件                                                             | 职责                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [packages/content/package.json](packages/content/package.json)   | 声明共享内容库的包名和入口，让两端都能导入它。 声明私有包 `@qntx-ui/content` 和 `src/index.ts` 源码 exports。                       |
| [packages/content/project.json](packages/content/project.json)   | 把共享内容库登记给 Nx，并配置它的检查任务。 注册 Nx `content` 库，标签为 `platform:shared` / `type:lib`，提供检查任务。             |
| [packages/content/tsconfig.json](packages/content/tsconfig.json) | 按纯数据代码的环境检查内容库，不默认引入浏览器或手机平台类型。 继承公共严格配置，使用 ES2022 库且不自动引入环境类型。               |
| [packages/content/src/index.ts](packages/content/src/index.ts)   | 集中保存两端共用的文字、链接、协议资料和静态 Logo 路径。只提供数据，不返回 JSX 或调用平台 API；旧横向面板导航数组及对应类型已删除。 |

两端组件按各自需求读取这些数据，不要求共用相同组件树。修改共享值前应检查两端调用方；Web 的数据入口仍保留在 `src/data/site.ts`。

### 5.2 `packages/design-tokens/`

| 文件                                                                         | 职责                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [packages/design-tokens/package.json](packages/design-tokens/package.json)   | 声明共享设计数值库的包名和入口。 声明私有包 `@qntx-ui/design-tokens` 及源码导出。       |
| [packages/design-tokens/project.json](packages/design-tokens/project.json)   | 把共享设计数值库登记给 Nx，并配置检查任务。 注册 Nx 共享库及检查任务。                  |
| [packages/design-tokens/tsconfig.json](packages/design-tokens/tsconfig.json) | 让设计数值库按平台无关的 TypeScript 环境接受检查。 将类型环境限制为纯 ES2022。          |
| [packages/design-tokens/src/index.ts](packages/design-tokens/src/index.ts)   | 集中存放可供两端选用的颜色、间距和字号数值。 导出 `palette`、`spacing` 和 `typeScale`。 |

当前 Web 将部分 `palette` 注入 CSS 变量，Mobile 外链组件直接读取共享颜色。两端仍有各自的局部数值；不能把此包理解成全部样式已统一或自动同步。

### 5.3 `packages/mascot/`

| 文件                                                                                         | 职责                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [packages/mascot/package.json](packages/mascot/package.json)                                 | 声明共享动画计算库的入口，以及它依赖的共享内容库。 声明私有包 `@qntx-ui/mascot`，仅依赖共享 `content`，对外导出源码。                                                               |
| [packages/mascot/project.json](packages/mascot/project.json)                                 | 把共享动画计算库登记给 Nx，并配置检查任务。 注册 Nx 共享库、标签和类型 / lint / 边界检查目标。                                                                                      |
| [packages/mascot/tsconfig.json](packages/mascot/tsconfig.json)                               | 检查动画计算代码和配套数据，不引入网页或原生 UI 环境。 使用纯 ES2022 类型环境，并纳入静态 JSON 轮廓。                                                                               |
| [packages/mascot/src/index.ts](packages/mascot/src/index.ts)                                 | 作为动画库的统一导入入口，两端从这里取得所需计算函数。 统一公开动画引擎、帧类型、形变与路径函数，应用通过此入口导入。                                                               |
| [packages/mascot/src/morph.ts](packages/mascot/src/morph.ts)                                 | 计算两种轮廓之间的中间形状，让形状切换连续。 构造静态帧，对齐闭合轮廓的起点 / 方向，插值与收缩轮廓；只为选中的对齐方案分配结果数组。                                                |
| [packages/mascot/src/paths.ts](packages/mascot/src/paths.ts)                                 | 把轮廓坐标转换成 SVG 能绘制的路径文字。 以闭合样条生成 SVG path，统一坐标精度和安全缩放，提供静态路径与帧到路径的转换。                                                             |
| [packages/mascot/src/rest.json](packages/mascot/src/rest.json)                               | 保存静态 Q 外轮廓和内部孔洞的坐标。 静态外轮廓与孔洞的点集数据，不包含 UI 状态。                                                                                                    |
| [packages/mascot/src/vendor/logo-catalog.js](packages/mascot/src/vendor/logo-catalog.js)     | 根据播放时间算出当前动画形状和颜色，供两端绘制。 从原 Logo 提取的纯计算引擎；`sample(time)` 产生轮廓点和颜色；可选 `directGeometry` 路径缓存模型点和旋转计算，并跳过中间 SVG 往返。 |
| [packages/mascot/src/vendor/logo-catalog.d.ts](packages/mascot/src/vendor/logo-catalog.d.ts) | 告诉 TypeScript 上面的 JavaScript 动画引擎可以传什么、会返回什么。 声明 `CatalogFrame`、引擎工厂和选项，为生成式 JavaScript 提供类型边界。                                          |

共享范围止于数据、几何与路径计算。Web DOM、React Native SVG、RAF 生命周期、输入事件及平台无障碍属性分别由应用层处理。vendor 文件的局部规则例外有源码说明，不应扩展为全仓库豁免。

## 6. Nx 边界、共享范围与两端区别

### 项目依赖

```mermaid
flowchart LR
  W[web] --> C[content]
  W --> D[design-tokens]
  W --> M[mascot]
  N[mobile] --> C
  N --> D
  N --> M
  M --> C
```

| 项目标签                       | 允许访问                      | 规则限制                                                 |
| ------------------------------ | ----------------------------- | -------------------------------------------------------- |
| `platform:web` / `type:app`    | 本端与 `platform:shared` 库。 | 禁止引入 React Native、Expo 及其框架包。                 |
| `platform:mobile` / `type:app` | 本端与 `platform:shared` 库。 | 禁止引入 Astro、React DOM 等 Web 框架。                  |
| `platform:shared` / `type:lib` | 其他共享库。                  | 禁止反向依赖应用、引入两端 UI 框架及使用受限浏览器全局。 |

规则由 ESLint 的 `@nx/enforce-module-boundaries` 实际执行；Oxlint 负责常规质量检查。Nx 负责识别项目关系、编排任务与缓存，不会把 HTML 组件转换为原生组件。

### 实现分工

| 项目层面     | Astro Web                                                                       | Expo / React Native Mobile                                                              |
| ------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 组件与运行时 | 构建生成 HTML / SVG，局部 TypeScript 控制 DOM。                                 | `registerRootComponent` 注册 React 组件树，原生平台渲染 `View` / `Text` / `Pressable`。 |
| 样式         | Tailwind、CSS、媒体查询及 CSS 变量。                                            | `StyleSheet`、测量结果和 `Animated`；不导入 Web CSS。                                   |
| 滚动与尺寸   | 同一套文档滚动、DOM 测量与 `ResizeObserver`；按内容高度选择单屏叙事或自然排版。 | `Animated.ScrollView`、`onLayout`、安全区域与窗口 / 字体信息。                          |
| 连续呈现     | DOM style、CSS 和原生 SVG 属性。                                                | native driver 处理支持的变换；SVG path 由独立 JS 控制器更新。                           |
| 生命周期     | `AbortController`、observer、文档可见性、Astro 销毁回调。                       | React effect 清理、`AppState`、`AccessibilityInfo` 与 Android 返回键。                  |
| SVG 计算     | 默认共享引擎，DOM painter 写属性。                                              | `directGeometry` 共享引擎，原生引用更新；Expo Web 使用局部 state。                      |
| 外链         | HTML `<a>`。                                                                    | `Linking.openURL` 封装及失败处理。                                                      |
| 构建结果     | 可部署的静态 Web 文件。                                                         | 导出的平台资源；安装包需要独立的原生构建流程。                                          |

共享库不持有用户输入状态，也不决定组件布局。React、数据与几何可以共用，HTML / 原生组件、样式系统和事件适配分别实现。

### 变更影响与缓存

```powershell
npm run graph
npx nx show projects --affected --files apps/mobile/src/App.tsx
npx nx affected -t check,lint,boundaries --base=main
```

`affected` 取决于比较基线：在功能分支上可与 `main` 比较，在已合并的 `main` 上需要选择实际旧提交作为 `--base`。缓存输入包含项目源码、上游项目和根锁文件 / 公共配置；锁文件或公共配置变化可能影响多个项目。

修改 `content` 可能同时影响两端及 `mascot`；修改某个应用的组件通常只影响该应用。`design-tokens` 的导出值只有在调用方实际使用时才会生效。

## 7. `tools/`

### `test-boundaries.mjs`

故意放入几段违规引用代码，确认项目的依赖边界真的会拦截它们，测试后再清掉临时文件。

[源码](tools/test-boundaries.mjs)。创建真实的临时违规文件，通过 ESLint 检查跨端导入、共享库反向引用、受限全局及 Astro frontmatter，然后在 `finally` 中删除探针。另有合法共享导入用例，避免规则把所有访问都拒绝。

### `test-mobile-animation.mts`

不用启动网页或手机，直接检查动画计算、帧率限制和计时逻辑是否正确。

[源码](tools/test-mobile-animation.mts)。使用 Node 内置测试、假时钟和受限工作区加载钩子，检查目录几何一致性、60/90/120Hz 调度预算、定时 / 输入 / 暂停协调和轮廓对齐。它验证实际采样次数，而非只检查最终绘制次数，不依赖浏览器或新增测试框架。

## 8. `review/`

这些文件记录各历史阶段的操作与证据，不作为当前源码入口说明。

| 文件                                                                           | 职责                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [review/integration-manifest.json](review/integration-manifest.json)           | 追溯早期预览文件从哪里同步、同步了哪些文件和备份在哪里。 早期预览同步清单、文件哈希及备份位置。  |
| [review/integration-verification.md](review/integration-verification.md)       | 查阅早期预览合入项目时做过的验证。 早期集成验证记录。                                            |
| [review/logo-catalog-provenance.json](review/logo-catalog-provenance.json)     | 追溯当前动画引擎的来源和提取过程。 动画来源、提取说明及校验值。                                  |
| [review/simplification-20261023.md](review/simplification-20261023.md)         | 查阅当时精简网站代码的改动记录。 Web 删减过渡版本的代码调整记录。                                |
| [review/mobile-20261023.md](review/mobile-20261023.md)                         | 查阅第一次接入 Nx 和手机应用时的改动记录。 首次 Nx / Mobile 接入记录。                           |
| [review/mobile-narrative-20261025.md](review/mobile-narrative-20261025.md)     | 查阅后续手机端实现及当时验证了哪些内容。 后续 Mobile 实现及验证范围。                            |
| [review/mobile-performance-20261025.md](review/mobile-performance-20261025.md) | 查阅手机动画卡顿的原因、优化方法和历史测量结果。 JS 计算热点、性能修正、基准方法与设备验证限制。 |

历史记录中的旧源码路径、测试数量和 `artifacts/` 位置只描述当时状态。本地截图、缓存及导出物可以清理，不保证历史临时文件仍存在；被路由实际引用的 `public/` 资源应保留。

## 9. 检查、格式化与配置复用

| 命令                            | 负责范围                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| `npm run check`                 | 通过 Nx 检查 Web、Mobile 和三个共享库。                              |
| `npm run lint` / `npx oxlint`   | qntx Oxlint 的常规质量与类型感知规则。                               |
| `npm run lint:boundaries`       | 五个项目的 ESLint 依赖边界检查。                                     |
| `npm run test:boundaries`       | 临时边界探针与合法导入检查。                                         |
| `npm run test:mobile:animation` | 独立动画计算与调度回归。                                             |
| `npm run test:e2e`              | Astro Web 的 Chrome 回归。                                           |
| `npm run test:mobile`           | React Native Web 的辅助回归。                                        |
| `npm run doctor:mobile`         | Expo 环境与依赖诊断。                                                |
| `npm run format`                | Oxfmt 处理支持的文件，再由 Prettier 处理 `apps/web/src/**/*.astro`。 |
| `npm run format:check`          | 对应的只读格式检查。                                                 |
| `npm run verify`                | 顺序执行类型、lint、边界、专项测试、格式、两端构建及浏览器测试。     |

Chrome 测试需要本机安装 Google Chrome。通过格式检查不等于类型或运行检查通过；浏览器回归和 Hermes 导出也不能替代原生设备验收。

### 复用项及生效范围

| 配置包           | 当前版本与接入                                                     | 生效内容                                                                     |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `@qntx/oxlint`   | `1.1.1`；`oxlint.config.ts` 导入 `react` / `merge`。               | React / TypeScript 质量、类型感知和 Promise 等规则，再合并本项目例外。       |
| `@qntx/oxfmt`    | `1.1.1`；`oxfmt.config.ts` 导入 `fmt`。                            | 统一格式约定及 import 整理，再追加框架与生成文件忽略范围。                   |
| `@qntx/tsconfig` | `1.0.1`；仅由 `tsconfig.base.json` 继承 `configs/strictest.json`。 | 公共严格类型设置；Web 再叠加 Astro，Mobile 再叠加 Expo，共享库限制环境类型。 |

这些是 npm 配置包，不引用本机 qntx-source，也不是仓库内的 `@qntx-ui/*` 共享源码库。安装了包不代表全部预设生效；当前只显式继承上述入口。

Oxlint 对 `.astro` 模板覆盖有限，仍需 `astro check` 与构建。`.astro` 交给 Prettier，禁止由 Oxfmt 格式化。通用预设不能整份覆盖 Astro / Expo / Metro、各项目 tsconfig、编辑器设置、脚本、锁文件与 Wrangler 配置；应在本项目入口补充，不直接编辑 `node_modules/@qntx/`。

Nx 提示同时存在 Oxfmt 和 Prettier 配置属于本工程有意保留的格式化分工，不需要为消除提示删除其中一个。

## 10. Mobile 性能与平台适配

Mobile 将模型 / 轮廓计算与原生属性更新分开：不变模型点使用缓存，旋转参数按帧准备，直接使用轮廓点，避免中间 SVG 字符串往返。形变对齐不为所有候选顺序生成临时数组；SVG 更新限制在局部组件，输入计时不驱动整页重渲染。

约 30fps 的限制同时覆盖采样与绘制，不随 60/90/120Hz 屏幕重复计算。native driver 负责支持的位移 / 缩放 / 透明度，SVG path 仍在 JS 线程更新，不能据此宣称全部动画已运行在原生 UI 线程。

历史电脑端基准记录了采样中位耗时约 `2.02ms → 0.84ms`、P95 约 `3.14ms → 1.26ms`；这不是本轮文档整理重新测得的数据，也不代表真机 FPS 同比例提升。诊断设备卡顿时应分开观察 JS / UI 帧率，并比较开发模式和生产模式 JS；已有的详细测量范围保存在性能验收记录中。

Web 无障碍属性需要单独适配：React 的 `console.error` 警告可能不会触发 `pageerror`，因此辅助预览入口同时检查两种错误渠道。平台适配应修正属性传递，不通过屏蔽日志掩盖问题。

## 11. Cloudflare 部署与生成目录

当前为静态 Astro 部署，根 `wrangler.jsonc` 明确指定 Worker `qntx-ui` 与 `./apps/web/dist`，不依赖 Wrangler 在 Nx 根目录自动识别框架。

| 平台设置   | 值                                              |
| ---------- | ----------------------------------------------- |
| 仓库根目录 | `/`                                             |
| 构建命令   | `npm run build`                                 |
| 部署命令   | `npx wrangler deploy --config ./wrangler.jsonc` |

复用此工程部署其他 Worker 时需替换配置中的实际名称。Wrangler 当前由 `npx` 获取，未锁入根开发依赖；此命令会进行真实部署。

| 生成位置                         | 用途与清理条件                                             |
| -------------------------------- | ---------------------------------------------------------- |
| `node_modules/`                  | 已安装依赖，直接启动和项目 Node 依赖它；删除后需重新安装。 |
| `.nx/`                           | 项目图与任务缓存，由 Nx 维护。                             |
| `apps/web/.astro/`               | Astro 生成类型和开发数据，由 Astro 重新生成。              |
| `apps/mobile/.expo/`             | Expo 本机开发信息。                                        |
| `apps/*/dist/`                   | 构建 / 导出产物，清理后通过对应构建命令恢复。              |
| `test-results/`、`artifacts/` 等 | 测试或调试输出，不属于运行源码。                           |

原根目录 `src/`、`public/`、`tests/`、`dist/` 不再是当前应用入口。
