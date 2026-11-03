import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Validates a CV file before upload.
 * @param {File} file 
 */
export function validateCVFile(file) {
  if (!file) {
    throw new Error('Please select a file to upload.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 5MB limit. Please upload a smaller document.');
  }

  const isAllowedType = ALLOWED_TYPES.includes(file.type) ||
    file.name.endsWith('.pdf') ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc');

  if (!isAllowedType) {
    throw new Error('Unsupported format. Please upload a PDF or Word document (.pdf, .docx, .doc).');
  }

  return true;
}

/**
 * Uploads a CV file to the private 'cvs' bucket for a given user.
 * Organizes by seeker ID path: {userId}/{timestamp}_{cleanFileName}
 * 
 * @param {string} userId - Auth user ID
 * @param {File} file - File object from input
 * @returns {Promise<string>} The storage path of the uploaded file
 */
export async function uploadCV(userId, file) {
  validateCVFile(file);

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading CV to storage:', uploadError);
    throw uploadError;
  }

  return filePath;
}

/**
 * Generates a signed URL to securely view or download a CV.
 * 
 * @param {string} cvPath - The storage path
 * @param {number} expiresIn - Expiry in seconds (default 300 = 5 mins)
 * @returns {Promise<string>} Signed download URL
 */
export async function getCVSignedUrl(cvPath, expiresIn = 300) {
  if (!cvPath) return null;

  const { data, error } = await supabase.storage
    .from('cvs')
    .createSignedUrl(cvPath, expiresIn);

  if (error) {
    console.error('Error creating signed URL for CV:', error);
    throw error;
  }

  return data?.signedUrl || null;
}

/**
 * Downloads a CV file directly using Supabase storage and triggers browser file save.
 * 
 * @param {string} cvPath - The storage path
 * @param {string} suggestedName - Optional name for the downloaded file
 */
export async function downloadCV(cvPath, suggestedName) {
  if (!cvPath) throw new Error('CV path is missing');

  const { data, error } = await supabase.storage
    .from('cvs')
    .download(cvPath);

  if (error) {
    console.error('Error downloading CV blob:', error);
    throw error;
  }

  // Create an object URL and trigger download in browser
  const blobUrl = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = suggestedName || cvPath.split('/').pop() || 'candidate_cv.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}
