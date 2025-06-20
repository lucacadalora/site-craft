import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Cpu, 
  Code, 
  Sparkles, 
  Zap, 
  LayoutGrid, 
  Rocket, 
  Check, 
  SquarePen,
  GanttChart,
  Smartphone,
  Globe,
  Image,
  PencilRuler
} from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function HomeRevamped() {
  const isMobile = useIsMobile();

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-blue-600" />,
      title: "Jatevo AI-Powered Creation",
      description: "Generate complete landing pages in minutes using Jatevo's high-performance AI inference engine."
    },
    {
      icon: <SquarePen className="w-5 h-5 text-blue-600" />,
      title: "Figma-like Editor",
      description: "Easily customize your page with our intuitive drag-and-drop visual editor."
    },
    {
      icon: <GanttChart className="w-5 h-5 text-blue-600" />,
      title: "UMKM Templates",
      description: "Specially designed templates tailored for Indonesian small and medium enterprises."
    },
    {
      icon: <Smartphone className="w-5 h-5 text-blue-600" />,
      title: "Mobile Responsive",
      description: "All pages are fully responsive and look great on any device."
    },
    {
      icon: <Globe className="w-5 h-5 text-blue-600" />,
      title: "One-Click Publishing",
      description: "Instantly publish your page with our built-in hosting infrastructure."
    },
    {
      icon: <Code className="w-5 h-5 text-blue-600" />,
      title: "Export Options",
      description: "Download clean HTML/CSS to host your page anywhere you want."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="fixed w-full top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl md:text-2xl font-bold text-gray-900">
              Landing<span className="text-blue-600">Craft</span> <span className="text-sm text-gray-500">by Jatevo</span>
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="hidden md:inline-flex">
                  Login
                </Button>
              </Link>
              <Link href="/editor">
                <Button>
                  Start Building
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Spacer for fixed header */}
      <div className="h-16"></div>
      
      {/* Hero Section */}
      <section className="py-16 md:py-28 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-12 md:mb-0">
              <div className="inline-block bg-blue-100 text-blue-700 rounded-full px-4 py-1 text-sm font-medium mb-6">
                SME Digitalization Powered by Jatevo
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Create Amazing Landing Pages with 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"> AI</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Join thousands of businesses using our Figma-style AI editor powered by Jatevo's high-performance inference to create professional landing pages in minutes.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/editor">
                  <Button 
                    className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-lg shadow-lg shadow-blue-600/20"
                  >
                    Try for Free <Zap className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="px-8 py-6 border-gray-300 text-gray-700 rounded-md text-lg">
                  Watch Demo
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Jatevo AI Powered', 'Figma-Style Editor', 'One-Click Deploy', 'Mobile Responsive'].map((tag) => (
                  <span key={tag} className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 bg-gray-100 border-b flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="ml-2 text-xs text-gray-500">Editor</div>
                  </div>
                  {/* Editor UI mockup */}
                  <div className="flex bg-gray-900 h-80">
                    <div className="w-1/3 p-3 border-r border-gray-700">
                      <div className="bg-gray-800 rounded p-3 h-full">
                        <div className="bg-blue-500 h-4 w-20 rounded mb-3"></div>
                        <div className="bg-gray-700 h-3 w-full rounded mb-2"></div>
                        <div className="bg-gray-700 h-3 w-4/5 rounded mb-2"></div>
                        <div className="bg-gray-700 h-3 w-5/6 rounded mb-4"></div>
                        <div className="bg-gray-700 h-6 w-1/2 rounded"></div>
                      </div>
                    </div>
                    <div className="w-2/3 p-3">
                      <div className="bg-white rounded h-full flex flex-col overflow-hidden">
                        <div className="bg-blue-600 h-16 w-full p-4 flex items-center">
                          <div className="bg-white/20 h-3 w-24 rounded"></div>
                          <div className="ml-auto flex space-x-3">
                            <div className="bg-white/20 h-3 w-12 rounded"></div>
                            <div className="bg-white/20 h-3 w-12 rounded"></div>
                            <div className="bg-white/20 h-3 w-12 rounded"></div>
                          </div>
                        </div>
                        <div className="flex-1 p-4">
                          <div className="h-8 w-3/4 bg-gray-200 rounded-lg mb-6"></div>
                          <div className="flex gap-4 mb-6">
                            <div className="w-1/2">
                              <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                              <div className="h-4 w-5/6 bg-gray-200 rounded mb-2"></div>
                              <div className="h-4 w-4/6 bg-gray-200 rounded"></div>
                            </div>
                            <div className="w-1/2">
                              <div className="h-20 w-full bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          <div className="h-24 w-full bg-gray-100 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-800">AI Generating Content...</span>
                  </div>
                </div>
                
                {/* Animated cursor */}
                <div className="absolute top-32 left-2/3 w-4 h-4 border-2 border-blue-600 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trusted By */}
      <section className="py-10 bg-white">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 mb-6">TRUSTED BY SMEs WORLDWIDE</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="h-8 bg-gray-300 w-24 rounded"></div>
            <div className="h-8 bg-gray-300 w-32 rounded"></div>
            <div className="h-8 bg-gray-300 w-28 rounded"></div>
            <div className="h-8 bg-gray-300 w-20 rounded"></div>
            <div className="h-8 bg-gray-300 w-30 rounded"></div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-1">5000+</div>
              <div className="text-sm text-blue-100">SME Websites</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-1">3 min</div>
              <div className="text-sm text-blue-100">Average Creation Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-1">96%</div>
              <div className="text-sm text-blue-100">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-1">300%</div>
              <div className="text-sm text-blue-100">SME Online Growth</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create a professional landing page like Canva or Figma in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="relative">
              <div className="bg-blue-50 rounded-2xl p-8 relative z-10">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-xl font-bold">1</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Describe Your Business</h3>
                <p className="text-gray-600">
                  Tell our AI about your business, products, and target audience. The more details you provide, the better the results.
                </p>
              </div>
              {/* Arrow connecting steps (only visible on desktop) */}
              <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-20">
                <ArrowRight className="w-12 h-12 text-blue-200" />
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-blue-50 rounded-2xl p-8 relative z-10">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 text-xl font-bold">2</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Creates Your Page</h3>
                <p className="text-gray-600">
                  Our DeepSeek multimodal AI creates a complete, professionally designed landing page with tailored content and images.
                </p>
              </div>
              {/* Arrow connecting steps (only visible on desktop) */}
              <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-20">
                <ArrowRight className="w-12 h-12 text-blue-200" />
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-blue-50 rounded-2xl p-8 relative z-10">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 text-xl font-bold">3</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Customize & Publish</h3>
                <p className="text-gray-600">
                  Fine-tune your page with our Figma-like editor, then publish instantly or export the code for your own hosting.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link href="/editor">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-md text-lg">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Create Beautiful Pages</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines the best of Canva, Figma, and AI to help SMEs create professional websites
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Showcase Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Create Like a Pro, No Design Skills Needed</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how our intuitive editor makes it easy to create stunning pages
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="bg-gray-100 rounded-xl p-8 md:p-12">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Mockup of the editor interface */}
                  <div className="p-2 bg-gray-100 border-b flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="h-64 bg-gray-50 flex flex-col">
                    <div className="border-b border-gray-200 p-3 flex justify-between items-center bg-white">
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 rounded bg-blue-100"></div>
                        <div className="w-8 h-8 rounded bg-blue-100"></div>
                        <div className="w-8 h-8 rounded bg-blue-100"></div>
                      </div>
                      <div className="w-20 h-6 rounded bg-blue-100"></div>
                    </div>
                    <div className="flex-1 p-4">
                      <div className="w-full h-8 bg-gray-200 rounded mb-4"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="w-2/3 h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="w-1/3 h-8 bg-blue-500 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Visual Editor That Works Like Figma</h3>
              <ul className="space-y-4">
                {[
                  "Drag-and-drop interface just like Canva",
                  "Easy text and image editing with no coding",
                  "Pre-designed sections you can customize",
                  "Real-time preview as you make changes",
                  "Built for mobile and desktop responsive design"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <div className="mt-1 mr-3 flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/editor">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Try the Editor <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Affordable SME Pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your business needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-lg font-semibold text-gray-500 mb-4">Free</div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600"> credits</span>
              </div>
              <p className="text-gray-500 mb-6 text-sm">Perfect for trying out our platform</p>
              <ul className="space-y-3 mb-8">
                {["3 Landing Pages", "Basic Templates", "Jatevo AI Generation", "Export HTML/CSS"].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/editor" className="w-full block">
                <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white">
                  Start Free
                </Button>
              </Link>
            </div>
            
            {/* Pro Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-500 relative transform md:scale-105 z-10">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-4 py-1 text-sm font-medium">
                Most Popular
              </div>
              <div className="text-lg font-semibold text-blue-600 mb-4">Pro</div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$15</span>
                <span className="text-gray-600"> credits</span>
              </div>
              <p className="text-gray-500 mb-6 text-sm">Ideal for growing businesses</p>
              <ul className="space-y-3 mb-8">
                {[
                  "20 Landing Pages", 
                  "Premium SME Templates", 
                  "Advanced Jatevo AI", 
                  "Custom Domain",
                  "Custom Branding",
                  "Priority Support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
              </Button>
            </div>
            
            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-lg font-semibold text-gray-500 mb-4">Enterprise</div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$99</span>
                <span className="text-gray-600"> credits</span>
              </div>
              <p className="text-gray-500 mb-6 text-sm">For large businesses and agencies</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited Landing Pages", 
                  "Custom Template Development", 
                  "White-label Solution",
                  "API Access",
                  "Dedicated Account Manager",
                  "24/7 Priority Support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">SME Success Stories</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how businesses have transformed their online presence
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "LandingCraft helped my coffee shop create a professional online presence in just 10 minutes. Our online orders increased by 200%!",
                author: "Andi Wijaya",
                business: "Kopi Kenangan, Jakarta"
              },
              {
                quote: "As a small batik business owner, I couldn't afford expensive web designers. LandingCraft's AI created my perfect landing page instantly.",
                author: "Siti Rahayu",
                business: "Batik Nusantara, Solo"
              },
              {
                quote: "The Figma-like interface was so easy to use. We now have a beautiful website that's bringing in new catering clients every day.",
                author: "Budi Santoso",
                business: "Warung Makan Bahagia, Bandung"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <div className="flex items-center mb-6">
                  {[1,2,3,4,5].map(n => (
                    <svg key={n} className="w-5 h-5 text-yellow-400 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to boost your UMKM's digital presence?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of Indonesian businesses creating professional landing pages with our AI-powered Figma-like editor.
          </p>
          <Link href="/editor">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-medium rounded-md shadow-lg">
              Create Your Page Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="mt-6 text-blue-200">No credit card required • Free forever plan available</p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div>
              <h3 className="text-lg font-bold mb-4">LandingCraft</h3>
              <p className="text-gray-400 text-sm mb-6">
                Empowering SMEs with Jatevo-powered AI landing pages. Create professional websites in minutes.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Tutorials</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Partners</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">API References</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 LandingCraft by Jatevo. Powered by high-performance AI inference.
            </div>
            <div className="flex space-x-6">
              <a href="https://jatevo.id" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Jatevo Platform</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}