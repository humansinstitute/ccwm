// Quick test to see what Claude outputs through Goose
const { spawn } = require('child_process');
const chalk = require('chalk');

console.log('Starting Claude/OpenRouter Goose test session...\n');

const goose = spawn('goose', ['session', '--name', 'claude-test'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let fullOutput = '';

goose.stdout.on('data', (data) => {
  const output = data.toString();
  fullOutput += output;
  
  // Show raw output with visible markers
  console.log(chalk.green('RAW OUTPUT:'));
  console.log(JSON.stringify(output));
  console.log(chalk.blue('VISIBLE:'));
  console.log(output);
  console.log(chalk.gray('---'));
});

goose.stderr.on('data', (data) => {
  console.log(chalk.red('STDERR:'), data.toString());
});

goose.on('close', (code) => {
  console.log(`\nGoose exited with code ${code}`);
  
  // Save full output for analysis
  require('fs').writeFileSync('claude-output-test.log', fullOutput);
  console.log('Full output saved to claude-output-test.log');
});

// Send test messages
setTimeout(() => {
  console.log('\n' + chalk.yellow('Sending: "What is 2+2? Think step by step."'));
  goose.stdin.write('What is 2+2? Think step by step.\n');
}, 3000);

setTimeout(() => {
  console.log('\n' + chalk.yellow('Sending: "Can you explain your reasoning?"'));
  goose.stdin.write('Can you explain your reasoning?\n');
}, 8000);

// Exit after 15 seconds
setTimeout(() => {
  console.log('\n' + chalk.yellow('Exiting...'));
  goose.stdin.write('/exit\n');
  setTimeout(() => process.exit(0), 2000);
}, 15000);