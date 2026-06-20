import { Link, useParams } from 'react-router-dom';
import { googleMapsUrl } from '../data/types';
import { itinerary } from '../data/itinerary';

/* ═══════════════════════════════════════════
   POI Detail — Immersive + Travel Guide
   ═══════════════════════════════════════════ */

const categoryMeta: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  sight: { label: '景点', color: '#5b8ba8', icon: '📸' },
  food: { label: '就餐', color: '#b8836a', icon: '🍽' },
  lodging: { label: '住宿', color: '#7a7aaa', icon: '🏨' },
  drive: { label: '驾驶', color: '#5a9a7a', icon: '🚗' },
  experience: { label: '体验', color: '#9a7aaa', icon: '🎯' },
  transit: { label: '交通', color: '#999', icon: '🚌' },
};

// Guide sections for each category — food/lodging/transport/play
const GUIDE_SECTIONS = [
  {
    id: 'food',
    title: '食',
    subtitle: '周边美食',
    icon: '🍽',
    accent: '#b8836a',
    bg: '#fdf6f2',
    tips: [
      '搜索附近高评分餐厅',
      '提前查看营业时间',
      '留意当地饮食禁忌与过敏信息',
    ],
  },
  {
    id: 'lodging',
    title: '住',
    subtitle: '住宿推荐',
    icon: '🏨',
    accent: '#7a7aaa',
    bg: '#f4f3f8',
    tips: [
      '提前预订，旺季房源紧张',
      '住宿地址建议只记录到区域级别',
      '注意查看是否含早餐和停车位',
    ],
  },
  {
    id: 'transport',
    title: '行',
    subtitle: '交通攻略',
    icon: '🚗',
    accent: '#5a9a7a',
    bg: '#f0f6f0',
    tips: [
      '查询当地公共交通或租车选项',
      '注意加油站 / 充电站分布',
      '保存离线地图以备弱网环境',
    ],
  },
  {
    id: 'play',
    title: '玩',
    subtitle: '游玩贴士',
    icon: '🎯',
    accent: '#9a7aaa',
    bg: '#f6f3f8',
    tips: [
      '关注天气和日照时间',
      '穿舒适防滑的鞋子',
      '提前预订热门项目',
    ],
  },
];

const PoiPage = () => {
  const { id } = useParams<{ id: string }>();
  const poi = itinerary.pois.find((p) => p.id === id);

  if (!poi) {
    return (
      <div className="space-y-3 px-5 py-10">
        <p style={{ color: 'var(--text-secondary)' }}>没找到这个停留点。</p>
        <Link to="/" className="underline" style={{ color: 'var(--green)' }}>
          ← 回到行程列表
        </Link>
      </div>
    );
  }

  const hasLocation = poi.location != null;
  const meta = categoryMeta[poi.category] || {
    label: poi.category,
    color: '#888',
    icon: '📍',
  };

  // Find day that contains this POI for back navigation
  const containingDay = itinerary.days.find((d) => d.poiIds.includes(poi.id));
  const backLink = containingDay ? `/day/${containingDay.day}` : '/';

  return (
    <div className="pb-12 overflow-x-hidden">
      {/* ═══════════════════════════════════════════
          HERO — Immersive POI header
          ═══════════════════════════════════════════ */}
      <section className="poi-hero">
        <img
          src={
            poi.photos && poi.photos.length > 0
              ? poi.photos[0]
              : 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tokyo_Skyline_2021.jpg/1280px-Tokyo_Skyline_2021.jpg'
          }
          alt={poi.name}
          className="poi-hero-image"
          loading="eager"
        />
        <div className="poi-hero-overlay" />

        {/* Navigation back */}
        <div className="absolute top-0 left-0 right-0 z-10 px-5 pt-12">
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-base font-semibold"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M19 12H5m7-7l-7 7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {containingDay ? `Day ${containingDay.day}` : '行程列表'}
          </Link>
        </div>

        {/* POI info overlay */}
        <div className="poi-hero-content">
          <div
            className="poi-category-badge mb-3"
            style={{
              background: `${meta.color}25`,
              color: meta.color,
              border: `1px solid ${meta.color}40`,
            }}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </div>

          <h1
            className="text-3xl font-bold text-white leading-tight"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            {poi.name}
          </h1>

          {poi.nameEn && poi.nameEn !== poi.name && (
            <p className="mt-2 text-sm text-white/70 font-mono-iceland">
              {poi.nameEn}
            </p>
          )}

          {poi.address && (
            <p className="mt-2 text-sm text-white/60">📍 {poi.address}</p>
          )}
        </div>
      </section>

      {/* Content container */}
      <div className="px-5">
        {/* ═══════════════════════════════════════════
            QUICK INFO GRID
            ═══════════════════════════════════════════ */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {poi.plannedAt && (
            <div className="journal-card p-4">
              <p
                className="text-xs font-medium tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                计划到达
              </p>
              <p
                className="mt-2 text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {poi.plannedAt}
              </p>
            </div>
          )}
          {poi.durationMin != null && (
            <div className="journal-card p-4">
              <p
                className="text-xs font-medium tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                预计停留
              </p>
              <p
                className="mt-2 text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {poi.durationMin}{' '}
                <span className="text-sm font-normal text-[var(--text-muted)]">
                  分钟
                </span>
              </p>
            </div>
          )}
          {poi.drivingFromPrevKm != null && (
            <div className="journal-card p-4">
              <p
                className="text-xs font-medium tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                上一站距离
              </p>
              <p
                className="mt-2 text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {poi.drivingFromPrevKm}{' '}
                <span className="text-sm font-normal text-[var(--text-muted)]">
                  km
                </span>
              </p>
              {poi.drivingFromPrevDuration && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {poi.drivingFromPrevDuration}
                </p>
              )}
            </div>
          )}
          {hasLocation && (
            <div className="journal-card p-4">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  坐标
                </p>
                <a
                  href={`https://www.google.com/maps?q=${poi.location![1]},${poi.location![0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--green)' }}
                >
                  地图 →
                </a>
              </div>
              <p
                className="mt-2 text-sm font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {poi.location![1].toFixed(4)}, {poi.location![0].toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            TRAVEL NOTES
            ═══════════════════════════════════════════ */}
        {poi.notes && (
          <div className="mt-6">
            <p className="section-label mb-3">旅行笔记</p>
            <div
              className="journal-card p-5"
              style={{ background: 'var(--cream)' }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}
              >
                {poi.notes}
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            FOOD / LODGING / TRANSPORT / PLAY GUIDE
            ═══════════════════════════════════════════ */}
        <div className="guide-section">
          <div className="guide-grid">
            {GUIDE_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="guide-card"
                style={
                  { '--card-accent': section.accent } as React.CSSProperties
                }
              >
                <div
                  className="guide-card-icon"
                  style={{ background: section.bg }}
                >
                  {section.icon}
                </div>
                <h4 className="guide-card-title">{section.title}</h4>
                <p className="guide-card-desc">{section.subtitle}</p>
                <ul className="mt-2 space-y-1">
                  {section.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      · {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* PHOTO GALLERY */}
        {poi.photos && poi.photos.length > 0 && (
          <div className="mt-8">
            <p className="section-label mb-3">相册</p>
            <div className="grid grid-cols-2 gap-2">
              {poi.photos.map((src, i) => (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden ${i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                >
                  <img
                    src={src}
                    alt={poi.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ACTION LINKS
            ═══════════════════════════════════════════ */}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={googleMapsUrl(poi)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition"
            style={{ background: 'var(--green)', color: '#fff' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Google Maps
          </a>
          {poi.link && (
            <a
              href={poi.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition"
              style={{ background: '#f0f0f0', color: '#666' }}
            >
              🔗 官网
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoiPage;
