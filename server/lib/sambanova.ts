import { ApiConfig } from "@shared/schema";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  model: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
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
      stream: true,
      model: "DeepSeek-V3-0324", // Corrected model name with proper capitalization
      messages: [systemMessage, userMessage]
    };
    
    // Log API request for debugging
    console.log("Calling SambaNova API with options:", {
      model: completionOptions.model,
      stream: completionOptions.stream,
      messages: [
        { role: systemMessage.role, content: systemMessage.content.substring(0, 50) + "..." },
        { role: userMessage.role, content: userMessage.content }
      ]
    });
    
    // Perform the API call to the correct endpoint
    const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
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
      console.log("Using fallback HTML generation due to API error:", `API error: ${response.status} - ${errorText}`);
      return {
        html: generateFallbackHtml(`${prompt.substring(0, 20)}...`, prompt),
        success: false,
        error: `API error: ${response.status} - ${errorText}`
      };
    }
    
    // For streamed responses, we need to read the chunks and collect them
    try {
      console.log("SambaNova API response received successfully");
      
      // Since we're using streaming mode, we need to collect the response differently
      if (completionOptions.stream) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }
        
        // For demonstration - collect all the streamed content
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = new TextDecoder().decode(value);
          
          // Stream chunks are formatted as "data: {JSON}\n\n"
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              
              try {
                const jsonData = JSON.parse(jsonStr);
                if (jsonData.choices && jsonData.choices.length > 0) {
                  const delta = jsonData.choices[0].delta;
                  if (delta && delta.content) {
                    fullContent += delta.content;
                  }
                }
              } catch (e) {
                console.error("Error parsing JSON chunk:", e);
              }
            }
          }
        }
        
        // Process the collected content
        console.log("Successfully collected streamed content, length:", fullContent.length);
        
        // Find HTML content
        // Make sure it starts with <!DOCTYPE html>
        if (fullContent.includes("<!DOCTYPE html>") || fullContent.includes("<!doctype html>")) {
          // Find the start of the HTML content
          const htmlStart = Math.max(
            fullContent.indexOf("<!DOCTYPE html>"),
            fullContent.indexOf("<!doctype html>")
          );
          
          if (htmlStart >= 0) {
            const htmlContent = fullContent.substring(htmlStart);
            return {
              html: htmlContent,
              success: true
            };
          }
        }
        
        // If no HTML found, wrap the content
        return {
          html: `<!DOCTYPE html><html><head><title>Generated Page</title></head><body>${fullContent}</body></html>`,
          success: true
        };
      } else {
        // Handle non-streaming response
        const data = await response.json();
        
        // Extract the HTML content from the response
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
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
      }
    } catch (error) {
      console.error("Error processing API response:", error);
      return {
        html: "",
        success: false,
        error: error instanceof Error ? error.message : "Error processing API response"
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
    const response = await fetch("https://api.sambanova.ai/v1/models", {
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
  <title>API Error - ${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      line-height: 1.6;
      background-color: #f9fafb;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    h1 {
      font-size: 2rem;
      margin-bottom: 10px;
      color: #1f2937;
    }
    
    .error-box {
      background-color: #fee2e2;
      border: 2px solid #ef4444;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    
    .error-box h2 {
      color: #b91c1c;
      margin-top: 0;
      font-size: 1.5rem;
    }
    
    .error-box p {
      color: #7f1d1d;
      margin-bottom: 0;
    }
    
    .prompt-preview {
      background-color: #fff;
      border: 1px solid #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    
    .prompt-preview h2 {
      font-size: 1.25rem;
      margin-top: 0;
      color: #4b5563;
    }
    
    .prompt-preview p {
      margin-bottom: 0;
      color: #6b7280;
      font-family: monospace;
      white-space: pre-wrap;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 4px;
    }
    
    .instructions {
      background-color: #dbeafe;
      border: 1px solid #93c5fd;
      padding: 20px;
      border-radius: 8px;
    }
    
    .instructions h2 {
      font-size: 1.25rem;
      margin-top: 0;
      color: #1e40af;
    }
    
    .instructions ol {
      margin-bottom: 0;
      padding-left: 20px;
    }
    
    .instructions li {
      margin-bottom: 10px;
      color: #1e3a8a;
    }
    
    footer {
      text-align: center;
      margin-top: 40px;
      color: #6b7280;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>API Connection Error</h1>
    </header>
    
    <div class="error-box">
      <h2>SambaNova API Error</h2>
      <p>We were unable to generate a landing page using the SambaNova API. This is likely due to an API connection issue or an invalid API key.</p>
    </div>
    
    <div class="prompt-preview">
      <h2>Your Prompt:</h2>
      <p>${prompt}</p>
    </div>
    
    <div class="instructions">
      <h2>Troubleshooting Steps:</h2>
      <ol>
        <li>Check that you've entered your SambaNova API key correctly in the settings.</li>
        <li>Verify that your API key is valid by clicking the "Validate" button in the API settings panel.</li>
        <li>Make sure your API key has the necessary permissions to use the SambaNova models.</li>
        <li>Try a different, simpler prompt to see if that works.</li>
      </ol>
    </div>
    
    <footer>
      <p>This is a fallback error page generated by the application.</p>
    </footer>
  </div>
</body>
</html>`;
}