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

// Minimap component
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
  
  return (
    <div 
      ref={minimapRef}
      className="minimap bg-[#1e1e1e] overflow-hidden border-l border-gray-700 text-gray-400" 
      style={{ 
        width: '80px',
        flex: '0 0 80px',
        fontSize: '2px', 
        lineHeight: '3px',
        position: 'relative'
      }}
    >
      <pre className="p-1 opacity-40 h-full">
        {content}
      </pre>
      <div 
        className="absolute right-0 w-1 bg-white opacity-50 pointer-events-none"
        style={indicatorStyle}
      ></div>
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
    
    const handleScroll = () => {
      if (lineNumbers) {
        lineNumbers.scrollTop = editorWrapper.scrollTop;
      }
      
      // Update minimap scroll position
      const { scrollTop, scrollHeight, clientHeight } = editorWrapper;
      const scrollPosition = scrollTop / (scrollHeight - clientHeight) || 0;
      const visiblePortion = scrollHeight > 0 ? clientHeight / scrollHeight : 0.3;
      
      setScrollRatio(scrollPosition);
      setVisibleRatio(visiblePortion);
    };
    
    editorWrapper.addEventListener('scroll', handleScroll);
    
    // Initial calculation
    handleScroll();
    
    return () => {
      editorWrapper.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="code-editor-container h-full bg-[#111827] rounded overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <LineNumbers count={lineCount} lineNumbersRef={lineNumbersRef} />
        
        <div 
          ref={editorWrapperRef}
          className="editor-wrapper flex-1 relative overflow-auto font-mono leading-normal"
        >
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={highlightHTML}
            padding={8}
            textareaClassName="codearea"
            className="editor-area text-sm w-full h-full bg-[#111827] text-gray-300"
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