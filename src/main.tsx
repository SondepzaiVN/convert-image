import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { ArrowRightLeft, Check, Download, FileImage, FolderArchive, ImagePlus, Languages, LoaderCircle, LockKeyhole, RotateCcw, ShieldCheck, Trash2, X } from "lucide-react";
import "./styles.css";

type Format = "jpeg" | "png" | "webp" | "avif" | "heic";
type Status = "waiting" | "converting" | "done" | "error";
type Language = "vi" | "en";
type ImageItem = { id: string; file: File; from: Format; status: Status; output?: Blob; outputName?: string; width?: number; height?: number; error?: string };
type WorkerReply = { id: string; ok: boolean; buffer?: ArrayBuffer; width?: number; height?: number; error?: string };
type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global { interface Document { modelContext?: ModelContext } }

const FORMAT_META: Record<Format, { label: string; extension: string; mime: string }> = {
  jpeg: { label: "JPG", extension: "jpg", mime: "image/jpeg" },
  png: { label: "PNG", extension: "png", mime: "image/png" },
  webp: { label: "WebP", extension: "webp", mime: "image/webp" },
  avif: { label: "AVIF", extension: "avif", mime: "image/avif" },
  heic: { label: "HEIC", extension: "heic", mime: "image/heic" },
};
const FORMAT_ORDER = Object.keys(FORMAT_META) as Format[];

const copy = {
  vi: {
    siteName: "Chuyển đổi định dạng ảnh",
    home: "trang chủ",
    privacyPill: "Ảnh không rời khỏi thiết bị",
    eyebrow: "MÃ NGUỒN MỞ · MIỄN PHÍ · KHÔNG GIỚI HẠN LƯỢT",
    input: "Định dạng đầu vào",
    auto: "TỰ ĐỘNG NHẬN DIỆN",
    output: "Chuyển thành",
    outputAria: "Định dạng đầu ra",
    converterAria: "Bộ chuyển đổi ảnh",
    drop: "Thả ảnh vào đây",
    or: "hoặc",
    choose: "chọn ảnh từ máy",
    unsupported: (count: number) => `${count} tệp không thuộc các định dạng đang hỗ trợ.`,
    queue: "Hàng đợi",
    images: (count: number) => `${count} ảnh`,
    clear: "Xóa tất cả",
    waiting: "Chờ xử lý",
    converting: "Đang đổi",
    done: "Hoàn tất",
    error: "Có lỗi",
    download: "Tải",
    remove: "Xóa",
    quality: "Chất lượng",
    lossless: "Không mất dữ liệu",
    zip: "Tải ZIP",
    again: "Chuyển lại",
    progress: (value: number) => `Đang chuyển ${value}%`,
    convertTo: (format: string) => `Chuyển sang ${format}`,
    localTitle: "Xử lý cục bộ",
    localText: "Không tải ảnh lên máy chủ",
    formatsTitle: "Đầu vào & đầu ra",
    formatsText: "Năm định dạng đều được hỗ trợ",
    batchTitle: "Chuyển hàng loạt",
    batchText: "Tải toàn bộ bằng một tệp ZIP",
    trustAria: "Thông tin quyền riêng tư",
    footerProduct: "Công cụ ảnh riêng tư",
    footerTech: "Codec chạy bằng WebAssembly trên thiết bị của bạn",
    workerNotReady: "Bộ chuyển đổi chưa sẵn sàng.",
    conversionFailed: "Không thể chuyển đổi ảnh.",
    webToolTitle: "Chọn định dạng đầu ra",
    webToolDescription: "Chọn JPG, PNG, WebP, AVIF hoặc HEIC làm định dạng đầu ra hiển thị trong bộ chuyển đổi.",
    invalidFormat: "Định dạng đầu ra không hợp lệ.",
  },
  en: {
    siteName: "Image format converter",
    home: "home",
    privacyPill: "Images never leave your device",
    eyebrow: "OPEN SOURCE · FREE · UNLIMITED CONVERSIONS",
    input: "Input format",
    auto: "AUTO-DETECT",
    output: "Convert to",
    outputAria: "Output format",
    converterAria: "Image converter",
    drop: "Drop images here",
    or: "or",
    choose: "choose images from your device",
    unsupported: (count: number) => `${count} file${count === 1 ? " is" : "s are"} not supported.`,
    queue: "Queue",
    images: (count: number) => `${count} image${count === 1 ? "" : "s"}`,
    clear: "Clear all",
    waiting: "Waiting",
    converting: "Converting",
    done: "Complete",
    error: "Error",
    download: "Download",
    remove: "Remove",
    quality: "Quality",
    lossless: "Lossless",
    zip: "Download ZIP",
    again: "Convert again",
    progress: (value: number) => `Converting ${value}%`,
    convertTo: (format: string) => `Convert to ${format}`,
    localTitle: "Local processing",
    localText: "Nothing is uploaded to a server",
    formatsTitle: "Input & output",
    formatsText: "All five formats are supported",
    batchTitle: "Batch conversion",
    batchText: "Download everything as one ZIP",
    trustAria: "Privacy information",
    footerProduct: "Private image utility",
    footerTech: "Codecs run with WebAssembly on your device",
    workerNotReady: "The converter is not ready yet.",
    conversionFailed: "The image could not be converted.",
    webToolTitle: "Choose output format",
    webToolDescription: "Choose JPG, PNG, WebP, AVIF or HEIC as the output format shown in the converter.",
    invalidFormat: "Invalid output format.",
  },
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

function readAscii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

async function detectFormat(file: File): Promise<Format | null> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (readAscii(bytes, 1, 3) === "PNG") return "png";
  if (readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP") return "webp";
  if (readAscii(bytes, 4, 4) === "ftyp") {
    const brand = readAscii(bytes, 8, 4).toLowerCase();
    if (["avif", "avis"].includes(brand)) return "avif";
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "heic";
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "jpeg";
  if (extension && FORMAT_ORDER.includes(extension as Format)) return extension as Format;
  if (extension === "heif") return "heic";
  return null;
}

function outputName(name: string, format: Format) {
  const base = name.replace(/\.[^.]+$/, "") || name;
  return `${base}.${FORMAT_META[format].extension}`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem("convert-image-language");
    if (saved === "vi" || saved === "en") return saved;
    return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
  });
  const [items, setItems] = useState<ImageItem[]>([]);
  const [target, setTarget] = useState<Format>("png");
  const [quality, setQuality] = useState(86);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const text = copy[language];

  const resetResults = useCallback((newTarget: Format) => {
    setTarget(newTarget);
    setItems((current) => current.map((item) => ({ ...item, status: "waiting", output: undefined, outputName: undefined, error: undefined })));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = text.siteName;
    window.localStorage.setItem("convert-image-language", language);
  }, [language, text.siteName]);

  useEffect(() => {
    const worker = new Worker(new URL("./converter.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "set_output_format",
      title: text.webToolTitle,
      description: text.webToolDescription,
      inputSchema: { type: "object", properties: { format: { type: "string", enum: FORMAT_ORDER } }, required: ["format"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const format = (input as { format?: string })?.format;
        if (!FORMAT_ORDER.includes(format as Format)) throw new Error(text.invalidFormat);
        resetResults(format as Format);
        return { selectedFormat: format };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [resetResults, text.invalidFormat, text.webToolDescription, text.webToolTitle]);

  const doneItems = useMemo(() => items.filter((item) => item.status === "done" && item.output), [items]);
  const progress = items.length ? Math.round((doneItems.length / items.length) * 100) : 0;

  const addFiles = useCallback(async (files: File[]) => {
    setNotice("");
    const next: ImageItem[] = [];
    let unsupported = 0;
    for (const file of files) {
      const from = await detectFormat(file);
      if (!from) { unsupported += 1; continue; }
      next.push({ id: crypto.randomUUID(), file, from, status: "waiting" });
    }
    setItems((current) => [...current, ...next]);
    if (unsupported) setNotice(copy[language].unsupported(unsupported));
  }, [language]);

  const runWorker = useCallback((item: ImageItem) => new Promise<WorkerReply>(async (resolve, reject) => {
    const worker = workerRef.current;
    if (!worker) return reject(new Error(copy[language].workerNotReady));
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== item.id) return;
      worker.removeEventListener("message", onMessage);
      resolve(event.data);
    };
    worker.addEventListener("message", onMessage);
    const buffer = await item.file.arrayBuffer();
    worker.postMessage({ id: item.id, buffer, from: item.from, to: target, quality, language }, [buffer]);
  }), [language, quality, target]);

  const convertAll = useCallback(async () => {
    if (!items.length || isConverting) return;
    setIsConverting(true);
    setNotice("");
    for (const item of [...items]) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "converting", error: undefined } : entry));
      try {
        const result = await runWorker(item);
        if (!result.ok || !result.buffer) throw new Error(result.error || copy[language].conversionFailed);
        const blob = new Blob([result.buffer], { type: FORMAT_META[target].mime });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "done", output: blob, outputName: outputName(entry.file.name, target), width: result.width, height: result.height } : entry));
      } catch (error) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", error: error instanceof Error ? error.message : copy[language].conversionFailed } : entry));
      }
    }
    setIsConverting(false);
  }, [isConverting, items, language, runWorker, target]);

  const downloadZip = useCallback(async () => {
    const zip = new JSZip();
    doneItems.forEach((item) => item.output && item.outputName && zip.file(item.outputName, item.output));
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    downloadBlob(blob, `image-converter-${new Date().toISOString().slice(0, 10)}.zip`);
  }, [doneItems]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={`${text.siteName} — ${text.home}`}><span className="brand-mark"><ArrowRightLeft size={19} /></span><span>{text.siteName}</span></a>
        <div className="header-actions">
          <div className="topbar-note"><LockKeyhole size={15} /> {text.privacyPill}</div>
          <div className="language-switch" role="group" aria-label="Language / Ngôn ngữ"><Languages size={16} aria-hidden="true" />
            {(["vi", "en"] as Language[]).map((value) => <button key={value} type="button" className={language === value ? "active" : ""} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 id="page-title">{text.siteName}</h1>
        </section>

        <section className="converter-card" aria-label={text.converterAria}>
          <div className="format-flow">
            <div className="format-side"><span className="control-label">{text.input}</span><div className="auto-format"><span>{text.auto}</span><small>JPG · PNG · WEBP · AVIF · HEIC</small></div></div>
            <div className="flow-arrow" aria-hidden="true"><ArrowRightLeft size={20} /></div>
            <div className="format-side output-side"><span className="control-label">{text.output}</span><div className="format-options" role="radiogroup" aria-label={text.outputAria}>
              {FORMAT_ORDER.map((format) => <button key={format} className={target === format ? "format-button active" : "format-button"} type="button" role="radio" aria-checked={target === format} onClick={() => resetResults(format)} disabled={isConverting}>{FORMAT_META[format].label}</button>)}
            </div></div>
          </div>

          <div className={dragging ? "drop-zone dragging" : "drop-zone"} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}>
            <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heif,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(event) => void addFiles(Array.from(event.target.files ?? []))} />
            <div className="drop-icon"><ImagePlus size={30} /></div>
            <div><h2>{text.drop}</h2><p>{text.or} <button type="button" className="text-button" onClick={() => inputRef.current?.click()}>{text.choose}</button></p></div>
            <span className="drop-formats">JPG · JPEG · PNG · WEBP · AVIF · HEIC · HEIF</span>
          </div>

          {notice && <div className="notice" role="status">{notice}</div>}
          {items.length > 0 && <div className="queue-panel">
            <div className="queue-header"><div><span className="control-label">{text.queue}</span><strong>{text.images(items.length)}</strong></div><button className="icon-text-button" type="button" onClick={() => setItems([])} disabled={isConverting}><Trash2 size={16} /> {text.clear}</button></div>
            <div className="file-list">{items.map((item) => <article className="file-row" key={item.id}>
              <div className="file-type">{FORMAT_META[item.from].label}</div>
              <div className="file-details"><strong title={item.file.name}>{item.file.name}</strong><span>{formatBytes(item.file.size)}{item.width ? ` · ${item.width}×${item.height}` : ""}</span>{item.error && <em>{item.error}</em>}</div>
              <div className={`file-status ${item.status}`}>{item.status === "waiting" && text.waiting}{item.status === "converting" && <><LoaderCircle size={15} className="spin" /> {text.converting}</>}{item.status === "done" && <><Check size={15} /> {text.done}</>}{item.status === "error" && <><X size={15} /> {text.error}</>}</div>
              {item.output && item.outputName ? <button className="download-one" type="button" aria-label={`${text.download} ${item.outputName}`} onClick={() => downloadBlob(item.output!, item.outputName!)}><Download size={17} /></button> : <button className="remove-one" type="button" aria-label={`${text.remove} ${item.file.name}`} disabled={isConverting} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><X size={17} /></button>}
            </article>)}</div>
          </div>}

          <div className="settings-bar">
            <label className="quality-control"><span><span className="control-label">{text.quality}</span><strong>{target === "png" ? text.lossless : `${quality}%`}</strong></span><input type="range" min="25" max="100" value={quality} disabled={target === "png" || isConverting} onChange={(event) => setQuality(Number(event.target.value))} /></label>
            <div className="actions">
              {doneItems.length > 1 && <button type="button" className="secondary-action" onClick={() => void downloadZip()}><FolderArchive size={18} /> {text.zip}</button>}
              {doneItems.length === items.length && items.length > 0 ? <button type="button" className="primary-action" onClick={() => setItems((current) => current.map((item) => ({ ...item, status: "waiting", output: undefined, outputName: undefined })))}><RotateCcw size={18} /> {text.again}</button> : <button type="button" className="primary-action" onClick={() => void convertAll()} disabled={!items.length || isConverting}>{isConverting ? <LoaderCircle size={18} className="spin" /> : <ArrowRightLeft size={18} />}{isConverting ? text.progress(progress) : text.convertTo(FORMAT_META[target].label)}</button>}
            </div>
          </div>
        </section>

        <section className="trust-row" aria-label={text.trustAria}>
          <div><ShieldCheck size={21} /><span><strong>{text.localTitle}</strong><small>{text.localText}</small></span></div>
          <div><FileImage size={21} /><span><strong>{text.formatsTitle}</strong><small>{text.formatsText}</small></span></div>
          <div><FolderArchive size={21} /><span><strong>{text.batchTitle}</strong><small>{text.batchText}</small></span></div>
        </section>
      </main>
      <footer><span>{text.siteName} · {text.footerProduct}</span><span>{text.footerTech}</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
