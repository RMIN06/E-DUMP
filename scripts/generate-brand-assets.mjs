import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { colors } from "../mobile/src/theme/tokens.ts";
import { brand } from "../mobile/src/theme/brand.ts";

const require = createRequire(
  new URL("../mobile/package.json", import.meta.url),
);
const Jimp = require("jimp-compact");
const destination = fileURLToPath(
  new URL("../mobile/assets/brand/", import.meta.url),
);
await mkdir(destination, { recursive: true });

function contains(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

async function image(name, size, markSize, background, monochrome = false) {
  const output = new Jimp(size, size, background);
  const inset = (size - markSize) / 2;
  for (const layer of brand.layers) {
    if (monochrome && ["ink", "olive"].includes(layer.tone)) continue;
    const points = layer.points
      .split(" ")
      .map((pair) => pair.split(",").map(Number));
    const color = monochrome
      ? 0xffffffff
      : Jimp.cssColorToHex(colors[layer.tone]);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (
          contains(
            ((x - inset) * 64) / markSize,
            ((y - inset) * 64) / markSize,
            points,
          )
        )
          output.setPixelColor(color, x, y);
  }
  await output.writeAsync(`${destination}/${name}.png`);
}

await image("icon", 1024, 640, Jimp.cssColorToHex(colors.ink));
await image("adaptive-icon", 1024, 640, 0);
await image("splash", 256, 224, 0);
await image("notification", 96, 80, 0, true);
