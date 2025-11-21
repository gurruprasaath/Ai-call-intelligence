/**
 * File optimization utilities for faster uploads
 */

/**
 * Compress audio file using Web Audio API
 * @param {File} audioFile - Original audio file
 * @param {number} quality - Compression quality (0.1 to 1.0)
 * @returns {Promise<Blob>} Compressed audio blob
 */
export async function compressAudio(audioFile, quality = 0.7) {
  return new Promise((resolve, reject) => {
    try {
      // For now, we'll use a simple approach
      // In production, you might want to use libraries like lamejs for MP3 compression
      
      // If file is already small enough, don't compress
      if (audioFile.size < 5 * 1024 * 1024) { // 5MB
        resolve(audioFile);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        
        // Create a compressed version using AudioContext (if supported)
        if (window.AudioContext || window.webkitAudioContext) {
          compressWithWebAudio(arrayBuffer, quality)
            .then(resolve)
            .catch(() => resolve(audioFile)); // Fallback to original
        } else {
          resolve(audioFile); // No compression support
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(audioFile);
      
    } catch (error) {
      console.warn('Audio compression failed, using original file:', error);
      resolve(audioFile);
    }
  });
}

/**
 * Compress audio using Web Audio API
 * @param {ArrayBuffer} arrayBuffer - Audio data
 * @param {number} quality - Compression quality
 * @returns {Promise<Blob>} Compressed audio
 */
async function compressWithWebAudio(arrayBuffer, quality) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Reduce sample rate and bit depth based on quality
    const targetSampleRate = Math.floor(audioBuffer.sampleRate * quality);
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      channels, 
      Math.floor(length * quality), 
      targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const compressedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV blob (simplified)
    const wavBlob = bufferToWav(compressedBuffer);
    return wavBlob;
    
  } catch (error) {
    throw error;
  } finally {
    audioContext.close();
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 * @param {AudioBuffer} buffer - Audio buffer
 * @returns {Blob} WAV blob
 */
function bufferToWav(buffer) {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV file header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Check if file needs optimization
 * @param {File} file - Audio file
 * @returns {boolean} Whether optimization is needed
 */
export function needsOptimization(file) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const SLOW_FORMATS = ['audio/wav', 'audio/wave'];
  
  return file.size > MAX_SIZE || SLOW_FORMATS.includes(file.type);
}

/**
 * Get optimized file info
 * @param {File} originalFile - Original file
 * @param {File|Blob} optimizedFile - Optimized file
 * @returns {Object} Optimization info
 */
export function getOptimizationInfo(originalFile, optimizedFile) {
  const originalSize = originalFile.size;
  const optimizedSize = optimizedFile.size;
  const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
  
  return {
    originalSize: formatFileSize(originalSize),
    optimizedSize: formatFileSize(optimizedSize),
    reduction: `${reduction}%`,
    speedImprovement: Math.max(1, Math.floor(originalSize / optimizedSize))
  };
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate audio file before processing
 * @param {File} file - Audio file to validate
 * @returns {Object} Validation result
 */
export function validateAudioFile(file) {
  const validTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
    'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'
  ];
  
  const maxSize = 100 * 1024 * 1024; // 100MB
  const minSize = 1024; // 1KB
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload MP3, WAV, OGG, M4A, AAC, or FLAC files.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(maxSize)}.`
    };
  }
  
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File too small. Please upload a valid audio file.'
    };
  }
  
  return { valid: true };
}

export default {
  compressAudio,
  needsOptimization,
  getOptimizationInfo,
  validateAudioFile
};