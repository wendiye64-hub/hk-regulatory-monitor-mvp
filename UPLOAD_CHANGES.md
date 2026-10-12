# 前端上传变更清单

目录：`hk-regulatory-monitor-mvp`；真实克隆，main，origin 为已有公开仓库。没有覆盖/重新克隆或合并旁边目录，因而没有跨目录迁移清单。本文件覆盖目前全部本机未提交改动（包括此前已经验收的集成、总结与 Monitor 修改）。

只由你在 GitHub Desktop 提交和推送。Push 前重新 Fetch/Pull，尤其注意机器人会更新 `public/data/latest-run.json`。同一个文件含多个功能改动时整文件归到下列组，不必逐行拆分。也可将全部变更作为一个整体提交 `Add protected live research and verified notice summaries`。

dist/ 原本已被 Git 跟踪：5 个旧文件已停止跟踪并在 index 显示删除，本机文件保留；今后 Actions 每次构建生成新的 dist 并上传 Pages artifact，不写回 Git。除这 5 个删除外我未 staging、commit 或 push。

GitHub Actions 需要你手动添加公开变量 `VITE_RESEARCH_GATEWAY_URL`。gateway 模式由 workflow 固定；空地址保持研究锁定。Secret/口令全部在私有后端和 Cloudflare。

## Pages 配置、忽略规则与说明

公开 Worker 地址由 Actions Variables 注入；dist 删除仅停止跟踪，本机产物保留。

建议提交信息：`Configure Pages research gateway and stop tracking build artifacts`

- `.env.example`
- `.github/workflows/monitor-and-deploy.yml`
- `.gitignore`
- `README.md`
- `UPLOAD_CHANGES.md`
- `dist/assets/index-BmctrwPA.css`（停止跟踪）
- `dist/assets/index-Mw9JhXTC.js`（停止跟踪）
- `dist/data/hk-update-source-catalog.json`（停止跟踪）
- `dist/data/latest-run.json`（停止跟踪）
- `dist/index.html`（停止跟踪）

## 本机双仓库启动

包含 Windows 与 macOS/Linux 启动、独立依赖安装和本机 .env 读取。

建议提交信息：`Add local Evidence API and Pages launch scripts`

- `scripts/run_local.py`
- `scripts/start-local.ps1`
- `scripts/start-local.sh`

## Monitor 正文与摘要

HTML/PDF 正文、抽取式结构化总结、AI 引用校验、有限手动 backfill、兼容旧数据。

建议提交信息：`Enrich official notices with verified HTML and PDF excerpts`

- `package-lock.json`
- `package.json`
- `public/data/latest-run.json`
- `scripts/lib/enrichment.mjs`
- `scripts/lib/http.mjs`
- `scripts/lib/source-text.mjs`
- `scripts/lib/triage.mjs`
- `scripts/monitor.mjs`
- `scripts/verify-monitor-samples.mjs`
- `src/components/dashboard/DetailDrawer.vue`
- `src/components/views/NewsFeedView.vue`
- `tests/fixtures/hkex-margin-rates.pdf`
- `tests/fixtures/hkma-press-release.html`
- `tests/monitor.test.mjs`

## Copilot 研究、证据与口令

含实时任务、签名令牌、阶段与等待时间、完整证据面板、跨辖区总结、CSV；跨功能文件整文件提交。

建议提交信息：`Connect evidence research with passphrase access and deterministic summaries`

- `docs/copilot-synthesis-proposal.md`
- `src/components/copilot/CopilotHistoryDrawer.vue`
- `src/components/copilot/DualPaneResearchMatrix.vue`
- `src/components/copilot/RegulatoryCopilot.vue`
- `src/components/copilot/ResearchEvidenceDrawer.vue`
- `src/components/copilot/ResearchEvidencePanel.vue`
- `src/services/researchApi.ts`
- `tests/researchApi.test.mjs`

## 共享界面接入与演示身份脱敏

共享 App/types/adapters、侧栏锁定及演示角色、账号、邮箱通用化；不改写历史。

建议提交信息：`Integrate research UI and anonymize demo identities`

- `BACKEND_API_GUIDE.md`
- `src/App.vue`
- `src/components/layout/MonitorSidebar.vue`
- `src/components/layout/Navbar.vue`
- `src/components/modals/AlertHistoryModal.vue`
- `src/components/modals/AssignModal.vue`
- `src/components/views/TasksView.vue`
- `src/data/directoryData.ts`
- `src/data/matrixMockData.ts`
- `src/data/mockData.json`
- `src/services/backendAdapters.ts`
- `src/stores/directoryStore.ts`
- `src/stores/taskStore.ts`
- `src/types.ts`

## 发布前说明

当前演示身份按你的确认已改为通用角色、账号和 example.com 邮箱，包括 API 示例文档。公开 Git 历史仍有以前的演示身份，已在仓库外的扫描报告记录；本次不改写历史，也不能声称历史身份信息已消失。

现有品牌、业务示例及官方测试 HTML/PDF 保留，需由你判断是否符合公开展示范围。本次没有为了上传改掉业务流程。浏览器里静态新闻流仍显示原有全局 API 状态徽章，未把它当作本次业务修复。

实际检查：前端完整测试及类型/构建；部署后还要核对 GitHub Pages、Worker CORS 和真实模型研究。本机验证不等于云端已经部署。
