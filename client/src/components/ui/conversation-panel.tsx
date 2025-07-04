import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  Sparkles,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (message: string, isFollowUp: boolean) => void;
  isGenerating: boolean;
  currentHtml: string;
  className?: string;
}

export function ConversationPanel({
  isOpen,
  onToggle,
  onSendMessage,
  isGenerating,
  currentHtml,
  className
}: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isFollowUpMode, setIsFollowUpMode] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage(input.trim(), isFollowUpMode);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Add a system message when HTML is first generated
  useEffect(() => {
    if (currentHtml && currentHtml !== '' && messages.length === 0) {
      setMessages([{
        id: 'initial',
        role: 'assistant',
        content: 'I\'ve generated your landing page! You can now ask me to make any changes or improvements.',
        timestamp: new Date()
      }]);
    }
  }, [currentHtml, messages.length]);

  return (
    <Card className={cn(
      "bg-[#1e293b] border-gray-700 transition-all duration-300",
      isOpen ? "h-96" : "h-12",
      className
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">
            AI Assistant {messages.length > 0 && `(${messages.length})`}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFollowUpMode(!isFollowUpMode);
              }}
              className={cn(
                "text-xs px-2 py-1 h-7",
                isFollowUpMode ? "text-blue-400" : "text-gray-400"
              )}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isFollowUpMode ? "Follow-up On" : "Follow-up Off"}
            </Button>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="flex flex-col h-full">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start a conversation to refine your landing page</p>
                <p className="text-xs mt-1">
                  {isFollowUpMode ? "Follow-up mode: I'll remember context" : "New prompt mode: Each message starts fresh"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === 'user'
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-100"
                      )}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {message.role === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isFollowUpMode 
                    ? "Ask for changes or improvements..." 
                    : "Describe a new landing page..."
                }
                className="flex-1 min-h-[60px] max-h-[120px] bg-gray-800 border-gray-600 text-white placeholder-gray-500 resize-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isFollowUpMode 
                ? "Your changes will be applied to the current page" 
                : "This will generate a completely new page"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}