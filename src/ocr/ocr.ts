// OCR utilities using Tesseract.js
import Tesseract from "tesseract.js";
import { cleanSetlistLine, isHeaderLine } from "@/utils/parse";

// Process image and extract text using OCR
export async function extractTextFromImage(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const result = await Tesseract.recognize(imageFile, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(m.progress);
        }
      },
    });

    return result.data.text;
  } catch (error) {
    console.error("OCR failed:", error);
    throw new Error("Failed to extract text from image");
  }
}

// Clean and normalize extracted text
export function cleanExtractedText(rawText: string): string[] {
  if (!rawText.trim()) return [];

  return rawText
    .split("\n")
    .map((line) => cleanSetlistLine(line))
    .filter((line) => line.length > 0)
    .filter((line) => {
      if (line.length < 2) return false;
      if (isHeaderLine(line)) return false;
      if (/^(page|date|time|venue)/i.test(line)) return false;
      return true;
    });
}

// Remove duplicates while preserving order
export function deduplicateLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// Complete OCR processing pipeline
export async function processImageToSetlist(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const rawText = await extractTextFromImage(imageFile, onProgress);
  const cleanedLines = cleanExtractedText(rawText);
  return deduplicateLines(cleanedLines);
}