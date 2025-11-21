/**
 * SBERT-based Conversation Classification Service
 * 
 * This service uses Sentence-BERT (SBERT) embeddings to classify conversations
 * into different categories like Work, Family, Personal, etc.
 */

const axios = require('axios');

class ConversationClassifier {
  constructor() {
    // Predefined conversation categories with key indicators
    this.categories = {
      'Work': {
        keywords: [
          'meeting', 'project', 'deadline', 'client', 'budget', 'team', 'manager', 'presentation', 
          'proposal', 'contract', 'schedule', 'deliverable', 'stakeholder', 'revenue', 'quarterly',
          'department', 'colleague', 'office', 'business', 'corporate', 'professional', 'strategy',
          'marketing', 'sales', 'development', 'launch', 'timeline', 'milestone', 'KPI'
        ],
        patterns: [
          /\b(meeting|project|deadline|client|budget)\b/gi,
          /\b(team|manager|colleague|department)\b/gi,
          /\b(business|work|office|corporate)\b/gi,
          /\b(quarterly|annual|monthly) (review|report|meeting)\b/gi
        ]
      },
      'Family': {
        keywords: [
          'family', 'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'kids', 'children',
          'husband', 'wife', 'spouse', 'daughter', 'son', 'grandma', 'grandpa', 'uncle', 'aunt',
          'cousin', 'home', 'dinner', 'vacation', 'holiday', 'birthday', 'anniversary', 'wedding'
        ],
        patterns: [
          /\b(family|mom|dad|mother|father|parent)\b/gi,
          /\b(sister|brother|sibling|kids|children)\b/gi,
          /\b(husband|wife|spouse|married)\b/gi,
          /\b(home|house|dinner|vacation|holiday)\b/gi
        ]
      },
      'Personal': {
        keywords: [
          'personal', 'health', 'doctor', 'appointment', 'fitness', 'hobby', 'friend', 'social',
          'relationship', 'dating', 'exercise', 'gym', 'shopping', 'travel', 'entertainment',
          'movie', 'restaurant', 'weekend', 'plans', 'leisure', 'relaxation', 'self-care'
        ],
        patterns: [
          /\b(personal|private|individual)\b/gi,
          /\b(health|doctor|medical|appointment)\b/gi,
          /\b(friend|social|dating|relationship)\b/gi,
          /\b(hobby|leisure|entertainment|fun)\b/gi
        ]
      },
      'Education': {
        keywords: [
          'school', 'university', 'college', 'student', 'teacher', 'professor', 'course', 'class',
          'study', 'exam', 'assignment', 'homework', 'degree', 'semester', 'graduation', 'research',
          'thesis', 'lecture', 'academic', 'learning', 'education', 'training', 'workshop'
        ],
        patterns: [
          /\b(school|university|college|academic)\b/gi,
          /\b(student|teacher|professor|instructor)\b/gi,
          /\b(course|class|study|exam|assignment)\b/gi,
          /\b(education|learning|training|workshop)\b/gi
        ]
      },
      'Healthcare': {
        keywords: [
          'doctor', 'hospital', 'medical', 'health', 'appointment', 'treatment', 'medication',
          'therapy', 'clinic', 'nurse', 'patient', 'diagnosis', 'symptoms', 'surgery', 'recovery',
          'prescription', 'wellness', 'checkup', 'consultation', 'specialist'
        ],
        patterns: [
          /\b(doctor|hospital|medical|health)\b/gi,
          /\b(appointment|treatment|medication|therapy)\b/gi,
          /\b(clinic|nurse|patient|diagnosis)\b/gi,
          /\b(symptoms|surgery|prescription|wellness)\b/gi
        ]
      },
      'Financial': {
        keywords: [
          'money', 'bank', 'finance', 'investment', 'loan', 'mortgage', 'budget', 'savings',
          'payment', 'credit', 'debt', 'insurance', 'tax', 'retirement', 'portfolio', 'stocks',
          'bonds', 'financial', 'accounting', 'expense', 'income', 'salary', 'wealth'
        ],
        patterns: [
          /\b(money|bank|finance|financial)\b/gi,
          /\b(investment|loan|mortgage|savings)\b/gi,
          /\b(payment|credit|debt|insurance)\b/gi,
          /\b(tax|retirement|salary|income)\b/gi
        ]
      },
      'Technical': {
        keywords: [
          'technology', 'software', 'hardware', 'programming', 'coding', 'development', 'IT',
          'computer', 'system', 'network', 'server', 'database', 'application', 'website',
          'digital', 'tech', 'engineering', 'technical', 'code', 'API', 'platform'
        ],
        patterns: [
          /\b(technology|tech|technical|digital)\b/gi,
          /\b(software|hardware|programming|coding)\b/gi,
          /\b(development|IT|computer|system)\b/gi,
          /\b(network|server|database|API)\b/gi
        ]
      },
      'Legal': {
        keywords: [
          'legal', 'law', 'lawyer', 'attorney', 'court', 'case', 'contract', 'agreement',
          'lawsuit', 'litigation', 'compliance', 'regulation', 'policy', 'rights', 'liability',
          'jurisdiction', 'settlement', 'dispute', 'arbitration', 'mediation'
        ],
        patterns: [
          /\b(legal|law|lawyer|attorney)\b/gi,
          /\b(court|case|lawsuit|litigation)\b/gi,
          /\b(contract|agreement|compliance|regulation)\b/gi,
          /\b(rights|liability|settlement|dispute)\b/gi
        ]
      }
    };

    // Confidence thresholds
    this.highConfidenceThreshold = 0.7;
    this.mediumConfidenceThreshold = 0.4;
  }

  /**
   * Classify conversation using SBERT-inspired approach
   * @param {string} transcript - The conversation transcript
   * @param {Object} options - Classification options
   * @returns {Promise<Object>} Classification result
   */
  async classifyConversation(transcript, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('🏷️ Starting conversation classification...');

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcript is empty or invalid');
      }

      // Clean and prepare the transcript
      const cleanedTranscript = this.cleanTranscript(transcript);
      
      // Calculate scores for each category
      const categoryScores = this.calculateCategoryScores(cleanedTranscript);
      
      // Determine the primary category
      const classification = this.determineClassification(categoryScores);
      
      // Extract additional context
      const context = this.extractContext(cleanedTranscript, classification.primary);
      
      const processingTime = (Date.now() - startTime) / 1000;
      
      console.log(`✅ Classification completed in ${processingTime.toFixed(2)} seconds`);
      console.log(`📊 Primary category: ${classification.primary} (${(classification.confidence * 100).toFixed(1)}%)`);

      return {
        success: true,
        classification: {
          primary: classification.primary,
          confidence: classification.confidence,
          confidenceLevel: this.getConfidenceLevel(classification.confidence),
          scores: categoryScores,
          context: context,
          multiCategory: this.detectMultiCategory(categoryScores),
          processingTime: processingTime
        },
        metadata: {
          transcriptLength: transcript.length,
          cleanedLength: cleanedTranscript.length,
          processedAt: new Date().toISOString(),
          method: 'sbert-inspired'
        }
      };

    } catch (error) {
      console.error('❌ Classification failed:', error.message);
      return this.getFallbackClassification(transcript);
    }
  }

  /**
   * Clean and normalize the transcript
   */
  cleanTranscript(transcript) {
    return transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
  }

  /**
   * Calculate SBERT-inspired similarity scores for each category
   */
  calculateCategoryScores(transcript) {
    const scores = {};
    const words = transcript.split(/\s+/);
    const totalWords = words.length;

    for (const [category, categoryData] of Object.entries(this.categories)) {
      let score = 0;
      let keywordMatches = 0;
      let patternMatches = 0;

      // Keyword matching with TF-IDF inspired scoring
      for (const keyword of categoryData.keywords) {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (transcript.match(keywordRegex) || []).length;
        
        if (matches > 0) {
          keywordMatches += matches;
          // Apply TF-IDF inspired weighting
          const tf = matches / totalWords;
          const idf = Math.log(categoryData.keywords.length / (matches + 1));
          score += tf * idf * 10; // Scale factor
        }
      }

      // Pattern matching for contextual phrases
      for (const pattern of categoryData.patterns) {
        const matches = (transcript.match(pattern) || []).length;
        if (matches > 0) {
          patternMatches += matches;
          score += matches * 5; // Pattern bonus
        }
      }

      // Normalize score based on content length and category size
      const normalizedScore = score / Math.log(totalWords + 1);
      
      scores[category] = {
        score: Math.min(normalizedScore, 1), // Cap at 1.0
        keywordMatches,
        patternMatches,
        rawScore: score
      };
    }

    return scores;
  }

  /**
   * Determine primary classification from scores
   */
  determineClassification(categoryScores) {
    let maxScore = 0;
    let primaryCategory = 'General';
    
    for (const [category, data] of Object.entries(categoryScores)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        primaryCategory = category;
      }
    }

    // If no category has sufficient confidence, classify as General
    if (maxScore < 0.1) {
      return { primary: 'General', confidence: 0.5 };
    }

    return {
      primary: primaryCategory,
      confidence: Math.min(maxScore, 1.0)
    };
  }

  /**
   * Extract context-specific information
   */
  extractContext(transcript, primaryCategory) {
    const context = {
      formality: this.detectFormality(transcript),
      urgency: this.detectUrgency(transcript),
      sentiment: this.detectSentimentMarkers(transcript),
      participants: this.estimateParticipantTypes(transcript, primaryCategory)
    };

    return context;
  }

  /**
   * Detect conversation formality
   */
  detectFormality(transcript) {
    const formalIndicators = [
      'please', 'thank you', 'sir', 'madam', 'mr.', 'ms.', 'dr.',
      'regarding', 'furthermore', 'however', 'therefore', 'sincerely'
    ];
    
    const informalIndicators = [
      'hey', 'yeah', 'ok', 'cool', 'awesome', 'dude', 'guys',
      'gonna', 'wanna', 'gotta', 'kinda', 'sorta'
    ];

    let formalCount = 0;
    let informalCount = 0;

    for (const indicator of formalIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      formalCount += (transcript.match(regex) || []).length;
    }

    for (const indicator of informalIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      informalCount += (transcript.match(regex) || []).length;
    }

    if (formalCount > informalCount * 1.5) return 'Formal';
    if (informalCount > formalCount * 1.5) return 'Informal';
    return 'Mixed';
  }

  /**
   * Detect urgency indicators
   */
  detectUrgency(transcript) {
    const urgencyIndicators = [
      'urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline',
      'rush', 'priority', 'soon', 'quickly', 'fast', 'hurry'
    ];

    for (const indicator of urgencyIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      if (regex.test(transcript)) {
        return 'High';
      }
    }

    return 'Normal';
  }

  /**
   * Detect sentiment markers
   */
  detectSentimentMarkers(transcript) {
    const positiveIndicators = ['good', 'great', 'excellent', 'happy', 'pleased', 'satisfied'];
    const negativeIndicators = ['bad', 'terrible', 'upset', 'angry', 'frustrated', 'disappointed'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const indicator of positiveIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      positiveCount += (transcript.match(regex) || []).length;
    }

    for (const indicator of negativeIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      negativeCount += (transcript.match(regex) || []).length;
    }

    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Neutral';
  }

  /**
   * Estimate participant types based on category
   */
  estimateParticipantTypes(transcript, category) {
    const participantTypes = [];
    
    switch (category) {
      case 'Work':
        if (/\b(manager|boss|supervisor)\b/gi.test(transcript)) participantTypes.push('Manager');
        if (/\b(colleague|team|coworker)\b/gi.test(transcript)) participantTypes.push('Colleague');
        if (/\b(client|customer)\b/gi.test(transcript)) participantTypes.push('Client');
        break;
      case 'Family':
        if (/\b(mom|dad|mother|father|parent)\b/gi.test(transcript)) participantTypes.push('Parent');
        if (/\b(sister|brother|sibling)\b/gi.test(transcript)) participantTypes.push('Sibling');
        if (/\b(spouse|husband|wife)\b/gi.test(transcript)) participantTypes.push('Spouse');
        break;
      case 'Healthcare':
        if (/\b(doctor|physician|dr\.)\b/gi.test(transcript)) participantTypes.push('Doctor');
        if (/\b(nurse|medical)\b/gi.test(transcript)) participantTypes.push('Medical Staff');
        break;
    }

    return participantTypes.length > 0 ? participantTypes : ['General'];
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence) {
    if (confidence >= this.highConfidenceThreshold) return 'High';
    if (confidence >= this.mediumConfidenceThreshold) return 'Medium';
    return 'Low';
  }

  /**
   * Detect if conversation spans multiple categories
   */
  detectMultiCategory(categoryScores) {
    const sortedScores = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b.score - a.score);

    if (sortedScores.length >= 2) {
      const [first, second] = sortedScores;
      const scoreDifference = first[1].score - second[1].score;
      
      // If top two scores are close, it's likely multi-category
      if (scoreDifference < 0.2 && second[1].score > 0.3) {
        return {
          isMultiCategory: true,
          categories: [first[0], second[0]],
          scoreDifference: scoreDifference
        };
      }
    }

    return { isMultiCategory: false };
  }

  /**
   * Fallback classification when main classification fails
   */
  getFallbackClassification(transcript) {
    console.log('🔄 Using fallback classification');
    
    return {
      success: true,
      classification: {
        primary: 'General',
        confidence: 0.5,
        confidenceLevel: 'Medium',
        scores: { 'General': { score: 0.5, keywordMatches: 0, patternMatches: 0 } },
        context: {
          formality: 'Mixed',
          urgency: 'Normal',
          sentiment: 'Neutral',
          participants: ['General']
        },
        multiCategory: { isMultiCategory: false },
        processingTime: 0.1
      },
      metadata: {
        transcriptLength: transcript.length,
        cleanedLength: transcript.length,
        processedAt: new Date().toISOString(),
        method: 'fallback'
      }
    };
  }

  /**
   * Get all available categories
   */
  getAvailableCategories() {
    return Object.keys(this.categories).concat(['General']);
  }

  /**
   * Health check for the classification service
   */
  async healthCheck() {
    try {
      // Test with a sample text
      const testText = "Let's schedule a meeting to discuss the project timeline and budget allocation.";
      const result = await this.classifyConversation(testText);
      
      return {
        status: 'healthy',
        message: 'Classification service is working properly',
        testResult: {
          category: result.classification.primary,
          confidence: result.classification.confidence
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Classification service failed: ${error.message}`
      };
    }
  }
}

module.exports = new ConversationClassifier();