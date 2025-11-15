import { Template, Settings } from "@shared/schema";

/**
 * Generates HTML for a landing page based on the template and settings
 */
export function generateHtml(
  template: Template,
  settings: Settings,
  content: {
    title: string;
    description: string;
    sections: Array<{
      type: string;
      heading?: string;
      content?: string;
      items?: Array<{
        title: string;
        description: string;
      }>;
    }>;
  }
): string {
  // This is a fallback generator for when LLM is not used
  // It simply uses the template HTML and replaces placeholders
  
  let html = template.html;
  
  // Replace title and description
  html = html.replace(/{{title}}/g, content.title);
  html = html.replace(/{{description}}/g, content.description);
  
  // Process sections
  content.sections.forEach((section, index) => {
    // Replace section placeholders based on type
    if (section.type === "hero") {
      html = html.replace(
        `{{hero_heading}}`,
        section.heading || "Welcome to our Landing Page"
      );
      html = html.replace(
        `{{hero_content}}`,
        section.content || "This is a great product that solves your problems."
      );
    } else if (section.type === "features") {
      html = html.replace(
        `{{features_heading}}`,
        section.heading || "Our Features"
      );
      
      // Replace feature items if available
      let featuresHtml = "";
      if (section.items && section.items.length > 0) {
        section.items.forEach(item => {
          featuresHtml += `
            <div class="feature">
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            </div>
          `;
        });
      } else {
        featuresHtml = `
          <div class="feature">
            <h3>Feature 1</h3>
            <p>Description of feature 1</p>
          </div>
          <div class="feature">
            <h3>Feature 2</h3>
            <p>Description of feature 2</p>
          </div>
        `;
      }
      
      html = html.replace(`{{features_items}}`, featuresHtml);
    }
    // Add more section types as needed
  });
  
  return html;
}

/**
 * Generates CSS for a landing page based on the template and settings
 */
export function generateCss(template: Template, settings: Settings): string {
  let css = template.css;
  
  // Replace color variables
  css = css.replace(/--primary-color:\s*[^;]+;/g, `--primary-color: ${settings.colors.primary};`);
  
  // Replace font
  css = css.replace(/font-family:\s*[^;]+;/g, `font-family: '${settings.font}', sans-serif;`);
  
  // Adjust layout based on settings
  if (settings.layout === "centered") {
    css += `
      .container {
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
      }
    `;
  } else if (settings.layout === "full-width") {
    css += `
      .container {
        max-width: 100%;
        padding-left: 2rem;
        padding-right: 2rem;
      }
    `;
  } else if (settings.layout === "split") {
    css += `
      @media (min-width: 768px) {
        .hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
      }
    `;
  }
  
  return css;
}
