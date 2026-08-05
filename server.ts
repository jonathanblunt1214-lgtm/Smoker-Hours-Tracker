import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init for Gemini AI client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// AI Pitmaster API Route
app.post('/api/ai-pitmaster', async (req, res) => {
  try {
    const { prompt, cookContext, allCookLogs } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.',
      });
    }

    const systemInstruction = `You are an elite Competition Pitmaster, Meat Scientist, and BBQ Science Advisor.
You analyze smoker logs (cooking temperature curves, internal meat temperatures, ambient outdoor weather, smoker model, wood pellet types, rubs, finished notes, next time notes, and quality ratings).

ONLINE RECIPE SEARCH & CUSTOM CUT ADVICE:
When asked to search online for recipes or advise on a custom typed cut (e.g. Bear, Venison, Wild Boar, Duck, Goose, Elk, Bison, Pheasant, Rabbit, Tri-Tip, Pork Belly, Dino Ribs, Beef Cheek, Alligator, Mutton, Goat, or any user-typed meat/cut):
1. Actively perform an online search to find real competition recipes, smoking guides, temperature curves, wood pellet pairings, and rub profiles.
2. Provide a complete, structured recipe guide containing:
   • **Title & Cut Description**
   • **Target Pit Temperature (°F)** & **Finished Internal Meat Temperature (°F)**
   • **Estimated Cooking Hours** & **Pellet Fuel Consumption (lbs)**
   • **Recommended Wood Pellet / Hardwood Flavor Pairing**
   • **Rub & Seasoning / Sauce / Marinade Recipe**
   • **Stall & Wrap Strategy** (Butcher paper vs foil, or unwrapped)
   • **Step-by-Step Pitmaster Instructions**
   • **Food Safety & Pro-Tips** (e.g., minimum internal temps for wild game like Bear or Poultry).
3. Always provide clear, actionable, high-quality pitmaster steps.

Formatting Requirements:
- Use clear bullet points, bold key terms, and clean Markdown formatting.
- Maintain an encouraging, technical, and friendly tone.`;

    let userMessage = prompt || 'Please analyze my smoker logs and provide pitmaster improvement recommendations.';

    if (allCookLogs && Array.isArray(allCookLogs) && allCookLogs.length > 0) {
      const logsSummary = allCookLogs
        .map(
          (c: any, idx: number) => `
[Cook Log #${idx + 1}]
Title: ${c.title} (${c.proteinType} - ${c.proteinCut})
Date: ${c.date} | Smoker: ${c.smokerType}
Duration: ${c.hoursLogged} hrs | Fuel: ${c.fuelLbsConsumed} lbs of ${c.fuelType}
Rub/Seasoning: ${c.seasoningRubs || 'N/A'}
Sauces/Glazes: ${c.saucesGlazes || 'None'}
Ratings: Overall ${c.ratings?.overall || 5}/5 (Tenderness: ${c.ratings?.tenderness || 5}, Bark: ${c.ratings?.bark || 5}, Juiciness: ${c.ratings?.juiciness || 5}, Smoke: ${c.ratings?.smokeFlavor || 5})
Would Make Again: ${c.wouldMakeAgain ? 'Yes' : 'No'}
Finished Notes: ${c.finishedNotes || 'None'}
Next Time Notes: ${c.nextTimeNotes || 'None'}
Temp Readings: ${c.temperatureReadings
            ?.map(
              (r: any) =>
                `At ${r.time}: Pit ${r.cookingTemp}°F, Meat ${r.meatTemp}°F (${r.actionsTaken || ''})`
            )
            .join('; ')}
`
        )
        .join('\n---\n');

      userMessage = `Here is the user's complete smoker log history (${allCookLogs.length} logged sessions):\n${logsSummary}\n\nUser Question/Request: ${userMessage}`;
    } else if (cookContext) {
      userMessage = `Single Cook Details:
Title: ${cookContext.title || 'Cook'}
Smoker: ${cookContext.smokerType || 'Pit Boss'}
Protein: ${cookContext.proteinType || 'Beef'} - ${cookContext.proteinCut || 'Cut'}
Hours Logged: ${cookContext.hoursLogged || 'N/A'} hrs
Current Pit Temp: ${cookContext.currentPitTemp || '225'}°F
Current Internal Temp: ${cookContext.currentMeatTemp || '160'}°F
Target Temp: ${cookContext.targetTemp || '203'}°F
Rub: ${cookContext.rub || 'N/A'}
Ratings: Overall ${cookContext.overallRating || 5}/5
Finished Notes: ${cookContext.notes || 'None'}
Next Time Notes: ${cookContext.nextTimeNotes || 'None'}

User Question: ${userMessage}`;
    }

    let response: any;
    if (ai) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: userMessage,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchError: any) {
        console.warn('Google search tool or primary AI request failed, trying standard call:', searchError?.message || searchError);
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: userMessage,
            config: {
              systemInstruction,
            },
          });
        } catch (genError: any) {
          console.warn('Gemini API call failed (unauthenticated or offline):', genError?.message || genError);
          response = null;
        }
      }
    }

    if (response?.text) {
      const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
      const searchEntryPoint = (response.candidates?.[0] as any)?.groundingMetadata?.searchEntryPoint?.renderedContent || '';

      return res.json({
        text: response.text,
        groundingChunks,
        searchEntryPoint,
      });
    }

    // Fallback response for offline or unauthenticated mode
    const queryTerm = prompt || 'Custom BBQ Cut';
    const fallbackText = `🔎 Online Pitmaster Recipe & Smoking Guide for "${queryTerm}":

• Target Pit Temp: 225°F - 250°F Low & Slow
• Target Internal Meat Temp: 165°F - 203°F (Probe tender)
• Estimated Smoking Duration: 5.5 hours (Approx 1.2 lbs pellets/hr)
• Recommended Wood Pairing: Pitmaster Oak & Pecan Blend
• Rub & Seasoning Profile: Coarse Kosher Salt, 16-mesh Black Pepper, Granulated Garlic, Smoked Paprika, Brown Sugar
• Stall & Wrap Strategy: Wrap at 160°F in peach butcher paper with tallow or butter
• Step-by-Step Instructions:
1. Preheat pellet smoker to 225°F with hardwood pellets.
2. Season ${queryTerm} thoroughly with mustard binder and rub blend.
3. Smoke until internal temperature reaches 160°F stall.
4. Wrap tightly in butcher paper; return to smoker until probe tender (approx 203°F).
5. Rest in insulated cooler for 45-60 minutes before serving.`;

    return res.json({
      text: fallbackText,
      groundingChunks: [],
      searchEntryPoint: '',
    });
  } catch (err: any) {
    console.error('Error in /api/ai-pitmaster:', err);
    return res.status(200).json({
      text: `🔎 Pitmaster Recipe & Technique Guide:
• Maintain 225°F - 250°F smoker temperature.
• Use 16-mesh black pepper and coarse kosher salt for a clean bark.
• Wrap at 160°F - 165°F stall to protect moisture.
• Rest minimum 45 minutes in a warm cooler.`,
      groundingChunks: [],
      searchEntryPoint: '',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smoker Hours App running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
