import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import Auth from '../components/Auth';
import { Classification } from '../components/ResultsDisplay';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { CheckCircle, ArrowRight, Mic, Sparkles, Zap } from 'lucide-react';

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
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Success State */}
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse-slow"></div>
            <div className="relative flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full border border-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-glow">
              Processing Complete!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Your audio file has been successfully transcribed and analyzed.
            </p>
          </div>

          {/* Quick Summary */}
          <div className="card p-8 text-left border-l-4 border-l-green-500">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              Quick Summary
            </h3>
            
            {uploadResult.data?.analysis?.summary && (
              <div className="space-y-4">
                {uploadResult.data.analysis.summary.slice(0, 3).map((point, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{point}</p>
                  </div>
                ))}
                {uploadResult.data.analysis.summary.length > 3 && (
                  <p className="text-sm font-medium text-primary-500 mt-4 pl-4 border-l-2 border-primary-500/20">
                    +{uploadResult.data.analysis.summary.length - 3} more insights available in full report
                  </p>
                )}
              </div>
            )}

            {/* Classification Display */}
            {uploadResult.data?.analysis?.classification && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                  Call Classification
                </h4>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-2xl">
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
                    <span className="font-bold text-slate-900 dark:text-white">
                      {uploadResult.data.analysis.classification.category}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                      ({Math.round((uploadResult.data.analysis.classification.confidence || 0) * 100)}% confidence)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Key Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                  {uploadResult.data?.analysis?.keyDecisions?.length || 0}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Decisions</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {uploadResult.data?.analysis?.keyPoints?.length || 0}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Key Points</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                  {uploadResult.data?.analysis?.actionItems?.length || 0}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleViewResults}
              className="btn-primary inline-flex items-center space-x-2 px-8 py-3 text-lg shadow-lg shadow-primary-500/20"
            >
              <span>View Full Results</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
                setError(null);
              }}
              className="px-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 text-glow">
          Upload Audio File
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload your conversation recording to get AI-powered insights including transcription, 
          key decisions, action items, and conversation analytics.
        </p>
      </div>

      {/* Authentication Component */}
      <Auth />

      {/* Upload Component */}
      <div className="relative z-10">
        <FileUpload
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          error={error}
        />
      </div>

      {/* Processing Information */}
      {isUploading && (
        <div className="card p-8 border-primary-500/30 shadow-lg shadow-primary-500/10">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse mr-3"></div>
            Processing Your Audio...
          </h3>
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              <span>{progressMessage}</span>
              <span className="text-primary-600 dark:text-primary-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-600 to-purple-600 relative overflow-hidden transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${uploadProgress > 0 ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <span className="text-sm font-medium">Uploading file</span>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${uploadProgress > 20 ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress > 50 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : uploadProgress > 20 ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <span className="text-sm font-medium">Transcribing audio</span>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${uploadProgress > 50 ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress > 80 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : uploadProgress > 50 ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <span className="text-sm font-medium">Analyzing conversation</span>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${uploadProgress > 80 ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress > 95 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : uploadProgress > 80 ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <span className="text-sm font-medium">Generating insights</span>
            </div>
          </div>
        </div>
      )}

      {/* Features Info */}
      {!isUploading && !selectedFile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="card p-6 text-center hover:border-primary-500/30 transition-colors group">
            <div className="w-14 h-14 bg-primary-500/10 rounded-2xl mx-auto mb-5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Mic className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Automatic Transcription
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              AI-powered speech-to-text with speaker identification and high accuracy
            </p>
          </div>
          
          <div className="card p-6 text-center hover:border-purple-500/30 transition-colors group">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl mx-auto mb-5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Smart Analysis
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Extract key decisions, action items, and conversation insights automatically
            </p>
          </div>
          
          <div className="card p-6 text-center hover:border-pink-500/30 transition-colors group">
            <div className="w-14 h-14 bg-pink-500/10 rounded-2xl mx-auto mb-5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-7 h-7 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Instant Results
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Get comprehensive conversation analytics in seconds, not hours
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;