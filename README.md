# RegWatch HK

Vue 3 regulatory intelligence workspace backed by the existing Hong Kong official-source monitoring pipeline. The application provides News Feed, Regulator, and Tasks workspaces while remaining deployable as a static GitHub or GitLab Pages site.

## 公开 Pages：口令实时研究

新闻流保持公开。Copilot 经 Cloudflare Worker → Tunnel → Mac API：输入有效访问口令后取得最长 8 小时的签名令牌，只存当前 sessionStorage；口令不保存。浏览器不接触后端 API Key。Worker 与完整运维说明放在独立私有 Evidence 仓库的 `gateway/README.md`。

GitHub 网页进入本仓库 Settings → Secrets and variables → Actions → Variables → New repository variable，添加 **`VITE_RESEARCH_GATEWAY_URL`**，值为 Worker 的公开 HTTPS 地址，例如 `https://regwatch-research-gateway.<账户子域>.workers.dev`。不要填写 Tunnel 地址、Key、口令或令牌。workflow 强制 `VITE_RESEARCH_ACCESS_MODE=gateway`；地址缺失时研究锁定，不会显示演示答案。旧 `VITE_RESEARCH_API_URL` 不再用于 Pages 构建。

GitHub Desktop 操作与分组提交见 [上传变更清单](UPLOAD_CHANGES.md)。Pages Source 选 GitHub Actions，再手动运行 **Monitor Hong Kong regulations and deploy**。构建读取上述公开变量；`dist/` 只作为 Pages artifact，不再入库。公开页面不能用 localStorage 连接覆盖来绕过 Worker；本机直接开发模式仍可使用。

开启后可查看此口令当天用量、全局运行数，或关闭本次访问。研究格子显示排队、研究中、完成、失败和已等待时间；令牌过期/停用、研究暂停、额度耗尽、后端/Tunnel 离线分别显示具体错误。刷新后凭本口令的任务 ID 恢复查询（网关保留 24 小时归属）；机器通过仍是待人工复核。不会在错误时回退到假答案。

## Evidence API 本机集成

Pages Vue 应用是唯一 UI。Evidence 保持独立目录、Python 依赖和任务数据库，通过 HTTP 接入；不合并仓库，不使用旧 Evidence React 前端，本阶段不连接内部数据库。

### 准备目录与模型

安装 Node.js 22.13+ LTS（或 Node.js 24+）、Python 3.11+ 和 [uv](https://docs.astral.sh/uv/getting-started/installation/)。保留两个目录并列：

```text
任意工作目录/
├── hk-regulatory-monitor-mvp/              # 本仓库
└── regulatory-evidence-mvp-v0.11.0/         # 独立 Evidence 后端
```

复制后端 `.env.example` 为 `.env`，编辑模型和安全配置。启动脚本在文件不存在时也会创建它。前端 `.env` 是可选的；本机启动脚本默认构建为 `http://127.0.0.1:8000`。模型密钥只放后端 `.env`；本机直接开发的 API 访问 Key 可输入当前浏览器会话，公开 Pages 只输入口令。密钥不能写入 `VITE_*`、GitHub 仓库变量或静态构建产物。

默认模型不变：`REGULATORY_PROVIDER=ollama`、`OLLAMA_MODEL=qwen3:4b`、`OLLAMA_BASE_URL=http://127.0.0.1:11434`。先打开 Ollama 应用，或在另一个终端执行 `ollama serve`，然后执行 `ollama pull qwen3:4b`。无需 OpenAI Key。参见 [Ollama 文档](https://docs.ollama.com/quickstart)。

使用 OpenAI 时，只改后端 `.env`：

```dotenv
REGULATORY_PROVIDER=openai
OPENAI_API_KEY=填写你自己的密钥
OPENAI_MODEL=填写账户可用且支持结构化输出的模型名称
OPENAI_BASE_URL=https://api.openai.com/v1
# 官方来源访问编排默认保持 deterministic；如要使用现有 OpenAI 适配器：
# REGULATORY_ACCESS_PROVIDER=openai
# OPENAI_ACCESS_MODEL=可选，空时沿用 OPENAI_MODEL
```

本次不增加 Claude。`OPENAI_API_KEY` 是模型密钥；`REGULATORY_API_KEY` 是保护 Evidence API 的独立访问密钥，两者不可混用。

### A：本机前端连接本机后端（推荐）

macOS / Linux，在本仓库执行：

```bash
./scripts/start-local.sh
# 依赖已经安装后可省略 npm ci；仍然重新构建前端：
# ./scripts/start-local.sh --skip-setup
```

Windows PowerShell：

```powershell
.\scripts\start-local.ps1
# 如果当前 PowerShell 策略不允许运行本地脚本：
# powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
# 已安装依赖：.\scripts\start-local.ps1 -SkipSetup
```

脚本用后端自己的锁文件安装 Python 依赖、安装前端 npm 锁文件中的依赖、读取后端 `.env`、构建 Vue、启动单个 Uvicorn API 进程和 Vite 本地预览。打开 **http://127.0.0.1:3000** → 侧栏 **Regulatory Copilot**。Ctrl+C 会停止本次脚本启动的服务。默认端口冲突时明确报错，不会悄悄换端口。

如果目录不并列，macOS/Linux 使用 `REGULATORY_BACKEND_DIR=/绝对路径 ./scripts/start-local.sh`；PowerShell 使用 `-BackendDir '后端完整路径'`。也可从后端运行 `run_local.sh` / `run_local.ps1`，通过 `REGWATCH_FRONTEND_DIR` / `-FrontendDir` 指定前端目录。

后端 `.env` 中 `REGULATORY_CORS_ORIGINS` 应包含 `http://127.0.0.1:3000`。启动脚本绑定 loopback，不需要公司内网或云服务器。修改端口时调整 `REGULATORY_API_PORT`、`REGWATCH_FRONTEND_PORT` 及对应 CORS origin。前端独立 `.env` 若配置了 `VITE_RESEARCH_API_URL`，启动构建会使用它；页面中保存的连接地址优先级更高。

在 Copilot 展开“研究连接”，核对后端地址，输入后端启用的 API Key，填写真实的研究对象（例如 `Hong Kong licensed banks` 或 `Companies incorporated in Hong Kong`），点击“保存连接”。Key 保存在当前浏览器 `sessionStorage`，关闭会话后重新输入；后端地址保存在 `localStorage`。

点击 **New Matrix Setup**，填入问题、选择辖区、运行。每个问题与辖区组合拥有独立任务 ID。建议首次仅研究一个香港问题。每个格子可打开“完整证据”，右侧 Evidence Pack 同时展示原文、官方链接、获取时间、`content_hash`、校验、证据缺口和爬取错误。问题范围不明确或辖区不支持时会显示证据不足，不会编造答案。

### B：线上 Pages 页面与本机后端

当前公开部署使用 Worker 口令链路，Pages 页面不提供本机地址或 API Key 设置。此前直接从 HTTPS Pages 访问 `127.0.0.1` 的方式仅供自行构建的开发版测试；它连接的是访问者自己的电脑，可能弹出本地网络授权提示，Safari 可能被混合内容/网络策略拦截。本机使用推荐 A。后端保留显式 CORS 和白名单 PNA 预检支持，详情见 [Chrome 官方说明](https://developer.chrome.com/blog/local-network-access)。

### C：向他人演示——Worker + Cloudflare Tunnel

不要向访客分发后端 API Key。管理员在私有后端按 `gateway/README.md` 配置随机 `REGULATORY_API_KEY`、Worker Secrets 和口令，运行公开模式后端及 Tunnel，再将公开 Worker 地址填入 Actions Variable。访客只打开 Pages 并输入访问口令。

Quick Tunnel 无需自有域名，但每次新进程会生成新的临时地址，没有可用性保证。管理员更新 Worker 的 `BACKEND_ORIGIN` 并重新部署；Worker 地址不变时前端无需重建。[Cloudflare 官方说明](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)。Mac 休眠会中断服务，保持唤醒的命令与取舍见私有后端说明。原 `--tunnel` 辅助脚本也强制公开鉴权，但不是新的口令研究部署步骤。

### 研究状态与错误

| 状态 | 页面含义 |
| --- | --- |
| 研究中 | 任务已提交或排队，尚未产生答案 |
| 已完成 · 未通过校验 | 候选答案未获独立证据校验支持 |
| 证据不足 | 缺少直接证据，或问题规划需要澄清 |
| 待人工复核 | 机器校验通过，仍不是正式结论 |
| 研究失败 | 网络、超时、Key、限流或后端任务错误；可重试 |

`yes` / `no` 回答具体问题，不表示合规或违规；只有 `conditional` 对应有条件状态，其余用中性标识。证据按直接依据、间接说明展示，不显示人为相关度百分比。真实模式关闭演示跨辖区总结与演示追问。人工复核流程、新闻流联动留到后续阶段。

POST 请求默认超时 20 秒，总轮询等待 8 分钟；超时会保留任务 ID（任务可能继续在后端运行）；刷新页面后可在“研究连接”中填写任务 ID 并点击“查看任务”，重新载入持久化结果。后端不可用或 Key 无效时只显示错误，没有演示答案回退。本机直接模式下，未设置 `VITE_RESEARCH_API_URL` 且未保存浏览器连接地址时保留演示矩阵；同时须清空 Gateway URL/模式。公开 Pages 始终使用口令网关，缺配置也不会进入演示模式。

### 限流、审计与验证

后端默认共享额度为每 60 秒 60 次昂贵请求（研究提交、来源发现、任务恢复）；耗尽返回 `429` 和 `Retry-After`。Key 验证先于限流；轮询与证据读取不扣额度。只运行一个 Uvicorn HTTP 进程，`REGULATORY_API_WORKERS` 控制研究线程数。该基础限流是单机内存预算，重启会重置。

`REGULATORY_JOB_DB` 默认是后端 `outputs/research_jobs.db`。每次任务保存问题、状态、错误、完整结果和来源；`research_job_events` 记录 `research_audit_started` / `research_audit_completed` / `research_audit_failed`，包含来源、答案、校验和证据缺口。不连接内部数据库。API 运行日志位于 `outputs/regwatch-api.log`。本机 `.env`、输出、数据库及密钥均已忽略。

```bash
# 前端仓库
npx vue-tsc -b && npx vite build
node --test tests/researchApi.test.mjs
# 后端目录
uv run --locked python -m unittest tests.test_api_and_discovery
```

可用 `GET http://127.0.0.1:8000/health` 检查进程，但它不保证模型/官方来源可用。Key 开启时，`/v1/research`、任务状态及证据接口都需要 `X-API-Key`。`REGULATORY_CORS_ORIGINS` 为空时关闭 CORS；白名单不接受 `*`。后端 `/` 不再提供 React UI。

### 以后上云要补的事

本阶段不增加生产 Docker 配置、HTTPS 终结或登录网关。上云前补齐用户认证与按任务授权、HTTPS / 登录网关、集中式限流、任务额度与队列上限、生产密钥管理、审计保留与脱敏策略、持久化备份、监控告警及恢复流程。当前网关提供按口令的任务访问隔离，口令仍是共享访问凭据；正式上云需要完整用户身份与授权。

## Local development

```bash
npm ci
npm run dev
```

The frontend reads the checked-in crawler artifacts from `public/data/` by default. A separate API server is optional. Set `VITE_DATA_MODE=api` for an API-backed deployment, or `VITE_DATA_MODE=hybrid` to prefer the API and fall back to the bundled crawler artifacts.

To build and serve the production bundle:

```bash
npm run build
node server.mjs
```

## Automation

The pipeline checks HKMA Press Releases, Circulars, Guidelines, Supervisory Policy Manual documents, Consultations, Guide to Authorization and Codes of Practice, plus HKEX Regulatory Announcements, Corporate News, Market Communications, Market Consultations, Participant and Members Circulars, Market Data Client Notices, and Hosting Subscriber Notices. It updates `public/data/latest-run.json`, builds the Vue frontend, and publishes `dist` through Pages every six hours.

Collectors are registered in `scripts/source-registry.mjs`. Authority-specific parsers live under `scripts/lib/collectors/`; adding a source no longer requires changing the orchestration in `scripts/monitor.mjs`. Collection runs concurrently, the six HKMA regulatory categories share one repository request, new-item triage is concurrency-limited, and individual source failures are isolated in `source_runs`.

If the repository secret `OPENAI_API_KEY` is available, new releases receive evidence-constrained AI triage. Without that secret, the collector still runs and uses a conservative deterministic classification with human review required.

## GitLab configuration

The project runs without AI credentials by using conservative deterministic triage. For evidence-constrained AI triage, add masked CI/CD variables named `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` in GitLab.

## Data integration

- `public/data/latest-run.json` supplies live regulations and priority alerts.
- `public/data/hk-update-source-catalog.json` supplies the regulator directory.
- Latest `source_runs` telemetry is merged into the catalog so the 14 validated HKEX/HKMA collectors show their current health.
- `static` mode reads the bundled crawler artifacts and then the demo dataset.
- `api` mode reads the configured REST API and then the demo dataset.
- `hybrid` mode reads the REST API first, then the bundled crawler artifacts, then the demo dataset.

## Monitor 正文、摘录和历史补全

采集列表只用来发现公告，标题不再当作正文。HKMA/HKEX HTML 用 Cheerio 优先取正文容器，排除导航、相关公告、页脚；PDF 用锁定在 package-lock 的 `pdfjs-dist` 文本层抽取，GitHub Actions 的 Node 22 无需安装系统 Poppler。扫描 PDF、损坏文件、无法访问或只有 JavaScript 外壳的页面标为 `text_extraction: failed`，不把标题、二进制或乱码充作证据；本轮达到抓取上限的条目标为 `not_attempted`。失败原因在详情抽屉显示。

新字段为 `source_excerpt`（最多 1500 字符，不保存全文）、`source_text_chars`、`source_text_url`、`text_extraction`、`text_extraction_error`、`summary_method`、`key_points`、`key_dates`、`affected_parties`。短公告不会为凑够 600 字符而重复或编造内容。PDF/HTML 的空白统一后，所有摘录仍逐字来自官方正文。要点与日期也可以在官方全文中核对；摘录长度上限不意味着全文只到这里。

未设置 `OPENAI_API_KEY` 时，生成抽取式预览：发布方、标题片段、正文片段，通常 80–150 字符；2–5 条原文要点；仅识别明确写出的生效日、截止日、咨询期，以及明确收件人/适用对象。正文过短时不会编造要点。识别器保守，空数组表示未抽取到，不证明原文没有这些信息，详情请核对官方链接。发布日期不再冒充生效日；也不生成猜测的业务部门或影响。`human_review_required` 始终为 true。

有 AI Key 时，模型只选择原文片段，summary 为 80–150 字符，key_points 为 2–5 个逐字片段；不翻译或新增事实。summary、evidence、key_points 必须逐字匹配正文，日期须匹配原文和相应生效/截止/咨询语境，适用对象须匹配明确对象抽取结果。空证据、编造内容、超时等均退回抽取式版本。Key 仅配置到 Actions Secret 或当前终端环境，不放进任何 `VITE_*`。这次真实公告演示全程未使用模型。

Actions → **Monitor Hong Kong regulations and deploy** → Run workflow，勾选 `backfill`，设置 `backfill_limit`（默认 10，最多 20）。补全只处理总结短于 80 字符、旧模板总结或明确 title_only 的旧条目；成功才替换，抓取/正文抽取失败的条目逐字段保留原样，失败 URL 和原因记录在根节点 `backfill.errors`，详情抽屉显示“本次补全失败，保留旧数据”。它不重新运行全部列表采集器。完整长总结不会被覆盖。

macOS/Linux 手动运行：

```sh
BACKFILL=true BACKFILL_LIMIT=10 SYNC_DIST=false node scripts/monitor.mjs
```

Windows PowerShell：

```powershell
$env:BACKFILL = 'true'
$env:BACKFILL_LIMIT = '10'
$env:SYNC_DIST = 'false'
node scripts/monitor.mjs
```

可选 `BACKFILL_URLS` 为逗号分隔的现有官方 URL，用于只重试指定短条目。普通定时运行每次最多抓取 12 个新公告或排队公告正文（`MAX_ENRICH_ITEMS`，硬上限 20），并发默认 4、最大 4（`TRIAGE_CONCURRENCY`）。先按发布日期选出将发布的最新 120 条，再按新到旧分配正文抽取额度，避免较旧、不会在页面展示的公告占满额度。`not_attempted` 条目会在后续定时运行自动处理，即使已从来源列表消失，只要仍在这 120 条中也会保留在队列。根节点 `enrichment` 和 Actions 日志记录本轮尝试、成功、失败和仍在排队的数量。旧失败条目可手动补全。HTML/PDF 下载超时 10 秒、大小上限 12 MB；PDF 解析上限 15 秒、200 页；AI 每次上限 20 秒。人工判断不了扫描 PDF 时需另做 OCR，本次未加入。

三条真实公告复核（1 PDF、2 HTML）：

```sh
node scripts/verify-monitor-samples.mjs
# 如需同步刷新这三个演示条目（普通 BACKFILL 仍不覆盖完整长总结）：
node scripts/verify-monitor-samples.mjs --update-samples
npm test
npx vue-tsc -b && npx vite build
```

演示脚本明确关闭模型调用，逐字核对全部要点、日期语境和摘录，结果写入工作区 `deliverables/monitor-samples/verified-announcements.json`，含官方 URL、下载 SHA-256 和完整复核文本。测试使用两份官方 HTML/PDF 样本离线验证抽取；HTTP 客户端测试只监听回环地址。

120 条旧数据原约 110 KiB。摘录最多约 176 KiB（英语单字节）/527 KiB（中文三字节），另加要点、日期等字段，通常总计约 0.4–0.9 MiB。每条字段数量和长度均受限，不存全文；120 条规模继续用单个 JSON，便于 Pages 单次加载，无需额外请求 120 个文件。真实三条样本的大小与耗时见工作区验收记录；这只是估算，不是所有公告的大小上限。

正文抓取新增耗时通常数秒到几十秒；无新条目的正常定时运行不会额外抓正文。默认 12 条、并发 4，下载/解析全部耗尽超时时保守上限约 75 秒（3 批 × 25 秒），AI 全部耗尽超时再加约 60 秒。手动补全 10 条通常数秒到几十秒，不增加每 6 小时定时任务的固定开销；实际网络/大文件差异可能较大。依赖安装增加两个解析库，测试运行不到数秒，Actions 缓存 npm。

Copilot 总结现在按同一问题全部辖区终态确定性回填，进行中显示“等待全部辖区完成”，错误和未校验结论明确列出，CSV Macro Synthesis 一并导出。模型综合只提供[接口方案](docs/copilot-synthesis-proposal.md)，本次未实现。
