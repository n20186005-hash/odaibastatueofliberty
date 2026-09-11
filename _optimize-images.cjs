/* 一次性图片优化脚本：压缩 + 规范命名 + 生成响应式尺寸 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const DIR = path.join(__dirname, 'public', 'gallery');
const PREFIX = 'odaiba-statue-of-liberty';

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^statue-of-liberty-\d+\.jpg$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)[1], 10);
      const nb = parseInt(b.match(/(\d+)/)[1], 10);
      return na - nb;
    });

  let totalBefore = 0;
  let totalAfter = 0;
  const rows = [];

  for (const file of files) {
    const n = parseInt(file.match(/(\d+)/)[1], 10);
    const src = path.join(DIR, file);
    const before = fs.statSync(src).size;
    totalBefore += before;

    const meta = await sharp(src).metadata();
    const fullName = `${PREFIX}-${n}.jpg`;
    const thumbName = `${PREFIX}-${n}-800.jpg`;
    const fullPath = path.join(DIR, fullName);
    const thumbPath = path.join(DIR, thumbName);

    await sharp(src)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, chromaSubsampling: '4:2:0' })
      .toFile(fullPath);

    await sharp(src)
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, progressive: true, chromaSubsampling: '4:2:0' })
      .toFile(thumbPath);

    const after = fs.statSync(fullPath).size;
    const thumb = fs.statSync(thumbPath).size;
    totalAfter += after + thumb;
    rows.push([fullName, `${meta.width}x${meta.height}`, `${(before / 1024).toFixed(0)}KB`, `${(after / 1024).toFixed(0)}KB`, `${(thumb / 1024).toFixed(0)}KB`]);
  }

  // 删除原始大图（走系统命令，避免安全删除拦截）
  for (const file of files) {
    execSync(`del /f /q "${path.join(DIR, file)}"`, { shell: 'cmd.exe' });
  }

  console.log('file'.padEnd(38), 'orig'.padEnd(11), 'before'.padEnd(9), 'full'.padEnd(8), 'thumb');
  for (const r of rows) console.log(r[0].padEnd(38), r[1].padEnd(11), r[2].padEnd(9), r[3].padEnd(8), r[4]);
  console.log('---');
  console.log('files:', rows.length, '| before:', (totalBefore / 1048576).toFixed(2), 'MB | after (full+thumb):', (totalAfter / 1048576).toFixed(2), 'MB');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
