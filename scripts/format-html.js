import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import prettier from 'prettier';
import path from 'path';

async function formatHtmlFiles() {
  try {
    const files = await glob('out/**/**.html');
    
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const formatted = await prettier.format(content, {
        parser: 'html',
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        singleQuote: false,
        bracketSameLine: true,
        htmlWhitespaceSensitivity: 'ignore'
      });
      
      await writeFile(file, formatted);
    }
    
    console.log('HTML files formatted successfully');
  } catch (error) {
    console.error('Error formatting HTML files:', error);
  }
}

formatHtmlFiles(); 