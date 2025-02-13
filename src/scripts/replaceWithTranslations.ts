import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function replaceTextWithTranslationKeys(
  content: string, 
  translations: Record<string, any>
): string {
  let newContent = content;
  
  // Find all translation keys and their values
  const translationMap = new Map<string, string>();
  function traverse(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        translationMap.set(value, fullKey);
      } else if (typeof value === 'object') {
        traverse(value, fullKey);
      }
    }
  }
  traverse(translations);

  // Replace the longest matches first to avoid partial replacements
  const sortedEntries = Array.from(translationMap.entries())
    .sort((a, b) => b[0].length - a[0].length);

  for (const [text, key] of sortedEntries) {
    // Replace exact matches with t() calls
    const regex = new RegExp(`"${text}"`, 'g');
    newContent = newContent.replace(regex, `{t("${key}")}`);
    
    const singleQuoteRegex = new RegExp(`'${text}'`, 'g');
    newContent = newContent.replace(singleQuoteRegex, `{t("${key}")}`);
  }

  return newContent;
}

try {
  const srcDir = path.join(process.cwd(), 'src');
  const files = await glob('**/*.{tsx,ts,jsx,js}', { cwd: srcDir });
  const translations = JSON.parse(
    await fs.promises.readFile(
      path.join(srcDir, 'locales', 'en.json'), 
      'utf8'
    )
  );

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    const content = await fs.promises.readFile(filePath, 'utf8');
    const newContent = replaceTextWithTranslationKeys(content, translations);
    
    if (content !== newContent) {
      await fs.promises.writeFile(filePath, newContent);
      console.log(`Updated translations in: ${file}`);
    }
  }
} catch (error) {
  console.error('Error:', error);
} 