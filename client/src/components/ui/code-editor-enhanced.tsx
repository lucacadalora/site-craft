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
      className="line-numbers text-xs text-gray-500 select-none pr-2 text-right overflow-hidden" 
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="leading-tight py-0.5">{i + 1}</div>
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
    const count = (value.match(/\n/g) || []).length + 1;
    setLineCount(count);
  }, [value]);

  // Display typing indicator
  useEffect(() => {
    setIsTyping(isGenerating);
  }, [isGenerating]);
  
  // Synchronize scrolling between editor and line numbers
  useEffect(() => {
    const editorWrapper = editorWrapperRef.current;
    const lineNumbers = lineNumbersRef.current;
    
    if (!editorWrapper || !lineNumbers) return;
    
    // Force an initial height calculation
    const calculateContentHeight = () => {
      // Force the textarea to have a large height to guarantee scrolling
      const textarea = editorWrapper.querySelector('textarea');
      if (textarea) {
        // Set a very large min-height to guarantee scrollbars
        textarea.style.minHeight = '1000px';
        
        // Also add 20 lines of whitespace if the content is small
        if (value.split('\n').length < 20) {
          // This is just a development trick to force scrolling
          // Don't change the actual value but make the textarea taller
          textarea.style.paddingBottom = '800px';
        }
      }
      
      // Force scrollbar to appear
      setTimeout(() => {
        editorWrapper.scrollTop = 1; // Force scrollbar activation
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
      </div>
    </div>
  );
}