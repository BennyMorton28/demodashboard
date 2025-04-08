// Test script to verify demo creation debugging tools

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// Log helper
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Create logs directory if it doesn't exist
async function ensureLogsDirExists() {
  const logsDir = path.join(process.cwd(), 'logs');
  try {
    await mkdir(logsDir, { recursive: true });
    log(`Logs directory created at ${logsDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Error creating logs directory:', err);
    } else {
      log(`Logs directory already exists at ${logsDir}`);
    }
  }
}

// Write test log entries
async function writeTestLogs() {
  const logsDir = path.join(process.cwd(), 'logs');
  const logDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const logFile = path.join(logsDir, `${logDate}_test-demo-creation.log`);
  
  const testDemoId = 'test-demo-' + Date.now().toString(36);
  
  const logEntries = [
    `[${new Date().toISOString()}][TEST:demo-creation] Starting demo creation process for ${testDemoId}`,
    `[${new Date().toISOString()}][TEST:demo-creation] Creating directory structure`,
    `[${new Date().toISOString()}][TEST:demo-creation] Saving demo files to filesystem`,
    `[${new Date().toISOString()}][TEST:demo-creation] Demo ID: ${testDemoId}, Title: Test Demo`,
    `[${new Date().toISOString()}][TEST:demo-creation] Demo creation completed: ${testDemoId}`
  ];
  
  try {
    await writeFile(logFile, logEntries.join('\n') + '\n', { flag: 'a' });
    log(`Test logs written to ${logFile}`);
    return testDemoId;
  } catch (err) {
    console.error('Error writing test logs:', err);
    return null;
  }
}

// Simulate creating a test demo
async function createTestDemo() {
  const testDemoId = 'test-demo-' + Date.now().toString(36);
  log(`Creating test demo with ID: ${testDemoId}`);
  
  try {
    // Create necessary directories
    const baseDir = process.cwd();
    const dirs = [
      path.join(baseDir, 'components'),
      path.join(baseDir, 'lib', 'prompts'),
      path.join(baseDir, 'public', 'markdown', testDemoId),
      path.join(baseDir, 'data', 'demo-info'),
      path.join(baseDir, 'app', 'demos', testDemoId),
      path.join(baseDir, 'app', 'demos', testDemoId, 'create-success')
    ];
    
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
      log(`Created directory: ${dir}`);
    }
    
    // Create test files
    const files = [
      {
        path: path.join(baseDir, 'components', `${testDemoId}-assistant.tsx`),
        content: `"use client";\n\nexport default function ${testDemoId.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Assistant() {\n  return <div>Test Assistant</div>;\n}`
      },
      {
        path: path.join(baseDir, 'lib', 'prompts', `${testDemoId}-prompt.md`),
        content: `# Test Prompt\n\nThis is a test prompt for ${testDemoId}.`
      },
      {
        path: path.join(baseDir, 'public', 'markdown', testDemoId, 'content.md'),
        content: `# Test Content\n\nThis is test content for ${testDemoId}.`
      },
      {
        path: path.join(baseDir, 'data', 'demo-info', `${testDemoId}.json`),
        content: JSON.stringify({
          id: testDemoId,
          title: 'Test Demo',
          description: 'A test demo created for testing debug tools',
          author: 'Test Script',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }, null, 2)
      },
      {
        path: path.join(baseDir, 'app', 'demos', testDemoId, 'page.tsx'),
        content: `"use client";\n\nimport TestDemoAssistant from "@/components/${testDemoId}-assistant";\n\nexport default function TestDemoPage() {\n  return <TestDemoAssistant />;\n}`
      }
    ];
    
    for (const file of files) {
      await writeFile(file.path, file.content);
      log(`Created file: ${file.path}`);
    }
    
    log(`Test demo created successfully: ${testDemoId}`);
    
    // Write test logs
    await ensureLogsDirExists();
    const logsDir = path.join(process.cwd(), 'logs');
    const logDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logsDir, `${logDate}_test-demo-creation.log`);
    
    const logEntries = [
      `[${new Date().toISOString()}][TEST:demo-creation] Starting demo creation process for ${testDemoId}`,
      `[${new Date().toISOString()}][TEST:demo-creation] Creating directory structure`,
      `[${new Date().toISOString()}][TEST:demo-creation] Saving demo files to filesystem`,
      `[${new Date().toISOString()}][TEST:demo-creation] Demo ID: ${testDemoId}, Title: Test Demo`,
      `[${new Date().toISOString()}][TEST:demo-creation] Demo creation completed: ${testDemoId}`
    ];
    
    await writeFile(logFile, logEntries.join('\n') + '\n', { flag: 'a' });
    log(`Test logs written to ${logFile}`);
    
    return testDemoId;
  } catch (err) {
    console.error('Error creating test demo:', err);
    return null;
  }
}

// Create a test demo with missing files to test error detection
async function createIncompleteTestDemo() {
  const testDemoId = 'incomplete-demo-' + Date.now().toString(36);
  log(`Creating incomplete test demo with ID: ${testDemoId}`);
  
  try {
    // Only create some of the directories and files, to simulate a failed demo creation
    const baseDir = process.cwd();
    const dirs = [
      path.join(baseDir, 'components'),
      path.join(baseDir, 'public', 'markdown', testDemoId),
      path.join(baseDir, 'data', 'demo-info')
    ];
    
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
      log(`Created directory: ${dir}`);
    }
    
    // Create only some of the required files
    const files = [
      {
        path: path.join(baseDir, 'components', `${testDemoId}-assistant.tsx`),
        content: `"use client";\n\nexport default function ${testDemoId.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Assistant() {\n  return <div>Test Assistant</div>;\n}`
      },
      {
        path: path.join(baseDir, 'public', 'markdown', testDemoId, 'content.md'),
        content: `# Test Content\n\nThis is test content for ${testDemoId}.`
      }
      // Intentionally missing: prompt file, demo info file, and page file
    ];
    
    for (const file of files) {
      await writeFile(file.path, file.content);
      log(`Created file: ${file.path}`);
    }
    
    log(`Incomplete test demo created: ${testDemoId}`);
    
    // Write test logs with error information
    await ensureLogsDirExists();
    const logsDir = path.join(process.cwd(), 'logs');
    const logDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logsDir, `${logDate}_test-demo-creation.log`);
    
    const logEntries = [
      `[${new Date().toISOString()}][TEST:demo-creation] Starting demo creation process for ${testDemoId}`,
      `[${new Date().toISOString()}][TEST:demo-creation] Creating directory structure`,
      `[${new Date().toISOString()}][ERROR:demo-creation] Error saving prompt file: ENOENT: no such file or directory`,
      `[${new Date().toISOString()}][ERROR:demo-creation] Error creating demo page: Cannot create page component`,
      `[${new Date().toISOString()}][TEST:demo-creation] Demo creation partially completed with errors: ${testDemoId}`
    ];
    
    await writeFile(logFile, logEntries.join('\n') + '\n', { flag: 'a' });
    log(`Test error logs written to ${logFile}`);
    
    return testDemoId;
  } catch (err) {
    console.error('Error creating incomplete test demo:', err);
    return null;
  }
}

// Run the tests
async function runTests() {
  try {
    log('Starting demo creation debug tests...');
    
    // Make sure logs directory exists
    await ensureLogsDirExists();
    
    // Create a complete test demo
    log('\n--- Testing complete demo creation ---');
    const completeId = await createTestDemo();
    if (completeId) {
      log(`✅ Complete demo created: ${completeId}`);
      log(`Test URL: http://localhost:3000/demos/${completeId}/create-success?id=${completeId}&debug=true`);
    } else {
      log('❌ Failed to create complete test demo');
    }
    
    // Create an incomplete test demo
    log('\n--- Testing incomplete demo creation ---');
    const incompleteId = await createIncompleteTestDemo();
    if (incompleteId) {
      log(`✅ Incomplete demo created: ${incompleteId}`);
      log(`Test URL: http://localhost:3000/demos/${incompleteId}/create-success?id=${incompleteId}&debug=true`);
    } else {
      log('❌ Failed to create incomplete test demo');
    }
    
    log('\nTests completed. Please visit the URLs above to test the debug UI.');
  } catch (err) {
    console.error('Error running tests:', err);
  }
}

// Run the test script
runTests(); 