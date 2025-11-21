/**
 * Chunked upload service for large files
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_CONCURRENT_UPLOADS = 3;
const RETRY_ATTEMPTS = 3;

class ChunkedUploadService {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.activeUploads = new Map();
  }

  /**
   * Upload file using chunked approach
   * @param {File|Blob} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {Function} onOptimization - Optimization callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, onProgress, onOptimization) {
    try {
      // Step 1: Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Step 2: Check if optimization is beneficial
      const shouldOptimize = this.shouldOptimizeFile(file);
      let optimizedFile = file;
      
      if (shouldOptimize) {
        if (onOptimization) {
          onOptimization('Optimizing file for faster upload...', 0);
        }
        
        optimizedFile = await this.optimizeFile(file, (progress) => {
          if (onOptimization) {
            onOptimization('Optimizing file...', progress * 0.2); // 20% of total progress
          }
        });
        
        if (onOptimization) {
          const info = this.getOptimizationInfo(file, optimizedFile);
          onOptimization(`Optimization complete! Reduced size by ${info.reduction}`, 20);
        }
      }

      // Step 3: Decide upload strategy
      const useChunkedUpload = optimizedFile.size > CHUNK_SIZE * 2; // Use chunks for files > 2MB

      if (useChunkedUpload) {
        return await this.uploadChunked(optimizedFile, onProgress, shouldOptimize ? 20 : 0);
      } else {
        return await this.uploadDirect(optimizedFile, onProgress, shouldOptimize ? 20 : 0);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload file using chunked approach
   * @param {File|Blob} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {number} baseProgress - Base progress percentage
   * @returns {Promise<Object>} Upload result
   */
  async uploadChunked(file, onProgress, baseProgress = 0) {
    const fileId = this.generateFileId();
    const chunks = this.createChunks(file);
    const uploadedChunks = new Set();
    
    try {
      // Initialize chunked upload
      const initResponse = await fetch(`${this.baseURL}/upload/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: file.name || 'audio.mp3',
          fileSize: file.size,
          totalChunks: chunks.length,
          mimeType: file.type || 'audio/mpeg'
        })
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize chunked upload');
      }

      const { uploadId } = await initResponse.json();

      // Upload chunks with concurrency control
      const progressStep = (100 - baseProgress) / chunks.length;
      let completedChunks = 0;

      const uploadPromises = chunks.map((chunk, index) =>
        this.uploadChunkWithRetry(uploadId, chunk, index, RETRY_ATTEMPTS)
          .then(() => {
            uploadedChunks.add(index);
            completedChunks++;
            const progress = baseProgress + (completedChunks * progressStep);
            onProgress(Math.min(progress, 95), `Uploading chunk ${completedChunks}/${chunks.length}...`);
          })
      );

      // Limit concurrent uploads
      await this.limitConcurrency(uploadPromises, MAX_CONCURRENT_UPLOADS);

      // Finalize upload
      onProgress(95, 'Finalizing upload...');
      const finalizeResponse = await fetch(`${this.baseURL}/upload/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, fileId })
      });

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize upload');
      }

      const result = await finalizeResponse.json();
      onProgress(100, 'Upload complete!');
      
      return result;

    } catch (error) {
      // Cleanup failed upload
      try {
        await fetch(`${this.baseURL}/upload/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: uploadId || fileId })
        });
      } catch (cleanupError) {
        console.warn('Failed to cleanup upload:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Upload file directly (for smaller files)
   * @param {File|Blob} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {number} baseProgress - Base progress percentage
   * @returns {Promise<Object>} Upload result
   */
  async uploadDirect(file, onProgress, baseProgress = 0) {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const uploadProgress = (progressEvent.loaded / progressEvent.total) * (100 - baseProgress);
          onProgress(baseProgress + uploadProgress, 'Uploading...');
        }
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    onProgress(100, 'Upload complete!');
    return await response.json();
  }

  /**
   * Upload single chunk with retry logic
   * @param {string} uploadId - Upload session ID
   * @param {Blob} chunk - Chunk data
   * @param {number} chunkIndex - Chunk index
   * @param {number} retries - Number of retries left
   * @returns {Promise<void>}
   */
  async uploadChunkWithRetry(uploadId, chunk, chunkIndex, retries) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('uploadId', uploadId);

        const response = await fetch(`${this.baseURL}/upload/chunk`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          return; // Success
        }

        if (attempt === retries) {
          throw new Error(`Chunk ${chunkIndex} upload failed after ${retries + 1} attempts`);
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Create file chunks
   * @param {File|Blob} file - File to chunk
   * @returns {Array<Blob>} Array of chunks
   */
  createChunks(file) {
    const chunks = [];
    let offset = 0;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      chunks.push(chunk);
      offset += CHUNK_SIZE;
    }

    return chunks;
  }

  /**
   * Limit concurrent promises
   * @param {Array<Promise>} promises - Promises to execute
   * @param {number} limit - Concurrency limit
   * @returns {Promise<Array>} Results
   */
  async limitConcurrency(promises, limit) {
    const results = [];
    const executing = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        executing.splice(executing.indexOf(p), 1);
        return result;
      });

      results.push(p);
      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  /**
   * Check if file should be optimized
   * @param {File} file - File to check
   * @returns {boolean} Whether to optimize
   */
  shouldOptimizeFile(file) {
    const OPTIMIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB
    const SLOW_FORMATS = ['audio/wav', 'audio/wave'];
    
    return file.size > OPTIMIZE_THRESHOLD || SLOW_FORMATS.includes(file.type);
  }

  /**
   * Optimize file (placeholder - integrate with fileOptimization.js)
   * @param {File} file - File to optimize
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Blob>} Optimized file
   */
  async optimizeFile(file, onProgress) {
    // This would integrate with the fileOptimization.js utilities
    // For now, return original file
    onProgress(100);
    return file;
  }

  /**
   * Validate file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/m4a'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large' };
    }

    return { valid: true };
  }

  /**
   * Get optimization info
   * @param {File} original - Original file
   * @param {File|Blob} optimized - Optimized file
   * @returns {Object} Optimization info
   */
  getOptimizationInfo(original, optimized) {
    const reduction = ((original.size - optimized.size) / original.size * 100).toFixed(1);
    return { reduction: `${reduction}%` };
  }

  /**
   * Generate unique file ID
   * @returns {string} Unique ID
   */
  generateFileId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default new ChunkedUploadService();