const express = require('express');
const router = express.Router();
const speakingGuidanceService = require('../services/speakingGuidanceService');
const groqService = require('../services/groqService');
const { ChatSession, ChatMessage } = require('../models');

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate unique message ID
function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize new chat session
router.post('/chat/start', async (req, res) => {
  try {
    const sessionId = generateSessionId();
    const userId = req.body.userId || 'test-user'; // Use test-user for development
    const userName = req.body.userName || 'Test User';
    
    // Create new chat session in database
    const session = new ChatSession({
      sessionId,
      userId,
      userName,
      title: 'Speaking Coach Conversation',
      status: 'active',
      messageCount: 0,
      lastActivity: new Date()
    });
    
    await session.save();
    
    // Create welcome message
    const welcomeMessageContent = "Hello! I'm your speaking coach assistant. I can help you with:\n\n" +
               "• Formal meeting communication\n" +
               "• Public speaking techniques\n" +
               "• Job interview preparation\n" +
               "• Networking conversations\n" +
               "• Business presentations\n" +
               "• Professional phone calls\n\n" +
               "What speaking situation would you like help with today?";
    
    const welcomeMessage = new ChatMessage({
      messageId: generateMessageId(),
      sessionId,
      userId,
      type: 'bot',
      content: welcomeMessageContent,
      suggestions: [
        "Help with a job interview",
        "Preparing for a presentation", 
        "Networking event tips",
        "Formal meeting etiquette",
        "Public speaking anxiety",
        "Phone call best practices"
      ],
      timestamp: new Date()
    });
    
    await welcomeMessage.save();
    
    // Update session message count
    session.messageCount = 1;
    await session.save();
    
    res.json({
      success: true,
      sessionId,
      message: {
        id: welcomeMessage.messageId,
        type: welcomeMessage.type,
        content: welcomeMessage.content,
        suggestions: welcomeMessage.suggestions,
        timestamp: welcomeMessage.timestamp
      }
    });
  } catch (error) {
    console.error('Error starting chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to start chat session' });
  }
});

// Send message to chatbot
router.post('/chat/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, context } = req.body;
    const userId = req.body.userId || 'test-user';
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    // Find session in database
    const session = await ChatSession.findOne({ sessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    
    // Update session context with new information
    if (context) {
      session.context = { ...session.context, ...context };
    }
    
    // Save user message to database
    const userMessage = new ChatMessage({
      messageId: generateMessageId(),
      sessionId,
      userId,
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    });
    
    await userMessage.save();
    
    // Get recent messages for context (last 10 messages)
    const recentMessages = await ChatMessage.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(10)
      .lean();
    
    // Generate AI response with context
    const botResponse = await generateBotResponse(message, {
      sessionId,
      context: session.context,
      messages: recentMessages
    });
    
    // Save bot response to database
    const botMessage = new ChatMessage({
      messageId: generateMessageId(),
      sessionId,
      userId,
      type: 'bot',
      content: botResponse.content,
      suggestions: botResponse.suggestions || [],
      quickActions: botResponse.quickActions || [],
      metadata: {
        intent: botResponse.intent,
        context: botResponse.context,
        confidence: botResponse.confidence,
        processingTime: botResponse.processingTime,
        model: 'llama-3.3-70b-versatile',
        provider: 'groq'
      },
      timestamp: new Date()
    });
    
    await botMessage.save();
    
    // Update session stats
    session.messageCount += 2; // user + bot message
    session.lastActivity = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: {
        id: botMessage.messageId,
        type: botMessage.type,
        content: botMessage.content,
        suggestions: botMessage.suggestions,
        quickActions: botMessage.quickActions,
        timestamp: botMessage.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// Get chat history
router.get('/chat/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Find session
    const session = await ChatSession.findOne({ sessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    
    // Get messages with pagination
    const messages = await ChatMessage.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.messageId,
      type: msg.type,
      content: msg.content,
      suggestions: msg.suggestions || [],
      quickActions: msg.quickActions || [],
      timestamp: msg.timestamp
    }));
    
    res.json({
      success: true,
      session: {
        id: session.sessionId,
        title: session.title,
        context: session.context,
        messageCount: session.messageCount,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      },
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: session.messageCount
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to get chat history' });
  }
});

// Get speaking contexts
router.get('/speaking/contexts', (req, res) => {
  try {
    const contexts = speakingGuidanceService.getAllContexts();
    res.json({ success: true, contexts });
  } catch (error) {
    console.error('Error getting speaking contexts:', error);
    res.status(500).json({ success: false, error: 'Failed to get contexts' });
  }
});

// Get specific context guidance
router.get('/speaking/context/:contextName', (req, res) => {
  try {
    const { contextName } = req.params;
    const guidance = speakingGuidanceService.getContextGuidance(contextName);
    
    if (!guidance) {
      return res.status(404).json({ success: false, error: 'Context not found' });
    }
    
    res.json({ success: true, guidance });
  } catch (error) {
    console.error('Error getting context guidance:', error);
    res.status(500).json({ success: false, error: 'Failed to get guidance' });
  }
});

// Get personalized advice
router.post('/speaking/advice', (req, res) => {
  try {
    const userContext = req.body;
    const advice = speakingGuidanceService.generatePersonalizedAdvice(userContext);
    
    res.json({ success: true, advice });
  } catch (error) {
    console.error('Error generating personalized advice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate advice' });
  }
});

// Get quick tips
router.get('/speaking/quick-tips/:situation', (req, res) => {
  try {
    const { situation } = req.params;
    const tips = speakingGuidanceService.getQuickTips(situation);
    
    res.json({ success: true, tips });
  } catch (error) {
    console.error('Error getting quick tips:', error);
    res.status(500).json({ success: false, error: 'Failed to get tips' });
  }
});

// Get user's chat sessions
router.get('/chat/sessions', async (req, res) => {
  try {
    const { userId = 'test-user', page = 1, limit = 10 } = req.query;
    
    const sessions = await ChatSession.find({ 
      userId, 
      status: 'active' 
    })
    .sort({ lastActivity: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('sessionId title messageCount lastActivity createdAt context')
    .lean();
    
    const total = await ChatSession.countDocuments({ userId, status: 'active' });
    
    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to get chat sessions' });
  }
});

// Update chat session (rename, archive, etc.)
router.put('/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, status, context } = req.body;
    
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    
    if (title) session.title = title;
    if (status) session.status = status;
    if (context) session.context = { ...session.context, ...context };
    
    session.updatedAt = new Date();
    await session.save();
    
    res.json({
      success: true,
      session: {
        id: session.sessionId,
        title: session.title,
        status: session.status,
        context: session.context,
        messageCount: session.messageCount,
        lastActivity: session.lastActivity,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to update chat session' });
  }
});

// Delete chat session
router.delete('/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Soft delete - mark as deleted instead of removing
    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      { status: 'deleted', updatedAt: new Date() },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    
    res.json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat session' });
  }
});

// Generate bot response using AI and speaking guidance
async function generateBotResponse(userMessage, sessionData) {
  const startTime = Date.now();
  
  try {
    // Analyze user intent and extract context
    const intent = analyzeUserIntent(userMessage);
    let response = "";
    let suggestions = [];
    let quickActions = [];
    
    // Handle different types of requests
    switch (intent.type) {
      case 'context_request':
        // User is asking about a specific speaking context
        const guidance = speakingGuidanceService.getContextGuidance(intent.context);
        if (guidance) {
          response = formatContextGuidance(guidance);
          suggestions = [
            "Get specific phrase examples",
            "Learn about common mistakes",
            "Practice scenarios",
            "Get confidence tips"
          ];
        } else {
          response = "I'd be happy to help with that speaking situation. Could you provide more details about the specific context or challenge you're facing?";
        }
        break;
        
      case 'personalized_advice':
        // Generate personalized advice
        const advice = speakingGuidanceService.generatePersonalizedAdvice(sessionData.context || {});
        response = formatPersonalizedAdvice(advice);
        suggestions = [
          "Get practice exercises",
          "Learn handling difficult situations", 
          "Get confidence building tips"
        ];
        break;
        
      case 'quick_tips':
        // Provide immediate tips
        const tips = speakingGuidanceService.getQuickTips(intent.situation);
        response = `Here are some quick tips for ${intent.situation}:\n\n${tips.map(tip => `• ${tip}`).join('\n')}`;
        break;
        
      case 'general_question':
      default:
        // Use AI to generate contextual response
        response = await generateAIResponse(userMessage, sessionData);
        suggestions = generateDynamicSuggestions(userMessage);
        break;
    }
    
    // Add quick actions based on context
    if (sessionData.context && sessionData.context.speakingContext) {
      quickActions = [
        { text: "Get phrase examples", action: "phrases" },
        { text: "Practice scenarios", action: "practice" },
        { text: "Common mistakes", action: "mistakes" }
      ];
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      content: response,
      suggestions,
      quickActions,
      intent: intent.type,
      context: intent.context,
      confidence: intent.confidence || 0.8,
      processingTime
    };
    
  } catch (error) {
    console.error('Error generating bot response:', error);
    return {
      content: "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?",
      suggestions: ["Try asking in a different way", "Start over with a new topic"],
      intent: 'error',
      processingTime: Date.now() - startTime
    };
  }
}

// Analyze user intent from message
function analyzeUserIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // Context keywords mapping
  const contextKeywords = {
    'job interview': 'job_interview',
    'interview': 'job_interview', 
    'public speaking': 'public_speaking',
    'presentation': 'presentation',
    'meeting': 'formal_meeting',
    'networking': 'networking',
    'phone call': 'phone_call'
  };
  
  // Check for context requests
  for (const [keyword, context] of Object.entries(contextKeywords)) {
    if (lowerMsg.includes(keyword)) {
      return { type: 'context_request', context };
    }
  }
  
  // Check for quick tip requests
  const quickTipKeywords = ['quick tip', 'immediate help', 'right now', 'urgent'];
  if (quickTipKeywords.some(keyword => lowerMsg.includes(keyword))) {
    return { type: 'quick_tips', situation: extractSituation(lowerMsg) };
  }
  
  // Check for personalized advice requests
  const adviceKeywords = ['advice', 'help me', 'guidance', 'what should i'];
  if (adviceKeywords.some(keyword => lowerMsg.includes(keyword))) {
    return { type: 'personalized_advice' };
  }
  
  return { type: 'general_question' };
}

// Extract speaking situation from message
function extractSituation(message) {
  const situationMap = {
    'before': 'before_meeting',
    'during': 'during_presentation', 
    'question': 'handling_questions',
    'networking': 'networking_conversation'
  };
  
  for (const [keyword, situation] of Object.entries(situationMap)) {
    if (message.includes(keyword)) {
      return situation;
    }
  }
  
  return 'general';
}

// Format context guidance for display
function formatContextGuidance(guidance) {
  let response = `## ${guidance.name}\n\n${guidance.description}\n\n`;
  
  response += "**Key Tips:**\n";
  guidance.tips.forEach(tip => {
    response += `• ${tip}\n`;
  });
  
  response += "\n**What to Avoid:**\n";
  guidance.avoid.forEach(item => {
    response += `• ${item}\n`;
  });
  
  return response;
}

// Format personalized advice
function formatPersonalizedAdvice(advice) {
  let response = "## Personalized Speaking Advice\n\n";
  
  if (advice.preparation.length > 0) {
    response += "**Preparation:**\n";
    advice.preparation.forEach(tip => response += `• ${tip}\n`);
    response += "\n";
  }
  
  if (advice.delivery.length > 0) {
    response += "**During Delivery:**\n";
    advice.delivery.forEach(tip => response += `• ${tip}\n`);
    response += "\n";
  }
  
  if (advice.specific.length > 0) {
    response += "**Specific to Your Situation:**\n";
    advice.specific.forEach(tip => response += `• ${tip}\n`);
  }
  
  return response;
}

// Generate AI response using Groq
async function generateAIResponse(userMessage, sessionData) {
  try {
    const recentMessages = sessionData.messages ? 
      sessionData.messages.slice(-4).map(m => `${m.type}: ${m.content}`).join('\n') : '';
    
    const prompt = `You are a professional speaking coach assistant. The user has asked: "${userMessage}"

Context from conversation: ${JSON.stringify(sessionData.context || {})}
Recent messages: ${recentMessages}

Provide helpful, professional advice about speaking, communication, and presentation skills. Keep responses concise but comprehensive. Include practical tips when appropriate.`;

    const response = await groqService.getChatCompletion(prompt);
    return response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "I understand you're looking for speaking advice. Could you provide more specific details about your situation so I can give you the most helpful guidance?";
  }
}

// Generate dynamic suggestions based on user message
function generateDynamicSuggestions(message) {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('nervous') || lowerMsg.includes('anxious')) {
    return [
      "Get anxiety management tips",
      "Practice breathing exercises", 
      "Build confidence strategies"
    ];
  }
  
  if (lowerMsg.includes('audience') || lowerMsg.includes('crowd')) {
    return [
      "Audience engagement techniques",
      "Eye contact strategies",
      "Handling large groups"
    ];
  }
  
  if (lowerMsg.includes('question') || lowerMsg.includes('q&a')) {
    return [
      "Question handling strategies",
      "Difficult question techniques",
      "Buy time tactics"
    ];
  }
  
  return [
    "Get more specific advice",
    "Practice scenarios", 
    "Common challenges",
    "Advanced techniques"
  ];
}

module.exports = router;