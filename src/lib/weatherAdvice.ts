/**
 * 天气 → 游客可执行建议（规则引擎）
 * ------------------------------------------------------------------
 * 设计目标：不向用户抛气象术语，也不要求用户自己判断“这代表我该干嘛”。
 * 输入气象数据，直接输出「出行穿搭 / 游玩安排 / 随身物品 / 风险提醒」四类结论。
 *
 * - 纯函数，服务端与浏览器共用（页面首屏由服务端渲染，前端刷新后复用同一套规则）
 * - 只输出满足条件的条目，不满足的直接隐藏
 * - 文案全部来自本地化文案表，脚本内不含任何数据来源信息
 */
import type {
  AirData,
  CurrentWeather,
  DailyWeather,
  HourlyWeather,
  MarineData,
} from './weather';
import { beaufortFromMs } from './weather';

export type AdviceLevel = 'danger' | 'warn';

export interface Alert {
  level: AdviceLevel;
  icon: string;
  text: string;
}

export interface PackItem {
  icon: string;
  label: string;
}

export interface AdviceResult {
  alerts: Alert[];
  /** 一句话概览片段：天气 + 温度区间 + 紫外线 + 风力 */
  chips: string[];
  outfit: string[];
  plan: string[];
  pack: PackItem[];
  /** 未来几小时可能出现的降水时段提示，无则 null */
  rainWindow: string | null;
}

export interface AdviceInput {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  marine: MarineData | null;
  air: AirData | null;
  /** 本地化文案表（messages.weatherPage.advice） */
  t: AdviceMessages;
}

/** 本地化文案表：与 i18n 中 weatherPage.advice 一一对应 */
export interface AdviceMessages {
  outfitTitle: string;
  planTitle: string;
  packTitle: string;
  alertTitle: string;
  allClear: string;
  uvStrong: string;
  uvVeryStrong: string;
  windCalm: string;
  windModerate: string;
  windStrong: string;
  outfitHeat: string;
  outfitCold: string;
  outfitLayer: string;
  outfitRain: string;
  outfitRainLight: string;
  outfitWind: string;
  outfitMild: string;
  planSunny: string;
  planCloudy: string;
  planDrizzle: string;
  planRainIndoor: string;
  planHeavyRain: string;
  planThunder: string;
  planFog: string;
  planHeat: string;
  planCold: string;
  planWindModerate: string;
  planWindStrong: string;
  planTideLow: string;
  planTideHigh: string;
  planSeaWarm: string;
  planSeaCool: string;
  planSeaCold: string;
  planWaveHigh: string;
  packUmbrella: string;
  packRaincoat: string;
  packSunscreen: string;
  packSunglasses: string;
  packHat: string;
  packWater: string;
  packJacket: string;
  packCoat: string;
  packScarf: string;
  packSecureHat: string;
  packMask: string;
  packTowel: string;
  packCamera: string;
  packTissues: string;
  alertThunder: string;
  alertHeavyRain: string;
  alertWind: string;
  alertHeat: string;
  alertWave: string;
  alertFog: string;
  alertAir: string;
  alertSnow: string;
  rainSoon: string;
  dayRain: string;
  dayHeavyRain: string;
  dayUv: string;
  dayWind: string;
  dayHeat: string;
  dayCold: string;
  daySnow: string;
}

/** 极简模板替换：{time} / {temp} 等占位符 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined ? '' : String(vars[k]),
  );
}

const hhmm = (iso: string): string => {
  const m = String(iso ?? '').match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
};

const uniq = (arr: string[]): string[] => {
  const seen = new Set<string>();
  return arr.filter((x) => {
    if (!x || seen.has(x)) return false;
    seen.add(x);
    return true;
  });
};

const uniqPack = (arr: PackItem[]): PackItem[] => {
  const seen = new Set<string>();
  return arr.filter((x) => {
    if (!x || !x.label || seen.has(x.label)) return false;
    seen.add(x.label);
    return true;
  });
};

/** 是否属于“会明显下雨”的天气代码 */
const isRainCode = (c: number) => (c >= 61 && c <= 67) || (c >= 80 && c <= 82);
const isDrizzleCode = (c: number) => c >= 51 && c <= 57;
const isSnowCode = (c: number) => (c >= 71 && c <= 77) || c === 85 || c === 86;

export function buildAdvice({ current, hourly, daily, marine, air, t }: AdviceInput): AdviceResult {
  const today = daily[0] ?? null;
  const next3 = daily.slice(0, 3);
  const codes = [current.code, ...next3.map((d) => d.code)];
  const some = (fn: (c: number) => boolean) => codes.some(fn);

  const next12 = hourly.slice(0, 12);
  const probPeak12 = next12.reduce((m, h) => Math.max(m, h.precipProb), 0);
  const probPeak3d = next3.reduce((m, d) => Math.max(m, d.precipProb), 0);

  const tMax = today?.tMax ?? current.temperature;
  const tMin = today?.tMin ?? current.temperature;
  const diurnal = tMax - tMin;
  const uvMax = Math.max(today?.uvMax ?? 0, current.uv);
  const windForceNow = current.windForce;
  const windForceMax = Math.max(
    windForceNow,
    ...next3.map((d) => beaufortFromMs(d.windMax)),
    beaufortFromMs(current.windGust),
  );
  const vis = current.visibility;

  const thunder = current.category === 'thunder' || some((c) => c >= 95);
  const heavyRain =
    some((c) => c === 65 || c === 67 || c === 82) || (today?.precipSum ?? 0) >= 30;
  const rainy = current.category === 'rain' || current.category === 'showers' || some(isRainCode);
  const drizzly = current.category === 'drizzle' || some(isDrizzleCode);
  const snowy = current.category === 'snow' || some(isSnowCode);
  const foggy = current.category === 'fog' || (vis !== null && vis < 2000);
  const heavyFog = vis !== null && vis < 500;

  const uvHigh = uvMax >= 5;
  const uvVeryHigh = uvMax >= 8;
  const hot = tMax >= 32;
  const cold = tMax <= 10;
  const bigSwing = diurnal > 8;

  const pm25 = air?.pm25 ?? null;
  const aqi = air?.aqi ?? null;
  const airBad = (pm25 !== null && pm25 > 35) || (aqi !== null && aqi > 75);

  const wave = marine?.waveHeight ?? null;
  const seaT = marine?.seaTemp ?? null;
  const tideHigh = marine?.nextHigh ?? null;
  const tideLow = marine?.nextLow ?? null;

  /* ── 风险提醒（优先级最高，有则置顶） ─────────────────────── */
  const alerts: Alert[] = [];
  if (thunder) alerts.push({ level: 'danger', icon: '⛈️', text: t.alertThunder });
  if (heavyRain) alerts.push({ level: 'danger', icon: '🌧️', text: t.alertHeavyRain });
  if (windForceMax >= 7) alerts.push({ level: 'danger', icon: '💨', text: t.alertWind });
  if (tMax >= 35) alerts.push({ level: 'danger', icon: '🥵', text: t.alertHeat });
  if (wave !== null && wave >= 1.5)
    alerts.push({ level: 'danger', icon: '🌊', text: fill(t.alertWave, { wave: wave.toFixed(1) }) });
  if (snowy) alerts.push({ level: 'warn', icon: '❄️', text: t.alertSnow });
  if (heavyFog) alerts.push({ level: 'warn', icon: '🌫️', text: t.alertFog });
  if (airBad) alerts.push({ level: 'warn', icon: '😷', text: t.alertAir });

  /* ── 出行穿搭 ──────────────────────────────────────────── */
  const rainLikely = rainy || drizzly || probPeak12 >= 60 || probPeak3d >= 60;
  const outfit: string[] = [];
  if (rainy && windForceNow >= 5) outfit.push(t.outfitRain);
  else if (rainLikely) outfit.push(t.outfitRainLight);
  else if (hot) outfit.push(t.outfitHeat);
  else if (cold) outfit.push(t.outfitCold);
  else if (bigSwing) outfit.push(t.outfitLayer);
  if (windForceNow >= 5 && !(rainy && windForceNow >= 5)) outfit.push(t.outfitWind);
  if (hot) outfit.push(t.outfitHeat);
  if (outfit.length === 0) outfit.push(t.outfitMild);

  /* ── 游玩安排 ──────────────────────────────────────────── */
  const plan: string[] = [];
  if (thunder) plan.push(t.planThunder);
  else if (heavyRain) plan.push(t.planHeavyRain);
  else if (rainy) plan.push(t.planRainIndoor);
  else if (drizzly) plan.push(t.planDrizzle);
  else if (foggy) plan.push(t.planFog);
  else if (current.category === 'clear') plan.push(t.planSunny);
  else plan.push(t.planCloudy);

  if (foggy && !thunder && !heavyRain && !rainy && !drizzly) plan.push(t.planFog);
  if (hot) plan.push(t.planHeat);
  if (cold) plan.push(t.planCold);
  if (windForceMax >= 7) plan.push(t.planWindStrong);
  else if (windForceMax >= 5) plan.push(t.planWindModerate);

  // 海边场景：赶海/下水/礁石安全（仅在有海滨数据时输出）
  if (wave !== null && wave >= 1.5) plan.push(fill(t.planWaveHigh, { wave: wave.toFixed(1) }));
  if (seaT !== null) {
    if (seaT >= 24) plan.push(t.planSeaWarm);
    else if (seaT >= 20) plan.push(t.planSeaCool);
    else plan.push(t.planSeaCold);
  }
  const sooner = (() => {
    const hi = tideHigh ? Date.parse(tideHigh.time) : Infinity;
    const lo = tideLow ? Date.parse(tideLow.time) : Infinity;
    if (!Number.isFinite(Math.min(hi, lo))) return null;
    return hi <= lo ? ('high' as const) : ('low' as const);
  })();
  if (sooner === 'low' && tideLow)
    plan.push(fill(t.planTideLow, { time: hhmm(tideLow.time), height: tideLow.height.toFixed(2) }));
  if (sooner === 'high' && tideHigh)
    plan.push(fill(t.planTideHigh, { time: hhmm(tideHigh.time), height: tideHigh.height.toFixed(2) }));

  /* ── 随身物品 ──────────────────────────────────────────── */
  const pack: PackItem[] = [];
  if (heavyRain || (rainy && windForceNow >= 5)) pack.push({ icon: '🧥', label: t.packRaincoat });
  else if (rainLikely) pack.push({ icon: '☂️', label: t.packUmbrella });
  if (uvHigh) {
    pack.push({ icon: '🧴', label: t.packSunscreen });
    pack.push({ icon: '🕶️', label: t.packSunglasses });
    pack.push({ icon: '🧢', label: t.packHat });
  }
  if (hot) pack.push({ icon: '🥤', label: t.packWater });
  if (cold) {
    pack.push({ icon: '🧥', label: t.packCoat });
    pack.push({ icon: '🧣', label: t.packScarf });
  }
  if (bigSwing && !cold) pack.push({ icon: '🧥', label: t.packJacket });
  if (windForceNow >= 5) pack.push({ icon: '🎩', label: t.packSecureHat });
  if (airBad || heavyFog) pack.push({ icon: '😷', label: t.packMask });
  if (seaT !== null && seaT >= 22) pack.push({ icon: '🏖️', label: t.packTowel });
  if (current.category === 'clear' && current.isDay && !rainLikely)
    pack.push({ icon: '📷', label: t.packCamera });
  if (pack.length === 0) pack.push({ icon: '🧻', label: t.packTissues });

  /* ── 概览标签 ──────────────────────────────────────────── */
  const chips: string[] = [];
  if (uvVeryHigh) chips.push(t.uvVeryStrong);
  else if (uvHigh) chips.push(t.uvStrong);
  if (windForceMax >= 7) chips.push(t.windStrong);
  else if (windForceNow >= 5) chips.push(t.windModerate);
  else if (windForceNow <= 2) chips.push(t.windCalm);

  /* ── 未来几小时降水窗口 ────────────────────────────────── */
  let rainWindow: string | null = null;
  const firstWet = next12.find((h) => h.precipProb >= 50 || isRainCode(h.code) || isSnowCode(h.code));
  if (firstWet && !rainy) rainWindow = fill(t.rainSoon, { time: hhmm(firstWet.time) });

  return {
    alerts,
    chips,
    outfit: uniq(outfit).slice(0, 3),
    plan: uniq(plan).slice(0, 5),
    pack: uniqPack(pack).slice(0, 6),
    rainWindow,
  };
}

/** 单日预报的“一句话提示”（7 日预报里的迷你标签） */
export function dayHighlight(day: DailyWeather, t: AdviceMessages): PackItem | null {
  if (isSnowCode(day.code)) return { icon: '❄️', label: t.daySnow };
  if (day.code === 65 || day.code === 67 || day.code === 82 || day.code >= 95)
    return { icon: '🌧️', label: t.dayHeavyRain };
  if (day.precipProb >= 60 || isRainCode(day.code) || isDrizzleCode(day.code))
    return { icon: '☂️', label: t.dayRain };
  if (day.uvMax >= 6) return { icon: '🧴', label: t.dayUv };
  if (beaufortFromMs(day.windMax) >= 6) return { icon: '💨', label: t.dayWind };
  if (day.tMax >= 32) return { icon: '🥵', label: t.dayHeat };
  if (day.tMax <= 8) return { icon: '🧣', label: t.dayCold };
  return null;
}
