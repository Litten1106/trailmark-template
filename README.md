# Trailmark Template

把已有旅行行程变成可随身携带、可部署的 H5 路书。React + TypeScript + Rsbuild + Tailwind + Mapbox GL JS。

配套 Agent Skill **trailmark** — 引导你从 Markdown / 飞书 / Notion 导入行程、补全坐标、部署到 Vercel。

## 预览

| 首页行程总览 | 地图 + 单日行程 | POI 详情 |
|:---:|:---:|:---:|
| <img src="https://github.com/Litten1106/trailmark-template/raw/main/public/images/readme-home.png" width="220" alt="首页" /> | <img src="https://github.com/Litten1106/trailmark-template/raw/main/public/images/readme-day-map.png" width="220" alt="地图行程" /> | <img src="https://github.com/Litten1106/trailmark-template/raw/main/public/images/readme-poi-detail.png" width="220" alt="POI 详情" /> |

## 快速开始

```bash
npx degit Litten1106/trailmark-template my-trip
cd my-trip
pnpm install
cp .env.example .env.local
# 填写 PUBLIC_MAPBOX_ACCESS_TOKEN — https://account.mapbox.com/access-tokens/
pnpm dev
```

### Agent Skill

安装后，对 Agent 说：

> 用 trailmark 帮我把行程做成可部署的路书

<details>
<summary>首次安装 trailmark Skill</summary>

```bash
npx skills add Litten1106/trailmark --skill trailmark -g -y
```

</details>

## 技术栈

- React 19 + TypeScript
- Rsbuild 2（Rspack）
- Tailwind CSS 4
- React Router 7
- Mapbox GL JS

## 行程数据

所有行程在 [`src/data/itinerary.ts`](src/data/itinerary.ts)。模板自带**虚构**的东京 3 日示例，请替换为你自己的行程。

数据模型与 Markdown 导入格式见 [`docs/itinerary-schema.md`](docs/itinerary-schema.md)。

## 脚本

| 命令 | 说明 |
|------|------|
| `node scripts/validate-itinerary.mjs` | 检查行程缺失字段 |
| `node scripts/geocode-pois.mjs` | Mapbox 地理编码补全坐标 |
| `node scripts/apply-source-coords.mjs <file.md>` | 从导出 Markdown 提取坐标 |
| `node scripts/sanitize-check.mjs` | 发布前脱敏扫描 |
| `pnpm dev` | 本地开发 |
| `pnpm build` | 生产构建 |

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox 公开 token | 是 |
| `PUBLIC_MAPBOX_STYLE` | 自定义 style URL | 否 |

## Vercel 部署

1. Push 到 GitHub
2. Vercel Import → Framework: **Other**
3. 添加环境变量 `PUBLIC_MAPBOX_ACCESS_TOKEN`
4. Deploy

`vercel.json` 已配置 SPA rewrites。

## 隐私提示

- 不要把 `.env.local`、飞书凭证提交到 git
- 住宿建议只写区域级 `lodging`，避免精确门牌号
- 发布前运行 `node scripts/sanitize-check.mjs`

## License

MIT
