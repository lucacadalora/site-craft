// Enhanced prompt rewriting using Cerebras API
// Adapted from v3's rewrite-prompt.ts

export async function rewritePrompt(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/cerebras/enhance-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('Failed to enhance prompt');
    }

    const data = await response.json();
    return data.enhancedPrompt || prompt;
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    // Return original prompt if enhancement fails
    return prompt;
  }
}
