import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Zap, Layers, Code, BarChart4, Clock } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-xl font-heading font-bold text-gray-900">LandingCraft</h1>
          </div>
          
          <Button
            onClick={() => navigate("/editor")}
            className="bg-primary hover:bg-blue-600 text-white"
          >
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 font-heading">
                Turn Text into Beautiful Landing Pages
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Generate professional landing pages instantly with AI. Choose from templates for education, portfolios, finance, marketplaces, and more.
              </p>
              <Button 
                onClick={() => navigate("/editor")}
                size="lg"
                className="bg-primary hover:bg-blue-600 text-white px-8 py-6 text-lg"
              >
                Create Your Landing Page
              </Button>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                alt="LandingCraft Interface" 
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-12 text-center font-heading">Key Features</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">Text-to-Page Conversion</h3>
                  <p className="text-gray-600">Describe your landing page and our AI will generate it for you in seconds.</p>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-purple-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">Niche Templates</h3>
                  <p className="text-gray-600">Choose from templates specialized for education, portfolios, finance, marketplaces, and more.</p>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <Code className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">Code Export</h3>
                  <p className="text-gray-600">Export clean HTML and CSS code ready to use on any website or platform.</p>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-yellow-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <BarChart4 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">Token Optimization</h3>
                  <p className="text-gray-600">Our smart prompting strategy minimizes token usage, saving you money.</p>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-red-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">One-Click Publishing</h3>
                  <p className="text-gray-600">Publish your landing page with one click and share it with the world.</p>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="mb-4 bg-indigo-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-heading">Simple Customization</h3>
                  <p className="text-gray-600">Customize colors, fonts, and layouts with an intuitive interface.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold mb-6 font-heading">Start Creating Your Landing Page Today</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              No design skills needed. Just describe your vision and let LandingCraft do the rest.
            </p>
            <Button 
              onClick={() => navigate("/editor")}
              size="lg"
              className="bg-primary hover:bg-blue-600 text-white px-8 py-6 text-lg"
            >
              Get Started for Free
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
