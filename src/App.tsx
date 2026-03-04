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
      .filter(
        (f) =>
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

  const compressAll = async () => {
    setIsProcessing(true);

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
              (progress) =>
                updateStatus(
                  item.id,
                  "processing",
                  progress
                )
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

  const updateStatus = (
    id: string,
    status: FileItem["status"],
    progress: number
  ) => {
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
      const response = await fetch(
        item.compressedUrl!
      );
      const blob = await response.blob();
      zip.file(
        `compressed_${item.file.name}`,
        blob
      );
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold text-gray-800">
          Image & Video Compressor
        </h1>

        <div className="bg-white p-6 rounded-2xl shadow space-y-4">

          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) =>
              handleFiles(e.target.files)
            }
            className="block w-full text-sm
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
          />

          <div>
            <label className="block font-medium mb-2">
              品質: {(quality * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) =>
                setQuality(Number(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={compressAll}
              disabled={
                isProcessing ||
                files.length === 0
              }
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              圧縮開始
            </button>

            <button
              onClick={downloadZip}
              disabled={
                files.filter(
                  (f) => f.compressedUrl
                ).length === 0
              }
              className="px-6 py-2 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              一括ZIPダウンロード
            </button>
          </div>
        </div>

        {files.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow space-y-4"
          >
            <h3 className="font-semibold">
              {item.file.name}
            </h3>

            <p className="text-sm text-gray-600">
              {item.originalSize} →{" "}
              {item.compressedSize ?? "-"} bytes{" "}
              {calcReduction(
                item.originalSize,
                item.compressedSize
              )}
            </p>

            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${item.progress}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              {isVideo(item.file) ? (
                <video
                  src={item.previewUrl}
                  controls
                  className="w-64 rounded-lg"
                />
              ) : (
                <img
                  src={item.previewUrl}
                  className="w-48 rounded-lg"
                />
              )}

              {item.compressedUrl &&
                (isVideo(item.file) ? (
                  <video
                    src={item.compressedUrl}
                    controls
                    className="w-64 rounded-lg"
                  />
                ) : (
                  <img
                    src={item.compressedUrl}
                    className="w-48 rounded-lg"
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
