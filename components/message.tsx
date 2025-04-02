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

const Message: React.FC<MessageProps> = ({ message }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
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

    const content = message.content[0];
    
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

  useEffect(() => {
    if (!messageText) {
      setDisplayedText("");
      setIsReady(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (message.role === "user" || hasBeenDisplayedBefore()) {
      // For user messages or already displayed messages, show immediately
      setDisplayedText(messageText);
      setIsReady(true);
      markAsDisplayed();
      return;
    }
    
    // Clear any existing text and wait before starting
    setDisplayedText("");
    setIsReady(false);

    // Add a small delay before starting to prevent flashing
    timeoutRef.current = setTimeout(() => {
      setIsReady(true);
      let currentIndex = 0;
      
      const streamText = () => {
        if (currentIndex < messageText.length) {
          setDisplayedText(messageText.slice(0, currentIndex + 1));
          currentIndex++;
          timeoutRef.current = setTimeout(streamText, 10);
        } else {
          markAsDisplayed();
        }
      };

      streamText();
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsReady(false);
    };
  }, [messageText, message.role]);

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 rounded px-1 py-0.5" {...props}>
          {children}
        </code>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-gray-200">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-gray-50">{children}</thead>;
    },
    th({ children }: any) {
      return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{children}</td>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic">
          {children}
        </blockquote>
      );
    },
    a({ children, href }: any) {
      return (
        <a href={href} className="text-blue-500 hover:text-blue-700 underline">
          {children}
        </a>
      );
    }
  };

  if (message.role === "user") {
    return (
      <div className="text-base">
        <div className="flex justify-end">
          <div>
            <div className="ml-4 rounded-[16px] px-4 py-2 md:ml-24 bg-[#ededed] text-stone-900 font-normal font-sans text-lg">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {messageText}
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
        <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-normal font-sans text-lg">
          {isReady && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={MarkdownComponents}
            >
              {displayedText}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
