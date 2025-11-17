import { ProjectFile } from '@/contexts/ProjectContext';

interface ParsedFile {
  path: string;
  content: string;
  action: 'create' | 'update' | 'search_replace';
  searchReplaceBlocks?: Array<{
    search: string;
    replace: string;
  }>;
}

interface ParsedResponse {
  projectName?: string;
  files: ParsedFile[];
  error?: string;
}

// Constants matching server/prompts.ts markers
const SEARCH_START = "<<<<<<< SEARCH";
const DIVIDER = "=======";
const REPLACE_END = ">>>>>>> REPLACE";

// Escape special regex characters
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Create flexible regex for HTML/CSS/JS matching
const createFlexibleRegex = (searchBlock: string): RegExp => {
  let searchRegex = escapeRegExp(searchBlock)
    .replace(/\s+/g, '\\s*')
    .replace(/>\s*</g, '>\\s*<')
    .replace(/\s*>/g, '\\s*>');
  
  // Don't use 'g' flag with exec() to avoid state issues
  return new RegExp(searchRegex);
};

export function processAiResponse(response: string): ParsedResponse {
  const result: ParsedResponse = {
    files: []
  };

  // Extract project name if present (7 '<' characters to match prompts)
  const projectNameMatch = response.match(/<<<<<<<\s*PROJECT_NAME_START\s*([\s\S]*?)\s*>>>>>>>\s*PROJECT_NAME_END/);
  if (projectNameMatch) {
    result.projectName = projectNameMatch[1].trim();
  }

  // Parse NEW_FILE sections (7 '<' and '>' characters to match prompts)
  const newFileRegex = /<<<<<<<\s*NEW_FILE_START\s*(.*?)\s*>>>>>>>\s*NEW_FILE_END\s*```[a-z]*\n([\s\S]*?)```/g;
  let match;
  
  while ((match = newFileRegex.exec(response)) !== null) {
    const fileName = match[1].trim();
    const content = match[2];
    
    if (fileName && content) {
      result.files.push({
        path: fileName,
        content: content.trim(),
        action: 'create'
      });
    }
  }

  // Parse UPDATE_FILE sections with SEARCH/REPLACE support (7 '<' and '>' characters to match prompts)
  const updateFileRegex = /<<<<<<<\s*UPDATE_FILE_START\s*(.*?)\s*>>>>>>>\s*UPDATE_FILE_END([\s\S]*?)(?=<<<<<<<\s*(?:UPDATE_FILE_START|NEW_FILE_START)|$)/g;
  
  while ((match = updateFileRegex.exec(response)) !== null) {
    const fileName = match[1].trim();
    const updateContent = match[2];
    
    if (fileName && updateContent) {
      // Check if content has SEARCH/REPLACE blocks
      if (updateContent.includes(SEARCH_START)) {
        // Parse SEARCH/REPLACE blocks
        const searchReplaceBlocks: Array<{search: string; replace: string}> = [];
        let position = 0;
        
        while (position < updateContent.length) {
          const searchStartIndex = updateContent.indexOf(SEARCH_START, position);
          if (searchStartIndex === -1) break;
          
          const dividerIndex = updateContent.indexOf(DIVIDER, searchStartIndex);
          if (dividerIndex === -1) break;
          
          const replaceEndIndex = updateContent.indexOf(REPLACE_END, dividerIndex);
          if (replaceEndIndex === -1) break;
          
          const searchBlock = updateContent.substring(
            searchStartIndex + SEARCH_START.length,
            dividerIndex
          ).trim();
          
          const replaceBlock = updateContent.substring(
            dividerIndex + DIVIDER.length,
            replaceEndIndex
          ).trim();
          
          searchReplaceBlocks.push({
            search: searchBlock,
            replace: replaceBlock
          });
          
          position = replaceEndIndex + REPLACE_END.length;
        }
        
        result.files.push({
          path: fileName,
          content: '',  // Content will be generated from search/replace
          action: 'search_replace',
          searchReplaceBlocks
        });
      } else {
        // Direct content replacement (backward compatibility)
        const codeMatch = updateContent.match(/```[a-z]*\n([\s\S]*?)```/);
        if (codeMatch) {
          result.files.push({
            path: fileName,
            content: codeMatch[1].trim(),
            action: 'update'
          });
        }
      }
    }
  }

  // If no files found with markers, try to extract code blocks directly
  if (result.files.length === 0) {
    // Look for HTML code blocks
    const htmlMatch = response.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) {
      result.files.push({
        path: 'index.html',
        content: htmlMatch[1].trim(),
        action: 'create'
      });
    }

    // Look for CSS code blocks
    const cssMatch = response.match(/```css\n([\s\S]*?)```/);
    if (cssMatch) {
      result.files.push({
        path: 'style.css',
        content: cssMatch[1].trim(),
        action: 'create'
      });
    }

    // Look for JavaScript code blocks
    const jsMatch = response.match(/```(?:javascript|js)\n([\s\S]*?)```/);
    if (jsMatch) {
      result.files.push({
        path: 'script.js',
        content: jsMatch[1].trim(),
        action: 'create'
      });
    }
  }

  return result;
}

export function convertToProjectFiles(
  parsedFiles: ParsedFile[], 
  existingFiles?: ProjectFile[]
): ProjectFile[] {
  const resultFiles: ProjectFile[] = [];
  
  for (const file of parsedFiles) {
    if (file.action === 'search_replace' && file.searchReplaceBlocks) {
      // Apply search/replace to existing file
      const existingFile = existingFiles?.find(f => f.name === file.path);
      
      if (existingFile) {
        let content = existingFile.content;
        
        // Apply each search/replace block
        for (const block of file.searchReplaceBlocks) {
          if (block.search === '') {
            // Insert at beginning
            content = block.replace + '\n' + content;
          } else {
            try {
              // Create flexible regex for matching
              const regex = createFlexibleRegex(block.search);
              const match = regex.exec(content);
              
              if (match) {
                content = content.replace(match[0], block.replace);
                console.log(`✏️ Applied SEARCH/REPLACE to ${file.path}`);
              } else {
                // Try exact replacement as fallback
                const replacedContent = content.replace(block.search, block.replace);
                if (replacedContent !== content) {
                  content = replacedContent;
                  console.log(`✏️ Applied exact replacement to ${file.path}`);
                } else {
                  console.warn(`⚠️ SEARCH/REPLACE failed for ${file.path} - pattern not found`);
                  console.warn('Search pattern first 200 chars:', block.search.substring(0, 200) + (block.search.length > 200 ? '...' : ''));
                  // Log first 500 chars of the file content for debugging
                  console.warn('File content first 500 chars:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
                  // Suggest possible issue
                  console.warn('💡 Tip: The AI may have hallucinated content. Try regenerating or provide more specific instructions.');
                }
              }
            } catch (error) {
              console.error(`❌ Error applying SEARCH/REPLACE to ${file.path}:`, error);
              // Continue with next block instead of freezing
            }
          }
        }
        
        resultFiles.push({
          name: file.path,
          content,
          language: getFileLanguage(file.path)
        });
      } else {
        // File doesn't exist yet, create with empty content
        console.warn(`Cannot apply search/replace to non-existent file: ${file.path}`);
        resultFiles.push({
          name: file.path,
          content: '',
          language: getFileLanguage(file.path)
        });
      }
    } else {
      // Create or update file directly
      resultFiles.push({
        name: file.path,
        content: file.content,
        language: getFileLanguage(file.path)
      });
    }
  }
  
  return resultFiles;
}

function getFileLanguage(fileName: string): ProjectFile['language'] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'html';
    case 'css': return 'css';
    case 'js': 
    case 'javascript': return 'javascript';
    default: return 'unknown';
  }
}