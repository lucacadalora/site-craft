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
import { Sparkles, Zap, Globe, Code, Rocket, ArrowRight, Menu, X, Check, AlertCircle } from 'lucide-react';
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe the website you want to create",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const sessionId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create session
      const endpoint = selectedModel === 'cerebras' ? '/api/cerebras/stream' : '/api/sambanova/stream';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prompt,
          existingFiles: '',
          previousPrompts: ''
        })
      });

      // Check response status first
      if (response.status === 429) {
        const errorData = await response.json();
        toast({
          title: "Generation limit reached",
          description: errorData.message || "You've used all 3 free generations. Please sign up to continue.",
          variant: "destructive",
          action: (
            <Button size="sm" onClick={() => setLocation('/auth/signup')}>
              Sign Up
            </Button>
          )
        });
        setIsGenerating(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.sessionId) {
        // Redirect to IDE with the session
        setLocation(`/ide?sessionId=${data.sessionId}&model=${selectedModel}`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      
      if (error.message?.includes('429')) {
        toast({
          title: "Generation limit reached",
          description: user 
            ? "You've reached your generation limit. Please try again later."
            : "You've used all 3 free generations. Please sign up to continue.",
          variant: "destructive",
          action: !user ? (
            <Button size="sm" onClick={() => setLocation('/auth/signup')}>
              Sign Up
            </Button>
          ) : undefined
        });
      } else {
        toast({
          title: "Generation failed",
          description: error.message || "Failed to start generation",
          variant: "destructive"
        });
      }
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: Example) => {
    setPrompt(example.prompt);
    // Scroll to generation section
    document.getElementById('generate')?.scrollIntoView({ behavior: 'smooth' });
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
                <a href="#generate" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  Generate
                </a>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Link href="/projects">
                    <Button variant="ghost">My Projects</Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline">{user.email}</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost">Login</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Sign Up</Button>
                  </Link>
                </>
              )}
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
              <a href="#generate" className="block py-2">Generate</a>
              {user ? (
                <>
                  <Link href="/projects" className="block py-2">
                    My Projects
                  </Link>
                  <Link href="/profile" className="block py-2">
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="block py-2">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="block py-2">
                    Sign Up
                  </Link>
                </>
              )}
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
            <Badge className="mb-4 px-4 py-1" variant="secondary">
              Powered by DeepSeek V3 & GLM-4.6
            </Badge>
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

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="group"
                onClick={() => document.getElementById('generate')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Examples
              </Button>
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

      {/* Generation Section */}
      <section id="generate" className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-center mb-8">
              Generate Your Website
            </h2>

            {!user && remainingGenerations === 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      You've used all your free generations. Sign up to continue building amazing websites!
                    </p>
                    <Link href="/auth/signup">
                      <Button size="sm" variant="destructive" className="mt-2">
                        Sign Up Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <Label htmlFor="model">AI Model</Label>
                <Tabs value={selectedModel} onValueChange={(v) => setSelectedModel(v as 'sambanova' | 'cerebras')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sambanova">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4" />
                        <span>DeepSeek V3 (Streaming)</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="cerebras">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>GLM-4.6 (Fast)</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <Label htmlFor="prompt">Describe Your Website</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Create a modern portfolio website for a photographer with gallery, about section, and contact form..."
                  className="min-h-[120px]"
                  disabled={isGenerating || (!user && remainingGenerations === 0)}
                />
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || (!user && remainingGenerations === 0)}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Generate Website
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  No signup required for your first 3 generations.
                  <Link href="/auth/signup" className="ml-1 text-purple-600 hover:underline">
                    Sign up
                  </Link>
                  {' '}for unlimited access.
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build More?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Sign up for unlimited generations and deploy your websites instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}