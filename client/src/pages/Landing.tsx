import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, Globe, Code, Rocket, ArrowRight, Menu, X, Check, AlertCircle, Send,
  AtSign, Paperclip, Edit3, ChevronUp, Dices, Paintbrush
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { queryClient } from '@/lib/queryClient';
import { PROMPTS_FOR_AI } from '@/lib/prompts';

interface Example {
  title: string;
  category: string;
  description: string;
  prompt: string;
  image?: string;
}

const examples: Example[] = [
  {
    title: "Portfolio Website",
    category: "personal",
    description: "Professional portfolio showcasing your work",
    prompt: "Create a modern portfolio website for a web developer with sections for projects, skills, and contact"
  },
  {
    title: "SaaS Landing Page",
    category: "business",
    description: "Convert visitors into customers",
    prompt: "Build a SaaS landing page for a project management tool with hero section, features, pricing, and signup"
  },
  {
    title: "E-commerce Store",
    category: "store",
    description: "Online shop with product showcase",
    prompt: "Design an e-commerce homepage for a fashion brand with featured products, categories, and promotions"
  },
  {
    title: "Restaurant Website",
    category: "business",
    description: "Appetizing restaurant presentation",
    prompt: "Create a restaurant website with menu, reservation system, gallery, and location information"
  },
  {
    title: "Blog Platform",
    category: "content",
    description: "Share your thoughts and ideas",
    prompt: "Build a modern blog homepage with featured posts, categories, newsletter signup, and author bio"
  },
  {
    title: "Event Landing",
    category: "marketing",
    description: "Promote your upcoming event",
    prompt: "Design an event landing page for a tech conference with speakers, schedule, tickets, and venue info"
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<'sambanova' | 'cerebras' | 'gradient'>('cerebras');
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [stylePreference, setStylePreference] = useState<'default' | 'v1' | 'v2'>('default');
  const [randomPromptLoading, setRandomPromptLoading] = useState(false);
  const [redesignUrl, setRedesignUrl] = useState('');
  const [redesignLoading, setRedesignLoading] = useState(false);
  const [redesignOpen, setRedesignOpen] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  // Store previous enhance state to restore when switching from v1 back to default
  const [previousEnhanceState, setPreviousEnhanceState] = useState(true);

  // Auto-disable enhance when v1 experimental or v2 mobile style is selected
  // v1 and v2 have their own comprehensive prompt instructions that conflict with enhancement
  useEffect(() => {
    if (stylePreference === 'v1' || stylePreference === 'v2') {
      // Save current enhance state before disabling
      if (enhanceEnabled) {
        setPreviousEnhanceState(true);
      }
      setEnhanceEnabled(false);
    } else if (stylePreference === 'default') {
      // Restore previous enhance state when switching back to default
      setEnhanceEnabled(previousEnhanceState);
    }
  }, [stylePreference]);

  // Check remaining generations for anonymous users
  useEffect(() => {
    if (!user) {
      checkRemainingGenerations();
    }
  }, [user]);

  // Mouse tracking spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current && heroSectionRef.current) {
        const rect = heroSectionRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        spotlightRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(147, 51, 234, 0.15), transparent 40%)`;
      }
    };

    const section = heroSectionRef.current;
    if (section) {
      section.addEventListener('mousemove', handleMouseMove);
      return () => {
        section.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, []);

  const checkRemainingGenerations = async () => {
    try {
      // Make a dummy request to get rate limit headers
      const response = await fetch('/api/check-rate-limit', {
        method: 'GET'
      });
      
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining !== null) {
        setRemainingGenerations(parseInt(remaining, 10));
      }
    } catch (error) {
      console.error('Failed to check rate limit:', error);
    }
  };

  const randomPrompt = () => {
    setRandomPromptLoading(true);
    setTimeout(() => {
      setPrompt(
        PROMPTS_FOR_AI[Math.floor(Math.random() * PROMPTS_FOR_AI.length)]
      );
      setRandomPromptLoading(false);
    }, 400);
  };

  const checkIfUrlIsValid = (url: string) => {
    const urlPattern = new RegExp(
      /^https?:\/\/([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      'i'
    );
    return urlPattern.test(url);
  };
  
  const normalizeUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleRedesign = async () => {
    if (redesignLoading || isGenerating) return;
    if (!redesignUrl) {
      toast({
        title: "Error",
        description: "Please enter a URL.",
        variant: "destructive",
      });
      return;
    }
    
    const normalizedUrl = normalizeUrl(redesignUrl);
    
    if (!checkIfUrlIsValid(normalizedUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid URL (e.g., https://example.com).",
        variant: "destructive",
      });
      return;
    }
    
    setRedesignLoading(true);
    
    try {
      toast({
        title: "Fetching website",
        description: "Reading the website content...",
      });
      
      const response = await fetch('/api/re-design', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to fetch website content.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && data.markdown) {
        setRedesignOpen(false);
        setRedesignUrl('');
        
        sessionStorage.setItem('redesignData', JSON.stringify({
          markdown: data.markdown,
          url: normalizedUrl
        }));
        
        toast({
          title: "Ready to redesign",
          description: "Press Enter or click Generate in the IDE to redesign your site!",
        });
        
        setLocation(`/ide/new?redesign=true&model=${selectedModel}&style=${stylePreference}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch website content.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch website content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRedesignLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe the website you want to create",
        variant: "destructive"
      });
      return;
    }

    // For anonymous users, redirect to /ide/new with the prompt, model, enhance, and style settings
    // The IDE will handle the actual generation and rate limiting
    const encodedPrompt = encodeURIComponent(prompt);
    setLocation(`/ide/new?prompt=${encodedPrompt}&model=${selectedModel}&enhance=${enhanceEnabled}&style=${stylePreference}`);
  };

  const handleExampleClick = (example: Example) => {
    setPrompt(example.prompt);
    // Scroll to top where generation prompt is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-xl">Jatevo Builder</span>
              </Link>
              
              <div className="hidden md:flex space-x-6">
                <a href="#features" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  Features
                </a>
                <a href="#examples" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  Examples
                </a>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button>Login</Button>
              </Link>
            </div>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-16 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <a href="#features" className="block py-2">Features</a>
              <a href="#examples" className="block py-2">Examples</a>
              <Link href="/auth/login" className="block py-2 font-semibold">
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section ref={heroSectionRef} className="relative container mx-auto px-4 pt-20 pb-32 overflow-hidden">
        {/* Mouse tracking spotlight effect */}
        <div 
          ref={spotlightRef}
          className="absolute inset-0 opacity-50 transition-opacity duration-1000 pointer-events-none"
          style={{ filter: 'blur(100px)' }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <style>{`
            @keyframes badgeEntry {
              0% {
                transform: scale(0.8) translateY(-10px);
                opacity: 0;
              }
              100% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
            }
            
            @keyframes sparkleRotate {
              0% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(180deg) scale(1.1); }
              100% { transform: rotate(360deg) scale(1); }
            }
            
            @keyframes wordSlideUp {
              0% {
                transform: translateY(40px) rotateX(90deg);
                opacity: 0;
              }
              100% {
                transform: translateY(0) rotateX(0);
                opacity: 1;
              }
            }
            
            @keyframes fadeInSlide {
              0% {
                transform: translateY(20px);
                opacity: 0;
              }
              100% {
                transform: translateY(0);
                opacity: 1;
              }
            }
            
            .badge-shimmer::before {
              content: '';
              position: absolute;
              top: 50%;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
              transition: left 0.5s;
            }
            
            .badge-shimmer:hover::before {
              left: 100%;
            }
            
            .heading-word-0 {
              animation: wordSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
            }
            
            .heading-word-1 {
              animation: wordSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
            }
            
            .heading-word-2 {
              animation: wordSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
            }
          `}</style>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge Carousel with micro-interactions */}
            <style>{`
              @keyframes badgeCarousel1 {
                0%, 45% { opacity: 1; transform: translateY(0); }
                50%, 95% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              @keyframes badgeCarousel2 {
                0%, 45% { opacity: 0; transform: translateY(10px); }
                50%, 95% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(10px); }
              }
            `}</style>
            <div 
              className="flex justify-center mb-10 relative h-10 w-full"
              style={{ animation: 'badgeEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
            >
              {/* Gradient Badge - Shows First */}
              <div 
                className="badge-shimmer absolute left-1/2 -translate-x-1/2 overflow-hidden inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md whitespace-nowrap" 
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, animation: 'badgeCarousel1 6s ease-in-out infinite' }}
              >
                <span className="text-gray-600 dark:text-gray-400">Distributed intelligence by</span>
                <span className="text-gray-900 dark:text-gray-100" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}>./ gradient</span>
              </div>
              {/* GLM 4.6 Badge - Shows Second */}
              <div 
                className="badge-shimmer absolute left-1/2 -translate-x-1/2 overflow-hidden inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md whitespace-nowrap" 
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, animation: 'badgeCarousel2 6s ease-in-out infinite' }}
              >
                <span>GLM 4.6 is faster and better than ever!</span>
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl text-gray-900 dark:text-white mb-6" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, lineHeight: '1.05', letterSpacing: '-0.03em' }}>
              <span className="heading-word-0 inline-block">Ship</span>{' '}
              <span className="heading-word-1 inline-block">something</span>{' '}
              <span className="heading-word-2 inline-block">beautiful</span>
            </h1>
            <p 
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, animation: 'fadeInSlide 1s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both', lineHeight: '1.5' }}
            >
              Build in less than 60 seconds. Deploy instantly. Share everywhere.
              {!user && (
                <span className="block mt-2 text-lg">
                  Start with 3 free generations
                </span>
              )}
            </p>

            {!user && remainingGenerations !== null && (
              <div className="mb-8">
                <Badge variant={remainingGenerations > 0 ? "default" : "destructive"} className="px-4 py-2">
                  {remainingGenerations > 0 
                    ? `${remainingGenerations} free generation${remainingGenerations !== 1 ? 's' : ''} remaining`
                    : 'Free generations used - Sign up to continue'
                  }
                </Badge>
              </div>
            )}

            {/* Enhanced Input Container with Animations */}
            <div className="mt-12">
              <style>{`
                @keyframes inputEntry {
                  0% {
                    transform: translateY(20px) scale(0.98);
                    opacity: 0;
                  }
                  100% {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                  }
                }
                
                @keyframes buttonStagger {
                  0% {
                    transform: scale(0) rotate(180deg);
                    opacity: 0;
                  }
                  100% {
                    transform: scale(1) rotate(0);
                    opacity: 1;
                  }
                }
                
                .input-wrapper-hover:hover {
                  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                
                .input-wrapper-focus:focus-within {
                  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }
                
                .control-btn-0 { animation: buttonStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both; }
                .control-btn-1 { animation: buttonStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.25s both; }
                .control-btn-2 { animation: buttonStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.3s both; }
                .control-btn-3 { animation: buttonStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.35s both; }
                .control-btn-4 { animation: buttonStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both; }
              `}</style>
              
              <div className="max-w-3xl mx-auto">
                {!user && remainingGenerations === 0 && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-200">
                        You've used all your free generations. 
                        <Link href="/auth/signup" className="ml-1 font-semibold underline">
                          Sign up to continue
                        </Link>
                      </p>
                    </div>
                  </div>
                )}
                
                <div 
                  className="input-wrapper-hover input-wrapper-focus bg-gray-50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300"
                  style={{ animation: 'inputEntry 1s cubic-bezier(0.16, 1, 0.3, 1) 1s both' }}
                >
                  {/* Prompt Input with Dice Button */}
                  <div className="relative">
                    <Textarea
                      placeholder="Create something beautiful..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && (user || (remainingGenerations !== null && remainingGenerations > 0))) {
                          e.preventDefault();
                          if (!isGenerating) {
                            handleGenerate();
                          }
                        }
                      }}
                      className="w-full min-h-[140px] p-6 pr-16 resize-none border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 text-base focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
                      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                      disabled={isGenerating || (!user && remainingGenerations === 0)}
                    />
                    {/* Dice Button for Random Prompt */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => randomPrompt()}
                      className={`absolute top-4 right-4 h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-md ${randomPromptLoading ? 'animate-spin' : ''}`}
                      title="Get random prompt"
                      disabled={isGenerating || (!user && remainingGenerations === 0)}
                    >
                      <Dices className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Controls Bar with Stagger Animation */}
                  <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Enhance Toggle */}
                      <div 
                        className="control-btn-1 inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:transform hover:-translate-y-0.5 hover:shadow-md"
                        title={stylePreference !== 'default' ? `Enhancement disabled for ${stylePreference} style` : 'Enhance generated code'}
                      >
                        <Zap className={`w-4 h-4 ${enhanceEnabled ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"} ${stylePreference !== 'default' ? "opacity-50" : ""}`} />
                        <span className={`text-gray-700 dark:text-gray-300 ${stylePreference !== 'default' ? "opacity-50" : ""}`}>Enhance</span>
                        <Switch
                          checked={enhanceEnabled}
                          onCheckedChange={setEnhanceEnabled}
                          className="scale-75"
                          disabled={stylePreference !== 'default'}
                        />
                      </div>
                      
                      {/* Model Selector */}
                      <Select 
                        value={selectedModel === 'sambanova' ? 'deepseek-v3-0324' : selectedModel === 'gradient' ? 'gradient-qwen3-coder' : 'cerebras-glm-4.6'} 
                        onValueChange={(value) => setSelectedModel(value === 'deepseek-v3-0324' ? 'sambanova' : value === 'gradient-qwen3-coder' ? 'gradient' : 'cerebras')}
                      >
                        <SelectTrigger 
                          className="h-8 w-auto min-w-[140px] px-3 text-xs bg-transparent border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700">
                          <SelectItem value="deepseek-v3-0324" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            DeepSeek V3
                          </SelectItem>
                          <SelectItem value="cerebras-glm-4.6" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            z.ai-GLM 4.6
                          </SelectItem>
                          <SelectItem value="gradient-qwen3-coder" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            Gradient
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Style Selector */}
                      <Select value={stylePreference} onValueChange={(value) => setStylePreference(value as 'default' | 'v1' | 'v2')}>
                        <SelectTrigger 
                          className="h-8 w-auto min-w-[120px] px-3 text-xs bg-transparent border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <Paintbrush className="w-3.5 h-3.5" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700">
                          <SelectItem value="default" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            Default
                          </SelectItem>
                          <SelectItem value="v1" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            v1 (Experimental)
                          </SelectItem>
                          <SelectItem value="v2" className="text-xs text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100">
                            v2 (Mobile Apps)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Redesign Button with Popover */}
                      <Popover open={redesignOpen} onOpenChange={setRedesignOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 ${redesignOpen ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}
                            disabled={isGenerating || redesignLoading}
                            data-testid="button-redesign-landing"
                          >
                            <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
                            Redesign
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-80 rounded-2xl p-0 bg-white border-gray-200 text-center overflow-hidden"
                        >
                          <header className="bg-gray-50 p-6 border-b border-gray-200">
                            <div className="flex items-center justify-center -space-x-4 mb-3">
                              <div className="w-9 h-9 rounded-full bg-pink-200 shadow-sm flex items-center justify-center text-xl opacity-50">
                                🎨
                              </div>
                              <div className="w-11 h-11 rounded-full bg-amber-200 shadow-lg flex items-center justify-center text-2xl z-10">
                                🥳
                              </div>
                              <div className="w-9 h-9 rounded-full bg-sky-200 shadow-sm flex items-center justify-center text-xl opacity-50">
                                💎
                              </div>
                            </div>
                            <p className="text-xl font-semibold text-gray-900">
                              Redesign your Site!
                            </p>
                            <p className="text-sm text-gray-500 mt-1.5">
                              Try our new Redesign feature to give your site a fresh look.
                            </p>
                          </header>
                          <main className="space-y-4 p-6">
                            <div>
                              <p className="text-sm text-gray-700 mb-2">
                                Enter your website URL to get started:
                              </p>
                              <Input
                                type="text"
                                placeholder="https://example.com"
                                value={redesignUrl}
                                onChange={(e) => setRedesignUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRedesign();
                                  }
                                }}
                                className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400"
                                data-testid="input-redesign-url-landing"
                              />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700 mb-2">
                                Then, let's redesign it!
                              </p>
                              <Button
                                onClick={handleRedesign}
                                disabled={redesignLoading}
                                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                                data-testid="button-start-redesign-landing"
                              >
                                {redesignLoading ? (
                                  <>Fetching your site...</>
                                ) : (
                                  <>
                                    Redesign <Paintbrush className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </main>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim() || (!user && remainingGenerations === 0)}
                      size="sm"
                      className="h-8 px-4 text-xs bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                      variant={isGenerating ? "destructive" : "default"}
                    >
                      {isGenerating ? (
                        <>
                          <X className="w-3.5 h-3.5 mr-1.5" />
                          Stop
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                          Run
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {!user && remainingGenerations !== null && remainingGenerations > 0 && (
                    <p className="text-center text-xs text-gray-500 px-3 pb-2">
                      No signup required • {remainingGenerations} free generation{remainingGenerations !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
                
                {/* What Can You Build Section */}
                <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-center mb-6 text-gray-900 dark:text-white">What Can You Build?</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {examples.map((example, index) => (
                      <Card 
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-200"
                        onClick={() => handleExampleClick(example)}
                      >
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {example.category}
                        </Badge>
                        <h4 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">{example.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {example.description}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose Jatevo Builder?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <Zap className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate complete websites in under 30 seconds with our optimized AI models.
              </p>
            </Card>

            <Card className="p-6">
              <Code className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-File Projects</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get properly structured HTML, CSS, and JavaScript files - ready for deployment.
              </p>
            </Card>

            <Card className="p-6">
              <Globe className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Instant Publishing</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Deploy your website with one click and get a live URL instantly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && remainingGenerations === 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build More?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Log in to unlock unlimited generations and deploy your websites instantly.
            </p>
            <div className="flex justify-center">
              <Link href="/auth/login">
                <Button size="lg" variant="secondary" className="px-8">
                  Login to Continue
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}