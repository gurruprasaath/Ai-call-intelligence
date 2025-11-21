class SpeakingGuidanceService {
  constructor() {
    // Speaking contexts and their characteristics
    this.contexts = {
      formal_meeting: {
        name: "Formal Meeting",
        description: "Board meetings, corporate discussions, professional presentations",
        tips: [
          "Maintain professional tone and language",
          "Use clear, concise sentences",
          "Avoid filler words (um, uh, like)",
          "Speak at a moderate pace",
          "Make eye contact with participants",
          "Use formal greetings and closings"
        ],
        phrases: {
          opening: [
            "Good morning/afternoon everyone",
            "Thank you for joining us today",
            "I'd like to begin by addressing...",
            "Let's proceed with the agenda"
          ],
          transitions: [
            "Moving on to the next point",
            "To elaborate on this matter",
            "As we discussed previously",
            "In relation to our objectives"
          ],
          closing: [
            "To summarize our discussion",
            "Thank you for your time and input",
            "I look forward to our next meeting",
            "Please don't hesitate to reach out"
          ]
        },
        avoid: [
          "Slang or casual expressions",
          "Speaking too fast or too slow",
          "Interrupting others",
          "Using complex jargon without explanation"
        ]
      },
      
      public_speaking: {
        name: "Public Speaking",
        description: "Conferences, seminars, large audience presentations",
        tips: [
          "Project your voice clearly",
          "Use gestures to emphasize points",
          "Maintain confident posture",
          "Engage the audience with questions",
          "Tell stories to illustrate points",
          "Practice beforehand"
        ],
        phrases: {
          opening: [
            "Ladies and gentlemen, thank you for being here",
            "I'm honored to speak with you today about...",
            "How many of you have experienced...",
            "Imagine if I told you that..."
          ],
          engagement: [
            "Let me ask you this...",
            "Raise your hand if you...",
            "Can you relate to this situation?",
            "Here's what I want you to remember"
          ],
          emphasis: [
            "This is crucial to understand",
            "Pay close attention to this",
            "The key takeaway here is",
            "What's particularly important is"
          ],
          closing: [
            "Thank you for your attention",
            "I hope this has been valuable to you",
            "Let's work together to make this happen",
            "The future starts with what we do today"
          ]
        },
        avoid: [
          "Reading directly from notes",
          "Speaking in monotone",
          "Avoiding eye contact with audience",
          "Using too many technical terms"
        ]
      },
      
      job_interview: {
        name: "Job Interview",
        description: "Professional interviews, performance reviews",
        tips: [
          "Maintain professional demeanor",
          "Answer questions concisely",
          "Provide specific examples",
          "Show enthusiasm and confidence",
          "Ask thoughtful questions",
          "Listen actively to the interviewer"
        ],
        phrases: {
          introduction: [
            "Thank you for this opportunity",
            "I'm excited to discuss this role",
            "I've been looking forward to our conversation",
            "I appreciate you taking the time to meet"
          ],
          experience: [
            "In my previous role, I...",
            "A specific example of this was when I...",
            "I successfully managed to...",
            "This experience taught me..."
          ],
          questions: [
            "What does success look like in this position?",
            "What are the biggest challenges facing the team?",
            "How would you describe the company culture?",
            "What opportunities exist for professional growth?"
          ],
          closing: [
            "Thank you for your time and consideration",
            "I'm very interested in this opportunity",
            "When can I expect to hear back?",
            "Is there anything else you'd like to know?"
          ]
        },
        avoid: [
          "Speaking negatively about previous employers",
          "Appearing overly nervous or fidgety",
          "Giving vague or generic answers",
          "Not asking any questions"
        ]
      },
      
      networking: {
        name: "Networking Event",
        description: "Professional networking, social business events",
        tips: [
          "Prepare a brief self-introduction",
          "Show genuine interest in others",
          "Ask open-ended questions",
          "Exchange contact information",
          "Follow up after the event",
          "Be approachable and friendly"
        ],
        phrases: {
          introduction: [
            "Hi, I'm [Name]. What brings you here today?",
            "I don't think we've met. I'm [Name]",
            "How are you enjoying the event so far?",
            "What line of work are you in?"
          ],
          conversation: [
            "That sounds fascinating. Tell me more about...",
            "How did you get started in that field?",
            "What's the most exciting project you're working on?",
            "I'd love to learn more about your experience with..."
          ],
          follow_up: [
            "I'd love to continue our conversation",
            "Let's connect on LinkedIn",
            "Would you be interested in grabbing coffee sometime?",
            "It was great meeting you today"
          ]
        },
        avoid: [
          "Monopolizing conversations",
          "Being overly aggressive with business cards",
          "Only talking about yourself",
          "Checking your phone constantly"
        ]
      },
      
      presentation: {
        name: "Business Presentation",
        description: "Client presentations, project proposals, sales pitches",
        tips: [
          "Start with a clear agenda",
          "Use visual aids effectively",
          "Tell a compelling story",
          "Handle questions confidently",
          "End with a clear call-to-action",
          "Practice timing and flow"
        ],
        phrases: {
          opening: [
            "Today I'll be presenting our proposal for...",
            "Let me walk you through our solution",
            "The agenda for today's presentation includes...",
            "By the end of this presentation, you'll understand..."
          ],
          transitions: [
            "Now let's look at the next component",
            "This brings us to our main recommendation",
            "Building on what we just discussed",
            "The next slide shows..."
          ],
          data: [
            "The data clearly indicates...",
            "Our research shows that...",
            "These results demonstrate...",
            "The evidence supports..."
          ],
          closing: [
            "In conclusion, our recommendation is...",
            "The next steps would be to...",
            "What questions do you have for me?",
            "I'm confident this solution will deliver results"
          ]
        },
        avoid: [
          "Reading slides word for word",
          "Going over the allocated time",
          "Using too many bullet points",
          "Ignoring audience body language"
        ]
      },
      
      phone_call: {
        name: "Professional Phone Call",
        description: "Business calls, client conversations, remote meetings",
        tips: [
          "Speak clearly and articulate well",
          "Eliminate background noise",
          "Smile while talking (it's audible)",
          "Take notes during the conversation",
          "Confirm important points",
          "End with clear next steps"
        ],
        phrases: {
          opening: [
            "Good morning, this is [Name] calling from [Company]",
            "Thank you for taking my call today",
            "I hope I'm not catching you at a bad time",
            "The purpose of my call today is to..."
          ],
          clarification: [
            "Just to confirm my understanding...",
            "Let me repeat that back to you",
            "Could you elaborate on that point?",
            "I want to make sure I heard you correctly"
          ],
          scheduling: [
            "When would be a good time to follow up?",
            "Shall we schedule a follow-up call?",
            "I'll send you a calendar invite",
            "What's your availability next week?"
          ],
          closing: [
            "Thank you for your time today",
            "I'll follow up with an email summary",
            "Have a great rest of your day",
            "I look forward to speaking again soon"
          ]
        },
        avoid: [
          "Eating or drinking during the call",
          "Multitasking or typing loudly",
          "Speaking too softly or loudly",
          "Forgetting to introduce yourself"
        ]
      }
    };

    // Common speaking challenges and solutions
    this.challenges = {
      nervousness: {
        symptoms: ["shaky voice", "speaking too fast", "forgetting words"],
        solutions: [
          "Practice deep breathing before speaking",
          "Prepare key points in advance",
          "Start with friendly, familiar faces in audience",
          "Use positive self-talk",
          "Focus on your message, not your anxiety"
        ]
      },
      clarity: {
        symptoms: ["mumbling", "unclear pronunciation", "speaking too quietly"],
        solutions: [
          "Practice articulation exercises",
          "Slow down your speaking pace",
          "Project your voice from your diaphragm",
          "Open your mouth wider when speaking",
          "Record yourself to identify areas for improvement"
        ]
      },
      engagement: {
        symptoms: ["losing audience attention", "monotone delivery", "lack of interaction"],
        solutions: [
          "Vary your tone and pace",
          "Use gestures and facial expressions",
          "Ask rhetorical or direct questions",
          "Tell relevant stories or examples",
          "Make eye contact with different audience members"
        ]
      },
      confidence: {
        symptoms: ["self-doubt", "apologetic language", "hesitation"],
        solutions: [
          "Prepare thoroughly and practice",
          "Use confident body language",
          "Speak with conviction and authority",
          "Avoid qualifying language (maybe, I think, possibly)",
          "Visualize successful outcomes"
        ]
      }
    };
  }

  // Get guidance for specific speaking context
  getContextGuidance(context) {
    const contextKey = context.toLowerCase().replace(/\s+/g, '_');
    return this.contexts[contextKey] || null;
  }

  // Get all available contexts
  getAllContexts() {
    return Object.keys(this.contexts).map(key => ({
      key,
      name: this.contexts[key].name,
      description: this.contexts[key].description
    }));
  }

  // Get personalized advice based on user input
  generatePersonalizedAdvice(userContext) {
    const {
      speakingContext,
      audience,
      duration,
      experience,
      concerns,
      specificTopics
    } = userContext;

    let advice = {
      general: [],
      specific: [],
      phrases: [],
      preparation: [],
      delivery: []
    };

    // Get base context guidance
    const contextGuidance = this.getContextGuidance(speakingContext);
    if (contextGuidance) {
      advice.general = [...contextGuidance.tips];
      advice.phrases = contextGuidance.phrases;
    }

    // Customize based on audience
    if (audience) {
      if (audience.toLowerCase().includes('senior') || audience.toLowerCase().includes('executive')) {
        advice.specific.push("Use concise, high-level language");
        advice.specific.push("Focus on business impact and ROI");
        advice.specific.push("Be prepared for challenging questions");
      }
      
      if (audience.toLowerCase().includes('technical')) {
        advice.specific.push("Use appropriate technical terminology");
        advice.specific.push("Provide detailed explanations when needed");
        advice.specific.push("Be ready to dive deep into specifications");
      }
      
      if (audience.toLowerCase().includes('large') || audience.toLowerCase().includes('crowd')) {
        advice.delivery.push("Project your voice clearly");
        advice.delivery.push("Use larger gestures for visibility");
        advice.delivery.push("Make eye contact across different sections");
      }
    }

    // Customize based on duration
    if (duration) {
      const durationNum = parseInt(duration);
      if (durationNum <= 5) {
        advice.preparation.push("Focus on 1-2 key messages maximum");
        advice.preparation.push("Practice to stay within time limits");
        advice.delivery.push("Start with your most important point");
      } else if (durationNum >= 30) {
        advice.preparation.push("Plan interactive elements to maintain engagement");
        advice.preparation.push("Structure content into clear segments");
        advice.delivery.push("Vary your delivery style throughout");
      }
    }

    // Address experience level
    if (experience === 'beginner' || experience === 'nervous') {
      advice.preparation.push("Practice your opening and closing extensively");
      advice.preparation.push("Prepare answers for potential questions");
      advice.delivery.push("Focus on connecting with friendly faces first");
      advice.delivery.push("Remember that some nervousness is normal and shows you care");
    }

    // Address specific concerns
    if (concerns && Array.isArray(concerns)) {
      concerns.forEach(concern => {
        const challenge = this.challenges[concern.toLowerCase()];
        if (challenge) {
          advice.specific = [...advice.specific, ...challenge.solutions];
        }
      });
    }

    return advice;
  }

  // Generate speaking tips based on conversation analysis
  generateTipsFromCallAnalysis(callAnalysis) {
    const tips = [];
    
    if (callAnalysis.sentiment && callAnalysis.sentiment.toLowerCase().includes('negative')) {
      tips.push("Consider using more positive language and tone");
      tips.push("Practice active listening and empathy in conversations");
    }
    
    if (callAnalysis.category) {
      const contextGuidance = this.getContextGuidance(callAnalysis.category);
      if (contextGuidance) {
        tips.push(`For ${contextGuidance.name} conversations: ${contextGuidance.tips[0]}`);
      }
    }
    
    // Analyze key points for speaking opportunities
    if (callAnalysis.keyPoints && callAnalysis.keyPoints.length > 0) {
      tips.push("Structure your main points clearly like in your recent conversation");
      tips.push("Use specific examples to support your arguments");
    }
    
    return tips;
  }

  // Get quick tips for immediate situations
  getQuickTips(situation) {
    const quickTipMap = {
      'before_meeting': [
        "Take 3 deep breaths",
        "Review your key points",
        "Arrive 5 minutes early",
        "Check your appearance"
      ],
      'during_presentation': [
        "Speak slowly and clearly",
        "Make eye contact with audience",
        "Use pauses for emphasis",
        "Stay calm if you make mistakes"
      ],
      'handling_questions': [
        "Listen to the complete question",
        "Repeat or rephrase if unclear",
        "Answer honestly - it's okay to say 'I don't know'",
        "Keep answers concise and focused"
      ],
      'networking_conversation': [
        "Ask open-ended questions",
        "Show genuine interest in others",
        "Share your own experiences appropriately",
        "Exchange contact information"
      ]
    };
    
    return quickTipMap[situation] || ["Stay calm and be yourself", "Listen more than you speak"];
  }
}

module.exports = new SpeakingGuidanceService();