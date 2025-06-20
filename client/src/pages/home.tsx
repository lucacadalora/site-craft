import { Button } from "@/components/ui/button";
import { ArrowRight, Cpu, Code, Sparkles, Zap, LayoutGrid, Rocket } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">Landing<span className="text-blue-600">Craft</span> <span className="text-sm text-gray-500">by Jatevo</span></span>
          </div>
          {!isMobile && (
            <nav className="flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 text-sm font-medium">How It Works</a>
              <a href="#features" className="text-gray-600 hover:text-blue-600 text-sm font-medium">Features</a>
              <a href="#templates" className="text-gray-600 hover:text-blue-600 text-sm font-medium">Templates</a>
              <a href="#case-studies" className="text-gray-600 hover:text-blue-600 text-sm font-medium">Case Studies</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 text-sm font-medium">Pricing</a>
            </nav>
          )}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button 
                variant="outline" 
                className="border-gray-300 text-gray-700 rounded-md"
              >
                Login
              </Button>
            </Link>
            <Link href="/editor">
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Create Now <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            {isMobile && (
              <button className="p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Generate Landing Pages with 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"> AI</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Create stunning, conversion-optimized landing pages in minutes. Powered by Jatevo's high-performance AI inference. No design skills needed.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/editor">
                  <Button 
                    className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-lg"
                  >
                    Create Your Page <Zap className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="px-8 py-6 border-gray-300 text-gray-700 rounded-md text-lg">
                  View Examples
                </Button>
              </div>
              <div className="mt-8 flex items-center space-x-4">
                <div className="flex -space-x-2">
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/64.jpg" alt="User" />
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/68.jpg" alt="User" />
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">1,000+</span> businesses powered by Jatevo's AI infrastructure
                </p>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 bg-gray-100 border-b flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="ml-2 text-xs text-gray-500">Landing Page Generator</div>
                  </div>
                  <img
                    src="https://placehold.co/600x400/e6f2ff/2563eb?text=AI+Generated+Landing+Page"
                    alt="Landing Page Preview"
                    className="w-full object-cover"
                  />
                </div>
                {/* Floating elements */}
                <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="absolute -top-6 -right-6 bg-indigo-600 text-white p-4 rounded-lg shadow-lg">
                  <Code className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Generate beautiful, conversion-optimized landing pages in 3 simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Describe Your Business</h3>
              <p className="text-gray-600">
                Enter what your business does, who your target audience is, and what makes you special.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Generates Your Page</h3>
              <p className="text-gray-600">
                Our AI analyzes your input and generates a complete landing page with tailored content and design.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Customize & Publish</h3>
              <p className="text-gray-600">
                Make any tweaks needed, and instantly publish your landing page or export the code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to create high-converting landing pages
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Zap className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Generated Content</h3>
              <p className="text-gray-600">
                Generate compelling copy that speaks to your audience and highlights your value proposition.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <LayoutGrid className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Responsive Design</h3>
              <p className="text-gray-600">
                Every landing page looks perfect on all devices, from mobile phones to desktop computers.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Rocket className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">SEO Optimized</h3>
              <p className="text-gray-600">
                Built-in SEO best practices ensure your page ranks well in search engines.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <svg className="w-12 h-12 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Customizable Templates</h3>
              <p className="text-gray-600">
                Fine-tune colors, fonts, and layouts to match your brand identity perfectly.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <svg className="w-12 h-12 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Conversion Focused</h3>
              <p className="text-gray-600">
                Strategic call-to-action placement and persuasive elements to boost conversion rates.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <svg className="w-12 h-12 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Generate complete landing pages in minutes, not hours or days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Jatevo Integration Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powered by <span className="text-blue-600">Jatevo</span> Infrastructure
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              LandingCraft is built on Jatevo's high-performance AI inference platform, delivering lightning-fast generation with enterprise-grade reliability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ultra-Fast Inference</h3>
              <p className="text-gray-600">
                Sub-second response times powered by Jatevo's optimized GPU clusters and advanced model acceleration.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise Grade</h3>
              <p className="text-gray-600">
                Built on Jatevo's enterprise infrastructure with 99.9% uptime and scalable performance.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Playground Integration</h3>
              <p className="text-gray-600">
                Part of the Jatevo ecosystem - access more AI tools and capabilities at jatevo.id/playground.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center space-x-4 bg-white rounded-lg p-6 shadow-sm">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Visit Jatevo Playground:</span>
              </div>
              <a 
                href="https://jatevo.id/playground" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                jatevo.id/playground <ArrowRight className="ml-1 w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section id="case-studies" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how businesses are accelerating their digital presence with AI-generated landing pages
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
              <img src="https://placehold.co/600x400/e6f2ff/2563eb?text=Case+Study+1" alt="Case Study" className="w-full h-48 object-cover" />
              <div className="p-6">
                <span className="text-blue-600 text-sm font-semibold uppercase">E-commerce</span>
                <h3 className="text-xl font-semibold text-gray-900 my-2">BrandX Increased Conversions by 135%</h3>
                <p className="text-gray-600 mb-4">
                  How a small business transformed their online presence and doubled their conversion rate using our AI landing page generator.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center">
                  Read Case Study <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
              <img src="https://placehold.co/600x400/e6f2ff/2563eb?text=Case+Study+2" alt="Case Study" className="w-full h-48 object-cover" />
              <div className="p-6">
                <span className="text-blue-600 text-sm font-semibold uppercase">SaaS</span>
                <h3 className="text-xl font-semibold text-gray-900 my-2">TechStartup Reduced CAC by 42%</h3>
                <p className="text-gray-600 mb-4">
                  How a tech startup used AI-generated landing pages to significantly lower their customer acquisition costs.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center">
                  Read Case Study <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
              <img src="https://placehold.co/600x400/e6f2ff/2563eb?text=Case+Study+3" alt="Case Study" className="w-full h-48 object-cover" />
              <div className="p-6">
                <span className="text-blue-600 text-sm font-semibold uppercase">Local Business</span>
                <h3 className="text-xl font-semibold text-gray-900 my-2">ServicePro Booked 27 New Clients</h3>
                <p className="text-gray-600 mb-4">
                  How a service business generated qualified leads and bookings through their AI-optimized landing page.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center">
                  Read Case Study <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that works best for your business needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">3 Landing Pages</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Basic Templates</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Jatevo AI Generation</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Community Support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full py-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                Get Started Free
              </Button>
            </div>
            
            <div className="bg-blue-600 rounded-lg shadow-lg p-8 border border-blue-600 transform scale-105">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Pro</h3>
                <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">POPULAR</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$15</span>
                <span className="text-blue-200">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">20 Landing Pages</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">Premium Templates</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">Advanced Jatevo AI</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">Priority Support</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">Custom Domain</span>
                </li>
              </ul>
              <Button className="w-full py-2 bg-white text-blue-600 hover:bg-blue-50">
                Upgrade to Pro
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$99</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Unlimited Landing Pages</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">All Templates + Custom</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Premium Jatevo AI</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Dedicated Support</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Jatevo API Access</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full py-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Build with Jatevo's AI Power?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using LandingCraft to create landing pages powered by Jatevo's high-performance inference.
          </p>
          <Link href="/editor">
            <Button className="px-8 py-3 bg-white text-blue-600 hover:bg-blue-50 text-lg font-semibold rounded-md">
              Get Started for Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Cpu className="h-6 w-6 text-blue-400" />
                <span className="font-bold text-lg">Landing<span className="text-blue-400">Craft</span> <span className="text-sm text-gray-500">by Jatevo</span></span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered landing page generation built on Jatevo's high-performance inference infrastructure.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Templates</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#case-studies" className="text-gray-400 hover:text-white">Case Studies</a></li>
                <li><a href="https://jatevo.id" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Jatevo Platform</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Jatevo Ecosystem</h3>
              <ul className="space-y-2">
                <li><a href="https://jatevo.id" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Jatevo Platform</a></li>
                <li><a href="https://jatevo.id/playground" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">AI Playground</a></li>
                <li><a href="https://jatevo.id/app" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Chat Interface</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">API Documentation</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">&copy; {new Date().getFullYear()} LandingCraft by Jatevo. Powered by high-performance AI inference.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}