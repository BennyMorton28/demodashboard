import { MessageItem } from "@/lib/assistant";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MessageProps {
  message: MessageItem;
}

const tailwindConfig = {
  theme: {
    extend: {
      animation: {
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
};

const Message: React.FC<MessageProps> = ({ message }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cursorIntervalRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const cursorPositionRef = useRef<HTMLSpanElement>(null);
  
  // Generate a unique ID for the message based on its content
  const getMessageId = () => {
    const text = getMessageText();
    return `message-${message.role}-${text.slice(0, 50)}`; // Use first 50 chars as identifier
  };

  // Check if message has been displayed before
  const hasBeenDisplayedBefore = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getMessageId()) === 'true';
  };

  // Mark message as displayed
  const markAsDisplayed = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getMessageId(), 'true');
  };

  const getMessageText = () => {
    if (!message.content || !Array.isArray(message.content) || message.content.length === 0) {
      return "";
    }

    const content = message.content[0] as string | { text?: string; type?: string };
    
    if (typeof content === "string") {
      return content.trim();
    }
    
    if (content && typeof content === "object") {
      if ('text' in content && typeof content.text === "string") {
        return content.text.trim();
      }
      if ('type' in content && content.type === 'output_text' && typeof content.text === "string") {
        return content.text.trim();
      }
      if ('type' in content && content.type === 'output_text') {
        return String(content.text || "").trim();
      }
    }

    return "";
  };

  const messageText = getMessageText();

  // Prepare text for better markdown rendering
  const prepareMarkdownText = (text: string) => {
    // First, check for cut-off math expressions and fix them
    let processedText = text;

    // 1. Fix unclosed math blocks
    const mathBlockDelimiters = processedText.match(/\$\$/g);
    if (mathBlockDelimiters && mathBlockDelimiters.length % 2 !== 0) {
      // Add a closing delimiter if there's an odd number
      processedText += ' $$';
    }

    // 2. Fix unclosed inline math
    const inlineMathCount = (processedText.match(/\$/g) || []).length - (processedText.match(/\$\$/g) || []).length * 2;
    if (inlineMathCount % 2 !== 0) {
      // Add a closing dollar sign if there's an odd number
      processedText += '$';
    }

    // 3. Fix unclosed code blocks
    const codeBlockOpenings = (processedText.match(/```[a-zA-Z0-9]*/g) || []).length;
    const codeBlockClosings = (processedText.match(/```\s*(?:\n|$)/g) || []).length;
    if (codeBlockOpenings > codeBlockClosings) {
      // Add closing code block
      processedText += '\n```';
    }

    // Now continue with other cleanups
    processedText = processedText
      // Replace multiple newlines with just two (for paragraph breaks)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure proper spacing for lists
      .replace(/(\n)(\s*[-*+])/g, '$1$2')
      // Fix inline math with backslashes
      .replace(/\\times/g, '\\times')
      .replace(/\\sqrt/g, '\\sqrt')
      .replace(/\\sigma/g, '\\sigma')
      .replace(/\\text/g, '\\text')
      .replace(/\\frac/g, '\\frac')
      // Fix common math notation issues
      .replace(/\\_/g, '\\_')
      .replace(/\\{/g, '\\{')
      .replace(/\\}/g, '\\}')
      // Ensure inline math expressions are properly formatted
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      // Ensure block math expressions are properly formatted
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$');
      
    // Remove truncation message if present
    if (processedText.includes('[...stream truncated due to size...]')) {
      processedText = processedText.replace('[...stream truncated due to size...]', '');
    }

    // Fix for unbalanced asterisks (bold/italic)
    const asterisksCount = (processedText.match(/\*/g) || []).length;
    if (asterisksCount % 2 !== 0) {
      processedText += '*';
    }

    // Fix for unbalanced underscores (also used for italic/bold in markdown)
    const underscoresCount = (processedText.match(/_(?!\{)/g) || []).length;
    if (underscoresCount % 2 !== 0) {
      processedText += '_';
    }
    
    return processedText;
  };

  useEffect(() => {
    if (!messageText) {
      setDisplayedText("");
      return;
    }

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // For user messages or previously displayed messages, show immediately
    if (message.role === "user" || hasBeenDisplayedBefore()) {
      setDisplayedText(messageText);
      setIsThinking(false);
      if (message.role !== "user") {
        markAsDisplayed();
      }
      return;
    }
    
    // If we already have partial message content (not empty), don't reset it to avoid flickering
    const currentDisplayedLength = displayedText.length;
    const shouldReset = currentDisplayedLength === 0;
    
    // Only reset state if we're starting from scratch
    if (shouldReset) {
      setDisplayedText("");
      setIsReady(true);
      setIsThinking(true);
    } else {
      // If we already have content, continue with it
      setIsThinking(false);
    }
    
    isTypingRef.current = true;

    // Start typing animation after a brief delay
    const startTyping = () => {
      setIsThinking(false);
      
      // If we already have content and it's the same as the message text, don't retype
      if (displayedText === messageText) {
        isTypingRef.current = false;
        markAsDisplayed();
        return;
      }
      
      // For continued streaming, start from the current position rather than the beginning
      let visibleIndex = shouldReset ? 0 : currentDisplayedLength;
      
      const animateText = () => {
        if (visibleIndex < messageText.length) {
          setDisplayedText(messageText.slice(0, visibleIndex + 1));
          visibleIndex += 8; // Increase typing speed by processing more characters at once
          timeoutRef.current = setTimeout(animateText, 0);
        } else {
          isTypingRef.current = false;
          markAsDisplayed();
        }
      };

      // Start the animation immediately
      animateText();
    };

    // Brief initial delay only if starting from scratch
    timeoutRef.current = setTimeout(startTyping, shouldReset ? 100 : 0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isTypingRef.current = false;
      setIsThinking(false);
    };
  }, [messageText, message.role]);

  const MarkdownComponents = {
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-semibold mt-5 mb-2">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>;
    },
    p({ children }: any) {
      return <p className="mb-4 leading-relaxed whitespace-pre-line">{children}</p>;
    },
    ul({ children }: any) {
      return <ul className="list-disc pl-5 mb-4 ml-1 space-y-1">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal pl-5 mb-4 ml-1 space-y-1">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="mb-1 pl-1">{children}</li>;
    },
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md mb-4 overflow-hidden"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4 border rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-gray-100">{children}</thead>;
    },
    tbody({ children }: any) {
      return <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
    },
    tr({ children }: any) {
      return <tr className="border-b border-gray-200">{children}</tr>;
    },
    th({ children }: any) {
      return (
        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return <td className="px-3 py-2 text-sm text-gray-700">{children}</td>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic">
          {children}
        </blockquote>
      );
    },
    em({ children }: any) {
      return <em className="italic">{children}</em>;
    },
    strong({ children }: any) {
      return <strong className="font-bold">{children}</strong>;
    },
    a({ children, href }: any) {
      return (
        <a href={href} className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    },
    img({ src, alt }: any) {
      return (
        <div className="my-4">
          <img 
            src={src} 
            alt={alt || 'Image'} 
            className="max-w-full h-auto rounded-lg border border-gray-200" 
            style={{ maxHeight: '300px' }}
          />
          {alt && <p className="text-sm text-gray-500 mt-1 text-center">{alt}</p>}
        </div>
      );
    }
  };

  if (message.role === "user") {
    return (
      <div className="text-base">
        <div className="flex justify-end">
          <div>
            <div className="ml-4 rounded-[16px] px-4 py-2 md:ml-24 bg-[#ededed] text-stone-900 font-sans">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
                className="prose max-w-none"
              >
                {prepareMarkdownText(messageText)}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-base">
      <div className="flex">
        <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-sans">
          <div className="break-words">
            {isReady && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
                className="prose max-w-none"
              >
                {prepareMarkdownText(displayedText)}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
