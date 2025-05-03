import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { LandingcraftLogo } from '../components/logo';
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
  const [formData, setFormData] = useState({
    loginEmail: "",
    loginPassword: "",
    registerUsername: "",
    registerEmail: "",
    registerPassword: "",
    registerConfirmPassword: ""
  });
  const [error, setError] = useState("");

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // Map input IDs to their corresponding state properties
    const fieldMap: Record<string, string> = {
      'login-email': 'loginEmail',
      'login-password': 'loginPassword',
      'register-username': 'registerUsername',
      'register-email': 'registerEmail',
      'register-password': 'registerPassword',
      'register-confirm-password': 'registerConfirmPassword'
    };
    
    const field = fieldMap[id] || id;
    console.log(`Updating field ${id} -> ${field} with value ${value}`);
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle email/password login (traditional authentication)
  const handleLogin = async () => {
    // Validate form
    if (!formData.loginEmail || !formData.loginPassword) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setError(""); // Clear previous errors
      
      // Use traditional email/password login with direct POST request
      console.log("Attempting traditional login with email/password");
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.loginEmail,
          password: formData.loginPassword,
        }),
        credentials: 'include',
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || `Error ${response.status}: Invalid credentials`;
        throw new Error(errorMsg);
      }
      
      // Login successful - get user data
      const userData = await response.json();
      console.log("Login successful!", userData);
      
      // Store JWT token if provided
      if (userData.token) {
        localStorage.setItem('auth_token', userData.token);
      }
      
      // Redirect to editor page (protected area) instead of home
      window.location.href = '/editor';
    } catch (err) {
      console.error("Error during login:", err);
      setError(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Handle traditional registration with email/password
  const handleRegister = async () => {
    // Validate form
    if (!formData.registerUsername || !formData.registerEmail || !formData.registerPassword) {
      setError("Please fill in all required fields");
      return;
    }
    
    if (formData.registerPassword !== formData.registerConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError(""); // Clear previous errors
      
      // Use traditional registration with direct POST request
      console.log("Attempting registration with email/password");
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.registerUsername, // Use displayName as shown in the API
          email: formData.registerEmail,
          password: formData.registerPassword,
        }),
        credentials: 'include',
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || `Error ${response.status}: Registration failed`;
        throw new Error(errorMsg);
      }
      
      // If registration successful, get user data
      const userData = await response.json();
      console.log("Registration successful!", userData);
      
      // Store JWT token if provided
      if (userData.token) {
        localStorage.setItem('auth_token', userData.token);
      }
      
      // Redirect to editor page (protected area) instead of home
      window.location.href = '/editor';
    } catch (err) {
      console.error("Error during registration:", err);
      setError(`Registration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleProviderLogin = (provider: string) => {
    try {
      // Clear any existing errors
      setError("");
      
      // Log the attempt with provider information
      console.log(`Attempting to login with provider: ${provider}`);
      
      // For OAuth providers, we'll use a popup window for a better UX
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Create popup window features
      const features = `width=${width},height=${height},left=${left},top=${top},status=yes,toolbar=no,menubar=no,location=no`;
      
      // For social login, use the Replit Auth endpoint directly 
      const popup = window.open(`/api/login?provider=${provider}`, 'LoginPopup', features);
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked or closed
        setError("Please enable popups for this site and try again");
        return;
      }

      // Check periodically if the popup is still open
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          
          // When popup closes, check if authentication was successful and redirect to editor
          setTimeout(() => {
            // Try to fetch current user to verify login success
            fetch('/api/auth/user', { credentials: 'include' })
              .then(res => {
                if (res.ok) {
                  // Successfully authenticated, redirect to editor
                  window.location.href = '/editor';
                } else {
                  // Auth failed, just reload the current page
                  window.location.reload();
                }
              })
              .catch(err => {
                console.error('Error checking auth status:', err);
                window.location.reload();
              });
          }, 500);
        }
      }, 500);
            
      // Show a message about popup
      setError("Authentication in progress... Please complete the login in the popup window");
    } catch (err) {
      console.error("Error during provider login:", err);
      setError(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
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
            <h2 className="text-2xl font-semibold">Welcome</h2>
            <p className="text-gray-500 text-sm flex items-center">
              Developed by Luca Cada Lora 
              <a 
                href="https://github.com/lucacadalora" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center"
              >
                <FaGithub className="h-4 w-4" />
              </a>
            </p>
          </div>
          
          <Tabs defaultValue="login" className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm mb-4">
                {error}
              </div>
            )}
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="login-email">Email</Label>
                <Input 
                  id="login-email" 
                  type="email" 
                  placeholder="your.email@example.com"
                  value={formData.loginEmail}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="login-password">Password</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="••••••••••"
                  value={formData.loginPassword}
                  onChange={handleInputChange}
                />
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleLogin}
              >
                Sign in
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="register-username">Username</Label>
                <Input 
                  id="register-username" 
                  type="text" 
                  placeholder="your_username"
                  value={formData.registerUsername}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="register-email">Email</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="your.email@example.com"
                  value={formData.registerEmail}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="register-password">Password</Label>
                <Input 
                  id="register-password" 
                  type="password" 
                  placeholder="••••••••••"
                  value={formData.registerPassword}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="register-confirm-password">Confirm Password</Label>
                <Input 
                  id="register-confirm-password" 
                  type="password" 
                  placeholder="••••••••••"
                  value={formData.registerConfirmPassword}
                  onChange={handleInputChange}
                />
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleRegister}
              >
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
          
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
            <h2 className="text-3xl font-bold text-gray-900">Imagine and Share <br/> in 1-Click</h2>
            <p className="mt-4 text-gray-600">
              landingcraft.id creates professional websites instantly with 
              DeepSeek V3. Generate beautiful landing pages from a simple prompt
              without any coding required.
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
                <h3 className="font-semibold text-gray-900">AI-Powered Generation</h3>
                <p className="text-gray-600 text-sm">Create complete landing pages with advanced DeepSeek V3 AI in seconds from a text prompt</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
                <CodeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Professional Styling</h3>
                <p className="text-gray-600 text-sm">Generate beautifully styled pages with modern layouts and responsive designs automatically</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
                <Code2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">One-Click Deployment</h3>
                <p className="text-gray-600 text-sm">Instantly deploy your landing page to a public URL to share with clients and customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}