import zh from './zh.json';
import en from './en.json';
import ja from './ja.json';
import ko from './ko.json';
import de from './de.json';
import nl from './nl.json';
import it from './it.json';

export const defaultLang = 'ja';
/** hreflang="x-default" 指向的语种 */
export const xDefaultLang = 'ja';

/**
 * 完整本地化语种：整站文案（含全部正文段落）均已翻译。
 */
export const fullLocales = ['zh', 'en', 'ja', 'ko'] as const;

/**
 * 概要本地化语种：仅「首屏 + FAQ + 交通 + 实用信息」为目标语言，
 * 其余长正文回退英文。用于以较低成本承接 GSC 中的德/荷/意语流量。
 * 详见 getI18n() 的回退逻辑。
 */
export const summaryLocales = ['de', 'nl', 'it'] as const;

export const languagesList = [...fullLocales, ...summaryLocales] as const;

export const languages: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  nl: 'Nederlands',
  it: 'Italiano',
};

const ui: Record<string, any> = { zh, en, ja, ko, de, nl, it };

export function isSummaryLocale(lang: string): boolean {
  return (summaryLocales as readonly string[]).includes(lang);
}

/**
 * 以英文为基线的深合并。
 * 数组整体替换而非按位置合并——条目数量/顺序可能因语言而异，
 * 逐项合并会把两种语言的内容混在一起。
 */
function deepMerge(base: any, overlay: any): any {
  if (overlay === undefined || overlay === null) return base;
  if (Array.isArray(overlay)) return overlay;
  if (typeof overlay !== 'object') return overlay;
  if (base === null || typeof base !== 'object' || Array.isArray(base)) return overlay;
  const out: Record<string, any> = { ...base };
  for (const key of Object.keys(overlay)) {
    out[key] = deepMerge(base[key], overlay[key]);
  }
  return out;
}

export function getLangFromUrl(url: URL): string {
  const seg = url.pathname.split('/').filter(Boolean);
  const lang = seg[0];
  return (languagesList as readonly string[]).includes(lang) ? lang : defaultLang;
}

export function getI18n(url: URL) {
  const lang = getLangFromUrl(url);
  const raw = ui[lang] ?? en;

  // 概要语种只提供部分文案，缺失部分回退英文；
  // 完整语种直接使用自身文件，行为与改造前完全一致。
  const messages = isSummaryLocale(lang) ? deepMerge(en, raw) : raw;

  const t = (key: string): string => {
    const found = key
      .split('.')
      .reduce<any>((o, i) => (o == null ? undefined : o[i]), messages);
    return found ?? '';
  };
  return { lang, messages, t };
}

export function buildAlternates(path = ''): Record<string, string> {
  const base = 'https://odaibastatueofliberty.com';
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const out: Record<string, string> = {};
  for (const l of languagesList) {
    out[l] = `${base}/${l}${clean ? '/' + clean : ''}`;
  }
  out.xDefault = out[xDefaultLang];
  return out;
}

/**
 * 各语言版本下的实体名称集合。
 * 用于结构化数据 alternateName 多语言化，让引擎把「台场自由女神像 /
 * 오다이바 자유의 여신상 / Freiheitsstatue」等别名归并到同一个实体上。
 */
export function alternateEntityNames(): string[] {
  const names = Object.values(ui).flatMap((m: any) => [
    m?.meta?.officialName,
    m?.meta?.shortName,
  ]);
  return [...new Set(names.filter(Boolean) as string[])];
}

export function htmlLangAttr(lang: string): string {
  if (lang === 'zh') return 'zh-CN';
  return lang;
}
