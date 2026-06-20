import type { Itinerary, Poi, DayPlan } from './types';

/**
 * Example itinerary — replace with your own trip data.
 * See docs/itinerary-schema.md for field reference and Markdown import format.
 */

const pois: Poi[] = [
  {
    id: 'narita-airport',
    name: '成田国际机场',
    nameEn: 'Narita International Airport',
    category: 'transit',
    location: [140.3929, 35.772],
    coordsConfidence: 'high',
    notes:
      '抵达东京后的第一站。\n\n🚗 距离：约 60 km\n⏱️ 车程：约 1 小时\n📍 可搭乘成田特快 N\'EX 或机场大巴前往市区。',
    durationMin: 60,
    photos: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Narita_International_Airport_Terminal_1.jpg/960px-Narita_International_Airport_Terminal_1.jpg',
    ],
    googleQuery: 'Narita International Airport Japan',
  },
  {
    id: 'sensoji',
    name: '浅草寺',
    nameEn: 'Sensō-ji',
    category: 'sight',
    location: [139.7967, 35.7148],
    coordsConfidence: 'high',
    notes:
      '东京最古老的寺庙，雷门与仲见世通是必逛。\n\n⏳ 建议停留：1-2 小时\n💡 清晨人少，适合拍照。',
    plannedAt: '10:00',
    durationMin: 90,
    photos: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Sensoji_Asakusa_Tokyo_Japan.jpg/960px-Sensoji_Asakusa_Tokyo_Japan.jpg',
    ],
    googleQuery: 'Sensō-ji Tokyo',
  },
  {
    id: 'skytree',
    name: '东京晴空塔',
    nameEn: 'Tokyo Skytree',
    category: 'sight',
    location: [139.8107, 35.7101],
    coordsConfidence: 'high',
    notes: '俯瞰东京全景的经典地标，傍晚光线最佳。',
    plannedAt: '14:00',
    durationMin: 120,
    photos: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Tokyo_Skytree_2014_%28cropped%29.JPG/960px-Tokyo_Skytree_2014_%28cropped%29.JPG',
    ],
    googleQuery: 'Tokyo Skytree',
  },
  {
    id: 'ueno-park',
    name: '上野公园',
    nameEn: 'Ueno Park',
    category: 'sight',
    location: [139.7736, 35.7142],
    coordsConfidence: 'high',
    notes: '春季赏樱、秋季红叶的热门公园，周边博物馆集中。',
    plannedAt: '09:30',
    durationMin: 120,
    googleQuery: 'Ueno Park Tokyo',
  },
  {
    id: 'meiji-shrine',
    name: '明治神宫',
    nameEn: 'Meiji Shrine',
    category: 'sight',
    location: [139.6993, 35.6764],
    coordsConfidence: 'high',
    notes: '都市中的静谧森林神社，适合慢走放松。',
    plannedAt: '11:00',
    durationMin: 90,
    photos: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Meiji_Shrine_Torii.jpg/960px-Meiji_Shrine_Torii.jpg',
    ],
    googleQuery: 'Meiji Shrine Tokyo',
  },
  {
    id: 'shibuya-crossing',
    name: '涩谷十字路口',
    nameEn: 'Shibuya Crossing',
    category: 'sight',
    location: [139.7006, 35.6595],
    coordsConfidence: 'high',
    notes: '世界最繁忙的十字路口之一，傍晚华灯初上最壮观。',
    plannedAt: '18:00',
    durationMin: 60,
    googleQuery: 'Shibuya Crossing Tokyo',
  },
];

const days: DayPlan[] = [
  {
    day: 1,
    date: '2026-04-01',
    title: '抵达与浅草',
    summary: '机场入境 · 浅草寺 · 晴空塔',
    drivingKm: 0,
    lodging: '浅草站附近',
    poiIds: ['narita-airport', 'sensoji', 'skytree'],
    photos: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Sensoji_Asakusa_Tokyo_Japan.jpg/960px-Sensoji_Asakusa_Tokyo_Japan.jpg',
    ],
  },
  {
    day: 2,
    date: '2026-04-02',
    title: '上野与文化',
    summary: '上野公园漫步 · 博物馆街区',
    lodging: '上野站步行 5 分钟',
    poiIds: ['ueno-park'],
  },
  {
    day: 3,
    date: '2026-04-03',
    title: '原宿与涩谷',
    summary: '明治神宫 · 涩谷夜景',
    lodging: '涩谷站周边',
    poiIds: ['meiji-shrine', 'shibuya-crossing'],
  },
];

export const itinerary: Itinerary = {
  title: '示例 · 东京三日',
  subtitle: '把已有行程变成可随身携带的路书',
  startDate: '2026-04-01',
  endDate: '2026-04-03',
  pois,
  days,
  metadata: {
    tips: [
      {
        title: '关于本示例',
        body: '这是 Trailmark 模板自带的虚构行程。请用你自己的 Markdown / 飞书 / Notion 行程替换 src/data/itinerary.ts。',
      },
    ],
  },
};
