import { useState } from 'react';
import { useLocation } from 'wouter';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    // Redirect to home page after successful login/registration
    setLocation('/');
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            LandingCraft
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin
              ? 'Sign in to your account'
              : 'Create a new account'}
          </p>
        </div>

        {isLogin ? (
          <LoginForm
            onSuccess={handleSuccess}
            onRegisterClick={toggleForm}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onLoginClick={toggleForm}
          />
        )}
      </div>
    </div>
  );
}