import type { APIRoute } from 'astro';
import { languagesList, buildAlternates, xDefaultLang } from '../i18n/ui';

/**
 * 构建期生成 sitemap.xml。
 *
 * 原先 public/sitemap.xml 为手工维护，语种一增加就会漏掉 hreflang 交替链接
 * （而交替链接正是多语言站点的核心信号）。改为随语种列表自动生成，
 * 语种增减只需改 src/i18n/ui.ts，不会再出现 sitemap 与实际路由不一致。
 */
const LAST_MOD = new Date().toISOString().slice(0, 10);

interface PageDef {
  path: string;
  changefreq: string;
  /** 首页给高优先级，法务页保持低优先级 */
  homePriority: boolean;
}

const pages: PageDef[] = [
  { path: '', changefreq: 'weekly', homePriority: true },
  { path: 'privacy-policy', changefreq: 'yearly', homePriority: false },
  { path: 'terms-of-service', changefreq: 'yearly', homePriority: false },
  { path: 'cookie-settings', changefreq: 'yearly', homePriority: false },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function entry(loc: string, page: PageDef, lang: string): string {
  const alts = buildAlternates(page.path);
  const priority = page.homePriority ? (lang === xDefaultLang ? '1.0' : '0.9') : '0.3';
  const lines = [
    '  <url>',
    `    <loc>${esc(loc)}</loc>`,
    `    <lastmod>${LAST_MOD}</lastmod>`,
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ];
  for (const l of languagesList) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(alts[l])}" />`);
  }
  lines.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(alts.xDefault)}" />`,
  );
  lines.push('  </url>');
  return lines.join('\n');
}

export const GET: APIRoute = () => {
  const blocks: string[] = [];
  for (const page of pages) {
    const alts = buildAlternates(page.path);
    for (const lang of languagesList) {
      blocks.push(entry(alts[lang], page, lang));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${blocks.join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
