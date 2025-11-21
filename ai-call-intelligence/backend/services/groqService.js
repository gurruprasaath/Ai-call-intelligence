const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    // Initialize the Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = process.env.GROQ_SUMMARIZATION_MODEL || 'llama-3.3-70b-versatile';
  }

  /**
   * Get a chat completion from Groq Llama model
   * @param {string} prompt - The user prompt
   * @param {Object} options - Optional parameters
   * @returns {Promise<string>} AI response
   */
  async getChatCompletion(prompt, options = {}) {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️ GROQ_API_KEY not found in environment variables. Using fallback response.');
        return this.getFallbackResponse(prompt);
      }

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system", 
            content: "You are a professional speaking coach and communication expert. Provide helpful, practical advice about public speaking, presentations, interviews, and professional communication. Keep responses conversational, encouraging, and actionable. Use examples when appropriate."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800,
        top_p: options.topP || 0.9,
        stream: false
      });

      return completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at the moment. Please try asking your question again.";

    } catch (error) {
      console.error('❌ Groq chat completion failed:', error.message);
      
      if (error.response?.status === 401) {
        return "I'm having trouble connecting to my knowledge base. Please check the API configuration.";
      } else if (error.response?.status === 429) {
        return "I'm experiencing high demand right now. Please try again in a moment.";
      }
      
      return this.getFallbackResponse(prompt);
    }
  }

  /**
   * Get a structured response for specific speaking contexts
   * @param {string} context - Speaking context (e.g., "job_interview", "public_speaking")
   * @param {string} userQuery - User's specific question or concern
   * @returns {Promise<Object>} Structured response with tips, phrases, and advice
   */
  async getContextualAdvice(context, userQuery) {
    const contextPrompts = {
      job_interview: "You are helping someone prepare for a job interview. Focus on professional communication, confidence building, and interview-specific techniques.",
      public_speaking: "You are coaching someone for public speaking. Focus on audience engagement, overcoming anxiety, and presentation techniques.",
      networking: "You are advising someone on networking conversations. Focus on relationship building, conversation starters, and professional networking etiquette.",
      formal_meeting: "You are helping someone communicate effectively in formal business meetings. Focus on professional language, meeting etiquette, and clear communication.",
      presentation: "You are coaching someone on business presentations. Focus on structure, visual aids, audience engagement, and persuasive communication."
    };

    const systemPrompt = contextPrompts[context] || "You are a professional speaking coach providing general communication advice.";
    
    const prompt = `${systemPrompt}

User's question: "${userQuery}"

Please provide:
1. Specific actionable advice
2. Example phrases or sentences they can use
3. Common mistakes to avoid
4. Confidence-building tips

Keep the response practical and encouraging.`;

    return await this.getChatCompletion(prompt, { temperature: 0.6 });
  }

  /**
   * Analyze a user's message to understand their speaking concerns
   * @param {string} message - User's message
   * @returns {Promise<Object>} Analysis of user's needs and concerns
   */
  async analyzeUserConcerns(message) {
    const prompt = `Analyze this user message about speaking/communication and identify:
1. Their main concern or challenge
2. The speaking context (interview, presentation, meeting, etc.)
3. Their experience level (beginner, intermediate, experienced)
4. Specific areas they need help with
5. Any anxiety or confidence issues mentioned

User message: "${message}"

Respond with a brief analysis focusing on how to best help them.`;

    return await this.getChatCompletion(prompt, { temperature: 0.3, maxTokens: 300 });
  }

  /**
   * Get fallback response when API is unavailable
   * @param {string} prompt - Original user prompt
   * @returns {string} Fallback response
   */
  getFallbackResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('interview')) {
      return `Here are some key interview communication tips:

• **Prepare and Practice**: Research common questions and practice your responses out loud
• **Use the STAR Method**: Structure answers with Situation, Task, Action, Result
• **Make Eye Contact**: Shows confidence and engagement
• **Listen Actively**: Pay attention to the full question before responding
• **Ask Questions**: Show interest by asking about the role and company culture
• **Stay Positive**: Focus on what you learned from challenges rather than dwelling on negatives

Would you like more specific advice about any aspect of interview communication?`;
    }
    
    if (lowerPrompt.includes('presentation') || lowerPrompt.includes('public speaking')) {
      return `Essential public speaking tips:

• **Structure Your Content**: Clear introduction, main points, and conclusion
• **Know Your Audience**: Tailor your message to their interests and knowledge level
• **Practice Out Loud**: Rehearse your presentation multiple times
• **Use Visual Aids**: Support your points with clear, simple visuals
• **Manage Nerves**: Deep breathing and positive visualization help
• **Engage Your Audience**: Ask questions and encourage interaction

What specific aspect of public speaking would you like to work on?`;
    }
    
    if (lowerPrompt.includes('nervous') || lowerPrompt.includes('anxiety')) {
      return `Managing speaking anxiety:

• **Preparation**: The better prepared you are, the more confident you'll feel
• **Breathing Exercises**: Deep, slow breaths before and during speaking
• **Positive Self-Talk**: Replace negative thoughts with encouraging ones
• **Start Small**: Practice with friends or smaller groups first
• **Focus on Your Message**: Remember you're sharing valuable information
• **Accept Imperfection**: Small mistakes are normal and often go unnoticed

Remember, some nervousness is completely normal and shows you care about doing well!`;
    }
    
    return `I'm here to help you with speaking and communication skills! I can assist you with:

• **Job Interviews**: Preparation strategies and confident communication
• **Public Speaking**: Overcoming anxiety and engaging your audience  
• **Business Meetings**: Professional communication and meeting etiquette
• **Presentations**: Structure, delivery, and visual aids
• **Networking**: Conversation skills and relationship building
• **Phone Calls**: Professional phone communication

What specific speaking situation would you like help with?`;
  }
}

module.exports = new GroqService();