import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, Zap, Globe, Code, Rocket, ArrowRight, Menu, X, Check, AlertCircle, Send,
  AtSign, Paperclip, Edit3, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { queryClient } from '@/lib/queryClient';

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
  const [selectedModel, setSelectedModel] = useState<'sambanova' | 'cerebras'>('sambanova');

  // Check remaining generations for anonymous users
  useEffect(() => {
    if (!user) {
      checkRemainingGenerations();
    }
  }, [user]);

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

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe the website you want to create",
        variant: "destructive"
      });
      return;
    }

    // For anonymous users, redirect to /ide/new with the prompt and model
    // The IDE will handle the actual generation and rate limiting
    const encodedPrompt = encodeURIComponent(prompt);
    setLocation(`/ide/new?prompt=${encodedPrompt}&model=${selectedModel}`);
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
                <Sparkles className="h-6 w-6 text-purple-600" />
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
      <section className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Build Websites with AI
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Generate professional, multi-file websites in seconds. No coding required.
              {!user && (
                <span className="block mt-2 text-lg">
                  Try 3 free generations - no signup needed!
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

            {/* DeepSite-style Generation Prompt */}
            <div className="mt-8">
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
                
                <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                  {/* Prompt Input */}
                  <Textarea
                    placeholder="Ask Jatevo Web Builder for edits"
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
                    className="min-h-[100px] resize-none border-0 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm px-4 pt-4 pb-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isGenerating || (!user && remainingGenerations === 0)}
                  />
                  
                  {/* Menu Bar */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-800/50">
                    <div className="flex items-center gap-2">
                      {/* Add Context Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      >
                        <AtSign className="w-3.5 h-3.5 mr-1.5" />
                        Add Context
                      </Button>
                      
                      {/* Model Selector */}
                      <Select value={selectedModel === 'sambanova' ? 'deepseek-v3-0324' : 'cerebras-glm-4.6'} onValueChange={(value) => setSelectedModel(value === 'deepseek-v3-0324' ? 'sambanova' : 'cerebras')}>
                        <SelectTrigger 
                          className="h-8 w-auto min-w-[120px] px-3 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-gray-700">
                          <SelectItem value="deepseek-v3-0324" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            DeepSeek V3
                          </SelectItem>
                          <SelectItem value="cerebras-glm-4.6" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            z.ai-GLM 4.6
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Attach Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      >
                        <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                        Attach
                      </Button>
                      
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                      
                      {/* Enhance Toggle */}
                      <div className="flex items-center gap-2 h-8 px-3 text-xs text-gray-400 border-l border-gray-800/50 ml-1 pl-3">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Enhance</span>
                        <Switch
                          className="scale-75"
                        />
                      </div>
                    </div>
                    
                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim() || (!user && remainingGenerations === 0)}
                      size="sm"
                      className="h-8 px-4 text-xs"
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
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-center mb-4 text-gray-300">What Can You Build?</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {examples.map((example, index) => (
                      <Card 
                        key={index}
                        className="p-4 bg-gray-900 border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => handleExampleClick(example)}
                      >
                        <Badge variant="outline" className="mb-2 text-xs">
                          {example.category}
                        </Badge>
                        <h4 className="text-sm font-medium mb-1">{example.title}</h4>
                        <p className="text-xs text-gray-500">
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