import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

// Initialize PDF.js worker URL for the browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Extracts raw textual content from a PDF document in the browser.
 * 
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageStrings = content.items
      .map((item) => (item && 'str' in item ? item.str : ''))
      .filter(Boolean);
    fullText += pageStrings.join(' ') + '\n';
  }

  return fullText.trim();
}

/**
 * Extracts raw text from a DOCX file using mammoth.
 * 
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractTextFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

/**
 * Parses and returns text from a user-uploaded CV file (PDF or DOCX).
 * Throws a specific message if the text length is under 200 characters.
 * 
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractCVText(file) {
  const name = (file?.name || '').toLowerCase();
  const mime = (file?.type || '').toLowerCase();

  let text = '';

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    text = await extractTextFromPdf(file);
  } else if (
    mime.includes('officedocument.wordprocessingml') ||
    mime.includes('msword') ||
    name.endsWith('.docx')
  ) {
    text = await extractTextFromDocx(file);
  } else {
    throw new Error('Unsupported document format. Please upload a text-based PDF or DOCX file.');
  }

  const normalized = text.trim();

  // If text is under 200 characters, it likely contains scanned images or lacks selectable text
  if (normalized.length < 200) {
    throw new Error('This CV looks like a scanned image. Please upload a text-based PDF or DOCX.');
  }

  return normalized;
}

