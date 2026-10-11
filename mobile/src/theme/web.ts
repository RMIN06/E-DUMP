export const webViewport =
  "width=device-width, initial-scale=1, viewport-fit=cover";
export const webReset = `
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
html, body, #root { width: 100%; min-width: 0; min-height: 0; }
html, body { height: 100%; overflow: hidden; }
@supports (height: 100dvh) {
  html, body, #root { height: 100dvh; }
}
`;
