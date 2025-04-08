# Demo Creation Debugging Guide

This guide explains how to use the new diagnostic and debugging tools to investigate issues with demo creation in the dashboard.

## Overview of the Debugging System

We've implemented a comprehensive debugging system to help identify and resolve issues when creating demos. It includes:

1. **Enhanced logging**: All demo creation actions are now logged to the server console and saved to log files in the `logs` directory
2. **Demo validation**: Automatic validation checks to ensure all required files are created
3. **Debug API endpoints**: Endpoints to check demo status and analyze filesystem structures
4. **Enhanced UI**: Improved create-success page to show detailed diagnostics

## How to Debug Demo Creation Issues

### 1. Using the Debug UI

The easiest way to debug demo creation issues is to add `?debug=true` to the success page URL:

```
https://demos.noyesai.com/demos/DEMO_ID/create-success?id=DEMO_ID&debug=true
```

This will show an enhanced debug UI with:
- File status for all required demo files
- Client-side log of operations
- Server logs related to the demo (if available)
- Detailed filesystem structure view (expandable)

If a demo creation fails, the debug UI will automatically disable auto-redirect and show error information.

### 2. Using the Debug API Endpoints

#### Check Demo Creation Status

```
GET /api/check-demo-creation?id=DEMO_ID&includeStructure=true
```

This endpoint checks if all required files for a demo exist and can provide detailed filesystem structure information.

Parameters:
- `id`: The demo ID to check (required)
- `includeStructure`: Set to `true` to include detailed directory and file structure (optional)

Response example:
```json
{
  "success": true,
  "details": {
    "componentFile": { "exists": true, "path": "..." },
    "promptFile": { "exists": true, "path": "..." },
    "contentFile": { "exists": true, "path": "..." },
    "demoInfoFile": { "exists": true, "path": "..." },
    "demoPage": { "exists": true, "path": "..." }
  },
  "structure": {
    "components": { ... },
    "prompts": { ... },
    "logs": [ ... ]
  }
}
```

#### Get Demo Debug Information

```
GET /api/debug-demo?id=DEMO_ID&includeData=true
```

This endpoint provides detailed information about a specific demo, including file paths and optionally file contents.

Parameters:
- `id`: The demo ID to debug (required)
- `includeData`: Set to `true` to include file contents (optional)

Response example:
```json
{
  "demoId": "example-demo",
  "timestamp": "2025-04-08T19:27:57.111Z",
  "paths": {
    "componentFile": "/path/to/components/example-demo-assistant.tsx",
    "promptFile": "/path/to/lib/prompts/example-demo-prompt.md",
    "contentFile": "/path/to/public/markdown/example-demo/content.md",
    "demoInfoFile": "/path/to/data/demo-info/example-demo.json",
    "demoPage": "/path/to/app/demos/example-demo/page.tsx"
  },
  "exists": {
    "componentFile": true,
    "promptFile": true,
    "contentFile": true,
    "demoInfoFile": true,
    "demoPage": true
  },
  "data": {
    "componentFile": "// File content here...",
    "promptFile": "# Prompt content here...",
    "contentFile": "# Content here...",
    "demoInfoFile": { "id": "example-demo", "title": "Example Demo", ... }
  }
}
```

### 3. Checking Server Logs

All demo creation actions are now logged to files in the `logs` directory. The logs are named with the following pattern:

```
YYYY-MM-DD_demo-creation.log
```

For example: `2025-04-08_demo-creation.log`

Each log entry includes:
- Timestamp
- Log level (INFO, ERROR, WARN)
- Message
- Additional data (for errors, includes stack trace)

### 4. Testing Tools

You can use the `test-demo-creation.js` script to create test demos and verify the debugging tools are working:

```bash
node test-demo-creation.js
```

This script will:
1. Create a complete test demo with all required files
2. Create an incomplete test demo with missing files
3. Generate test logs for both demos
4. Provide URLs to test the debug UI

## Common Issues and Solutions

### Missing Files

If files are missing after demo creation:
1. Check the server logs for errors during file creation
2. Check filesystem permissions
3. Verify that the upload endpoint received all required data

### Invalid Demo IDs

If a demo ID is invalid:
1. Check the format (should be lowercase, dash-separated)
2. Check for special characters that might cause filesystem issues
3. Verify that the ID was correctly passed to the server

### Upload Issues

If files fail to upload:
1. Check the maximum file size (5MB limit)
2. Check that all required fields are provided
3. Verify that the form data includes the correct file types

## Future Improvements

Future improvements to the debugging system may include:
- Real-time monitoring of demo creation
- Automated recovery for failed demo creations
- Email notifications for critical errors
- Enhanced visualization of demo structures 