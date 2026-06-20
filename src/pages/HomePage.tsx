import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { itinerary } from '../data/itinerary';
import { DAY_COVERS } from '../lib/dayCovers';
import { preloadJourneyMap } from '../lib/mapPreload';
import { getDefaultCarouselIndex } from '../lib/tripDate';
import HeroCrossfade from '../components/HeroCrossfade';
import { useProgress } from '../hooks/useProgress';

const DEFAULT_HERO =
  itinerary.days[0]?.photos?.[0] ??
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tokyo_Skyline_2021.jpg/1280px-Tokyo_Skyline_2021.jpg';

const HomePage = () => {
  const { isDayDone, dayStats } = useProgress();
  const doneDays = itinerary.days.filter((d) => isDayDone(d.day)).length;

  const defaultIndex = getDefaultCarouselIndex(itinerary.days);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const didInitialScroll = useRef(false);

  const scrollToDay = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = carouselRef.current;
      if (!el) return;
      const slide = el.querySelectorAll('.day-slide')[index] as
        | HTMLElement
        | undefined;
      if (!slide) return;
      const left = slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior });
    },
    [],
  );

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const slides = el.querySelectorAll('.day-slide');
    let closest = 0;
    let minDist = Infinity;
    slides.forEach((slide, i) => {
      const s = slide as HTMLElement;
      const slideCenter = s.offsetLeft + s.offsetWidth / 2;
      const dist = Math.abs(slideCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  useLayoutEffect(() => {
    if (didInitialScroll.current) return;
    scrollToDay(defaultIndex, 'auto');
    setActiveIndex(defaultIndex);
    didInitialScroll.current = true;
  }, [defaultIndex, scrollToDay]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const activeDay = itinerary.days[activeIndex];
  const heroCover = (activeDay && DAY_COVERS[activeDay.day]) || DEFAULT_HERO;

  const totalKm = itinerary.days.reduce(
    (acc, d) => acc + (d.drivingKm || 0),
    0,
  );

  return (
    <div className="home-page overflow-x-hidden">
      <section className="hero-section">
        <HeroCrossfade src={heroCover} alt={activeDay?.title ?? itinerary.title} />
        <div className="hero-overlay" />
        <div className="hero-grain" aria-hidden />

        <div className="hero-content">
          <div
            className="hero-eyebrow animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <span
              className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
              }}
            >
              {itinerary.days.length} 天行程
            </span>
          </div>

          <h1 className="hero-title font-display text-balance">
            {itinerary.title}
          </h1>
          <p className="hero-subtitle font-editorial text-balance">
            {itinerary.subtitle ?? '在路上随时翻的行程 H5'}
          </p>

          <div className="hero-meta flex-wrap">
            <span className="whitespace-nowrap">
              {itinerary.startDate.replace(/-/g, '.')}
            </span>
            <span className="dot" />
            <span className="whitespace-nowrap">
              {itinerary.endDate.replace(/-/g, '.')}
            </span>
            <span className="dot" />
            <span className="whitespace-nowrap">{totalKm}km 驾驶</span>
            <span className="dot" />
            <span className="whitespace-nowrap mb-1">
              {doneDays}/{itinerary.days.length} 已完成
            </span>
          </div>
        </div>
      </section>

      <section className="home-body">
        <div ref={carouselRef} className="day-carousel">
          {itinerary.days.map((day) => {
            const stats = dayStats(day.day);
            const done = isDayDone(day.day);
            const progress =
              stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
            const coverImage = DAY_COVERS[day.day];

            return (
              <div key={day.day} className="day-slide">
                <Link
                  to={`/day/${day.day}`}
                  state={{ animate: true }}
                  onMouseEnter={preloadJourneyMap}
                  onFocus={preloadJourneyMap}
                >
                  <article className="day-cinematic-card">
                    <div className="card-image flex-shrink-0">
                      {coverImage ? (
                        <motion.div
                          layoutId={`day-cover-${day.day}`}
                          className="w-full h-full"
                        >
                          <img
                            src={coverImage}
                            alt={day.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, var(--ice-mid), var(--ice-light))',
                          }}
                        >
                          <span className="text-4xl">🗺️</span>
                        </div>
                      )}
                      <div className="card-image-overlay" />
                      <div className="card-day-badge">Day {day.day}</div>
                      {done && (
                        <div
                          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--green)', color: '#fff' }}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="card-content">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs font-mono-iceland"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {day.date}
                        </span>
                        {day.drivingKm && (
                          <>
                            <span
                              className="w-1 h-1 rounded-full"
                              style={{ background: 'var(--border)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {day.drivingKm}km
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="card-title">{day.title}</h3>

                      <p className="card-summary">{day.summary ?? ''}</p>

                      <div className="card-footer">
                        <div className="card-meta">
                          <span>
                            <span
                              style={{ color: 'var(--green)', fontWeight: 600 }}
                            >
                              {stats.done}/{stats.total}
                            </span>{' '}
                            站
                          </span>
                          {day.lodging && (
                            <>
                              <span>·</span>
                              <span>{day.lodging}</span>
                            </>
                          )}
                        </div>
                        <div className="card-progress">
                          <div
                            className="card-progress-bar"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="carousel-dots home-carousel-dots">
          {itinerary.days.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === activeIndex ? 'active' : ''}`}
              onClick={() => scrollToDay(index)}
              aria-label={`Go to day ${index + 1}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
