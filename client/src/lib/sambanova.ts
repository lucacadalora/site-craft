import { ApiConfig, SiteStructure } from '@shared/schema';

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  stream?: boolean;
  model?: string;
  messages: Message[];
}

interface GenerationResult {
  html: string;
  css: string;
}

/**
 * Generate a comprehensive site with DeepSeek-V3-0324
 */
export async function generateDeepSite(
  prompt: string,
  category: string,
  sections: string[] = ["hero", "features", "testimonials", "about", "contact"],
  contentDepth: string = "detailed",
  apiConfig: ApiConfig
): Promise<GenerationResult> {
  try {
    // Create a system message that guides the model to generate a landing page
    const templatePrompts: Record<string, string> = {
      "general": "You are a professional web developer creating a modern, responsive landing page.",
      "education": "You are a professional web developer creating a modern, responsive landing page for an educational institution or EdTech product.",
      "portfolio": "You are a professional web developer creating a modern, responsive portfolio landing page for a designer or creative professional.",
      "finance": "You are a professional web developer creating a modern, responsive landing page for a financial services company.",
      "marketplace": "You are a professional web developer creating a modern, responsive landing page for an e-commerce or marketplace platform.",
      "technology": "You are a professional web developer creating a modern, responsive landing page for a technology company or SaaS product.",
      "healthcare": "You are a professional web developer creating a modern, responsive landing page for a healthcare provider or health technology product.",
      "real-estate": "You are a professional web developer creating a modern, responsive landing page for a real estate company or property listing.",
      "restaurant": "You are a professional web developer creating a modern, responsive landing page for a restaurant or food service business.",
      "nonprofit": "You are a professional web developer creating a modern, responsive landing page for a nonprofit organization or charity."
    };

    // Get the template prompt based on category or use general
    const templatePrompt = templatePrompts[category] || templatePrompts.general;

    // Build a detailed system message
    const systemMessage = `${templatePrompt}
Your task is to generate HTML and CSS for a complete landing page based on the user's description: "${prompt}".

The landing page should include the following sections:
${sections.map(section => `- ${section}`).join('\n')}

Content depth: ${contentDepth} (basic = minimal text, detailed = standard content, comprehensive = extensive content)

Generate a well-structured, modern, and responsive landing page with clean, well-commented HTML and CSS.
The design should be professional, user-friendly, and optimized for conversion.
Make sure the content relates specifically to the user's request and includes relevant details.`;

    // Create the message array
    const messages: Message[] = [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt }
    ];

    // Prepare options for the API call
    const options: CompletionOptions = {
      model: "deepseek-v3-0324",
      messages: messages
    };

    console.log("Generating with SambaNova DeepSeek-V3-0324...");
    
    // Mock response for demonstration - in a real app we'd make an actual API call
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API call delay
    
    // Create the HTML and CSS based on the prompt and category
    const html = generateFallbackHTML(prompt, category, sections);
    const css = generateFallbackCSS(category);
    
    return { html, css };
  } catch (error) {
    console.error("Error generating with SambaNova:", error);
    throw new Error("Failed to generate landing page. Please try again.");
  }
}

// This function would be replaced with a real API call in production
function generateFallbackHTML(prompt: string, category: string, sections: string[]): string {
  // Extract more meaningful content from the prompt
  const words = prompt.split(' ');
  const title = prompt.split('.')[0] || words.slice(0, 5).join(' ');
  
  // Identify some key terms from the prompt to use in the landing page
  const keyTerms = words.filter(word => word.length > 4).slice(0, 10);
  
  // Get business type from category or default
  const businessType = category.charAt(0).toUpperCase() + category.slice(1);
  
  // Create a tagline based on the prompt and category
  const taglines = [
    `The premier ${category} solution for modern businesses`,
    `Transforming the ${category} industry with innovation`,
    `Advanced ${category} tools for your success`,
    `Your partner in ${category} excellence`,
    `${businessType} solutions designed for your needs`
  ];
  
  // Choose a random tagline
  const tagline = taglines[Math.floor(Math.random() * taglines.length)];
  
  let sectionsHTML = '';
  
  if (sections.includes('hero')) {
    sectionsHTML += `
    <section id="hero" class="hero">
      <div class="container">
        <h1>${title}</h1>
        <p class="lead">${tagline}</p>
        <button class="btn btn-primary">Get Started Today</button>
      </div>
    </section>`;
  }
  
  if (sections.includes('features')) {
    // Generate features based on the category and prompt
    const featureIcons = ['🚀', '🛡️', '📊', '⚙️', '🔍', '💡', '🔄', '📱', '🌐', '🔔'];
    
    // Features tailored by industry/category
    const featuresByCategory: Record<string, Array<[string, string]>> = {
      'general': [
        ['Fast & Reliable', 'Lightning fast performance you can count on.'],
        ['Secure', 'Enterprise-grade security for your peace of mind.'],
        ['Analytics', 'Detailed insights to grow your business.']
      ],
      'education': [
        ['Interactive Learning', 'Engage students with interactive content and exercises.'],
        ['Progress Tracking', 'Monitor student progress with detailed analytics.'],
        ['Collaboration Tools', 'Foster teamwork with built-in collaboration features.']
      ],
      'finance': [
        ['Secure Transactions', 'Enterprise-level security for all your financial data.'],
        ['Real-time Analytics', 'Monitor your finances with up-to-the-minute insights.'],
        ['Automated Reporting', 'Save time with automated financial reporting.']
      ],
      'healthcare': [
        ['Patient Management', 'Streamline patient information and appointment scheduling.'],
        ['Secure Records', 'HIPAA-compliant security for all patient data.'],
        ['Telehealth Integration', 'Connect with patients remotely with integrated video calls.']
      ],
      'technology': [
        ['Cutting-edge Solutions', 'Stay ahead with the latest technological innovations.'],
        ['Scalable Infrastructure', 'Grow your business with scalable architecture.'],
        ['API Integration', 'Connect with your favorite tools through our robust API.']
      ],
      'marketplace': [
        ['Secure Payments', 'Process transactions with industry-leading security.'],
        ['Inventory Management', 'Track and manage your inventory in real-time.'],
        ['Customer Insights', 'Understand your customers with detailed analytics.']
      ]
    };
    
    // Get features for the selected category or default to general
    const selectedFeatures = featuresByCategory[category] || featuresByCategory.general;
    
    // Create feature HTML
    let featuresHTML = '';
    selectedFeatures.forEach((feature, index) => {
      const icon = featureIcons[index % featureIcons.length];
      featuresHTML += `
          <div class="feature">
            <div class="feature-icon">${icon}</div>
            <h3>${feature[0]}</h3>
            <p>${feature[1]}</p>
          </div>`;
    });
    
    sectionsHTML += `
    <section id="features" class="features">
      <div class="container">
        <h2>Key Features</h2>
        <div class="features-grid">
          ${featuresHTML}
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('testimonials')) {
    // Testimonials customized by category
    const testimonialsByCategory: Record<string, Array<[string, string, string]>> = {
      'general': [
        ['"This product has transformed our business processes completely."', 'Jane Smith', 'CEO, Innovation Labs'],
        ['"I\'ve never seen such amazing results in such a short time."', 'John Doe', 'CTO, Future Tech']
      ],
      'education': [
        ['"Our students\' engagement has increased dramatically since we started using this platform."', 'Dr. Sarah Johnson', 'Principal, Westview Academy'],
        ['"The analytics provided by this tool have helped us tailor our curriculum to student needs."', 'Prof. James Wilson', 'Department Head, University of Technology']
      ],
      'finance': [
        ['"We\'ve seen a 40% increase in client satisfaction since implementing this solution."', 'Michael Chen', 'Financial Advisor, Wealth Partners'],
        ['"The security features give our clients peace of mind when managing their investments online."', 'Amanda Torres', 'COO, Global Finance Group']
      ],
      'healthcare': [
        ['"Our patient management efficiency has improved by 60% with this system."', 'Dr. Robert Miller', 'Chief of Medicine, City General Hospital'],
        ['"The telehealth integration has allowed us to reach patients in rural areas effectively."', 'Dr. Sophia Ahmed', 'Director, Health Connect Initiative']
      ],
      'technology': [
        ['"The API integrations saved our development team countless hours of work."', 'David Park', 'Lead Developer, TechNova'],
        ['"The scalability of this platform has supported our growth from startup to enterprise."', 'Alicia Gomez', 'CIO, Digital Solutions Inc.']
      ],
      'marketplace': [
        ['"Our inventory management has never been more streamlined and accurate."', 'Mark Johnson', 'Operations Manager, Global Market'],
        ['"Customer insights provided by this platform have driven a 35% increase in repeat purchases."', 'Rebecca Lin', 'Marketing Director, Consumer Goods Ltd.']
      ]
    };
    
    // Get testimonials for selected category or default to general
    const selectedTestimonials = testimonialsByCategory[category] || testimonialsByCategory.general;
    
    // Build testimonials HTML
    let testimonialsHTML = '';
    selectedTestimonials.forEach(testimonial => {
      testimonialsHTML += `
          <div class="testimonial">
            <p>${testimonial[0]}</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar"></div>
              <div class="testimonial-info">
                <h4>${testimonial[1]}</h4>
                <p>${testimonial[2]}</p>
              </div>
            </div>
          </div>`;
    });
    
    sectionsHTML += `
    <section id="testimonials" class="testimonials">
      <div class="container">
        <h2>What Our Customers Say</h2>
        <div class="testimonials-grid">
          ${testimonialsHTML}
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('about')) {
    // About section content customized by category
    const aboutContentByCategory: Record<string, string[]> = {
      'general': [
        "We're a dedicated team of professionals committed to delivering the best solutions for our clients.",
        "With years of experience in the industry, we understand what it takes to succeed."
      ],
      'education': [
        "Our team of education experts and technologists is dedicated to improving learning outcomes for students of all ages.",
        "Founded by former educators with a passion for innovation, we bring real classroom experience to every solution we create."
      ],
      'finance': [
        "Our team of financial experts and technology specialists is dedicated to making financial services more accessible and secure.",
        "With decades of combined experience in finance and fintech, we understand the unique challenges that financial institutions and their clients face."
      ],
      'healthcare': [
        "Founded by healthcare professionals, our team combines clinical expertise with cutting-edge technology.",
        "We're committed to improving patient outcomes and healthcare efficiency through innovative digital solutions."
      ],
      'technology': [
        "Our team of engineers, designers, and product specialists has been at the forefront of technological innovation for over a decade.",
        "We believe in creating technology that solves real problems while being intuitive and accessible to all users."
      ],
      'marketplace': [
        "We've built a team of e-commerce experts and platform specialists who understand what makes online marketplaces successful.",
        "Our solutions are designed to create seamless buying and selling experiences while maximizing platform efficiency."
      ]
    };
    
    // Get about content for the selected category or default to general
    const aboutContent = aboutContentByCategory[category] || aboutContentByCategory.general;
    
    // Build the about section HTML
    const aboutHTML = aboutContent.map(paragraph => `<p>${paragraph}</p>`).join('\n            ');
    
    sectionsHTML += `
    <section id="about" class="about">
      <div class="container">
        <h2>About Us</h2>
        <div class="about-content">
          <div class="about-text">
            ${aboutHTML}
          </div>
          <div class="about-image"></div>
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('contact')) {
    // Contact messages by category
    const contactMessagesByCategory: Record<string, string> = {
      'general': "We'd love to hear from you. Reach out to us using the form or contact details.",
      'education': "Connect with our education specialists to learn how we can help transform your learning environment.",
      'finance': "Speak with our financial technology experts about how we can help secure and streamline your operations.",
      'healthcare': "Contact our healthcare solutions team to discuss how we can help improve patient care and operational efficiency.",
      'technology': "Reach out to our tech team to discuss your specific needs and how our solutions can drive your innovation.",
      'marketplace': "Get in touch with our e-commerce experts to discuss how we can optimize your marketplace operations."
    };
    
    // Email addresses by category
    const emailsByCategory: Record<string, string> = {
      'general': "info@example.com",
      'education': "education@example.com",
      'finance': "finance@example.com",
      'healthcare': "healthcare@example.com",
      'technology': "tech@example.com",
      'marketplace': "marketplace@example.com"
    };
    
    // Get the appropriate message and email for the selected category
    const contactMessage = contactMessagesByCategory[category] || contactMessagesByCategory.general;
    const email = emailsByCategory[category] || emailsByCategory.general;
    
    sectionsHTML += `
    <section id="contact" class="contact">
      <div class="container">
        <h2>Get In Touch</h2>
        <div class="contact-grid">
          <div class="contact-info">
            <p>${contactMessage}</p>
            <div class="contact-details">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            </div>
          </div>
          <form class="contact-form">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" placeholder="Your name">
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="Your email">
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" placeholder="Your message"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
          </form>
        </div>
      </div>
    </section>`;
  }
  
  // Build complete HTML structure
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- The CSS will be injected by the frontend -->
</head>
<body>
    <header>
        <div class="container">
            <div class="logo">
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            </div>
            <nav>
                <ul>
                    <li><a href="#hero">Home</a></li>
                    ${sections.includes('features') ? '<li><a href="#features">Features</a></li>' : ''}
                    ${sections.includes('about') ? '<li><a href="#about">About</a></li>' : ''}
                    ${sections.includes('testimonials') ? '<li><a href="#testimonials">Testimonials</a></li>' : ''}
                    ${sections.includes('contact') ? '<li><a href="#contact">Contact</a></li>' : ''}
                </ul>
            </nav>
        </div>
    </header>
    
    <main>
        ${sectionsHTML}
    </main>
    
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-logo">
                    <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                </div>
                <div class="footer-links">
                    <ul>
                        <li><a href="#hero">Home</a></li>
                        ${sections.includes('features') ? '<li><a href="#features">Features</a></li>' : ''}
                        ${sections.includes('about') ? '<li><a href="#about">About</a></li>' : ''}
                        ${sections.includes('testimonials') ? '<li><a href="#testimonials">Testimonials</a></li>' : ''}
                        ${sections.includes('contact') ? '<li><a href="#contact">Contact</a></li>' : ''}
                    </ul>
                </div>
                <div class="footer-social">
                    <a href="#" class="social-link">Facebook</a>
                    <a href="#" class="social-link">Twitter</a>
                    <a href="#" class="social-link">LinkedIn</a>
                </div>
            </div>
            <div class="copyright">
                <p>&copy; 2025 ${category.charAt(0).toUpperCase() + category.slice(1)} Company. All rights reserved.</p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

function generateFallbackCSS(category: string = 'general'): string {
  // Color schemes by category
  const colorSchemes: Record<string, {primary: string, secondary: string, accent: string}> = {
    'general': {
      primary: '#4361ee',
      secondary: '#3f37c9',
      accent: '#f72585'
    },
    'education': {
      primary: '#3949ab',
      secondary: '#283593',
      accent: '#29b6f6'
    },
    'healthcare': {
      primary: '#4caf50',
      secondary: '#388e3c',
      accent: '#03a9f4'
    },
    'finance': {
      primary: '#2e7d32',
      secondary: '#1b5e20',
      accent: '#ffc107'
    },
    'technology': {
      primary: '#6200ea',
      secondary: '#4a148c',
      accent: '#00bcd4'
    },
    'marketplace': {
      primary: '#ff5722',
      secondary: '#e64a19',
      accent: '#ffc107'
    }
  };

  // Get color scheme for selected category or default to general
  const colorScheme = colorSchemes[category] || colorSchemes.general;

  return `
/* Global Styles */
:root {
  --primary-color: ${colorScheme.primary};
  --secondary-color: ${colorScheme.secondary};
  --accent-color: ${colorScheme.accent};
  --text-color: #333;
  --light-text: #666;
  --bg-color: #fff;
  --light-bg: #f8f9fa;
  --border-color: #dee2e6;
  --border-radius: 5px;
  --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  line-height: 1.2;
  font-weight: 700;
}

h1 {
  font-size: 3rem;
}

h2 {
  font-size: 2.25rem;
  margin-bottom: 2rem;
  text-align: center;
}

h3 {
  font-size: 1.5rem;
}

p {
  margin-bottom: 1rem;
}

.lead {
  font-size: 1.25rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
  border: none;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
  box-shadow: var(--box-shadow);
}

/* Header */
header {
  background-color: var(--bg-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 20px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

nav ul {
  display: flex;
  list-style: none;
}

nav ul li {
  margin-left: 2rem;
}

nav ul li a {
  color: var(--text-color);
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition);
}

nav ul li a:hover {
  color: var(--primary-color);
}

/* Sections */
section {
  padding: 5rem 0;
}

section:nth-child(even) {
  background-color: var(--light-bg);
}

/* Hero Section */
.hero {
  padding: 6rem 0;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
}

.hero h1 {
  margin-bottom: 1rem;
}

.hero .lead {
  max-width: 600px;
  margin: 0 auto 2rem;
}

/* Features Section */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature {
  padding: 2rem;
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  text-align: center;
  transition: var(--transition);
}

.feature:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

/* Testimonials Section */
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.testimonial {
  padding: 2rem;
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

.testimonial p {
  font-style: italic;
  margin-bottom: 1.5rem;
}

.testimonial-author {
  display: flex;
  align-items: center;
}

.testimonial-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #ddd;
  margin-right: 1rem;
}

/* About Section */
.about-content {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.about-text {
  flex: 1;
}

.about-image {
  flex: 1;
  min-height: 300px;
  background-color: #ddd;
  border-radius: var(--border-radius);
}

/* Contact Section */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
  margin-top: 3rem;
}

.contact-info {
  margin-bottom: 2rem;
}

.contact-details {
  margin-top: 1.5rem;
}

.contact-form .form-group {
  margin-bottom: 1.5rem;
}

.contact-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-family: inherit;
  font-size: 1rem;
}

.contact-form textarea {
  min-height: 150px;
  resize: vertical;
}

/* Footer */
footer {
  background-color: #1a1a1a;
  color: white;
  padding: 3rem 0 1.5rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.footer-logo {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.footer-links ul {
  list-style: none;
}

.footer-links ul li {
  margin-bottom: 0.5rem;
}

.footer-links ul li a {
  color: #ddd;
  text-decoration: none;
  transition: var(--transition);
}

.footer-links ul li a:hover {
  color: white;
}

.footer-social {
  display: flex;
  gap: 1rem;
}

.social-link {
  color: #ddd;
  text-decoration: none;
  transition: var(--transition);
}

.social-link:hover {
  color: white;
}

.copyright {
  text-align: center;
  padding-top: 1.5rem;
  border-top: 1px solid #333;
  font-size: 0.875rem;
  color: #ddd;
}

/* Responsive Styles */
@media (max-width: 768px) {
  h1 {
    font-size: 2.5rem;
  }
  
  h2 {
    font-size: 2rem;
  }
  
  .about-content {
    flex-direction: column;
  }
  
  .about-image {
    margin-top: 2rem;
    width: 100%;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 2rem;
  }
}

@media (max-width: 576px) {
  h1 {
    font-size: 2rem;
  }
  
  h2 {
    font-size: 1.75rem;
  }
  
  nav ul {
    flex-direction: column;
    gap: 1rem;
  }
  
  nav ul li {
    margin-left: 0;
  }
  
  .hero {
    padding: 4rem 0;
  }
  
  section {
    padding: 3rem 0;
  }
}
`; 
}

// For validation and token estimation - simplified versions
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // In a real app, you would validate with the SambaNova API
    console.log("Validating API key:", apiKey);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    return true; // Always return true for demo
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}

export function estimateTokenUsage(text: string): number {
  // Simple estimation: ~1 token per 4 chars for DeepSeek
  return Math.ceil(text.length / 4);
}