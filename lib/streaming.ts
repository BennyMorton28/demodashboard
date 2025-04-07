/**
 * Creates a readable stream for use with Server-Sent Events
 * @param callback A function that will be called with the controller to handle streaming
 * @returns A ReadableStream that can be returned in a NextResponse
 */
export function createReadableStream(
  callback: (controller: ReadableStreamDefaultController) => Promise<void>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        await callback(controller);
      } catch (error) {
        console.error('Stream error:', error);
        controller.error(error);
      }
    }
  });
} 