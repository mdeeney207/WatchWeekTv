// lib/imagePlaceholders.ts
export function shimmer(w: number, h: number) {
  return `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#111" offset="20%" />
        <stop stop-color="#1b1b1b" offset="50%" />
        <stop stop-color="#111" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#111" />
    <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite" />
  </svg>`;
}

export function toBase64(str: string) {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return window.btoa(str);
}

export function shimmerBlurDataURL(w: number, h: number) {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;
}