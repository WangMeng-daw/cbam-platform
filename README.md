# 铝型材 CBAM 排放盘查与核算平台

全流程盘查、实际值/默认值对比、版本锁定报告、因子库/CMS/权限/审计后台。

## 公开访问与 GitHub

GitHub Pages 使用 `main` 分支的 `/docs` 目录作为公开入口，跳转至完整应用。GitHub Pages 本身不运行 API 和数据库；应用托管在 Sites / Cloudflare Workers，使用 D1 保存加密业务记录。入口地址：https://WangMeng-daw.github.io/cbam-platform/ 。

GitHub 保存发布时的应用源码，不包含历史企业数据、环境变量、密钥和本地数据库。更新源码后须单独发布 Sites 版本；仅推送 GitHub 不会自动更新后端。

公开访问无需注册、登录或初始化管理员。所有访客均可核算、导出，并在同意保存后查看自己的记录；访客之间的数据相互隔离。页面不再显示管理入口，`/admin` 返回首页。服务器继续使用 `DATA_ENCRYPTION_KEY` 加密保存记录，内部管理 API 保留权限校验。

## 本地运行

需要Node.js 22.13+。执行npm ci，生成本地.dev.vars中的DATA_ENCRYPTION_KEY（32字节随机密钥Base64；不要提交）。npm run build，然后应用drizzle/0000_serious_wiccan.sql到本地DB。npm run dev启动开发版；npm start启动编译版，支持-- --port 5174。本地编译预览把配置和密钥副本放入被忽略的.wrangler/preview，发布包不包含这些文件。

数据库迁移命令：
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_serious_wiccan.sql
```

## 主要目录

- app/platform.tsx / controls.tsx：分步盘查、明细与报告、行情、咨询。
- app/admin/panel.tsx：参数、价格、规则、CMS、记录、模板、角色和审计。
- app/api/：服务端校验、核算、加密记录、配置和导出。
- lib/engine.mjs：纯函数核算引擎；lib/config.json：初始来源参数。
- lib/server.ts：D1访问、AES-GCM、角色和同源校验。
- lib/files.mjs：PDF及XLSX生成/读取；drizzle/：版本化数据库迁移。
- scripts/verify-engine.mjs：40项公式/边界测试；verify-api.mjs：本地开发身份测试及API回归；verify-performance.mjs：本地编译版500并发测试。

## 运行检查

```sh
node node_modules/typescript/bin/tsc --noEmit
npm test
node scripts/verify-api.mjs
# 编译预览默认5174
node scripts/verify-performance.mjs
```

## 发布与运维

使用Sites源仓库同步与打包部署，保留.openai/hosting.json项目ID。D1绑定DB，生产DATA_ENCRYPTION_KEY在Sites环境变量中配置。网站已设为公开访问，使用核算功能无需账户。登录凭据由统一身份提供方管理；代码不存储密码。业务数据AES-GCM加密，修改密钥前必须迁移历史密文。保存配置会留下版本快照，已保存报告使用原始参数版本。

## 核算口径与限制

SEE=(直接排放+前体排放)/合格产品产量。外购原铝的PFC随前体计入；整品官方默认值不重复叠加前体/PFC。2026CBAM价按季度发布，不等于EUA最新行情。未公布价格仅输出排放，或显式标记情景成本。证据和缺口透明列示，不能代替独立核查。电网默认因子须配置适用的官方数据。密码管理采用统一身份，旧浏览器/移动实机及公网负载验收未宣称完成。完整交付与验收说明见随源码交付的HTML文档。
