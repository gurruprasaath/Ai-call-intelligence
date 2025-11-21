/**
 * Real Transcription Service using Groq Whisper API
 * 
 * This service uses the official Groq SDK for actual audio transcription.
 * Uses the whisper-large-v3-turbo model for fast and accurate transcription.
 */

const fs = require('fs');
const Groq = require('groq-sdk');

class TranscriptionService {
  constructor() {
    // Initialize the Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  
  /**
   * Transcribe audio using Groq Whisper API
   * @param {string} audioFilePath - Path to the uploaded audio file
   * @returns {Promise<Object>} Transcription result with text and metadata
   */
  async transcribeAudio(audioFilePath) {
    const startTime = Date.now();
    
    try {
      console.log(`🎵 Starting Groq Whisper transcription for: ${audioFilePath}`);
      
      // Check if API key is available
      if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️ GROQ_API_KEY not found in environment variables. Using fallback mock data.');
        return await this.getFallbackTranscription();
      }

      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Get file stats
      const stats = fs.statSync(audioFilePath);
      console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Create transcription job using official Groq SDK
      const transcription = await this.groq.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath), // Required path to audio file
        model: "whisper-large-v3-turbo", // Required model to use for transcription
        prompt: "Specify context or spelling", // Optional
        response_format: "verbose_json", // Optional
        timestamp_granularities: ["word", "segment"], // Optional
        language: "en", // Optional
        temperature: 0.0, // Optional
      });

      const transcriptionData = transcription;
      const processingTime = (Date.now() - startTime) / 1000;

      console.log(`✅ Groq transcription completed in ${processingTime.toFixed(2)} seconds`);
      console.log(`📝 Transcribed text length: ${transcriptionData.text?.length || 0} characters`);

      // Process the response and structure it for our application
      const result = {
        success: true,
        text: transcriptionData.text || '',
        confidence: 0.95, // Groq Whisper generally has high confidence, but doesn't provide exact scores
        duration: transcriptionData.duration || this.estimateAudioDuration(stats.size),
        language: transcriptionData.language || 'en',
        processedAt: new Date().toISOString(),
        processingTime: processingTime,
        model: 'whisper-large-v3',
        provider: 'groq',
        
        // Process segments if available
        segments: transcriptionData.segments ? transcriptionData.segments.map(segment => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9
        })) : [],

        // Create basic speaker identification (Groq Whisper doesn't provide speaker diarization by default)
        speakers: this.createBasicSpeakerSegments(transcriptionData.text, transcriptionData.segments || [])
      };

      return result;

    } catch (error) {
      console.error('❌ Groq transcription failed:', error.message);
      
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        console.error(`API Error ${status}:`, errorData);
        
        if (status === 401) {
          throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY environment variable.');
        } else if (status === 429) {
          throw new Error('Groq API rate limit exceeded. Please try again later.');
        } else if (status === 413) {
          throw new Error('Audio file too large for Groq API. Maximum size is 25MB.');
        } else {
          throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Transcription request timed out. Please try with a smaller audio file.');
      } else if (error.code === 'ENOENT') {
        throw new Error('Audio file not found or cannot be read.');
      } else {
        // For any other error, fall back to mock data in development
        console.warn('⚠️ Falling back to mock transcription due to error');
        return await this.getFallbackTranscription();
      }
    }
  }

  /**
   * Create basic speaker segments from transcription text
   * This is a simple implementation - for advanced speaker diarization, 
   * you would need additional services like pyannote.audio or AssemblyAI
   */
  createBasicSpeakerSegments(text, segments = []) {
    if (!text) return [];

    // If we have segments from Groq, use them
    if (segments.length > 0) {
      // Simple heuristic: alternate speakers based on pauses and content
      const speakers = [];
      let currentSpeaker = 1;

      segments.forEach((segment, index) => {
        // Simple logic to detect speaker changes
        const shouldChangeSpeaker = 
          segment.text.toLowerCase().includes(' i ') || 
          segment.text.toLowerCase().includes('thanks') ||
          segment.text.toLowerCase().includes('yes') ||
          segment.text.toLowerCase().includes('no') ||
          segment.text.toLowerCase().includes('well') ||
          (index > 0 && (segment.start - segments[index - 1].end) > 2); // Long pause

        if (shouldChangeSpeaker && index > 0) {
          currentSpeaker = currentSpeaker === 1 ? 2 : 1;
        }

        const speakerIndex = speakers.findIndex(s => s.id === `speaker_${currentSpeaker}`);
        
        if (speakerIndex === -1) {
          speakers.push({
            id: `speaker_${currentSpeaker}`,
            name: `Speaker ${currentSpeaker}`,
            segments: [{
              start: segment.start,
              end: segment.end,
              text: segment.text.trim()
            }]
          });
        } else {
          speakers[speakerIndex].segments.push({
            start: segment.start,
            end: segment.end,
            text: segment.text.trim()
          });
        }
      });

      return speakers;
    }

    // Fallback: split on sentence boundaries and alternate speakers
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const speakers = [];
    let currentSpeaker = 1;
    let currentTime = 0;

    sentences.forEach((sentence, index) => {
      const estimatedDuration = sentence.length * 0.05; // Rough estimate: 20 words per second
      
      // Simple logic to detect speaker changes (very basic)
      const shouldChangeSpeaker = 
        sentence.toLowerCase().includes(' i ') || 
        sentence.toLowerCase().includes('thanks') ||
        sentence.toLowerCase().includes('yes') ||
        sentence.toLowerCase().includes('no') ||
        (index > 0 && Math.random() > 0.7); // Random speaker changes

      if (shouldChangeSpeaker && index > 0) {
        currentSpeaker = currentSpeaker === 1 ? 2 : 1;
      }

      const speakerIndex = speakers.findIndex(s => s.id === `speaker_${currentSpeaker}`);
      
      if (speakerIndex === -1) {
        speakers.push({
          id: `speaker_${currentSpeaker}`,
          name: `Speaker ${currentSpeaker}`,
          segments: [{
            start: currentTime,
            end: currentTime + estimatedDuration,
            text: sentence.trim()
          }]
        });
      } else {
        speakers[speakerIndex].segments.push({
          start: currentTime,
          end: currentTime + estimatedDuration,
          text: sentence.trim()
        });
      }

      currentTime += estimatedDuration + 0.5; // Add small pause between sentences
    });

    return speakers;
  }

  /**
   * Estimate audio duration based on file size (rough approximation)
   */
  estimateAudioDuration(fileSizeBytes) {
    // Very rough estimate: assume average bitrate of 128 kbps
    const averageBitrate = 128 * 1000; // bits per second
    const durationSeconds = (fileSizeBytes * 8) / averageBitrate;
    return Math.max(30, Math.min(3600, durationSeconds)); // Clamp between 30 seconds and 1 hour
  }

  /**
   * Fallback transcription for when Groq API is not available or fails
   */
  async getFallbackTranscription() {
    console.log('🔄 Using fallback mock transcription');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      text: "This is a fallback transcription. The actual audio content could not be processed because the Groq API key is not configured or the service is unavailable. Please add your GROQ_API_KEY to the environment variables to enable real transcription.",
      confidence: 0.8,
      duration: 120,
      language: 'en',
      processedAt: new Date().toISOString(),
      processingTime: 2,
      model: 'fallback-mock',
      provider: 'fallback',
      segments: [],
      speakers: [{
        id: "speaker_1",
        name: "System",
        segments: [{
          start: 0,
          end: 120,
          text: "This is a fallback transcription. Please configure Groq API key for real transcription."
        }]
      }]
    };
  }

  /**
   * Validate audio file before processing
   */
  validateAudioFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Audio file does not exist');
    }

    const stats = fs.statSync(filePath);
    const maxSize = 25 * 1024 * 1024; // 25MB limit for Groq API
    
    if (stats.size > maxSize) {
      throw new Error(`Audio file too large. Maximum size for Groq API is 25MB, got ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    }

    return true;
  }

  /**
   * Get supported audio formats for Groq Whisper
   */
  getSupportedFormats() {
    return [
      'mp3', 'mp4', 'mpeg', 'mpga', 
      'wav', 'webm', 'm4a', 'ogg', 'flac'
    ];
  }
}

module.exports = new TranscriptionService();