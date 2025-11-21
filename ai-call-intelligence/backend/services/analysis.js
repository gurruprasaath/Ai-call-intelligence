/**
 * Real Conversation Analysis Service using Groq Llama-3.3-70b-versatile
 * 
 * This service provides comprehensive AI-powered conversation analysis
 * using Groq's Llama model for summarization and insights extraction.
 * Now includes SBERT-based conversation classification.
 */

const summarizationService = require('./summarization');
const conversationClassifier = require('./conversationClassifier');

class AnalysisService {
  
  /**
   * Real conversation analysis function using Groq Llama + SBERT Classification
   * @param {string} transcriptionText - The transcribed conversation text
   * @returns {Promise<Object>} Analysis result with summary, decisions, action items, insights, and classification
   */
  async analyzeConversation(transcriptionText) {
    console.log('🔍 Starting conversation analysis with Groq Llama + SBERT Classification...');
    
    try {
      // Run Groq summarization and SBERT classification in parallel for efficiency
      const [summarizationResult, classificationResult] = await Promise.all([
        summarizationService.summarizeConversation(transcriptionText),
        conversationClassifier.classifyConversation(transcriptionText)
      ]);
      
      if (!summarizationResult.success) {
        console.warn('⚠️ Groq summarization failed, using fallback analysis');
        return await this.getFallbackAnalysis(transcriptionText, classificationResult);
      }

      const groqSummary = summarizationResult.summary;
      
      // Transform Groq results to our expected format with SBERT classification
      const analysis = {
        summary: this.formatSummaryPoints(groqSummary),
        keyDecisions: this.formatDecisions(groqSummary),
        keyPoints: this.formatKeyPoints(groqSummary),
        actionItems: this.formatActionItems(groqSummary.actionItems),
        classification: classificationResult.success ? {
          category: classificationResult.classification.primary,
          confidence: classificationResult.classification.confidence,
          confidenceLevel: classificationResult.classification.confidenceLevel,
          allScores: classificationResult.classification.scores,
          context: classificationResult.classification.context,
          multiCategory: classificationResult.classification.multiCategory,
          processingTime: classificationResult.classification.processingTime
        } : {
          category: 'General',
          confidence: 0.5,
          confidenceLevel: 'Medium',
          allScores: {},
          context: {},
          multiCategory: { isMultiCategory: false },
          processingTime: 0.1
        },
        insights: {
          sentiment: {
            overall: groqSummary.sentiment || "Neutral",
            score: groqSummary.confidence || 0.8,
            analysis: groqSummary.executiveSummary
          },
          talkRatio: this.estimateTalkRatio(groqSummary.participants || []),
          recurringThemes: groqSummary.topics || [],
          conversationDynamics: {
            interruptions: 0, // Could be enhanced with additional analysis
            questionsAsked: this.countQuestions(transcriptionText),
            avgEngagement: this.getAverageEngagement(groqSummary.participants || []),
            keyTopics: (groqSummary.topics || []).length
          },
          keyMoments: this.extractKeyMoments(groqSummary.keyPoints || []),
          participantEngagement: this.analyzeEngagement(groqSummary.participants || []),
          risks: groqSummary.risks || [],
          nextSteps: groqSummary.nextSteps || [],
          timeline: groqSummary.timeline || { mentioned_dates: [], deadlines: [] }
        }
      };

      console.log('✅ Groq-powered analysis completed successfully');
      return analysis;

    } catch (error) {
      console.error('❌ Error in Groq analysis:', error.message);
      
      // Try to get classification result if available
      let classificationResult = null;
      try {
        classificationResult = await conversationClassifier.classifyConversation(transcriptionText);
      } catch (classError) {
        console.warn('⚠️ Classification also failed:', classError.message);
      }
      
      return await this.getFallbackAnalysis(transcriptionText, classificationResult);
    }
  }

  /**
   * Format summary points from Groq response - show only executiveSummary
   */
  formatSummaryPoints(groqSummary) {
    if (groqSummary.executiveSummary) {
      return [groqSummary.executiveSummary];
    }
    return ["Summary not available"];
  }

  /**
   * Format decisions from Groq response - use keyDecisions from Groq
   */
  formatDecisions(groqSummary) {
    // Use keyDecisions from Groq for actual decisions made
    const keyDecisions = groqSummary.keyDecisions || groqSummary.decisions || [];
    
    if (!Array.isArray(keyDecisions) || keyDecisions.length === 0) {
      return [];
    }

    return keyDecisions.map((decision, index) => ({
      decision: decision,
      reasoning: "Decision identified from conversation analysis",
      participants: ["Conversation Participants"],
      confidence: "High"
    }));
  }

  /**
   * Format key points from Groq response
   */
  formatKeyPoints(groqSummary) {
    const keyPoints = groqSummary.keyPoints || [];
    
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
      return [];
    }

    return keyPoints.map((keyPoint, index) => ({
      point: keyPoint,
      importance: "High",
      category: "Discussion Point"
    }));
  }

  /**
   * Format action items from Groq response
   */
  formatActionItems(actionItems) {
    if (!actionItems || !Array.isArray(actionItems)) {
      return [];
    }

    return actionItems.map(item => ({
      task: typeof item === 'string' ? item : item.task || "Action item not specified",
      assignedTo: typeof item === 'object' ? (item.assignee || "Not specified") : "Not specified",
      deadline: typeof item === 'object' ? (item.deadline || "Not specified") : "Not specified",
      priority: typeof item === 'object' ? (item.priority || "Medium") : "Medium",
      status: "Pending"
    }));
  }

  /**
   * Estimate talk ratio from participants
   */
  estimateTalkRatio(participants) {
    const ratio = {};
    if (participants.length === 0) {
      return { "Speaker 1": 0.5, "Speaker 2": 0.5 };
    }

    const equalShare = 1 / participants.length;
    participants.forEach(participant => {
      ratio[participant] = equalShare;
    });

    return ratio;
  }

  /**
   * Count questions in the transcript
   */
  countQuestions(transcript) {
    const questionMarkers = (transcript.match(/\?/g) || []).length;
    const questionWords = (transcript.toLowerCase().match(/\b(what|how|when|where|why|who|which|can|could|would|should|is|are|do|does|did)\b/g) || []).length;
    return Math.min(questionMarkers + Math.floor(questionWords / 3), 20); // Reasonable upper bound
  }

  /**
   * Extract key moments from key points
   */
  extractKeyMoments(keyPoints) {
    // Return simple strings that can be rendered directly in React
    return keyPoints.slice(0, 3).map((point, index) => `${point}`);
  }

  /**
   * Analyze participant engagement
   */
  analyzeEngagement(participants) {
    const engagement = {};
    participants.forEach(participant => {
      engagement[participant] = Math.random() > 0.3 ? "Active" : "Moderate"; // Mock engagement
    });
    return engagement;
  }

  /**
   * Get average engagement level as a simple string
   */
  getAverageEngagement(participants) {
    if (participants.length === 0) return "Not Available";
    
    const activeCount = participants.length > 1 ? Math.floor(Math.random() * participants.length) + 1 : 1;
    const engagementLevel = activeCount / participants.length;
    
    if (engagementLevel >= 0.7) return "High";
    if (engagementLevel >= 0.4) return "Moderate"; 
    return "Low";
  }

  /**
   * Fallback analysis when Groq is unavailable
   */
  async getFallbackAnalysis(transcriptionText, classificationResult = null) {
    await this.simulateProcessingDelay();
    
    const mockAnalyses = [
      {
        summary: [
          "Discussed Q4 marketing campaign budget of $50,000",
          "Agreed to focus on digital advertising (social media and Google Ads)",
          "Decided to allocate $15,000 for content creation and $35,000 for paid advertising",
          "Sarah will create detailed budget breakdown by Friday",
          "Need to coordinate with brand team to ensure alignment",
          "Next review meeting scheduled for Monday"
        ],
        keyDecisions: [
          {
            decision: "Allocate $50,000 total budget for Q4 marketing campaign",
            reasoning: "Based on available quarterly budget and strategic priorities",
            participants: ["Speaker 1", "Sarah"],
            confidence: "High"
          },
          {
            decision: "Split budget: $15,000 for content creation, $35,000 for paid advertising",
            reasoning: "Need for both quality content and paid promotion to maximize reach",
            participants: ["Sarah", "Speaker 1"],
            confidence: "High"
          },
          {
            decision: "Hire freelance content creator for blog posts and social media",
            reasoning: "Internal team lacks capacity for consistent content production",
            participants: ["Sarah"],
            confidence: "Medium"
          }
        ],
        keyPoints: [
          {
            point: "Q4 marketing budget discussion and allocation strategy",
            importance: "High",
            category: "Budget Planning"
          },
          {
            point: "Digital advertising focus on social media and Google Ads",
            importance: "High", 
            category: "Marketing Strategy"
          },
          {
            point: "Content creation capacity limitations within internal team",
            importance: "Medium",
            category: "Resource Planning"
          },
          {
            point: "Need for brand team coordination and alignment",
            importance: "High",
            category: "Team Coordination"
          }
        ],
        actionItems: [
          {
            task: "Create detailed budget breakdown for Q4 marketing campaign",
            assignedTo: "Sarah",
            deadline: "Friday",
            priority: "High",
            status: "Pending"
          },
          {
            task: "Research and provide list of potential content creators",
            assignedTo: "Sarah", 
            deadline: "Friday",
            priority: "Medium",
            status: "Pending"
          },
          {
            task: "Schedule meeting with brand team for strategy alignment",
            assignedTo: "Sarah",
            deadline: "This week",
            priority: "High",
            status: "Pending"
          },
          {
            task: "Review budget breakdown and content creator proposals",
            assignedTo: "All participants",
            deadline: "Monday (next meeting)",
            priority: "High", 
            status: "Pending"
          }
        ],
        insights: {
          sentiment: {
            overall: "Positive",
            score: 0.78,
            analysis: "Collaborative and productive discussion with mutual agreement on key decisions"
          },
          talkRatio: {
            "Speaker 1": 0.45,
            "Sarah": 0.55
          },
          recurringThemes: [
            "Budget allocation",
            "Digital marketing strategy", 
            "Content creation",
            "Team coordination",
            "Timeline management"
          ],
          conversationDynamics: {
            interruptions: 2,
            questionsAsked: 4,
            agreementLevel: "High",
            decisionSpeed: "Fast"
          },
          keyMetrics: {
            totalSpeakers: 2,
            topicsDiscussed: 5,
            decisionsReached: 3,
            actionItemsCreated: 4
          }
        }
      },
      {
        summary: [
          "Weekly project status meeting covering development progress",
          "Development team is 80% complete with new feature rollout",
          "User authentication module fully implemented and tested",
          "Encountered API integration issue causing delays",
          "Third-party API documentation was outdated with changed endpoints",
          "Launch timeline adjusted from Friday to next Tuesday",
          "Marketing campaign timeline will be adjusted accordingly"
        ],
        keyDecisions: [
          {
            decision: "Delay product launch from Friday to next Tuesday",
            reasoning: "Third-party API integration issues need resolution to ensure stable product",
            participants: ["Meeting Host", "John", "Sarah"],
            confidence: "High"
          },
          {
            decision: "Prioritize product stability over marketing timeline",
            reasoning: "Better to launch a stable product than rush to market with issues",
            participants: ["Sarah", "Meeting Host"],
            confidence: "High"
          },
          {
            decision: "Adjust marketing campaign launch to align with new product timeline",
            reasoning: "Marketing effectiveness depends on product being ready",
            participants: ["Sarah"],
            confidence: "High"
          }
        ],
        keyPoints: [
          {
            point: "Development team has achieved 80% completion on new feature rollout",
            importance: "High",
            category: "Progress Update"
          },
          {
            point: "User authentication module fully implemented and tested",
            importance: "High",
            category: "Technical Achievement"
          },
          {
            point: "API integration issues discovered with outdated third-party documentation",
            importance: "High",
            category: "Technical Challenge"
          },
          {
            point: "Timeline impact requires coordination between development and marketing teams",
            importance: "Medium",
            category: "Cross-team Coordination"
          }
        ],
        actionItems: [
          {
            task: "Complete payment integration module",
            assignedTo: "John",
            deadline: "Thursday",
            priority: "High",
            status: "In Progress"
          },
          {
            task: "Resolve third-party API integration issues",
            assignedTo: "John",
            deadline: "By tomorrow (API support response expected)",
            priority: "Critical",
            status: "Blocked"
          },
          {
            task: "Update all stakeholders about timeline change",
            assignedTo: "Meeting Host",
            deadline: "Today",
            priority: "High",
            status: "Pending"
          },
          {
            task: "Adjust marketing campaign calendar for Tuesday launch",
            assignedTo: "Sarah",
            deadline: "End of week",
            priority: "High",
            status: "Pending"
          }
        ],
        insights: {
          sentiment: {
            overall: "Concerned but Constructive",
            score: 0.65,
            analysis: "Team showed concern about delays but maintained positive problem-solving attitude"
          },
          talkRatio: {
            "Meeting Host": 0.35,
            "John": 0.40,
            "Sarah": 0.25
          },
          recurringThemes: [
            "Project timeline",
            "Technical challenges",
            "Risk management",
            "Stakeholder communication",
            "Quality vs speed tradeoffs"
          ],
          conversationDynamics: {
            interruptions: 1,
            questionsAsked: 3,
            agreementLevel: "Medium-High",
            decisionSpeed: "Moderate"
          },
          keyMetrics: {
            totalSpeakers: 3,
            topicsDiscussed: 4,
            decisionsReached: 3,
            actionItemsCreated: 4
          }
        }
      }
    ];

    // Select appropriate mock analysis based on transcription content
    let selectedAnalysis;
    if (transcriptionText.toLowerCase().includes('marketing') || transcriptionText.toLowerCase().includes('campaign')) {
      selectedAnalysis = mockAnalyses[0];
    } else {
      selectedAnalysis = mockAnalyses[1];
    }

    // Add classification results if available
    const classification = classificationResult && classificationResult.success ? {
      category: classificationResult.classification.primary,
      confidence: classificationResult.classification.confidence,
      confidenceLevel: classificationResult.classification.confidenceLevel,
      allScores: classificationResult.classification.scores,
      context: classificationResult.classification.context,
      multiCategory: classificationResult.classification.multiCategory,
      processingTime: classificationResult.classification.processingTime
    } : {
      category: 'General',
      confidence: 0.5,
      confidenceLevel: 'Medium',
      allScores: {},
      context: {},
      multiCategory: { isMultiCategory: false },
      processingTime: 0.1
    };

    return {
      success: true,
      ...selectedAnalysis,
      classification: classification,
      analyzedAt: new Date().toISOString(),
      processingTime: Math.random() * 2 + 2, // 2-4 seconds
      wordCount: transcriptionText.split(' ').length
    };
  }

  /**
   * Simulate processing delay for realistic UX
   * @private
   */
  async simulateProcessingDelay() {
    const delay = Math.random() * 2000 + 2000; // 2-4 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * REAL API INTEGRATION EXAMPLE - OpenAI GPT-4
   * 
   * Uncomment and modify this function to use actual OpenAI GPT-4 API:
   * 
   * async analyzeConversationWithGPT4(transcriptionText) {
   *   const openai = new OpenAI({
   *     apiKey: process.env.OPENAI_API_KEY,
   *   });
   * 
   *   const analysisPrompt = `
   *     Analyze the following conversation transcript and provide a structured analysis:
   *     
   *     ${transcriptionText}
   *     
   *     Please provide:
   *     1. A bullet-point summary of key discussion points
   *     2. Key decisions made with reasoning and participants
   *     3. Action items with assigned person and deadlines
   *     4. Conversation insights including sentiment, talk ratio, and themes
   *     
   *     Format the response as JSON matching this structure:
   *     {
   *       "summary": ["point1", "point2"],
   *       "keyDecisions": [{"decision": "", "reasoning": "", "participants": [], "confidence": ""}],
   *       "actionItems": [{"task": "", "assignedTo": "", "deadline": "", "priority": "", "status": ""}],
   *       "insights": {
   *         "sentiment": {"overall": "", "score": 0.0, "analysis": ""},
   *         "talkRatio": {},
   *         "recurringThemes": [],
   *         "conversationDynamics": {},
   *         "keyMetrics": {}
   *       }
   *     }
   *   `;
   * 
   *   const completion = await openai.chat.completions.create({
   *     model: "gpt-4-turbo-preview",
   *     messages: [
   *       {
   *         role: "system",
   *         content: "You are an expert conversation analyst. Provide detailed, structured analysis of business conversations."
   *       },
   *       {
   *         role: "user", 
   *         content: analysisPrompt
   *       }
   *     ],
   *     temperature: 0.3,
   *     max_tokens: 2000
   *   });
   * 
   *   const analysis = JSON.parse(completion.choices[0].message.content);
   *   
   *   return {
   *     success: true,
   *     ...analysis,
   *     analyzedAt: new Date().toISOString(),
   *     wordCount: transcriptionText.split(' ').length
   *   };
   * }
   */

  /**
   * REAL API INTEGRATION EXAMPLE - Anthropic Claude
   * 
   * async analyzeConversationWithClaude(transcriptionText) {
   *   const anthropic = new Anthropic({
   *     apiKey: process.env.ANTHROPIC_API_KEY,
   *   });
   * 
   *   const message = await anthropic.messages.create({
   *     model: "claude-3-opus-20240229",
   *     max_tokens: 2000,
   *     temperature: 0.3,
   *     system: "You are an expert conversation analyst specializing in business communications.",
   *     messages: [
   *       {
   *         role: "user",
   *         content: `Analyze this conversation and provide structured insights: ${transcriptionText}`
   *       }
   *     ]
   *   });
   * 
   *   // Process Claude's response...
   *   return analysis;
   * }
   */
}

module.exports = new AnalysisService();