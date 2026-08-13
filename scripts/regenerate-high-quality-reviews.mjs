import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GoogleGenAI } from '@google/genai';

// Requires: npm install @google/genai
// Ensure process.env.GEMINI_API_KEY is set!

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCRATCH = join(ROOT, 'scratch');

const ai = new GoogleGenAI();
const PROMPT = readFileSync(join(SCRATCH, 'reviewer_prompt.md'), 'utf8');

// We will export the raw arrays from gen-reader-reviews.mjs
// For now, here is how you process a single reader data object:

export async function generateHighQualityReview(readerData) {
  console.log(`Generating review for ${readerData.displayName} on ${readerData.platform}...`);
  
  const userPrompt = `
Here is the data for the psychic reader you are reviewing:
Platform: ${readerData.platformLabel}
Name: ${readerData.displayName}
Rating: ${readerData.rating}
Number of Readings: ${readerData.readings}
Active Since: ${readerData.sinceYear}
Specialties: ${readerData.specialty}
Pricing: ${readerData.pricing}
Free Offer: ${readerData.freeOffer}

Based on this data, write the review body following ALL constraints in the system prompt.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: userPrompt,
      config: {
        systemInstruction: PROMPT,
        temperature: 0.7
      }
    });
    
    return response.text;
  } catch (err) {
    console.error("Error generating content:", err);
    return null;
  }
}

// Example execution (uncomment and supply reader data to run):
/*
async function run() {
  const exampleReader = {
    slug: 'master-enigma-kasamba-review',
    displayName: 'Master Enigma',
    platform: 'kasamba',
    platformLabel: 'Kasamba',
    rating: 4.9,
    readings: 355543,
    sinceYear: 2007,
    specialty: 'Psychic Readings, Dream Analysis, Love Psychics, Fortune Telling',
    pricing: '$11.99/min chat',
    freeOffer: '3 free minutes + 50% off'
  };
  
  const markdownBody = await generateHighQualityReview(exampleReader);
  console.log(markdownBody);
}
run();
*/
