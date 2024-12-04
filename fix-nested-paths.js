import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixNestedPaths(dir, depth = 0) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixNestedPaths(filePath, depth + 1);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const prefix = '../'.repeat(depth);
      content = content.replace(/href="\.\.\//g, `href="${prefix}`);
      content = content.replace(/src="\.\.\//g, `src="${prefix}`);
      fs.writeFileSync(filePath, content);
    }
  }
}

fixNestedPaths(path.join(__dirname, 'out'));
