const fs = require('fs');

const strip = (s) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

for (const lang of ['ja', 'zh', 'en', 'ko']) {
  const html = fs.readFileSync(`dist/${lang}/index.html`, 'utf8');
  const m = html.match(/<section id="weather"[\s\S]*?<\/section>/);
  console.log('\n================', lang, '================');
  if (!m) {
    console.log('!! weather section missing');
    continue;
  }
  const sec = m[0];
  const grab = (id) => (sec.match(new RegExp(`id="${id}"[^>]*>([^<]*)<`)) || [])[1];

  console.log(
    `now: ${grab('wx-temp')}°C ${grab('wx-desc')} | 体感 ${grab('wx-feels')} | 雨率 ${grab('wx-prob')}% | 风 ${grab('wx-wind')}m/s(${grab('wx-wind-force')}) | 湿 ${grab('wx-humidity')}% | uv ${grab('wx-uv')} | 视 ${grab('wx-visibility')} | 日出 ${grab('wx-sunrise')} 日落 ${grab('wx-sunset')}`,
  );
  console.log(
    `sea: ${grab('wx-sea-temp')}°C | wave ${grab('wx-wave')}m | high ${grab('wx-tide-high')}(${grab('wx-tide-high-h')}) | low ${grab('wx-tide-low')}(${grab('wx-tide-low-h')}) | pm2.5 ${grab('wx-pm25')} | aqi ${grab('wx-aqi')}`,
  );

  const alerts = [...sec.matchAll(/class="wx-alert-text">([\s\S]*?)<\/p>/g)].map((x) => strip(x[1]));
  console.log(`alerts(${alerts.length}):`);
  alerts.forEach((a) => console.log('   ⚠', a));
  if (sec.includes('wx-clear')) console.log('   ✅ 无预警提示行已渲染');

  const chips = [...sec.matchAll(/class="wx-chip[^"]*">([\s\S]*?)<\/span>/g)].map((x) => strip(x[1]));
  console.log('chips:', chips.join(' | '));

  const lists = [...sec.matchAll(/<ul class="wx-col-list">([\s\S]*?)<\/ul>/g)].map((x) =>
    [...x[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => strip(li[1])),
  );
  console.log('👕 穿搭:', (lists[0] || []).map((x) => strip(x)).join(' ／ '));
  console.log('🗺️ 安排:', (lists[1] || []).map((x) => strip(x)).join(' ／ '));
  const pack = [...sec.matchAll(/class="wx-pack-item">([\s\S]*?)<\/span>/g)].map((x) => strip(x[1]));
  console.log('🎒 物品:', pack.join(' / '));

  console.log(
    `hourly ${(sec.match(/class="wx-hour"/g) || []).length} | daily ${(sec.match(/class="wx-day"/g) || []).length} | dayTips ${(sec.match(/class="wx-day-tip"/g) || []).length}`,
  );
  const dayTips = [...sec.matchAll(/class="wx-day-tip">([\s\S]*?)<\/span>/g)].map((x) => strip(x[1]));
  console.log('   day tips:', dayTips.join(' / '));

  const path = (sec.match(/class="wx-tide-line" d="([^"]*)"/) || [, ''])[1];
  console.log(
    `tide sparkline: path ${path ? `${path.length} chars` : 'MISSING'} | dots ${
      (sec.match(/wx-tide-dot/g) || []).length
    }`,
  );
}

/* 泄露检查：正文可见文本不得出现任何数据来源 / 密钥说明 */
console.log('\n--- leak check (可见文本) ---');
const banned = [
  'Open-Meteo',
  'open-meteo',
  'open_meteo',
  'openmeteo',
  '无需密钥',
  '無鍵',
  'API キー',
  'APIキー',
  'API key',
  'apikey',
  '无料 API',
  '免費天氣',
  '免费天气',
  '免费接口',
];
let leak = false;
for (const lang of ['ja', 'zh', 'en', 'ko']) {
  const visible = fs
    .readFileSync(`dist/${lang}/index.html`, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  for (const b of banned) {
    if (visible.includes(b)) {
      leak = true;
      const i = visible.indexOf(b);
      console.log(`!! ${lang}: "${b}" →`, visible.slice(Math.max(0, i - 70), i + 70).replace(/\s+/g, ' '));
    }
  }
}
console.log(leak ? 'LEAK FOUND' : 'clean: 页面正文无数据来源 / 密钥相关字样');
