import { ApiConfig } from "@shared/schema";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GenerationResult {
  html: string;
  success: boolean;
  error?: string;
}

/**
 * Generate HTML content using SambaNova's DeepSeek-V3-0324 model
 */
export async function generateLandingPageHtml(
  prompt: string,
  apiConfig: ApiConfig
): Promise<GenerationResult> {
  try {
    const apiKey = apiConfig?.apiKey || process.env.SAMBANOVA_API_KEY;
    if (!apiKey) {
      return {
        html: "",
        success: false,
        error: "SambaNova API key is required"
      };
    }
    
    console.log("Generating HTML with SambaNova API using prompt:", prompt.substring(0, 50) + "...");
    
    // Prepare the system prompt and user message
    const systemMessage: Message = {
      role: "system",
      content: `You are an expert web developer specializing in HTML and CSS coding. 
Create a professional, responsive landing page based on the user's description.
Follow these requirements:
1. Use semantic HTML5
2. Include embedded CSS in a <style> tag (don't reference external stylesheets)
3. Create a fully-functioning, complete page that would be ready to deploy
4. Include clean, well-organized HTML structure
5. Use responsive design principles for mobile/desktop
6. Use modern CSS including flexbox/grid
7. Include professionally designed UI components (nav, header, features, call-to-action, etc.)
8. Don't use any external libraries or CDNs
9. Don't include any backend functionality, forms should be static
10. All the code should be valid, use proper syntax and indentation

IMPORTANT: Your response must begin with <!DOCTYPE html> and include ONLY the HTML code, nothing else.
Do not include any introductory text, explanations, or markdown formatting. Just give me the raw HTML code.`
    };
    
    const userMessage: Message = {
      role: "user",
      content: `Create a landing page for: ${prompt}`
    };
    
    const completionOptions: CompletionOptions = {
      model: "deepseek-v3-0324", // Specific model requested
      messages: [systemMessage, userMessage],
      temperature: 0.7,
      max_tokens: 5000
    };
    
    // Perform the API call
    const response = await fetch("https://api.sambanova.ai/api/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(completionOptions)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SambaNova API error:", response.status, errorText);
      return {
        html: "",
        success: false,
        error: `API error: ${response.status} - ${errorText}`
      };
    }
    
    const data = await response.json();
    
    // Extract the HTML content from the response
    if (data.choices && data.choices.length > 0 && data.choices[0].message.content) {
      const generatedContent = data.choices[0].message.content.trim();
      
      // Make sure it starts with <!DOCTYPE html>
      if (generatedContent.startsWith("<!DOCTYPE html>") || 
          generatedContent.startsWith("<!doctype html>")) {
        return {
          html: generatedContent,
          success: true
        };
      } else {
        // Try to find HTML in the response
        const htmlStart = generatedContent.indexOf("<!DOCTYPE html>");
        if (htmlStart >= 0) {
          return {
            html: generatedContent.substring(htmlStart),
            success: true
          };
        } else {
          // As a last resort, wrap the content in HTML
          return {
            html: `<!DOCTYPE html><html><head><title>Generated Page</title></head><body>${generatedContent}</body></html>`,
            success: true
          };
        }
      }
    } else {
      console.error("Unexpected API response format:", data);
      return {
        html: "",
        success: false,
        error: "API returned an unexpected response format"
      };
    }
  } catch (error) {
    console.error("Error generating landing page HTML:", error);
    return {
      html: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Validate a SambaNova API key
 */
export async function validateSambanovaApiKey(apiKey: string): Promise<boolean> {
  try {
    if (!apiKey) return false;
    
    // Attempt a minimal call to the API to validate the key
    const response = await fetch("https://api.sambanova.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    
    // If we get a 200 OK, the key is valid
    return response.ok;
  } catch (error) {
    console.error("Error validating SambaNova API key:", error);
    return false;
  }
}

/**
 * Generate fallback HTML when API calls fail
 */
export function generateFallbackHtml(title: string, prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      background-color: #3b82f6;
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    p {
      font-size: 1.2rem;
      max-width: 800px;
      margin: 0 auto 30px auto;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #fff;
      color: #3b82f6;
      padding: 12px 30px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }
    
    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    section {
      padding: 80px 0;
    }
    
    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 60px;
      color: #333;
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .feature {
      background-color: #f8f9fa;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      transition: transform 0.3s ease;
    }
    
    .feature:hover {
      transform: translateY(-10px);
    }
    
    .feature h3 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      color: #3b82f6;
    }
    
    footer {
      background-color: #333;
      color: white;
      padding: 40px 0;
      text-align: center;
    }
    
    /* Error Message Styling */
    .api-error {
      background-color: #fee2e2;
      border: 2px solid #ef4444;
      padding: 20px;
      border-radius: 8px;
      margin: 40px auto;
      max-width: 800px;
      text-align: center;
    }
    
    .api-error h2 {
      color: #b91c1c;
      margin-top: 0;
    }
    
    .api-error p {
      color: #7f1d1d;
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${title}</h1>
      <p>${prompt}</p>
      <a href="#" class="cta-button">Get Started</a>
    </div>
  </header>
  
  <section>
    <div class="container">
      <div class="api-error">
        <h2>API Connection Error</h2>
        <p>We weren't able to generate a customized landing page using the SambaNova API. Please check your API key and try again.</p>
      </div>
      
      <h2 class="section-title">Key Features</h2>
      <div class="features">
        <div class="feature">
          <h3>Feature 1</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 2</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 3</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}