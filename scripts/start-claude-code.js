#!/usr/bin/env node

const { spawn, exec } = require('child_process');

// The prompt to send to Claude Code
const prompt = "Please review this project and give me an idea of next actions";

// Option 1: Run Claude with the prompt directly (will execute and exit)
// Uncomment this if you want a one-time execution
// exec(`claude "${prompt}"`, { cwd: process.cwd() }, (error, stdout, stderr) => {
//   if (error) {
//     console.error('Failed to run Claude Code:', error);
//     process.exit(1);
//   }
//   console.log(stdout);
//   if (stderr) console.error(stderr);
// });

// Option 2: Run Claude with the prompt and stay in interactive mode
// This will execute the prompt and keep Claude running for follow-up questions
const claudeCode = spawn('sh', ['-c', `claude "${prompt}"`], {
  stdio: 'inherit',
  cwd: process.cwd()
});

claudeCode.on('error', (err) => {
  console.error('Failed to start Claude Code:', err);
  console.error('Make sure Claude Code is installed: npm install -g @anthropic/claude-code');
  process.exit(1);
});

claudeCode.on('close', (code) => {
  if (code !== 0) {
    console.error(`Claude Code exited with code ${code}`);
    process.exit(code);
  }
});