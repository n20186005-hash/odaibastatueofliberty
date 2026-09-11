/**
 * 潮汐板块共享渲染模块
 * ------------------------------------------------------------------
 * 服务端（构建期）与浏览器共用同一套 SVG 曲线与潮汐时刻表生成逻辑，
 * 首屏静态渲染与前端刷新后的 DOM 结构、样式类名完全一致。
 */
import type { TideEvent, TideMark, TideTrend } from './weather';
import { timePart } from './weather';

/** 潮汐曲线画布（viewBox 固定坐标系，便于两端结果一致） */
export const TIDE_CHART = { W: 760, H: 220, padL: 52, padR: 18, padT: 30, padB: 34 } as const;

/** 潮汐板块界面文案（由 i18n 注入，不含任何数据来源信息） */
export interface TideLabels {
  high: string;
  low: string;
  today: string;
  tomorrow: string;
  trendRising: string;
  trendFalling: string;
  trendSteady: string;
  inHours: string;
  inMinutes: string;
  inNow: string;
  noData: string;
}

export interface TideCtx {
  labels: TideLabels;
  locale: string;
}

/** 潮位趋势 → 文案 / 箭头 / 样式类 */
export function trendInfo(trend: TideTrend, labels: TideLabels) {
  switch (trend) {
    case 'rising':
      return { text: labels.trendRising, icon: '↗', cls: 'is-rising' };
    case 'falling':
      return { text: labels.trendFalling, icon: '↘', cls: 'is-falling' };
    default:
      return { text: labels.trendSteady, icon: '→', cls: 'is-steady' };
  }
}

/** 距目标时刻的倒计时文案（{n} 占位符由 i18n 提供） */
export function countdownText(targetIso: string, labels: TideLabels, now = Date.now()): string {
  const t = Date.parse(targetIso);
  if (!Number.isFinite(t)) return '';
  const diff = t - now;
  if (diff <= 0) return labels.inNow;
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return labels.inMinutes.replace('{n}', String(mins));
  return labels.inHours.replace('{n}', String(Math.floor(mins / 60)));
}

/** 潮汐时刻表的日期标签：今天 / 明天 / 月日 + 星期 */
export function tideDayLabel(date: string, locale: string, index: number, labels: TideLabels): string {
  if (index === 0) return labels.today;
  if (index === 1) return labels.tomorrow;
  const dt = new Date(`${date}T12:00:00+09:00`);
  if (Number.isNaN(dt.getTime())) return date.slice(5);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt);
  const monthDay = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(dt);
  return `${monthDay} ${weekday}`;
}

/**
 * 生成潮汐曲线 SVG 内部结构（不含 <svg> 标签本身）。
 * 曲线按比例映射到画布，满潮／干潮以圆点加数值标注。
 */
export function tideChartSvg(series: TideMark[], events: TideEvent[], ctx: TideCtx): string {
  if (!Array.isArray(series) || series.length < 2) return '';
  const { W, H, padL, padR, padT, padB } = TIDE_CHART;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const heights = series.map((s) => s.height);
  let min = Math.min(...heights);
  let max = Math.max(...heights);
  if (max - min < 0.2) {
    const mid = (max + min) / 2;
    min = mid - 0.1;
    max = mid + 0.1;
  }
  const span = max - min || 1;
  const xAt = (i: number) => padL + (i / (series.length - 1)) * plotW;
  const yAt = (h: number) => padT + (1 - (h - min) / span) * plotH;

  const line = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(s.height).toFixed(1)}`)
    .join(' ');
  const base = padT + plotH;
  const area = `${line} L${(padL + plotW).toFixed(1)} ${base.toFixed(1)} L${padL} ${base.toFixed(1)} Z`;

  const parts: string[] = [];

  // 横向网格线与纵轴刻度
  [max, (max + min) / 2, min].forEach((hv) => {
    const yy = yAt(hv);
    parts.push(
      `<line class="tide-grid" x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" />`,
    );
    parts.push(
      `<text class="tide-axis" x="${padL - 9}" y="${(yy + 3.6).toFixed(1)}" text-anchor="end">${hv.toFixed(1)}</text>`,
    );
  });

  // 每 6 小时一条纵向网格线与时间刻度
  for (let i = 0; i < series.length; i += 1) {
    const m = series[i].time.match(/T(\d{2}):/);
    const hour = m ? Number(m[1]) : -1;
    if (hour % 6 !== 0) continue;
    const xx = xAt(i);
    if (xx > W - padR - 6) continue;
    parts.push(
      `<line class="tide-grid is-v" x1="${xx.toFixed(1)}" y1="${padT}" x2="${xx.toFixed(1)}" y2="${base}" />`,
    );
    parts.push(
      `<text class="tide-axis" x="${xx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${timePart(series[i].time)}</text>`,
    );
  }

  parts.push(`<path class="tide-area" d="${area}" />`);
  parts.push(`<path class="tide-line" d="${line}" />`);

  // 满潮／干潮事件标记
  const first = Date.parse(series[0].time);
  const last = Date.parse(series[series.length - 1].time);
  const spanMs = last - first;
  if (spanMs > 0) {
    for (const e of events) {
      const t = Date.parse(e.time);
      if (!(t >= first && t <= last)) continue;
      const xx = padL + ((t - first) / spanMs) * plotW;
      const yy = yAt(e.height);
      const isHigh = e.type === 'high';
      const labelY = isHigh ? yy - 9 : yy + 16;
      const anchorX = Math.min(Math.max(xx, padL + 22), W - padR - 22);
      parts.push(
        `<circle class="tide-dot ${isHigh ? 'is-high' : 'is-low'}" cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="3.4" />`,
      );
      parts.push(
        `<text class="tide-mark ${isHigh ? 'is-high' : 'is-low'}" x="${anchorX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle">${
          isHigh ? '▲' : '▼'
        }${e.height.toFixed(2)}</text>`,
      );
    }
  }

  return parts.join('');
}

/** 生成完整的潮汐曲线 <svg> 标签（服务端首屏与前端刷新共用） */
export function tideChartTag(series: TideMark[], events: TideEvent[], ctx: TideCtx): string {
  const inner = tideChartSvg(series, events, ctx);
  if (!inner) return '';
  return `<svg viewBox="0 0 ${TIDE_CHART.W} ${TIDE_CHART.H}" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">${inner}</svg>`;
}

/** 生成按日分组的潮汐时刻表（默认取最近 3 天） */
export function tideTableHtml(events: TideEvent[], ctx: TideCtx, maxDays = 3): string {
  const groups: { date: string; items: TideEvent[] }[] = [];
  for (const e of events) {
    const date = e.time.slice(0, 10);
    let g = groups[groups.length - 1];
    if (!g || g.date !== date) {
      g = { date, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }
  return groups
    .slice(0, maxDays)
    .map((g, i) => {
      const items = g.items
        .map(
          (e) =>
            `<li class="tide-ev ${e.type === 'high' ? 'is-high' : 'is-low'}">` +
            `<span class="tide-ev-icon" aria-hidden="true">${e.type === 'high' ? '▲' : '▼'}</span>` +
            `<span class="tide-ev-name">${e.type === 'high' ? ctx.labels.high : ctx.labels.low}</span>` +
            `<b class="tide-ev-time">${timePart(e.time)}</b>` +
            `<span class="tide-ev-h">${e.height.toFixed(2)} m</span></li>`,
        )
        .join('');
      return (
        `<div class="tide-day">` +
        `<div class="tide-day-head"><span class="tide-day-name">${tideDayLabel(g.date, ctx.locale, i, ctx.labels)}</span>` +
        `<span class="tide-day-count">${g.items.length}</span></div>` +
        `<ul class="tide-day-list">${items}</ul></div>`
      );
    })
    .join('');
}
