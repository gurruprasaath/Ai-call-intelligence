import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import Auth from '../components/Auth';
import { Classification } from '../components/ResultsDisplay';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { CheckCircle, ArrowRight } from 'lucide-react';

const Upload = () => {
  const { user, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const navigate = useNavigate();

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
  };

  const handleUpload = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      console.log('Starting upload for file:', file.name);

      const result = await apiService.uploadAudio(file, (progress, message) => {
        setUploadProgress(progress);
        setProgressMessage(message || 'Processing...');
      });

      console.log('Upload successful:', result);
      
      setUploadResult(result);
      setSelectedFile(null);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProgressMessage('');
    }
  };

  const handleViewResults = () => {
    if (uploadResult?.callId) {
      navigate(`/calls/${uploadResult.callId}`);
    }
  };

  if (uploadResult) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Success State */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processing Complete!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your audio file has been successfully transcribed and analyzed.
            </p>
          </div>

          {/* Quick Summary */}
          <div className="card p-6 text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Summary
            </h3>
            
            {uploadResult.data?.analysis?.summary && (
              <div className="space-y-2">
                {uploadResult.data.analysis.summary.slice(0, 3).map((point, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 dark:text-gray-300">{point}</p>
                  </div>
                ))}
                {uploadResult.data.analysis.summary.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    +{uploadResult.data.analysis.summary.length - 3} more insights...
                  </p>
                )}
              </div>
            )}

            {/* Classification Display */}
            {uploadResult.data?.analysis?.classification && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  Call Classification
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {uploadResult.data.analysis.classification.category === 'Work' ? '💼' :
                       uploadResult.data.analysis.classification.category === 'Family' ? '👨‍👩‍👧‍👦' :
                       uploadResult.data.analysis.classification.category === 'Personal' ? '🧑' :
                       uploadResult.data.analysis.classification.category === 'Education' ? '🎓' :
                       uploadResult.data.analysis.classification.category === 'Healthcare' ? '🏥' :
                       uploadResult.data.analysis.classification.category === 'Financial' ? '💰' :
                       uploadResult.data.analysis.classification.category === 'Technical' ? '💻' :
                       uploadResult.data.analysis.classification.category === 'Legal' ? '⚖️' : '💬'}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {uploadResult.data.analysis.classification.category}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        ({Math.round((uploadResult.data.analysis.classification.confidence || 0) * 100)}% confidence)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {uploadResult.data?.analysis?.keyDecisions?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Decisions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {uploadResult.data?.analysis?.keyPoints?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Key Points</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {uploadResult.data?.analysis?.actionItems?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Action Items</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleViewResults}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>View Full Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
                setError(null);
              }}
              className="btn-secondary"
            >
              Upload Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Upload Audio File
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Upload your conversation recording to get AI-powered insights including transcription, 
          key decisions, action items, and conversation analytics.
        </p>
      </div>

      {/* Authentication Component */}
      <Auth />

      {/* Upload Component */}
      <FileUpload
        onFileSelect={handleFileSelect}
        onUpload={handleUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={error}
      />

      {/* Processing Information */}
      {isUploading && (
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Processing Your Audio...
          </h3>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{progressMessage}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${uploadProgress > 20 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Uploading file...
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${uploadProgress > 50 ? 'bg-green-500' : uploadProgress > 20 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Transcribing audio with AI...
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${uploadProgress > 80 ? 'bg-green-500' : uploadProgress > 50 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Analyzing conversation...
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${uploadProgress > 95 ? 'bg-green-500' : uploadProgress > 80 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Generating insights...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Features Info */}
      {!isUploading && !selectedFile && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2m-5 8l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Automatic Transcription
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered speech-to-text with speaker identification and high accuracy
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Smart Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Extract key decisions, action items, and conversation insights automatically
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Instant Results
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get comprehensive conversation analytics in seconds, not hours
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;