# Mobile 动画性能修正

日期：2026-10-25。工作目录 `E:\bigshoot\qntx.ui`，分支 `mobile`。

## 反馈与定位

用户在 Redmi K50 系列、天玑 8100、12GB RAM、Android 14 / HyperOS 2.0.10.0.ULNCNXM 的 Expo Go 中反馈：五秒待机、滚动退为背景及归位时掉帧。没有从该设备直接采集 profile，不能单凭硬件或开发模式判定全部原因。

已确认的实现热点：

1. 绘制提交约 30fps，实际轮廓计算却在每个 requestAnimationFrame 中进行，高刷新率下存在更多无用采样。
2. 每帧重复生成约 2,400 个三维点、重复旋转三角函数，再执行点 → SVG 字符串 → 解析点 → 最终 SVG 字符串的往返。
3. 原生 SVG 每帧 setState，产生 React 协调和属性提取；触摸每次取消 / 创建计时器，滚动每次调用场景状态更新。
4. 形变对齐为所有循环顺序和正反方向分配临时数组。

## 修改

- `apps/mobile/src/animation/playback.ts`：提取已有控制器，先限频再采样；用截止时间维护五秒待机，保留连续输入期间完成退出过渡、叙事不被输入打断及后台暂停。
- `apps/mobile/src/components/Mascot.tsx`：Android/iOS 使用现有 SVG 引用的 setNativeProps，只发送变化的路径；Web 辅助预览保留 React 状态更新。
- `apps/mobile/src/App.tsx`：稳定原生滚动事件映射，仅在场景改变时通知 React；原生 driver、布局与滚动阈值保持原样。
- `packages/mascot/src/vendor/logo-catalog.{js,d.ts}`：增加 Mobile 使用的 directGeometry 选择，缓存模型点并预计算旋转，直接传递与原管线相同精度的点。默认 Web 分支保留。
- `packages/mascot/src/morph.ts`：不为被淘汰的候选顺序分配数组，提前停止高代价比较，保留最优对齐结果。
- `tools/test-mobile-animation.mts`、Mobile Nx 目标和根脚本：增加可重复的无第三方依赖性能回归。
- README / `docs/mobile.md`：补充原因、限制及关闭开发模式的复测命令。

没有降低轮廓点数或坐标精度，没有更换动作 / 播放规则，没有新增第三方依赖。桌面与窄屏 Astro 的页面、样式、控制器未修改；共享形变函数只优化计算方式。

## 基准范围

本机 Windows / Node 24 对同一 60 秒目录时间序列采样 1,800 帧：原采样耗时中位约 2.02ms、P95 3.14ms；directGeometry 中位约 0.84ms、P95 1.26ms。默认分支与修改前几何差异为 0，directGeometry 与修改前差异也为 0（最大逐点欧氏距离）。

该测量不包含手机 Hermes、原生 SVG 更新 / 绘制、React 开发模式或热量等因素，不能宣称同等百分比的真机 FPS 改善。优化前源码副本位于忽略上传的 `artifacts/mobile-performance-20261025/`。

## 验证结果

- `npx oxlint` 零 error；修改文件的 Oxfmt 检查通过。
- 五个 Nx 项目的类型检查、依赖边界检查通过。
- 动画专项 7 项通过：一分钟完整目录几何一致性，60/90/120Hz 下的计算预算，五秒计时 / 连续输入 / 叙事 / 归位，后台 / 减少动态效果，以及轮廓起点对齐。
- Mobile 浏览器辅助预览 9 项通过；调整截止时间实现后，另外复跑真实五秒待机、连续移动收回和归位再待机用例通过。
- Web 回归 20 项全部通过，覆盖桌面叙事、窄屏原三面板与独立 Logo。
- Android / iOS Hermes 与 Web 导出通过。开发脚本的参数转发由 `npm run dev:mobile -- --help` 验证，Expo 识别 `--no-dev` / `--minify`。

以上不包含真机帧率测量，也未将浏览器或 Node 基准当成真机验收。

## 真机复测

先停止现有 Metro，执行 `npm run dev:mobile -- --no-dev --minify`，重新扫码 / 重开项目，再分别复测开场五秒、滚动、归位五秒。对比开发模式时采用相同路径，关闭正在录制的分析器 / 元素检查器。若仍有问题，分开观察 JS 与 UI 帧率后再进行有针对性的原生 profile。

没有连接真机或生成 / 发布原生安装包。轮廓仍为约 30fps 的 JS 动画；原生位移 / 透明度使用独立的 native driver。
