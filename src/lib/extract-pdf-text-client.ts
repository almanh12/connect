"use client";

/** Max file size before browser extraction (matches server-side cap for consistency). */
export const MAX_PDF_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Extract plain text from a PDF in the browser (pdfjs-dist).
 * Avoids uploading the raw PDF to the API, staying under serverless payload limits.
 */
export async function extractPdfTextInBrowser(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const chunks: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const line = textContent.items
      .map((item) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          return String((item as { str: string }).str);
        }
        return "";
      })
      .join(" ");
    chunks.push(line);
  }

  return chunks.join("\n\n").replace(/\s+\n/g, "\n").trim();
}
