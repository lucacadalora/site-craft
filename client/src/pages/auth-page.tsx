import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FaGoogle, FaGithub, FaFacebook, FaApple } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { LandingcraftLogo } from '@/components/logo';

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
      <div className="hidden md:flex md:w-1/2 bg-gray-100 flex-col items-center justify-center p-8">
        <div className="max-w-md">
          <LandingcraftLogo className="h-24 w-24 text-primary p-2 bg-white rounded-lg shadow-sm mb-6" />
          <h1 className="text-3xl font-bold mb-2">LandingCraft</h1>
          <p className="text-gray-600 mb-4">https://landingcraft.app</p>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">This app is requesting the following permissions:</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span> 
                <span>Verify your identity</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span> 
                <span>Access your email address</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span> 
                <span>Access your basic profile information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span> 
                <span>Stay signed in to this application</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Login options */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8">
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
              onClick={() => handleProviderLogin('github')}
            >
              <FaGithub className="h-5 w-5" />
              <span>Continue with GitHub</span>
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
              onClick={() => handleProviderLogin('facebook')}
            >
              <FaFacebook className="h-5 w-5 text-[#1877F2]" />
              <span>Continue with Facebook</span>
            </Button>

            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center justify-center gap-2 text-base"
              onClick={() => handleProviderLogin('apple')}
            >
              <FaApple className="h-5 w-5" />
              <span>Continue with Apple</span>
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