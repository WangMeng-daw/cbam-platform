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

## 2026 年 11 月界面与公式更新

左侧导航包含企业管理、产品碳足迹计算、第三方因子接入、碳价行情和系统管理。产品信息位于企业管理下；生命周期模型与产品碳足迹报告位于核算模块下。企业、产品、模型和第三方燃料因子可在本地维护，系统管理支持 JSON 资料备份和恢复。第三方因子为本地录入接入，不会连接参考系统或上传资料。

默认值模式仅使用整品默认值，不填写前体。整品默认值按三位小数参与计算；免费分配 = 所选生产路线基准 × 年度 CBAM 因子；证书数 = ceil(max(0, (整品默认值 − 免费分配) × 输欧量))；成本 = 整数证书数 × 碳价。计算保留精度，界面与报告中的总排放显示整数，单位排放显示三位小数。普通因子列表显示两位小数，并提供完整精度供核对。

可在首页载入文档案例：CN 76041010、中国、原铝、2026 Q2、1,000 吨、情景碳价 73.43 欧元。结果为 5,369 tCO₂e、3,922 张证书、287,992.46 欧元。案例碳价是情景输入，不会覆盖内置季度价格。

额外回归检查：node scripts/verify-browser-integration.mjs；node scripts/verify-workspace.mjs。
