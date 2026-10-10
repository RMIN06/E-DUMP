#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../mobile"
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
let failures = 0;
const report = (file, message) => { console.error(`SLOP: ${file}: ${message}`); failures++; };
const approved = new Set([
  'expo', 'expo-router', 'react-native', 'typescript', 'expo-dev-client', 'expo-constants',
  '@tanstack/react-query', '@tanstack/query-async-storage-persister', 'zustand',
  'react-hook-form', 'zod', '@hookform/resolvers', 'openapi-typescript',
  'expo-secure-store', 'expo-notifications', 'expo-device', 'expo-document-picker',
  'expo-image-picker', 'expo-file-system', 'expo-sharing', 'expo-intent-launcher',
  'expo-image', 'react-native-reanimated', 'react-native-gesture-handler',
  'lucide-react-native', 'react-native-svg', 'expo-font', 'date-fns', 'date-fns-tz',
  '@react-native-async-storage/async-storage', 'eslint', 'prettier', 'jest', 'jest-expo',
  // Owner approved the Expo-compatible native due-date picker for M4.
  '@react-native-community/datetimepicker',
  '@testing-library/react-native', 'maestro',
  // Owner approved the required Expo peers and lint/test support packages.
  'react-dom', 'react-native-web', 'react', 'expo-linking', 'react-native-screens', 'react-native-safe-area-context',
  'expo-splash-screen', 'expo-system-ui', 'expo-build-properties', 'expo-asset', 'react-native-worklets',
  '@expo/metro-runtime', '@expo/log-box', '@types/react', '@types/jest', '@types/node',
  'eslint-config-expo', 'react-test-renderer', 'test-renderer', '@react-native/jest-preset',
]);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (!approved.has(name)) report('package.json', `dependency outside allowlist: ${name}`);
}
const checks = [
  ['shadows/elevation', /shadow(Color|Offset|Opacity|Radius)|\belevation\s*:|boxShadow|textShadow/],
  ['gradients/blur', /expo-linear-gradient|LinearGradient|RadialGradient|expo-blur|BlurView|blurRadius|backdropFilter/],
  ['grid layouts', /numColumns|display\s*:\s*['"]grid|gridTemplate/],
  ['illustration libraries', /lottie|react-native-svg-transformer/],
  ['large radii', /borderRadius\s*:\s*(?:[5-9]|[1-9][0-9]+)\b/],
  ['emoji', /[\p{Extended_Pictographic}\u2600-\u27BF]/u],
  ['banned copy/markers', /\b(?:oops|awesome|seamless|powerful|supercharge|unlock|elevate|journey|welcome back|let's get started|lorem ipsum|sample item|TODO|FIXME)\b/i],
  ['direct dimensions', /Dimensions\s*\.\s*get\s*\(/],
  ['debug output', /console\.(?:log|debug)|\bdebugger\b/],
];
const borderFiles = new Set(['Divider.tsx', 'Field.tsx', 'Sheet.tsx', 'TabLabel.tsx']);
function scan(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.posix.join(folder, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const [message, pattern] of checks) if (pattern.test(source)) report(file, message);
    if (file !== 'src/theme/tokens.ts' && /#[0-9a-f]{3,8}\b|rgba?\(/i.test(source)) {
      report(file, 'colour literals outside tokens.ts');
    }
    if (!file.startsWith('src/theme/') && /\b(?:fontSize|lineHeight|letterSpacing|padding\w*|margin\w*|gap|rowGap|columnGap)\s*:\s*-?\d/.test(source)) {
      report(file, 'type/spacing literals outside theme');
    }
    if (/\bborder(?:Width|Color)\s*:/.test(source) && !(folder === 'src/components' && borderFiles.has(entry.name))) {
      report(file, 'borders on containers');
    }
    if ((file.startsWith('app/') || file.startsWith('src/features/')) && /\b(?:width\s*:\s*\d{3,}|height\s*:\s*\d{2,})\b/.test(source)) {
      report(file, 'fixed screen/feature dimensions');
    }
    if (/position\s*:\s*['"]absolute/.test(source) && !file.endsWith('/Sheet.tsx') && !file.endsWith('/TabLabel.tsx') && !file.endsWith('/FilterText.tsx') && file !== 'app/(tabs)/_layout.tsx') {
      report(file, 'absolute positioning');
    }
  }
}
scan('src');
scan('app');
if (failures) process.exit(1);
console.log('Slop check passed.');
NODE
