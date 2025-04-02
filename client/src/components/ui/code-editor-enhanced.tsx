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
      className="line-numbers text-xs text-gray-500 select-none pr-2 text-right overflow-hidden" 
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="leading-tight py-0.5">{i + 1}</div>
      ))}
    </div>
  );
};

// Minimap component - shows a scanned preview with highlighted visible area
const Minimap: React.FC<{ 
  content: string;
  scrollRatio: number;
  visibleRatio: number; 
}> = ({ content, scrollRatio, visibleRatio }) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLPreElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLPreElement>(null);
  
  // Process content to be displayed in the minimap
  const processedContent = useMemo(() => {
    const lines = content.split('\n');
    
    // For extremely large files, sample the content to prevent performance issues
    if (lines.length > 2000) {
      const factor = Math.ceil(lines.length / 2000);
      return lines.filter((_, i) => i % factor === 0).join('\n');
    }
    
    return content;
  }, [content]);
  
  // Use syntax highlighting to color the minimap
  const highlightedContent = useMemo(() => {
    try {
      return hljs.highlight(processedContent, { language: 'html' }).value;
    } catch {
      return processedContent;
    }
  }, [processedContent]);
  
  // Calculate and apply viewport positioning
  useEffect(() => {
    if (!minimapRef.current || !contentRef.current || !viewportRef.current || !highlightedRef.current) return;
    
    const minimap = minimapRef.current;
    const contentEl = contentRef.current;
    const viewport = viewportRef.current;
    const highlighted = highlightedRef.current;
    
    const minimapHeight = minimap.clientHeight;
    const contentHeight = contentEl.scrollHeight;
    
    // Scale factor for the minimap (if needed)
    const scaleFactor = contentHeight > 0 ? minimapHeight / contentHeight : 1;
    
    // Calculate viewport position and size
    const viewportTop = scrollRatio * minimapHeight;
    const viewportHeight = Math.max(visibleRatio * minimapHeight, 30);
    
    // Calculate which part of the content should be highlighted
    // This requires knowing the line height and total lines
    const lines = content.split('\n');
    const totalLines = lines.length;
    const visibleLines = Math.round(totalLines * visibleRatio);
    const startLine = Math.round(scrollRatio * totalLines);
    
    // Set viewport position (highlighting overlay)
    viewport.style.top = `${viewportTop}px`;
    viewport.style.height = `${viewportHeight}px`;
    
    // Position the highlighted content to show in the viewport
    // This makes only the current viewed content bright, rest is dimmed
    highlighted.style.top = `-${viewportTop}px`;
    
    // Clip the highlighted content to only show within the viewport height
    // This prevents highlighting beyond the visible area
    highlighted.style.height = `${viewportHeight}px`;
    highlighted.style.clipPath = `inset(0 0 0 0)`;
    
    // Add a mask overlay to further isolate just the viewport section
    const totalContentHeight = content.split('\n').length * 3; // Approx 3px per line in minimap
    
    // Create mask effect - dim everything above and below the visible area
    highlighted.style.boxShadow = `
      0 -${viewportTop + 500}px 0 rgba(0,0,0,0.85),
      0 ${totalContentHeight - viewportTop}px 0 rgba(0,0,0,0.85)
    `;
    
    // Apply mask to make the code visible only within the viewport area
  }, [scrollRatio, visibleRatio, content]);
  
  return (
    <div ref={minimapRef} className="minimap">
      {/* Base dimmed content */}
      <pre 
        ref={contentRef}
        className="p-1 w-full minimap-content"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      
      {/* Viewport area that shows where we are in the document */}
      <div ref={viewportRef} className="minimap-viewport" />
      
      {/* Highlighted content that appears in the viewport */}
      <pre 
        ref={highlightedRef}
        className="p-1 w-full minimap-highlighted"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      
      {/* Indicator on the right side */}
      <div className="minimap-indicator" style={{
        top: `${scrollRatio * 100}%`,
        height: `${Math.max(visibleRatio * 100, 5)}%`
      }} />
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