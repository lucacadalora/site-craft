import React, { useRef, useEffect, useState } from 'react';
import './code-editor.css';

// Simple line numbers component
interface LineNumbersProps {
  count: number;
}

const LineNumbers: React.FC<LineNumbersProps> = ({ count }) => {
  return (
    <div className="line-numbers text-xs text-gray-500 select-none px-2 text-right">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
};

interface SimpleCodeEditorProps {
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
}: SimpleCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Sync scrolling between textarea and line numbers
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const lineNumbers = document.querySelector('.line-numbers');
      if (lineNumbers) {
        lineNumbers.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => {
        textarea.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <div className="code-editor-simple h-full bg-[#111827] rounded">
      <div className="editor-container flex h-full">
        <LineNumbers count={lineCount} />
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="editor-textarea flex-1 bg-[#111827] text-gray-300 font-mono text-sm border-none resize-none focus:outline-none p-2"
          placeholder={placeholder}
          spellCheck={false}
          readOnly={readOnly || isGenerating}
          style={{
            fontFamily: '"Fira Code", "Consolas", monospace',
            lineHeight: '1.5',
            width: '100%',
            height: '100%',
            overflow: 'auto',
          }}
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
  );
}