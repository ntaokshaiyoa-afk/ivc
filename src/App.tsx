import { useState, useEffect  } from "react";
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
  const [darkMode, setDarkMode] = useState<boolean>(() => {
  // 保存済み設定があれば優先
  const saved = localStorage.getItem("theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;

  // 無ければOS設定を使用
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}, [darkMode]);

  useEffect(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const listener = (e: MediaQueryListEvent) => {
    const saved = localStorage.getItem("theme");
    if (!saved) {
      setDarkMode(e.matches);
    }
  };

  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}, []);


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
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
    <div className="max-w-7xl mx-auto px-8 py-10">

      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Image & Video Compressor
        </h1>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-xl bg-gray-800 text-white dark:bg-yellow-400 dark:text-black font-semibold"
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* コントロール */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-10 transition-colors">
        <div className="grid md:grid-cols-3 gap-6 items-end">

          <div className="md:col-span-2">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="block w-full text-sm
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700"
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
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
        </div>

        <div className="flex gap-6 mt-6">
          <button
            onClick={compressAll}
            disabled={isProcessing || files.length === 0}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            圧縮開始
          </button>

          <button
            onClick={downloadZip}
            disabled={files.filter(f => f.compressedUrl).length === 0}
            className="px-8 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            ZIPダウンロード
          </button>
        </div>
      </div>

      {/* ファイル一覧 */}
      <div className="space-y-8">
        {files.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
              {item.file.name}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {item.originalSize} →
              {item.compressedSize ?? "-"} bytes{" "}
              {calcReduction(
                item.originalSize,
                item.compressedSize
              )}
            </p>

            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {isVideo(item.file) ? (
                <video
                  src={item.previewUrl}
                  controls
                  className="w-full rounded-xl"
                />
              ) : (
                <img
                  src={item.previewUrl}
                  className="w-full rounded-xl"
                />
              )}

              {item.compressedUrl &&
                (isVideo(item.file) ? (
                  <video
                    src={item.compressedUrl}
                    controls
                    className="w-full rounded-xl"
                  />
                ) : (
                  <img
                    src={item.compressedUrl}
                    className="w-full rounded-xl"
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}

export default App;
