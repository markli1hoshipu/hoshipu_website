/**
 * Email AI Service - Generate personalized email content using AI
 */

class EmailAIService {
  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    this.geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.geminiApiKey}`;
  }

  /**
   * Check if Gemini AI is available
   */
  isAvailable() {
    return !!this.geminiApiKey;
  }

  /**
   * Generate personalized email content based on suggestion
   * @param {Object} suggestion - Communication suggestion object
   * @param {Object} customerData - Additional customer data
   * @returns {Promise<Object>} Generated email content
   */
  async generateEmailContent(suggestion, customerData = {}) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available. Please check VITE_GOOGLE_API_KEY.');
    }

    try {
      console.log('🤖 Generating AI email content for:', suggestion.customer_name);

      const prompt = this._buildEmailPrompt(suggestion, customerData);
      
      const response = await fetch(this.geminiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7, // Slightly higher for creative email writing
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
      
      console.log('✅ AI email content generated successfully');
      return {
        success: true,
        data: aiResponse
      };

    } catch (error) {
      console.error('❌ Error generating AI email content:', error);
      return {
        success: false,
        error: error.message,
        data: this._getFallbackEmailContent(suggestion)
      };
    }
  }

  /**
   * Build AI prompt for email generation
   * @param {Object} suggestion - Communication suggestion
   * @param {Object} customerData - Customer data
   * @returns {string} AI prompt
   */
  _buildEmailPrompt(suggestion, customerData) {
    const customerName = suggestion.customer_name || 'Valued Customer';
    const suggestionType = suggestion.type || 'email';
    const priority = suggestion.priority || 'medium';
    const reason = suggestion.reason || 'Regular check-in';
    const bestTime = suggestion.best_time || 'Business hours';
    const responseRate = suggestion.estimated_response_rate || '70%';

    return `GENERATE PERSONALIZED EMAIL CONTENT

CONTEXT:
- Customer: ${customerName}
- Communication Type: ${suggestionType}
- Priority: ${priority}
- Reason: ${reason}
- Best Contact Time: ${bestTime}
- Expected Response Rate: ${responseRate}
- Original Suggestion: ${suggestion.suggestion}

CUSTOMER DATA:
${JSON.stringify(customerData, null, 2)}

REQUIREMENTS:
1. Generate a professional, personalized email
2. Match the tone to the communication type and priority
3. Include specific value propositions
4. Make it actionable with clear next steps
5. Keep it concise but engaging
6. Use the customer's name naturally
7. Reference relevant business context when available

EMAIL STRUCTURE NEEDED:
- Subject line (compelling and specific)
- Greeting (personalized)
- Opening (context and purpose)
- Body (value proposition and details)
- Call to action (clear next steps)
- Closing (professional and warm)

TONE GUIDELINES:
- High priority: Urgent but respectful
- Medium priority: Professional and helpful
- Low priority: Friendly and informative
- Email type: Direct and business-focused
- Call type: Conversational and relationship-building
- LinkedIn type: Professional networking tone

OUTPUT FORMAT (JSON):
{
  "subject": "Compelling email subject line",
  "greeting": "Personalized greeting",
  "opening": "Context and purpose paragraph",
  "body": "Main content with value proposition",
  "call_to_action": "Clear next steps",
  "closing": "Professional closing",
  "full_email": "Complete email text",
  "tone": "professional|friendly|urgent",
  "key_points": ["point1", "point2", "point3"],
  "personalization_notes": "How this email is personalized for the customer"
}

Generate the email content now:`;
  }

  /**
   * Get fallback email content if AI fails
   * @param {Object} suggestion - Communication suggestion
   * @returns {Object} Fallback email content
   */
  _getFallbackEmailContent(suggestion) {
    const customerName = suggestion.customer_name || 'Valued Customer';
    const template = suggestion.template || 'Thank you for your business. We wanted to reach out and see how things are going.';

    return {
      subject: `Following up - ${customerName}`,
      greeting: `Hi there,`,
      opening: `I hope this email finds you well.`,
      body: template,
      call_to_action: `Please let me know if you have any questions or if there's anything I can help you with.`,
      closing: `Best regards,\nYour Account Manager`,
      full_email: `Hi there,

I hope this email finds you well.

${template}

Please let me know if you have any questions or if there's anything I can help you with.

Best regards,
Your Account Manager`,
      tone: 'professional',
      key_points: ['Check-in', 'Support offer', 'Relationship building'],
      personalization_notes: 'Basic template with customer name'
    };
  }

  /**
   * Regenerate email content with different parameters
   * @param {Object} suggestion - Communication suggestion
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Regenerated email content
   */
  async regenerateEmailContent(suggestion, options = {}) {
    const enhancedSuggestion = {
      ...suggestion,
      tone_preference: options.tone || 'professional',
      length_preference: options.length || 'medium',
      focus_area: options.focus || 'relationship'
    };

    return this.generateEmailContent(enhancedSuggestion, options.customerData);
  }

  /**
   * Get email suggestions for different scenarios
   * @param {string} scenario - Email scenario type
   * @returns {Array} Email template suggestions
   */
  getEmailScenarios() {
    return [
      {
        id: 'check_in',
        name: 'Regular Check-in',
        description: 'Friendly customer check-in',
        tone: 'friendly'
      },
      {
        id: 'renewal',
        name: 'Contract Renewal',
        description: 'Discuss contract renewal',
        tone: 'professional'
      },
      {
        id: 'upsell',
        name: 'Upsell Opportunity',
        description: 'Present additional services',
        tone: 'consultative'
      },
      {
        id: 'support',
        name: 'Support Follow-up',
        description: 'Follow up on support issues',
        tone: 'helpful'
      },
      {
        id: 'onboarding',
        name: 'Onboarding Check',
        description: 'Check onboarding progress',
        tone: 'supportive'
      }
    ];
  }
}

// Create singleton instance
const emailAIService = new EmailAIService();

export default emailAIService;
