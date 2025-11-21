import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for automatic auth and logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Automatically add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle common errors
    if (error.response?.status === 413) {
      throw new Error('File size too large. Maximum size is 50MB.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw error;
  }
);

export const apiService = {
  
  /**
   * Health check endpoint
   */
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  /**
   * Upload and process audio file with optimizations
   * @param {File} audioFile - The audio file to upload
   * @param {Function} onProgress - Progress callback function (upload + processing)
   * @returns {Promise<Object>} Processing result
   */
  async uploadAudio(audioFile, onProgress) {
    try {
      // Step 1: Determine upload strategy
      const fileSize = audioFile.size;
      const useChunkedUpload = fileSize > 5 * 1024 * 1024; // Use chunks for files > 5MB
      
      let uploadResponse;
      
      if (useChunkedUpload) {
        // Use chunked upload for large files
        uploadResponse = await this.uploadChunked(audioFile, onProgress);
      } else {
        // Use direct upload for smaller files
        uploadResponse = await this.uploadDirect(audioFile, onProgress);
      }

      const { callId } = uploadResponse;
      
      // Step 2: Poll for processing status
      return await this.pollProcessingStatus(callId, (progress, message) => {
        // Processing starts after upload (at 95%)
        const adjustedProgress = 95 + (progress * 0.05);
        onProgress(Math.min(adjustedProgress, 100), message);
      });
      
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  },

  /**
   * Upload file using chunked approach for large files
   * @param {File} audioFile - Audio file to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload response
   */
  async uploadChunked(audioFile, onProgress) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const chunks = [];
    
    // Create chunks
    for (let start = 0; start < audioFile.size; start += CHUNK_SIZE) {
      const chunk = audioFile.slice(start, start + CHUNK_SIZE);
      chunks.push(chunk);
    }
    
    // Initialize upload
    const initResponse = await api.post('/upload/init', {
      fileId: Date.now().toString(36),
      fileName: audioFile.name,
      fileSize: audioFile.size,
      totalChunks: chunks.length,
      mimeType: audioFile.type
    });
    
    const { uploadId } = initResponse.data;
    
    // Upload chunks with progress tracking
    const uploadPromises = chunks.map(async (chunk, index) => {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', index.toString());
      formData.append('uploadId', uploadId);
      
      const response = await api.post('/upload/chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      
      // Update progress
      const progress = ((index + 1) / chunks.length) * 90; // 90% for upload
      onProgress(progress, `Uploading chunk ${index + 1}/${chunks.length}...`);
      
      return response.data;
    });
    
    // Wait for all chunks to upload
    await Promise.all(uploadPromises);
    
    // Finalize upload
    onProgress(95, 'Finalizing upload...');
    const finalizeResponse = await api.post('/upload/finalize', {
      uploadId,
      fileId: initResponse.data.fileId
    });
    
    return finalizeResponse.data;
  },

  /**
   * Upload file directly for smaller files
   * @param {File} audioFile - Audio file to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload response
   */
  async uploadDirect(audioFile, onProgress) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const uploadResponse = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for direct upload
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const uploadProgress = (progressEvent.loaded / progressEvent.total) * 95;
          onProgress(uploadProgress, 'Uploading file...');
        }
      },
    });

    return uploadResponse.data;
  },

  /**
   * Poll processing status with progress updates
   * @param {string} callId - Call ID to poll
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Final processing result
   */
  async pollProcessingStatus(callId, onProgress) {
    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await api.get(`/upload/status/${callId}`);
        const { status, processingStage, progress, data, errors } = response.data;

        // Update progress
        if (onProgress) {
          const stage = this.getProcessingStageMessage(processingStage);
          onProgress(progress, stage);
        }

        // Check if processing is complete
        if (status === 'completed') {
          return {
            success: true,
            callId,
            data,
            status: 'completed'
          };
        }

        // Check if processing failed
        if (status === 'failed') {
          const errorMessage = errors?.length > 0 ? errors[0].message : 'Processing failed';
          throw new Error(`Processing failed: ${errorMessage}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
        attempts++;

      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Call not found');
        }
        throw error;
      }
    }

    throw new Error('Processing timeout. Please check the call status later.');
  },

  /**
   * Get user-friendly processing stage messages
   * @param {string} stage - Processing stage
   * @returns {string} User-friendly message
   */
  getProcessingStageMessage(stage) {
    const messages = {
      'none': 'Preparing for processing...',
      'transcribing': 'Converting speech to text...',
      'analyzing': 'Analyzing conversation content...',
      'classifying': 'Categorizing and finalizing...',
      'complete': 'Processing complete!'
    };
    return messages[stage] || 'Processing...';
  },

  /**
   * Get processing status for a specific call
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Status information
   */
  async getProcessingStatus(callId) {
    try {
      const response = await api.get(`/upload/status/${callId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Call not found');
      }
      throw new Error(`Failed to get status: ${error.message}`);
    }
  },

  /**
   * Get all past calls
   * @returns {Promise<Array>} List of calls
   */
  async getAllCalls() {
    try {
      const response = await api.get('/calls');
      return response.data.calls || [];
    } catch (error) {
      throw new Error(`Failed to fetch calls: ${error.message}`);
    }
  },

  /**
   * Get specific call details
   * @param {string} callId - Call identifier
   * @returns {Promise<Object>} Call details
   */
  async getCallDetails(callId) {
    try {
      const response = await api.get(`/calls/${callId}`);
      return response.data.call;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Call not found');
      }
      throw new Error(`Failed to fetch call details: ${error.message}`);
    }
  },

  /**
   * Delete a call
   * @param {string} callId - Call identifier
   * @returns {Promise<Object>} Success message
   */
  async deleteCall(callId) {
    try {
      const response = await api.delete(`/calls/${callId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Call not found');
      }
      throw new Error(`Failed to delete call: ${error.message}`);
    }
  },
};

export default apiService;