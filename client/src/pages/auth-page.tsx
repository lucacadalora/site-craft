import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FaGoogle } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { LandingcraftLogo } from '@/components/logo';
import { CodeIcon, Code2, TerminalIcon } from 'lucide-react';

// Sample code for display
const sampleCode = `// Generates a landing page with AI
import { useState } from 'react';
import { Button } from './components/ui/button';
import { AIPageBuilder } from './utils/ai';

export default function LandingBuilder() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const page = await AIPageBuilder.generate(prompt);
      // Handle successful generation
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container">
      <h1>Create Your Landing Page</h1>
      <textarea 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your landing page..."
      />
      <Button 
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Build My Page'}
      </Button>
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
      {/* Left side - App info */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 flex-col items-center justify-center p-8">
        <div className="max-w-md">
          <div className="flex items-center justify-center mb-8">
            <LandingcraftLogo className="h-16 w-16 text-blue-400 p-2 mb-2" />
            <div className="ml-4">
              <h1 className="text-3xl font-bold text-white">landingcraft<span className="text-blue-400">.id</span></h1>
              <p className="text-gray-400">AI-powered code editor for modern landing pages</p>
            </div>
          </div>
          
          <div className="bg-slate-950 border border-slate-700 rounded-lg shadow-lg mb-6 overflow-hidden">
            <div className="flex items-center p-2 bg-slate-800 border-b border-slate-700">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 text-center text-xs text-slate-400">landingpage.tsx</div>
            </div>
            <pre className="p-4 text-xs text-blue-100 font-mono overflow-auto max-h-80">
              <code>{sampleCode}</code>
            </pre>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TerminalIcon className="mr-2 h-5 w-5 text-blue-400" />
              This app requires access to:
            </h2>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span> 
                <span>Verify your identity</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span> 
                <span>Access your email address</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span> 
                <span>Access your basic profile information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span> 
                <span>Stay signed in to this application</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Login options */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Log in powered by <span className="font-bold text-[#F26207]">replit</span></h2>
          </div>

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center justify-center gap-2 text-base"
              onClick={() => handleProviderLogin('google')}
            >
              <FaGoogle className="h-5 w-5 text-[#4285F4]" />
              <span>Continue with Google</span>
            </Button>

            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center justify-center gap-2 text-base"
              onClick={() => handleProviderLogin('twitter')}
            >
              <FaXTwitter className="h-5 w-5" />
              <span>Continue with X</span>
            </Button>

            <Button 
              variant="outline"
              className="w-full py-6 flex items-center justify-center gap-2 text-base"
              onClick={handleLogin}
            >
              <span>Continue with email</span>
              <span className="ml-1">→</span>
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 mt-8">
            <p>
              By continuing, you agree to Replit's <a href="https://replit.com/site/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://replit.com/site/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </p>
            <p className="mt-2">
              This site is protected by reCAPTCHA Enterprise and the Google <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}