import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = ['Recoleta-Bold', 'Berthold-Regular', 'Berthold-Medium', 'Berthold-Bold'];
const release = process.argv.includes('--release') ||
  (process.argv.includes('--build') && process.env.EAS_BUILD_PROFILE !== 'development');
const available = required.concat('Recoleta-SemiBold')
  .filter((name) => existsSync(resolve(root, 'mobile/assets/fonts', `${name}.otf`)));
const missing = required.filter((name) => !available.includes(name));
if (release && missing.length) {
  console.error(`Missing licensed fonts: ${missing.join(', ')}. Add the licensed OTF files before release.`);
  process.exit(1);
}
if (process.argv.includes('--prepare')) {
  const sources = available.map((name) =>
    `  '${name}': require('../../assets/fonts/${name}.otf'),`);
  writeFileSync(resolve(root, 'mobile/src/theme/fontAssets.ts'),
    "import type { FontSource } from 'expo-font';\n\n" +
    '// Rebuilt by check-fonts.mjs from licensed files before starting Metro or EAS.\n' +
    `export const fontAssets: Record<string, FontSource> = {${sources.length ? '\n' + sources.join('\n') + '\n' : ''}};\n`);
}

