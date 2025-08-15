const readline = require('readline');
const chalk = require('chalk');
const io = require('socket.io-client');
const conversationManager = require('./shared-state');
const aiService = require('./ai-service');

class CLIInterface {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('You: ')
    });

    // Connect to the web server if it's running
    this.socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupSocketListeners();
    this.setupEventListeners();
    this.displayWelcome();
    
    // Load conversation history after connection
    setTimeout(() => {
      this.showConversationHistory();
      this.rl.prompt();
    }, 500);
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log(chalk.green('✓ Connected to web server'));
      // Request current conversation when connected
      this.socket.emit('requestHistory');
    });

    this.socket.on('disconnect', () => {
      console.log(chalk.yellow('⚠ Disconnected from web server - running in standalone mode'));
    });

    this.socket.on('conversationHistory', (messages) => {
      // Update local conversation with server's version
      conversationManager.conversation = messages;
      conversationManager.save();
    });

    this.socket.on('newMessage', (message) => {
      // Only display messages from other sources
      if (message.source !== 'cli') {
        this.displayMessage(message);
        this.rl.prompt();
      }
    });

    this.socket.on('conversationCleared', () => {
      conversationManager.conversation = [];
      conversationManager.save();
      console.clear();
      this.displayWelcome();
      this.rl.prompt();
    });
  }

  setupEventListeners() {
    // Local event listener for when CLI adds messages
    conversationManager.on('messageAdded', (message) => {
      if (message.source === 'cli' && this.socket.connected) {
        // Notify the web server of new CLI messages
        this.socket.emit('cliMessage', message);
      }
    });

    this.rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput === '/exit') {
        console.log(chalk.yellow('Goodbye!'));
        this.socket.disconnect();
        process.exit(0);
      }
      
      if (trimmedInput === '/clear') {
        conversationManager.clear();
        if (this.socket.connected) {
          this.socket.emit('clearConversation');
        }
        console.clear();
        this.displayWelcome();
        this.rl.prompt();
        return;
      }

      if (trimmedInput === '/help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }

      if (trimmedInput) {
        await this.handleUserMessage(trimmedInput);
      }
      
      this.rl.prompt();
    });
  }

  displayWelcome() {
    console.log(chalk.green.bold('\n🤖 AI Chat - CLI Interface'));
    console.log(chalk.gray('Type /help for commands, /exit to quit\n'));
  }

  showHelp() {
    console.log(chalk.cyan('\nCommands:'));
    console.log(chalk.cyan('  /help  - Show this help'));
    console.log(chalk.cyan('  /clear - Clear conversation'));
    console.log(chalk.cyan('  /exit  - Exit application\n'));
  }

  showConversationHistory() {
    const conversation = conversationManager.getConversation();
    conversation.forEach(message => {
      this.displayMessage(message, false);
    });
  }

  displayMessage(message, showSource = true) {
    const time = new Date(message.timestamp).toLocaleTimeString();
    const source = showSource && message.source ? ` [${message.source}]` : '';
    
    if (message.role === 'user') {
      console.log(chalk.blue(`\n[${time}] You${source}: ${message.content}`));
    } else {
      console.log(chalk.green(`\n[${time}] AI${source}: ${message.content}`));
      
      if (message.thinking) {
        console.log(chalk.gray(`💭 Thinking: ${message.thinking}`));
      }
    }
  }

  async handleUserMessage(content) {
    // Add user message
    const userMessage = conversationManager.addMessage({
      role: 'user',
      content: content,
      source: 'cli'
    });

    this.displayMessage(userMessage, false);

    // Show thinking indicator
    process.stdout.write(chalk.yellow('\nAI is thinking...'));

    try {
      // Get AI response
      const conversation = conversationManager.getConversation();
      const aiResponse = await aiService.sendMessage(conversation);

      // Clear thinking indicator
      process.stdout.write('\r' + ' '.repeat(20) + '\r');

      // Add AI response
      const aiMessage = conversationManager.addMessage({
        role: 'assistant',
        content: aiResponse.content,
        thinking: aiResponse.thinking,
        source: 'cli'
      });

      this.displayMessage(aiMessage, false);

    } catch (error) {
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
      console.log(chalk.red('\nError getting AI response:', error.message));
    }
  }
}

// Start CLI if run directly
if (require.main === module) {
  new CLIInterface();
}

module.exports = CLIInterface;