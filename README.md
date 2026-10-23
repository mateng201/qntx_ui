# QuantX UI

基于 Astro、React、TypeScript 与 Tailwind CSS 的组织介绍页。本分支为页面减法版本，通过 Overview、Protocols、About 三个横向面板介绍 QuantX 的定位、协议与组织入口。

减法版本由 `codex/simplify-panels` 分支实现，现已合并到 `main`。原来的四屏设计与首页 SVG 网络交互保留在历史提交 `a047b26`，可从 Git 历史查看或恢复。本版本移除首页辅助标语、三列特点及右侧网络图，删除 Build 面板与导航入口，移除 Protocols / About 标注的辅助文案；首页调整为居中的单栏内容。导航、页脚进度与计数同步使用三屏数据，About 编号为 03。原组件与动画源码仍保留在仓库，首页不再加载相关交互脚本；独立 `/logo-check/` 演示继续可用。

## 启动与构建

```powershell
cd E:\bigshoot\qntx.ui
npm ci
npm run dev
```

依赖已安装时直接运行 `npm run dev`。默认访问 <http://127.0.0.1:4321/>，以终端实际地址为准。`npm run build` 生成 `dist/`，`npm run preview` 查看构建结果。

项目通过 npm 的 `node` 包提供 Node 24，npm scripts 会优先使用项目内运行时。依赖统一由 npm 与 `package-lock.json` 管理；首次安装可使用 `npm install`，复现锁定版本使用 `npm ci`。单独执行 `pnpm run dev` 通常不会修改依赖；若混用安装命令后本地运行时缺失，可停止开发服务并用 `npm ci` 恢复，不必删除锁文件。

VS Code 可直接打开本目录或 `qntx-ui.code-workspace`。扩展建议与格式化配置位于 `.vscode/`。

## 页面与交互

| 面板      | 设计与行为                                                                         |
| --------- | ---------------------------------------------------------------------------------- |
| Overview  | 单栏展示标题、简介、探索按钮和 x402 / ERC–8004 / ERC–8183 协议链接，保留充足留白。 |
| Protocols | 保留 Payments、Identity、Commerce、Wallets 四类原语，以 2×2 栅格分组。             |
| About     | 深色收尾，保留组织、文档、动态入口；返回首页入口放在页脚导航附近。                 |

### 横向切屏与公共导航

面板排布及吸附由原生 CSS Scroll Snap 实现。TypeScript 只负责将普通鼠标的垂直滚轮映射到横轴、合并同一手势的连续事件，并同步导航状态。触摸横滑、键盘方向键、Home / End、直接访问面板锚点均可使用；无 JavaScript 时仍保留锚点入口。

桌面验证视口下，每屏内容放入顶栏、页脚之间的剩余高度，不依赖隐藏溢出来通过检查。窄屏内容确实放不下时保留面板内纵向阅读与原滚轮让行逻辑。

导航右侧五个按钮统一采用低饱和背景、文字轻微上移及箭头位移反馈。三个面板链接通过 `aria-current="page"` 表示活动状态；支持 CSS Anchor Positioning 时使用单一下划线平滑移动，不支持时退化为淡入淡出。GitHub、Docs 只参与悬停反馈。

## 源码导航

| 文件                                                            | 职责                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/HorizontalDeck.tsx`                             | 整屏容器、三屏组合。                                       |
| `src/components/SiteHeader.tsx`、`SiteFooter.tsx`               | 公共导航、当前位置与前后切屏。                             |
| `src/components/HomeIntro.tsx`                                  | 首页单栏介绍与协议链接。                                   |
| `src/components/HomeVisual.tsx`、`BuildPanel.tsx`               | 保留的原网络图与 Build 组件，本分支首页不挂载。            |
| `src/components/Logo.astro`                                     | Logo 组件。                                                |
| `src/data/site.ts`、`overview-nodes.ts`                         | 组织链接、协议、仓库、节点说明与坐标。                     |
| `src/data/logo.ts`、`logo-poses.json`                           | 静态 “Q” 路径与基础轮廓。                                  |
| `src/scripts/horizontal-navigation.ts`                          | 滚轮、键盘、锚点、活动状态同步。                           |
| `src/scripts/logo-animation.ts`                                 | 五秒计时、睁眼 / 笑眼 / 待机切换、目光跟随与生命周期。     |
| `src/scripts/overview-interactions.ts`                          | 保留的原节点交互逻辑，本分支首页不加载。                   |
| `src/pages/index.astro`                                         | 首页                                                       |
| `src/pages/logo-check.astro`                                    | logo独立演示                                               |
| `src/styles/global.css`                                         | Tailwind 入口、整屏高度、基础布局与响应式规则。            |
| `src/styles/simplified-panels.css`                              | 减法版首页的单栏布局、字号与响应式留白。                   |
| `src/styles/visual-review.css`、`overview-hover-fixes.css`      | 四屏视觉层级、首页高度与标签避让、Protocols / Build 悬停。 |
| `src/styles/header-navigation.css`、`overview-interactions.css` | 导航反馈和指示器、网络节点及弹窗。                         |
| `src/vendor/logo-catalog.js`、`logo-catalog.d.ts`               | 原动画纯运行时及类型声明，不包含原脚本的全页 DOM 初始化。  |

React 在构建时输出 HTML/SVG，交互由原生 TypeScript 控制器处理，没有 React 客户端水合，没有新增 UI 组件库或动画依赖。

动画运行时提取自 `E:\bigshoot\qntx-astro-logo-component2\qntx-astro-logo-component`，来源与 SHA-256 记录在 `review/logo-catalog-provenance.json`。仅完整待机轮播统一缩放至 0.86，让倾斜姿态留在既有 viewBox；普通睁眼、笑眼、跟随不缩放。

## 工程检查

```powershell
npm run check        # Astro 模板与 TypeScript
npx oxlint           # @qntx/oxlint 的 React 严格配置
npm run format       # Oxfmt + Astro 专用 Prettier
# 等价于：oxfmt --write . && prettier --write "src/**/*.astro"
npm run format:check # 只检查格式，不写文件；Oxfmt 通过后继续检查 .astro
npm run build
npm run test:e2e     # 本机 Google Chrome，原项目端口 4321
npm run verify       # 完整检查链
```

格式检查通过仅说明排版符合配置，不能替代 `npm run lint`、`npm run check`、构建或浏览器功能验收。

本分支浏览器测试共 36 项，覆盖三屏切换、连续滚轮、锚点与键盘、首页缩放与溢出、文字对比度、Protocols 悬停、截图标注内容的删除范围、三屏计数及独立 Logo 演示。已移除首页不再展示的网络节点交互测试，并调整原四屏导航用例。测试需要本机安装 Google Chrome；本次验收见 `review/simplification-20261023.md`，`review/integration-verification.md` 保留的是原四屏设计的历史验收记录。

此外项目已通过cloudflare部署，域名为：[qntx-ui.mateng20221.workers.dev](https://qntx-ui.mateng20221.workers.dev/)

## 关于复用说明

### 复用项与实际生效内容

本项目复用的是 npm 发布的配置包，没有直接引用本地源码目录。下表版本为本次核查时的安装版本；具体依赖版本由 `package-lock.json` 锁定，可用 `npm ci` 复现。

| 复用项           | 当前版本 | 项目中的接入方式                                                                             | 实际生效内容                                                                                                                                    |
| ---------------- | -------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@qntx/oxlint`   | `1.1.1`  | `oxlint.config.ts` 导入 `react` 与 `merge`，合并项目规则                                     | React / TypeScript 静态检查、类型感知检查；例如 JSX 列表缺少 `key`、显式 `any`、未处理的 Promise、不安全赋值等会报错。                          |
| `@qntx/oxfmt`    | `1.1.1`  | `oxfmt.config.ts` 展开 `fmt`，追加项目忽略项                                                 | 统一 2 空格缩进、100 列目标行宽、双引号、分号、LF 换行与尾逗号，并继承 import 排序等格式化设置。                                                |
| `@qntx/tsconfig` | `1.0.1`  | `tsconfig.json` 同时继承 `@qntx/tsconfig/configs/strictest.json` 与 `astro/tsconfigs/strict` | 开启严格类型检查、未使用变量 / 参数检查、返回路径检查、索引访问检查及可选属性精确检查；再由 Astro 配置与本地设置补齐框架环境和 React JSX 支持。 |

这三个包提供的是共享配置，真正执行工作的工具分别是 `oxlint`、`oxfmt` 和 TypeScript / Astro 检查工具。核查时已确认预设能被实际加载、合并后的 TypeScript 配置无解析错误，并非仅安装了包而没有启用。

项目在预设上保留了必要的补充：Oxlint 允许 CSS 的副作用导入，并忽略依赖、构建产物和测试报告；Oxfmt 继承上游忽略规则后，额外排除 `.astro`、Astro 缓存、测试报告、`package-lock.json` 和 `Q1.md`。TypeScript 保留 `.astro/types.d.ts`、`astro/client`、Node 类型及 `react-jsx` 设置；多个 `extends` 的同名选项由后面的配置覆盖前面的配置，本地 `compilerOptions` 再作补充。

### 检查与格式化的边界

| 文件或工作                                        | 由谁负责                                                      | 需要注意                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.ts`、`.tsx`、`.js` 等脚本                       | Oxlint 检查；Oxfmt 格式化                                     | lint 用于发现问题，format 用于统一书写格式，二者不能互相替代。                                         |
| `.astro` 页面与组件                               | `astro check` 检查；Prettier + `prettier-plugin-astro` 格式化 | Oxlint 对 Astro 模板的覆盖有限，lint 无 error 不代表模板层通过；本项目明确禁止 Oxfmt 格式化 `.astro`。 |
| Markdown、JSON、CSS 等 Oxfmt 支持且未被忽略的文件 | Oxfmt 格式化                                                  | `npm run format` 也会处理 README，因此可能只出现表格空格对齐等文档差异。                               |
| TypeScript 类型与环境声明                         | TypeScript / Astro 检查                                       | 类型检查不会自动改写源码；`strict` 也不等于所有 JavaScript 都接受同等检查，当前没有开启 `checkJs`。    |
| 依赖、产物、缓存、测试报告等                      | 按各工具的忽略规则排除                                        | Oxfmt 同时遵循 `.gitignore`；各工具的忽略范围不完全相同，不能认为 Git 忽略就等于所有工具都不检查。     |

`src/vendor/logo-catalog.js` 是提取的原动画运行时，保留文件开头明确列出的规则例外；这不是关闭全项目检查，其他未豁免规则以及手写控制器、类型声明与测试仍按项目配置检查。

### 通用配置不能直接替换的文件

复用采用“导入 / 继承预设，再补充项目设置”的方式。不要把共享包中的配置文件整份复制过来，覆盖以下项目文件：

| 文件                                              | 必须保留的项目内容                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `oxlint.config.ts`、`oxfmt.config.ts`             | 本地规则补充、忽略范围及 `.astro` 的格式化分工。                                                                      |
| `tsconfig.json`                                   | Astro 严格配置、生成类型的包含范围、React JSX 和环境类型设置，不能仅留下通用 `strictest` 配置。                       |
| `astro.config.mjs`、`src/env.d.ts`                | Astro / React 集成、Tailwind 的 Vite 插件及 Astro 客户端类型声明。                                                    |
| `.prettierrc.json`                                | `.astro` 专用解析器与格式化插件，不能由 Oxfmt 预设替代。                                                              |
| `.vscode/settings.json`                           | 保存时格式化、不同语言的格式化器、项目 Node 路径及 TypeScript SDK 路径。                                              |
| `package.json`、`package-lock.json`、`.gitignore` | 项目脚本、依赖与锁定版本，以及本项目不应提交的文件范围。依赖变更应通过 npm 更新，不能拿共享配置仓库里的文件直接覆盖。 |

也不要直接编辑 `node_modules/@qntx/` 中的预设；重新安装依赖会覆盖这些修改。需要调整时，应修改本项目的配置入口，并保留对应的框架补充。

### Node、VS Code 与自动格式化的处理约定

项目保留 `.ts` 配置，通过 npm 的 `node` 包提供 Node 24；npm scripts 使用项目内运行时。VS Code 的 Oxc 扩展通过 `oxc.path.node` 指向本地node_modules/node/bin/node.exe，因此不需要修改系统 Node，如有其他开发者要复现本项目，须自行修改路径。

`js/ts.tsdk.path` 指向 `./node_modules/typescript/lib`，用于选择编辑器的 TypeScript 语言服务，已替代弃用的 `typescript.tsdk` 设置。它与 Oxc 扩展使用哪个 Node 是两项不同设置，调整 TypeScript SDK 路径不会修复 Node 加载 `.ts` 配置的问题。
