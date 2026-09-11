const fs = require('fs');

const pages = ['ja', 'en', 'zh', 'ko'];
for (const lang of pages) {
  const p = `dist/${lang}/index.html`;
  const h = fs.readFileSync(p, 'utf8');
  const ids = ['weather', 'amenities', 'timeline', 'legends', 'sources', 'location', 'transport'];
  const missing = ids.filter((i) => !h.includes(`id="${i}"`));
  const blocks = [...h.matchAll(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  const types = blocks.map((b) => JSON.parse(b[1])['@type']);
  console.log(
    '==', p,
    '\n   sections missing:', missing.length ? missing.join(',') : 'none',
    '\n   ld+json:', types.join(' + '),
    '\n   h1:', (h.match(/<h1/g) || []).length, 'h2:', (h.match(/<h2/g) || []).length, 'h3:', (h.match(/<h3/g) || []).length,
    '\n   srcset:', h.includes('-800.jpg 800w'),
    '| hero pill:', (h.match(/id="hero-wx-temp">([^<]*)</) || [])[1],
    '| wx temp:', (h.match(/id="wx-temp">([^<]*)</) || [])[1],
    '| wx days:', (h.match(/class="wx-day"/g) || []).length
  );
}

const ja = fs.readFileSync('dist/ja/index.html', 'utf8');
console.log('\n--- leak check (should all be false) ---');
for (const s of ['Open-Meteo', 'open-meteo', 'open_meteo', '无需密钥', '無鍵', '무료 API', 'no API key', 'API key', '免费天气接口', '无料天気', 'api.open-meteo']) {
  if (ja.includes(s)) console.log('   LEAK:', s);
}
console.log('   done');

console.log('\n--- h2 outline (ja) ---');
for (const m of ja.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)) {
  console.log('   •', m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

console.log('\n--- gallery files ---');
const files = fs.readdirSync('dist/gallery');
let total = 0;
for (const f of files) total += fs.statSync('dist/gallery/' + f).size;
console.log('   count:', files.length, '| size:', (total / 1048576).toFixed(2), 'MB');
console.log('   sample:', files.slice(0, 3).join(', '));

console.log('\n--- amenity cards ---');
console.log('   ja cards:', (ja.match(/aria-hidden="true">🚻|aria-hidden="true">🅿️|aria-hidden="true">🍽️|aria-hidden="true">🏨|aria-hidden="true">🛒|aria-hidden="true">⛽|aria-hidden="true">♿/g) || []).length);
console.log('   timeline nodes:', (ja.match(/class="tl-item"/g) || []).length, '| legend cards:', (ja.match(/class="lg-card"/g) || []).length);
