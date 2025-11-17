/**
 * Bundles CSS and JavaScript files inline into HTML for deployment
 * This is necessary because the deployment system only serves single HTML files
 */

interface ProjectFile {
  name: string;
  content: string;
}

export function bundleFilesForDeployment(files: ProjectFile[]): string {
  // Find the main HTML file
  const htmlFile = files.find(f => f.name === 'index.html');
  if (!htmlFile) {
    throw new Error('No index.html file found in project');
  }

  let bundledHtml = htmlFile.content;

  // Find CSS files
  const cssFiles = files.filter(f => f.name.endsWith('.css'));
  const jsFiles = files.filter(f => f.name.endsWith('.js'));

  // Replace external CSS links with inline styles
  cssFiles.forEach(cssFile => {
    // Match both relative and absolute paths
    const linkPatterns = [
      // Standard link tag with href
      new RegExp(`<link[^>]*href=["']${cssFile.name}["'][^>]*>`, 'gi'),
      // Link tag with ./ prefix
      new RegExp(`<link[^>]*href=["']\\./${cssFile.name}["'][^>]*>`, 'gi'),
      // Link tag with / prefix
      new RegExp(`<link[^>]*href=["']/${cssFile.name}["'][^>]*>`, 'gi'),
    ];

    linkPatterns.forEach(pattern => {
      bundledHtml = bundledHtml.replace(pattern, () => {
        return `<style>
${cssFile.content}
</style>`;
      });
    });
  });

  // Replace external JS scripts with inline scripts
  jsFiles.forEach(jsFile => {
    // Match both relative and absolute paths
    const scriptPatterns = [
      // Standard script tag with src
      new RegExp(`<script[^>]*src=["']${jsFile.name}["'][^>]*>\\s*</script>`, 'gi'),
      // Script tag with ./ prefix
      new RegExp(`<script[^>]*src=["']\\./${jsFile.name}["'][^>]*>\\s*</script>`, 'gi'),
      // Script tag with / prefix
      new RegExp(`<script[^>]*src=["']/${jsFile.name}["'][^>]*>\\s*</script>`, 'gi'),
    ];

    scriptPatterns.forEach(pattern => {
      bundledHtml = bundledHtml.replace(pattern, (match) => {
        // Preserve any attributes like type="module" or defer
        const hasModule = match.includes('type="module"') || match.includes("type='module'");
        const hasDefer = match.includes('defer');
        const hasAsync = match.includes('async');
        
        let scriptTag = '<script';
        if (hasModule) scriptTag += ' type="module"';
        if (hasDefer) scriptTag += ' defer';
        if (hasAsync) scriptTag += ' async';
        scriptTag += '>';
        
        return `${scriptTag}
${jsFile.content}
</script>`;
      });
    });
  });

  // Handle component files (Web Components)
  const componentFiles = files.filter(f => 
    f.name.startsWith('components/') && f.name.endsWith('.js')
  );

  componentFiles.forEach(componentFile => {
    // Extract just the filename from the path
    const fileName = componentFile.name.split('/').pop() || componentFile.name;
    
    // Match script tags that reference component files
    const componentPatterns = [
      new RegExp(`<script[^>]*src=["']${componentFile.name}["'][^>]*>\\s*</script>`, 'gi'),
      new RegExp(`<script[^>]*src=["']\\./${componentFile.name}["'][^>]*>\\s*</script>`, 'gi'),
      new RegExp(`<script[^>]*src=["']/${componentFile.name}["'][^>]*>\\s*</script>`, 'gi'),
    ];

    componentPatterns.forEach(pattern => {
      bundledHtml = bundledHtml.replace(pattern, (match) => {
        const hasModule = match.includes('type="module"') || match.includes("type='module'");
        const hasDefer = match.includes('defer');
        const hasAsync = match.includes('async');
        
        let scriptTag = '<script';
        if (hasModule) scriptTag += ' type="module"';
        if (hasDefer) scriptTag += ' defer';
        if (hasAsync) scriptTag += ' async';
        scriptTag += '>';
        
        return `${scriptTag}
${componentFile.content}
</script>`;
      });
    });
  });

  // Also check for any @import statements in style tags and inline them
  const styleTagPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  bundledHtml = bundledHtml.replace(styleTagPattern, (match, styleContent) => {
    // Replace @import statements with actual CSS content
    const importPattern = /@import\s+["']([^"']+)["'];?/gi;
    let updatedStyle = styleContent.replace(importPattern, (importMatch: string, fileName: string) => {
      // Remove ./ or / prefix if present
      const cleanFileName = fileName.replace(/^\.?\//, '');
      const importedFile = files.find(f => f.name === cleanFileName);
      
      if (importedFile) {
        return importedFile.content;
      }
      // If file not found, keep the original @import
      return importMatch;
    });
    
    return `<style>${updatedStyle}</style>`;
  });

  // Clean up any duplicate style or script tags that might have been created
  // This is a simple deduplication based on content
  bundledHtml = deduplicateInlineAssets(bundledHtml);

  return bundledHtml;
}

/**
 * Remove duplicate inline style and script tags with identical content
 */
function deduplicateInlineAssets(html: string): string {
  // Track seen content
  const seenStyles = new Set<string>();
  const seenScripts = new Set<string>();

  // Deduplicate style tags
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, content) => {
    const trimmedContent = content.trim();
    if (seenStyles.has(trimmedContent)) {
      return ''; // Remove duplicate
    }
    seenStyles.add(trimmedContent);
    return match;
  });

  // Deduplicate script tags (be careful with scripts that should run multiple times)
  // Only deduplicate scripts that look like library/component definitions
  html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
    const trimmedContent = content.trim();
    
    // Check if this looks like a library or component definition (contains class/function definitions)
    const isLibraryCode = /^(class\s+|function\s+|const\s+|let\s+|var\s+)/.test(trimmedContent) ||
                         /customElements\.define/.test(trimmedContent);
    
    if (isLibraryCode && seenScripts.has(trimmedContent)) {
      return ''; // Remove duplicate library code
    }
    
    if (isLibraryCode) {
      seenScripts.add(trimmedContent);
    }
    
    return match;
  });

  return html;
}