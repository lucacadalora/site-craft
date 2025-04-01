import OpenAI from "openai";
import { Template, Settings } from "@shared/schema";

// Function to generate landing page with OpenAI
export async function generateWithOpenAI(
  prompt: string,
  template: Template,
  settings: Settings,
  apiKey: string
): Promise<{ html: string; css: string }> {
  try {
    const openai = new OpenAI({ apiKey });

    // Construct the prompt for the LLM
    // Using a structured prompt to get consistent output and save tokens
    const systemPrompt = `
      You are a professional landing page generator. Generate HTML and CSS for a landing page based on the user's description.
      Use the provided template structure as a guide, but customize it according to the user's request.
      
      Template information:
      - Category: ${template.category}
      - Name: ${template.name}
      - Design: ${template.description}
      
      User settings:
      - Primary color: ${settings.colors.primary}
      - Font: ${settings.font}
      - Layout: ${settings.layout}
      
      Return ONLY valid, production-ready HTML and CSS with no explanations. 
      The response must be a valid JSON object with these keys:
      - html: The complete HTML for the landing page body content (no <html>, <head>, or <body> tags)
      - css: The complete CSS for styling the page
    `;

    // Generate the landing page content
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the response content
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    const result = JSON.parse(content);
    
    if (!result.html || !result.css) {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      html: result.html,
      css: result.css,
    };
  } catch (error) {
    console.error("Error generating with OpenAI:", error);
    throw new Error(`Failed to generate landing page: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Function to validate OpenAI API key
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Make a minimal API call to test the key
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    });
    
    return !!response.choices[0].message.content;
  } catch (error) {
    console.error("Error validating OpenAI key:", error);
    return false;
  }
}

// Function to estimate token usage
export function estimateTokenUsage(prompt: string): number {
  // Simple token estimation - in a real app, use a more accurate algorithm
  // Roughly 4 characters per token on average
  return Math.ceil(prompt.length / 4) + 50; // Add a buffer for system instructions
}
