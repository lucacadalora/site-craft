import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Zap, Globe, Code, Rocket, ArrowRight, Menu, X, Check, AlertCircle, Send } from 'lucide-react';
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
                
                <div className="relative bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !isGenerating && prompt.trim() && (user || (remainingGenerations !== null && remainingGenerations > 0))) {
                            handleGenerate();
                          }
                        }}
                        placeholder="Ask Jatevo to build anything..."
                        className="w-full px-4 py-3 bg-gray-800 text-white placeholder-gray-400 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        disabled={isGenerating || (!user && remainingGenerations === 0)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Model Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedModel(selectedModel === 'sambanova' ? 'cerebras' : 'sambanova')}
                        className="bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200"
                      >
                        {selectedModel === 'sambanova' ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">DeepSeek-V3</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">GLM-4.6</span>
                          </>
                        )}
                      </Button>
                      
                      {/* Enhancement Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200"
                        title="Advanced Settings"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Enhance</span>
                      </Button>
                      
                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim() || (!user && remainingGenerations === 0)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
                      >
                        {isGenerating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {!user && remainingGenerations !== null && remainingGenerations > 0 && (
                    <p className="text-center text-xs text-gray-500 mt-4">
                      No signup required • {remainingGenerations} free generation{remainingGenerations !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
                
                {/* Quick Templates */}
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-3">Quick Templates:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {examples.slice(0, 6).map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(example.prompt)}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300 justify-start px-3 py-2 h-auto"
                      >
                        <div className="text-left">
                          <p className="font-medium text-xs">{example.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{example.category}</p>
                        </div>
                      </Button>
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

      {/* Examples Section */}
      <section id="examples" className="container mx-auto px-4 py-20 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What Can You Build?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examples.map((example, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleExampleClick(example)}
                >
                  <Badge variant="outline" className="mb-2">
                    {example.category}
                  </Badge>
                  <h3 className="text-lg font-semibold mb-2">{example.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {example.description}
                  </p>
                  <Button variant="ghost" size="sm" className="w-full">
                    Use This Template
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Card>
              </motion.div>
            ))}
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