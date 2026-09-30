import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');
const publicDir = path.join(__dirname, '../public');

let hasError = false;

function getTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

function checkImages() {
  const tsxFiles = getTsxFiles(srcDir);

  for (const filePath of tsxFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /"(\/images\/[^\"]+\.(?:jpg|png|svg|jpeg|webp)|\/university-logos\/[^\"]+\.(?:jpg|png|svg|jpeg|webp))"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const imgPath = match[1];
      const relativePath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
      const fullPath = path.join(publicDir, relativePath);

      if (!fs.existsSync(fullPath)) {
        console.error(`❌ ERROR: Image not found: ${imgPath} (referenced in ${path.relative(path.join(__dirname, '..'), filePath)})`);
        hasError = true;
      } else {
        console.log(`✅ OK: ${imgPath}`);
      }
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log('All referenced images exist in public/!');
  }
}

checkImages();
