const WebServer = require('./server');
const CLIInterface = require('./cli');

console.log('🚀 Starting AI Chat Multi-Interface App...\n');

// Start web server
const webServer = new WebServer(3000);
webServer.start();

// Wait a moment then start CLI
setTimeout(() => {
  console.log('\n📱 Starting CLI interface...\n');
  
  // Start CLI interface
  new CLIInterface();
}, 1000);