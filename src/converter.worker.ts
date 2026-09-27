/// <reference lib="webworker" />

import { avif, heic, jpeg, png, webp } from "icodec";

type Format = "jpeg" | "png" | "webp" | "avif" | "heic";
type ConvertRequest = { id: string; buffer: ArrayBuffer; from: Format; to: Format; quality: number; language: "vi" | "en" };

const codecs = { jpeg, png, webp, avif, heic } as const;
const decoderReady = new Set<Format>();
const encoderReady = new Set<Format>();

function encoderOptions(format: Format, quality: number) {
  const codec = codecs[format] as typeof codecs[Format] & { defaultOptions?: Record<string, unknown> };
  const options: Record<string, unknown> = { ...(codec.defaultOptions ?? {}) };
  const normalized = Math.max(1, Math.min(100, quality));
  for (const key of Object.keys(options)) {
    const lower = key.toLowerCase();
    if (lower === "quality") options[key] = normalized;
    if (lower.includes("quantizer") || lower === "cqlevel") options[key] = Math.round(63 - normalized * 0.63);
  }
  return options;
}

self.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const { id, buffer, from, to, quality, language } = event.data;
  try {
    const source = codecs[from];
    const target = codecs[to];
    if (!decoderReady.has(from)) {
      await source.loadDecoder();
      decoderReady.add(from);
    }
    const image = source.decode(new Uint8Array(buffer));
    if (!image) throw new Error(language === "en" ? "The image could not be decoded." : "Không thể giải mã nội dung ảnh.");
    if (!encoderReady.has(to)) {
      await target.loadEncoder();
      encoderReady.add(to);
    }
    // JPEG has no alpha channel. Composite transparent pixels onto white so the
    // result is predictable instead of turning transparent areas black.
    let encodable = image;
    if (to === "jpeg" && image.data.length === image.width * image.height * 4) {
      const flattened = new Uint8ClampedArray(image.data.length);
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const alpha = image.data[offset + 3] / 255;
        flattened[offset] = Math.round(image.data[offset] * alpha + 255 * (1 - alpha));
        flattened[offset + 1] = Math.round(image.data[offset + 1] * alpha + 255 * (1 - alpha));
        flattened[offset + 2] = Math.round(image.data[offset + 2] * alpha + 255 * (1 - alpha));
        flattened[offset + 3] = 255;
      }
      encodable = { ...image, data: flattened };
    }
    const output = target.encode(encodable as never, encoderOptions(to, quality) as never);
    const result = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
    self.postMessage({ id, ok: true, buffer: result, width: image.width, height: image.height }, { transfer: [result] });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : language === "en" ? "Unknown conversion error." : "Lỗi chuyển đổi không xác định." });
  }
};

export {};
