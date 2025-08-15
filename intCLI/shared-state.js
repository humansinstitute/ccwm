const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ConversationManager extends EventEmitter {
  constructor() {
    super();
    this.conversation = [];
    this.dataFile = path.join(__dirname, 'conversation.json');
    this.load();
  }

  async load() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      this.conversation = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty conversation
      this.conversation = [];
    }
  }

  async save() {
    try {
      await fs.writeFile(this.dataFile, JSON.stringify(this.conversation, null, 2));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  addMessage(message) {
    const timestampedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    this.conversation.push(timestampedMessage);
    this.save();
    
    // Emit event for real-time updates
    this.emit('messageAdded', timestampedMessage);
    
    return timestampedMessage;
  }

  getConversation() {
    return this.conversation;
  }

  clear() {
    this.conversation = [];
    this.save();
    this.emit('conversationCleared');
  }
}

module.exports = new ConversationManager();