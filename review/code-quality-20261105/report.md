# 代码质量自检报告

日期：2026-11-05（Asia/Shanghai）  
工程：`E:\bigshoot\qntx.ui`  
提交：`f9050521ba482bbeafdaa3a481bddd1ad15e978b`  
执行环境：项目 Node `v24.22.0`，npm `10.9.2`。

**结论：未发现需要停止检查的 P0/P1 严重问题；存在重复渲染、共享设计数值覆盖不足、播放规则双份维护和旧数据未清理等 P2/P3 问题。**

本轮只增加本目录下的报告、原始输出和审计脚本文本，没有修改应用、共享库、依赖或规则配置。源码哈希复核输出为 `{"changedSourceFiles":[]}`；Git 状态仅新增本审计目录。报告中的行号以本次检查源码为准。

任务中的两处名称需要对齐实际工程：包名是 `@qntx-ui/*`，不是 `@qntx/*`；README 边界说明在 §6，当前 §8 是历史记录目录。

## 一、共享边界与依赖合规

### 1. lint:boundaries：通过

命令（禁用 Nx 缓存，确保实际重跑）：

```powershell
npm run lint:boundaries -- --skip-nx-cache
```

关键输出：

```text
NX   Running target boundaries for 5 projects:
- design-tokens
- content
- mascot
- mobile
- web
NX   Successfully ran target boundaries for 5 projects
Cache: Skipped (--skip-nx-cache)
```

证据：[完整命令输出](evidence/01-lint-boundaries.log)、[规则源码](../../eslint.config.mjs)。

规则实际禁止 Web 源码导入 React Native/Expo，禁止 Mobile 源码导入 Astro/React DOM，禁止共享库依赖应用、UI 框架及受限浏览器全局。此结果是规则覆盖范围内的检查通过，不代替对任意动态字符串加载的形式化证明。

### 2. test:boundaries：通过

```powershell
npm run test:boundaries
```

```text
Boundary probes passed: six forbidden dependencies/globals rejected,
one shared import allowed (including Astro frontmatter).
```

六个拒绝项分别是 Web → Mobile、Mobile → Web、共享库 → React Native、共享库 → Web、共享库访问 `window`、Astro frontmatter → Mobile；另有合法共享导入放行。探针在 `finally` 中清理。

证据：[探针输出](evidence/02-boundary-probes.log)、[探针实现](../../tools/test-boundaries.mjs)。

### 3. 依赖图分析：合规

| 应用          | package.json 直接依赖的共享包                                   | 跨应用代码引用 |
| ------------- | --------------------------------------------------------------- | -------------- |
| `apps/web`    | `@qntx-ui/content`、`@qntx-ui/design-tokens`、`@qntx-ui/mascot` | 未发现         |
| `apps/mobile` | 同上三个包                                                      | 未发现         |

`packages/mascot` 只额外依赖 `@qntx-ui/content`；另外两个共享包没有应用或 UI 框架依赖。

Mobile manifest 中有 `react-dom` 和 `react-native-web`，用于 `expo start --web` 辅助预览，不等于原生应用源码误引 React DOM；实际 Mobile 源码边界检查通过。没有 Astro 依赖。

证据：[两个应用及三个共享包 manifest 原文](evidence/03-direct-dependencies.log)。

## 二、共享库利用率

### 1. packages/content：两端核心内容已共享，存在未消费旧数据

按任务给出的旧包名检索无匹配；使用实际包名重新检查：

```powershell
rg -n --fixed-strings '@qntx/content' apps/web/src apps/mobile/src
# exit=1，无匹配：包名不同，不代表没有共享
rg -n '@qntx-ui/(content|design-tokens|mascot)' apps/web/src apps/mobile/src
```

关键源码：

```ts
// apps/web/src/data/site.ts:2–10
export {
  aboutDestinations,
  aboutIntro,
  brandMarkPath,
  hero,
  githubIconPath,
  homePageCopy,
  links,
} from "@qntx-ui/content";

// apps/mobile/src/components/HomeSections.tsx:1
import { aboutDestinations, aboutIntro, hero, homePageCopy, links } from "@qntx-ui/content";
```

主标题、组织内容、三个跳转目的地和 URL 并未在两端组件中各硬编码一份。Web 的 `site.ts` 是有意保留的取数入口，不能因它只转出数据就判为死文件。两端仍各写了 `QuantX`、`GitHub`、`Docs` 等短标签；`index.astro:20` 的 SEO 描述另有一份组织描述，建议未来同步内容时一起检查。

内容包 11 个顶层导出中，7 个被应用直接或间接消费，4 个旧导出未消费，清单见第四节。证据：[导入与共享内容原文](evidence/04-shared-imports.log)、[静态分析 JSON](evidence/shared-analysis.json)。

### 2. packages/design-tokens：部分利用，存在硬编码

```ts
// apps/web/src/pages/index.astro:2–15
import { fontFamilies, homeTheme, palette } from "@qntx-ui/design-tokens";
// homeTheme 转为 --opening-* / --about-* / --resources-* CSS 变量
// apps/mobile/src/components/HomeSections.tsx:2、90、93
import { fontFamilies, homeTheme } from "@qntx-ui/design-tokens";
color: homeTheme.opening.ink;
missionAccent: {
  color: homeTheme.opening.accent;
}
```

`fontFamilies`、`homeTheme`、`palette` 已使用；`spacing`、`typeScale` 没有应用消费者。Web 的 `global.css` 没有直接导入 TS token，而是通过 HTML 上的 CSS 变量获得共享字体；它仍写了一份相同字体栈作为 CSS 默认值。

扫描得到 **32 处 HEX 字面量：Web 19 处，Mobile 13 处**，包含样式、SVG 材质及 meta，不是 32 种不同颜色。完整位置如下：

| 文件（相对于项目根目录）                        | 行号与硬编码值                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/HomePage.tsx`          | 39 `#60645b`；40 `#363a31`；41 `#191c17`；45、46 `#ffffff`                                         |
| `apps/web/src/pages/index.astro`                | 23 `#ffffff`                                                                                       |
| `apps/web/src/scripts/mascot-playback.ts`       | 31 `#ffffff`                                                                                       |
| `apps/web/src/styles/global.css`                | 51 `#dfe2d8`；52 `#181918`                                                                         |
| `apps/web/src/styles/home-page.css`             | 5、15 `#fafaf8`；11、79、209、289 `#1b1d19`；12 `#5d6259`；61 `#11130f`；210 `#fff`；218 `#353d2e` |
| `apps/mobile/src/App.tsx`                       | 382、392 `#fafaf8`；396 `#1b1d19`                                                                  |
| `apps/mobile/src/components/AnimatedMascot.tsx` | 75、114 `#1b1d19`；106 `#60645b`；107 `#363a31`；108 `#191c17`；118、119 `#ffffff`                 |
| `apps/mobile/src/components/HomeSections.tsx`   | 148 `#1b1d19`；153、154 `#ffffff`                                                                  |

示例：Web `home-page.css:5` 与 Mobile `App.tsx:382` 都写 `#fafaf8`；两端 SVG 也各写同一组渐变色。`#fff` 与 `#ffffff` 是同值，不能算两种颜色。

建议补齐页面底色、品牌墨色、SVG 材质与强调状态 token，再接入具有相同语义的字号/间距。不应为了消除字面量而把平台尺寸、响应式计算、所有数字机械统一。

证据：[逐处颜色与导入清单](evidence/shared-analysis.json)。RGB、颜色关键字与完整间距数值不计入这 32 处统计。

### 3. packages/mascot：核心几何已共享，控制器规则仍重复

两端均从包入口导入，而非越过入口直接引用 `packages/mascot/src/` 文件；这是正常的封装方式：

```ts
// Web mascot-playback.ts:2–8
import {
  contourPath,
  createCatalogAnimation,
  createMascotMorph,
  staticMascotFrame,
} from "@qntx-ui/mascot";
// Mobile mascot-playback.ts:1–8
import {
  createCatalogAnimation,
  createMascotMorph,
  pathsForFrame,
  staticMascotFrame,
  staticMascotPaths,
} from "@qntx-ui/mascot";
```

共享包入口从 `morph.ts`、`paths.ts`、`docking.ts` 转出实现。两端都启用了 `directGeometry: true`。不存在各自再复制一套完整几何引擎的情况。

两端播放文件共 467 行；严格逐 token 克隆检测命中一组 75-token 片段：Web 117–127、Mobile 66–76，各 11 行，两份覆盖共 **22/467 = 4.71%**。片段是 `transition.sample()` 的进度和结束判断。这个数字不是“语义重复率”；状态机、5 秒等待等规则虽代码不同，仍然双份维护，详见第六节。

## 三、性能隐患

### 1. 动画帧率：基本合规，有 P2 优化点

`mascot-docking.ts` 为共享纯函数的转出入口，本身没有动画循环。Web 播放、路径与滚轮控制器均使用 RAF，源码未发现用 `setInterval` 驱动动画。`setTimeout` 用于待机等待，不是逐帧更新。

```ts
// apps/web/src/scripts/home-page-scroll.ts:113–117
mascot.style.transform = `translate3d(...) scale(...)`;
mascot.style.opacity = String(...);

// home-page-scroll.ts:279–290
events.abort();
disposeWheelNavigation();
observer.disconnect();
animation.dispose();
// 之后分别 cancelAnimationFrame(renderFrameId / measureFrameId / startupFrameId)
```

没有发现逐帧修改容器 `width/height/top/left`。但不能把“使用 transform”表述成“完全没有重绘”：SVG `d` 的形变必然需要更新绘制，阴影、filter 和每帧几何读取也有成本。Web `mascot-playback.ts:88` 每帧读取 `getBoundingClientRect()`；自然文档模式也读取各区块边界，存在同步样式/几何计算的潜在成本，尚未通过 Performance trace 证明是强制布局瓶颈。

**运行时实测：同帧重复渲染确实存在。**

```text
frames: 119
controllerRenderCalls: 209
framesWithMultipleControllerCalls: 90
maxControllerCallsPerFrame: 2
controllerRendersAfterDispose: 0
pendingAnimationCallbacksAfterDispose: []
unAbortedOwnedListeners: []
```

原因：`wheel-section-navigation.ts:75` 的 `options.renderFrame()` 与 `home-page-scroll.ts:186` 的归位 RAF 都能进入同一渲染函数；绑定回调在 `home-page-scroll.ts:265`。建议统一为单个帧调度入口，收尾必要时显式渲染一次。本次重复有上界、清理正常，不能由此直接推断真机掉帧。

证据：[源码事件检索](evidence/06-animation-events.log)、[运行时数据](evidence/runtime-analysis.json)、[运行时命令输出](evidence/08-runtime-analysis.log)。

### 2. 事件监听清理：合规，未发现遗漏的受管监听

| 所属文件                      | 注册位置与事件                                                                         | 清理方式                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `home-page-scroll.ts`         | 229 click；242 scroll；246 resize；247 媒体偏好 change                                 | 全部携带 `signal`；279 `events.abort()`                    |
| `wheel-section-navigation.ts` | 29 wheel；87 resize；88 pointerdown；89 keydown；98 媒体偏好 change                    | 全部携带 `signal`；100 `events.abort()`，并取消导航 RAF    |
| `mascot-playback.ts`          | 221 pointermove；239 pointerleave；246 blur；253 visibilitychange；254 媒体偏好 change | 全部携带 `signal`；267 `events.abort()`，取消 timer 与 RAF |
| `pages/index.astro`           | 41 astro:before-swap                                                                   | `{ once: true }`，触发时调用总 dispose                     |
| Mobile `AnimatedMascot.tsx`   | 88 AppState change                                                                     | 93–94 `playback.dispose()` 与 `listener.remove()`          |
| Mobile `useReducedMotion.ts`  | 8 reduceMotionChanged；36 screenReaderChanged                                          | effect cleanup `listener.remove()`，并设 mounted=false     |
| Mobile `App.tsx`              | 98 hardwareBackPress；109 scrollY listener                                             | 105 `listener.remove()`；123 `scrollY.removeListener()`    |
| Mobile `useMascotDocking.ts`  | 51 docking listener；55 scrollY listener                                               | 83–87 移除两项 listener、stopAnimation，并设 disposed=true |

Web 没有逐项写 `removeEventListener`，但 `addEventListener(..., { signal })` 与 `AbortController.abort()` 是其对应清理机制，不能据此误判泄漏。本次实际销毁后 14 个受管 DOM/媒体监听全部处于 aborted 状态；500ms 观察窗口内没有剩余控制器绘制或命名动画 RAF。它不是长期堆内存泄漏的完整证明。

### 3. 滚动性能：有合帧，有重复调度优化空间

```ts
// home-page-scroll.ts:190–191
function scheduleScrollRender(): void {
  renderFrameId ??= requestAnimationFrame(renderScrollFrame);
}
// :242–245
addEventListener("scroll", scheduleScrollRender, {
  passive: true,
  signal: events.signal,
});
```

这是按 RAF 合帧，不需要再叠加固定毫秒的 throttle 才算节流。ResizeObserver/resize 也通过 `measureFrameId ??=` 合并测量。

`wheel` 使用 `passive: false`，因为按屏切换必须调用 `preventDefault()`；220ms 安静间隔与动画锁限制手势连跳。直接改为 passive:true 会破坏已验收功能。resize/change 等非滚动阻塞事件不要求机械增加 passive。已确认的风险是前述两个 RAF 入口同帧重复工作。

### 4. Mobile 动画：测试通过，属于原生与 JS 混合驱动

```powershell
npm run test:mobile:animation
```

```text
✔ direct native geometry matches the original pipeline through the full catalog
✔ 60Hz caps frame sampling at about 30 per second
✔ 90Hz caps frame sampling at about 30 per second
✔ 120Hz caps frame sampling at about 30 per second
✔ input moves the idle deadline without allocating timers per touch
✔ background and reduced-motion stop animation and leave no repeating frame work
✔ contour alignment does not twist a reversed, offset closed contour
tests 7 / pass 7 / fail 0
```

`App.tsx:45–46` 的 `Animated.event` 和 `useMascotDocking.ts:73–78` 的 `Animated.timing` 在原生平台设置 `useNativeDriver: true`，负责滚动映射、透明度、位移和透视变换。Web 辅助预览使用 JS driver 是平台分支行为。

SVG 的 `d` 路径仍由 JS RAF 计算，先执行约 30fps 的预算判断，再计算几何；原生端通过 `setNativeProps` 更新，不逐帧重渲染整个 App。因此不能宣称“全部动画已经原生驱动”。真机帧率、JS/native 线程占用仍需设备分析。

证据：[测试完整输出](evidence/07-mobile-animation-tests.log)、[Native API 与清理代码](evidence/06-animation-events.log)。

## 四、死代码与未引用

### 1. 未使用组件：未发现孤立组件文件

使用本地 TypeScript AST、相对 import/export 可达性扫描代替新增 `ts-prune` 依赖，人工复核 Astro 页面与 Mobile 注册入口。复现命令：

```powershell
Get-Content -Raw review/code-quality-20261105/audit-static.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module - dead
```

```text
ComponentFiles: 5
HomePage.tsx        reachable: true
Icon.tsx            reachable: true
AnimatedMascot.tsx  reachable: true
ExternalLink.tsx    reachable: true
HomeSections.tsx    reachable: true
```

未引用组件文件列表：`[]`。对 `horizontal-navigation / SiteFooter / ProtocolPanel / BuildPanel / AboutPanel / MobileWebSite / scroll-snap / data-theme` 等旧标记的应用源码检索无匹配；没有发现旧横向导航、底部导航或反色组件残留。

### 2. 未使用样式：未发现未引用类，存在未消费变量

用 PostCSS 提取 CSS 类，再对组件与脚本人工复核：两份 CSS 共 26 个文件内类条目、25 个不同类名，未引用类列表 `[]`。旧 `.horizontal-nav`、`.bottom-nav`、`.about-inverted` 无匹配。

发现 `home-page.css:12` 的 `--page-muted: #5d6259` 没有 `var(--page-muted)` 消费者，属于可清理变量。该扫描针对源码 CSS 类，不等同于第三方生成样式的逐选择器覆盖率。

证据：[完整组件、类与导出扫描](evidence/dead-analysis.json)。

### 3. 未使用导入：未发现

```powershell
npx oxlint
```

```text
oxlint exit=0
```

人工检查 `useState/useRef/useEffect`、共享包和框架导入，未发现导入后未使用的应用模块。Oxlint 对 Astro 模板覆盖有限，不能把此结果当成模板全覆盖。

审计过程说明：最初将两份审计脚本临时保存为 `.mjs`，根 Oxlint 也扫描了它们并报错。这些不是原工程错误；之后将脚本保存为 `.mjs.txt` 证据，通过 Node stdin 执行，没有修改忽略规则。保留[首次输出](evidence/10-oxlint-audit-artifacts.log)及[最终项目检查输出](evidence/10-oxlint.log)，避免混淆。

### 4. 未使用共享库导出：6 个顶层导出

| 包            | 未被应用或其他共享包消费的顶层导出                         | 定义行         |
| ------------- | ---------------------------------------------------------- | -------------- |
| content       | `standards`、`protocolIntro`、`primitives`、`repositories` | 25、31、65、96 |
| design-tokens | `spacing`、`typeScale`                                     | 21、22         |
| mascot        | 无；15 个值/类型导出均有应用消费者                         | —              |

另外发现对象内部没有当前消费者的字段：

- `links.website`、`links.products`（content:2、6）。
- `hero.description`（content:11）。
- `homePageCopy.mission`（content:18，当前实际标题来自 missionLead/missionAccent）。
- `aboutIntro.action`、`aboutIntro.signatureLines`（content:41、42）。
- `palette` 只有 `ink`、`hover` 被应用按属性读取，其余 14 个字段没有直接消费者：`surface / muted / copy / line / protocolSurface / badge / badgeInk / accent / darkSurface / darkInk / darkCopy / darkMuted / darkLine / darkHover`。

`spacing` 在 vendor 内有同名局部变量，但没有导入 design-tokens，不能把同名标识符误算成共享 token 已使用。`brandMarkPath` 虽 Native 不直接导入，仍通过 `staticMascotPaths` 间接消费，不是死导出。Web `createSvgMascotRenderer` 在本文件内使用，也不能按“无其他文件导入”删掉整个函数。

## 五、构建产物与体积

### 1. Web 构建：通过，0.294 MB / 0.280 MiB

```powershell
npm run build -- --skip-nx-cache
```

```text
NX   Successfully ran target build for project web
[build] 1 page(s) built
Count: 5
Sum: 293959 bytes
```

远低于 5MB。文件明细：

| 文件                                                            |    字节 |
| --------------------------------------------------------------- | ------: |
| `_astro/client.DjHPOnZk.js`                                     | 220,761 |
| `_astro/index.astro_astro_type_script_index_0_lang.DahThLdp.js` |  51,006 |
| `_astro/index.J6EL0tnM.css`                                     |  15,488 |
| `index.html`                                                    |   6,259 |
| `favicon.svg`                                                   |     445 |

生产目录临时 HTTP 服务 + Chrome 实测只加载主脚本 `...DahThLdp.js`，没有请求 `client.DjHPOnZk.js`。所以 220,761 字节 React 渲染器是部署目录产物，不应描述为当前首页必下载开销。主脚本约 51KB，不能用整个 node_modules 的大小推断首页负担。

证据：[构建日志](evidence/11-web-build.log)、[文件列表](evidence/12-web-files.log)、[生产请求记录](evidence/production-analysis.json)。

### 2. Mobile 构建：通过，4.396 MB / 4.192 MiB

```powershell
npm run build:mobile -- --skip-nx-cache
```

```text
Web Bundled ... (321 modules)
iOS Bundled ... (757 modules)
Android Bundled ... (756 modules)
NX   Successfully ran target export for project mobile
```

| 导出项                     |      字节 |
| -------------------------- | --------: |
| Android Hermes `.hbc`      | 1,863,848 |
| iOS Hermes `.hbc`          | 1,857,705 |
| Expo Web `.js`             |   672,547 |
| index.html + metadata.json |     1,422 |
| 合计，5 个文件             | 4,395,522 |

这是三平台资源合计，不是 APK/IPA 大小。当前规模正常，未见大图片、字体或调试 sourcemap 占用。

源码边界与 manifest 没有 Mobile → Astro/Web 应用引用。另对可读 Expo Web 包和原生二进制补充检索 `apps/web`、`@astrojs/`、`astro/dist/`、两个 Web 控制器名称，均未发现标记。二进制无字符串标记只是补充证据；本轮未采集完整 Hermes 源映射，因此不将其冒充全模块溯源证明。

证据：[三平台构建日志](evidence/13-mobile-build.log)、[精确大小 JSON](evidence/build-sizes.json)、[原生标记检查](evidence/production-analysis.json)。

### 3. 体积最大依赖 Top 5：实际只有 4 个非零第三方 JS 贡献项

没有持久修改 Vite 配置或安装 source-map-explorer。通过 Astro 构建 API 临时插入只读 Rollup `generateBundle` 统计，筛选实际部署 JS chunk 的 `chunk.modules.renderedLength`：

| 排名 | 第三方包       | renderedLength 字节 |
| ---- | -------------- | ------------------: |
| 1    | react-dom      |             538,519 |
| 2    | react          |              16,175 |
| 3    | scheduler      |               9,252 |
| 4    | @astrojs/react |               3,763 |
| 5    | 无第五个非零项 |                   — |

**该列是最终压缩前的模块贡献，不是 gzip 大小，也不能与最终文件字节直接相加比较。** 前述依赖位于 React client 渲染器 chunk；当前首页没有请求该 chunk。工作区自有动画代码另外位于主脚本，不伪装成第五个第三方依赖。

建议：暂不为这份未加载的小产物贸然移除服务端渲染所需的 React 集成。若后续要求最小部署目录，可单独验证 Astro renderer 产物裁剪。

证据：[模块原始 JSON](evidence/bundle-modules.json)、[分析命令输出](evidence/15-bundle-modules.log)。

## 六、代码重复度

### 测量口径

使用 TypeScript AST 叶子 token，忽略空白和注释，保留标识符及字面量。连续相同至少 50 tokens、两边各覆盖至少 5 个物理行才计为克隆；按各文件命中行的并集除以总物理行数。该方法衡量严格文本结构重复，不能量化“代码写法不同但规则相同”的语义重复。

```powershell
Get-Content -Raw review/code-quality-20261105/audit-static.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module - duplicates
```

### 1. 吉祥物播放：严格克隆 4.71%，存在共享状态机的提取价值

```text
Web: 281 lines / Mobile: 186 lines
Matched physical lines: 22 / 467 = 4.71%
One clone: 75 tokens
Web 117–127 <-> Mobile 66–76
```

语义对应函数与范围：

| 共同责任                                   | Web 行  | Mobile 行 | 需要保留的差异                                               |
| ------------------------------------------ | ------- | --------- | ------------------------------------------------------------ |
| renderAnimationFrame：采样、形变和结束判断 | 83–145  | 50–87     | Web DOM 坐标；Mobile 计算前 30fps 限制、路径提交             |
| updatePlaybackState：启停、进入/离开形变   | 147–188 | 89–116    | visibility/media 与 foreground/options；不同时间基准         |
| clearIdlePlaybackTimer                     | 190–195 | 118–123   | 变量名不同，责任相同                                         |
| 5 秒待机                                   | 197–219 | 125–155   | Web 重置 timer；Mobile deadline 重排，避免每次触摸创建 timer |
| dispose                                    | 265–279 | 179–184   | Web 还清理 DOM 监听与绘制属性                                |

两端还分别维护 `360/320ms` 形变、`5000ms` 等待、`2200ms` 方向恢复及 `180ms` 目光缓动参数。

**建议提取 `packages/mascot/src/playback.ts` 的纯控制核心，而不是把两个现有控制器整份搬进共享库。** 注入时钟、RAF/timer 调度器、绘制回调、归一化 gaze 和平台选项；保留 Web DOM、原生 AppState 与 SVG 提交适配。必须保留 Mobile 的计算前限帧和截止时间策略，并扩充现有假时钟测试后再迁移。

### 2. 滚动/导航：严格克隆 0%，规则仍重复

```text
Web home-page-scroll + wheel-section-navigation:
307 + 103 physical lines
Mobile App + useMascotDocking:
414 + 100 physical lines
Matched: 0 / 924 = 0.00% (50-token/5-line threshold)
```

重复维护的规则证据：

- 当前阶段边界：Web `home-page-scroll.ts:132` 和 Mobile `App.tsx:113` 都使用 `0.2`。
- 开场淡出：Web `:148` 与 Mobile `:135` 都使用 `0.12`。
- 第二屏淡入/退出：Web `:149` 的 `0.18/0.48` 与 Mobile `:141–144` 的 `0.18/0.28/0.48/0.58`。
- 背景淡化/缩放、归位显现等数值也在两端各有插值表达。
- 曲线、归位区间、900ms 时长与末屏透明度缓动已经通过 `mascotDockingTiming / getMascotDockingProgress / easeMascotDocking / getMascotDockingPosition` 共享。

建议只进一步共享纯时间参数与阶段判定。DOM 滚动测量、wheel 拦截、自然文档适配、Native ScrollView 与安全区域继续留在平台层，没必要抽象成一个跨端滚动控制器。

### 3. 样式：整体结构重复率不作伪精确统计；HEX 色值重合度 54.55%

CSS 与 React Native StyleSheet 语法和布局责任不同，不能给出可信的单一“样式代码重复率”。本次可复现替代指标为去重并归一化 HEX 后的 Jaccard 重合度：

```text
Web unique HEX: 11
Mobile unique HEX: 6
Intersection: 6 / Union: 11 = 54.55%
```

共同值：`#60645b / #363a31 / #191c17 / #ffffff / #fafaf8 / #1b1d19`。这表明同一材质、底色与品牌墨色存在双份硬编码，不代表 54.55% 的样式代码可以删除。

重复间距/字号示例：Web `home-page.css:270` 的链接辅助文字和 Mobile `HomeSections.tsx:173` 的 `destinationDetail` 都使用 13px 字号；Web `home-page.css:126` 用标题下边距 14px，Mobile `HomeSections.tsx:100` 用副标题上边距 14px，表达同一处文字间隔。`spacing/typeScale` 整体未接入，应该先按语义挑选对应值，再考虑替换，不能按数字相等直接认定相同设计含义。

证据：[重复度 JSON](evidence/duplicate-analysis.json)、[原始输出](evidence/17-duplicate-analysis.log)。

## 七、发现的问题与优化建议

| 优先级 | 问题与涉及文件                                                | 建议                                                                             |
| ------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P2     | wheel 与归位 RAF 同帧两次调用滚动渲染；Web 两个控制器         | 统一帧所有权，保留收尾刷新；用本轮运行时计数验证每帧仅执行一次                   |
| P2     | `spacing/typeScale` 未消费，32 处 HEX，SVG 材质与底色双份定义 | 补齐语义 token，分别映射到 CSS 变量与 StyleSheet，保留平台布局计算               |
| P2     | Web/Mobile 播放状态、等待和目光时序规则各自维护               | 以现有测试为基线提取纯 playback core，注入调度与 renderer，保留 30fps 预算       |
| P3     | 4 个旧 content 顶层导出、2 个未使用 token 导出及旧对象字段    | 先确认是否保留兼容 API；对本仓库无消费者的旧数据集中移除或迁移历史记录           |
| P3     | `--page-muted` 无消费者；阶段时间阈值仍双份维护               | 删除无用变量，收拢纯时间参数和阶段判定                                           |
| P3     | Web 每帧几何读取、SVG d/filter 绘制成本                       | 合并 DOM 读取/写入阶段，必要时录制 Performance trace；不能仅凭静态检索承诺无卡顿 |
| P3     | React client 文件被产出但当前页面未加载                       | 可作为部署目录裁剪候选，当前不是首屏下载瓶颈                                     |

本轮没有执行上述优化或删除。没有新增依赖，没有为通过检查放宽工程规则。

## 八、未覆盖项与解释边界

- 未连接红米 K50 真机，没有测 native UI/JS 线程帧率、GPU、耗电、热降频或 release 包启动；7 项假时钟测试不代表真机持续 30fps。
- 未生成 APK/IPA，Mobile 的 4.19 MiB 是三平台导出资源总大小。
- 未记录完整 Chrome Performance/heap trace；本轮是一次导航及销毁后的 500ms 观察，不能证明所有路径长期无内存泄漏。
- 未收集完整 Hermes sourcemap。原生导出无 Web 标记是补充证据，边界规则与源码依赖检查为主要证据。
- 未调用 `ts-prune` 或安装新扫描依赖；已用本地 TypeScript AST、导入可达性和 PostCSS 替代，再人工复核。动态 import 字符串、运行时类名生成与第三方生成样式不在静态完备性承诺内。
- “4.71%/0%”仅表示本报告阈值下的严格克隆；“54.55%”仅为硬编码 HEX 集合重合度，不应当作完整语义重复率或整份样式重复率。
- 依赖体积统计为 Rollup 模块最终压缩前 renderedLength，未测每个依赖独立 gzip/Brotli 后大小。
- 没有重跑功能肉眼验收、全套浏览器交互测试或额外修改功能；本轮按任务范围检查边界、动画回归、lint、构建和只读审计。

### 证据复现入口

所有命令在项目根目录执行。审计脚本以文本保留，避免成为应用源码或被工程 lint 误扫描：

```powershell
# 源码导入/颜色/函数范围
Get-Content -Raw review/code-quality-20261105/audit-static.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module - shared
# dead / duplicates / size / verify 替换 shared 即可运行其他静态检查

# 运行时 RAF 与监听清理；先运行 npm run dev，使用 4321
Get-Content -Raw review/code-quality-20261105/audit-runtime.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module -

# 临时 Rollup 模块贡献分析，不写入项目配置
Get-Content -Raw review/code-quality-20261105/audit-bundle.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module -

# 生产目录实际 JS 请求与原生产物标记检查
Get-Content -Raw review/code-quality-20261105/audit-production.mjs.txt |
  .\node_modules\node\bin\node.exe --input-type=module -
```

首次 runtime 探测时本地开发服务未启动，出现连接拒绝；启动 `npm run dev` 后已成功执行。本报告引用成功执行的数据，不把服务未启动当成工程故障。
