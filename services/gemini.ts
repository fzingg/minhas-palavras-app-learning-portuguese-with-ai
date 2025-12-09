// Gemini AI service for generating example sentences
// Get your API key from: https://makersuite.google.com/app/apikey

const GEMINI_API_KEY = 'AIzaSyDFMW2t4IereW7pLvMTDvx9erfPO7p-A30'; // Replace with your actual key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

export async function generateExampleSentences(
  portugueseWord: string,
  frenchTranslation: string,
  count: number = 4
): Promise<string[]> {
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Please configure your Gemini API key in services/gemini.ts');
  }

  const prompt = `Generate ${count} different example sentences in Portuguese using the word or expression "${portugueseWord}" (which means "${frenchTranslation}" in French).

Requirements:
- Each sentence should be simple and useful for a language learner
- Use everyday vocabulary
- Make each sentence unique and different from the others
- Return ONLY the Portuguese sentences, one per line, numbered 1-${count}
- Do not include translations or explanations
- Format:
1. [sentence]
2. [sentence]
...`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Parse numbered sentences (e.g., "1. sentence" or "1) sentence")
    const sentences = generatedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(line => line.length > 0);

    return sentences;
  } catch (error: any) {
    console.error('Gemini error:', error);
    throw new Error(error.message || 'Failed to generate example sentences');
  }
}

export interface StoryResult {
  story: string;
  usedWords: { portuguese: string; french: string }[];
}

export async function generateStory(
  words: { portuguese: string; french: string }[]
): Promise<StoryResult> {
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Please configure your Gemini API key in services/gemini.ts');
  }

  // Select a random subset of words (15-25 words) to include in the story
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, Math.min(25, Math.max(15, Math.floor(words.length * 0.3))));

  const wordList = selectedWords.map(w => `${w.portuguese} (${w.french})`).join(', ');

  const prompt = `Write a short story in Portuguese (around 4000 characters) that incorporates the following vocabulary words naturally:

${wordList}

Requirements:
- Write ONLY in Portuguese
- The story should be simple enough for a language learner (B1-B2 level)
- Use everyday situations and simple sentence structures
- You can use other common Portuguese words to make the story flow naturally
- Make the story engaging and interesting (could be about daily life, a trip, a meeting, etc.)
- The story should be around 4000 characters long
- Do NOT include any translations or explanations
- Do NOT include a title, just start directly with the story
- Use paragraph breaks to make it readable
- Do NOT use any markdown formatting (no bold, no italics, no asterisks)`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Remove any markdown formatting (asterisks, underscores for bold/italic)
    const cleanedText = generatedText
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/__/g, '')   // Remove underscore bold
      .replace(/_/g, ' ');  // Replace underscore italic with space

    return {
      story: cleanedText,
      usedWords: selectedWords,
    };
  } catch (error: any) {
    console.error('Gemini error:', error);
    throw new Error(error.message || 'Failed to generate story');
  }
}
