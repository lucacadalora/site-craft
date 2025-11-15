import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Link } from "wouter";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<string>("login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-100 py-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-blue-600">
            LandingCraft
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === "login" ? "Sign in to your account" : "Create an account"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {activeTab === "login"
                ? "Enter your credentials below to access your account"
                : "Fill out the form below to create your account"}
            </p>
          </div>

          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}