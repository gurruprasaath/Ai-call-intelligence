/**
 * Summarization Service using Groq Llama-3.3-70b-versatile
 * 
 * This service provides intelligent summarization of conversation transcripts
 * using the powerful Llama-3.3-70b-versatile model from Groq.
 */

const Groq = require('groq-sdk');

class SummarizationService {
  constructor() {
    // Initialize the Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = process.env.GROQ_SUMMARIZATION_MODEL || 'llama-3.3-70b-versatile';
  }

  /**
   * Generate a comprehensive summary of a conversation transcript
   * @param {string} transcript - The full conversation transcript
   * @param {Object} options - Summarization options
   * @returns {Promise<Object>} Summarization result with multiple summary types
   */
  async summarizeConversation(transcript, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Starting Groq Llama summarization...`);
      
      // Check if API key is available
      if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️ GROQ_API_KEY not found in environment variables. Using fallback summary.');
        return await this.getFallbackSummary(transcript);
      }

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcript is empty or invalid');
      }

      // Prepare the summarization prompt
      const prompt = this.buildSummarizationPrompt(transcript, options);

      // Create completion using Groq Llama model
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a JSON-only conversation analyst. You MUST return only valid JSON objects without any additional text, explanations, or formatting. Never include markdown code blocks, introductory text, or explanatory comments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.9,
        stream: false
      });

      const summaryText = completion.choices[0]?.message?.content;
      
      if (!summaryText) {
        throw new Error('No summary generated from Groq API');
      }

      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`✅ Groq summarization completed in ${processingTime.toFixed(2)} seconds`);

      // Parse and structure the summary response
      const structuredSummary = this.parseSummaryResponse(summaryText);

      return {
        success: true,
        summary: structuredSummary,
        processingTime: processingTime,
        model: this.model,
        provider: 'groq',
        processedAt: new Date().toISOString(),
        metadata: {
          inputLength: transcript.length,
          outputLength: summaryText.length,
          compressionRatio: (transcript.length / summaryText.length).toFixed(2)
        }
      };

    } catch (error) {
      console.error('❌ Groq summarization failed:', error.message);
      
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        console.error(`API Error ${status}:`, errorData);
        
        if (status === 401) {
          throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY environment variable.');
        } else if (status === 429) {
          throw new Error('Groq API rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          throw new Error('Invalid request to Groq API. Please check the transcript format.');
        } else {
          throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      } else {
        // For any other error, fall back to basic summary
        console.warn('⚠️ Falling back to basic summary due to error');
        return await this.getFallbackSummary(transcript);
      }
    }
  }

  /**
   * Build a comprehensive summarization prompt
   */
  buildSummarizationPrompt(transcript, options = {}) {
    const { 
      includeActionItems = true, 
      includeKeyDecisions = true,
      includeParticipants = true,
      summaryLength = 'medium' 
    } = options;

    return `
IMPORTANT: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON.

Analyze the following conversation transcript and return a JSON object with this exact structure:

{
  "executiveSummary": "Brief 2-3 sentence overview of the entire conversation",
  "keyPoints": ["Important point or topic discussed", "Another key point", "Third key point"],
  "keyDecisions": ["Specific decision made during the call", "Another decision reached", "Third decision"],
  "actionItems": [
    {
      "task": "Description of task",
      "assignee": "Person responsible or Not specified",
      "deadline": "Deadline or Not specified"
    }
  ],
  "participants": ["Participant 1", "Participant 2"],
  "topics": ["Topic 1", "Topic 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "risks": ["Risk 1", "Risk 2"],
  "timeline": {
    "mentioned_dates": ["Date 1", "Date 2"],
    "deadlines": ["Deadline 1", "Deadline 2"]
  },
  "sentiment": "Positive",
  "confidence": 0.95
}

IMPORTANT DISTINCTIONS:
- keyPoints: Main topics, issues, or information discussed (what was talked about)
- keyDecisions: Specific decisions, agreements, or conclusions reached (what was decided)
- actionItems: Tasks assigned with specific owners and deadlines (what needs to be done)

Conversation Transcript:
${transcript}

Return only the JSON object. No additional text.`;
  }

  /**
   * Parse the structured summary response from Llama
   */
  parseSummaryResponse(summaryText) {
    try {
      // Clean the response - remove any text before and after JSON
      let cleanedText = summaryText.trim();
      
      // Remove common prefixes that Llama might add
      cleanedText = cleanedText.replace(/^.*?(?:json|format|summary):\s*/i, '');
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```\s*$/i, '');
      
      // Find JSON block if wrapped in text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanedText);
      
      // Validate and structure the response
      return {
        executiveSummary: parsed.executiveSummary || 'Summary not available',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [], // Fallback compatibility
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        participants: Array.isArray(parsed.participants) ? parsed.participants : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        timeline: parsed.timeline || { mentioned_dates: [], deadlines: [] },
        sentiment: parsed.sentiment || 'Neutral',
        confidence: parsed.confidence || 0.8
      };
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON response, using text parsing fallback');
      console.log('Raw response:', summaryText.substring(0, 200) + '...');
      
      // Fallback: parse text response manually
      return this.parseTextSummary(summaryText);
    }
  }

  /**
   * Fallback text parsing if JSON parsing fails
   */
  parseTextSummary(summaryText) {
    console.log('🔄 Using text parsing fallback...');
    
    // Try to extract meaningful information from the text
    const lines = summaryText.split('\n').filter(line => line.trim());
    
    // Look for executive summary in the text
    let executiveSummary = "Conversation analysis completed using text parsing.";
    const summaryMatch = summaryText.match(/(?:executive|summary|overview):\s*["']?([^"'\n]+)/i);
    if (summaryMatch) {
      executiveSummary = summaryMatch[1];
    } else if (lines.length > 0) {
      // Use first meaningful line as executive summary
      executiveSummary = lines[0].replace(/^[-*•"'\s]*/, '').substring(0, 200);
    }
    
    // Extract key points from bullet points or numbered lists
    const keyPointsRegex = /^[-*•]\s*(.+)|^\d+\.\s*(.+)/;
    const keyPoints = lines
      .filter(line => keyPointsRegex.test(line))
      .map(line => line.replace(keyPointsRegex, '$1$2').trim())
      .slice(0, 5);
    
    return {
      executiveSummary: executiveSummary,
      keyPoints: keyPoints.length > 0 ? keyPoints : ["Key points could not be extracted from response"],
      keyDecisions: [], // Will be empty in fallback mode
      decisions: [],
      actionItems: [],
      participants: [],
      topics: [],
      nextSteps: [],
      risks: [],
      timeline: { mentioned_dates: [], deadlines: [] },
      sentiment: 'Neutral',
      confidence: 0.7
    };
  }

  /**
   * Generate a quick summary for shorter conversations
   */
  async generateQuickSummary(transcript) {
    const options = {
      includeActionItems: true,
      includeKeyDecisions: true,
      summaryLength: 'short'
    };

    return await this.summarizeConversation(transcript, options);
  }

  /**
   * Extract action items specifically from a conversation
   */
  async extractActionItems(transcript) {
    try {
      if (!process.env.GROQ_API_KEY) {
        return { actionItems: [], success: false };
      }

      const prompt = `
Extract all action items from the following conversation. Return only a JSON array of action items in this format:
[
  {
    "task": "Description of the task",
    "assignee": "Person responsible (if mentioned, otherwise 'Not specified')",
    "deadline": "Deadline if mentioned (otherwise 'Not specified')",
    "priority": "High/Medium/Low (if determinable)"
  }
]

Conversation:
${transcript}
`;

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting action items from conversations. Return only valid JSON arrays."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      const actionItems = JSON.parse(response);

      return {
        success: true,
        actionItems: Array.isArray(actionItems) ? actionItems : []
      };

    } catch (error) {
      console.error('Error extracting action items:', error);
      return {
        success: false,
        actionItems: []
      };
    }
  }

  /**
   * Fallback summary when Groq API is not available
   */
  async getFallbackSummary(transcript) {
    console.log('🔄 Using fallback summarization');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const wordCount = transcript.split(' ').length;
    const estimatedDuration = Math.max(1, Math.floor(wordCount / 150)); // ~150 words per minute
    
    return {
      success: true,
      summary: {
        executiveSummary: "This is a fallback summary. The Groq API is not configured or unavailable. Please add your GROQ_API_KEY to enable AI-powered summarization.",
        keyPoints: [
          "Groq API key not configured",
          "Using fallback summarization method",
          "Configure GROQ_API_KEY for full functionality"
        ],
        keyDecisions: [
          "Decision to use fallback analysis mode",
          "Need to configure Groq API for full functionality"
        ],
        decisions: [],
        actionItems: [{
          task: "Configure Groq API key for AI summarization",
          assignee: "System Administrator",
          deadline: "Not specified"
        }],
        participants: ["System"],
        topics: ["Configuration", "API Setup"],
        nextSteps: ["Add GROQ_API_KEY to environment variables"],
        risks: ["Limited summarization capabilities without API key"],
        timeline: { mentioned_dates: [], deadlines: [] },
        sentiment: "Neutral",
        confidence: 0.5
      },
      processingTime: 1,
      model: 'fallback',
      provider: 'fallback',
      processedAt: new Date().toISOString(),
      metadata: {
        inputLength: transcript.length,
        outputLength: 200,
        compressionRatio: "N/A"
      }
    };
  }

  /**
   * Get supported summarization models
   */
  getSupportedModels() {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant'
    ];
  }

  /**
   * Health check for the summarization service
   */
  async healthCheck() {
    try {
      if (!process.env.GROQ_API_KEY) {
        return { status: 'warning', message: 'GROQ_API_KEY not configured' };
      }

      // Test with a small prompt
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "user", content: "Say 'API is working' if you can read this." }
        ],
        max_tokens: 10,
        temperature: 0
      });

      return { 
        status: 'healthy', 
        message: 'Groq API connection successful',
        model: this.model
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: `Groq API connection failed: ${error.message}`
      };
    }
  }
}

module.exports = new SummarizationService();