import * as fs from 'fs/promises';
import * as path from 'path';
import { globSync } from 'glob';

interface TranslationMap {
  [key: string]: string | TranslationMap;
}

function extractTextFromJSX(content: string): string[] {
  const texts: string[] = [];
  
  // Match text between quotes
  const quotedText = content.match(/(["'])((?:(?!\1).)*)\1/g) || [];
  
  // Match text between JSX tags
  const jsxText = content.match(/>(.*?)</g) || [];
  
  // Clean up and filter the matches
  const allMatches = [...quotedText, ...jsxText]
    .map(text => text.replace(/[>"'<]/g, '').trim())
    .filter(text => 
      text && 
      text.length > 1 && 
      /[a-zA-Z]/.test(text) && 
      !text.includes('{') && 
      !text.includes('}}') &&
      !text.startsWith('import') &&
      !text.startsWith('export') &&
      !text.startsWith('function')
    );
    
  return Array.from(new Set(allMatches));
}

function createTranslationKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}

function addToTranslationMap(
  map: TranslationMap, 
  key: string, 
  text: string
): void {
  const parts = key.split('.');
  let current = map;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part] as TranslationMap;
  }
  
  const lastPart = parts[parts.length - 1];
  current[lastPart] = text;
}

function findKeyByValue(obj: TranslationMap, value: string): string | null {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val === value) {
      return key;
    }
    if (typeof val === 'object') {
      const found = findKeyByValue(val, value);
      if (found) return `${key}.${found}`;
    }
  }
  return null;
}

async function main() {
  try {
    const srcDir = path.join(process.cwd(), 'src');
    const files = globSync('**/*.{tsx,ts,jsx,js}', { cwd: srcDir });
    
    const translations: TranslationMap = {};
    const existingTranslations = JSON.parse(
      await fs.readFile(
        path.join(srcDir, 'locales', 'en.json'), 
        'utf8'
      )
    );

    for (const file of files) {
      const content = await fs.readFile(path.join(srcDir, file), 'utf8');
      const extractedTexts = extractTextFromJSX(content);
      
      for (const text of extractedTexts) {
        const key = createTranslationKey(text);
        if (!findKeyByValue(existingTranslations, text)) {
          addToTranslationMap(translations, key, text);
        }
      }
    }

    const mergedTranslations = {
      ...existingTranslations,
      ...translations
    };

    await fs.writeFile(
      path.join(srcDir, 'locales', 'en.json'),
      JSON.stringify(mergedTranslations, null, 2)
    );
    
    await fs.writeFile(
      path.join(srcDir, 'locales', 'fr.json'),
      JSON.stringify(mergedTranslations, null, 2)
    );
    
    console.log('Translations extracted successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 