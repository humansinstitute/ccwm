import { spawn } from 'child_process';
import { logger } from './logger.js';

/**
 * Check if Claude Code CLI is installed and authenticated
 */
export async function checkClaudeAuth() {
  return new Promise((resolve) => {
    // First check if Claude CLI is installed
    const checkInstall = spawn('which', ['claude']);
    
    checkInstall.on('close', (code) => {
      if (code !== 0) {
        resolve({
          isInstalled: false,
          isAuthenticated: false,
          error: 'Claude Code CLI is not installed. Please install it with: npm install -g @anthropic-ai/claude-code'
        });
        return;
      }

      // Check if Claude is authenticated
      const checkAuth = spawn('claude', ['--help'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      checkAuth.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      checkAuth.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      checkAuth.on('close', (code) => {
        if (code === 0) {
          // Successfully got help, now test a simple query to verify auth
          testClaudeAuth().then((authResult) => {
            resolve({
              isInstalled: true,
              isAuthenticated: authResult.isAuthenticated,
              error: authResult.error,
              version: extractVersion(stdout)
            });
          });
        } else {
          resolve({
            isInstalled: true,
            isAuthenticated: false,
            error: stderr || 'Claude CLI installation may be corrupted'
          });
        }
      });

      checkAuth.on('error', (error) => {
        resolve({
          isInstalled: false,
          isAuthenticated: false,
          error: `Failed to execute Claude CLI: ${error.message}`
        });
      });
    });

    checkInstall.on('error', (error) => {
      resolve({
        isInstalled: false,
        isAuthenticated: false,
        error: `Failed to check Claude CLI installation: ${error.message}`
      });
    });
  });
}

/**
 * Test Claude authentication with a simple query
 */
async function testClaudeAuth() {
  return new Promise((resolve) => {
    // Test with minimal arguments that Claude CLI actually supports
    const testProcess = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send a simple test message
    testProcess.stdin.write('Hello\n');
    testProcess.stdin.end();

    const timeout = setTimeout(() => {
      testProcess.kill('SIGTERM');
      resolve({
        isAuthenticated: false,
        error: 'Claude CLI authentication test timed out'
      });
    }, 10000);

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        resolve({ isAuthenticated: true });
      } else {
        const errorMessage = stderr.toLowerCase();
        let error = 'Authentication test failed';
        
        if (errorMessage.includes('not authenticated') || errorMessage.includes('api key')) {
          error = 'Claude Code CLI is not authenticated. Please run: claude auth login';
        } else if (errorMessage.includes('rate limit')) {
          error = 'Rate limit reached. Please try again later.';
        } else if (stderr) {
          error = stderr;
        }
        
        resolve({
          isAuthenticated: false,
          error
        });
      }
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        isAuthenticated: false,
        error: `Failed to test authentication: ${error.message}`
      });
    });
  });
}

/**
 * Extract version from Claude CLI help output
 */
function extractVersion(helpOutput) {
  const versionMatch = helpOutput.match(/version\s+(\d+\.\d+\.\d+)/i);
  return versionMatch ? versionMatch[1] : 'unknown';
}

/**
 * Get Claude Code CLI status and configuration
 */
export async function getClaudeStatus() {
  try {
    const authStatus = await checkClaudeAuth();
    
    return {
      status: authStatus.isAuthenticated ? 'ready' : 'not_authenticated',
      installed: authStatus.isInstalled,
      authenticated: authStatus.isAuthenticated,
      version: authStatus.version,
      error: authStatus.error
    };
  } catch (error) {
    logger.error('Failed to get Claude status:', error);
    return {
      status: 'error',
      installed: false,
      authenticated: false,
      error: error.message
    };
  }
}