import { ApiConfig } from "@shared/schema";

// The newest model is "DeepSeek-V3-0324"
const DEFAULT_MODEL = "DeepSeek-V3-0324";
const API_ENDPOINT = "https://api.sambanova.ai/v1/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  stream?: boolean;
  model?: string;
  messages: Message[];
}

/**
 * Generate content using SambaNova's DeepSeek-V3-0324 model
 */
export async function generateCompletion(
  options: CompletionOptions,
  apiConfig: ApiConfig
): Promise<string> {
  const apiKey = apiConfig.apiKey || process.env.SAMBANOVA_API_KEY;

  if (!apiKey) {
    throw new Error("API key is required to generate content with SambaNova");
  }

  const requestOptions: CompletionOptions = {
    stream: false,
    model: DEFAULT_MODEL,
    ...options,
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestOptions),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SambaNova API error: ${error}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Error generating content with SambaNova:", error);
    throw error;
  }
}

/**
 * Generate a landing page using DeepSeek-V3-0324
 */
export async function generateLandingPage(
  description: string,
  category: string,
  apiConfig: ApiConfig
) {
  // We're no longer using templates in the traditional sense
  // Instead, we're using the category as a guideline for the model
  
  const systemPrompt = `You are an expert web developer and designer who specializes in creating modern, 
responsive landing pages for the ${category} niche. 
Your task is to create a complete HTML and CSS landing page based on the user's description.

Response format:
{
  "html": "<!-- Complete HTML code here -->",
  "css": "/* Complete CSS code here */",
  "metadata": {
    "title": "Page title for SEO",
    "description": "Meta description for SEO",
    "keywords": ["keyword1", "keyword2"]
  }
}

Requirements:
1. Create a complete, standalone HTML document with proper structure including <!DOCTYPE>, <html>, <head>, and <body> tags
2. Include internal CSS in a <style> tag within the <head> section
3. Make the design responsive for mobile, tablet, and desktop views
4. Use modern design principles with clean typography
5. Optimize for fast loading with minimal dependencies
6. Create visually appealing sections based on the user's description
7. Include appropriate calls to action
8. Use semantic HTML5 elements (<header>, <nav>, <main>, <section>, <footer>, etc.)`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: description }
  ];

  const completion = await generateCompletion({
    messages,
    model: DEFAULT_MODEL,
    stream: false
  }, apiConfig);

  try {
    // Parse the JSON response
    const result = JSON.parse(completion);
    return {
      html: result.html,
      css: result.css,
      metadata: result.metadata || {}
    };
  } catch (error) {
    console.error("Failed to parse SambaNova response:", error);
    throw new Error("Failed to generate landing page. The model response could not be parsed.");
  }
}

/**
 * Generate a comprehensive site with DeepSeek-V3-0324
 */
export async function generateDeepSite(
  description: string,
  category: string,
  sections: string[],
  contentDepth: string,
  apiConfig: ApiConfig
) {
  const sectionDescriptions = {
    hero: "A hero banner with headline, subheadline, and call-to-action",
    features: "Key features or benefits of the product/service",
    testimonials: "Customer testimonials or reviews",
    about: "Information about the company/organization",
    services: "Services offered",
    pricing: "Pricing information",
    team: "Team member information",
    contact: "Contact information and form",
    cta: "Call to action section",
    faq: "Frequently asked questions",
    portfolio: "Portfolio or project showcase",
    blog: "Blog previews or articles",
    stats: "Statistics or achievements",
    partners: "Partners or clients logos",
  };

  // Build a description of the requested sections
  const requestedSections = sections.map(section => 
    `${section}: ${sectionDescriptions[section as keyof typeof sectionDescriptions] || section}`
  ).join('\n');

  // Adjust depth instructions based on content depth
  let depthInstructions = "";
  if (contentDepth === "basic") {
    depthInstructions = "Create concise, minimalist content for each section.";
  } else if (contentDepth === "detailed") {
    depthInstructions = "Create moderately detailed content for each section with specific information.";
  } else if (contentDepth === "comprehensive") {
    depthInstructions = "Create comprehensive, in-depth content for each section with extensive details.";
  }

  const systemPrompt = `You are an expert web developer and designer who specializes in creating comprehensive, 
multi-section landing pages for the ${category} niche.
Your task is to create a complete HTML and CSS website based on the user's description.

Response format:
{
  "html": "<!-- Complete HTML code here -->",
  "css": "/* Complete CSS code here */",
  "metadata": {
    "title": "Page title for SEO",
    "description": "Meta description for SEO",
    "keywords": ["keyword1", "keyword2"]
  }
}

Sections to include:
${requestedSections}

Content depth: ${depthInstructions}

Requirements:
1. Create a complete, standalone HTML document with proper structure
2. Include internal CSS in a <style> tag within the <head> section
3. Make the design responsive for mobile, tablet, and desktop views
4. Use modern design principles with clean typography and color schemes
5. Optimize for fast loading with minimal dependencies
6. Create visually appealing sections based on the user's description
7. Include appropriate calls to action
8. Use semantic HTML5 elements (<header>, <nav>, <main>, <section>, <footer>, etc.)
9. Ensure proper metadata for SEO`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: description }
  ];

  const completion = await generateCompletion({
    messages,
    model: DEFAULT_MODEL,
    stream: false
  }, apiConfig);

  try {
    // Parse the JSON response
    const result = JSON.parse(completion);
    return {
      html: result.html,
      css: result.css,
      metadata: result.metadata || {}
    };
  } catch (error) {
    console.error("Failed to parse SambaNova response:", error);
    throw new Error("Failed to generate landing page. The model response could not be parsed.");
  }
}

/**
 * Validate the API key by making a simple request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "user", content: "Hello" }
        ],
        max_tokens: 5,
        stream: false
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error validating SambaNova API key:", error);
    return false;
  }
}