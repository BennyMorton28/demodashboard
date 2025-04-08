import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Directory where debug logs will be stored
const DEBUG_LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure the logs directory exists
async function ensureLogDirExists() {
  try {
    await fsPromises.mkdir(DEBUG_LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Initialize the log directory
ensureLogDirExists();

// Get timestamp for logging
function getTimestamp(): string {
  return new Date().toISOString();
}

// Create a session ID for grouping logs
const SESSION_ID = Date.now().toString(36) + Math.random().toString(36).substring(2);

// Enhanced debug logger
export async function logDebugToFile(
  category: string, 
  message: string, 
  data?: any, 
  saveToFile: boolean = true
): Promise<void> {
  const timestamp = getTimestamp();
  const logPrefix = `[${timestamp}][${category}]`;
  
  // Format data if provided
  let dataString = '';
  if (data !== undefined) {
    try {
      if (data instanceof Error) {
        dataString = `\nERROR: ${data.name}: ${data.message}\nStack: ${data.stack}`;
      } else if (typeof data === 'object') {
        dataString = `\n${JSON.stringify(data, null, 2)}`;
      } else {
        dataString = `\n${String(data)}`;
      }
    } catch (e) {
      dataString = `\n[Unstringifiable data: ${e instanceof Error ? e.message : String(e)}]`;
    }
  }
  
  // Full log entry
  const logEntry = `${logPrefix} ${message}${dataString}`;
  
  // Log to console
  console.log(logEntry);
  
  // Save to file if enabled
  if (saveToFile) {
    try {
      const logDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFilename = `${logDate}_${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.log`;
      const logFilePath = path.join(DEBUG_LOG_DIR, logFilename);
      
      // Append to file
      await fsPromises.appendFile(logFilePath, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to debug log file:', error);
    }
  }
}

// Helper to create a session-specific logger
export function createSessionLogger(category: string) {
  return {
    log: (message: string, data?: any) => logDebugToFile(`${category}:${SESSION_ID}`, message, data),
    error: (message: string, error: any) => logDebugToFile(`ERROR:${category}:${SESSION_ID}`, message, error),
    warn: (message: string, data?: any) => logDebugToFile(`WARN:${category}:${SESSION_ID}`, message, data),
    info: (message: string, data?: any) => logDebugToFile(`INFO:${category}:${SESSION_ID}`, message, data),
  };
}

// Export a file system checker for debugging
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Export a directory structure analyzer for debugging
export async function analyzeDirectoryStructure(
  dirPath: string, 
  maxDepth: number = 3, 
  currentDepth: number = 0
): Promise<any> {
  try {
    if (currentDepth > maxDepth) {
      return { type: 'directory', name: path.basename(dirPath), note: 'max depth reached' };
    }
    
    const stats = await fsPromises.stat(dirPath);
    
    if (!stats.isDirectory()) {
      return { 
        type: 'file', 
        name: path.basename(dirPath),
        size: stats.size,
        modifiedTime: stats.mtime.toISOString()
      };
    }
    
    const files = await fsPromises.readdir(dirPath);
    const contents = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        try {
          const fileStats = await fsPromises.stat(fullPath);
          
          if (fileStats.isDirectory()) {
            if (currentDepth < maxDepth) {
              return analyzeDirectoryStructure(fullPath, maxDepth, currentDepth + 1);
            } else {
              return { 
                type: 'directory', 
                name: file,
                note: 'max depth reached'
              };
            }
          } else {
            return { 
              type: 'file', 
              name: file,
              size: fileStats.size,
              modifiedTime: fileStats.mtime.toISOString()
            };
          }
        } catch (error) {
          return { 
            type: 'error', 
            name: file,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    
    return {
      type: 'directory',
      name: path.basename(dirPath),
      path: dirPath,
      children: contents
    };
  } catch (error) {
    return { 
      type: 'error', 
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Utility to validate created demo files
export async function validateDemoCreation(demoId: string): Promise<{
  success: boolean;
  details: {
    [key: string]: {
      exists: boolean;
      path: string;
      error?: string;
    }
  }
}> {
  const baseDir = process.cwd();
  const isStandalone = baseDir.includes('.next/standalone') || baseDir.endsWith('standalone');
  
  // If we're in standalone mode, we need to adjust paths accordingly
  const sourcePaths = {
    componentFile: path.join(baseDir, 'components', `${demoId}-assistant.tsx`),
    promptFile: path.join(baseDir, 'lib', 'prompts', `${demoId}-prompt.md`),
    contentDir: path.join(baseDir, 'public', 'markdown', demoId),
    contentFile: path.join(baseDir, 'public', 'markdown', demoId, 'content.md'),
    demoInfoFile: path.join(baseDir, 'data', 'demo-info', `${demoId}.json`),
    demoPage: path.join(baseDir, 'app', 'demos', demoId, 'page.tsx'),
    successPage: path.join(baseDir, 'app', 'demos', demoId, 'create-success'),
  };
  
  // For standalone mode, also check the standalone directory structure
  const standalonePaths = isStandalone ? {} : {
    standaloneComponentFile: path.join(baseDir, '.next', 'standalone', 'components', `${demoId}-assistant.tsx`),
    standalonePromptFile: path.join(baseDir, '.next', 'standalone', 'lib', 'prompts', `${demoId}-prompt.md`),
    standaloneContentDir: path.join(baseDir, '.next', 'standalone', 'public', 'markdown', demoId),
    standaloneContentFile: path.join(baseDir, '.next', 'standalone', 'public', 'markdown', demoId, 'content.md'),
    standaloneDemoInfoFile: path.join(baseDir, '.next', 'standalone', 'data', 'demo-info', `${demoId}.json`),
    standaloneDemoPage: path.join(baseDir, '.next', 'standalone', 'app', 'demos', demoId, 'page.tsx'),
    standaloneSuccessPage: path.join(baseDir, '.next', 'standalone', 'app', 'demos', demoId, 'create-success'),
  };
  
  // Combine the paths to check
  const filesToCheck = { ...sourcePaths, ...standalonePaths };
  
  const results: any = {};
  
  for (const [key, filePath] of Object.entries(filesToCheck)) {
    try {
      const exists = await checkFileExists(filePath);
      results[key] = {
        exists,
        path: filePath
      };
    } catch (error) {
      results[key] = {
        exists: false,
        path: filePath,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Check if any version of each required file exists (source or standalone)
  const reqsMet = {
    componentFile: results.componentFile?.exists || results.standaloneComponentFile?.exists,
    promptFile: results.promptFile?.exists || results.standalonePromptFile?.exists,
    contentFile: results.contentFile?.exists || results.standaloneContentFile?.exists,
    demoInfoFile: results.demoInfoFile?.exists || results.standaloneDemoInfoFile?.exists,
    demoPage: results.demoPage?.exists || results.standaloneDemoPage?.exists,
  };
  
  // Check if all required files exist in at least one location
  const success = reqsMet.componentFile && reqsMet.promptFile && reqsMet.contentFile && reqsMet.demoInfoFile && reqsMet.demoPage;
  
  return {
    success,
    details: results
  };
}

// Setup demo-specific logger
export const demoLogger = createSessionLogger('demo-creation'); 