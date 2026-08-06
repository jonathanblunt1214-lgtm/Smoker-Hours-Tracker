import { RecipeSuggestion } from '../data/recipeSuggestions';
import { AI_PITMASTER_NAME } from '../constants/appName';
import { ProteinType } from '../types';

export function parseWebSearchResultToRecipe(webText: string, searchCut: string): RecipeSuggestion {
  // Extract Target Pit Temp
  const pitMatch = webText.match(/(?:Target Pit Temp(?:erature)?|Pit Temp|Pit Temperature):\s*(\d+)/i) || webText.match(/(\d{3})\s*°?\s*F\s*(?:pit|smoker)/i) || webText.match(/2\d{2}/);
  const targetPitTemp = pitMatch ? parseInt(pitMatch[1] || pitMatch[0], 10) : 225;

  // Extract Target Internal Temp
  const meatMatch = webText.match(/(?:Target (?:Finished )?Internal(?: Meat)? Temp(?:erature)?|Internal Temp|Finished Temp):\s*(\d+)/i) || webText.match(/(\d{3})\s*°?\s*F\s*(?:internal|finished|meat)/i);
  const targetMeatTemp = meatMatch ? parseInt(meatMatch[1], 10) : 165;

  // Extract Wrap Temp if any
  const wrapMatch = webText.match(/(?:Wrap|Stall)[^:\d]*(\d{3})\s*°?\s*F/i);
  const wrapTemp = wrapMatch ? parseInt(wrapMatch[1], 10) : 160;

  // Extract Hours
  const hoursMatch = webText.match(/(?:Estimated (?:Smoking )?Duration|Smoking Duration|Cook Time):\s*([\d.]+)/i) || webText.match(/([\d.]+)\s*hours?/i);
  const estHours = hoursMatch ? parseFloat(hoursMatch[1]) : 5.5;

  // Extract Wood
  const woodMatch = webText.match(/(?:Recommended Wood(?:\/Pellet)? Pairing|Wood Pairing|Pellet Pairing):\s*([^\n]+)/i) || webText.match(/(?:Oak|Hickory|Pecan|Apple|Cherry|Mesquite)\s*(?:wood|pellet|blend)[^\n]*/i);
  const recommendedWood = woodMatch ? woodMatch[1]?.trim() || woodMatch[0].trim() : 'Pitmaster Oak & Pecan Pellet Blend';

  // Extract Rub
  const rubMatch = webText.match(/(?:Rub & Seasoning|Seasoning|Rub Profile):\s*([^\n]+)/i);
  const rubIngredients = rubMatch ? rubMatch[1].trim() : 'Coarse Kosher Salt, 16-Mesh Black Pepper, Granulated Garlic, Smoked Paprika, Brown Sugar';

  // Determine protein type
  const cutLower = searchCut.toLowerCase();
  let proteinType: ProteinType = 'Wild Game';
  if (cutLower.includes('beef') || cutLower.includes('brisket') || cutLower.includes('ribeye') || cutLower.includes('tri-tip') || cutLower.includes('oxtail') || cutLower.includes('cheek')) {
    proteinType = 'Beef';
  } else if (cutLower.includes('pork') || cutLower.includes('butt') || cutLower.includes('ribs') || cutLower.includes('belly')) {
    proteinType = 'Pork';
  } else if (cutLower.includes('chicken') || cutLower.includes('thigh') || cutLower.includes('wing')) {
    proteinType = 'Chicken';
  } else if (cutLower.includes('turkey')) {
    proteinType = 'Turkey';
  } else if (cutLower.includes('lamb') || cutLower.includes('mutton') || cutLower.includes('goat')) {
    proteinType = 'Lamb';
  } else if (cutLower.includes('fish') || cutLower.includes('salmon') || cutLower.includes('shrimp') || cutLower.includes('seafood')) {
    proteinType = 'Seafood';
  } else if (cutLower.includes('venison') || cutLower.includes('deer')) {
    proteinType = 'Venison';
  } else if (cutLower.includes('bear')) {
    proteinType = 'Bear';
  } else if (cutLower.includes('boar')) {
    proteinType = 'Wild Boar';
  } else if (cutLower.includes('duck') || cutLower.includes('goose') || cutLower.includes('waterfowl')) {
    proteinType = 'Duck';
  } else if (cutLower.includes('bison') || cutLower.includes('buffalo')) {
    proteinType = 'Bison';
  } else if (cutLower.includes('elk')) {
    proteinType = 'Elk';
  } else if (cutLower.includes('pheasant')) {
    proteinType = 'Pheasant';
  } else if (cutLower.includes('rabbit')) {
    proteinType = 'Rabbit';
  }

  // Extract steps
  const steps: string[] = [];
  const lines = webText.split('\n');
  let capturingSteps = false;
  for (const line of lines) {
    if (/Step-by-Step|Instructions|Key Steps|Pitmaster Steps/i.test(line)) {
      capturingSteps = true;
      continue;
    }
    if (capturingSteps) {
      if (/Pro-Tips|Safety|Grounded Web Sources|Target|Recommended/i.test(line) && steps.length > 0) {
        capturingSteps = false;
      } else if (line.trim().length > 5 && (/^[\d•\-*]/.test(line.trim()) || line.trim().startsWith('.'))) {
        steps.push(line.replace(/^[\d•\-*\s.]+/, '').trim());
      }
    }
  }

  if (steps.length === 0) {
    steps.push(
      `Preheat pellet smoker to ${targetPitTemp}°F with ${recommendedWood}.`,
      `Trim excess silver skin or hard fat from ${searchCut}. Apply mustard binder and rub thoroughly.`,
      `Load onto smoker rack. Smoke low and slow until internal temp reaches ${wrapTemp}°F stall.`,
      `Wrap tightly in peach butcher paper or foil with tallow/butter to protect moisture.`,
      `Continue cooking until internal probe-tender temp reaches ${targetMeatTemp}°F.`,
      `Rest in insulated cooler for minimum 45-60 minutes before slicing across the grain.`
    );
  }

  const formattedTitle = searchCut.charAt(0).toUpperCase() + searchCut.slice(1);

  return {
    id: `web-recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: `Online Competition Recipe: ${formattedTitle}`,
    proteinType,
    proteinCut: `${formattedTitle} Cut`,
    difficulty: 'Intermediate',
    estHours: Math.max(1, Math.min(18, estHours)),
    targetPitTemp,
    targetMeatTemp,
    wrapTemp,
    recommendedWood,
    estPelletsLbs: Math.round(estHours * 1.2 * 10) / 10,
    rubIngredients,
    description: `Real-time web-searched competition smoking guide for ${formattedTitle}, fetched via Google Search and grounded online.`,
    keySteps: steps,
    proTip: `Online Research Advice: Maintain steady pit ambient temp and probe for tender texture rather than time alone.`,
    prepTimeMinutes: 20,
    flavorProfile: `Smoky ${formattedTitle} with ${recommendedWood}`,
    tags: ['🌐 Web Search Recipe', formattedTitle, `${AI_PITMASTER_NAME} Grounded`],
  };
}

export function loadSavedWebRecipes(): RecipeSuggestion[] {
  try {
    const raw = localStorage.getItem('smoker_web_recipes');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load web recipes from localStorage', e);
    return [];
  }
}

export function saveWebRecipe(recipe: RecipeSuggestion): RecipeSuggestion[] {
  try {
    const current = loadSavedWebRecipes();
    // Avoid duplicates by title/cut
    const filtered = current.filter((r) => r.title.toLowerCase() !== recipe.title.toLowerCase());
    const updated = [recipe, ...filtered].slice(0, 30); // limit to 30 for low memory usage
    localStorage.setItem('smoker_web_recipes', JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save web recipe to localStorage', e);
    return [];
  }
}
