import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaGoogle } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { LandingcraftLogo } from '@/components/logo';
import { CodeIcon, Code2, ArrowLeft, Wand2 } from 'lucide-react';

// Sample code for display
const sampleCode = `// AI-generated landing page
import React from 'react';
import { motion } from 'framer-motion';
import { Hero } from './components/Hero';
import { Features } from './components/Features';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Hero 
        title="Build Your SaaS in Minutes" 
        subtitle="No-code solution for entrepreneurs"
        ctaText="Get Started Free"
      />
      <Features items={[
        {
          title: "AI Templates",
          description: "Start with pre-built templates"
        },
        {
          title: "Visual Editor",
          description: "Drag and drop interface"
        },
        {
          title: "Code Export",
          description: "Get clean React code"
        }
      ]} />
    </div>
  );
}`;

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleProviderLogin = (provider: string) => {
    // In a real implementation, we would specify the provider to use
    // But for now, we just redirect to the Replit login flow
    window.location.href = '/api/login';
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/2 flex flex-col p-8 bg-white">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
          </a>
        </div>
        
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="flex items-center mb-8">
            <LandingcraftLogo className="h-10 w-10 text-blue-600 p-2" />
            <h1 className="text-2xl font-bold ml-2">landingcraft<span className="text-blue-600">.id</span></h1>
          </div>
          
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Login</h2>
            <p className="text-gray-500 text-sm">Designed by Luca Lora</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your.email@example.com" 
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••••"
              />
            </div>
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleLogin}
            >
              Sign in
            </Button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2"
              onClick={() => handleProviderLogin('google')}
            >
              <FaGoogle className="h-4 w-4 text-[#4285F4]" />
              <span>Google</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2"
              onClick={() => handleProviderLogin('twitter')}
            >
              <FaXTwitter className="h-4 w-4" />
              <span>X</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Right side - Product features */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-100 to-blue-50 flex-col p-10">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Transform Your Code <br/> with AI Magic</h2>
            <p className="mt-4 text-gray-600">
              landingcraft.id provides powerful AI-driven code generation tools to 
              convert your ideas into professional-quality landing pages. Create stunning 
              websites with just a few clicks.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="flex items-center p-2 bg-gray-100 border-b border-gray-200">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 text-center text-xs text-gray-600">LandingPage.tsx</div>
            </div>
            <pre className="p-4 text-xs text-gray-800 font-mono overflow-auto max-h-64">
              <code className="language-jsx">{sampleCode}</code>
            </pre>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
                <Wand2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Style Transfer</h3>
                <p className="text-gray-600 text-sm">Transform your code into Pixar, anime, or oil painting styles with a single click</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
                <CodeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Smart Editing</h3>
                <p className="text-gray-600 text-sm">Describe what you want changed and our AI will edit your code exactly as instructed</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
                <Code2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Advanced Control</h3>
                <p className="text-gray-600 text-sm">Customize quality, size, and format to get the perfect output for any use case</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}