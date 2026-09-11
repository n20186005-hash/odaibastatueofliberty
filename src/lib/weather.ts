/**
 * 天气数据模块（构建期在服务端抓取并缓存）
 * ------------------------------------------------------------------
 * - 在服务端（构建/渲染阶段）拉取景点坐标的实况、逐小时、7 日预报，以及
 *   海滨与空气质量等与本地地理环境相关的衍生数据
 * - 模块级 Promise 缓存：一次构建内只请求一次，多组件共用同一份数据
 * - 三路请求互相独立，任一路异常都只影响对应模块，组件按需降级渲染
 * - 数据来源信息只保留在服务端，页面与前端脚本均不展示任何接口/密钥说明
 */
import { entity } from '../config/entity';

export type WeatherCategory =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'thunder';

export interface CurrentWeather {
  /** 当地时刻（ISO，含时区偏移） */
  time: string;
  temperature: number;
  apparent: number;
  humidity: number;
  precipitation: number;
  /** 当前小时降水概率（%） */
  precipProb: number;
  windSpeed: number;
  windGust: number;
  /** 蒲福风级（0–12） */
  windForce: number;
  uv: number;
  /** 能见度（米） */
  visibility: number | null;
  code: number;
  category: WeatherCategory;
  isDay: boolean;
}

export interface HourlyWeather {
  time: string;
  code: number;
  category: WeatherCategory;
  temp: number;
  precipProb: number;
  precip: number;
  windSpeed: number;
  windGust: number;
  uv: number;
  /** 能见度（米） */
  visibility: number | null;
  isDay: boolean;
}

export interface DailyWeather {
  date: string;
  code: number;
  category: WeatherCategory;
  tMax: number;
  tMin: number;
  appMax: number;
  appMin: number;
  precipProb: number;
  precipSum: number;
  windMax: number;
  gustMax: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
}

export interface TideMark {
  time: string;
  height: number;
}

/** 单次满潮／干潮事件 */
export interface TideEvent extends TideMark {
  type: 'high' | 'low';
}

/** 潮位变化趋势 */
export type TideTrend = 'rising' | 'falling' | 'steady';

export interface MarineData {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveMax: number | null;
  seaTemp: number | null;
  seaLevelNow: number | null;
  nextHigh: TideMark | null;
  nextLow: TideMark | null;
  /** 当前潮位趋势（涨／退／平） */
  trend: TideTrend;
  /** 预报时段内全部满潮／干潮事件（按时间升序） */
  events: TideEvent[];
  /** 未来约 48 小时潮位曲线（米，相对平均海面） */
  seaLevelSeries: TideMark[];
  /** 曲线可用的潮位区间（米） */
  range: { min: number; max: number } | null;
}

export interface AirData {
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  /** 海边场景数据；数据不可用时为 null */
  marine: MarineData | null;
  /** 空气质量；数据不可用时为 null */
  air: AirData | null;
  /** 数据抓取时间（ISO 字符串，UTC） */
  fetchedAt: string;
  latitude: number;
  longitude: number;
}

/** WMO 天气代码 → 归并后的天气类别（用于取图标与本地化文案） */
export function categoryFromCode(code: number): WeatherCategory {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloudy';
}

/** 天气类别 → 图标（夜间晴天改用月亮） */
export function iconFromCategory(category: WeatherCategory, isDay = true): string {
  switch (category) {
    case 'clear':
      return isDay ? '☀️' : '🌙';
    case 'partly':
      return isDay ? '🌤️' : '☁️';
    case 'cloudy':
      return '☁️';
    case 'fog':
      return '🌫️';
    case 'drizzle':
      return '🌦️';
    case 'rain':
      return '🌧️';
    case 'showers':
      return '🌧️';
    case 'snow':
      return '❄️';
    case 'thunder':
      return '⛈️';
    default:
      return '🌤️';
  }
}

/**
 * 风速（m/s）→ 蒲福风级（0–12）
 * 游客更习惯“几级风”，因此界面同时给出 m/s 与风级。
 */
export function beaufortFromMs(ms: number): number {
  const v = Number(ms);
  if (!Number.isFinite(v) || v < 0.3) return 0;
  const scale = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  let force = 0;
  for (let i = 0; i < scale.length; i += 1) {
    if (v >= scale[i]) force = i + 1;
  }
  return Math.min(force, 12);
}

/** 蒲福风级 → 中文/日文 风级数字（界面统一用数字 + 单位文案） */
export function windForceLabel(ms: number): string {
  return String(beaufortFromMs(ms));
}

const TIMEZONE = 'Asia/Tokyo';

function forecastEndpoint(): string {
  const params = new URLSearchParams({
    latitude: String(entity.latitude),
    longitude: String(entity.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,visibility',
    hourly:
      'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,visibility,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max',
    timezone: TIMEZONE,
    forecast_days: '7',
    wind_speed_unit: 'ms',
    timeformat: 'iso8601',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

/** 海滨数据：浪高、海水温度与潮位（用于赶海 / 下水 / 礁石安全建议） */
function marineEndpoint(): string {
  const params = new URLSearchParams({
    latitude: String(entity.latitude),
    longitude: String(entity.longitude),
    current: 'wave_height,wave_period,sea_surface_temperature,sea_level_height_msl',
    hourly: 'sea_level_height_msl,wave_height,sea_surface_temperature',
    daily: 'wave_height_max',
    timezone: TIMEZONE,
    forecast_days: '3',
    timeformat: 'iso8601',
  });
  return `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
}

/** 空气质量：用于雾霾 / 敏感人群提示 */
function airEndpoint(): string {
  const params = new URLSearchParams({
    latitude: String(entity.latitude),
    longitude: String(entity.longitude),
    current: 'european_aqi,pm2_5,pm10',
    timezone: TIMEZONE,
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
}

/**
 * 三路数据地址。
 * 仅供服务端与前端脚本内部使用，不参与任何界面文案，
 * 页面正文中不会出现任何数据来源/接口/密钥说明。
 */
export function weatherEndpoints(): { forecast: string; marine: string; air: string } {
  return {
    forecast: forecastEndpoint(),
    marine: marineEndpoint(),
    air: airEndpoint(),
  };
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round = (v: number) => Math.round(v);
const round1 = (v: number) => Math.round(v * 10) / 10;

/** 从逐小时序列中找出“当前小时”的下标 */
function currentHourIndex(times: string[], nowIso: string | undefined): number {
  if (!Array.isArray(times) || times.length === 0) return 0;
  if (!nowIso) return 0;
  const now = Date.parse(nowIso.slice(0, 13) + ':00:00');
  if (!Number.isFinite(now)) return 0;
  let idx = 0;
  for (let i = 0; i < times.length; i += 1) {
    const t = Date.parse(times[i]);
    if (Number.isFinite(t) && t <= now) idx = i;
    else break;
  }
  return idx;
}

/**
 * 潮汐时刻统一解析为毫秒时间戳。
 * 接口返回的是当地（JST）无偏移字符串，因此缺省按 +09:00 解析，
 * 带偏移或 Z 的字符串则直接解析，保证服务端与浏览器口径一致。
 */
export function tideTime(iso: string): number {
  if (!iso) return NaN;
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(iso)) return Date.parse(iso);
  return Date.parse(`${iso.length <= 16 ? `${iso}:00` : iso}+09:00`);
}

/** 潮汐极值：在潮位序列中检出高低潮，并给出“下一次”的时刻 */
function tideExtremes(series: TideMark[], nowIso: string | undefined) {
  const highs: TideMark[] = [];
  const lows: TideMark[] = [];
  for (let i = 1; i < series.length - 1; i += 1) {
    const prev = series[i - 1].height;
    const cur = series[i].height;
    const next = series[i + 1].height;
    if (cur > prev && cur >= next) highs.push(series[i]);
    if (cur < prev && cur <= next) lows.push(series[i]);
  }
  const now = nowIso ? tideTime(nowIso) : Date.now();
  const pick = (arr: TideMark[]): TideMark | null => {
    // 已过峰谷时，序列整体前移一格再找，避免取到当前点回退
    const future = arr.find((m) => tideTime(m.time) > now + 30 * 60 * 1000);
    return future ?? arr[arr.length - 1] ?? null;
  };
  return { nextHigh: pick(highs), nextLow: pick(lows), highs, lows };
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function load(): Promise<WeatherData | null> {
  const ep = weatherEndpoints();
  const [fc, marineRaw, airRaw] = await Promise.all([
    getJson(ep.forecast),
    getJson(ep.marine),
    getJson(ep.air),
  ]);
  return normalizeWeather(fc, marineRaw, airRaw);
}

/**
 * 原始响应 → 规范化数据。
 * 服务端与浏览器共用同一套解析逻辑，保证前端刷新后建议规则完全一致。
 */
export function normalizeWeather(fc: any, marineRaw: any, airRaw: any): WeatherData | null {
  const c = fc?.current;
  const d = fc?.daily;
  const h = fc?.hourly;
  if (!c || !d || !Array.isArray(d.time)) return null;

  const hourlyTimes: string[] = Array.isArray(h?.time) ? h.time : [];
  const hIdx = currentHourIndex(hourlyTimes, c.time as string);
  const nowIso = String(c.time ?? '');

  const now = localNowIso(nowIso);
  const hourly: HourlyWeather[] = hourlyTimes
    .slice(hIdx, hIdx + 24)
    .map((time, i) => {
      const k = hIdx + i;
      const code = Number(h?.weather_code?.[k] ?? 0);
      return {
        time,
        code,
        category: categoryFromCode(code),
        temp: round(Number(h?.temperature_2m?.[k] ?? 0)),
        precipProb: round(Number(h?.precipitation_probability?.[k] ?? 0)),
        precip: Number(h?.precipitation?.[k] ?? 0),
        windSpeed: Number(h?.wind_speed_10m?.[k] ?? 0),
        windGust: Number(h?.wind_gusts_10m?.[k] ?? 0),
        uv: Number(h?.uv_index?.[k] ?? 0),
        visibility: num(h?.visibility?.[k]),
        isDay: Number(h?.is_day?.[k] ?? 1) === 1,
      };
    });

  const windSpeed = Number(c.wind_speed_10m ?? 0);
  const current: CurrentWeather = {
    time: now,
    temperature: round(Number(c.temperature_2m)),
    apparent: round(Number(c.apparent_temperature)),
    humidity: round(Number(c.relative_humidity_2m)),
    precipitation: Number(c.precipitation ?? 0),
    precipProb: hourly[0]?.precipProb ?? 0,
    windSpeed,
    windGust: Number(c.wind_gusts_10m ?? 0),
    windForce: beaufortFromMs(windSpeed),
    uv: Number(c.uv_index ?? 0),
    visibility: num(c.visibility),
    code: Number(c.weather_code ?? 0),
    category: categoryFromCode(Number(c.weather_code ?? 0)),
    isDay: Number(c.is_day ?? 1) === 1,
  };

  const daily: DailyWeather[] = d.time.map((date: string, i: number) => {
    const code = Number(d.weather_code?.[i] ?? 0);
    return {
      date,
      code,
      category: categoryFromCode(code),
      tMax: round(Number(d.temperature_2m_max?.[i] ?? 0)),
      tMin: round(Number(d.temperature_2m_min?.[i] ?? 0)),
      appMax: round(Number(d.apparent_temperature_max?.[i] ?? 0)),
      appMin: round(Number(d.apparent_temperature_min?.[i] ?? 0)),
      precipProb: round(Number(d.precipitation_probability_max?.[i] ?? 0)),
      precipSum: round1(Number(d.precipitation_sum?.[i] ?? 0)),
      windMax: Number(d.wind_speed_10m_max?.[i] ?? 0),
      gustMax: Number(d.wind_gusts_10m_max?.[i] ?? 0),
      uvMax: Number(d.uv_index_max?.[i] ?? 0),
      sunrise: String(d.sunrise?.[i] ?? ''),
      sunset: String(d.sunset?.[i] ?? ''),
    };
  });

  return {
    current,
    hourly,
    daily,
    marine: normalizeMarine(marineRaw, now),
    air: buildAir(airRaw),
    fetchedAt: new Date().toISOString(),
    latitude: entity.latitude,
    longitude: entity.longitude,
  };
}

/** 把当地时刻（可能无偏移）规范为带 +09:00 的 ISO 字符串 */
function localNowIso(raw: string): string {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return new Date().toISOString();
  return `${m[1]}T${m[2]}:00+09:00`;
}

/**
 * 原始海滨响应 → 规范化数据。
 * 服务端与浏览器共用（潮汐板块会拿它重新渲染一次，保证数据一致）。
 */
export function normalizeMarine(raw: any, nowIso?: string): MarineData | null {
  if (!raw?.current && !Array.isArray(raw?.hourly?.time)) return null;
  const times: string[] = Array.isArray(raw?.hourly?.time) ? raw.hourly.time : [];
  const levels: unknown[] = Array.isArray(raw?.hourly?.sea_level_height_msl)
    ? raw.hourly.sea_level_height_msl
    : [];

  // 先保留完整序列，用于提取全部高低潮事件
  const full: TideMark[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const height = num(levels[i]);
    if (height !== null) full.push({ time: times[i], height });
  }

  if (full.length < 3 && !raw?.current) return null;

  const { nextHigh, nextLow, highs, lows } = tideExtremes(full, nowIso);

  // 图表从当前所在整点起展示约 48 小时（用于判断涨／退潮趋势）
  const now = nowIso ? tideTime(nowIso) : Date.now();
  let start = 0;
  for (let i = 0; i < full.length; i += 1) {
    if (tideTime(full[i].time) <= now) start = i;
    else break;
  }
  const series = full.slice(start, start + 49);

  const heights = series.map((s) => s.height);
  const range = heights.length
    ? { min: Math.min(...heights), max: Math.max(...heights) }
    : null;

  // 用最近一小时的变化判断涨／退潮
  let trend: TideTrend = 'steady';
  if (series.length >= 2) {
    const delta = series[1].height - series[0].height;
    if (delta > 0.015) trend = 'rising';
    else if (delta < -0.015) trend = 'falling';
  }

  const events: TideEvent[] = [
    ...highs.map((m) => ({ ...m, type: 'high' as const })),
    ...lows.map((m) => ({ ...m, type: 'low' as const })),
  ].sort((a, b) => tideTime(a.time) - tideTime(b.time));

  return {
    waveHeight: num(raw?.current?.wave_height),
    wavePeriod: num(raw?.current?.wave_period),
    waveMax: num(raw?.daily?.wave_height_max?.[0]),
    seaTemp: num(raw?.current?.sea_surface_temperature),
    seaLevelNow: num(raw?.current?.sea_level_height_msl),
    nextHigh,
    nextLow,
    trend,
    events,
    seaLevelSeries: series,
    range,
  };
}

function buildAir(raw: any): AirData | null {
  const cur = raw?.current;
  if (!cur) return null;
  const aqi = num(cur.european_aqi);
  const pm25 = num(cur.pm2_5);
  const pm10 = num(cur.pm10);
  if (aqi === null && pm25 === null && pm10 === null) return null;
  return { aqi, pm25, pm10 };
}

let pending: Promise<WeatherData | null> | null = null;

/** 取景点天气（模块级缓存，一次构建只请求一次） */
export function getWeather(): Promise<WeatherData | null> {
  if (!pending) pending = load();
  return pending;
}

/** 语言 → Intl 地区标记（用于星期/日期的本地化） */
export function intlLocale(lang: string): string {
  switch (lang) {
    case 'ja':
      return 'ja-JP';
    case 'zh':
      return 'zh-CN';
    case 'ko':
      return 'ko-KR';
    default:
      return 'en-US';
  }
}

/** 取时刻字符串中的 HH:mm（数据以当地时区返回） */
export function timePart(iso: string): string {
  if (!iso) return '--:--';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
}

/** 本地化“月/日 + 星期”短标签 */
export function dayLabel(date: string, locale: string, index: number): string {
  if (index === 0) return '';
  const dt = new Date(`${date}T12:00:00+09:00`);
  if (Number.isNaN(dt.getTime())) return date.slice(5);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt);
  const monthDay = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(dt);
  return `${monthDay} ${weekday}`;
}

/** 本地化“时刻”标签（HH:mm，用于逐小时条带） */
export function hourLabel(iso: string): string {
  return timePart(iso);
}
