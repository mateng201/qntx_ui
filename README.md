# QuantX UI

基于 Astro、React、TypeScript 与 Tailwind CSS 的组织介绍页。通过四个横向面板介绍 QuantX 的定位、协议、开发资源与组织入口；首页包含可交互的 SVG 协议网络和动画 Logo。

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

| 面板      | 设计与行为                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------- |
| Overview  | 参考 Ollama 的独立顶栏与左右分栏；左侧介绍 QuantX，右侧保留协议轨道、节点、元信息和中央动画 Logo。 |
| Protocols | 保留 Payments、Identity、Commerce、Wallets 四类原语，以 2×2 栅格分组。                             |
| Build     | 展示开发入口及四个仓库，移除重复的终端 clone 示例，保留一个明确的主行动入口。                      |
| About     | 深色收尾，保留组织、文档、动态入口；返回首页入口放在页脚导航附近。                                 |

### 横向切屏与公共导航

面板排布及吸附由原生 CSS Scroll Snap 实现。TypeScript 只负责将普通鼠标的垂直滚轮映射到横轴、合并同一手势的连续事件，并同步导航状态。触摸横滑、键盘方向键、Home / End、直接访问面板锚点均可使用；无 JavaScript 时仍保留锚点入口。

桌面验证视口下，每屏内容放入顶栏、页脚之间的剩余高度，不依赖隐藏溢出来通过检查。窄屏内容确实放不下时保留面板内纵向阅读与原滚轮让行逻辑。

导航右侧六个按钮统一采用低饱和背景、文字轻微上移及箭头位移反馈。四个面板链接通过 `aria-current="page"` 表示活动状态；支持 CSS Anchor Positioning 时使用单一下划线平滑移动，不支持时退化为淡入淡出。GitHub、Docs 只参与悬停反馈。

## 源码导航

| 文件                                                         | 职责                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `src/components/HorizontalDeck.tsx`                          | 整屏容器、四屏组合。                                       |
| `src/components/SiteHeader.tsx`、`SiteFooter.tsx`            | 公共导航、当前位置与前后切屏。                             |
| `src/components/HomeIntro.tsx`、`HomeVisual.tsx`             | 首页左侧介绍、右侧网络图与内联 SVG。                       |
| `src/components/Logo.astro`                                  | Logo 组件。                                                |
| `src/data/site.ts`、`overview-nodes.ts`                      | 组织链接、协议、仓库、节点说明与坐标。                     |
| `src/data/logo.ts`、`logo-poses.json`                        | 静态 “Q” 路径与基础轮廓。                                  |
| `src/scripts/horizontal-navigation.ts`                       | 滚轮、键盘、锚点、活动状态同步。                           |
| `src/scripts/logo-animation.ts`                              | 五秒计时、睁眼 / 笑眼 / 待机切换、目光跟随与生命周期。     |
| `src/scripts/overview-interactions.ts`                       | 节点选择、附近弹窗、避让、过渡与焦点恢复。                 |
| `src/pages/index.astro`                                      | 首页                                                       |
| `src/pages/logo-check.astro`                                 | logo独立演示                                               |
| `src/styles/global.css`                                      | Tailwind 入口、整屏高度、基础布局与响应式规则。            |
| `src/styles/visual-review.css`、`overview-hover-fixes.css`   | 四屏视觉层级、首页高度与标签避让、Protocols / Build 悬停。 |
| `src/styles/header-navigation.css`、`overview-interactions.css` | 导航反馈和指示器、网络节点及弹窗。                         |
| `src/vendor/logo-catalog.js`、`logo-catalog.d.ts`            | 原动画纯运行时及类型声明，不包含原脚本的全页 DOM 初始化。  |

React 在构建时输出 HTML/SVG，交互由原生 TypeScript 控制器处理，没有 React 客户端水合，没有新增 UI 组件库或动画依赖。

动画运行时提取自 `E:\bigshoot\qntx-astro-logo-component2\qntx-astro-logo-component`，来源与 SHA-256 记录在 `review/logo-catalog-provenance.json`。仅完整待机轮播统一缩放至 0.86，让倾斜姿态留在既有 viewBox；普通睁眼、笑眼、跟随不缩放。

## 工程检查

```powershell
npm run check        # Astro 模板与 TypeScript
npx oxlint           # @qntx/oxlint 的 React 严格配置
npm run format       # Oxfmt + Astro 专用 Prettier
npm run format:check
npm run build
npm run test:e2e     # 本机 Google Chrome，原项目端口 4321
npm run verify       # 完整检查链
```

`@qntx/oxlint`、`@qntx/oxfmt`、`@qntx/tsconfig` 均来自 npm，没有引用本机 qntx-source 源码。TypeScript 合并通用严格配置与 Astro 严格配置，补充环境声明及 React JSX 设置。

Oxlint 对 `.astro` 模板的覆盖有限，不能用 lint 结果代替 `astro check` 与构建。`.astro` 只交给 `prettier-plugin-astro`，避免 Oxfmt 的不完整支持破坏模板。提供的生成式 vendor 动画代码保留文件内明确列出的规则例外，手写控制器、类型声明与测试继续接受原有严格检查。

当前浏览器测试共 62 项，涵盖切屏、连续滚轮、锚点与键盘、缩放与溢出、文字对比度、链接悬停、节点与弹窗、微笑、五秒待机、完整动画循环、触摸、减少动态效果及离屏暂停。测试需要本机安装 Google Chrome；同步后的实际验收结果见 `review/integration-verification.md`。

此外项目已通过cloudflare部署，域名为：[qntx-ui.mateng20221.workers.dev](https://qntx-ui.mateng20221.workers.dev/)
