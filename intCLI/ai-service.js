const axios = require('axios');
require('dotenv').config();

class AIService {
  constructor() {
    // Configure your AI service here (OpenAI, Anthropic, etc.)
    this.apiKey = process.env.AI_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async sendMessage(messages) {
    try {
      // Example for Anthropic Claude API
      const response = await axios.post(this.baseURL, {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      return {
        content: response.data.content[0].text,
        thinking: response.data.thinking || null // If available
      };
    } catch (error) {
      console.error('AI API Error:', error.response?.data || error.message);
      return {
        content: "Sorry, I encountered an error processing your request.",
        thinking: null
      };
    }
  }
}

module.exports = new AIService();