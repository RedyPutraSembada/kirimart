import DOMPurify from 'isomorphic-dompurify';

/**
 * Membersihkan input teks dari potensi serangan XSS.
 * Pustaka yang digunakan: `isomorphic-dompurify`
 * Library ini otomatis mengenali lingkungan server (Node.js) maupun klien (Browser)
 * untuk membersihkan HTML tag yang berbahaya seperti <script>.
 * 
 * @param {string} dirtyInput Teks kotor dari pengguna
 * @returns {string} Teks bersih
 */
export function sanitize(dirtyInput) {
  if (!dirtyInput || typeof dirtyInput !== 'string') return dirtyInput;
  return DOMPurify.sanitize(dirtyInput, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
