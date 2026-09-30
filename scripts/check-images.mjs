import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../src/data');
const publicDir = path.join(__dirname, '../public');

let hasError = false;

function checkImages() {
  const files = fs.readdirSync(dataDir);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(dataDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const stringContent = JSON.stringify(content);
    
    // Find anything that looks like an image path
    const regex = /"(\/[^"]+\.(?:jpg|png|svg|jpeg|webp))"/g;
    let match;
    
    while ((match = regex.exec(stringContent)) !== null) {
      const imgPath = match[1];
      
      // Remove leading slash to get path relative to public folder
      const relativePath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
      const fullPath = path.join(publicDir, relativePath);
      
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ ERROR: Image not found: ${imgPath} (referenced in ${file})`);
        hasError = true;
      } else {
        console.log(`✅ OK: ${imgPath}`);
      }
    }
  }
  
  if (hasError) {
    process.exit(1);
  } else {
    console.log("All referenced JSON images exist in public/!");
  }
}

checkImages();
