/**
 * Bundles CSS and JavaScript files inline into HTML for deployment
 * This is necessary because the deployment system only serves single HTML files
 */

interface ProjectFile {
  name: string;
  content: string;
}

// Detect if code contains React patterns
const detectReact = (code: string): boolean => {
  const reactPatterns = [
    /import\s+(?:React|{[^}]*})\s+from\s+['"]react['"]/,
    /from\s+['"]react['"]/,
    /React\.createElement/,
    /React\.Component/,
    /ReactDOM\.render/,
    /ReactDOM\.createRoot/,
    /<[A-Z][a-zA-Z]*(?:\s|>|\/>)/,  // JSX components (uppercase)
    /className=/,  // React uses className instead of class
    /onClick=/,    // React event handlers
    /useState\(/,
    /useEffect\(/,
    /export\s+default\s+(?:function|class|const)/
  ];
  
  return reactPatterns.some(pattern => pattern.test(code));
};

// Detect libraries from imports
const detectLibraries = (code: string): Set<string> => {
  const libraries = new Set<string>();
  const importRegex = /import\s+(?:[\s\S]*?)from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const lib = match[1];
    
    // Map common library imports to their CDN requirements
    if (lib.includes('react-router') || lib.includes('wouter')) {
      libraries.add('react-router');
    }
    if (lib.includes('@mui/material') || lib.includes('@material-ui')) {
      libraries.add('material-ui');
    }
    if (lib.includes('antd')) {
      libraries.add('antd');
    }
    if (lib.includes('axios')) {
      libraries.add('axios');
    }
    if (lib.includes('lodash')) {
      libraries.add('lodash');
    }
    if (lib.includes('date-fns')) {
      libraries.add('date-fns');
    }
    if (lib.includes('moment')) {
      libraries.add('moment');
    }
    if (lib.includes('framer-motion')) {
      libraries.add('framer-motion');
    }
    if (lib.includes('recharts')) {
      libraries.add('recharts');
    }
    if (lib.includes('chart.js')) {
      libraries.add('chartjs');
    }
    if (lib.includes('three')) {
      libraries.add('threejs');
    }
    if (lib.includes('@emotion') || lib.includes('styled-components')) {
      libraries.add('styled-components');
    }
  }
  
  return libraries;
};

// Generate CDN links for detected libraries
const generateLibraryCDNs = (libraries: Set<string>): string => {
  let cdnLinks = '';
  
  const cdnMap: Record<string, string> = {
    'react-router': `
  <!-- React Router -->
  <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>`,
    'material-ui': `
  <!-- Material-UI -->
  <script crossorigin src="https://unpkg.com/@mui/material@latest/umd/material-ui.production.min.js"></script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />`,
    'antd': `
  <!-- Ant Design -->
  <script crossorigin src="https://unpkg.com/antd@5/dist/antd.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/antd@5/dist/reset.css" />`,
    'axios': `
  <!-- Axios -->
  <script src="https://unpkg.com/axios/dist/axios.min.js"></script>`,
    'lodash': `
  <!-- Lodash -->
  <script src="https://unpkg.com/lodash@4/lodash.min.js"></script>`,
    'date-fns': `
  <!-- Date-fns -->
  <script src="https://unpkg.com/date-fns@2/index.js"></script>`,
    'moment': `
  <!-- Moment.js -->
  <script src="https://unpkg.com/moment@2/moment.min.js"></script>`,
    'framer-motion': `
  <!-- Framer Motion -->
  <script crossorigin src="https://unpkg.com/framer-motion@10/dist/framer-motion.js"></script>`,
    'recharts': `
  <!-- Recharts -->
  <script crossorigin src="https://unpkg.com/recharts@2/dist/Recharts.js"></script>`,
    'chartjs': `
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`,
    'threejs': `
  <!-- Three.js -->
  <script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>`,
    'styled-components': `
  <!-- Styled Components -->
  <script crossorigin src="https://unpkg.com/styled-components@5/dist/styled-components.min.js"></script>`
  };
  
  libraries.forEach(lib => {
    if (cdnMap[lib]) {
      cdnLinks += cdnMap[lib];
    }
  });
  
  return cdnLinks;
};

// Process JavaScript code for React deployment
const processReactCode = (jsFile: ProjectFile): string => {
  let content = jsFile.content;
  
  // Strip TypeScript type annotations if present
  if (jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.ts')) {
    // Remove type imports
    content = content.replace(/^import\s+type\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
    // Remove interface declarations
    content = content.replace(/^interface\s+\w+\s*{[^}]*}/gm, '');
    // Remove type aliases
    content = content.replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '');
    // Remove type annotations from parameters and variables
    content = content.replace(/:\s*[\w\[\]<>,\s|&{}]+(?=[,\)])/g, '');
    content = content.replace(/:\s*[\w\[\]<>,\s|&{}]+(?=\s*[=;])/g, '');
    // Remove generic type parameters
    content = content.replace(/<[\w\s,]+>(?=\()/g, '');
    // Remove 'as' type assertions
    content = content.replace(/\s+as\s+[\w\[\]<>,\s|&{}]+/g, '');
  }
  
  // Remove ES6 module imports
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  
  // Handle various export patterns
  content = content.replace(/^export\s+default\s+function\s+(\w+)/gm, 'function $1');
  content = content.replace(/^export\s+default\s+class\s+(\w+)/gm, 'class $1');
  content = content.replace(/^export\s+default\s+const\s+(\w+)/gm, 'const $1');
  content = content.replace(/^export\s+default\s+(\w+);?\s*$/gm, '// Default export: $1');
  content = content.replace(/^export\s+default\s+(\(|{)/gm, 'const App = $1');
  content = content.replace(/^export\s+default\s+/gm, 'const App = ');
  content = content.replace(/^export\s+{[^}]+}(?:\s+from\s+['"][^'"]+['"])?[^;]*;?\s*$/gm, '');
  content = content.replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ');
  content = content.replace(/^module\.exports\s*=\s*/gm, 'const App = ');
  content = content.replace(/^exports\.\w+\s*=\s*/gm, '');
  
  return content;
};

// Generate React-compatible HTML for deployment
const generateReactHTML = (jsCode: string, cssCode: string): string => {
  // Detect what libraries are needed
  const detectedLibraries = detectLibraries(jsCode);
  const additionalCDNs = generateLibraryCDNs(detectedLibraries);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  
  <!-- React and ReactDOM from CDN (production builds for deployment) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Babel Standalone for JSX transformation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <!-- Lucide React Icons -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  ${additionalCDNs}
  
  <style>
    ${cssCode}
    
    /* Base styles for React apps */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    // Initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
      const icons = lucide.icons;
      window.LucideIcons = {};
      Object.keys(icons).forEach(name => {
        const iconData = icons[name];
        window.LucideIcons[name] = (props) => {
          return React.createElement('svg', {
            ...props,
            xmlns: 'http://www.w3.org/2000/svg',
            width: props.size || 24,
            height: props.size || 24,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: props.strokeWidth || 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            dangerouslySetInnerHTML: { __html: iconData }
          });
        };
      });
      
      // Map common icon names to globals
      const iconNames = [
        'ArrowRight', 'TrendingUp', 'Activity', 'Globe', 'Shield', 'Zap',
        'BarChart3', 'PieChart', 'Layers', 'Menu', 'X', 'ChevronRight', 
        'ChevronDown', 'Briefcase', 'Landmark', 'Cpu', 'ArrowUpRight',
        'MousePointer2', 'Check', 'ChevronLeft', 'Search', 'Settings',
        'User', 'Users', 'Home', 'FileText', 'Calendar', 'Mail', 'Phone'
      ];
      
      iconNames.forEach(name => {
        if (window.LucideIcons[name]) {
          window[name] = window.LucideIcons[name];
        }
      });
    }
    
    // Import React hooks and utilities
    const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer, useLayoutEffect, memo, forwardRef, createContext } = React;
    const Fragment = React.Fragment;
    
    ${jsCode}
    
    // Auto-detect and render the main component
    (function() {
      let MainComponent = null;
      
      // Common component names to check
      const componentNames = ['App', 'Main', 'Component', 'Application', 'Root', 
                              'Dashboard', 'Home', 'Index', 'LuminaApp', 'MyApp'];
      
      for (const name of componentNames) {
        if (typeof window[name] !== 'undefined') {
          const candidate = window[name];
          if (typeof candidate === 'function' || 
              (typeof candidate === 'object' && candidate && candidate.$$typeof)) {
            MainComponent = candidate;
            break;
          }
        }
      }
      
      // If not found, try to find any React component
      if (!MainComponent) {
        const globalKeys = Object.keys(window).filter(key => {
          try {
            return typeof window[key] === 'function' && 
                   key[0] === key[0].toUpperCase() &&
                   key !== 'React' && 
                   key !== 'ReactDOM' &&
                   !key.startsWith('Lucide') &&
                   !key.includes('Icon') &&
                   !key.startsWith('use');
          } catch (e) {
            return false;
          }
        });
        
        for (const key of globalKeys) {
          try {
            const candidate = window[key];
            const fnString = candidate.toString();
            
            if (fnString.includes('return') && 
                (fnString.includes('React.createElement') || 
                 fnString.includes('jsx') ||
                 fnString.includes('<') ||
                 fnString.includes('div') ||
                 fnString.includes('span'))) {
              MainComponent = candidate;
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
      
      if (MainComponent) {
        try {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(MainComponent));
        } catch (error) {
          console.error('Error rendering React component:', error);
          document.getElementById('root').innerHTML = \`
            <div style="padding: 20px; font-family: monospace; color: red;">
              <h2>React Render Error</h2>
              <p>\${error.message}</p>
              <pre style="background: #f0f0f0; padding: 10px; color: #333; overflow: auto;">
\${error.stack}
              </pre>
            </div>
          \`;
        }
      } else {
        document.getElementById('root').innerHTML = \`
          <div style="padding: 20px; font-family: monospace; color: red;">
            <h2>React Component Not Found</h2>
            <p>Please ensure your React component is defined properly.</p>
          </div>
        \`;
      }
    })();
  </script>
</body>
</html>`;
};

export function bundleFilesForDeployment(files: ProjectFile[]): string {
  // Check if this is a React project
  const jsFiles = files.filter(f => 
    f.name.endsWith('.js') || 
    f.name.endsWith('.jsx') || 
    f.name.endsWith('.tsx') || 
    f.name.endsWith('.ts')
  );
  
  const allJsCode = jsFiles.map(f => f.content).join('\n');
  const isReactProject = jsFiles.length > 0 && detectReact(allJsCode);
  
  if (isReactProject) {
    // Handle React project deployment
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    
    // Combine all CSS
    let combinedCss = '';
    cssFiles.forEach(cssFile => {
      combinedCss += `\n/* ${cssFile.name} */\n${cssFile.content}\n`;
    });
    
    // Process and combine all JavaScript/TypeScript files
    let combinedJs = '';
    
    // Sort files to ensure App.js/jsx/tsx comes first if it exists
    const sortedJsFiles = [...jsFiles].sort((a, b) => {
      const aIsApp = a.name.toLowerCase().includes('app');
      const bIsApp = b.name.toLowerCase().includes('app');
      if (aIsApp && !bIsApp) return -1;
      if (!aIsApp && bIsApp) return 1;
      return 0;
    });
    
    sortedJsFiles.forEach(jsFile => {
      const processedContent = processReactCode(jsFile);
      combinedJs += `\n// ${jsFile.name}\n${processedContent}\n`;
    });
    
    // Generate React HTML with all dependencies
    return generateReactHTML(combinedJs, combinedCss);
  }
  
  // Original bundling logic for non-React projects
  const htmlFile = files.find(f => f.name === 'index.html');
  if (!htmlFile) {
    throw new Error('No index.html file found in project');
  }

  let bundledHtml = htmlFile.content;

  // Find CSS and JS files for HTML bundling
  const cssFiles = files.filter(f => f.name.endsWith('.css'));
  const htmlJsFiles = files.filter(f => f.name.endsWith('.js'));

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
  htmlJsFiles.forEach(jsFile => {
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