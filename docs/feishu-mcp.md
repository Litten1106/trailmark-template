# 飞书 MCP 接入说明

用于从飞书 Wiki 行程单同步内容到 `src/data/itinerary.ts`。

Wiki 节点：将 `YOUR_WIKI_NODE_ID` 替换为你的文档节点 ID。

## 1. 创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app) → 创建企业自建应用。
2. 在 **权限** 中开通：
   - `wiki:wiki` 或 `wiki:wiki:readonly`（知识库）
   - `docx:document`（若文档为新版文档）
3. 复制 **App ID**、**App Secret**（仅保存在本机环境变量，勿提交 git）。

## 2. 配置 MCP

在系统环境变量或 Agent 的 MCP 设置中配置：

```bash
export FEISHU_APP_ID=cli_xxxx
export FEISHU_APP_SECRET=xxxx
```

首次使用建议在本机终端执行 OAuth：

```bash
npx -y @larksuiteoapi/lark-mcp login -a "$FEISHU_APP_ID" -s "$FEISHU_APP_SECRET"
```

然后在你的 Agent 中启用 `lark-mcp` 并重启。

官方文档：<https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_installation>

## 3. 从 Wiki 拉取并写入坐标

配置 MCP 后，对 Agent 说：

> 用 lark-mcp 读取 Wiki 节点 `YOUR_WIKI_NODE_ID` 的全文，解析其中的 Google Maps 链接与坐标，运行 `node scripts/apply-source-coords.mjs data/source-export.md` 更新 itinerary。

也可手动导出 Wiki 为 Markdown，保存为 `data/source-export.md`，再执行：

```bash
node scripts/apply-source-coords.mjs data/source-export.md
```

## 4. 无 MCP 时的备选

- 手动导出 Markdown，按 [itinerary-schema.md](./itinerary-schema.md) 整理后写入 `itinerary.ts`
- 有 Mapbox token 时：`node scripts/geocode-pois.mjs [--country=XX]`

## 隐私

- 不要把 App Secret、`.env.local` 提交到 git
- 住宿地址建议只保留区域级描述，避免精确门牌号
