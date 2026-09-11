const fs = require('fs');

for (const lang of ['ja', 'zh', 'en', 'ko']) {
  const h = fs.readFileSync(`dist/${lang}/index.html`, 'utf8');
  const pills = [...h.matchAll(/<span class="live-placeholder" id="(hero-wx-[^"]+)"[^>]*>([^<]*)<\/span>/g)];
  const navBox = h.match(/<div class="section-nav"[\s\S]*?<\/div>\s*<\/div>/);
  const links = navBox
    ? [...navBox[0].matchAll(/<a href="([^"]+)" class="section-nav-link">([^<]+)<\/a>/g)].map(
        (m) => `${m[2]}→${m[1]}`,
      )
    : [];
  console.log(lang, '| hero pills:', pills.map((p) => `${p[1]}=${p[2]}`).join(' , ') || 'none');
  console.log('   section nav:', links.join(' | '));
}
