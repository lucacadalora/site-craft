// Parser for AI responses to extract multi-file project structure

import {
  DIVIDER,
  NEW_FILE_END,
  NEW_FILE_START,
  REPLACE_END,
  SEARCH_START,
  UPDATE_FILE_END,
  UPDATE_FILE_START,
  PROJECT_NAME_START,
  PROJECT_NAME_END,
} from "./prompts";

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProcessAiResponseResult {
  projectName: string;
  files: ProjectFile[];
  updatedLines?: number[][];
}

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
  
  return new RegExp(searchRegex, 'g');
};

export const processAiResponse = (
  chunk: string,
  existingFiles: ProjectFile[] = []
): ProcessAiResponseResult => {
  const updatedLines: number[][] = [];
  const files = [...existingFiles];
  let projectName = "Untitled Project";

  // Extract project name
  const projectNameMatch = chunk.match(
    new RegExp(`${escapeRegExp(PROJECT_NAME_START)}\\s*([^\\n]+?)\\s*${escapeRegExp(PROJECT_NAME_END)}`)
  );
  if (projectNameMatch) {
    projectName = projectNameMatch[1].trim();
  }

  // Process NEW_FILE blocks
  const newFileRegex = new RegExp(
    `${escapeRegExp(NEW_FILE_START)}([^\\s]+)\\s*${escapeRegExp(NEW_FILE_END)}([\\s\\S]*?)(?=${escapeRegExp(UPDATE_FILE_START)}|${escapeRegExp(NEW_FILE_START)}|$)`,
    'g'
  );
  
  let newFileMatch;
  while ((newFileMatch = newFileRegex.exec(chunk)) !== null) {
    const [, filePath, fileContent] = newFileMatch;
    
    let content = fileContent;
    // Extract content from code blocks
    const htmlMatch = fileContent.match(/```html\s*([\s\S]*?)\s*```/);
    const cssMatch = fileContent.match(/```css\s*([\s\S]*?)\s*```/);
    const jsMatch = fileContent.match(/```(?:javascript|js)\s*([\s\S]*?)\s*```/);
    
    if (htmlMatch) {
      content = htmlMatch[1];
    } else if (cssMatch) {
      content = cssMatch[1];
    } else if (jsMatch) {
      content = jsMatch[1];
    }
    
    // Check if file already exists
    const existingIndex = files.findIndex(f => f.path === filePath);
    
    if (existingIndex !== -1) {
      // Replace existing file
      files[existingIndex] = {
        path: filePath,
        content: content.trim()
      };
    } else {
      // Add new file
      files.push({
        path: filePath,
        content: content.trim()
      });
    }
  }

  // Process UPDATE_FILE blocks for follow-up edits
  const updateFileRegex = new RegExp(
    `${escapeRegExp(UPDATE_FILE_START)}([^\\s]+)\\s*${escapeRegExp(UPDATE_FILE_END)}([\\s\\S]*?)(?=${escapeRegExp(UPDATE_FILE_START)}|${escapeRegExp(NEW_FILE_START)}|$)`,
    'g'
  );
  
  let updateFileMatch;
  while ((updateFileMatch = updateFileRegex.exec(chunk)) !== null) {
    const [, filePath, fileContent] = updateFileMatch;
    
    const fileIndex = files.findIndex(f => f.path === filePath);
    if (fileIndex !== -1) {
      let fileText = files[fileIndex].content;
      
      let processedContent = fileContent;
      const codeMatch = fileContent.match(/```(?:html|css|javascript|js)\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        processedContent = codeMatch[1];
      }
      
      // Process SEARCH/REPLACE blocks within the file
      let position = 0;
      let moreBlocks = true;
      
      while (moreBlocks) {
        const searchStartIndex = processedContent.indexOf(SEARCH_START, position);
        if (searchStartIndex === -1) {
          moreBlocks = false;
          continue;
        }
        
        const dividerIndex = processedContent.indexOf(DIVIDER, searchStartIndex);
        if (dividerIndex === -1) {
          moreBlocks = false;
          continue;
        }
        
        const replaceEndIndex = processedContent.indexOf(REPLACE_END, dividerIndex);
        if (replaceEndIndex === -1) {
          moreBlocks = false;
          continue;
        }
        
        const searchBlock = processedContent.substring(
          searchStartIndex + SEARCH_START.length,
          dividerIndex
        );
        const replaceBlock = processedContent.substring(
          dividerIndex + DIVIDER.length,
          replaceEndIndex
        );
        
        if (searchBlock.trim() === "") {
          // Insert at beginning
          fileText = `${replaceBlock}\n${fileText}`;
          updatedLines.push([1, replaceBlock.split("\n").length]);
        } else {
          // Replace existing content
          const regex = createFlexibleRegex(searchBlock);
          const match = regex.exec(fileText);
          
          if (match) {
            const matchedText = match[0];
            const beforeText = fileText.substring(0, match.index);
            const startLineNumber = beforeText.split("\n").length;
            const replaceLines = replaceBlock.split("\n").length;
            const endLineNumber = startLineNumber + replaceLines - 1;
            
            updatedLines.push([startLineNumber, endLineNumber]);
            fileText = fileText.replace(matchedText, replaceBlock);
          }
        }
        
        position = replaceEndIndex + REPLACE_END.length;
      }
      
      files[fileIndex].content = fileText;
    }
  }

  return { projectName, files, updatedLines };
};

// Convert files to downloadable format
export const filesToDownload = (files: ProjectFile[]): Blob => {
  const boundary = '----FormBoundary' + Math.random().toString(36);
  let multipart = '';
  
  files.forEach(file => {
    multipart += `--${boundary}\r\n`;
    multipart += `Content-Disposition: attachment; filename="${file.path}"\r\n`;
    multipart += `Content-Type: ${getContentType(file.path)}\r\n\r\n`;
    multipart += file.content + '\r\n';
  });
  
  multipart += `--${boundary}--`;
  
  return new Blob([multipart], { type: `multipart/form-data; boundary=${boundary}` });
};

const getContentType = (path: string): string => {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'text/javascript';
  if (path.endsWith('.json')) return 'application/json';
  return 'text/plain';
};