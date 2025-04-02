import React, { useRef, useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/atom-one-dark.css';
import './code-editor.css';

// Initialize highlight.js languages
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);

// Helper function to highlight HTML with embedded CSS
const highlightHTML = (code: string): string => {
  // Check if the code is empty to avoid highlight.js errors
  if (!code.trim()) return '';

  // Process the code to extract HTML, CSS and add syntax highlighting
  let highlighted = hljs.highlight(code, { language: 'html' }).value;

  // Apply custom colors to color codes (#RRGGBB)
  highlighted = highlighted.replace(/(#[0-9A-Fa-f]{3,6})/g, '<span class="hljs-color" style="color:$1">$1</span>');

  // Enhance highlighting for certain tags
  highlighted = highlighted.replace(/(&lt;[\/]?)([\w-]+)/g, '$1<span class="hljs-tag-name">$2</span>');
  
  // Add custom highlighting for attributes
  highlighted = highlighted.replace(/([\w-]+)(=)(&quot;.*?&quot;)/g, '<span class="hljs-attr-name">$1</span>$2<span class="hljs-attr-value">$3</span>');

  return highlighted;
};

// Line numbers component with ref
interface LineNumbersProps {
  count: number;
  lineNumbersRef?: React.RefObject<HTMLDivElement>;
}

const LineNumbers: React.FC<LineNumbersProps> = ({ count, lineNumbersRef }) => {
  // Ensure we render at least a reasonable minimum number of lines
  const minLineCount = Math.max(count, 10);
  
  // Log line count to help with debugging
  console.log("Rendering line numbers component with count:", count);
  
  return (
    <div 
      ref={lineNumbersRef}
      className="line-numbers text-xs text-gray-500 select-none pr-2 text-right overflow-hidden" 
      style={{ 
        minHeight: `${minLineCount * 1.4}em`,  // Ensure min height based on lines
        height: '100%' // Match the editor height
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div 
          key={i} 
          className="leading-tight py-0.5"
          style={{ height: '1.4em', lineHeight: '1.4' }} // Fixed height to match code lines
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
};

interface CodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  isGenerating?: boolean;
  readOnly?: boolean;
  editorWrapperRef?: React.RefObject<HTMLDivElement>;
}

export function CodeEditor({ 
  value, 
  onChange,
  placeholder = "Enter your code here...",
  isGenerating = false,
  readOnly = false,
  editorWrapperRef: externalEditorWrapperRef
}: CodeEditorProps) {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  // Use the external ref if provided, otherwise create our own internal ref
  const internalEditorWrapperRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = externalEditorWrapperRef || internalEditorWrapperRef;
  const [lineCount, setLineCount] = useState(1);
  const [isTyping, setIsTyping] = useState(isGenerating);

  // Update line count when content changes
  useEffect(() => {
    // Calculate line count properly by splitting by newlines
    const lines = value.split('\n');
    const count = lines.length;
    setLineCount(count);
    console.log("Line count updated:", count, "from content length:", value.length);
  }, [value]);

  // Display typing indicator
  useEffect(() => {
    setIsTyping(isGenerating);
    console.log("Typing indicator visibility updated:", isGenerating);
  }, [isGenerating]);
  
  // Synchronize scrolling between editor and line numbers
  useEffect(() => {
    const editorWrapper = editorWrapperRef.current;
    const lineNumbers = lineNumbersRef.current;
    
    if (!editorWrapper || !lineNumbers) return;
    
    // Force an initial height calculation based on content
    const calculateContentHeight = () => {
      // Access the textarea element
      const textarea = editorWrapper.querySelector('textarea');
      if (textarea) {
        // Calculate height based on content
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const lines = value.split('\n').length;
        const totalHeight = Math.max(lines * lineHeight + 40, 400);
        
        // Log the dimensions for debugging
        const parentElement = editorWrapper.parentElement;
        console.log("EDITOR DIMENSIONS:", {
          lines,
          lineHeight,
          calculatedHeight: totalHeight,
          editorWrapperHeight: editorWrapper.clientHeight,
          editorWrapperScrollHeight: editorWrapper.scrollHeight,
          textareaScrollHeight: textarea.scrollHeight,
          contentLength: value.length,
          overflowY: getComputedStyle(editorWrapper).overflowY,
          parentOverflow: parentElement ? getComputedStyle(parentElement).overflow : 'unknown'
        });
        
        // Apply height to textarea
        textarea.style.minHeight = `${totalHeight}px`;
        
        // Always ensure we have scrollbars when needed
        editorWrapper.style.overflowY = 'auto';
        
        // Force editor wrapper to have sufficient height
        editorWrapper.style.minHeight = '400px';
        editorWrapper.style.maxHeight = '100%';
      }
      
      // Ensure scrollbar appears if needed by forcing a small scroll
      setTimeout(() => {
        if (editorWrapper.scrollHeight > editorWrapper.clientHeight) {
          console.log("SCROLL NEEDED - Container height vs scroll height:", 
            editorWrapper.clientHeight, editorWrapper.scrollHeight);
          editorWrapper.scrollTop = 1;
        } else {
          console.log("NO SCROLL NEEDED - Content fits in container");
        }
      }, 100);
    };
    
    // Sync line numbers scrolling
    const handleScroll = () => {
      if (lineNumbers) {
        lineNumbers.scrollTop = editorWrapper.scrollTop;
      }
    };
    
    // Initial setup - force scrollbar to appear by ensuring content height
    calculateContentHeight();
    
    // Make sure scrollbars appear immediately
    setTimeout(calculateContentHeight, 100);
    
    // Set up event listeners
    editorWrapper.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', calculateContentHeight);
    
    return () => {
      editorWrapper.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', calculateContentHeight);
    };
  }, [value]); // Re-run when content changes

  // Force editor wrapper to have fixed height to ensure scroll behavior
  useEffect(() => {
    if (editorWrapperRef.current) {
      // This forces the wrapper to have a fixed height, ensuring scroll behavior
      editorWrapperRef.current.style.height = '600px';
      editorWrapperRef.current.style.overflowY = 'scroll';
      
      // Force scroll position to activate scrollbar
      setTimeout(() => {
        if (editorWrapperRef.current) {
          editorWrapperRef.current.scrollTop = 1;
          console.log("FORCE APPLIED - Scrollbar enabled with fixed height");
        }
      }, 100);
    }
  }, []);

  // Add handler to ensure editor stays scrollable
  useEffect(() => {
    // Add mutation observer to ensure textarea stays scrollable
    if (editorWrapperRef.current) {
      const observer = new MutationObserver((mutations) => {
        // When content changes, ensure scrollbars are visible
        if (editorWrapperRef.current) {
          editorWrapperRef.current.style.overflowY = 'scroll';
        
          // Check if we need to scroll to bottom for streaming content
          if (isGenerating) {
            setTimeout(() => {
              if (editorWrapperRef.current) {
                editorWrapperRef.current.scrollTop = 
                  editorWrapperRef.current.scrollHeight - 
                  editorWrapperRef.current.clientHeight;
              }
            }, 10);
          }
        }
      });
      
      observer.observe(editorWrapperRef.current, { 
        childList: true, 
        subtree: true,
        characterData: true
      });
      
      return () => observer.disconnect();
    }
  }, [isGenerating]);
  
  return (
    <div className="code-editor-container">
      <div className="flex h-full">
        <LineNumbers count={lineCount} lineNumbersRef={lineNumbersRef} />
        
        <div 
          ref={editorWrapperRef}
          className="editor-wrapper"
          style={{ 
            overflowY: 'scroll', // Force scrollbar to always be visible
            height: '600px',
            maxHeight: '600px',
            position: 'relative',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        >
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={highlightHTML}
            padding={8}
            textareaClassName="codearea"
            className="editor-area"
            style={{
              fontFamily: '"Fira Code", "Consolas", monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              minHeight: '100%',
              whiteSpace: 'pre',
              willChange: 'contents',
              containIntrinsicSize: 'auto',
            }}
            readOnly={readOnly || isGenerating}
          />
          
          {isTyping && (
            <div className="absolute right-3 bottom-3 z-10 bg-blue-600 text-white px-2 py-1 rounded-md text-xs flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Typing code...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}