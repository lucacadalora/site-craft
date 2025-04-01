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
Your task is to generate HTML and CSS for a complete landing page based on the user's description.

The landing page should include the following sections:
${sections.map(section => `- ${section}`).join('\n')}

Content depth: ${contentDepth} (basic = minimal text, detailed = standard content, comprehensive = extensive content)

Generate a well-structured, modern, and responsive landing page with clean, well-commented HTML and CSS.
You MUST output a JSON object with two properties:
- html: The complete HTML code for the landing page
- css: The complete CSS code for the landing page

Use modern CSS with flexbox/grid and responsive breakpoints. Include basic animations for improved UX.
The design should be professional, user-friendly, and optimized for conversion.`;

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

    // Make API call to SambaNova
    console.log("Generating with SambaNova DeepSeek-V3-0324...");
    
    // Check if the environment variable is available (only log the first few characters for security)
    const envApiKey = import.meta.env.VITE_SAMBANOVA_API_KEY;
    if (envApiKey) {
      console.log("VITE_SAMBANOVA_API_KEY environment variable is available:", 
        envApiKey.substring(0, 4) + "..." + envApiKey.substring(envApiKey.length - 4));
    } else {
      console.log("VITE_SAMBANOVA_API_KEY environment variable is NOT available");
    }
    
    try {
      // Prepare the API URL
      const apiUrl = "https://api.sambanova.ai/v1/chat/completions";
      
      // Get the API key from the provided config
      const apiKey = apiConfig.apiKey && apiConfig.apiKey.trim() 
        ? apiConfig.apiKey 
        : import.meta.env.VITE_SAMBANOVA_API_KEY;
        
      if (!apiKey) {
        throw new Error("No SambaNova API key provided");
      }
      
      // Make the API call
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(options)
      });
      
      // Check if the response is successful
      if (!response.ok) {
        const errorData = await response.text();
        console.error("SambaNova API error:", errorData);
        throw new Error(`SambaNova API returned ${response.status}: ${errorData}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract the generated content from the response
      const generatedContent = data.choices[0].message.content;
      
      // Try to parse the JSON from the generated content
      let parsedContent;
      try {
        // Find JSON in the response (it might be surrounded by markdown or other text)
        const jsonMatch = generatedContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        generatedContent.match(/{[\s\S]*?}/);
                        
        const jsonString = jsonMatch ? jsonMatch[0] : generatedContent;
        parsedContent = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
      } catch (parseError) {
        console.error("Error parsing JSON from SambaNova response:", parseError);
        throw new Error("Failed to parse SambaNova response");
      }
      
      if (!parsedContent.html || !parsedContent.css) {
        console.error("Error calling SambaNova API:", { parsedContent });
        throw new Error("Missing HTML or CSS in SambaNova response");
      }
      
      return {
        html: parsedContent.html,
        css: parsedContent.css
      };
      
    } catch (error) {
      console.error("Error calling SambaNova API:", error);
      console.log("Using fallback generation...");
      
      // Fallback to mock generation if API fails
      const html = generateMockHTML(prompt, category, sections);
      const css = generateMockCSS();
      return { html, css };
    }
  } catch (error) {
    console.error("Error generating with SambaNova:", error);
    throw new Error("Failed to generate landing page. Please try again.");
  }
}

// This function generates mock HTML for testing when the API is not available
function generateMockHTML(prompt: string, category: string, sections: string[]): string {
  const title = prompt.split(' ').slice(0, 3).join(' ');
  
  let sectionsHTML = '';
  
  if (sections.includes('hero')) {
    sectionsHTML += `
    <section id="hero" class="hero">
      <div class="container">
        <h1>${title}</h1>
        <p class="lead">A powerful solution for your business needs</p>
        <button class="btn btn-primary">Get Started</button>
      </div>
    </section>`;
  }
  
  if (sections.includes('features')) {
    sectionsHTML += `
    <section id="features" class="features">
      <div class="container">
        <h2>Key Features</h2>
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">🚀</div>
            <h3>Fast &amp; Reliable</h3>
            <p>Lightning fast performance you can count on.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🛡️</div>
            <h3>Secure</h3>
            <p>Enterprise-grade security for your peace of mind.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>Detailed insights to grow your business.</p>
          </div>
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('testimonials')) {
    sectionsHTML += `
    <section id="testimonials" class="testimonials">
      <div class="container">
        <h2>What Our Customers Say</h2>
        <div class="testimonials-grid">
          <div class="testimonial">
            <p>"This product has transformed our business processes completely."</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar"></div>
              <div class="testimonial-info">
                <h4>Jane Smith</h4>
                <p>CEO, Example Inc</p>
              </div>
            </div>
          </div>
          <div class="testimonial">
            <p>"I've never seen such amazing results in such a short time."</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar"></div>
              <div class="testimonial-info">
                <h4>John Doe</h4>
                <p>CTO, Example Corp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('about')) {
    sectionsHTML += `
    <section id="about" class="about">
      <div class="container">
        <h2>About Us</h2>
        <div class="about-content">
          <div class="about-text">
            <p>We're a dedicated team of professionals committed to delivering the best solutions for our clients.</p>
            <p>With years of experience in the industry, we understand what it takes to succeed.</p>
          </div>
          <div class="about-image"></div>
        </div>
      </div>
    </section>`;
  }
  
  if (sections.includes('contact')) {
    sectionsHTML += `
    <section id="contact" class="contact">
      <div class="container">
        <h2>Get In Touch</h2>
        <div class="contact-grid">
          <div class="contact-info">
            <p>We'd love to hear from you. Reach out to us using the form or contact details.</p>
            <div class="contact-details">
              <p><strong>Email:</strong> info@example.com</p>
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

// This function generates mock CSS for testing when the API is not available
function generateMockCSS(): string {
  return `
/* Global Styles */
:root {
  --primary-color: #4361ee;
  --secondary-color: #3f37c9;
  --accent-color: #f72585;
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
  background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
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

// For validation and token estimation
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    if (!apiKey) {
      // If no API key is provided, check if there's one in the environment
      apiKey = import.meta.env.VITE_SAMBANOVA_API_KEY;
      
      if (!apiKey) {
        console.error("No SambaNova API key provided");
        return false;
      }
    }
    
    // Check if the API key is valid by making a simple request to SambaNova API
    const apiUrl = "https://api.sambanova.ai/v1/models"; // URL to get available models
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}

export function estimateTokenUsage(text: string): number {
  // Simple estimation: ~1 token per 4 chars for DeepSeek
  return Math.ceil(text.length / 4);
}