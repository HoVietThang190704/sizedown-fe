"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileArchive, Loader2, UploadCloud, X } from "lucide-react";
import clsx from "clsx";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const maxFileSize = 50 * 1024 * 1024;
const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".pptx"];

type UploadResponse = {
  file: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
  };
};

type CompressResult = {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  compressedFilename: string;
  downloadUrl: string;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function validateClientFile(file: File) {
  const extension = getExtension(file.name);

  if (!allowedExtensions.includes(extension)) {
    return "Chỉ hỗ trợ PDF, JPG, JPEG, PNG, DOCX và PPTX.";
  }

  if (file.size > maxFileSize) {
    return "File vượt quá giới hạn 50MB.";
  }

  return "";
}

async function parseApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || "Yêu cầu thất bại. Vui lòng thử lại.";
  } catch {
    return "Yêu cầu thất bại. Vui lòng thử lại.";
  }
}

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompressResult | null>(null);

  const selectedFileLabel = useMemo(() => {
    if (!file) return "PDF, JPG, PNG, DOCX, PPTX - tối đa 50MB";
    return `${file.name} • ${formatBytes(file.size)}`;
  }, [file]);

  function setSelectedFile(nextFile: File | null) {
    setResult(null);
    setError("");

    if (!nextFile) {
      setFile(null);
      return;
    }

    const validationError = validateClientFile(nextFile);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(nextFile);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleCompress() {
    if (!file || isCompressing) return;

    setIsCompressing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${apiBaseUrl}/api/upload`, {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(await parseApiError(uploadResponse));
      }

      const uploaded = (await uploadResponse.json()) as UploadResponse;

      const compressResponse = await fetch(`${apiBaseUrl}/api/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploaded.file.filename })
      });

      if (!compressResponse.ok) {
        throw new Error(await parseApiError(compressResponse));
      }

      const compressed = (await compressResponse.json()) as { result: CompressResult };
      setResult(compressed.result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nén file thất bại.");
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center gap-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">SizeDown</p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-950 sm:text-5xl">Giảm kích thước tài liệu</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Upload tài liệu, nén dung lượng và tải về bản đã tối ưu trong vài bước.
          </p>
        </div>

        <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-soft sm:p-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={clsx(
              "flex min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-10 text-center transition",
              isDragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-gray-50"
            )}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <UploadCloud size={28} aria-hidden />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-gray-950">Kéo thả tài liệu vào đây hoặc chọn file</h2>
            <p className="mt-2 max-w-md text-sm text-gray-600">{selectedFileLabel}</p>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Chọn file
              </button>
              {file ? (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  <X size={16} aria-hidden />
                  Bỏ chọn
                </button>
              ) : null}
            </div>

            <input ref={inputRef} type="file" className="hidden" onChange={handleInputChange} />
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!file || isCompressing}
            onClick={handleCompress}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isCompressing ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <FileArchive size={18} aria-hidden />}
            {isCompressing ? "Đang nén file..." : "Giảm kích thước"}
          </button>

          {result ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={20} aria-hidden />
                <h3 className="font-semibold">Nén file hoàn tất</h3>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-white p-3">
                  <dt className="text-gray-500">Tên file gốc</dt>
                  <dd className="mt-1 break-words font-medium text-gray-950">{result.originalName}</dd>
                </div>
                <div className="rounded-md bg-white p-3">
                  <dt className="text-gray-500">Tỷ lệ giảm</dt>
                  <dd className="mt-1 font-medium text-gray-950">{result.reductionPercent}%</dd>
                </div>
                <div className="rounded-md bg-white p-3">
                  <dt className="text-gray-500">Dung lượng ban đầu</dt>
                  <dd className="mt-1 font-medium text-gray-950">{formatBytes(result.originalSize)}</dd>
                </div>
                <div className="rounded-md bg-white p-3">
                  <dt className="text-gray-500">Dung lượng sau nén</dt>
                  <dd className="mt-1 font-medium text-gray-950">{formatBytes(result.compressedSize)}</dd>
                </div>
              </dl>

              <a
                href={result.downloadUrl}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
              >
                <Download size={18} aria-hidden />
                Tải file đã nén
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
