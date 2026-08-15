import * as fs from 'fs';
import * as path from 'path';

// Define minimal interfaces for type safety based on the HAR specification
interface HarContent {
  size?: number;
  mimeType?: string;
  text?: string;
  encoding?: string;
  [key: string]: any;
}

interface HarResponse {
  status: number;
  statusText: string;
  content: HarContent;
  [key: string]: any;
}

interface HarEntry {
  startedDateTime: string;
  request: {
    url: string;
    method: string;
    [key: string]: any;
  };
  response: HarResponse;
  [key: string]: any;
}

interface HarRoot {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: HarEntry[];
    [key: string]: any;
  };
}

/**
 * Extracts only the response content from a HAR file and saves it to a new JSON file.
 * @param harFilePath Path to the input .har file
 * @param outputFilePath Path to the output .json file
 */
export function extractHarContent(rawData: string): any[] {
  try {
    // 1. Parse the HAR file
    const harData: HarRoot = JSON.parse(rawData);

    if (!harData.log || !Array.isArray(harData.log.entries)) {
      throw new Error('Invalid HAR file format: Missing "log.entries" array.');
    }

    // 2. Map through entries and extract only the content object (along with URL for context)
    const extractedContent = harData.log.entries.map((entry, index) => {
      const content = entry.response?.content || {};

      // Try to parse text as JSON if the mimeType suggests it
      let parsedText = content.text;
      if (content.mimeType && content.mimeType.includes('application/json') && content.text) {
        try {
          parsedText = JSON.parse(content.text);
        } catch (e) {
          // If parsing fails, keep it as raw text
        }
      }

      return parsedText;
    });

    // Return extracted content to the output JSON file
    return extractedContent;
  } catch (error: any) {
    console.error('Error processing HAR file:', error.message);
    return [];
  }
}