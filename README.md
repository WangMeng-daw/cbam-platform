# 铝型材 CBAM 碳核算平台

公开地址：https://wangmeng-daw.github.io/cbam-platform/

完整核算页面直接托管在 GitHub Pages，不跳转其他平台，不需要登录或管理员。核算引擎、参数、PDF 和 Excel 报告生成均在浏览器运行。所有代码、字体样式和脚本均随网站发布，无需第三方 CDN。

## 数据保存

勾选保存后，草稿和核算记录保存在当前浏览器的本地存储。清除网站数据或更换浏览器、设备后不会保留或自动同步。原在线版本的记录不会自动转入。记录存储失败会明确报错，不影响不保存的即时核算与导出。报告使用记录保存时的参数快照。

## 构建与发布

需要 Node.js 22.13+，执行 npm ci、npm run build。GitHub Pages 使用 main 分支的 /docs 目录，提交构建后的 docs 后自动发布。npm run dev 启动本地静态开发服务器。

入口 browser/main.tsx；交互 app/platform.tsx；本地存储 browser/storage.mjs；报告 browser/report.ts 与 browser/files.mjs；核算引擎 lib/engine.mjs。

测试：npm test；node scripts/verify-browser-storage.mjs；node scripts/verify-browser-reports.mjs。

旧服务端源码保留用于历史参考，不会打包到公开页面，网站不会请求旧服务端。
