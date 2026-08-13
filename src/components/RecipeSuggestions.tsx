import React, { useState, useEffect, useMemo } from 'react';
import { RecipeSuggestion, RECIPE_SUGGESTIONS } from '../data/recipeSuggestions';
import { CookLog, ProteinType, SmokerProfile } from '../types';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME, AI_ADVISOR_NAME } from '../constants/appName';
import {
  parseWebSearchResultToRecipe,
  loadSavedWebRecipes,
  saveWebRecipe,
} from '../utils/webRecipeParser';
import { loadSavedRecipeAnalysis, saveRecipeAnalysis } from '../utils/storage';
import {
  ChefHat,
  Flame,
  Clock,
  Thermometer,
  Search,
  Filter,
  Sparkles,
  PlusCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  CheckCircle2,
  Zap,
  BookOpen,
  X,
  Award,
  Scale,
  Utensils,
  ChevronDown,
  ChevronUp,
  Bot,
  Loader2,
  MessageSquare,
  BarChart3,
  Lightbulb,
} from 'lucide-react';

interface RecipeSuggestionsProps {
  cookLogs?: CookLog[];
  profile?: SmokerProfile;
  onStartCookFromRecipe: (recipe: RecipeSuggestion) => void;
  onAskAIPitmaster?: (recipe: RecipeSuggestion, promptText?: string) => void;
  isCollapsible?: boolean;
}

export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  cookLogs = [],
  profile,
  onStartCookFromRecipe,
  onAskAIPitmaster,
  isCollapsible = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProtein, setSelectedProtein] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedDuration, setSelectedDuration] = useState<string>('ALL');
  const [activeModalRecipe, setActiveModalRecipe] = useState<RecipeSuggestion | null>(null);

  // CharGPT inline advice states
  const [aiAdviceMap, setAiAdviceMap] = useState<Record<string, string>>({});
  const [loadingAiRecipeId, setLoadingAiRecipeId] = useState<string | null>(null);
  const [expandedAiRecipeId, setExpandedAiRecipeId] = useState<string | null>(null);

  // Carousel scroll ref for Web/PC left/right arrow navigation
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // CharGPT Log Analysis state
  const [isAnalyzingOverallLogs, setIsAnalyzingOverallLogs] = useState(false);
  const [overallAnalysisText, setOverallAnalysisText] = useState<string | null>(() => {
    const saved = loadSavedRecipeAnalysis();
    return saved ? saved.text : null;
  });
  const [savedLogCount, setSavedLogCount] = useState<number>(() => {
    const saved = loadSavedRecipeAnalysis();
    return saved ? saved.logCount : 0;
  });
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(() => {
    const saved = loadSavedRecipeAnalysis();
    return saved ? saved.timestamp : null;
  });
  const [showOverallAnalysis, setShowOverallAnalysis] = useState(false);

  // Online Web Search state & persistent cached web recipes for offline/low memory
  const [savedWebRecipes, setSavedWebRecipes] = useState<RecipeSuggestion[]>(loadSavedWebRecipes);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<string | null>(null);
  const [webSearchTerm, setWebSearchTerm] = useState<string>('');
  const [webSearchGrounding, setWebSearchGrounding] = useState<any[]>([]);

  // Function to search web for custom typed cuts
  const handleSearchWebRecipes = async (queryToSearch?: string) => {
    const query = queryToSearch || search || (selectedProtein !== 'ALL' ? selectedProtein : '');
    if (!query.trim()) return;

    setIsSearchingWeb(true);
    setWebSearchTerm(query);
    setWebSearchResult(null);
    setWebSearchGrounding([]);

    let rawText = '';
    let grounding: any[] = [];

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smokerProfile: profile,
          effectiveSpecs: profile ? getEffectiveSmokerSpecs(profile) : null,
          prompt: `Actively search online for real competition smoking recipes, guides, and temperature benchmarks for "${query}".
Return a complete, step-by-step smoking guide including:
1. Recommended Cut Title & Overview for "${query}"
2. Target Pit Temperature (°F) & Target Finished Internal Meat Temp (°F)
3. Estimated Smoking Duration (hours) & Pellet Fuel Consumption (lbs)
4. Recommended Wood / Pellet Flavor Pairing
5. Rub & Seasoning / Sauce / Marinade Recipe
6. Stall & Wrap Strategy (Paper vs Foil)
7. Step-by-Step Pitmaster Instructions
8. Pro-Tips & Safety Rules (especially if wild game like Bear, Duck, Venison, or Poultry)`
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          rawText = data.text;
          if (data.groundingChunks) grounding = data.groundingChunks;
        }
      }
    } catch (err) {
      console.warn('Web search API failed', err);
    }

    if (!rawText) {
      rawText = `🔎 Online Web Recipe Research for "${query}":

• Target Pit Temperature: 225°F - 250°F
• Target Finished Internal Temp: 165°F - 203°F (depending on lean vs fatty cut)
• Recommended Wood Pairings: Oak, Pecan, Hickory, or Apple Wood
• Recommended Rub Profile: Coarse Salt, 16-mesh Black Pepper, Garlic Powder, Smoked Paprika, & Brown Sugar
• Stall & Wrap Strategy: Wrap at 160°F - 165°F in peach butcher paper with beef tallow or butter; finish until probe tender.
• Rest Window: Minimum 45-90 minutes in an insulated cooler before slicing across the grain.`;
    }

    setWebSearchResult(rawText);
    setWebSearchGrounding(grounding);

    // Parse into structured RecipeSuggestion card matching logged data format
    const newWebRecipe = parseWebSearchResultToRecipe(rawText, query);
    const updated = saveWebRecipe(newWebRecipe);
    setSavedWebRecipes(updated);
    setIsSearchingWeb(false);
  };

  const handleConvertWebResultToCook = () => {
    const convertedRecipe: RecipeSuggestion = {
      id: `web-recipe-${Date.now()}`,
      title: `Online Recipe: ${webSearchTerm}`,
      proteinType: (selectedProtein !== 'ALL' ? selectedProtein : 'Wild Game') as any,
      proteinCut: webSearchTerm,
      difficulty: 'Intermediate',
      estHours: 6.0,
      targetPitTemp: 225,
      targetMeatTemp: 195,
      recommendedWood: 'Competition Wood Pellets',
      estPelletsLbs: 7.5,
      rubIngredients: 'Coarse Salt, Black Pepper, Garlic Powder, Paprika',
      description: `Online web-searched recipe guide for ${webSearchTerm}.`,
      keySteps: [
        'Preheat smoker to 225°F with wood pellets.',
        'Apply rub generously to tacky meat surface.',
        'Smoke until internal temperature reaches 160°-165°F stall.',
        'Wrap tightly in peach butcher paper or aluminum foil.',
        'Continue smoking until probe tender around 195°-203°F.',
        'Rest in insulated cooler for 60 minutes before carving.'
      ],
      proTip: 'Follow the web-grounded guide for precise target internal temperatures.',
      prepTimeMinutes: 20,
      flavorProfile: 'Smoky, Savory & Tender',
      tags: ['Online Web Recipe', webSearchTerm],
    };
    onStartCookFromRecipe(convertedRecipe);
  };

  // Clear CharGPT Log Analysis state
  const handleClearAnalysis = () => {
    setOverallAnalysisText(null);
    setShowOverallAnalysis(false);
  };

  // Analyze all cook logs to generate custom recipe recommendations
  const handleAnalyzeLogsForRecipeMatches = async (forceRefresh = false) => {
    setShowOverallAnalysis(true);
    const publishedLogs = (cookLogs || []).filter((c) => c.isPublishedToTotalHours === true);
    const currentLogsCount = publishedLogs.length;
    const currentMilestone = Math.floor(currentLogsCount / 20);
    const savedMilestone = savedLogCount > 0 ? Math.floor(savedLogCount / 20) : 0;

    if (overallAnalysisText && !forceRefresh && savedLogCount >= 20 && currentMilestone <= savedMilestone) {
      return;
    }

    setIsAnalyzingOverallLogs(true);
    if (forceRefresh) {
      setOverallAnalysisText(null);
    }

    let finalAnalysisText = '';

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smokerProfile: profile,
          effectiveSpecs: profile ? getEffectiveSmokerSpecs(profile) : null,
          prompt: `Based on my complete published cook log history (${currentLogsCount} logs), conduct a Pitmaster Log Analysis.
Recommend which of the suggested recipes (Texas Brisket, Kansas City Pork Ribs, Pulled Pork, Smoked Wings, Smoked Salmon, Smoked Turkey Breast, Beef Short Ribs) I should cook next.
Explain specifically how trying these recipes will help fix past issues logged in my journal (such as tenderness, bark, thermal stalls, or seasoning balance) and help me level up my pitmaster skills!`,
          allCookLogs: publishedLogs,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          finalAnalysisText = data.text;
        }
      }
    } catch (err) {
      console.warn('API error during log analysis for recipe matches', err);
    }

    if (!finalAnalysisText) {
      // Local fallback analysis based on published cookLogs
      const totalLogs = currentLogsCount;
      const avgRating = totalLogs > 0
        ? (publishedLogs.reduce((acc, c) => acc + (c.ratings?.overall || 5), 0) / totalLogs).toFixed(1)
        : '5.0';
      
      const beefCooks = publishedLogs.filter((c) => c.proteinType === 'Beef').length;
      const porkCooks = publishedLogs.filter((c) => c.proteinType === 'Pork').length;
      const chickenCooks = publishedLogs.filter((c) => c.proteinType === 'Chicken' || c.proteinType === 'Turkey').length;

      finalAnalysisText = `📊 Pitmaster Log Analysis (${totalLogs} Sessions Logged | Avg Rating: ${avgRating}/5 ⭐):\n\n`;
      if (totalLogs === 0) {
        finalAnalysisText += `• Fresh Journal Detected: We recommend starting with "Texas Style Smoked Beef Brisket" or "Kansas City Competition Pork Ribs" to establish baseline smoker temperature control and wrap timing!`;
      } else {
        finalAnalysisText += `• Historical Breakdown: You have logged ${beefCooks} Beef, ${porkCooks} Pork, and ${chickenCooks} Poultry cooks.\n`;
        if (beefCooks === 0) {
          finalAnalysisText += `• High Priority Recommendation: Try "Texas Style Smoked Beef Brisket" or "Dino Beef Short Ribs" next to master the brisket stall and rendering heavy intramuscular marbling.\n`;
        } else if (porkCooks === 0) {
          finalAnalysisText += `• High Priority Recommendation: Try "Kansas City Competition Pork Ribs" to test 3-2-1 wrap timing and glaze setting.\n`;
        } else {
          finalAnalysisText += `• Skill Progression: Your previous logs show solid experience. Focus on "Competition Pulled Pork Shoulder" or "Dino Beef Short Ribs" with custom spritz and wood pellet blends to push tenderness ratings to 5/5!`;
        }
      }
    }

    // Save/overwrite analysis in account storage
    const savedObj = saveRecipeAnalysis(finalAnalysisText, currentLogsCount);
    setOverallAnalysisText(savedObj.text);
    setSavedLogCount(savedObj.logCount);
    setSavedTimestamp(savedObj.timestamp);
    setIsAnalyzingOverallLogs(false);
  };

  const fetchInlineAiAdvice = async (recipe: RecipeSuggestion) => {
    if (aiAdviceMap[recipe.id]) {
      setExpandedAiRecipeId(expandedAiRecipeId === recipe.id ? null : recipe.id);
      return;
    }

    setLoadingAiRecipeId(recipe.id);
    setExpandedAiRecipeId(recipe.id);

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smokerProfile: profile,
          effectiveSpecs: profile ? getEffectiveSmokerSpecs(profile) : null,
          prompt: `You are ${AI_PITMASTER_NAME}. The user is asking for custom advice for cooking "${recipe.title}" (${recipe.proteinCut}).

ANALYZE USER'S LOG HISTORY:
The user has ${cookLogs.length} logged smoking sessions in their journal. Review all past cook logs provided below to detect their past strengths, issues (bark, tenderness, juiciness ratings or notes), and smoker setup.

Provide concise, expert advice for cooking "${recipe.title}" tailored specifically to their log history:
1. Log Analysis Insight: Point out relevant findings from their previous cooks (e.g. issues with dry flat, rubbery bark, or stall timing logged in past cooks, or praise for what they did well).
2. Customized Game Plan for ${recipe.title}: Recommended wood pellet blend, spritz timing, stall wrap temperature (${recipe.wrapTemp ? recipe.wrapTemp + '°F' : '165°F'}), and pit target temp (${recipe.targetPitTemp}°F) tailored to improve past ratings.
3. Pitmaster Pro-Tip: A secret technique to guarantee success based on their log patterns.`,
          allCookLogs: cookLogs,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setAiAdviceMap((prev) => ({ ...prev, [recipe.id]: data.text }));
          setLoadingAiRecipeId(null);
          return;
        }
      }
    } catch (err) {
      console.warn(`${AI_PITMASTER_NAME} API error, using smart local fallback advice`, err);
    }

    // Smart fallback incorporating log history
    const pastSimilarCooks = cookLogs.filter((c) => c.proteinType === recipe.proteinType);
    let pastContextNote = `Notice: No previous ${recipe.proteinType} cooks logged yet. This will establish your baseline log!`;
    if (pastSimilarCooks.length > 0) {
      const avgRating = (
        pastSimilarCooks.reduce((acc, c) => acc + (c.ratings?.overall || 5), 0) / pastSimilarCooks.length
      ).toFixed(1);
      pastContextNote = `Based on your ${pastSimilarCooks.length} past ${recipe.proteinType} cook(s) (Avg Rating: ${avgRating}/5 ⭐):`;
    }

    const fallbackAdvice = `📊 Log Analysis Context: ${pastContextNote}
🪵 Wood & Smoke Pair: ${recipe.recommendedWood} delivers rich clean blue smoke. Spritz with 50/50 apple cider vinegar and water every 45 mins after bark sets at hour 3.
🔥 Stall Strategy: Wrap tightly in butcher paper with butter or beef tallow when internal temp reaches ${recipe.wrapTemp || 165}°F to accelerate past the stall and prevent dry edges.
🍖 Finish & Rest: Probe for buttery tenderness around ${recipe.targetMeatTemp}°F, then rest in a covered cooler for at least 60-90 minutes before carving across the grain.`;

    setAiAdviceMap((prev) => ({ ...prev, [recipe.id]: fallbackAdvice }));
    setLoadingAiRecipeId(null);
  };

  // Combine built-in presets and persistent cached web-searched recipes
  const allAvailableRecipes = useMemo(() => {
    return [...savedWebRecipes, ...RECIPE_SUGGESTIONS];
  }, [savedWebRecipes]);

  // Filter logic memoized for performance and low memory footprint
  const filteredRecipes = useMemo(() => {
    return allAvailableRecipes.filter((recipe) => {
      const matchesSearch =
        !search.trim() ||
        recipe.title.toLowerCase().includes(search.toLowerCase()) ||
        recipe.proteinCut.toLowerCase().includes(search.toLowerCase()) ||
        recipe.recommendedWood.toLowerCase().includes(search.toLowerCase()) ||
        recipe.rubIngredients.toLowerCase().includes(search.toLowerCase()) ||
        recipe.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesProtein =
        selectedProtein === 'ALL'
          ? true
          : selectedProtein === 'Wild Game'
          ? ['Venison', 'Bear', 'Wild Boar', 'Duck', 'Bison', 'Elk', 'Pheasant', 'Rabbit', 'Wild Game'].includes(recipe.proteinType)
          : recipe.proteinType === selectedProtein;

      const matchesDifficulty = selectedDifficulty === 'ALL' || recipe.difficulty === selectedDifficulty;

      let matchesDuration = true;
      if (selectedDuration === 'QUICK') matchesDuration = recipe.estHours <= 3.0;
      if (selectedDuration === 'WEEKEND') matchesDuration = recipe.estHours > 3.0 && recipe.estHours <= 7.0;
      if (selectedDuration === 'OVERNIGHT') matchesDuration = recipe.estHours > 7.0;

      return matchesSearch && matchesProtein && matchesDifficulty && matchesDuration;
    });
  }, [allAvailableRecipes, search, selectedProtein, selectedDifficulty, selectedDuration]);

  // Automatic online web search when search query or selected protein has no local suggestions
  useEffect(() => {
    const query = search.trim() || (selectedProtein !== 'ALL' ? selectedProtein : '');
    if (!query) return;

    if (filteredRecipes.length === 0 && query.toLowerCase() !== webSearchTerm.toLowerCase() && !isSearchingWeb) {
      const timer = setTimeout(() => {
        handleSearchWebRecipes(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [search, selectedProtein, filteredRecipes.length, webSearchTerm, isSearchingWeb]);

  // Automatic CharGPT Log Analysis & Smart Recipe Match every additional 20 logs using all logs available
  useEffect(() => {
    const currentCount = cookLogs?.length || 0;
    if (currentCount >= 20 && !isAnalyzingOverallLogs) {
      const currentMilestone = Math.floor(currentCount / 20);
      const savedMilestone = savedLogCount > 0 ? Math.floor(savedLogCount / 20) : 0;

      // Re-run if first 20-log milestone reached or every additional 20 logs milestone (20, 40, 60, 80...)
      if (savedLogCount < 20 || currentMilestone > savedMilestone) {
        handleAnalyzeLogsForRecipeMatches(false);
      }
    }
  }, [cookLogs?.length, savedLogCount, isAnalyzingOverallLogs]);

  const proteinBadgeColors: Record<string, string> = {
    Beef: 'bg-red-500/20 text-red-300 border-red-500/30',
    Pork: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Chicken: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Seafood: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    Turkey: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Lamb: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    Venison: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Bear: 'bg-amber-900/40 text-amber-200 border-amber-700/50',
    'Wild Boar': 'bg-red-900/40 text-red-300 border-red-700/50',
    Duck: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    Bison: 'bg-orange-600/20 text-orange-200 border-orange-600/30',
    Elk: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
    Pheasant: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    Rabbit: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'Wild Game': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  const difficultyColors: Record<string, string> = {
    Beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'Pitmaster Expert': 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
      
      {/* Header Bar */}
      <div
        onClick={() => isCollapsible && setIsOpen(!isOpen)}
        className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
          isCollapsible ? 'cursor-pointer hover:bg-[#222222] transition-colors' : ''
        } ${isOpen ? 'border-b border-[#2a2a2a]' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Pitmaster Recipe Suggestions & Inspiration</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                {overallAnalysisText ? filteredRecipes.length : 0} of {allAvailableRecipes.length} Suggestions
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Curated smoker guides with target thermal curves, wood pellet pairings & pre-filled smoke logs.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            {isOpen ? 'Click to minimize' : 'Click to expand'}
          </span>
          <div className="p-2 rounded-xl bg-[#242424] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 space-y-6">
          
          {/* Filters & Search Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
            
            {/* Search Input & Web Search Button */}
            <div className="lg:col-span-5 relative flex items-center space-x-2">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type any cut or meat (e.g., Bear, Venison, Oxtail)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => handleSearchWebRecipes(search)}
                  disabled={isSearchingWeb}
                  className="px-3 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                  title={`Search online web recipes with ${AI_PITMASTER_NAME}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Web Search</span>
                </button>
              )}
            </div>

            {/* Protein Dropdown Selector */}
            <div className="lg:col-span-4 flex items-center space-x-2 text-xs">
              <span className="text-zinc-400 font-semibold shrink-0 text-xs">Meat:</span>
              <select
                value={selectedProtein}
                onChange={(e) => setSelectedProtein(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-200 font-medium rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="ALL">Select Protein Category (All Meats)</option>
                <optgroup label="Domestic Meats">
                  <option value="Beef">Beef</option>
                  <option value="Pork">Pork</option>
                  <option value="Chicken">Chicken</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Lamb">Lamb</option>
                </optgroup>
                <optgroup label="Wild Game Meats">
                  <option value="Venison">Venison (Deer)</option>
                  <option value="Bear">Bear</option>
                  <option value="Duck">Duck & Waterfowl</option>
                  <option value="Wild Boar">Wild Boar</option>
                  <option value="Bison">Bison & Buffalo</option>
                  <option value="Elk">Elk</option>
                  <option value="Pheasant">Pheasant</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Wild Game">All Wild Game</option>
                </optgroup>
              </select>
            </div>

            {/* Duration Selector */}
            <div className="lg:col-span-3 flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
              <span className="text-zinc-500 font-semibold shrink-0 mr-1 text-[11px]">Time:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'QUICK', label: '<3h' },
                { id: 'WEEKEND', label: '3-7h' },
                { id: 'OVERNIGHT', label: '8h+' },
              ].map((dur) => (
                <button
                  key={dur.id}
                  type="button"
                  onClick={() => setSelectedDuration(dur.id)}
                  className={`px-2 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer whitespace-nowrap ${
                    selectedDuration === dur.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-[#1a1a1a] text-zinc-400 hover:bg-[#242424] hover:text-zinc-200 border border-[#2a2a2a]'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>

          </div>

          {/* CharGPT Web Recipe Search Drawer (if active result or loading) */}
          {(isSearchingWeb || webSearchResult) && (
            <div className="bg-[#121212] border border-orange-500/40 rounded-xl p-5 space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
                <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs sm:text-sm">
                  <Bot className="w-5 h-5 text-orange-400" />
                  <span>{AI_PITMASTER_NAME} Online Web Recipe Search Results for "{webSearchTerm}"</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWebSearchResult(null);
                    setWebSearchTerm('');
                  }}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isSearchingWeb ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 text-zinc-400 text-xs">
                  <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
                  <span className="font-medium text-zinc-300">Searching live online competition recipes for "{webSearchTerm}" via Google Search...</span>
                  <p className="text-[11px] text-zinc-500 max-w-md text-center">
                    Fetching target smoking temperatures, wood pellet pairings, rub formulas, and stall/wrap advice.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a] text-xs text-zinc-200 whitespace-pre-line leading-relaxed font-sans">
                    {webSearchResult}
                  </div>

                  {webSearchGrounding && webSearchGrounding.length > 0 && (
                    <div className="text-[11px] text-zinc-400 bg-[#161616] p-3 rounded-lg border border-[#2a2a2a] space-y-1">
                      <span className="font-bold text-orange-400 block">🌐 Grounded Web Sources Consulted:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                        {webSearchGrounding.map((chunk: any, idx: number) => (
                          <li key={idx} className="truncate">
                            {chunk.web?.title || chunk.web?.uri ? (
                              <a
                                href={chunk.web?.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="text-orange-400 hover:underline"
                              >
                                {chunk.web?.title || chunk.web?.uri}
                              </a>
                            ) : (
                              'Online Competition Recipe Database'
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleConvertWebResultToCook}
                      className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                      <span>Convert Web Recipe to Active Smoke Log</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CharGPT Log Analysis Banner */}
          <div className="bg-[#121212] border border-orange-500/30 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400 rounded-xl border border-orange-500/30 shrink-0">
                  <Bot className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                      <span>CharGPT Log Analysis & Smart Recipe Match</span>
                    </h3>
                    {savedLogCount > 0 ? (
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Saved to Account ({savedLogCount} Logs)</span>
                      </span>
                    ) : (cookLogs?.length || 0) >= 20 ? (
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>⚡ Auto-Triggering ({cookLogs?.length || 0} Logs)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {cookLogs?.length || 0}/20 Logs (Auto-triggers at 20)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {(cookLogs?.length || 0) >= 20 
                      ? `Saved to account & overwriting every +20 logs. Next auto-run milestone at ${Math.max(20, (Math.floor((cookLogs?.length || 0) / 20) + 1) * 20)} logs (Currently ${cookLogs?.length || 0}).` 
                      : `Saved to account on run. Automatically re-runs every additional 20 logs using all available logs in your journal.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAnalyzeLogsForRecipeMatches(Boolean(overallAnalysisText))}
                  disabled={isAnalyzingOverallLogs}
                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-50 min-h-[38px]"
                >
                  {isAnalyzingOverallLogs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>{(cookLogs?.length || 0) >= 20 ? 'Analyzing All Available Logs...' : 'Analyzing Journal Logs...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-zinc-950" />
                      <span>{overallAnalysisText ? 'Re-Analyze All Logs' : 'Analyze Logs For Recipe Matches'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Analysis Drawer */}
            {showOverallAnalysis && (
              <div className="mt-3 p-4 bg-[#1a1a1a] border border-orange-500/30 rounded-xl space-y-2 animate-fadeIn text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a] flex-wrap gap-2">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold flex-wrap gap-y-1">
                    <BarChart3 className="w-4 h-4 text-orange-400" />
                    <span>Personalized {AI_PITMASTER_NAME} Recipe Recommendations</span>
                    {savedLogCount > 0 && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Saved to Account ({savedLogCount} Logs Evaluated)</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOverallAnalysis(false)}
                    className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isAnalyzingOverallLogs ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                    <span>Consulting {AI_PITMASTER_NAME} against all {cookLogs?.length || 0} logged cook sessions...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-zinc-200 whitespace-pre-line leading-relaxed text-xs font-sans">
                      {overallAnalysisText}
                    </div>
                    {savedLogCount > 0 && (
                      <div className="pt-2 border-t border-[#2a2a2a] flex items-center justify-between text-[10px] text-zinc-400 font-mono flex-wrap gap-1">
                        <span>💾 Saved in Account Storage ({savedLogCount} logs evaluated)</span>
                        <span>Next +20 log auto-rerun at {Math.max(20, (Math.floor(savedLogCount / 20) + 1) * 20)} logs</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5-Item Recipe Suggestions Carousel - Only loads after first analysis is made */}
          {!overallAnalysisText && !isAnalyzingOverallLogs ? (
            <div className="bg-[#121212] border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 shadow-lg">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  Awaiting CharGPT Log Analysis ({cookLogs.length}/20 Logs)
                </h4>
                <p className="text-xs text-amber-300/90 font-medium max-w-md mx-auto">
                  {cookLogs.length >= 20
                    ? `20+ logs collected! Triggering automatic CharGPT Log Analysis & Smart Recipe Match...`
                    : `Collect 20 cook logs to automatically unlock CharGPT Log Analysis & Smart Recipe Match, or click "Analyze Logs For Recipe Matches" above anytime to calculate recommendations now!`}
                </p>
              </div>
            </div>
          ) : isAnalyzingOverallLogs ? (
            <div className="bg-[#121212] border border-orange-500/30 rounded-2xl p-6 text-center space-y-3 shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto" />
              <p className="text-xs text-zinc-300 font-medium">
                {cookLogs.length >= 20
                  ? `⚡ 20 Logs Milestone Reached! Automatically analyzing ${cookLogs.length} cook logs and matching 5-item recipe suggestions...`
                  : `Analyzing cook logs and matching 5-item recipe suggestions...`}
              </p>
            </div>
          ) : (
            <>
              {/* Recipes Cards Grid */}
          {filteredRecipes.length === 0 ? (
            <div className="bg-[#121212] border border-orange-500/30 rounded-2xl p-8 text-center text-zinc-400 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  No Local Recipe Presets Found for "{search || selectedProtein}"
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Our built-in template library does not have an exact match, but {AI_PITMASTER_NAME} can search online for real competition smoking guides for this cut!
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSearchWebRecipes(search || selectedProtein)}
                  disabled={isSearchingWeb}
                  className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSearchingWeb ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Searching Web for Online Recipes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-zinc-950" />
                      <span>Search Online Web Recipes for "{search || selectedProtein}"</span>
                    </>
                  )}
                </button>

                {(search || selectedProtein !== 'ALL' || selectedDifficulty !== 'ALL' || selectedDuration !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSelectedProtein('ALL');
                      setSelectedDifficulty('ALL');
                      setSelectedDuration('ALL');
                    }}
                    className="px-4 py-3 bg-[#1a1a1a] hover:bg-[#242424] text-zinc-300 border border-[#2a2a2a] font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Carousel Header indicator & Web/PC Navigation Controls */}
              <div className="flex items-center justify-between text-xs px-1 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center space-x-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="font-bold text-white uppercase tracking-wider text-[11px] sm:text-xs truncate">
                    5-Item Recipe Suggestions Carousel
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] sm:text-xs font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Showing 5 of {filteredRecipes.length} Matches
                  </span>

                  {/* Web & PC Version Interactive Scroll Buttons */}
                  <div className="hidden sm:flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      className="p-1 rounded-lg bg-[#242424] hover:bg-orange-500/20 hover:text-orange-300 text-zinc-300 border border-[#2a2a2a] transition-all cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      className="p-1 rounded-lg bg-[#242424] hover:bg-orange-500/20 hover:text-orange-300 text-zinc-300 border border-[#2a2a2a] transition-all cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Swipe Carousel Container - Touch optimized for Smartphone, visible scrollbar on Web/PC */}
              <div 
                ref={carouselRef}
                className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto web-carousel-scrollbar snap-x snap-mandatory pb-4 pt-1 touch-pan-x w-full min-w-0"
              >
                {filteredRecipes.slice(0, 5).map((recipe) => {
                  const loggedMatches = cookLogs.filter(
                    (c) => c.proteinType === recipe.proteinType || c.proteinCut?.toLowerCase().includes(recipe.proteinCut.toLowerCase())
                  );
                  const avgLogRating =
                    loggedMatches.length > 0
                      ? (
                          loggedMatches.reduce((acc, c) => acc + (c.ratings?.overall || 5), 0) /
                          loggedMatches.length
                        ).toFixed(1)
                      : null;

                  return (
                    <div
                      key={recipe.id}
                      className="w-[84vw] sm:w-[320px] md:w-[340px] max-w-[340px] snap-align-start shrink-0 bg-[#242424] border border-[#2a2a2a] hover:border-orange-500/40 rounded-xl p-4 sm:p-5 shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                    <div>
                      {/* Top Pill Row */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a] text-xs">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-semibold text-xs border ${
                              proteinBadgeColors[recipe.proteinType] || 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {recipe.proteinType}
                          </span>
                          {recipe.tags?.includes('🌐 Web Search Recipe') && (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
                              <span>🌐 Web Search</span>
                            </span>
                          )}
                          {loggedMatches.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1" title={`${loggedMatches.length} past cook(s) logged in your journal`}>
                              <span>🪵 Logged Match ({loggedMatches.length}) {avgLogRating && `• ${avgLogRating}★`}</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                              difficultyColors[recipe.difficulty] || 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            }`}
                          >
                            {recipe.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono">
                          <span className="flex items-center text-orange-400 font-bold">
                            <Clock className="w-3.5 h-3.5 mr-1 text-orange-400 inline" />
                            {recipe.estHours} hrs
                          </span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center">
                            <Flame className="w-3.5 h-3.5 mr-1 inline" />
                            {recipe.estPelletsLbs} lbs pellets
                          </span>
                        </div>
                      </div>

                    {/* Title & Cut */}
                    <div className="mt-3">
                      <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                        {recipe.title}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{recipe.proteinCut}</p>
                    </div>

                    {/* Flavor Profile Description */}
                    <p className="text-xs text-zinc-300 mt-2.5 line-clamp-2 leading-relaxed">
                      {recipe.description}
                    </p>

                    {/* Thermal Target Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4 bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2a2a2a] text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Target Pit</span>
                        <span className="font-mono font-bold text-orange-400 mt-0.5 block">
                          {recipe.targetPitTemp}°F
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Finish Meat</span>
                        <span className="font-mono font-bold text-red-400 mt-0.5 block">
                          {recipe.targetMeatTemp}°F
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Wrap Stall</span>
                        <span className="font-mono font-bold text-amber-400 mt-0.5 block">
                          {recipe.wrapTemp ? `${recipe.wrapTemp}°F` : 'Unwrapped'}
                        </span>
                      </div>
                    </div>

                    {/* Recommended Wood */}
                    <div className="mt-3 text-xs flex items-center justify-between text-zinc-400 font-mono">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="text-zinc-500 font-sans font-semibold">Pellet Pair:</span>
                        <span className="text-orange-300 truncate">{recipe.recommendedWood}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline CharGPT Advice Drawer */}
                  {expandedAiRecipeId === recipe.id && (
                    <div className="mt-3 p-3 bg-[#121212] border border-orange-500/30 rounded-xl space-y-2 animate-fadeIn text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2a]">
                        <div className="flex items-center space-x-1.5 text-orange-400 font-bold">
                          <Bot className="w-4 h-4 text-orange-400" />
                          <span>{AI_PITMASTER_NAME} Custom Advice</span>
                        </div>
                        {onAskAIPitmaster && (
                          <button
                            type="button"
                            onClick={() => onAskAIPitmaster(recipe)}
                            className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Full AI Chat</span>
                          </button>
                        )}
                      </div>

                      {loadingAiRecipeId === recipe.id ? (
                        <div className="py-3 flex items-center justify-center space-x-2 text-zinc-400 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                          <span>Consulting {AI_PITMASTER_NAME} for thermal advice...</span>
                        </div>
                      ) : (
                        <div className="text-zinc-300 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                          {aiAdviceMap[recipe.id]}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModalRecipe(recipe)}
                      className="px-2.5 py-2 bg-[#1a1a1a] hover:bg-[#282828] text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-colors border border-[#2a2a2a] cursor-pointer min-h-[38px]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                      <span>Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchInlineAiAdvice(recipe)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all border cursor-pointer min-h-[38px] ${
                        expandedAiRecipeId === recipe.id
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                          : 'bg-[#1a1a1a] hover:bg-orange-500/10 text-orange-400 border-orange-500/30'
                      }`}
                      title={`Ask ${AI_PITMASTER_NAME} for custom advice on this recipe`}
                    >
                      {loadingAiRecipeId === recipe.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-orange-400" />
                      )}
                      <span>AI Advice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartCookFromRecipe(recipe)}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-extrabold text-xs rounded-lg shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Start Log</span>
                    </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
          </>
        )}

        </div>
      )}

      {/* Recipe Full Modal View */}
      {activeModalRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl relative space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#2a2a2a]">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-semibold text-xs border ${
                      proteinBadgeColors[activeModalRecipe.proteinType] || 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {activeModalRecipe.proteinType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {activeModalRecipe.difficulty}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white mt-2">{activeModalRecipe.title}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{activeModalRecipe.proteinCut}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalRecipe(null)}
                className="p-1.5 text-zinc-400 hover:text-white bg-[#242424] rounded-lg border border-[#2a2a2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#121212] p-3.5 rounded-xl border border-[#2a2a2a] text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Smoke Duration</span>
                <span className="font-mono font-bold text-orange-400 flex items-center mt-0.5 text-sm">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {activeModalRecipe.estHours} hrs
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Target Pit Temp</span>
                <span className="font-mono font-bold text-amber-400 mt-0.5 text-sm">
                  {activeModalRecipe.targetPitTemp}°F
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Target Meat Temp</span>
                <span className="font-mono font-bold text-red-400 mt-0.5 text-sm">
                  {activeModalRecipe.targetMeatTemp}°F
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Pellets Required</span>
                <span className="font-mono font-bold text-yellow-400 mt-0.5 text-sm">
                  ~{activeModalRecipe.estPelletsLbs} lbs
                </span>
              </div>
            </div>

            {/* Rub & Sauce Details */}
            <div className="space-y-3 bg-[#242424] p-4 rounded-xl border border-[#2a2a2a] text-xs">
              <div>
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block text-orange-400">
                  🌶 Rub & Seasoning Formula
                </span>
                <p className="text-zinc-200 mt-1 leading-relaxed font-mono bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                  {activeModalRecipe.rubIngredients}
                </p>
              </div>

              {activeModalRecipe.sauceGlaze && (
                <div>
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                    🍯 Sauce & Glaze Finishing
                  </span>
                  <p className="text-zinc-200 mt-1 leading-relaxed font-mono bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                    {activeModalRecipe.sauceGlaze}
                  </p>
                </div>
              )}

              <div>
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block text-cyan-400">
                  🪵 Recommended Pellet Wood Pair
                </span>
                <p className="text-zinc-200 mt-1 font-mono">{activeModalRecipe.recommendedWood}</p>
              </div>
            </div>

            {/* Step by Step Cooking Guide */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Utensils className="w-4 h-4 text-orange-400" />
                <span>Step-by-Step Cooking Execution</span>
              </h4>
              <div className="space-y-2">
                {activeModalRecipe.keySteps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-3 bg-[#121212] p-3 rounded-xl border border-[#2a2a2a] text-xs">
                    <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 shrink-0">
                      Step {idx + 1}
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CharGPT Recipe Consultation Box */}
            <div className="bg-[#121212] border border-orange-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg">
                    <Bot className="w-4.5 h-4.5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {AI_PITMASTER_NAME} Custom Advice
                    </h4>
                    <p className="text-[10px] text-zinc-400">Tailored thermal curves, wood pairings & stall strategy</p>
                  </div>
                </div>

                {onAskAIPitmaster && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = activeModalRecipe;
                      setActiveModalRecipe(null);
                      onAskAIPitmaster(rec);
                    }}
                    className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1.5 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-xl border border-orange-500/30 cursor-pointer transition-all active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                    <span>Chat in {AI_NAME} Tab</span>
                  </button>
                )}
              </div>

              {aiAdviceMap[activeModalRecipe.id] ? (
                <div className="text-xs text-zinc-300 space-y-2 whitespace-pre-line leading-relaxed bg-[#1a1a1a] p-3.5 rounded-xl border border-[#2a2a2a] font-sans">
                  {aiAdviceMap[activeModalRecipe.id]}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fetchInlineAiAdvice(activeModalRecipe)}
                  disabled={loadingAiRecipeId === activeModalRecipe.id}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/40 text-orange-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[42px]"
                >
                  {loadingAiRecipeId === activeModalRecipe.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                      <span>{AI_PITMASTER_NAME} is analyzing recipe thermal curve...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 text-orange-400" />
                      <span>✨ Generate {AI_PITMASTER_NAME} Custom Advice for this Recipe</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Pro Tip Callout */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Pro Pitmaster Secret Tip</span>
              </span>
              <p className="text-amber-200/90 leading-relaxed italic">{activeModalRecipe.proTip}</p>
            </div>

            {/* Modal Bottom CTA */}
            <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModalRecipe(null)}
                className="px-4 py-2 bg-[#242424] text-zinc-400 hover:text-white rounded-xl text-xs font-bold border border-[#2a2a2a] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const recipeToStart = activeModalRecipe;
                  setActiveModalRecipe(null);
                  onStartCookFromRecipe(recipeToStart);
                }}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>🚀 Pre-fill Smoke Sheet with this Recipe</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
