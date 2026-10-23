# 手机端开发说明

当前实现位于 `mobile` 分支，与 Web 共用 npm 锁文件和 Nx 工作区。Mobile 是原生 React Native 组件，不是把现有网站嵌入 WebView。

## 日常运行

在仓库根目录执行：

```powershell
npm ci
npm run dev:mobile
```

这个命令启动 Expo / Metro。要在直接连接的终端中使用 Expo 二维码与键盘快捷键，可以运行 `npm run start --workspace=mobile`。

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

- Overview：单栏标题、简介、探索按钮、GitHub 和三个协议链接。
- Protocols：四张纵向协议卡片，全部保留说明和外部跳转。
- About：深色介绍页与组织、文档、动态入口。
- 三个底部标签始终可用，活动状态与无障碍选择状态同步。
- 标题和正文保留系统字体缩放；正文使用独立 ScrollView。安全区域由 `react-native-safe-area-context` 处理。
- Android 从其他标签按系统返回键时先回 Overview；Overview 上交给系统处理。
- 原生外链通过 React Native Linking 打开。浏览器预览中则打开独立窗口，不丢失当前标签。

当前只有三个平级页面，标签状态在 Mobile 内部管理，没有引入额外路由库。需要详情栈、应用深链或登录流程时，再增加导航层；共享内容不会承担导航状态。

## 配置与版本

Nx 24.0.0 通过通用任务执行器接入两端，无需将 Astro 或 Expo 强行接入另一套构建器。Metro 使用 Expo 默认工作区解析，仅将并行 worker 限制为两个，以控制本地开发的资源占用；没有人为配置 React 别名或跨目录复制依赖。

Expo 58.0.17、React Native 0.88.0、React / React DOM 19.3.0 按 Expo 推荐组合固定。原 Web 的 Astro React 集成支持此 React 版本，原来的 36 项回归用例已验证迁移后的行为。所有依赖在根锁文件中记录，不在子应用分别维护锁文件。

共享包使用 TypeScript 源码 exports，由 Astro / Metro 分别处理；无需先构建或发布到 npm。`content` 与 `design-tokens` 是私有工作区包，其 `@qntx-ui/*` 名称与上游 qntx 工程配置包不同。

## 检查与产物

```powershell
npm run check
npm run lint
npm run lint:boundaries
npm run test:boundaries
npm run doctor:mobile
npm run build:mobile
npm run test:mobile
```

`build:mobile` 只生成 `apps/mobile/dist/` 下的平台 JS / Hermes 资源及浏览器文件。它不是安装包构建命令。

安装包可在具备 Android SDK 的机器上进行本地原生构建，iOS 使用 Xcode，或后续单独配置 EAS。当前没有执行云构建、登录 Expo、上传代码、应用签名或商店发布。`org.qntx.mobile` 是开发配置中的应用标识，正式发布前应确认使用有权限的标识与签名。

## 本机验证的限制

本次机器没有可用的 Android SDK / ADB 或 iOS 模拟器。已执行的是类型检查、Expo 依赖检查、两个原生平台 Hermes 导出，以及浏览器预览的功能与布局检查。原生安装、真实安全区域、Android 系统返回键、原生浏览器跳转和系统字体缩放仍需设备验收，不能从浏览器结果推断已经通过。

## Web 部署路径

仓库根目录执行 `npm run build`，产物改为 `apps/web/dist/`。迁移分支上线时，应同步修改 Cloudflare 的产物目录；无需为 Mobile 部署另一份 Astro，也不要把 Expo 导出目录作为官网产物。本次没有修改现有线上配置。
