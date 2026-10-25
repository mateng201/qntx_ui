# QuantX UI

Astro Web 与 Expo + React Native 手机端共用一个 Git 仓库，由 Nx 和 npm workspaces 管理。当前开发分支为 `mobile`；`main` 保留迁移前的三屏 Web。

## 启动

```powershell
cd E:\bigshoot\qntx.ui
npm ci
npm run dev               # Astro Web：http://127.0.0.1:4321/
npm run dev:mobile        # Expo / Metro，在终端显示手机连接二维码及快捷键
npm run dev:mobile:web    # 手机组件的浏览器预览：http://localhost:8082/
```

三个命令分别在终端中运行。依赖已经安装时可直接启动。浏览器预览使用同一套 React Native 组件，通过 React Native Web 渲染；它用于快速检查排版和交互，不能替代 Android / iOS 真机验收。

根目录 `npm run dev`、`npm run build` 和 `npm run preview` 仍对应 Web。`dev:mobile` 直接启动 Mobile 工作区的 Expo，保留终端交互，以显示二维码和快捷键；构建、检查和依赖边界仍由 Nx 管理。手机调试、设备条件与安装包说明见 [手机端开发说明](docs/mobile.md)。

## 目录与边界

```text
apps/
  web/                  Astro、React HTML 组件、CSS、浏览器脚本与 Web 测试
  mobile/               Expo、React Native 组件、StyleSheet 与手机预览测试
packages/
  content/              文案、组织链接、协议数据、导航数据、类型、静态 Logo 路径
  design-tokens/        颜色、间距和字号数值
tools/                 边界规则的实际违规探针
```

Web 保留 Overview / Protocols / About 三个横向 Scroll Snap 面板和独立 `/logo-check/`。Mobile 使用三个底部标签、纵向阅读、安全区域及 Android 返回首页处理；About 沿用深色配色。首版没有引入原首页已移除的轨道动画，也没有新增 UI 组件库。

| 项目                       | Nx 标签                       | 允许依赖                |
| -------------------------- | ----------------------------- | ----------------------- |
| `web`                      | `platform:web`、`type:app`    | Web 内部代码及共享库    |
| `mobile`                   | `platform:mobile`、`type:app` | Mobile 内部代码及共享库 |
| `content`、`design-tokens` | `platform:shared`、`type:lib` | 纯 TypeScript 共享库    |

`eslint.config.mjs` 仅负责架构边界：Nx 的 `@nx/enforce-module-boundaries` 禁止跨端导入、共享包反向依赖应用，以及引入另一端的框架。Astro 解析器覆盖 `.astro` 的前置脚本导入。共享包也禁止浏览器全局对象，并通过没有 DOM / Node 全局类型的独立配置检查。

共享包以 `@qntx-ui/content`、`@qntx-ui/design-tokens` 的公开入口导入，不能使用跨项目相对路径绕过边界。`tools/test-boundaries.mjs` 会临时创建并清理真实违规文件，验证六种错误依赖 / 全局访问被拒绝，以及合法共享导入能通过。

Nx 项目图已验证：仅修改 `apps/mobile/src/App.tsx` 时影响 `mobile`；修改共享 content 时影响 `content`、`mobile` 和 `web`。锁文件和公共配置改变可能影响所有项目。

```powershell
npm run graph
npx nx show projects --affected --files apps/mobile/src/App.tsx
npx nx affected -t check,lint,boundaries --base=main
```

## 常用检查与构建

| 命令                      | 作用                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `npm run check`           | Web、Mobile、两个共享库分别做类型检查                            |
| `npm run lint`            | 全仓库 qntx Oxlint 质量检查                                      |
| `npm run lint:boundaries` | 通过 Nx 执行四个项目的依赖边界检查                               |
| `npm run test:boundaries` | 实际违规与合法导入探针，包括 `.astro`                            |
| `npm run format`          | Oxfmt 格式化，随后 Prettier 处理 `.astro`                        |
| `npm run format:check`    | 只检查格式，不写入文件                                           |
| `npm run build`           | Web 静态产物：`apps/web/dist/`                                   |
| `npm run preview`         | 查看 Web 构建结果                                                |
| `npm run build:mobile`    | 导出 Android / iOS Hermes 和浏览器 JS 产物至 `apps/mobile/dist/` |
| `npm run doctor:mobile`   | Expo 环境和依赖诊断                                              |
| `npm run test:e2e`        | Web 的 36 项 Chrome 回归测试                                     |
| `npm run test:mobile`     | React Native Web 预览的交互与布局测试                            |
| `npm run verify`          | 类型、质量、边界、格式、两端导出与浏览器检查链                   |

`build:mobile` 生成原生 JS / Hermes 资源，不生成 APK、AAB 或 IPA。原生安装包还需要 Android SDK / Xcode 或另行配置 EAS。浏览器测试使用本机 Google Chrome。

Web 输出目录已从仓库根目录的 `dist/` 迁移为 `apps/web/dist/`。若将本分支用于 Cloudflare 自动部署，构建命令仍可使用根目录的 `npm run build`，但须把静态产物目录相应调整；本次没有修改远端或线上部署配置。

## 关于复用说明

| 复用项           | 版本    | 接入及生效内容                                                                                                                                                         |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@qntx/oxlint`   | `1.1.1` | 根目录 `oxlint.config.ts` 导入 React 严格预设。保留类型感知、Promise、React 等质量规则，补充 CSS / Metro 初始化导入及生成文件忽略规则。ESLint 不重复承担常规质量检查。 |
| `@qntx/oxfmt`    | `1.1.1` | 根目录 `oxfmt.config.ts` 继承统一缩进、引号、分号、换行和 import 排序等设置。排除 `.astro`、锁文件、Nx / Expo 缓存、报告和原生产物。                                   |
| `@qntx/tsconfig` | `1.0.1` | 根目录 `tsconfig.base.json` 只复用 `configs/strictest.json`。Web 叠加 Astro 严格配置；Mobile 叠加 `expo/tsconfig.base`；共享包限制为纯 TypeScript 环境。               |

这些配置均来自 npm 发布包，没有引用本机 qntx-source。其他 qntx JSON 预设不会随安装自动启用，也没有把通用配置直接覆盖到 Astro 或 Expo 的专用配置上。

Oxlint 对 `.astro` 模板的检查范围有限，Web 验收仍包含 `astro check` 与构建；模板格式化继续交给 Prettier + `prettier-plugin-astro`。当前格式化命令中的 Astro 路径为 `apps/web/src/**/*.astro`。

通用预设不能整份替换 `apps/web/astro.config.mjs`、Web / Mobile 的 `tsconfig.json`、`apps/mobile/app.json`、Metro 配置、`src/env.d.ts`、`.prettierrc.json`、`.vscode/settings.json`、项目脚本和锁文件。应保留框架所需的补充。不要直接编辑 `node_modules/@qntx/` 下的文件。

项目继续通过 npm 的 `node` 包提供 Node 24.22.0，npm scripts 优先使用它。VS Code 的 Oxc 扩展通过 `oxc.path.node` 指向项目 Node；`js/ts.tsdk.path` 指向 TypeScript SDK，这与 Oxc 使用哪个 Node 是不同设置。`.ts` 配置的加载问题通过兼容的运行时处理，不需要改系统 Node。项目目录移动后须同步调整 Oxc 的绝对路径。

Expo SDK 58 对应的 React / React DOM 统一锁定为 19.3.0，React Native 为 0.88.0。两个应用均明确声明依赖，根目录同步版本与 overrides 防止混入第二份 React。npm 是唯一包管理器，安装结果由根 `package-lock.json` 记录。

## 源码入口与历史

| 文件                                             | 用途                                   |
| ------------------------------------------------ | -------------------------------------- |
| `apps/web/src/components/HorizontalDeck.tsx`     | Web 三屏组合                           |
| `apps/web/src/data/site.ts`                      | 兼容原 Web 导入路径，转出共享内容      |
| `apps/mobile/src/App.tsx`                        | 原生三页、底部标签、安全区域与返回行为 |
| `apps/mobile/src/components/`                    | 原生静态 Logo 与外链按钮               |
| `packages/content/src/index.ts`                  | 两端内容和静态 Logo 路径               |
| `packages/design-tokens/src/index.ts`            | 两端设计数值                           |
| `apps/*/project.json`、`packages/*/project.json` | Nx 项目、标签和任务                    |
| `eslint.config.mjs`                              | 架构边界与 Astro 解析                  |

原四屏设计保留在 Git 历史提交 `a047b26`；三屏 Web 迁移基线为 `97e3dcb`。迁移前完整设计与配置记录保存在 [Web 设计历史](docs/web-design-history.md)。`review/` 下旧验收记录属于对应历史阶段，当前手机端验收另见 [Mobile 验证记录](review/mobile-20261023.md)。
