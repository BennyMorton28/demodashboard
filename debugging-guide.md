# Demo Debugging Guide

Here's how to debug issues with your demos, specifically for investigating the "Demo Not Available" error with the zoo-lander demo.

## Using the Debug URL Parameter

The easiest way to debug a demo is to add the `debug=true` parameter to the success page URL:

```
https://demos.noyesai.com/demos/zoo-lander/create-success?id=zoo-lander&debug=true
```

This will show:
- File validation results (which files exist and which are missing)
- Debug logs from client and server
- Detailed file structure information

## Using the Debug API Endpoints

If you need more detailed information, you can use these API endpoints:

### 1. Check Demo Creation Status

```
GET https://demos.noyesai.com/api/check-demo-creation?id=zoo-lander&includeStructure=true
```

This checks if all required files for a demo exist and provides detailed file structure information.

### 2. Get Demo Debug Information

```
GET https://demos.noyesai.com/api/debug-demo?id=zoo-lander&includeData=true
```

This provides detailed information about the demo, including file paths and contents.

## Investigating the "Demo Not Available" Error

For the "zoo-lander" demo specifically:

1. First check if the demo files exist by visiting:
   ```
   https://demos.noyesai.com/api/check-demo-creation?id=zoo-lander
   ```

2. If files are missing, check the server logs to see what happened during demo creation:
   ```
   https://demos.noyesai.com/demos/zoo-lander/create-success?id=zoo-lander&debug=true
   ```
   Look at the "Server Logs" section.

3. To see details about what files should exist and what's missing, use:
   ```
   https://demos.noyesai.com/api/debug-demo?id=zoo-lander
   ```

## Common Issues and Solutions

1. **Missing Files**: If files are missing, the demo creation process may have failed partway through. Check the logs for errors during file creation.

2. **Invalid Demo ID**: Ensure the demo ID is valid (lowercase, dash-separated) and matches exactly what was used during creation.

3. **File Permission Issues**: Server might not have had permissions to create all required files.

4. **Component Errors**: The component might exist but contain syntax errors preventing it from rendering.

5. **Routing Issues**: The Next.js router might not recognize the demo route.

To fix most issues, you may need to:
1. Delete the demo files (if any exist)
2. Recreate the demo with the proper files
3. Restart the server

## Next Steps

Use the provided debugging tools to investigate why the zoo-lander demo is not available. The most likely issue is that some required files were not created properly during the demo creation process. 