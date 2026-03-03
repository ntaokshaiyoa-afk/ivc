import { useState } from "react";
import { compressImage } from "./services/imageCompressor";
import JSZip from "jszip";

type FileItem = {
  id: string;
  file: File;
  previewUrl: string;
  compressedUrl?: string;
  originalSize: number;
  compressedSize?: number;
  status: "waiting" | "processing" | "done";
  progress: number;
};

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [isProcessing, setIsProcessing] = useState(false);

const handleFiles = (selected: FileList | null) => {
  if (!selected) return;

  const list = Array.from(selected)
    .filter((f) =>
      f.type.startsWith("image/") ||
      f.type.startsWith("video/")
    )
    .map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      originalSize: f.size,
      status: "waiting" as const,
      progress: 0,
    }));

  setFiles((prev) => [...prev, ...list]);
};

  // 🔥 並列2件まで
const compressAll = async () => {
  setIsProcessing(true);

  // 🔥 未処理のみ抽出
  const pendingFiles = files.filter(
    (f) => f.status !== "done"
  );

  const concurrency = 2;
  const queue = [...pendingFiles];

  const workers = Array(concurrency)
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        updateStatus(item.id, "processing", 0);

        if (item.file.type.startsWith("video/")) {
          const { compressVideo } = await import(
            "./services/videoCompressor"
          );

          const compressed = await compressVideo(
            item.file,
            (progress) => {
              updateStatus(
                item.id,
                "processing",
                progress
              );
            }
          );

          updateResult(item.id, compressed);
        } else {
          const compressed = await compressImage(
            item.file,
            quality
          );

          updateResult(item.id, compressed);
        }
      }
    });

  await Promise.all(workers);
  setIsProcessing(false);
};

  const updateStatus = (id: string, status: FileItem["status"], progress: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status, progress } : f
      )
    );
  };

  const updateResult = (id: string, file: File) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              compressedUrl: URL.createObjectURL(file),
              compressedSize: file.size,
              status: "done",
              progress: 100,
            }
          : f
      )
    );
  };

  const calcReduction = (orig: number, comp?: number) => {
    if (!comp) return "";
    const rate = ((orig - comp) / orig) * 100;
    return `-${rate.toFixed(1)}%`;
  };

const downloadZip = async () => {
  const zip = new JSZip();

  const completedFiles = files.filter(
    (f) => f.compressedUrl
  );

  for (const item of completedFiles) {
    const response = await fetch(item.compressedUrl!);
    const blob = await response.blob();
    zip.file(`compressed_${item.file.name}`, blob);
  }

  const content = await zip.generateAsync({
    type: "blob",
  });

  const url = URL.createObjectURL(content);

  const a = document.createElement("a");
  a.href = url;
  a.download = "compressed_files.zip";
  a.click();

  URL.revokeObjectURL(url);
};

const isVideo = (file: File) =>
  file.type.startsWith("video/");

  return (
    <div style={{ padding: 20 }}>
      <h1>Image Compressor</h1>

<input
  type="file"
  multiple
  accept="image/*,video/*"
  onChange={(e) => handleFiles(e.target.files)}
/>

      <div style={{ marginTop: 20 }}>
        <label>品質: {(quality * 100).toFixed(0)}</label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </div>

      <button
        onClick={compressAll}
        disabled={isProcessing || files.length === 0}
        style={{ marginTop: 20 }}
      >
        圧縮開始
      </button>

<button
  onClick={downloadZip}
  disabled={files.filter(f => f.compressedUrl).length === 0}
>
  一括ZIPダウンロード
</button>

      <hr />

      {files.map((item) => (
        <div key={item.id} style={{ marginBottom: 40 }}>
          <h3>{item.file.name}</h3>

          <p>
            {item.originalSize} → {item.compressedSize ?? "-"} bytes{" "}
            {calcReduction(item.originalSize, item.compressedSize)}
          </p>

          <div
            style={{
              height: 8,
              background: "#eee",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${item.progress}%`,
                height: "100%",
                background: "#4caf50",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 20 }}>

{
  item.file.type.startsWith("video/") ? (
    <video
      src={item.previewUrl}
      controls
      width={300}
    />
  ) : (
    <img src={item.previewUrl} width={200} />
  )
}
{item.compressedUrl && (
  item.file.type.startsWith("video/") ? (
    <video
      src={item.compressedUrl}
      controls
      width={300}
    />
  ) : (
    <img src={item.compressedUrl} width={200} />
  )
)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;