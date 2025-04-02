import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  return (
    <div 
      ref={lineNumbersRef}
      className="line-numbers text-xs text-gray-500 select-none pr-2 text-right overflow-auto" 
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="leading-tight py-0.5">{i + 1}</div>
      ))}
    </div>
  );
};

// Minimap component - shows only the visible section of code
const Minimap: React.FC<{ 
  content: string;
  scrollRatio: number;
  visibleRatio: number; 
}> = ({ content, scrollRatio, visibleRatio }) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  
  // Calculate position of the visible area indicator
  const indicatorStyle = {
    top: `${scrollRatio * 100}%`,
    height: `${Math.max(visibleRatio * 100, 10)}%`,
  };
  
  // Create a content view that represents the entire content scaled down
  const processedContent = useMemo(() => {
    const lines = content.split('\n');
    
    // If content is very large, take a representative sample
    // This prevents the minimap from being too dense and unreadable
    if (lines.length > 1000) {
      const factor = Math.ceil(lines.length / 1000);
      return lines.filter((_, i) => i % factor === 0).join('\n');
    }
    
    return content;
  }, [content]);
  
  // Calculate minimap content style based on scroll position
  const contentStyle = {
    transform: `translateY(-${scrollRatio * 100}%)`,
    height: `${100 / visibleRatio}%`, 
    maxHeight: '2000%', // Prevent excessively large height
  };
  
  return (
    <div 
      ref={minimapRef}
      className="minimap"
    >
      <div className="relative h-full">
        <pre 
          className="minimap-content p-1 opacity-40 w-full"
          style={contentStyle}
        >
          {processedContent}
        </pre>
        <div 
          className="minimap-indicator"
          style={indicatorStyle}
        ></div>
      </div>
    </div>
  );
};

interface CodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  isGenerating?: boolean;
  readOnly?: boolean;
}

export function CodeEditor({ 
  value, 
  onChange,
  placeholder = "Enter your code here...",
  isGenerating = false,
  readOnly = false
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [isTyping, setIsTyping] = useState(isGenerating);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [visibleRatio, setVisibleRatio] = useState(0.3);

  // Update line count when content changes
  useEffect(() => {
    const count = (value.match(/\n/g) || []).length + 1;
    setLineCount(count);
  }, [value]);

  // Display typing indicator
  useEffect(() => {
    setIsTyping(isGenerating);
  }, [isGenerating]);
  
  // Synchronize scrolling between editor and line numbers and update minimap position
  useEffect(() => {
    const editorWrapper = editorWrapperRef.current;
    const lineNumbers = lineNumbersRef.current;
    
    if (!editorWrapper || !lineNumbers) return;
    
    // Force an initial height calculation
    const calculateContentHeight = () => {
      // Ensure the editor wrapper has a proper height
      const containerRect = editorWrapper.parentElement?.getBoundingClientRect();
      if (containerRect && containerRect.height > 0) {
        // If editor is not rendered properly, force min-height
        if (editorWrapper.scrollHeight < 1.5 * containerRect.height) {
          // Set a minimum height to ensure scrolling
          const textarea = editorWrapper.querySelector('textarea');
          if (textarea) {
            textarea.style.minHeight = `${Math.max(500, 1.5 * containerRect.height)}px`;
          }
        }
      }
    };
    
    // Calculate positions for minimap
    const handleScroll = () => {
      // Sync line numbers scrolling
      if (lineNumbers) {
        lineNumbers.scrollTop = editorWrapper.scrollTop;
      }
      
      // Update minimap scroll position
      const { scrollTop, scrollHeight, clientHeight } = editorWrapper;
      
      // Only update if we have actual content to scroll (prevents NaN values)
      if (scrollHeight > clientHeight) {
        const scrollPosition = scrollTop / (scrollHeight - clientHeight) || 0;
        // Calculate how much of the content is visible in the viewport
        const visiblePortion = scrollHeight > 0 ? clientHeight / scrollHeight : 0.3;
        
        setScrollRatio(scrollPosition);
        setVisibleRatio(visiblePortion);
      } else {
        // Default values for when there's nothing to scroll
        setScrollRatio(0);
        setVisibleRatio(1);
      }
    };
    
    // Initial setup
    calculateContentHeight();
    setTimeout(handleScroll, 100); // Delay to ensure proper rendering
    
    // Set up event listeners
    editorWrapper.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', calculateContentHeight);
    
    return () => {
      editorWrapper.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', calculateContentHeight);
    };
  }, [value]); // Re-run when content changes

  return (
    <div className="code-editor-container">
      <div className="flex h-full">
        <LineNumbers count={lineCount} lineNumbersRef={lineNumbersRef} />
        
        <div 
          ref={editorWrapperRef}
          className="editor-wrapper"
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
        
        {/* Minimap on the right side */}
        <Minimap 
          content={value} 
          scrollRatio={scrollRatio} 
          visibleRatio={visibleRatio} 
        />
      </div>
    </div>
  );
}