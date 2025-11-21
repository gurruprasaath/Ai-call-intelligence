import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { 
  ConversationSummary, 
  KeyDecisions, 
  KeyPoints,
  ActionItems, 
  ConversationInsights,
  Classification 
} from '../components/ResultsDisplay';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileAudio, 
  Download,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';

const CallDetails = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioRef] = useState(React.createRef());

  useEffect(() => {
    if (callId) {
      loadCallDetails();
    }
  }, [callId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const loadCallDetails = async () => {
    try {
      setLoading(true);
      const callData = await apiService.getCallDetails(callId);
      setCall(callData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading call details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      console.log('🗑️ Attempting to delete call:', callId);
      
      const result = await apiService.deleteCall(callId);
      console.log('✅ Delete successful:', result);
      
      // Show success message and navigate
      alert('Call deleted successfully!');
      navigate('/calls');
      
    } catch (err) {
      console.error('❌ Error deleting call:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete call';
      
      if (err.message.includes('Call not found')) {
        errorMessage = 'This call no longer exists or you do not have permission to delete it.';
      } else if (err.message.includes('Network Error') || err.message.includes('timeout')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this call.';
      } else if (err.response?.status === 404) {
        errorMessage = 'This call no longer exists.';
      } else if (err.message) {
        errorMessage += ': ' + err.message;
      }
      
      alert(errorMessage);
      
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = (format = 'json') => {
    if (!call) return;

    try {
      if (format === 'json') {
        exportAsJSON();
      } else if (format === 'pdf') {
        exportAsPDF();
      } else if (format === 'txt') {
        exportAsText();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export call data: ' + error.message);
    }
  };

  const exportAsJSON = () => {
    const exportData = {
      callInfo: {
        id: call.id,
        filename: call.filename,
        uploadedAt: call.uploadedAt,
        status: call.status,
        fileSize: call.fileSize
      },
      transcription: call.transcription,
      analysis: call.analysis,
      exportedAt: new Date().toISOString(),
      exportFormat: 'JSON'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call-analysis-${call.filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    let textContent = `CALL ANALYSIS REPORT\n`;
    textContent += `${'='.repeat(50)}\n\n`;
    
    // Call Information
    textContent += `CALL INFORMATION:\n`;
    textContent += `- File: ${call.filename}\n`;
    textContent += `- Upload Date: ${formatDate(call.uploadedAt)}\n`;
    textContent += `- Status: ${call.status}\n`;
    if (call.transcription?.duration) {
      textContent += `- Duration: ${formatDuration(call.transcription.duration)}\n`;
    }
    if (call.transcription?.confidence) {
      textContent += `- Confidence: ${Math.round(call.transcription.confidence * 100)}%\n`;
    }
    textContent += `\n`;

    // Classification
    if (call.analysis?.classification) {
      textContent += `CALL CLASSIFICATION:\n`;
      textContent += `- Category: ${call.analysis.classification.category}\n`;
      textContent += `- Confidence: ${Math.round(call.analysis.classification.confidence * 100)}%\n`;
      textContent += `- Level: ${call.analysis.classification.confidenceLevel}\n`;
      textContent += `\n`;
    }

    // Summary
    if (call.analysis?.summary) {
      textContent += `CONVERSATION SUMMARY:\n`;
      call.analysis.summary.forEach((point, index) => {
        textContent += `${index + 1}. ${point}\n`;
      });
      textContent += `\n`;
    }

    // Key Decisions
    if (call.analysis?.keyDecisions && call.analysis.keyDecisions.length > 0) {
      textContent += `KEY DECISIONS:\n`;
      call.analysis.keyDecisions.forEach((decision, index) => {
        textContent += `${index + 1}. ${decision.decision}\n`;
        textContent += `   Reasoning: ${decision.reasoning}\n`;
        textContent += `   Confidence: ${decision.confidence}\n`;
        textContent += `\n`;
      });
    }

    // Key Points
    if (call.analysis?.keyPoints && call.analysis.keyPoints.length > 0) {
      textContent += `KEY POINTS:\n`;
      call.analysis.keyPoints.forEach((point, index) => {
        textContent += `${index + 1}. ${point.point}\n`;
        textContent += `   Importance: ${point.importance}\n`;
        textContent += `   Category: ${point.category}\n`;
        textContent += `\n`;
      });
    }

    // Action Items
    if (call.analysis?.actionItems && call.analysis.actionItems.length > 0) {
      textContent += `ACTION ITEMS:\n`;
      call.analysis.actionItems.forEach((item, index) => {
        textContent += `${index + 1}. ${item.task}\n`;
        textContent += `   Assigned to: ${item.assignedTo}\n`;
        textContent += `   Deadline: ${item.deadline}\n`;
        textContent += `   Priority: ${item.priority}\n`;
        textContent += `   Status: ${item.status}\n`;
        textContent += `\n`;
      });
    }

    // Transcription
    if (call.transcription?.text) {
      textContent += `FULL TRANSCRIPTION:\n`;
      textContent += `${'-'.repeat(30)}\n`;
      textContent += `${call.transcription.text}\n\n`;
    }

    textContent += `Report generated on: ${new Date().toLocaleString()}\n`;

    const dataBlob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call-analysis-${call.filename}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    // For PDF export, we'll create an HTML version and use the browser's print functionality
    const printWindow = window.open('', '_blank');
    const htmlContent = generatePrintableHTML();
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generatePrintableHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Call Analysis Report - ${call.filename}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #007bff; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .section { 
            margin-bottom: 25px; 
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #007bff; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 5px; 
            margin-bottom: 15px; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 20px; 
          }
          .info-item { 
            margin-bottom: 10px; 
          }
          .info-label { 
            font-weight: bold; 
            color: #555; 
          }
          .classification-badge {
            display: inline-block;
            padding: 4px 8px;
            background-color: #e3f2fd;
            color: #1976d2;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
          }
          .decision-item, .point-item, .action-item { 
            margin-bottom: 15px; 
            padding: 10px; 
            border-left: 3px solid #007bff; 
            background-color: #f8f9fa; 
          }
          .transcription { 
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            font-size: 14px; 
            white-space: pre-wrap; 
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 12px; 
            color: #666; 
          }
          @media print {
            body { margin: 0; padding: 15px; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Call Analysis Report</h1>
          <h2>${call.filename}</h2>
        </div>

        <div class="section">
          <div class="section-title">Call Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">File:</span> ${call.filename}
            </div>
            <div class="info-item">
              <span class="info-label">Upload Date:</span> ${formatDate(call.uploadedAt)}
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span> ${call.status}
            </div>
            ${call.transcription?.duration ? `<div class="info-item">
              <span class="info-label">Duration:</span> ${formatDuration(call.transcription.duration)}
            </div>` : ''}
            ${call.transcription?.confidence ? `<div class="info-item">
              <span class="info-label">Confidence:</span> ${Math.round(call.transcription.confidence * 100)}%
            </div>` : ''}
          </div>
        </div>

        ${call.analysis?.classification ? `
        <div class="section">
          <div class="section-title">Call Classification</div>
          <p>
            <span class="classification-badge">${call.analysis.classification.category}</span>
            - ${Math.round(call.analysis.classification.confidence * 100)}% Confidence (${call.analysis.classification.confidenceLevel})
          </p>
        </div>
        ` : ''}

        ${call.analysis?.summary ? `
        <div class="section">
          <div class="section-title">Conversation Summary</div>
          <ul>
            ${call.analysis.summary.map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${call.analysis?.keyDecisions && call.analysis.keyDecisions.length > 0 ? `
        <div class="section">
          <div class="section-title">Key Decisions</div>
          ${call.analysis.keyDecisions.map(decision => `
            <div class="decision-item">
              <strong>${decision.decision}</strong><br>
              <em>Reasoning:</em> ${decision.reasoning}<br>
              <em>Confidence:</em> ${decision.confidence}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${call.analysis?.keyPoints && call.analysis.keyPoints.length > 0 ? `
        <div class="section">
          <div class="section-title">Key Points</div>
          ${call.analysis.keyPoints.map(point => `
            <div class="point-item">
              <strong>${point.point}</strong><br>
              <em>Importance:</em> ${point.importance} | <em>Category:</em> ${point.category}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${call.analysis?.actionItems && call.analysis.actionItems.length > 0 ? `
        <div class="section">
          <div class="section-title">Action Items</div>
          ${call.analysis.actionItems.map(item => `
            <div class="action-item">
              <strong>${item.task}</strong><br>
              <em>Assigned to:</em> ${item.assignedTo} | 
              <em>Deadline:</em> ${item.deadline} | 
              <em>Priority:</em> ${item.priority} | 
              <em>Status:</em> ${item.status}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${call.transcription?.text ? `
        <div class="section">
          <div class="section-title">Full Transcription</div>
          <div class="transcription">${call.transcription.text}</div>
        </div>
        ` : ''}

        <div class="footer">
          Report generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio player handlers
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const clickX = e.nativeEvent.offsetX;
      const width = e.currentTarget.offsetWidth;
      const newTime = (clickX / width) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const getAudioUrl = (callId) => {
    // Construct the audio URL based on your backend setup
    return `http://localhost:3001/api/audio/${callId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/calls')}
            className="btn-primary"
          >
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Call not found</p>
          <button
            onClick={() => navigate('/calls')}
            className="btn-primary"
          >
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/calls')}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Call Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {call.filename}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="relative export-menu">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="py-1">
                  <button
                    onClick={() => { handleExport('json'); setShowExportMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📄 Export as JSON
                  </button>
                  <button
                    onClick={() => { handleExport('txt'); setShowExportMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📝 Export as Text
                  </button>
                  <button
                    onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📑 Export as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 inline-flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Call Info */}
      <div className="card p-6">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <FileAudio className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Upload Date</p>
              <div className="flex items-center space-x-1 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(call.uploadedAt)}
                </p>
              </div>
            </div>
            
            {call.transcription?.duration && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDuration(call.transcription.duration)}
                  </p>
                </div>
              </div>
            )}
            
            {call.transcription?.confidence && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {Math.round(call.transcription.confidence * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Player Section */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audio Player
          </h3>
        </div>
        
        {/* Audio Element (Hidden) */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        >
          <source src={getAudioUrl(call.id)} type="audio/mpeg" />
          <source src={getAudioUrl(call.id)} type="audio/wav" />
          Your browser does not support the audio element.
        </audio>

        {/* Custom Audio Controls */}
        <div className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* Time Display */}
            <div className="text-sm text-gray-600 dark:text-gray-400 min-w-[100px]">
              {formatDuration(currentTime)} / {formatDuration(duration || 0)}
            </div>

            {/* Volume Controls */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={toggleMute}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-100"
                style={{
                  width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                }}
              ></div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Original file: {call.filename}</span>
            <span>
              {call.transcription?.confidence && 
                `Transcription confidence: ${Math.round(call.transcription.confidence * 100)}%`
              }
            </span>
          </div>
        </div>
      </div>

      {/* Classification Section */}
      {call.analysis?.classification && (
        <Classification classification={call.analysis.classification} />
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ConversationSummary summary={call.analysis?.summary} />
          <KeyDecisions decisions={call.analysis?.keyDecisions} />
          <KeyPoints keyPoints={call.analysis?.keyPoints} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ActionItems actionItems={call.analysis?.actionItems} />
          <ConversationInsights insights={call.analysis?.insights} />
        </div>
      </div>

      {/* Transcription */}
      {call.transcription?.text && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Full Transcription
          </h3>
          
          {call.transcription.speakers && call.transcription.speakers.length > 0 ? (
            <div className="space-y-4">
              {call.transcription.speakers.map((speaker, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-primary-600 dark:text-primary-400">
                    {speaker.name}
                  </h4>
                  {speaker.segments?.map((segment, segIndex) => (
                    <div key={segIndex} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300">
                        {segment.text}
                      </p>
                      {segment.start !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDuration(segment.start)} - {formatDuration(segment.end)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {call.transcription.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallDetails;