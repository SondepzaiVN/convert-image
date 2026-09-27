import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "src", "site-content.json"), "utf8"));
const formats = { jpeg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF", heic: "HEIC" };
const info = {
  about: { title: "About Convert Image – Private Browser Image Utility", description: "Learn how Convert Image privately converts JPG, PNG, WebP, AVIF, and HEIC files in your browser.", h1: "A private, practical image utility", body: ["Convert Image is an independent browser-based utility for changing common raster image formats without an account or server upload.", "It supports JPG/JPEG, PNG, WebP, AVIF, and HEIC/HEIF as input and output. WebAssembly codecs run in a Web Worker on your device."] },
  "privacy-policy": { title: "Privacy Policy | Convert Image", description: "How Convert Image handles local image processing, browser storage, hosting logs, cookies, and future Google advertising.", h1: "Privacy Policy", body: ["Selected images are read and converted locally. The application does not upload image contents, keep server copies, or create server-side download URLs.", "Local storage holds the converter language preference. If Google AdSense is enabled later, Google and its partners may use cookies subject to applicable consent requirements."] },
  terms: { title: "Terms of Service | Convert Image", description: "Terms for using the free Convert Image browser-based image conversion utility.", h1: "Terms of Service", body: ["Use the tool only with files you own or are authorized to process. You remain responsible for original backups and checking converted output.", "The service is provided as is and may not work with every image, device, or browser."] },
  contact: { title: "Contact Convert Image", description: "Report conversion bugs, request improvements, or contact the Convert Image project through GitHub.", h1: "Questions, bugs, or format feedback?", body: ["The public GitHub repository is the current contact channel.", "Do not post private or confidential images in a public issue. Describe the format, dimensions, size, browser, and error instead."] },
};

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const links = data.conversions.map((p) => `<a href="/${p.slug}">${formats[p.from]} to ${formats[p.to]}</a>`).join("");
const footer = `<footer><nav aria-label="Footer"><a href="/">Convert Image</a>${links}<a href="/about">About</a><a href="/privacy-policy">Privacy Policy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></nav></footer>`;

function shell({ slug = "", title, description, h1, content, noindex = false, schema }) {
  const url = `${data.siteUrl}${slug ? `/${slug}` : "/"}`;
  const robots = noindex ? "noindex, follow" : "index, follow, max-image-preview:large";
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}"><meta name="theme-color" content="#101828"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Convert Image"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23101828'/%3E%3Cpath d='M8 11h12l-3-3m3 3-3 3M24 21H12l3 3m-3-3 3-3' fill='none' stroke='%2369E6A6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"><title>${esc(title)}</title>${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>` : ""}</head><body><div id="root"><header><nav aria-label="Primary"><a href="/">Convert Image</a><a href="/#popular-title">Tools</a><a href="/#supported-formats">Formats</a><a href="/about">About</a></nav></header><main><p>FREE · PRIVATE · NO ACCOUNT</p><h1>${esc(h1)}</h1>${content}</main>${footer}</div><script type="module" src="/src/main.tsx"></script></body></html>`;
}

function writePage(slug, html) {
  const path = slug ? join(root, `${slug}.html`) : join(root, "index.html");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

const homeContent = `<p>Convert JPG, PNG, WebP, AVIF, and HEIC images in your browser. Choose an output format, add files, convert, and download.</p><section aria-label="Image converter"><h2>Image converter</h2><p>JavaScript is required for local image conversion. Your images are not uploaded to this website.</p></section><section><h2 id="popular-title">Popular conversions</h2>${links}</section><section><h2>How it works</h2><ol><li>Add images.</li><li>Choose the output format.</li><li>Convert locally.</li><li>Download the result.</li></ol></section><section><h2 id="supported-formats">Supported formats</h2><p>JPG/JPEG, PNG, WebP, AVIF, and HEIC/HEIF are supported as input and output.</p></section><section><h2>Frequently asked questions</h2><h3>Are images uploaded?</h3><p>No. Files are processed locally in a browser worker.</p><h3>Can I convert multiple images?</h3><p>Yes, up to 20 files per batch and 50 MB per file.</p></section>`;
writePage("", shell({ title: "Free Online Image Converter – Private & Fast | Convert Image", description: "Convert JPG, PNG, WebP, AVIF, and HEIC images free in your browser. Private batch conversion with no uploads or account.", h1: "Free Online Image Converter", content: homeContent, schema: { "@context": "https://schema.org", "@type": "WebApplication", name: "Convert Image", url: `${data.siteUrl}/`, applicationCategory: "MultimediaApplication", operatingSystem: "Any modern browser", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: "Private browser-based image format converter." } }));

for (const page of data.conversions) {
  const from = formats[page.from]; const to = formats[page.to];
  const body = `<p>${esc(page.intro)}</p><section aria-label="Image converter"><h2>${from} to ${to} conversion tool</h2><p>Add files, confirm ${to}, convert locally, and download.</p></section><section><h2>How to convert ${from} to ${to}</h2><ol><li>Add ${from} images.</li><li>Confirm ${to} output.</li><li>Convert on your device.</li><li>Download files or a ZIP.</li></ol></section><section><h2>${esc(page.fromTitle)}</h2><p>${esc(page.fromBody)}</p><h2>${esc(page.toTitle)}</h2><p>${esc(page.toBody)}</p></section><section><h2>When should I convert ${from} to ${to}?</h2><ul>${page.when.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p><strong>Keep in mind:</strong> ${esc(page.note)}</p></section><section><h2>${from} vs ${to}</h2><table><thead><tr><th>Feature</th><th>${from}</th><th>${to}</th></tr></thead><tbody>${page.comparison.map(([f,a,b]) => `<tr><th>${esc(f)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></section><section><h2>Frequently asked questions</h2>${page.faqs.map(([q,a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>`;
  writePage(page.slug, shell({ slug: page.slug, title: page.title, description: page.description, h1: page.h1, content: body, schema: [{ "@context": "https://schema.org", "@type": "WebApplication", name: page.h1, url: `${data.siteUrl}/${page.slug}`, applicationCategory: "MultimediaApplication", operatingSystem: "Any modern browser", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Image converter", item: `${data.siteUrl}/` }, { "@type": "ListItem", position: 2, name: page.h1, item: `${data.siteUrl}/${page.slug}` }] }] }));
}

for (const [slug, page] of Object.entries(info)) {
  const body = `<p>${esc(page.body[0])}</p><section><h2>Details</h2><p>${esc(page.body[1])}</p></section>`;
  writePage(slug, shell({ slug, title: page.title, description: page.description, h1: page.h1, content: body }));
}

writeFileSync(join(root, "404.html"), shell({ title: "Page Not Found | Convert Image", description: "The requested page could not be found.", h1: "Page not found", content: `<p>The address may be incorrect. <a href="/">Open the image converter</a>.</p>`, noindex: true }));
const urls = ["", ...data.conversions.map((p) => p.slug), ...Object.keys(info)];
writeFileSync(join(root, "public", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((slug) => `  <url><loc>${data.siteUrl}${slug ? `/${slug}` : "/"}</loc><changefreq>${slug ? "monthly" : "weekly"}</changefreq><priority>${slug ? "0.8" : "1.0"}</priority></url>`).join("\n")}\n</urlset>\n`);
