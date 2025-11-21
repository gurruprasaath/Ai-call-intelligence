import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, X, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { compressAudio, needsOptimization, getOptimizationInfo } from '../utils/fileOptimization';

const FileUpload = ({ onFileSelect, onUpload, isUploading, uploadProgress, error }) => {
  const [dragActive, setDragActive] = useState(false);
  const [dragReject, setDragReject] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [optimizationInfo, setOptimizationInfo] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file validation
  const validateFile = useCallback((file) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/wave'];
    const allowedExtensions = ['.mp3', '.wav'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    // Check file size
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      throw new Error('Please select an MP3 or WAV audio file');
    }

    return true;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    try {
      validateFile(file);
      setSelectedFile(file);
      
      // Check if file needs optimization
      const needsOpt = needsOptimization(file);
      if (needsOpt.shouldOptimize) {
        setOptimizationInfo({
          recommended: true,
          reasons: needsOpt.reasons,
          originalSize: file.size,
          estimatedSize: Math.floor(file.size * 0.7) // Estimate 30% compression
        });
      } else {
        setOptimizationInfo(null);
      }
      
      onFileSelect(file);
    } catch (err) {
      console.error('File validation error:', err.message);
      // Error will be handled by parent component
    }
  }, [validateFile, onFileSelect]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const file = e.dataTransfer.items[0];
      const isAudio = file.type.startsWith('audio/') || 
                     file.type === 'audio/mpeg' || 
                     file.type === 'audio/wav';
      
      if (isAudio) {
        setDragActive(true);
        setDragReject(false);
      } else {
        setDragActive(false);
        setDragReject(true);
      }
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragReject(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragReject(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
      e.dataTransfer.clearData();
    }
  }, [handleFileSelect]);

  // Handle input change
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Clear selected file
  const clearFile = () => {
    setSelectedFile(null);
    setOptimizationInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file optimization
  const handleOptimizeFile = async () => {
    if (!selectedFile) return;
    
    setIsOptimizing(true);
    try {
      console.log('🚀 Starting file optimization...');
      const optimizedBlob = await compressAudio(selectedFile, 0.7);
      const optimizedFile = new File([optimizedBlob], selectedFile.name, {
        type: selectedFile.type,
        lastModified: Date.now()
      });
      
      console.log(`✅ Optimization complete: ${formatFileSize(selectedFile.size)} → ${formatFileSize(optimizedFile.size)}`);
      
      const optInfo = getOptimizationInfo(selectedFile, optimizedFile);
      setOptimizationInfo({
        ...optimizationInfo,
        applied: true,
        actualSize: optimizedFile.size,
        compressionRatio: optInfo.compressionRatio,
        spaceSaved: optInfo.spaceSaved
      });
      
      // Update with optimized file
      setSelectedFile(optimizedFile);
      setOptimizationInfo({
        ...optimizationInfo,
        optimized: true,
        finalSize: optimizedFile.size,
        compressionRatio: ((selectedFile.size - optimizedFile.size) / selectedFile.size * 100).toFixed(1)
      });
      
      // Notify parent component
      onFileSelect(optimizedFile);
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      // Show error but keep original file
    } finally {
      setIsOptimizing(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* File Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${dragActive ? 'drag-active' : ''}
          ${dragReject ? 'drag-reject' : ''}
          ${!dragActive && !dragReject ? 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
          ${selectedFile ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                File Selected
              </h3>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <FileAudio className="w-4 h-4" />
                <span>{selectedFile.name}</span>
                <span>•</span>
                <span>{formatFileSize(selectedFile.size)}</span>
                {optimizationInfo?.applied && (
                  <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
                    Optimized ({optimizationInfo.compressionRatio}% smaller)
                  </span>
                )}
              </div>
            </div>

            {/* File Optimization Section */}
            {optimizationInfo && !optimizationInfo.applied && !isUploading && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Optimization Recommended
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {optimizationInfo.reasons.join(', ')}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Estimated size reduction: {formatFileSize(optimizationInfo.originalSize)} → {formatFileSize(optimizationInfo.estimatedSize)}
                    </p>
                    <button
                      onClick={handleOptimizeFile}
                      disabled={isOptimizing}
                      className="mt-2 inline-flex items-center space-x-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      {isOptimizing ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full spinner"></div>
                          <span>Optimizing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Optimize Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="inline-flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full">
              <Upload className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {dragActive ? 'Drop your audio file here' : 'Upload Audio File'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dragReject 
                  ? 'Only MP3 and WAV files are supported'
                  : 'Drag and drop your audio file or click to browse'
                }
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supported: MP3, WAV • Max size: 50MB
              </p>
            </div>

            <button className="btn-primary">
              Choose File
            </button>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full spinner"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Processing...
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {uploadProgress}% complete
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              Upload Error
            </span>
          </div>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !isUploading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onUpload(selectedFile)}
            className="btn-primary px-8 py-3 text-lg"
            disabled={!selectedFile}
          >
            Process Audio File
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;