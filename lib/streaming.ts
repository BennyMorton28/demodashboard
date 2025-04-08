/**
 * Creates a readable stream for use with Server-Sent Events
 * @param callback A function that will be called with the controller to handle streaming
 * @returns A ReadableStream that can be returned in a NextResponse
 */
export function createReadableStream(
  callback: (controller: ReadableStreamDefaultController) => Promise<void>
): ReadableStream {
  console.log("[STREAM-DEBUG] Creating ReadableStream");
  return new ReadableStream({
    async start(controller) {
      console.log("[STREAM-DEBUG] Stream start called");
      try {
        console.log("[STREAM-DEBUG] Executing callback");
        await callback(controller);
        console.log("[STREAM-DEBUG] Callback completed successfully");
      } catch (error) {
        console.error('[STREAM-DEBUG] Stream error:', error);
        
        // Send error message through the stream if possible
        try {
          const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
          console.log('[STREAM-DEBUG] Sending error through stream:', errorMessage);
          
          // Format as a proper SSE message
          const errorEvent = {
            event: "error",
            data: {
              message: errorMessage
            }
          };
          
          controller.enqueue(`data: ${safeJsonEncode(errorEvent)}\n\n`);
          // Give time for the error to be processed
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error('[STREAM-DEBUG] Failed to send error through stream:', e);
        }
        
        // Don't call controller.error() since we're handling the error by sending it through the stream
        // This allows the client to receive the error message before the stream closes
      } finally {
        try {
          // Ensure clean closure
          console.log("[STREAM-DEBUG] Closing stream controller");
          controller.close();
        } catch (e) {
          // Ignore close errors
          console.log("[STREAM-DEBUG] Error closing controller (ignored):", e);
        }
      }
    }
  });
}

/**
 * Utility function to safely encode JSON data for streaming
 * Prevents JSON parsing errors in the client
 */
export function safeJsonEncode(data: any): string {
  try {
    // Simply stringify the data - JSON.stringify already handles proper escaping
    const stringData = JSON.stringify(data);
    
    if (data.event === 'error') {
      console.log('[STREAM-DEBUG] Encoded error event:', stringData.substring(0, 100));
    }
    
    return stringData;
  } catch (error) {
    console.error('[STREAM-DEBUG] Error encoding JSON for stream:', error);
    return JSON.stringify({ 
      event: 'error', 
      data: { message: 'Error encoding response data' } 
    });
  }
} 