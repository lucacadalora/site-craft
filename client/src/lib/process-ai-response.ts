import { ProjectFile } from '@/contexts/ProjectContext';

interface ParsedFile {
  path: string;
  content: string;
  action: 'create' | 'update' | 'search_replace';
}

interface ParsedResponse {
  projectName?: string;
  files: ParsedFile[];
  error?: string;
}

export function processAiResponse(response: string): ParsedResponse {
  const result: ParsedResponse = {
    files: []
  };

  // Extract project name if present
  const projectNameMatch = response.match(/<<<<<<\s*PROJECT_NAME_START\s*([\s\S]*?)\s*>>>>>>>\s*PROJECT_NAME_END/);
  if (projectNameMatch) {
    result.projectName = projectNameMatch[1].trim();
  }

  // Parse NEW_FILE sections
  const newFileRegex = /<<<<<<\s*NEW_FILE_START\s*(.*?)\s*>>>>>>>\s*NEW_FILE_END\s*```[a-z]*\n([\s\S]*?)```/g;
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

  // Parse UPDATE_FILE sections
  const updateFileRegex = /<<<<<<\s*UPDATE_FILE_START\s*(.*?)\s*>>>>>>>\s*UPDATE_FILE_END\s*```[a-z]*\n([\s\S]*?)```/g;
  
  while ((match = updateFileRegex.exec(response)) !== null) {
    const fileName = match[1].trim();
    const content = match[2];
    
    if (fileName && content) {
      result.files.push({
        path: fileName,
        content: content.trim(),
        action: 'update'
      });
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
        path: 'styles.css',
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

export function convertToProjectFiles(parsedFiles: ParsedFile[]): ProjectFile[] {
  return parsedFiles.map(file => ({
    name: file.path,
    content: file.content,
    language: getFileLanguage(file.path)
  }));
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