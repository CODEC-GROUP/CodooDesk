import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function copySplashToOut() {
  const sourcePath = path.join(__dirname, '../src/renderer/splash');
  const destPath = path.join(__dirname, '../out/splash');

  try {
    // Create splash directory in out if it doesn't exist
    await fs.mkdir(destPath, { recursive: true });

    // Copy splash.html
    await fs.copyFile(
      path.join(sourcePath, 'splash.html'),
      path.join(destPath, 'splash.html')
    );

    console.log('Splash screen copied to out directory successfully');
  } catch (error) {
    console.error('Error copying splash screen:', error);
  }
}

copySplashToOut(); 