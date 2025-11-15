import { Page } from "@shared/schema";
import {
  DIVIDER,
  NEW_FILE_END,
  NEW_FILE_START,
  REPLACE_END,
  SEARCH_START,
  UPDATE_FILE_END,
  UPDATE_FILE_START,
} from "./prompts";

/**
 * Escape special regex characters in a string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create a flexible HTML regex that accounts for whitespace variations
 */
export const createFlexibleHtmlRegex = (searchBlock: string): RegExp => {
  let searchRegex = escapeRegExp(searchBlock)
    .replace(/\s+/g, '\\s*')
    .replace(/>\s*</g, '>\\s*<')
    .replace(/\s*>/g, '\\s*>');
  
  return new RegExp(searchRegex, 'g');
};

/**
 * Process AI response chunk and apply updates to pages
 * Returns updated pages and updated line numbers
 */
export interface ProcessAiResponseResult {
  updatedPages: Page[];
  updatedLines: number[][];
}

export const processAiResponse = (
  chunk: string,
  pages: Page[]
): ProcessAiResponseResult => {
  const updatedLines: number[][] = [];
  const updatedPages = [...pages];

  // Process UPDATE_FILE blocks
  const updateFileRegex = new RegExp(
    `${UPDATE_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)\\s*${UPDATE_FILE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${UPDATE_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${NEW_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`,
    'g'
  );
  let updateFileMatch;

  while ((updateFileMatch = updateFileRegex.exec(chunk)) !== null) {
    const [, filePath, fileContent] = updateFileMatch;

    const pageIndex = updatedPages.findIndex(p => p.path === filePath);
    if (pageIndex !== -1) {
      let pageHtml = updatedPages[pageIndex].html;

      let processedContent = fileContent;
      const htmlMatch = fileContent.match(/```html\s*([\s\S]*?)\s*```/);
      if (htmlMatch) {
        processedContent = htmlMatch[1];
      }
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
          pageHtml = `${replaceBlock}\n${pageHtml}`;
          updatedLines.push([1, replaceBlock.split("\n").length]);
        } else {
          const regex = createFlexibleHtmlRegex(searchBlock);
          const match = regex.exec(pageHtml);

          if (match) {
            const matchedText = match[0];
            const beforeText = pageHtml.substring(0, match.index);
            const startLineNumber = beforeText.split("\n").length;
            const replaceLines = replaceBlock.split("\n").length;
            const endLineNumber = startLineNumber + replaceLines - 1;

            updatedLines.push([startLineNumber, endLineNumber]);
            pageHtml = pageHtml.replace(matchedText, replaceBlock);
          }
        }

        position = replaceEndIndex + REPLACE_END.length;
      }

      updatedPages[pageIndex].html = pageHtml;
    }
  }

  // Process NEW_FILE blocks
  const newFileRegex = new RegExp(
    `${NEW_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)\\s*${NEW_FILE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${UPDATE_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${NEW_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`,
    'g'
  );
  let newFileMatch;

  while ((newFileMatch = newFileRegex.exec(chunk)) !== null) {
    const [, filePath, fileContent] = newFileMatch;

    // Validate file path (prevent directory traversal)
    const normalizedPath = filePath.replace(/^\/+/, '').replace(/\.\./g, '');
    
    let fileData = fileContent;
    // Try to extract content from code blocks
    const htmlMatch = fileContent.match(/```html\s*([\s\S]*?)\s*```/);
    const cssMatch = fileContent.match(/```css\s*([\s\S]*?)\s*```/);
    const jsMatch = fileContent.match(/```javascript\s*([\s\S]*?)\s*```/);

    if (htmlMatch) {
      fileData = htmlMatch[1];
    } else if (cssMatch) {
      fileData = cssMatch[1];
    } else if (jsMatch) {
      fileData = jsMatch[1];
    }

    const existingFileIndex = updatedPages.findIndex(p => p.path === normalizedPath);

    if (existingFileIndex !== -1) {
      updatedPages[existingFileIndex] = {
        path: normalizedPath,
        html: fileData.trim()
      };
    } else {
      updatedPages.push({
        path: normalizedPath,
        html: fileData.trim()
      });
    }
  }

  // Fallback: process SEARCH/REPLACE blocks without UPDATE_FILE wrapper (backward compatibility)
  if (updatedPages.length === pages.length && !chunk.includes(UPDATE_FILE_START)) {
    let position = 0;
    let moreBlocks = true;
    let newHtml = updatedPages[0]?.html || "";

    while (moreBlocks) {
      const searchStartIndex = chunk.indexOf(SEARCH_START, position);
      if (searchStartIndex === -1) {
        moreBlocks = false;
        continue;
      }

      const dividerIndex = chunk.indexOf(DIVIDER, searchStartIndex);
      if (dividerIndex === -1) {
        moreBlocks = false;
        continue;
      }

      const replaceEndIndex = chunk.indexOf(REPLACE_END, dividerIndex);
      if (replaceEndIndex === -1) {
        moreBlocks = false;
        continue;
      }

      const searchBlock = chunk.substring(
        searchStartIndex + SEARCH_START.length,
        dividerIndex
      );
      const replaceBlock = chunk.substring(
        dividerIndex + DIVIDER.length,
        replaceEndIndex
      );

      if (searchBlock.trim() === "") {
        newHtml = `${replaceBlock}\n${newHtml}`;
      } else {
        const regex = createFlexibleHtmlRegex(searchBlock);
        const match = regex.exec(newHtml);

        if (match) {
          const matchedText = match[0];
          newHtml = newHtml.replace(matchedText, replaceBlock);
        }
      }

      position = replaceEndIndex + REPLACE_END.length;
    }

    if (updatedPages[0]) {
      updatedPages[0].html = newHtml;
    }
  }

  return {
    updatedPages,
    updatedLines,
  };
};

/**
 * Extract project name from AI response
 */
export const extractProjectName = (response: string): string | null => {
  const PROJECT_NAME_START = "<<<<<<< PROJECT_NAME_START";
  const PROJECT_NAME_END = ">>>>>>> PROJECT_NAME_END";
  
  const startIndex = response.indexOf(PROJECT_NAME_START);
  if (startIndex === -1) return null;
  
  const endIndex = response.indexOf(PROJECT_NAME_END, startIndex);
  if (endIndex === -1) return null;
  
  const projectName = response.substring(
    startIndex + PROJECT_NAME_START.length,
    endIndex
  ).trim();
  
  return projectName || null;
};

/**
 * Parse complete AI response into pages
 */
export const parseAiResponse = (response: string): Page[] => {
  const pages: Page[] = [];
  
  // Process NEW_FILE blocks
  const newFileRegex = new RegExp(
    `${NEW_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)\\s*${NEW_FILE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${NEW_FILE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`,
    'g'
  );
  let newFileMatch;

  while ((newFileMatch = newFileRegex.exec(response)) !== null) {
    const [, filePath, fileContent] = newFileMatch;

    // Validate and normalize file path
    const normalizedPath = filePath.replace(/^\/+/, '').replace(/\.\./g, '');
    
    let fileData = fileContent;
    // Try to extract content from code blocks
    const htmlMatch = fileContent.match(/```html\s*([\s\S]*?)\s*```/);
    const cssMatch = fileContent.match(/```css\s*([\s\S]*?)\s*```/);
    const jsMatch = fileContent.match(/```javascript\s*([\s\S]*?)\s*```/);

    if (htmlMatch) {
      fileData = htmlMatch[1];
    } else if (cssMatch) {
      fileData = cssMatch[1];
    } else if (jsMatch) {
      fileData = jsMatch[1];
    }

    pages.push({
      path: normalizedPath,
      html: fileData.trim()
    });
  }

  return pages;
};
