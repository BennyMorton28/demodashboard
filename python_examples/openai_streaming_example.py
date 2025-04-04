#!/usr/bin/env python3
"""
OpenAI API Streaming Example

This script demonstrates how to stream responses from the OpenAI API using
server-sent events. Streaming allows you to start processing the beginning of 
the model's output while it continues generating the full response.
"""

from openai import OpenAI
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the OpenAI client
client = OpenAI()

def basic_streaming_example():
    """
    Basic example of streaming responses from the OpenAI API.
    """
    print("\n=== Basic Streaming Example ===\n")
    
    # Create a streaming response
    stream = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": "Say 'double bubble bath' ten times fast.",
            },
        ],
        stream=True,
    )
    
    # Process each event in the stream
    for event in stream:
        print(f"Event type: {event.type}")
        print(f"Event data: {event}")
        print("-" * 40)

def stream_with_event_handling():
    """
    Advanced example showing how to handle different event types from the stream.
    """
    print("\n=== Streaming with Event Handling ===\n")
    
    stream = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": "Explain the concept of streaming API responses in 3 sentences.",
            },
        ],
        stream=True,
    )
    
    # Initialize a buffer to collect text
    full_text = ""
    
    # Process different event types
    for event in stream:
        if event.type == "response.created":
            print("Response created, starting to receive content...")
        
        elif event.type == "response.output_text.delta":
            # Extract and display the text delta
            text_delta = event.data.delta.value
            full_text += text_delta
            print(text_delta, end="", flush=True)
            
        elif event.type == "response.completed":
            print("\n\nResponse completed!")
            print(f"\nFull response text: {full_text}")
            
        elif event.type == "error":
            print(f"\nError encountered: {event.data}")

def main():
    print("OpenAI API Streaming Examples")
    print("============================\n")
    
    # Check if API key is available
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Please set your OpenAI API key in the .env file or environment variables.")
        return
    
    try:
        basic_streaming_example()
        stream_with_event_handling()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main() 