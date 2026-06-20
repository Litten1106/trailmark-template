# Itinerary 数据模型

行程数据定义在 `src/data/types.ts`，运行时入口为 `src/data/itinerary.ts`。

## 顶层结构

```typescript
interface Itinerary {
  title: string;
  subtitle?: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  pois: Poi[];
  days: DayPlan[];
  metadata?: { tips?: { title: string; body: string }[] };
}
```

## POI 字段

| 字段 | 必需 | 说明 |
|------|------|------|
| `id` | 是 | kebab-case 唯一标识 |
| `name` | 是 | 中文或本地名称 |
| `nameEn` | 否 | 英文名称 |
| `category` | 是 | `sight` / `food` / `lodging` / `drive` / `experience` / `transit` |
| `location` | 否 | `[lng, lat]`，地图需要 |
| `lodging` | 否 | 写在 DayPlan 上，仅区域描述 |
| `address` | 否 | 建议省略或只写到区/镇 |
| `notes` | 否 | 自由文本介绍 |
| `plannedAt` | 否 | `HH:mm` |
| `durationMin` | 否 | 停留分钟数 |
| `photos` | 否 | 公开图 URL 或 `/public` 路径 |
| `googleQuery` | 否 | Mapbox geocode 查询串 |

## Markdown 导入格式

Agent 或用户可按下述格式提供行程，再映射为 `itinerary.ts`：

```markdown
# 我的东京之旅
subtitle: 樱花季三日游
start: 2026-04-01
end: 2026-04-03

## Day 1 · 2026-04-01 · 抵达与浅草
- [sight] 浅草寺 | Senso-ji | 09:00 | 浅草站步行5分钟
- [food] 一兰拉面 浅草店 | 12:00
lodging: 浅草站附近

## Day 2 · 2026-04-02 · 上野
- [sight] 上野公园 | Ueno Park | 09:30
lodging: 上野站步行 5 分钟
```

### 解析规则

1. `# 标题` → `itinerary.title`
2. `subtitle:` / `start:` / `end:` → 元数据行
3. `## Day N · YYYY-MM-DD · 标题` → `DayPlan`
4. `- [category] 名称 | 英文名 | 时间 | 备注` → `Poi` + 加入当天 `poiIds`
5. `lodging:` 行 → `DayPlan.lodging`（仅区域，不写门牌）

## 校验

```bash
node scripts/validate-itinerary.mjs
```

## 隐私

- 不要把 `.env.local`、飞书凭证、精确住址提交到 git
- 住宿默认只写 `lodging` 区域级描述
