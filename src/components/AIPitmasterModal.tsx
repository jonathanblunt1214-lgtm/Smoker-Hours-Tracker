import React, { useState, useEffect } from 'react';
import { CookLog, SmokerProfile, CharGPTMemory, CharGPTRule, ProteinType, VerifiedMeatCut, CutScanResult, CustomFuelBlendPreset } from '../types';
import {
  Sparkles,
  Send,
  Bot,
  User,
  HelpCircle,
  Loader2,
  LineChart,
  Award,
  Brain,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Zap,
  BookOpen,
  Flame,
  ThumbsUp,
  BookmarkPlus,
  BarChart2,
  Bell,
  Radio,
  Scale,
  Calculator,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Image as ImageIcon,
  X,
  Upload,
  Search,
  Globe,
  Tag,
  SlidersHorizontal,
  ExternalLink,
  FileText,
  Wifi,
  WifiOff,
  FlaskConical,
  DollarSign,
  ChevronDown,
  Check,
  GraduationCap,
  School,
  Lock,
  Unlock,
  Star,
  RotateCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { CERTIFICATION_FLASHCARDS, PRACTICE_EXAM_QUESTIONS, StudyFlashcard, PracticeExamQuestion } from '../data/certificationStudySuite';
import { getUsdaSafetyForMeatCut, determineProteinType, determineProteinSubcategory } from '../data/proteinTemps';
import {
  loadCharGPTMemory,
  saveCharGPTMemory,
  addDeletedVaultRuleId,
  loadCharGPTChatHistory,
  saveCharGPTChatHistory,
  StoredChatMessage,
  loadVerifiedMeatCuts,
  saveVerifiedMeatCuts,
  addOrUpdateVerifiedMeatCut,
  deleteVerifiedMeatCut,
  loadCustomFuelPresets,
  addCustomFuelPreset,
} from '../utils/storage';
import { INITIAL_PITMASTER_COURSES, PitmasterCourse } from '../data/pitmasterCoursesDatabase';
import { calculateMassCookSchedule, MassCookInput, MassCookResult } from '../utils/massCalculator';
import { PushAndAlexaHub } from './PushAndAlexaHub';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME, AI_ADVISOR_NAME } from '../constants/appName';
import { validateBBQTopicConstraint, getCharGPTDeveloperOverride, isMasterAdmin } from '../utils/adminAuth';
import { auth } from '../lib/firebase';

interface AIPitmasterModalProps {
  cookLogs: CookLog[];
  profile: SmokerProfile;
  initialCookId?: string | null;
  initialPrompt?: string | null;
  currentUserEmail?: string | null;
  onMemoryUpdate?: (memory: CharGPTMemory) => void;
  onNavigateToPlanner?: () => void;
  onNavigateToNewCook?: () => void;
  onOpenMasterAdmin?: () => void;
}

export const AIPitmasterModal: React.FC<AIPitmasterModalProps> = ({
  cookLogs,
  profile,
  initialCookId,
  initialPrompt,
  currentUserEmail,
  onMemoryUpdate,
  onNavigateToPlanner,
  onNavigateToNewCook,
  onOpenMasterAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'blend_optimizer' | 'mass_calculator' | 'meat_database' | 'memory' | 'analytics' | 'alexa_push' | 'pitmaster_courses'>('chat');
  const [charGPTMemory, setCharGPTMemory] = useState<CharGPTMemory>(() => loadCharGPTMemory());
  const [isMobileHeaderExpanded, setIsMobileHeaderExpanded] = useState(false);
  const [expandedCutIds, setExpandedCutIds] = useState<Record<string, boolean>>({});

  // 10,000 Total Accumulated Hours Calculation & Unlocking System
  const publishedCookLogs = cookLogs.filter((c) => c.isPublishedToTotalHours === true);
  const totalLogHours = publishedCookLogs.reduce((sum, c) => sum + (c.hoursLogged || 0), 0);
  const profileHours = profile?.currentHours || 0;
  const maxEndingHours = publishedCookLogs.length > 0 ? Math.max(...publishedCookLogs.map((c) => c.endingSmokerHours || 0)) : 0;
  const baseAccumulatedHours = Math.max(totalLogHours, profileHours, maxEndingHours);

  const is10kUnlocked = baseAccumulatedHours >= 10000;

  // Pitmaster Courses Data Gathering State
  const [coursesList, setCoursesList] = useState<PitmasterCourse[]>(INITIAL_PITMASTER_COURSES);
  const [courseCategoryFilter, setCourseCategoryFilter] = useState<string>('all');
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [isGatheringCourses, setIsGatheringCourses] = useState<boolean>(false);
  const [courseResearchSummary, setCourseResearchSummary] = useState<string | null>(null);
  const [courseNotice, setCourseNotice] = useState<string | null>(null);

  // Inline Pitmaster Name Editing State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInputValue, setNameInputValue] = useState<string>('');

  // 10,000-Hour Certification Study Suite State
  const [studyMode, setStudyMode] = useState<'courses' | 'flashcards' | 'exam_sim'>('courses');
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false);
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);

  const handleNextFlashcard = () => {
    setIsFlashcardFlipped(false);
    setCurrentFlashcardIndex((prev) => (prev + 1) % CERTIFICATION_FLASHCARDS.length);
  };

  const handlePrevFlashcard = () => {
    setIsFlashcardFlipped(false);
    setCurrentFlashcardIndex((prev) => (prev - 1 + CERTIFICATION_FLASHCARDS.length) % CERTIFICATION_FLASHCARDS.length);
  };

  const handleSelectExamOption = (questionId: string, optionIdx: number) => {
    if (examSubmitted) return;
    setExamAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleResetExam = () => {
    setExamAnswers({});
    setExamSubmitted(false);
  };

  const handleGatherCourseData = async (customQuery?: string) => {
    const queryToUse = customQuery !== undefined ? customQuery : courseSearchQuery;
    setIsGatheringCourses(true);
    setCourseNotice(null);

    try {
      const res = await fetch('/api/chargpt/pitmaster-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToUse || 'top pitmaster courses and masterclasses',
          category: courseCategoryFilter,
          accumulatedHours: Math.round(baseAccumulatedHours),
          smokerType: profile?.name || profile?.smokerType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.gatheredCourses && Array.isArray(data.gatheredCourses) && data.gatheredCourses.length > 0) {
          setCoursesList((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newUnique = data.gatheredCourses.filter((c: PitmasterCourse) => !existingIds.has(c.id));
            return [...newUnique, ...prev];
          });
        }
        if (data.searchSummary) {
          setCourseResearchSummary(data.searchSummary);
        }
        setCourseNotice(`✅ CharGPT gathered ${data.gatheredCourses?.length || 0} pitmaster courses & masterclass insights!`);
        setTimeout(() => setCourseNotice(null), 4000);
      } else {
        setCourseNotice('CharGPT gathered data using offline course archives.');
      }
    } catch (err: any) {
      console.error('Error gathering course data:', err);
      setCourseNotice('Operating with CharGPT offline pitmaster course database.');
    } finally {
      setIsGatheringCourses(false);
    }
  };

  const toggleCutExpand = (cutId: string) => {
    setExpandedCutIds((prev) => ({ ...prev, [cutId]: !prev[cutId] }));
  };


  // AI Wood & Pellet Blend Optimizer State
  const [blendGoal, setBlendGoal] = useState<'flavor' | 'efficiency' | 'cost' | 'balanced'>('flavor');
  const [blendProtein, setBlendProtein] = useState<string>('Beef Brisket');
  const [blendPrompt, setBlendPrompt] = useState<string>('');
  const [isGeneratingBlend, setIsGeneratingBlend] = useState(false);
  const [generatedBlend, setGeneratedBlend] = useState<any>(null);
  const [customPresets, setCustomPresets] = useState<CustomFuelBlendPreset[]>(() => loadCustomFuelPresets());
  const [blendSaveNotice, setBlendSaveNotice] = useState<string | null>(null);

  const handleGenerateBlend = async () => {
    setIsGeneratingBlend(true);
    setBlendSaveNotice(null);
    try {
      const res = await fetch('/api/chargpt/optimize-blend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationGoal: blendGoal,
          targetProtein: blendProtein,
          userPrompt: blendPrompt,
          smokerProfile: profile,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setGeneratedBlend(data.result);
      } else {
        setBlendSaveNotice('Failed to generate blend optimization. Please try again.');
      }
    } catch (err: any) {
      console.error('Error in blend generation:', err);
      setBlendSaveNotice('Connection error. Operating with local blend physics.');
    } finally {
      setIsGeneratingBlend(false);
    }
  };

  const handleSaveGeneratedBlendAsPreset = () => {
    if (!generatedBlend) return;
    const newPreset: CustomFuelBlendPreset = {
      id: `preset-${Date.now()}`,
      title: generatedBlend.title || 'CharGPT Optimized Fuel Blend',
      brand: 'CharGPT AI Blend',
      description: generatedBlend.flavorNotes || 'Custom AI optimized pellet blend preset',
      components: generatedBlend.components || [],
      btuPerLb: generatedBlend.calculatedBtuPerLb || 8600,
      efficiencyRating: generatedBlend.calculatedEfficiencyRating || 92.0,
      costPerLb: generatedBlend.calculatedCostPerLb || 0.78,
      createdAt: new Date().toISOString(),
    };

    const updated = addCustomFuelPreset(newPreset);
    setCustomPresets(updated);
    setBlendSaveNotice(`🎉 Saved "${newPreset.title}" to your Custom Fuel Blend Presets!`);
    setTimeout(() => setBlendSaveNotice(null), 4000);
  };

  // Confirmed & Verified Meat Cut Database State
  const [verifiedCuts, setVerifiedCuts] = useState<VerifiedMeatCut[]>(() => loadVerifiedMeatCuts());
  const [cutSearchQuery, setCutSearchQuery] = useState('');
  const [cutProteinFilter, setCutProteinFilter] = useState<'ALL' | ProteinType>('ALL');

  // Network Connectivity State for Offline Mode & Automated Verification
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isBatchVerifying, setIsBatchVerifying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTeachSuccessNotice('🟢 Back online! Live Gemini search grounding & online verification restored.');
      setTimeout(() => setTeachSuccessNotice(null), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setTeachSuccessNotice('⚡ Offline Mode Active: Running with local CharGPT pitmaster engine.');
      setTimeout(() => setTeachSuccessNotice(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scanner State for Unknown Cut Identification
  const scanFileInputRef = React.useRef<HTMLInputElement>(null);
  const [scanQuery, setScanQuery] = useState('');
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [isScanningCut, setIsScanningCut] = useState(false);
  const [scanResult, setScanResult] = useState<CutScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Online Verification State
  const [verifyingCutId, setVerifyingCutId] = useState<string | null>(null);

  // Add Custom Confirmed Cut Form State
  const [isAddCutModalOpen, setIsAddCutModalOpen] = useState(false);
  const [newCutName, setNewCutName] = useState('');
  const [newCutAliases, setNewCutAliases] = useState('');
  const [newCutProtein, setNewCutProtein] = useState<ProteinType>('Beef');
  const [newCutPrimal, setNewCutPrimal] = useState('');
  const [newCutImps, setNewCutImps] = useState('');
  const [newCutDesc, setNewCutDesc] = useState('');
  const [newCutFeatures, setNewCutFeatures] = useState('');
  const [newCutPhotoBase64, setNewCutPhotoBase64] = useState<string | null>(null);


  const [prompt, setPrompt] = useState('');
  const [selectedCookId, setSelectedCookId] = useState<string>(
    initialCookId || (cookLogs.length > 0 ? 'ALL_LOGS' : '')
  );
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingMemoryCandidate, setPendingMemoryCandidate] = useState<{ title: string; detail: string; category: CharGPTRule['category'] } | null>(null);
  const [lastContextSummary, setLastContextSummary] = useState<string>('General guidance only until a verified account context is loaded.');

  // Persistent CharGPT Chat History per User
  const [messages, setMessages] = useState<StoredChatMessage[]>(() => {
    const saved = loadCharGPTChatHistory();
    if (saved && saved.length > 0) return saved;
    const nameGreeting = charGPTMemory.userName ? `, ${charGPTMemory.userName}` : '';
    const askNameText = !charGPTMemory.userName
      ? `\n\nBefore we fire up the smoker, what is your name? I'd love to remember who I'm cooking with!`
      : '';
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `Hello Pitmaster${nameGreeting}! I am ${AI_PITMASTER_NAME}, SmokeStack's learning BBQ cooking assistant. 🧠🔥${askNameText}\n\nI can help plan, troubleshoot, compare, and explain cooks. Account history is used only when your signed-in SmokeStack data is verified, and new memories are saved only after you confirm them.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Save conversation history to local storage whenever messages update
  useEffect(() => {
    saveCharGPTChatHistory(messages);
  }, [messages]);

  // Mass & Weight Calculator State
  const [massProtein, setMassProtein] = useState<ProteinType>('' as any);
  const [massCut, setMassCut] = useState('');
  const [massWeightValue, setMassWeightValue] = useState<number | ''>('');
  const [massWeightUnit, setMassWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [massPitTempF, setMassPitTempF] = useState<number>(225);
  const [massTargetTempF, setMassTargetTempF] = useState<number>(203);
  const [massWrapStrategy, setMassWrapStrategy] = useState<'No Wrap' | 'Peach Butcher Paper' | 'Foil Boat' | 'Aluminum Foil' | 'Covered Pan'>('Peach Butcher Paper');
  const [massBoneOption, setMassBoneOption] = useState<'Bone-In' | 'Boneless'>('Boneless');
  const [massThicknessProfile, setMassThicknessProfile] = useState<'Standard Whole Muscle' | 'Thick Uniform Mass' | 'Thin Flat Slab' | 'Compact Roast'>('Standard Whole Muscle');

  // Computer Vision & Photo Analysis State
  const chatFileInputRef = React.useRef<HTMLInputElement>(null);
  const calcFileInputRef = React.useRef<HTMLInputElement>(null);

  const [chatImageBase64, setChatImageBase64] = useState<string | null>(null);

  const [isAnalyzingMeatPhoto, setIsAnalyzingMeatPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<{
    detectedWeightValue: number;
    detectedWeightUnit: 'lbs' | 'kg';
    detectedProteinType: ProteinType;
    detectedProteinCut: string;
    detectedBoneOption: 'Bone-In' | 'Boneless';
    detectedThicknessProfile: 'Standard Whole Muscle' | 'Thick Uniform Mass' | 'Thin Flat Slab' | 'Compact Roast';
    detectedPitTempF?: number;
    detectedTargetTempF?: number;
    detectedWrapStrategy?: string;
    detectedUsdaGrade?: string;
    detectedPricePerLb?: number | null;
    detectedTotalPrice?: number | null;
    detectedTareWeight?: string | null;
    explanation: string;
    rawAnalysis?: string;
    photoPreviewUrl?: string;
  } | null>(null);
  const [photoAnalysisError, setPhotoAnalysisError] = useState<string | null>(null);

  const handleAnalyzeMeatPhoto = async (file: File) => {
    if (!file) return;
    setIsAnalyzingMeatPhoto(true);
    setPhotoAnalysisError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          setIsAnalyzingMeatPhoto(false);
          return;
        }

        const base64Clean = dataUrl.split(',')[1] || '';
        const mimeType = file.type || 'image/jpeg';

        if (!navigator.onLine) {
          setIsAnalyzingMeatPhoto(false);
          setPhotoAnalysisError('Offline Mode: Photo vision analysis requires an active internet connection. Please enter cut details manually below or retry when back online.');
          return;
        }

        const res = await fetch('/api/chargpt/analyze-meat-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: {
              data: base64Clean,
              mimeType,
            },
          }),
        });

        const data = await res.json();
        setIsAnalyzingMeatPhoto(false);

        if (data.success && data.result) {
          const r = data.result;
          if (typeof r.detectedWeightValue === 'number' && r.detectedWeightValue > 0) {
            setMassWeightValue(r.detectedWeightValue);
          }
          if (r.detectedWeightUnit === 'kg' || r.detectedWeightUnit === 'lbs') {
            setMassWeightUnit(r.detectedWeightUnit);
          }
          if (r.detectedProteinType) {
            setMassProtein(r.detectedProteinType as ProteinType);
          }
          if (r.detectedProteinCut) {
            setMassCut(r.detectedProteinCut);
          }
          if (r.detectedBoneOption === 'Bone-In' || r.detectedBoneOption === 'Boneless') {
            setMassBoneOption(r.detectedBoneOption);
          }
          if (r.detectedThicknessProfile) {
            setMassThicknessProfile(r.detectedThicknessProfile);
          }

          if (r.detectedPitTempF && typeof r.detectedPitTempF === 'number') {
            setMassPitTempF(r.detectedPitTempF);
          }
          if (r.detectedTargetTempF && typeof r.detectedTargetTempF === 'number') {
            setMassTargetTempF(r.detectedTargetTempF);
          }
          if (r.detectedWrapStrategy) {
            setMassWrapStrategy(r.detectedWrapStrategy as any);
          }

          setPhotoAnalysisResult({
            ...r,
            photoPreviewUrl: dataUrl,
          });
        } else {
          setPhotoAnalysisError(data.error || 'Could not detect weight or cut from photo. Try a clear picture of the scale display or meat packaging tag.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsAnalyzingMeatPhoto(false);
      setPhotoAnalysisError(err?.message || 'Failed to process image file.');
    }
  };

  // Calculate live mass physics results
  const massCookInput: MassCookInput = {
    proteinType: massProtein || 'Beef',
    proteinCut: massCut || 'Custom Cut',
    weightValue: typeof massWeightValue === 'number' ? massWeightValue : 0,
    weightUnit: massWeightUnit,
    pitTempF: massPitTempF,
    targetInternalTempF: massTargetTempF,
    wrapStrategy: massWrapStrategy,
    boneOption: massBoneOption,
    thicknessProfile: massThicknessProfile,
  };

  const massResult: MassCookResult = calculateMassCookSchedule(massCookInput, profile);

  // Teach Form State
  const [teachTitle, setTeachTitle] = useState('');
  const [teachDetail, setTeachDetail] = useState('');
  const [teachCategory, setTeachCategory] = useState<CharGPTRule['category']>('preference');
  const [teachSuccessNotice, setTeachSuccessNotice] = useState<string | null>(null);

  // Cook history may inform a response, but it must never become durable memory
  // automatically. Memory changes require an explicit user confirmation.
  useEffect(() => {
    setLastContextSummary(cookLogs.length > 0
      ? `${cookLogs.length} local cook record(s) available; the server independently verifies account scope before using them.`
      : 'No local cook records available.');
  }, [cookLogs.length]);

  // Handle initial prompt if passed from external button
  useEffect(() => {
    if (initialPrompt) {
      handleAsk(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialCookId) {
      setSelectedCookId(initialCookId);
    }
  }, [initialCookId]);

  const activeCook = selectedCookId !== 'ALL_LOGS' ? cookLogs.find((c) => c.id === selectedCookId) : null;

  // Manual Trigger to re-analyze logs
  const handleManualEvolve = () => {
    const published = cookLogs.filter((c) => c.isPublishedToTotalHours === true);
    setTeachSuccessNotice(`Reviewed ${published.length} published cook log(s). No memory was changed; approve individual memories before saving.`);
    setTimeout(() => setTeachSuccessNotice(null), 4000);
  };

  // Handler: Add Analysed Cut from Cook Log to Meat Safety & BBQ Cook Target Temps Guide
  const handleAddAnalysedCutFromCookLog = (cook: CookLog) => {
    const c = cook as any;
    const cutName = c.proteinCut || c.title;
    if (!cutName) return;

    const cat = c.proteinType || determineProteinType(cutName);
    const subcat = c.proteinSubcategory || c.gameSubcategory || determineProteinSubcategory(cat, cutName);

    const targetTempF = c.targetInternalTempF || c.targetTemp || (cat === 'Poultry' ? 165 : cat === 'Pork' ? 205 : 203);
    const smokeTempF = c.idealSmokeTempF || c.smokeTemp || 225;

    const newCut: VerifiedMeatCut = {
      id: `cut-chargpt-cook-${c.id}-${Date.now().toString(36)}`,
      name: cutName,
      aliases: [c.title, `${cat} Cook Log Cut`],
      proteinType: cat as ProteinType,
      proteinSubcategory: subcat,
      gameSubcategory: (cat === 'Game' || cat === 'Wild Game') ? subcat : undefined,
      primalOrigin: c.primalOrigin || `${cat} Primal Cut (from Smoke Log)`,
      impsCode: c.impsCode || undefined,
      description: c.notes || `Analysed cut extracted from CharGPT cook log session "${c.title}".`,
      visualKeyFeatures: [
        `Analysed in Cook Log: "${c.title}"`,
        `Smoker Unit: ${c.smokerType || 'Smoker Rig'}`,
        `Wood/Pellet: ${c.woodPelletType || 'Hardwood Smoke'}`,
      ],
      idealSmokeTempF: smokeTempF,
      targetInternalTempF: targetTempF,
      cookingStrategy: c.cookingStrategy || c.notes || `Smoked on ${c.smokerType || 'Smoker'} to target internal temperature of ${targetTempF}°F.`,
      verifiedStatus: 'Local User Confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = addOrUpdateVerifiedMeatCut(newCut);
    setVerifiedCuts(updated);

    setTeachSuccessNotice(`✅ Added analysed cut "${cutName}" to Meat Safety & BBQ Cook Target Temps Guide!`);
    setTimeout(() => setTeachSuccessNotice(null), 5000);
  };

  // Handler: Batch Import All Analysed Cuts from Cook Logs
  const handleBatchImportAllCookLogCuts = () => {
    if (cookLogs.length === 0) {
      setTeachSuccessNotice('⚠️ No cook logs available to import cuts from.');
      setTimeout(() => setTeachSuccessNotice(null), 4000);
      return;
    }

    let addedCount = 0;
    let currentList = loadVerifiedMeatCuts();

    cookLogs.forEach((cook) => {
      const c = cook as any;
      const cutName = c.proteinCut || c.title;
      if (!cutName) return;

      const cat = c.proteinType || determineProteinType(cutName);
      const subcat = c.proteinSubcategory || c.gameSubcategory || determineProteinSubcategory(cat, cutName);

      const targetTempF = c.targetInternalTempF || c.targetTemp || (cat === 'Poultry' ? 165 : cat === 'Pork' ? 205 : 203);
      const smokeTempF = c.idealSmokeTempF || c.smokeTemp || 225;

      const newCut: VerifiedMeatCut = {
        id: `cut-chargpt-batch-${c.id}`,
        name: cutName,
        aliases: [c.title],
        proteinType: cat as ProteinType,
        proteinSubcategory: subcat,
        gameSubcategory: (cat === 'Game' || cat === 'Wild Game') ? subcat : undefined,
        primalOrigin: c.primalOrigin || `${cat} Primal Cut`,
        impsCode: c.impsCode || undefined,
        description: c.notes || `Analysed meat cut extracted from cook log "${c.title}".`,
        visualKeyFeatures: [`Analysed in Cook Log: ${c.title}`],
        idealSmokeTempF: smokeTempF,
        targetInternalTempF: targetTempF,
        cookingStrategy: c.cookingStrategy || `Smoked on ${c.smokerType || 'smoker'} to ${targetTempF}°F.`,
        verifiedStatus: 'Local User Confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      currentList = addOrUpdateVerifiedMeatCut(newCut);
      addedCount++;
    });

    setVerifiedCuts(currentList);

    setTeachSuccessNotice(`🎉 Successfully imported ${addedCount} analysed cuts from cook logs to Meat Safety & Target Temps Guide!`);
    setTimeout(() => setTeachSuccessNotice(null), 5000);
  };

  // Handler: Identify Unknown Cut via Server & Gemini (with Offline Fallback)
  const handleIdentifyUnknownCut = async () => {
    if (!scanQuery.trim() && !scanImageBase64) return;
    setIsScanningCut(true);
    setScanError(null);
    setScanResult(null);

    // If offline, use local offline muscle anatomy search & heuristics engine
    if (!navigator.onLine) {
      setTimeout(() => {
        setIsScanningCut(false);
        const q = scanQuery.toLowerCase().trim();
        const matched = verifiedCuts.find(
          (c) =>
            (q && c.name.toLowerCase().includes(q)) ||
            (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(q))) ||
            (c.impsCode && c.impsCode.toLowerCase().includes(q))
        );

        if (matched) {
          setScanResult({
            identifiedCutName: matched.name,
            proteinType: matched.proteinType,
            primalOrigin: matched.primalOrigin,
            impsCode: matched.impsCode,
            confidenceScore: 95,
            aliases: matched.aliases,
            visualMarkersDetected: matched.visualKeyFeatures,
            anatomyDetails: matched.muscleAnatomy || 'Local muscle anatomical structure',
            recommendedCookingStrategy: matched.cookingStrategy,
            idealSmokeTempF: matched.idealSmokeTempF,
            targetInternalTempF: matched.targetInternalTempF,
            explanation: `⚡ Offline Mode: Matched against your local confirmed database ("${matched.name}").`,
          });
        } else {
          let inferredProtein: ProteinType = 'Beef';
          let targetTemp = 203;
          if (q.includes('pork') || q.includes('butt') || q.includes('shoulder') || q.includes('chops')) {
            inferredProtein = 'Pork';
            targetTemp = 203;
          } else if (q.includes('chicken') || q.includes('turkey') || q.includes('thigh') || q.includes('breast')) {
            inferredProtein = q.includes('turkey') ? 'Turkey' : 'Chicken';
            targetTemp = 165;
          } else if (q.includes('lamb')) {
            inferredProtein = 'Lamb';
            targetTemp = 145;
          }

          setScanResult({
            identifiedCutName: scanQuery.trim() || 'Custom Offline Meat Cut',
            proteinType: inferredProtein,
            primalOrigin: 'Local Subprimal',
            impsCode: 'IMPS-Offline-Local',
            confidenceScore: 84,
            aliases: scanQuery.trim() ? [scanQuery.trim()] : ['User Scanned Cut'],
            visualMarkersDetected: ['Muscle grain direction', 'Intramuscular fat marbling'],
            anatomyDetails: 'Anatomical structure derived from CharGPT offline muscle heuristics.',
            recommendedCookingStrategy: 'Low and slow smoke at 225°F until target internal temperature is achieved.',
            idealSmokeTempF: 225,
            targetInternalTempF: targetTemp,
            explanation: '⚡ Offline Mode: Scanned using CharGPT local pitmaster anatomy rules. Save to database to confirm.',
          });
        }
      }, 500);
      return;
    }

    try {
      let imagePayload = null;
      if (scanImageBase64) {
        const parts = scanImageBase64.split(',');
        const mimeType = parts[0]?.split(';')[0]?.split(':')[1] || 'image/jpeg';
        const data = parts[1] || '';
        imagePayload = { data, mimeType };
      }

      const res = await fetch('/api/chargpt/identify-unknown-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutNameQuery: scanQuery.trim(),
          image: imagePayload,
          localDatabaseCuts: verifiedCuts,
        }),
      });

      const data = await res.json();
      setIsScanningCut(false);

      if (data.success && data.result) {
        setScanResult(data.result);
      } else {
        setScanError(data.error || 'Failed to identify cut. Please check image quality or enter name keywords.');
      }
    } catch (err: any) {
      setIsScanningCut(false);
      setScanError('Network request failed. Operating in offline mode.');
    }
  };

  // Handler: Convert Scan Result to Confirmed Database Entry (With Automated Online Verification)
  const handleSaveScanResultToDatabase = () => {
    if (!scanResult) return;
    const newCut: VerifiedMeatCut = {
      id: `cut-user-${Date.now()}`,
      name: scanResult.identifiedCutName,
      aliases: scanResult.aliases || [],
      proteinType: scanResult.proteinType || 'Beef',
      primalOrigin: scanResult.primalOrigin || 'Custom Subprimal',
      impsCode: scanResult.impsCode || 'IMPS User-Verified',
      description: scanResult.explanation || scanResult.anatomyDetails || 'Identified cut via CharGPT Computer Vision & Muscle Registry.',
      visualKeyFeatures: scanResult.visualMarkersDetected || [],
      muscleAnatomy: scanResult.anatomyDetails || undefined,
      idealSmokeTempF: scanResult.idealSmokeTempF || 225,
      targetInternalTempF: scanResult.targetInternalTempF || 140,
      cookingStrategy: scanResult.recommendedCookingStrategy || 'Low and slow smoke with wood coal embers.',
      verifiedStatus: 'Local User Confirmed',
      samplePhotoUrl: scanImageBase64 || undefined,
      userUploadedPhotos: scanImageBase64 ? [scanImageBase64] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = addOrUpdateVerifiedMeatCut(newCut);
    setVerifiedCuts(updated);
    
    // Automate Verification: If online, immediately cross-verify against live USDA/NAMP online data
    if (isOnline) {
      setTeachSuccessNotice(`✅ Added "${newCut.name}"! Auto-verifying against online USDA/NAMP databases...`);
      handleVerifyCutOnline(newCut);
    } else {
      setTeachSuccessNotice(`✅ Added "${newCut.name}" to Local Confirmed Cut Database (Queued for online auto-verification).`);
      setTimeout(() => setTeachSuccessNotice(null), 4000);
    }
  };

  // Handler: Cross-Verify Cut against Live Online Data (USDA/NAMP Grounding)
  const handleVerifyCutOnline = async (cut: VerifiedMeatCut) => {
    if (!isOnline) {
      setTeachSuccessNotice(`⚡ Offline Mode: "${cut.name}" is saved locally and will auto-verify when internet connection returns.`);
      setTimeout(() => setTeachSuccessNotice(null), 4000);
      return;
    }

    setVerifyingCutId(cut.id);
    try {
      const res = await fetch('/api/chargpt/verify-cut-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutName: cut.name,
          primalOrigin: cut.primalOrigin,
          impsCode: cut.impsCode,
          aliases: cut.aliases,
        }),
      });

      const data = await res.json();
      setVerifyingCutId(null);

      if (data.success && data.result) {
        const r = data.result;
        const updatedCut: VerifiedMeatCut = {
          ...cut,
          name: r.verifiedCutName || cut.name,
          impsCode: r.verifiedImpsCode || cut.impsCode,
          primalOrigin: r.verifiedPrimalOrigin || cut.primalOrigin,
          aliases: Array.from(new Set([...(cut.aliases || []), ...(r.verifiedAliases || [])])),
          muscleAnatomy: r.verifiedMuscleAnatomy || cut.muscleAnatomy,
          description: r.verifiedDescription || cut.description,
          visualKeyFeatures: r.verifiedVisualFeatures?.length ? r.verifiedVisualFeatures : cut.visualKeyFeatures,
          idealSmokeTempF: r.idealSmokeTempF || cut.idealSmokeTempF,
          targetInternalTempF: r.targetInternalTempF || cut.targetInternalTempF,
          cookingStrategy: r.verifiedCookingStrategy || cut.cookingStrategy,
          verifiedStatus: 'Global Online Verified',
          onlineVerificationDate: new Date().toISOString(),
          onlineSourceCitations: r.sourceCitations || ['USDA NAMP Meat Buyers Guide'],
          updatedAt: new Date().toISOString(),
        };

        const updatedList = addOrUpdateVerifiedMeatCut(updatedCut);
        setVerifiedCuts(updatedList);
        setTeachSuccessNotice(`🌐 Cross-verified "${updatedCut.name}" against USDA & online butcher specifications!`);
        setTimeout(() => setTeachSuccessNotice(null), 4000);
      }
    } catch (e) {
      setVerifyingCutId(null);
      console.error('Online verification failed', e);
    }
  };

  // Handler: Batch Auto-Verify All Unverified Cuts Against Online Data
  const handleBatchAutoVerifyUnverifiedCuts = async () => {
    const unverified = verifiedCuts.filter((c) => c.verifiedStatus !== 'Global Online Verified');
    if (unverified.length === 0) {
      setTeachSuccessNotice('✨ All meat cuts in your database are already Global Online Verified!');
      setTimeout(() => setTeachSuccessNotice(null), 4000);
      return;
    }

    if (!isOnline) {
      setTeachSuccessNotice('⚡ Currently in Offline Mode. Batch verification will run automatically when connected to the internet.');
      setTimeout(() => setTeachSuccessNotice(null), 4000);
      return;
    }

    setIsBatchVerifying(true);
    setTeachSuccessNotice(`🌐 Auto-verifying ${unverified.length} cuts against USDA & NAMP online databases...`);

    let countSuccess = 0;
    let currentList = [...verifiedCuts];

    for (const cut of unverified) {
      try {
        const res = await fetch('/api/chargpt/verify-cut-online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cutName: cut.name,
            primalOrigin: cut.primalOrigin,
            impsCode: cut.impsCode,
            aliases: cut.aliases,
          }),
        });

        const data = await res.json();
        if (data.success && data.result) {
          const r = data.result;
          const updatedCut: VerifiedMeatCut = {
            ...cut,
            name: r.verifiedCutName || cut.name,
            impsCode: r.verifiedImpsCode || cut.impsCode,
            primalOrigin: r.verifiedPrimalOrigin || cut.primalOrigin,
            aliases: Array.from(new Set([...(cut.aliases || []), ...(r.verifiedAliases || [])])),
            muscleAnatomy: r.verifiedMuscleAnatomy || cut.muscleAnatomy,
            description: r.verifiedDescription || cut.description,
            visualKeyFeatures: r.verifiedVisualFeatures?.length ? r.verifiedVisualFeatures : cut.visualKeyFeatures,
            idealSmokeTempF: r.idealSmokeTempF || cut.idealSmokeTempF,
            targetInternalTempF: r.targetInternalTempF || cut.targetInternalTempF,
            cookingStrategy: r.verifiedCookingStrategy || cut.cookingStrategy,
            verifiedStatus: 'Global Online Verified',
            onlineVerificationDate: new Date().toISOString(),
            onlineSourceCitations: r.sourceCitations || ['USDA NAMP Meat Buyers Guide'],
            updatedAt: new Date().toISOString(),
          };

          currentList = addOrUpdateVerifiedMeatCut(updatedCut);
          setVerifiedCuts(currentList);
          countSuccess++;
        }
      } catch (e) {
        console.warn(`Failed online verification for cut ${cut.name}:`, e);
      }
    }

    setIsBatchVerifying(false);
    setTeachSuccessNotice(`🎉 Automated Verification Complete! Verified ${countSuccess} cuts against global online butcher databases.`);
    setTimeout(() => setTeachSuccessNotice(null), 5000);
  };

  // Handler: Save Manually Created Cut (With Automated Online Verification)
  const handleSaveNewManualCut = () => {
    if (!newCutName.trim()) return;

    const aliasList = newCutAliases
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const featureList = newCutFeatures
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const newCut: VerifiedMeatCut = {
      id: `cut-user-${Date.now()}`,
      name: newCutName.trim(),
      aliases: aliasList,
      proteinType: newCutProtein,
      primalOrigin: newCutPrimal.trim() || 'Subprimal Cut',
      impsCode: newCutImps.trim() || 'IMPS Custom',
      description: newCutDesc.trim() || 'Custom user confirmed meat cut.',
      visualKeyFeatures: featureList.length ? featureList : ['User verified muscle structure'],
      idealSmokeTempF: 225,
      targetInternalTempF: 140,
      cookingStrategy: 'Low and slow smoking to target temperature.',
      verifiedStatus: 'Local User Confirmed',
      samplePhotoUrl: newCutPhotoBase64 || undefined,
      userUploadedPhotos: newCutPhotoBase64 ? [newCutPhotoBase64] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = addOrUpdateVerifiedMeatCut(newCut);
    setVerifiedCuts(updated);
    setIsAddCutModalOpen(false);

    setNewCutName('');
    setNewCutAliases('');
    setNewCutPrimal('');
    setNewCutImps('');
    setNewCutDesc('');
    setNewCutFeatures('');
    setNewCutPhotoBase64(null);

    // Automate Verification: If online, immediately cross-verify against live USDA/NAMP online data
    if (isOnline) {
      setTeachSuccessNotice(`✅ Added "${newCut.name}"! Auto-verifying against online USDA/NAMP databases...`);
      handleVerifyCutOnline(newCut);
    } else {
      setTeachSuccessNotice(`✅ Added "${newCut.name}" to Local Confirmed Database (Will auto-verify when back online).`);
      setTimeout(() => setTeachSuccessNotice(null), 4000);
    }
  };


  // Add a Custom Rule to Memory Vault
  const handleAddCustomRule = (titleInput?: string, detailInput?: string, catInput?: CharGPTRule['category']) => {
    const t = titleInput || teachTitle;
    const d = detailInput || teachDetail;
    const c = catInput || teachCategory;

    if (!t.trim() || !d.trim()) return;

    const newRule: CharGPTRule = {
      id: `rule-user-${Date.now()}`,
      category: c,
      title: t.trim(),
      detail: d.trim(),
      source: 'user_taught',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidenceScore: 100,
      sampleSize: 1,
      approvalStatus: 'approved',
    };

    const updated: CharGPTMemory = {
      ...charGPTMemory,
      totalInteractions: charGPTMemory.totalInteractions + 1,
      userName: t.trim() === 'Pitmaster Name' ? d.replace(/^User's name is\s+/i, '').trim() : charGPTMemory.userName,
      learnedRules: [newRule, ...charGPTMemory.learnedRules.filter((rule) => t.trim() !== 'Pitmaster Name' || rule.title !== 'Pitmaster Name')],
      lastEvolvedAt: new Date().toISOString(),
    };

    setCharGPTMemory(updated);
    saveCharGPTMemory(updated);
    if (onMemoryUpdate) onMemoryUpdate(updated);

    if (!titleInput) {
      setTeachTitle('');
      setTeachDetail('');
    }

    setPendingMemoryCandidate(null);
    setTeachSuccessNotice(`Saved to ${AI_NAME} Memory Vault on this device. Account synchronization is reported separately.`);
    setTimeout(() => setTeachSuccessNotice(null), 4000);
  };

  // Delete a Rule from Memory
  const handleDeleteRule = (ruleId: string) => {
    addDeletedVaultRuleId(ruleId);
    const updatedRules = charGPTMemory.learnedRules.filter((r) => r.id !== ruleId);
    const updated: CharGPTMemory = { ...charGPTMemory, learnedRules: updatedRules };
    setCharGPTMemory(updated);
    saveCharGPTMemory(updated);
    if (onMemoryUpdate) onMemoryUpdate(updated);
  };

  // Clear All Rules from Memory Vault
  const handleClearAllRules = () => {
    if (charGPTMemory.learnedRules.length === 0) return;
    if (window.confirm(`Are you sure you want to delete all ${charGPTMemory.learnedRules.length} rule(s) from the ${AI_NAME} Memory Vault?`)) {
      const allIds = charGPTMemory.learnedRules.map((r) => r.id);
      addDeletedVaultRuleId(allIds);
      const updated: CharGPTMemory = { ...charGPTMemory, learnedRules: [] };
      setCharGPTMemory(updated);
      saveCharGPTMemory(updated);
      if (onMemoryUpdate) onMemoryUpdate(updated);
    }
  };

  // Offline Assistant Response Generator
  const generateOfflineResponse = (query: string): string => {
    void query;
    return `⚠️ **CharGPT unavailable offline**\n\nNo AI cooking advice, account analysis, monitoring, or memory update was generated. Reconnect and retry. Your typed message remains in this device's chat history.`;
  };

  const handleAsk = async (userQuery?: string, attachedImageBase64?: string | null) => {
    const queryToUse = userQuery || prompt;
    const imgToSend = attachedImageBase64 !== undefined ? attachedImageBase64 : chatImageBase64;

    if (!queryToUse.trim() && !imgToSend) return;

    setChatImageBase64(null);

    const effectiveQuery = queryToUse.trim() || (imgToSend ? 'Please analyze this attached photo of my scale or meat packaging and calculate thermal metrics.' : '');

    const userMsgObj: StoredChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user' as const,
      text: effectiveQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageData: imgToSend || undefined,
    };

    const newMessages = [...messages, userMsgObj];
    setMessages(newMessages);
    if (!userQuery) setPrompt('');
    setLoading(true);

    // Perform Strict BBQ Topic Constraint check
    const activeEmail = currentUserEmail || '';
    const devOverride = getCharGPTDeveloperOverride(activeEmail);
    const bbqCheck = validateBBQTopicConstraint(effectiveQuery, devOverride.allowed);

    if (!bbqCheck.isBBQ) {
      setTimeout(() => {
        setMessages([
          ...newMessages,
          {
            id: `msg-assistant-${Date.now()}`,
            role: 'assistant',
            text: `⛔ **CharGPT Strict BBQ Guardrail Active**\n\nI am CharGPT, an AI specifically engineered and constrained to BBQ, smoking meats, grilling, wood pellet physics, and pitmaster science. I cannot respond to non-BBQ topics.\n\n*(Note: Non-BBQ developer testing prompts can only be unlocked with express Developer Master Permission from the verified developer account: \`jonathanblunt1214@gmail.com\` via the Master Admin Dashboard.)*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
      }, 400);
      return;
    }

    // If offline, use local offline assistant generator
    if (!navigator.onLine) {
      setTimeout(() => {
        const offlineText = generateOfflineResponse(effectiveQuery);
        setMessages([
          ...newMessages,
          {
            id: `msg-assistant-${Date.now()}`,
            role: 'assistant',
            text: offlineText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      let imagePayload = null;
      if (imgToSend) {
        const parts = imgToSend.split(',');
        const mimeType = parts[0]?.split(';')[0]?.split(':')[1] || 'image/jpeg';
        const data = parts[1] || '';
        imagePayload = { data, mimeType };
      }

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;

      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          prompt: effectiveQuery,
          image: imagePayload,
          isDevOverride: devOverride.allowed,
          selectedCookId: selectedCookId || 'ALL_LOGS',
          conversationHistory: newMessages.map((m) => ({ role: m.role, text: m.text })),
          massCookInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.text) {
        throw new Error(data.error || `${AI_NAME} is unavailable. No answer was generated.`);
      }
      const rawAssistantText = String(data.text).trim();
      const contextSummary = data.context?.authenticated
        ? `Verified account context • ${data.context.cookRecordCount || 0} cook record(s) • ${data.context.memoryRuleCount || 0} approved memory rule(s)`
        : 'General guidance only • no account data used';
      setLastContextSummary(contextSummary);

      // Detect only an explicit name statement and ask for confirmation. A chat
      // turn is not permission to write durable memory.
      let extractedName: string | null = null;
      const promptNameMatch = effectiveQuery.match(/(?:my name is|i'm|i am|call me|you can call me|name is|name's)\s+([a-zA-Z0-9_ -]{1,25})/i);
      if (promptNameMatch && promptNameMatch[1]) {
        extractedName = promptNameMatch[1].trim().replace(/[.,!?;:]/g, '');
      }
      if (extractedName) {
        setPendingMemoryCandidate({ title: 'Pitmaster Name', detail: `User's name is ${extractedName}`, category: 'general' });
      }

      setMessages([
        ...newMessages,
        {
          id: `msg-assistant-${Date.now()}`,
          role: 'assistant',
          text: rawAssistantText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          availability: data.availability || 'available',
          groundingStatus: data.groundingStatus,
          contextSummary,
        },
      ]);
    } catch (e: any) {
      const unavailableText = `⚠️ **${AI_NAME} unavailable**\n\n${e?.message || 'No AI answer was generated.'}\n\nNo cooking advice, account action, or memory update was generated. Your message remains in this device's chat history so you can retry.`;
      setMessages([
        ...newMessages,
        {
          id: `msg-assistant-${Date.now()}`,
          role: 'assistant',
          text: unavailableText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          availability: 'unavailable',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { short: '📊 Log Analysis', full: `📊 Run ${AI_NAME} Data Analysis Audit on all my cook logs` },
    { short: '🍳 Smart Recipe Match', full: '🍳 Suggest a smart recipe match based on my wood inventory & smoker profile' },
    { short: '🧪 Fuel Efficiency', full: '🧪 Analyze my Custom Fuel Blend burn efficiency & runtimes' },
    { short: '🧠 Learned Memory', full: `🧠 What rules and preferences has ${AI_NAME} learned about me?` },
    { short: '🎯 Bark Optimization', full: '🎯 How can I improve bark formation on my next smoke?' },
  ];

  return (
    <div className="modal-container space-y-4 sm:space-y-5 pb-12">
      {/* HEADER BANNER & MEMORY VAULT */}
      <div className="bg-gradient-to-r from-purple-950/70 via-[#1d1a24] to-orange-950/60 border border-purple-500/30 rounded-2xl p-3 sm:p-5 shadow-2xl space-y-3 sm:space-y-4">
        {/* MOBILE SLEEK HEADER (sm:hidden) */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 via-orange-500 to-amber-400 p-0.5 shadow-md shrink-0">
                <div className="w-full h-full bg-[#121018] rounded-[10px] flex items-center justify-center text-purple-300">
                  <Brain className="w-4 h-4 text-purple-300 animate-pulse" />
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white tracking-tight truncate">
                  {AI_PITMASTER_NAME}
                </h2>
                <span className="text-[9px] font-mono font-bold text-amber-300 flex items-center gap-1">
                  <span>🧠 {charGPTMemory.learnedRules.length} Rules in Vault</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileHeaderExpanded(!isMobileHeaderExpanded)}
              className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-[10px] font-extrabold rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer min-h-[32px]"
            >
              <span>{isMobileHeaderExpanded ? 'Hide Details' : 'Details'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isMobileHeaderExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* EXPANDABLE MOBILE DETAILS */}
          {isMobileHeaderExpanded && (
            <div className="pt-2 border-t border-purple-500/20 space-y-2 text-[11px] animate-fadeIn">
              <p className="text-purple-200/90 leading-snug">
                Self-evolving BBQ Intelligence powered by Gemini AI — Learns from cook log analytics, wood blends, and custom rules.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {isOnline ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>🟢 Online</span>
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>⚡ Offline</span>
                  </span>
                )}
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]">
                  🔥 Smoker: {profile.name || 'Smoker Rig'}
                </span>
              </div>
              <div className="bg-[#14121a] border border-purple-500/20 rounded-xl p-2 flex justify-between text-[11px] text-purple-200">
                <span>Interactions: <strong className="text-white">{charGPTMemory.totalInteractions}</strong></span>
                <span>Logs Analyzed: <strong className="text-white">{charGPTMemory.totalLogsAnalyzed}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP FULL HEADER (hidden sm:block) */}
        <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-[#121018] rounded-[14px] flex items-center justify-center text-purple-300">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300 animate-pulse" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {AI_PITMASTER_NAME}
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Learning Chatbot</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200/80 mt-0.5 leading-normal">
                Self-evolving BBQ Intelligence powered by Gemini AI — Learns from cook log analytics, wood blends, and custom rules.
              </p>

              {/* Linked Smoker & User Account & Online/Offline Status Badge */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                {isOnline ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>🟢 Online (Gemini Grounded)</span>
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 animate-pulse">
                    <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>⚡ Offline Mode (Local Engine)</span>
                  </span>
                )}

                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  🔥 Linked Smoker: <strong className="text-white font-bold truncate max-w-[140px] sm:max-w-none">{profile.name || 'Smoker Rig'}</strong>
                </span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  👤 Account: <strong className="text-white font-bold">{currentUserEmail && currentUserEmail.trim() ? currentUserEmail : 'None'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Memory Vault Summary Card */}
          <div className="bg-[#14121a] border border-purple-500/30 rounded-xl p-3 w-full md:w-64 space-y-1 shadow-inner shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1 truncate">
                <Brain className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">{AI_NAME} Memory Vault</span>
              </span>
              <span className="text-[11px] font-bold text-amber-300 font-mono shrink-0">
                {charGPTMemory.learnedRules.length} Rules
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-500/20 text-xs font-medium text-purple-200/90">
              <div className="flex justify-between">
                <span>Interactions:</span>
                <span className="font-bold text-white">{charGPTMemory.totalInteractions}</span>
              </div>
              <div className="flex justify-between">
                <span>Logs Analyzed:</span>
                <span className="font-bold text-white">{charGPTMemory.totalLogsAnalyzed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smartphone & Desktop Percentage-Based Responsive Navigation Sub-Tabs & Audit Button */}
        <div className="border-t border-purple-500/20 pt-2 font-sans w-full min-w-0">
          {/* MOBILE & NARROW SCREENS (sm:hidden): Percentage-Based Dual Grid + Dropdown Menu */}
          <div className="sm:hidden space-y-2 w-full min-w-0">
            {/* Top Dropdown & Audit Button */}
            <div className="flex items-center gap-2 w-full min-w-0">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="flex-1 min-w-0 w-full bg-[#14121a] text-white text-xs font-bold border border-purple-500/40 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[42px] truncate cursor-pointer"
              >
                <option value="chat">✨ AI Chat</option>
                <option value="blend_optimizer">🧪 AI Wood & Pellet Blend</option>
                <option value="mass_calculator">⚖️ Weight & Mass Physics</option>
                <option value="meat_database">📖 Meat Cut DB ({verifiedCuts.length})</option>
                <option value="pitmaster_courses">🎓 Courses & Academies {is10kUnlocked ? '⚡ (10k Unlocked)' : '🔒 (10k Lock)'}</option>
                <option value="memory">🧠 Memory Vault ({charGPTMemory.learnedRules.length})</option>
                <option value="analytics">📊 BBQ Profile</option>
                <option value="alexa_push">🔔 Push & Alexa</option>
              </select>

              <button
                type="button"
                onClick={handleManualEvolve}
                className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 cursor-pointer transition-all min-h-[42px] shrink-0"
                title={`Force ${AI_NAME} to scan all cook logs and update memory`}
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                <span>Audit</span>
              </button>
            </div>

            {/* Percentage Grid 1: Primary 4 Tabs (25% Width Each = 100% Screen Responsive, 0% Clipping) */}
            <div className="grid grid-cols-4 gap-1 w-full min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`w-full min-w-0 px-1 py-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[38px] truncate ${
                  activeTab === 'chat'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'bg-[#181622] text-purple-300 hover:text-white border border-purple-500/20'
                }`}
                title="AI Chat"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blend_optimizer')}
                className={`w-full min-w-0 px-1 py-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[38px] truncate ${
                  activeTab === 'blend_optimizer'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md font-black'
                    : 'bg-[#181622] text-orange-300 hover:text-white border border-orange-500/20'
                }`}
                title="AI Blend Optimizer"
              >
                <FlaskConical className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">Blend</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mass_calculator')}
                className={`w-full min-w-0 px-1 py-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[38px] truncate ${
                  activeTab === 'mass_calculator'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'bg-[#181622] text-amber-300 hover:text-white border border-amber-500/20'
                }`}
                title="Weight & Mass Physics"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Weights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('meat_database')}
                className={`w-full min-w-0 px-1 py-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[38px] truncate ${
                  activeTab === 'meat_database'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md font-black'
                    : 'bg-[#181622] text-amber-300 hover:text-white border border-amber-500/20'
                }`}
                title="Meat Cut Database"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Cuts</span>
              </button>
            </div>

            {/* Percentage Grid 2: Secondary 4 Tabs */}
            <div className="grid grid-cols-4 gap-1 w-full min-w-0 pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('pitmaster_courses')}
                className={`w-full min-w-0 px-1 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[34px] truncate ${
                  activeTab === 'pitmaster_courses'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black shadow-md'
                    : is10kUnlocked
                    ? 'bg-[#122019] text-emerald-300 hover:text-white border border-emerald-500/30'
                    : 'bg-[#181622] text-amber-300/80 hover:text-white border border-amber-500/20'
                }`}
              >
                <GraduationCap className={`w-3 h-3 shrink-0 ${is10kUnlocked ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="truncate">Courses</span>
                {is10kUnlocked ? <span className="text-[8px] bg-emerald-500/30 text-emerald-300 px-1 rounded">10k</span> : <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('memory')}
                className={`w-full min-w-0 px-1 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[34px] truncate ${
                  activeTab === 'memory'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'bg-[#14121a] text-purple-300 hover:text-white border border-purple-500/20'
                }`}
              >
                <Brain className="w-3 h-3 shrink-0 text-purple-400" />
                <span className="truncate">Vault ({charGPTMemory.learnedRules.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`w-full min-w-0 px-1 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[34px] truncate ${
                  activeTab === 'analytics'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'bg-[#14121a] text-purple-300 hover:text-white border border-purple-500/20'
                }`}
              >
                <BarChart2 className="w-3 h-3 shrink-0 text-purple-400" />
                <span className="truncate">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alexa_push')}
                className={`w-full min-w-0 px-1 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[34px] truncate ${
                  activeTab === 'alexa_push'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'bg-[#14121a] text-purple-300 hover:text-white border border-purple-500/20'
                }`}
              >
                <Bell className="w-3 h-3 shrink-0 text-purple-400" />
                <span className="truncate">Push</span>
              </button>
            </div>
          </div>

          {/* TABLET / DESKTOP ROW (hidden sm:flex): Screen Percentage Flex Bar */}
          <div className="hidden sm:flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center space-x-1 bg-[#14121a] p-1 rounded-xl border border-purple-500/20 w-full min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'chat'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">AI Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blend_optimizer')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'blend_optimizer'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-orange-300 hover:text-white hover:bg-orange-500/10'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">Blend</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mass_calculator')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'mass_calculator'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/10'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Weights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('meat_database')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'meat_database'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md font-black'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/10'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Meat Cuts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pitmaster_courses')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'pitmaster_courses'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-zinc-950 font-black shadow-md'
                    : is10kUnlocked
                    ? 'text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/30'
                    : 'text-amber-300/90 hover:text-white hover:bg-amber-500/10'
                }`}
                title={is10kUnlocked ? "10,000-Hour Master Pitmaster Course Intelligence Active" : "Requires 10,000 Total Hours"}
              >
                <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${is10kUnlocked ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="truncate">🎓 Courses</span>
                {is10kUnlocked ? (
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 font-mono px-1 rounded ml-0.5">10k</span>
                ) : (
                  <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('memory')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'memory'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <Brain className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Vault ({charGPTMemory.learnedRules.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'analytics'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alexa_push')}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] truncate ${
                  activeTab === 'alexa_push'
                    ? 'bg-purple-500 text-zinc-950 shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Push</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleManualEvolve}
              className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-all shrink-0 min-h-[36px]"
              title={`Force ${AI_NAME} to scan all cook logs and update memory`}
            >
              <RefreshCw className="w-3 h-3 shrink-0" />
              <span className="truncate">Audit</span>
            </button>
          </div>
        </div>
      </div>

      {teachSuccessNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{teachSuccessNotice}</span>
        </div>
      )}

      {/* TAB 1: AI CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#2a2a2a] w-full min-w-0">
            {/* Cut-off-proof Custom Scope Popover Dropdown */}
            <div className="relative min-w-0 flex-1 w-full sm:w-auto">
              <div className="flex items-center space-x-2 min-w-0 w-full">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider shrink-0">
                  Scope:
                </span>

                <div className="relative flex-1 min-w-0 w-full">
                  <button
                    type="button"
                    onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
                    className="bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-purple-500/40 text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 font-medium flex items-center justify-between space-x-2 w-full cursor-pointer transition-all min-w-0 shadow-inner"
                    title="Change AI Analysis Context Scope"
                  >
                    <span className="truncate min-w-0 flex-1 text-left font-bold text-purple-300 text-[11px] sm:text-xs">
                      {selectedCookId === 'ALL_LOGS' ? (
                        `📊 All Cook Logs (${cookLogs.length} Sessions)`
                      ) : (
                        (() => {
                          const activeC = cookLogs.find((c) => c.id === selectedCookId);
                          return activeC ? `🔥 ${activeC.title}` : 'Select Scope...';
                        })()
                      )}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-purple-400 shrink-0 transition-transform duration-200 ${
                        isScopeMenuOpen ? 'rotate-180 text-orange-400' : ''
                      }`}
                    />
                  </button>

                  {/* Floating Scope Dropdown Popover */}
                  {isScopeMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#181524] border border-purple-500/50 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto p-1 space-y-0.5 w-full min-w-[220px] max-w-[92vw]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCookId('ALL_LOGS');
                          setIsScopeMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between min-w-0 ${
                          selectedCookId === 'ALL_LOGS'
                            ? 'bg-purple-500 text-zinc-950 font-black shadow-md'
                            : 'text-purple-200 hover:bg-purple-500/20'
                        }`}
                      >
                        <span className="truncate min-w-0 flex-1 font-bold">
                          📊 All Cook Logs ({cookLogs.length} Sessions Context)
                        </span>
                        {selectedCookId === 'ALL_LOGS' && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>

                      <div className="border-t border-purple-500/20 my-1"></div>

                      {cookLogs.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCookId(c.id);
                            setIsScopeMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between min-w-0 ${
                            selectedCookId === c.id
                              ? 'bg-purple-500 text-zinc-950 font-black shadow-md'
                              : 'text-zinc-200 hover:bg-purple-500/20'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold truncate text-[11px] sm:text-xs">{c.title}</div>
                            <div className="text-[9px] opacity-80 font-mono truncate">{c.proteinCut} • {c.date}</div>
                          </div>
                          {selectedCookId === c.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {activeCook ? (
                <button
                  type="button"
                  onClick={() => handleAddAnalysedCutFromCookLog(activeCook)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] rounded-lg transition-all flex items-center space-x-1 shrink-0 cursor-pointer shadow-sm"
                  title={`Add analysed meat cut "${activeCook.proteinCut || activeCook.title}" to Target Temps Guide`}
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Cut to Guide</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBatchImportAllCookLogCuts}
                  className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[11px] rounded-lg transition-all flex items-center space-x-1 shrink-0 cursor-pointer shadow-sm"
                  title="Import analysed meat cuts from all cook logs into Target Temps Guide"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sync Log Cuts to Guide</span>
                </button>
              )}

              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 shrink-0 max-w-full truncate">
                <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{charGPTMemory.learnedRules.length} Active Rules</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Capability status</span>
              <span>{isOnline ? 'AI guidance available when the server verifies the request.' : 'AI guidance unavailable offline.'} {lastContextSummary}</span>
              <span className="block text-emerald-300/80 mt-0.5">Chat is read-only: it cannot save records, control equipment, or continuously monitor a cook.</span>
            </div>
          </div>

          {pendingMemoryCandidate && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold block">Remember this?</span>
                <span>{pendingMemoryCandidate.detail}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => handleAddCustomRule(pendingMemoryCandidate.title, pendingMemoryCandidate.detail, pendingMemoryCandidate.category)} className="px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-950 font-bold">Confirm & save</button>
                <button type="button" onClick={() => setPendingMemoryCandidate(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-bold">Not now</button>
              </div>
            </div>
          )}

          {/* Quick Prompts - 5 Suggestions Horizontal Swipe Carousel */}
          <div className="relative w-full min-w-0 bg-[#121212] border border-[#2a2a2a] rounded-xl p-2 shadow-inner">
            <div className="flex items-center space-x-2 overflow-x-auto web-carousel-scrollbar touch-pan-x py-1 px-1 min-w-0">
              <div className="flex items-center space-x-1 text-orange-400 font-bold text-xs shrink-0 mr-1 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">Suggestions ({quickPrompts.length}):</span>
              </div>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(qp.full)}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-purple-900/40 hover:border-purple-500/60 active:scale-95 text-orange-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-[#2e2e2e] cursor-pointer shrink-0 min-h-[32px] flex items-center space-x-1 shadow-sm whitespace-nowrap"
                >
                  <span>{qp.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="space-y-3.5 h-[52vh] max-h-[620px] min-h-[320px] overflow-y-auto touch-pan-y p-3 sm:p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a] scrollbar-thin scrollbar-thumb-purple-500/30">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-1 max-w-[88%] sm:max-w-2xl">
                  <div
                    className={`rounded-2xl p-3 sm:p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white font-medium font-sans shadow-md'
                        : 'bg-[#222222] border border-[#2a2a2a] text-zinc-100 font-sans'
                    }`}
                  >
                    {m.imageData && (
                      <div className="mb-2">
                        <img
                          src={m.imageData}
                          alt="Uploaded protein, scale, or packaging tag"
                          className="max-h-48 max-w-full rounded-xl border border-purple-400/40 object-cover shadow-lg"
                        />
                      </div>
                    )}
                    {m.text}
                  </div>

                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-0.5">
                      <span>{AI_NAME} • {m.timestamp}{m.contextSummary ? ` • ${m.contextSummary}` : ''}</span>
                      {m.availability !== 'unavailable' && m.availability !== 'error' && m.availability !== 'grounding_rejected' && (
                        <button
                        type="button"
                        onClick={() =>
                          handleAddCustomRule(
                            `${AI_NAME} Tip`,
                            m.text.slice(0, 180) + '...',
                            'technique'
                          )
                        }
                        className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer font-bold"
                        title={`Save response into ${AI_NAME} Memory Vault`}
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        <span>Save to Memory</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-purple-400 text-xs italic font-mono bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                <span>{AI_NAME} is consulting learned preferences & smoker log analytics...</span>
              </div>
            )}
          </div>

          {/* Attached Image Chip Preview */}
          {chatImageBase64 && (
            <div className="flex items-center justify-between bg-purple-950/50 border border-purple-500/40 px-3 py-2 rounded-xl text-xs text-purple-200">
              <div className="flex items-center space-x-2.5">
                <img
                  src={chatImageBase64}
                  alt="Attachment preview"
                  className="w-10 h-10 rounded-lg object-cover border border-purple-400/50 shadow-sm"
                />
                <div>
                  <span className="font-bold text-white block">Photo Attached</span>
                  <span className="text-[10px] text-purple-300">Scale readout / Meat packaging tag attached</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setChatImageBase64(null)}
                className="p-1 hover:bg-purple-800/40 text-purple-300 rounded-lg transition-all cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Input for Chat */}
          <input
            type="file"
            ref={chatFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setChatImageBase64(ev.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center space-x-2"
          >
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 min-h-[44px] flex items-center justify-center ${
                chatImageBase64
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md font-bold'
                  : 'bg-[#181818] hover:bg-[#242424] text-amber-400 border-[#333]'
              }`}
              title="Attach Photo of Scale, Meat Packaging, or Protein Cut"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={`Ask ${AI_NAME} or attach photo...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            />

            <button
              type="submit"
              disabled={loading || (!prompt.trim() && !chatImageBase64)}
              className="px-3.5 sm:px-5 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer min-h-[44px] shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask {AI_NAME}</span>
              <span className="sm:hidden">Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: AI WOOD & PELLET BLEND OPTIMIZER */}
      {activeTab === 'blend_optimizer' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2a2a2a]">
            <div>
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-5 h-5 text-orange-400 shrink-0" />
                <h3 className="text-base font-bold text-white">
                  AI Wood Species & Pellet Blend Optimizer
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                CharGPT accesses the pellet database and live retail price index to optimize custom fuel blends for flavor, thermal efficiency, or cost per pound.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                {customPresets.length} Saved Blend Presets
              </span>
            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
            {/* Optimization Goal */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Primary Optimization Goal</span>
              </label>
              <select
                value={blendGoal}
                onChange={(e) => setBlendGoal(e.target.value as any)}
                className="w-full bg-[#1c1c1c] border border-[#333] text-orange-400 font-bold text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
              >
                <option value="flavor">🌸 Flavor & Bark Optimization (Mahogany Bark + Aroma)</option>
                <option value="efficiency">⚡ Thermal & Burn Efficiency (High BTU + Low Ash)</option>
                <option value="cost">💵 Cost Efficiency (Lowest $ / LB Retail Price)</option>
                <option value="balanced">🏆 Balanced Competition Blend (All-Rounder)</option>
              </select>
            </div>

            {/* Target Protein */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Protein / Cut</span>
              </label>
              <select
                value={blendProtein}
                onChange={(e) => setBlendProtein(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#333] text-white font-semibold text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="Beef Brisket">Beef Brisket / Dino Ribs</option>
                <option value="Pork Shoulder">Pork Shoulder / Pork Butt</option>
                <option value="St. Louis Ribs">St. Louis & Baby Back Ribs</option>
                <option value="Poultry & Turkey">Spatchcock Turkey & Poultry</option>
                <option value="Wild Game">Venison & Wild Game</option>
                <option value="Universal All-Around">Universal All-Around Master Blend</option>
              </select>
            </div>

            {/* Optional Specific Prompt */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Specific Pitmaster Request</span>
              </label>
              <input
                type="text"
                value={blendPrompt}
                onChange={(e) => setBlendPrompt(e.target.value)}
                placeholder="e.g. Cold weather cook under $0.80/lb"
                className="w-full bg-[#1c1c1c] border border-[#333] text-white text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateBlend}
            disabled={isGeneratingBlend}
            className="w-full py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:opacity-95 text-zinc-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isGeneratingBlend ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>CharGPT AI Running Wood Physics & Price Optimization...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                <span>⚡ Optimize Wood & Pellet Blend with CharGPT AI</span>
              </>
            )}
          </button>

          {blendSaveNotice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{blendSaveNotice}</span>
            </div>
          )}

          {/* GENERATED BLEND RESULT CARD */}
          {generatedBlend && (
            <div className="bg-gradient-to-b from-[#221f18] to-[#161410] border border-orange-500/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-500/20 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h4 className="text-base font-black text-white">{generatedBlend.title}</h4>
                  </div>
                  <p className="text-xs text-amber-300/80 mt-0.5">{generatedBlend.flavorNotes}</p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGeneratedBlendAsPreset}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save as Custom Blend Preset</span>
                </button>
              </div>

              {/* 4 Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#121212] border border-[#2a2a2a] p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Thermal BTU / LB</span>
                  <span className="text-sm font-black text-orange-400 font-mono">{generatedBlend.calculatedBtuPerLb} BTU</span>
                </div>
                <div className="bg-[#121212] border border-[#2a2a2a] p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Burn Efficiency</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{generatedBlend.calculatedEfficiencyRating}%</span>
                </div>
                <div className="bg-[#121212] border border-[#2a2a2a] p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Retail Cost / LB</span>
                  <span className="text-sm font-black text-amber-400 font-mono">${Number(generatedBlend.calculatedCostPerLb).toFixed(2)}</span>
                </div>
                <div className="bg-[#121212] border border-[#2a2a2a] p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Runtime / 10 Lbs</span>
                  <span className="text-sm font-black text-purple-300 font-mono">{generatedBlend.estimatedRunTimeHoursPer10Lbs} hrs</span>
                </div>
              </div>

              {/* Components Ratio Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-400" />
                  <span>Engineered Species Ratios</span>
                </h5>
                <div className="space-y-2">
                  {generatedBlend.components?.map((c: any, idx: number) => (
                    <div key={idx} className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg font-mono">
                          {c.percentage}%
                        </span>
                        <div>
                          <span className="text-xs font-black text-white block">{c.woodType}</span>
                          <span className="text-[11px] text-zinc-400">{c.reason}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-400 shrink-0">
                        <span>{c.smokeProfile}</span>
                        <span className="text-amber-400 font-bold">${c.costPerLb}/lb</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pitmaster Explanation */}
              <div className="bg-[#121212] border border-[#2a2a2a] p-3.5 rounded-xl space-y-1.5">
                <h5 className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span>CharGPT Thermodynamic Analysis</span>
                </h5>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {generatedBlend.pitmasterExplanation}
                </p>
              </div>
            </div>
          )}

          {/* SAVED PRESETS LIST */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>Saved Fuel Blend Presets ({customPresets.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customPresets.map((preset) => (
                <div key={preset.id} className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white truncate">{preset.title}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      ${Number(preset.costPerLb || 0.78).toFixed(2)}/lb
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{preset.description}</p>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono text-orange-300">
                    {preset.components?.map((comp, idx) => (
                      <span key={idx} className="bg-[#1c1c1c] border border-[#2a2a2a] px-2 py-0.5 rounded">
                        {comp.woodType || comp.species} ({comp.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEIGHT & MASS CALCULATOR */}
      {activeTab === 'mass_calculator' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2a2a2a]">
            <div>
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-bold text-white">
                  Meat Mass Calculator
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Calculate cook duration, target temps, wrap timing, and fuel burn by meat weight or photo scan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const massQuery = `Actively analyze and optimize my mass-based cook strategy for a ${massResult.weightLbs} lbs (${massResult.weightKg} kg) ${massProtein} ${massCut} cooked at ${massPitTempF}°F. Estimated duration is ${massResult.estimatedCookTimeFormatted}, fuel needed is ${massResult.estimatedFuelLbs} lbs. Provide custom CharGPT recommendations.`;
                  setActiveTab('chat');
                  handleAsk(massQuery);
                }}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
              >
                <Sparkles className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                <span>Ask CharGPT to Optimize Strategy</span>
              </button>

              {onNavigateToPlanner && (
                <button
                  type="button"
                  onClick={() => onNavigateToPlanner()}
                  className="px-3 py-2 bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] text-amber-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Send to Cook Planner</span>
                </button>
              )}

              {onNavigateToNewCook && (
                <button
                  type="button"
                  onClick={() => onNavigateToNewCook()}
                  className="px-3 py-2 bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] text-orange-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Log This Mass Cook</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* INPUT CONTROLS (5 COLS) */}
            <div className="lg:col-span-5 bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
              {/* COMPUTER VISION PHOTO SCANNER BOX */}
              <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                        Scan Photo of Scale or Packaging
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        Upload or snap a photo of a scale reading or meat sticker to auto-detect weight!
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={calcFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAnalyzeMeatPhoto(file);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => calcFileInputRef.current?.click()}
                    disabled={isAnalyzingMeatPhoto}
                    className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1 transition-all cursor-pointer shrink-0 disabled:opacity-50 min-h-[36px]"
                  >
                    {isAnalyzingMeatPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Scan Photo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Analyzing Pulse Status */}
                {isAnalyzingMeatPhoto && (
                  <div className="flex items-center space-x-2.5 bg-[#181818] border border-amber-500/40 p-2.5 rounded-xl text-xs text-amber-300 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-white text-[11px]">CharGPT Computer Vision Active</span>
                      <span className="text-[10px] text-zinc-400">Reading digital scale digits, butcher label net wt, or protein volume...</span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {photoAnalysisError && (
                  <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-xs text-red-300 flex items-center justify-between">
                    <span>⚠️ {photoAnalysisError}</span>
                    <button onClick={() => setPhotoAnalysisError(null)} className="text-zinc-400 hover:text-white text-xs font-bold p-1">Dismiss</button>
                  </div>
                )}

                {/* Success Analysis Result Card */}
                {photoAnalysisResult && (
                  <div className="bg-[#181818] border border-emerald-500/40 p-3 rounded-xl space-y-2 relative shadow-md">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start space-x-2.5">
                        {photoAnalysisResult.photoPreviewUrl && (
                          <img
                            src={photoAnalysisResult.photoPreviewUrl}
                            alt="Scanned meat photo"
                            className="w-14 h-14 rounded-lg object-cover border border-emerald-500/40 shrink-0 shadow"
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                              Label & Scale Data Auto-Filled!
                            </span>
                            {photoAnalysisResult.detectedUsdaGrade && photoAnalysisResult.detectedUsdaGrade !== 'N/A' && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-[9px] rounded uppercase">
                                {photoAnalysisResult.detectedUsdaGrade}
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-black text-white font-mono">
                            {photoAnalysisResult.detectedWeightValue} {photoAnalysisResult.detectedWeightUnit} • {photoAnalysisResult.detectedProteinCut}
                          </div>

                          {/* Extra Pricing & Scale Details */}
                          {(photoAnalysisResult.detectedPricePerLb || photoAnalysisResult.detectedTotalPrice || photoAnalysisResult.detectedTareWeight) && (
                            <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-300 flex-wrap">
                              {photoAnalysisResult.detectedPricePerLb && (
                                <span>${photoAnalysisResult.detectedPricePerLb}/lb</span>
                              )}
                              {photoAnalysisResult.detectedTotalPrice && (
                                <span>• Total: <strong className="text-emerald-300">${photoAnalysisResult.detectedTotalPrice}</strong></span>
                              )}
                              {photoAnalysisResult.detectedTareWeight && (
                                <span className="text-zinc-400">• Scale Tare: {photoAnalysisResult.detectedTareWeight}</span>
                              )}
                            </div>
                          )}

                          <div className="text-[10px] text-zinc-300 leading-normal italic">
                            "{photoAnalysisResult.explanation}"
                          </div>

                          <div className="bg-[#121212] border border-[#2e2e2e] rounded-lg p-1.5 text-[9px] text-amber-300/90 font-mono flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Auto-Configured: {massPitTempF}°F Pit • {massTargetTempF}°F Target • {massWrapStrategy} • {massBoneOption}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setPhotoAnalysisResult(null)}
                        className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5 pt-1">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Meat Mass Parameters</span>
              </h4>

              {/* Protein & Cut */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Protein Category
                  </label>
                  <select
                    value={massProtein}
                    onChange={(e) => setMassProtein(e.target.value as ProteinType)}
                    className="w-full bg-[#1c1c1c] border border-[#333] text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="">Select Protein Category...</option>
                    <option value="Beef">Beef</option>
                    <option value="Pork">Pork</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Turkey">Turkey</option>
                    <option value="Lamb">Lamb</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Venison">Venison & Game</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Meat Cut Description
                  </label>
                  <input
                    type="text"
                    value={massCut}
                    onChange={(e) => setMassCut(e.target.value)}
                    placeholder="e.g. Packer Brisket, Boston Butt, Dino Ribs"
                    className="w-full bg-[#1c1c1c] border border-[#333] text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Mass / Weight Value & Unit Toggle */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Meat Mass / Weight
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 flex items-center bg-[#1c1c1c] border border-[#333] rounded-xl px-3 py-1.5">
                      <Scale className="w-4 h-4 text-amber-400 shrink-0 mr-2" />
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="200"
                        placeholder="0.0"
                        value={massWeightValue}
                        onChange={(e) => setMassWeightValue(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent text-white font-black text-sm focus:outline-none"
                      />
                      <span className="text-xs font-mono font-bold text-amber-400">{massWeightUnit}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof massWeightValue === 'number' && massWeightValue > 0) {
                          if (massWeightUnit === 'lbs') {
                            setMassWeightUnit('kg');
                            setMassWeightValue(parseFloat((massWeightValue / 2.20462).toFixed(1)));
                          } else {
                            setMassWeightUnit('lbs');
                            setMassWeightValue(parseFloat((massWeightValue * 2.20462).toFixed(1)));
                          }
                        } else {
                          setMassWeightUnit(massWeightUnit === 'lbs' ? 'kg' : 'lbs');
                        }
                      }}
                      className="px-3 py-2 bg-[#252525] hover:bg-[#303030] border border-[#3a3a3a] text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {massWeightUnit === 'lbs' ? '→ Switch to Kg' : '→ Switch to Lbs'}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Equivalent: <strong className="text-zinc-300">{massResult.weightLbs} lbs</strong> ({massResult.weightKg} kg)
                  </p>
                </div>

                {/* Target Pit Temp */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Target Pit Temperature (°F)
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">{massPitTempF}°F</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="350"
                    step="5"
                    value={massPitTempF}
                    onChange={(e) => setMassPitTempF(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>180°F (Cold)</span>
                    <span>225°F (Low & Slow)</span>
                    <span>275°F (Hot & Fast)</span>
                    <span>350°F</span>
                  </div>
                </div>

                {/* Target Finish Temp */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Target Internal Finish Temp (°F)
                  </label>
                  <input
                    type="number"
                    value={massTargetTempF}
                    onChange={(e) => setMassTargetTempF(Number(e.target.value))}
                    className="w-full bg-[#1c1c1c] border border-[#333] text-white font-mono font-bold text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Wrap Strategy */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Wrap Strategy
                  </label>
                  <select
                    value={massWrapStrategy}
                    onChange={(e) => setMassWrapStrategy(e.target.value as any)}
                    className="w-full bg-[#1c1c1c] border border-[#333] text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="Peach Butcher Paper">Peach Butcher Paper (Bark Retention + Moisture)</option>
                    <option value="Foil Boat">Foil Boat (Exposed Top Bark + Rendered Fat Bath)</option>
                    <option value="Aluminum Foil">Aluminum Foil (Maximum Speed Texas Crutch)</option>
                    <option value="Covered Pan">Covered Pan / Braise</option>
                    <option value="No Wrap">No Wrap (Naked Smoke All Way)</option>
                  </select>
                </div>

                {/* Bone & Thickness Profile */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Bone Profile</label>
                    <select
                      value={massBoneOption}
                      onChange={(e) => setMassBoneOption(e.target.value as any)}
                      className="w-full bg-[#1c1c1c] border border-[#333] text-white text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="Boneless">Boneless Cut</option>
                      <option value="Bone-In">Bone-In Cut</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Thickness</label>
                    <select
                      value={massThicknessProfile}
                      onChange={(e) => setMassThicknessProfile(e.target.value as any)}
                      className="w-full bg-[#1c1c1c] border border-[#333] text-white text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="Standard Whole Muscle">Standard Muscle</option>
                      <option value="Thick Uniform Mass">Thick Uniform Mass</option>
                      <option value="Thin Flat Slab">Thin Flat Slab</option>
                      <option value="Compact Roast">Compact Roast</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* CALCULATED MASS PHYSICS METRICS (7 COLS) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Top Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#121212] border border-amber-500/30 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Est. Cook Duration</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {massResult.estimatedCookTimeFormatted}
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    ~{(massResult.estimatedCookHours / massResult.weightLbs).toFixed(2)} hrs per lb mass
                  </p>
                </div>

                <div className="bg-[#121212] border border-orange-500/30 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-orange-400 text-[11px] font-bold uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Fuel Payload Needed</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {massResult.estimatedFuelLbs} lbs
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Based on active smoker burn rate
                  </p>
                </div>

                <div className="bg-[#121212] border border-purple-500/30 p-3.5 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center space-x-1.5 text-purple-400 text-[11px] font-bold uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Stall & Wrap Window</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {massResult.recommendedWrapTempF}°F
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Est. Hour {massResult.estimatedWrapHour} (Stall: {massResult.stallWindowStartTempF}°F)
                  </p>
                </div>
              </div>

              {/* Secondary Metrics Bar */}
              <div className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Recommended Rest</span>
                  <strong className="text-amber-300 font-mono font-bold text-sm">{massResult.recommendedRestFormatted}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Spritz Interval</span>
                  <strong className="text-zinc-200 font-mono font-bold text-sm">Every {massResult.spritzIntervalMinutes} mins</strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Heat Energy Absorption</span>
                  <strong className="text-orange-300 font-mono font-bold text-sm">{massResult.heatAbsorptionBtu.toLocaleString()} BTUs</strong>
                </div>
              </div>

              {/* Wood Pairing Recommendation */}
              <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl flex items-center space-x-3 text-xs text-amber-200">
                <span className="text-lg">🪵</span>
                <div>
                  <span className="font-bold text-amber-300 block">Recommended Hardwood / Pellet Blend for Mass:</span>
                  <span className="text-zinc-300">{massResult.recommendedWoodPairing}</span>
                </div>
              </div>

              {/* MASS COOK TIMELINE STEPS */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mass Cook Physics Timeline ({massResult.weightLbs} lbs)</span>
                </h4>

                <div className="space-y-2 max-h-[48vh] sm:max-h-[440px] overflow-y-auto touch-pan-y pr-1">
                  {massResult.massCookSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-[#141414] border border-[#262626] p-3 rounded-xl space-y-1 hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-amber-400 font-mono">{step.phase}</span>
                        <span className="text-[10px] font-mono font-bold bg-[#202020] text-zinc-300 px-2 py-0.5 rounded-md border border-[#333]">
                          {step.targetHourOrTemp}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-white">{step.actionTitle}</h5>
                      <p className="text-[11px] text-zinc-400 leading-normal">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: MEAT CUT IDENTIFIER & VERIFIED CATALOG */}
      {activeTab === 'meat_database' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-5">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2a2a2a]">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Meat Cut Catalog</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Identify unknown meat cuts and maintain your local catalog verified against USDA standards.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Batch Auto-Verify Button */}
              <button
                type="button"
                onClick={handleBatchAutoVerifyUnverifiedCuts}
                disabled={isBatchVerifying}
                className={`px-3 py-2 rounded-xl font-black text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer min-h-[38px] ${
                  verifiedCuts.some((c) => c.verifiedStatus !== 'Global Online Verified')
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white animate-pulse'
                    : 'bg-[#222] text-zinc-400 border border-[#333]'
                }`}
                title="Automate online cross-verification for all unverified meat cuts"
              >
                {isBatchVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                    <span>Auto-Verifying...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 text-purple-300" />
                    <span>
                      Auto-Verify All ({verifiedCuts.filter((c) => c.verifiedStatus !== 'Global Online Verified').length})
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAddCutModalOpen(true)}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Confirmed Cut</span>
              </button>
            </div>
          </div>

          {/* Offline Mode Banner Notice */}
          {!isOnline && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200 flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> Scanned cuts and local additions are stored safely in browser memory. All unverified cuts will auto-verify against global USDA online databases when internet connectivity is restored.
              </span>
            </div>
          )}

          {/* SECTION 1: CHARGPT UNKNOWN CUT SCANNER */}
          <div className="bg-gradient-to-r from-purple-950/40 via-[#14121a] to-amber-950/30 border border-purple-500/30 rounded-2xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider flex items-center space-x-1.5">
                    <span>Scan & Identify Unknown Cut</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/30 font-mono">
                      Vision + AI
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Type a regional name (e.g. 'Picanha', 'Denver Cut', 'Spider Steak') or attach a photo of an unknown cut.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Bar & Attachment */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Enter unknown cut name, butcher label, or regional term..."
                    className="w-full bg-[#121212] border border-[#333] focus:border-purple-500 text-xs text-white rounded-xl pl-9 pr-3 py-2.5 outline-none font-medium min-h-[42px]"
                  />
                </div>

                <input
                  type="file"
                  ref={scanFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setScanImageBase64(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => scanFileInputRef.current?.click()}
                  className={`px-3 py-2.5 rounded-xl border transition-all text-xs font-bold cursor-pointer shrink-0 min-h-[42px] flex items-center space-x-1.5 ${
                    scanImageBase64
                      ? 'bg-purple-600 text-white border-purple-400 font-black shadow-md'
                      : 'bg-[#181818] hover:bg-[#242424] text-purple-300 border-[#333]'
                  }`}
                  title="Attach Photo of Unknown Cut"
                >
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span>{scanImageBase64 ? 'Photo Attached' : 'Attach Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleIdentifyUnknownCut}
                  disabled={isScanningCut || (!scanQuery.trim() && !scanImageBase64)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0 disabled:opacity-50 min-h-[42px]"
                >
                  {isScanningCut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning Muscle Structure...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Identify Cut</span>
                    </>
                  )}
                </button>
              </div>

              {/* Photo Preview Chip */}
              {scanImageBase64 && (
                <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/40 p-2.5 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <img
                      src={scanImageBase64}
                      alt="Unknown cut preview"
                      className="w-12 h-12 rounded-lg object-cover border border-purple-400/50 shadow"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Cut Photo Ready</span>
                      <span className="text-[10px] text-purple-300">Ready for visual muscle anatomy analysis</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanImageBase64(null)}
                    className="p-1 hover:bg-purple-800/40 text-purple-300 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Scan Error Banner */}
              {scanError && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-300 flex items-center justify-between">
                  <span>⚠️ {scanError}</span>
                  <button onClick={() => setScanError(null)} className="text-zinc-400 hover:text-white font-bold text-xs">Dismiss</button>
                </div>
              )}

              {/* SCANNER RESULT CARD */}
              {scanResult && (
                <div className="bg-[#121212] border border-amber-500/40 p-4 rounded-2xl space-y-3 relative shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#262626]">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {scanResult.confidenceScore}% Identification Confidence
                        </span>
                        {scanResult.impsCode && (
                          <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                            {scanResult.impsCode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white mt-1">
                        {scanResult.identifiedCutName}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                        Primal: <strong className="text-zinc-200">{scanResult.primalOrigin}</strong> • Protein: <strong className="text-amber-300">{scanResult.proteinType}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveScanResultToDatabase}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Save to Confirmed Cut Database</span>
                    </button>
                  </div>

                  {/* Aliases Chips */}
                  {scanResult.aliases && scanResult.aliases.length > 0 && (
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Aliases:</span>
                      {scanResult.aliases.map((alias, idx) => (
                        <span key={idx} className="text-[10px] bg-[#1a1a1a] border border-[#333] text-amber-200 px-2 py-0.5 rounded-md font-medium">
                          {alias}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Muscle Anatomy & Explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#181818] p-3 rounded-xl border border-[#222]">
                    <div>
                      <span className="font-bold text-purple-300 text-[11px] block uppercase tracking-wider">Anatomical Muscle Group</span>
                      <p className="text-zinc-300 mt-0.5 font-mono text-[11px]">{scanResult.anatomyDetails || 'Whole muscle subprimal group'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-300 text-[11px] block uppercase tracking-wider">Pitmaster Cooking Strategy</span>
                      <p className="text-zinc-300 mt-0.5 text-[11px]">{scanResult.recommendedCookingStrategy}</p>
                    </div>
                  </div>

                  {/* Visual Markers */}
                  {scanResult.visualMarkersDetected && scanResult.visualMarkersDetected.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Visual Markers Detected:</span>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
                        {scanResult.visualMarkersDetected.map((m, idx) => (
                          <span key={idx} className="bg-purple-950/40 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-purple-400" />
                            <span>{m}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-zinc-300 italic bg-[#141414] p-3 rounded-xl border border-[#222]">
                    "{scanResult.explanation}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: CONFIRMED & VERIFIED CUT DATABASE CATALOG */}
          <div className="space-y-4">
            {/* Search & Filter Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#121212] p-3.5 rounded-2xl border border-[#2a2a2a]">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={cutSearchQuery}
                  onChange={(e) => setCutSearchQuery(e.target.value)}
                  placeholder="Search cuts, aliases, or IMPS code..."
                  className="w-full bg-[#1a1a1a] border border-[#333] focus:border-amber-500 text-xs text-white rounded-xl pl-9 pr-3 py-2 outline-none"
                />
              </div>

              {/* Protein Type Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1 overflow-x-auto no-scrollbar py-0.5 touch-pan-x shrink-0">
                {(['ALL', 'Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCutProteinFilter(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      cutProteinFilter === p
                        ? 'bg-amber-500 text-zinc-950 font-black'
                        : 'bg-[#1a1a1a] hover:bg-[#252525] text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* CUT CARDS GRID */}
            {(() => {
              const filteredCuts = verifiedCuts.filter((cut) => {
                const matchesProtein = cutProteinFilter === 'ALL' || cut.proteinType === cutProteinFilter;
                const q = cutSearchQuery.toLowerCase().trim();
                const matchesSearch =
                  !q ||
                  cut.name.toLowerCase().includes(q) ||
                  (cut.impsCode && cut.impsCode.toLowerCase().includes(q)) ||
                  (cut.primalOrigin && cut.primalOrigin.toLowerCase().includes(q)) ||
                  (cut.aliases && cut.aliases.some((a) => a.toLowerCase().includes(q)));
                return matchesProtein && matchesSearch;
              });

              if (filteredCuts.length === 0) {
                return (
                  <div className="bg-[#121212] border border-[#262626] rounded-2xl p-8 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                    <h4 className="text-sm font-bold text-zinc-300">No Confirmed Meat Cuts Found</h4>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      No entries match your filter. Scan a cut above or click "Add Confirmed Cut" to add a new cut entry to your database.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCuts.map((cut) => {
                    const isOnlineVerified = cut.verifiedStatus === 'Global Online Verified';
                    const isVerifying = verifyingCutId === cut.id;
                    const isExpanded = expandedCutIds[cut.id] ?? Boolean(cutSearchQuery);

                    return (
                      <div
                        key={cut.id}
                        className="bg-[#121212] border border-[#262626] hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between transition-all shadow-md group min-w-0"
                      >
                        <div className="space-y-3 min-w-0">
                          {/* Image Thumbnail & Cut Title Header Row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                              {cut.samplePhotoUrl ? (
                                <img
                                  src={cut.samplePhotoUrl}
                                  alt={cut.name}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#333] shrink-0 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#181818] border border-[#2a2a2a] flex items-center justify-center shrink-0 text-amber-400 font-bold text-xs">
                                  🍖
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                                  {cut.name}
                                </h4>
                                <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate">
                                  {cut.primalOrigin} • <span className="text-amber-400 font-bold">{cut.proteinType}</span>
                                </p>
                              </div>
                            </div>

                            {/* Collapse / Expand Toggle Button */}
                            <button
                              type="button"
                              onClick={() => toggleCutExpand(cut.id)}
                              className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-amber-300 font-bold text-[10px] sm:text-xs rounded-xl flex items-center space-x-1 transition-all cursor-pointer shrink-0 min-h-[30px]"
                              title={isExpanded ? 'Collapse Verification Details' : 'Expand Verification & Physics Specs'}
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          {/* Verification & IMPS Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {isOnlineVerified ? (
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Global Online Verified</span>
                              </span>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Local User Confirmed</span>
                              </span>
                            )}

                            {cut.impsCode && (
                              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-[#1e1e1e] text-zinc-300 px-2 py-0.5 rounded border border-[#333] shrink-0">
                                {cut.impsCode}
                              </span>
                            )}
                          </div>

                          {/* COLLAPSIBLE DETAILS & VERIFICATION SPECS */}
                          {isExpanded && (
                            <div className="space-y-3 pt-1 border-t border-[#222] animate-fadeIn">
                              {/* Aliases Tags */}
                              {cut.aliases && cut.aliases.length > 0 && (
                                <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                                  {cut.aliases.map((alias, idx) => (
                                    <span key={idx} className="text-[10px] bg-[#181818] text-zinc-300 border border-[#2a2a2a] px-2 py-0.5 rounded-md">
                                      {alias}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Description */}
                              <p className="text-[11px] text-zinc-300 leading-relaxed">
                                {cut.description}
                              </p>

                              {/* Muscle Anatomy */}
                              {cut.muscleAnatomy && (
                                <p className="text-[10px] text-purple-300 font-mono bg-purple-950/30 border border-purple-500/20 px-2 py-1 rounded-md">
                                  🧬 Anatomy: {cut.muscleAnatomy}
                                </p>
                              )}

                              {/* Ideal Temps */}
                              <div className="grid grid-cols-2 gap-2 bg-[#181818] p-2 rounded-xl border border-[#222] text-[11px]">
                                <div>
                                  <span className="text-zinc-500 text-[10px] font-bold block uppercase">Ideal Smoke</span>
                                  <strong className="text-amber-300 font-mono">{cut.idealSmokeTempF}°F</strong>
                                </div>
                                <div>
                                  <span className="text-zinc-500 text-[10px] font-bold block uppercase">Target Pull</span>
                                  <strong className="text-emerald-400 font-mono">{cut.targetInternalTempF}°F</strong>
                                </div>
                              </div>

                              {/* LINKED MEAT SAFETY & TARGET TEMPS COMPLIANCE */}
                              {(() => {
                                const compliance = getUsdaSafetyForMeatCut(cut);
                                return (
                                  <div className="bg-[#181818] border border-emerald-500/25 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono">
                                    <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-[#2a2a2a] pb-1 text-[10px] uppercase tracking-wider">
                                      <span className="flex items-center space-x-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>USDA Safety & Target Temp Guide</span>
                                      </span>
                                      <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-300">
                                        {compliance.restTimeMinutes > 0 ? `⏱️ ${compliance.restTimeMinutes}-Min Rest` : '0-Min Rest'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                      <div className="bg-[#121212] p-1.5 rounded border border-[#2a2a2a]">
                                        <span className="text-zinc-500 block uppercase font-bold text-[9px]">USDA Min Safe</span>
                                        <span className="text-emerald-400 font-bold">{compliance.usdaMinSafeF}°F</span>
                                      </div>
                                      <div className="bg-[#121212] p-1.5 rounded border border-[#2a2a2a]">
                                        <span className="text-zinc-500 block uppercase font-bold text-[9px]">Ideal Finish Range</span>
                                        <span className="text-orange-400 font-bold">{compliance.idealFinishRange}</span>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 leading-snug">
                                      🛡️ <strong className="text-zinc-300">FSIS Citation:</strong> {compliance.regulatoryCitation}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions Bar (Always clean & available) */}
                        <div className="pt-2.5 border-t border-[#222] flex items-center justify-between gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyCutOnline(cut)}
                            disabled={isVerifying}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] sm:text-[11px] transition-all flex items-center space-x-1 cursor-pointer shrink-0 min-h-[34px] ${
                              isOnlineVerified
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                            title="Cross-check against online USDA IMPS & global pitmaster databases using Google Search Grounding"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Verifying Online...</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3" />
                                <span>{isOnlineVerified ? 'Re-Verify Online' : 'Verify Online'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = deleteVerifiedMeatCut(cut.id);
                              setVerifiedCuts(updated);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                            title="Delete from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM VERIFIED MEAT CUT */}
      {isAddCutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#333] w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
              <h3 className="text-sm font-black text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Confirmed Cut to Local Database</span>
              </h3>
              <button
                onClick={() => setIsAddCutModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Cut Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Spider Steak, Secretos, Picanha"
                  value={newCutName}
                  onChange={(e) => setNewCutName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Protein Type</label>
                  <select
                    value={newCutProtein}
                    onChange={(e) => setNewCutProtein(e.target.value as ProteinType)}
                    className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none"
                  >
                    {(['Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb', 'Venison', 'Wild Boar', 'Bear', 'Other'] as ProteinType[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">IMPS / NAMP Code</label>
                  <input
                    type="text"
                    placeholder="e.g. IMPS 184D"
                    value={newCutImps}
                    onChange={(e) => setNewCutImps(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Primal Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Beef Loin Subprimal, Pork Shoulder Blade"
                  value={newCutPrimal}
                  onChange={(e) => setNewCutPrimal(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Regional Aliases (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Rump Cap, Coulotte, Top Sirloin Cap"
                  value={newCutAliases}
                  onChange={(e) => setNewCutAliases(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Visual Features (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Thick fat cap, Triangular shape, Parallel coarse grain"
                  value={newCutFeatures}
                  onChange={(e) => setNewCutFeatures(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Description / Pitmaster Notes</label>
                <textarea
                  rows={2}
                  placeholder="Details on muscle grain, tenderness, and best smoking strategy..."
                  value={newCutDesc}
                  onChange={(e) => setNewCutDesc(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] text-white rounded-xl p-2.5 outline-none resize-none"
                />
              </div>

              {/* Photo Upload Input */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Confirmed Reference Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setNewCutPhotoBase64(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-amber-500 file:text-zinc-950 file:font-bold hover:file:bg-amber-400 cursor-pointer"
                />

                {newCutPhotoBase64 && (
                  <img
                    src={newCutPhotoBase64}
                    alt="New cut preview"
                    className="w-20 h-20 rounded-xl object-cover mt-2 border border-amber-500/40"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => setIsAddCutModalOpen(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewManualCut}
                disabled={!newCutName.trim()}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
              >
                Save Cut Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMORY VAULT */}
      {activeTab === 'memory' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2a2a2a]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Memory Vault</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage custom rules and guidelines for {AI_NAME} to follow across chat sessions.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
              <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                {charGPTMemory.learnedRules.length} Active Rules
              </span>
            </div>
          </div>

          {/* REMEMBERED PITMASTER NAME CARD */}
          <div className="bg-[#121212] border border-purple-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Pitmaster Remembered Name</span>
                {!isEditingName ? (
                  <span className="text-xs font-bold text-white block truncate">
                    {charGPTMemory.userName ? (
                      <span className="text-purple-300 font-extrabold">{charGPTMemory.userName}</span>
                    ) : (
                      <span className="text-zinc-400 italic">Not set yet (CharGPT will ask on 1st chat)</span>
                    )}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 mt-1 w-full max-w-xs">
                    <input
                      type="text"
                      value={nameInputValue}
                      onChange={(e) => setNameInputValue(e.target.value)}
                      placeholder="Enter your name"
                      className="bg-[#1a1a24] border border-purple-500/40 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 flex-1 min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const trimmed = nameInputValue.trim();
                          const updated: CharGPTMemory = {
                            ...charGPTMemory,
                            userName: trimmed || undefined,
                            learnedRules: trimmed
                              ? [{ id: `rule-name-${Date.now()}`, category: 'general', title: 'Pitmaster Name', detail: `User's name is ${trimmed}`, source: 'user_taught', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), approvalStatus: 'approved', confidenceScore: 100, sampleSize: 1 }, ...charGPTMemory.learnedRules.filter(r => r.title !== 'Pitmaster Name')]
                              : charGPTMemory.learnedRules.filter(r => r.title !== 'Pitmaster Name')
                          };
                          setCharGPTMemory(updated);
                          saveCharGPTMemory(updated);
                          if (onMemoryUpdate) onMemoryUpdate(updated);
                          setIsEditingName(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingName(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = nameInputValue.trim();
                        const updated: CharGPTMemory = {
                          ...charGPTMemory,
                          userName: trimmed || undefined,
                          learnedRules: trimmed
                            ? [{ id: `rule-name-${Date.now()}`, category: 'general', title: 'Pitmaster Name', detail: `User's name is ${trimmed}`, source: 'user_taught', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), approvalStatus: 'approved', confidenceScore: 100, sampleSize: 1 }, ...charGPTMemory.learnedRules.filter(r => r.title !== 'Pitmaster Name')]
                            : charGPTMemory.learnedRules.filter(r => r.title !== 'Pitmaster Name')
                        };
                        setCharGPTMemory(updated);
                        saveCharGPTMemory(updated);
                        if (onMemoryUpdate) onMemoryUpdate(updated);
                        setIsEditingName(false);
                      }}
                      className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:opacity-95 text-zinc-950 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingName && (
              <button
                type="button"
                onClick={() => {
                  setNameInputValue(charGPTMemory.userName || '');
                  setIsEditingName(true);
                }}
                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                {charGPTMemory.userName ? 'Edit Name' : 'Set Name'}
              </button>
            )}
          </div>

          {/* TEACH FORM */}
          <div className="bg-[#121212] border border-purple-500/30 rounded-xl p-3.5 sm:p-4 space-y-3">
            {/* ML EVOLUTION STATUS BANNER */}
            <div className="bg-gradient-to-r from-purple-950/60 via-zinc-900 to-amber-950/40 border border-purple-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    CharGPT Learning Review
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    LIMITED • Confirmation Required
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  Cook history can suggest patterns, but it does not automatically become memory or cross-user training data. Review and confirm each durable preference.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualEvolve}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-amber-500 hover:opacity-95 text-zinc-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Review Cook Patterns</span>
              </button>
            </div>

            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5 pt-1">
              <Plus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Teach {AI_NAME} a New Rule / Personal Preference</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                  Rule Title / Keyword
                </label>
                <input
                  type="text"
                  placeholder="e.g. Always Use Pecan Wood for Pork Butt"
                  value={teachTitle}
                  onChange={(e) => setTeachTitle(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                  Category
                </label>
                <select
                  value={teachCategory}
                  onChange={(e) => setTeachCategory(e.target.value as any)}
                  className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer min-h-[38px]"
                >
                  <option value="preference">Personal Preference</option>
                  <option value="technique">Cooking Technique</option>
                  <option value="rub_recipe">Rub / Seasoning Profile</option>
                  <option value="wood_pairing">Wood Flavor Pairing</option>
                  <option value="smoker_quirk">Smoker Quirk / Offsets</option>
                  <option value="general">General BBQ Rule</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                Detailed Pitmaster Instruction for {AI_NAME}
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Wrap pork shoulder at 165°F in foil with brown sugar, butter, and apple juice. Rest minimum 1 hour."
                value={teachDetail}
                onChange={(e) => setTeachDetail(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-white rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleAddCustomRule()}
                disabled={!teachTitle.trim() || !teachDetail.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all min-h-[42px]"
              >
                <Brain className="w-4 h-4 shrink-0" />
                <span>Save Rule to Memory (+35 XP)</span>
              </button>
            </div>
          </div>

          {/* RULE CARDS LIST */}
          <div className="space-y-2.5 max-h-[360px] sm:max-h-[380px] overflow-y-auto pr-0.5">
            {charGPTMemory.learnedRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-[#222222] border border-[#2a2a2a] rounded-xl p-3 sm:p-3.5 flex items-start justify-between gap-2.5 hover:border-purple-500/40 transition-all"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-none">{rule.title}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-bold ${
                        rule.source === 'user_taught'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {rule.source === 'user_taught' ? 'User Taught' : 'Log Analysis'}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {rule.category}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed break-words">{rule.detail}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Forget this rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BBQ INTELLIGENCE & DATA ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{AI_NAME} Intelligence & Profile</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calculated by {AI_NAME} data-mining your cook log ratings, wood pellet types, and temperature stability.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 sm:p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Preferred Wood Pellets</span>
              <div className="text-xs font-bold text-amber-400 truncate">
                {charGPTMemory.preferredWoodTypes.length > 0 ? charGPTMemory.preferredWoodTypes.join(', ') : 'None Recorded'}
              </div>
            </div>

            <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 sm:p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Top Meat Cuts</span>
              <div className="text-xs font-bold text-orange-400 truncate">
                {charGPTMemory.favoriteProteins.length > 0 ? charGPTMemory.favoriteProteins.join(', ') : 'None Recorded'}
              </div>
            </div>

            <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 sm:p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Total Analyzed Sessions</span>
              <div className="text-xs font-bold text-purple-300 font-mono">
                {charGPTMemory.totalLogsAnalyzed} Smoke Logs
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{AI_NAME} Evolution & Learning Metrics</span>
            </h4>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="bg-[#1a1a1a] p-2.5 sm:p-3 rounded-lg border border-[#2a2a2a]">
                <span className="text-[10px] text-zinc-400 block truncate">Interactions</span>
                <span className="font-bold text-white text-xs sm:text-sm font-mono">
                  {charGPTMemory.totalInteractions}
                </span>
              </div>

              <div className="bg-[#1a1a1a] p-2.5 sm:p-3 rounded-lg border border-[#2a2a2a]">
                <span className="text-[10px] text-zinc-400 block truncate">Learned Rules</span>
                <span className="font-bold text-amber-400 text-xs sm:text-sm font-mono">
                  {charGPTMemory.learnedRules.length}
                </span>
              </div>

              <div className="bg-[#1a1a1a] p-2.5 sm:p-3 rounded-lg border border-[#2a2a2a]">
                <span className="text-[10px] text-zinc-400 block truncate">Analyzed Logs</span>
                <span className="font-bold text-emerald-400 text-xs sm:text-sm font-mono">
                  {charGPTMemory.totalLogsAnalyzed}
                </span>
              </div>
            </div>

            {/* Account Sync Actions */}
            <div className="pt-3 border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  saveCharGPTMemory(charGPTMemory);
                  try {
                    const rawAcc = localStorage.getItem('pitmaster_local_user_account');
                    const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
                    acc.charGPTMemory = charGPTMemory;
                    localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
                  } catch (e) {}
                  if (onMemoryUpdate) onMemoryUpdate(charGPTMemory);
                  setTeachSuccessNotice(`Memory Vault saved on this device. Account synchronization is not claimed until the app-wide sync status confirms it.`);
                  setTimeout(() => setTeachSuccessNotice(null), 4000);
                }}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-500 hover:to-orange-400 text-white font-extrabold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
              >
                <Brain className="w-4 h-4 text-purple-200" />
                <span>Save Memory Vault Locally</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PUSH NOTIFICATIONS & AMAZON ALEXA HUB */}
      {activeTab === 'alexa_push' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-5 shadow-xl animate-fade-in">
          <PushAndAlexaHub
            activeCook={cookLogs[0]}
            smokerProfile={profile}
          />
        </div>
      )}

      {/* TAB 8: PITMASTER COURSES & ACADEMY RESEARCH DATA ENGINE (10,000-HOUR UNLOCK) */}
      {activeTab === 'pitmaster_courses' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Status & Unlock Header */}
          <div className="bg-gradient-to-r from-[#161b22] via-[#101e18] to-[#121921] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-emerald-300 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                      <span>CharGPT Pitmaster Courses & Academy Research</span>
                      {is10kUnlocked && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-extrabold flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>10k Unlocked</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Gather, research, and synthesize curriculum data on top barbecue academies, masterclasses, and competition certifications.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-[#181818] p-3 rounded-xl border border-[#333] space-y-1.5 min-w-[240px] shrink-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-bold">Accumulated Operating Hours:</span>
                  <strong className={`font-mono font-extrabold ${is10kUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {baseAccumulatedHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} / 10,000 hrs
                  </strong>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-700">
                  <div
                    className={`h-full transition-all duration-500 ${
                      is10kUnlocked ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                    style={{ width: `${Math.min(100, (baseAccumulatedHours / 10000) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-0.5">
                  {is10kUnlocked ? (
                    <span className="text-emerald-400 font-extrabold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400 inline mr-1" />
                      <span>🎓 10,000h Master Academy Unlocked</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold">
                      {((baseAccumulatedHours / 10000) * 100).toFixed(1)}% Completed — Unlocks at 10,000 hours
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Locked Gate View if < 10,000 hours */}
          {!is10kUnlocked && (
            <div className="bg-[#181622] border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-black text-white">10,000-Hour Pitmaster Academy Threshold</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  CharGPT's specialized Pitmaster Course Research & Data Gathering Engine unlocks once you have accumulated 10,000 total runtime hours across your cook logbooks and smoker rigs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-lg mx-auto bg-[#121018] p-3 rounded-xl border border-purple-500/20 text-xs">
                <div>
                  <span className="text-zinc-400 text-[10px] block">Cook Log Hours</span>
                  <strong className="text-purple-300 font-mono">{totalLogHours.toFixed(1)} h</strong>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">Smoker Rig Hours</span>
                  <strong className="text-amber-300 font-mono">{profileHours.toFixed(1)} h</strong>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">Current Progress</span>
                  <strong className="text-emerald-400 font-mono">{((baseAccumulatedHours / 10000) * 100).toFixed(1)}%</strong>
                </div>
              </div>


            </div>
          )}

          {/* Unlocked Full Course Data Gathering & Study Suite */}
          {is10kUnlocked && (
            <div className="space-y-4">
              {/* Study Mode Selector Sub-Tabs */}
              <div className="flex items-center space-x-2 bg-[#121212] p-1.5 rounded-2xl border border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setStudyMode('courses')}
                  className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    studyMode === 'courses'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Academy & Courses Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudyMode('flashcards')}
                  className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    studyMode === 'flashcards'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>⚡ 10k Study Flashcards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudyMode('exam_sim')}
                  className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    studyMode === 'exam_sim'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>🏅 Practice Exam Simulator</span>
                </button>
              </div>

              {/* MODE 1: COURSES & ACADEMY ARCHIVE */}
              {studyMode === 'courses' && (
                <div className="space-y-4">
                  {/* Live Search & Data Gathering Bar */}
                  <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 space-y-3 shadow-lg">

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGatherCourseData()}
                      placeholder="Search courses e.g. Franklin Brisket, Competition Bootcamp, KCBS Judge..."
                      className="w-full bg-[#121212] border border-[#333] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGatherCourseData()}
                    disabled={isGatheringCourses}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
                  >
                    {isGatheringCourses ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        <span>Gathering Data...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 text-zinc-950" />
                        <span>🔎 Gather Course Data</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Search Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase shrink-0">Quick Gather:</span>
                  {[
                    '📜 Official Certifications',
                    '🎓 Aaron Franklin Brisket',
                    '🏆 Myron Mixon Competition',
                    '🍖 Butchery & Meat Science',
                    '🏅 KCBS Certified Judge',
                    '🔥 Pellet Smoker Precision',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const clean = chip.replace(/^[^\w]+/, '').trim();
                        if (chip.includes('Certifications')) {
                          setCourseCategoryFilter('certificates');
                          setCourseSearchQuery('');
                        } else {
                          setCourseSearchQuery(clean);
                          handleGatherCourseData(clean);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] text-zinc-300 border border-[#333] rounded-lg text-[11px] font-medium shrink-0 transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {courseNotice && (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold animate-fadeIn">
                    {courseNotice}
                  </div>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar border-b border-[#222]">
                {[
                  { id: 'all', label: 'All Courses & Certs' },
                  { id: 'certificates', label: '📜 Master Certificate Programs' },
                  { id: 'brisket_offset', label: 'Texas Off-Set & Brisket' },
                  { id: 'competition', label: 'Competition BBQ' },
                  { id: 'pellet_bullet', label: 'Pellet & Bullet Precision' },
                  { id: 'science_butchery', label: 'Science & Butchery' },
                  { id: 'judging_rules', label: 'Judging & Rules' },
                  { id: 'international', label: 'International & Live Fire' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCourseCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                      courseCategoryFilter === cat.id
                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                        : 'bg-[#181818] text-zinc-400 hover:text-white border border-[#2a2a2a]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* CharGPT Research Synthesis Box */}
              {courseResearchSummary && (
                <div className="bg-[#121a15] border border-emerald-500/30 rounded-2xl p-4 space-y-2 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>CharGPT Pitmaster Academy Research Synthesis</span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {courseResearchSummary}
                  </p>
                </div>
              )}

              {/* Gathered Courses Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {coursesList
                  .filter((c) => {
                    const matchCategory = courseCategoryFilter === 'all' || c.category === courseCategoryFilter;
                    const q = courseSearchQuery.toLowerCase().trim();
                    const matchSearch =
                      !q ||
                      c.title.toLowerCase().includes(q) ||
                      c.instructor.toLowerCase().includes(q) ||
                      c.academy.toLowerCase().includes(q) ||
                      c.description.toLowerCase().includes(q);
                    return matchCategory && matchSearch;
                  })
                  .map((course) => (
                    <div
                      key={course.id}
                      className="bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            {course.categoryLabel}
                          </span>
                          <span className="text-[10px] font-bold bg-[#222] text-zinc-300 px-2 py-0.5 rounded-md border border-[#333]">
                            {course.format}
                          </span>
                        </div>

                        {/* Title & Instructor */}
                        <div>
                          <h4 className="text-sm font-black text-white leading-snug">{course.title}</h4>
                          <p className="text-xs text-emerald-400 font-bold flex items-center space-x-1 mt-0.5">
                            <span>👨‍🍳 Instructor: {course.instructor}</span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-zinc-400 font-normal">{course.academy}</span>
                          </p>
                        </div>

                        {/* Meta info row */}
                        <div className="grid grid-cols-3 gap-1 bg-[#121212] p-2 rounded-xl border border-[#222] text-[11px]">
                          <div>
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Cost</span>
                            <span className="text-amber-300 font-bold">{course.estimatedCost}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Duration</span>
                            <span className="text-zinc-200 font-medium">{course.duration}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Rating</span>
                            <span className="text-amber-400 font-extrabold flex items-center space-x-0.5">
                              <Star className="w-3 h-3 fill-amber-400 inline shrink-0 mr-0.5" />
                              <span>{course.rating} ({course.reviewCount})</span>
                            </span>
                          </div>
                        </div>

                        {/* Certification Awarded & Prerequisites */}
                        <div className="space-y-1.5">
                          {course.certificationAwarded && (
                            <div className="p-2 bg-[#121f18] border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-300">
                              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="font-extrabold truncate">Credential: {course.certificationAwarded}</span>
                            </div>
                          )}
                          {course.prerequisites && (
                            <div className="px-2 py-1 bg-[#181510] border border-amber-500/20 rounded-lg text-[10px] text-amber-300/80">
                              <strong>Prerequisite:</strong> {course.prerequisites}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-300 leading-relaxed">{course.description}</p>

                        {/* Curriculum Highlights */}
                        {course.curriculumHighlights && course.curriculumHighlights.length > 0 && (
                          <div className="space-y-1 bg-[#141414] p-2.5 rounded-xl border border-[#252525]">
                            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                              📚 Curriculum & Technique Drills:
                            </span>
                            <ul className="space-y-1 text-[11px] text-zinc-300">
                              {course.curriculumHighlights.map((hl, idx) => (
                                <li key={idx} className="flex items-start space-x-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{hl}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* CharGPT Evaluation */}
                        {course.charGPTTakeaway && (
                          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-200/90 leading-relaxed">
                            💡 <strong>CharGPT Evaluation:</strong> {course.charGPTTakeaway}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[#222] flex items-center justify-between gap-2 mt-3">
                        {course.websiteUrl ? (
                          <a
                            href={course.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333] font-bold text-xs rounded-xl transition-all flex items-center space-x-1 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Official Website</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-500">CharGPT Direct Research Record</span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('chat');
                            setPrompt(`Please give me a detailed CharGPT pitmaster breakdown and study roadmap for "${course.title}" taught by ${course.instructor}. How can I apply these techniques to my ${profile?.name || 'smoker'}?`);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Consult CharGPT</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* MODE 2: FLASHCARD STUDY SYSTEM */}
          {studyMode === 'flashcards' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 max-w-2xl mx-auto text-center">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-extrabold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                    <span>{CERTIFICATION_FLASHCARDS[currentFlashcardIndex].categoryLabel}</span>
                  </span>
                  <span className="font-mono text-zinc-300">
                    Card {currentFlashcardIndex + 1} of {CERTIFICATION_FLASHCARDS.length}
                  </span>
                </div>

                {/* Flip Card Deck Container */}
                <div
                  onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                  className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 cursor-pointer min-h-[220px] flex flex-col justify-center items-center relative shadow-2xl ${
                    isFlashcardFlipped
                      ? 'bg-gradient-to-b from-[#12221a] to-[#101c16] border-emerald-500/50 text-emerald-100'
                      : 'bg-gradient-to-b from-[#1c1a24] to-[#14121a] border-amber-500/30 text-amber-50 hover:border-amber-500/50'
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest absolute top-3 right-3 bg-[#111] px-2 py-0.5 rounded border border-[#333]">
                    {isFlashcardFlipped ? 'Answer (Click to Flip)' : 'Question (Click to Flip)'}
                  </span>

                  {!isFlashcardFlipped ? (
                    <div className="space-y-3">
                      <HelpCircle className="w-8 h-8 text-amber-400 mx-auto" />
                      <h3 className="text-base sm:text-lg font-black leading-snug">
                        {CERTIFICATION_FLASHCARDS[currentFlashcardIndex].question}
                      </h3>
                      <p className="text-xs text-amber-300/70 font-medium">Click card to reveal answer & formula</p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-left w-full">
                      <div className="flex items-center space-x-2 text-emerald-400 font-black text-sm border-b border-emerald-500/20 pb-2">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <span>{CERTIFICATION_FLASHCARDS[currentFlashcardIndex].answer}</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {CERTIFICATION_FLASHCARDS[currentFlashcardIndex].explanation}
                      </p>
                      {CERTIFICATION_FLASHCARDS[currentFlashcardIndex].keyFormula && (
                        <div className="p-2.5 bg-[#0a140f] border border-emerald-500/30 rounded-xl font-mono text-[11px] text-emerald-300">
                          📐 <strong>Formula:</strong> {CERTIFICATION_FLASHCARDS[currentFlashcardIndex].keyFormula}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Flashcard Navigation */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrevFlashcard}
                    className="px-4 py-2 bg-[#222] hover:bg-[#2e2e2e] text-zinc-200 border border-[#333] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                    className="px-4 py-2 bg-[#1a2e24] hover:bg-[#223d30] text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextFlashcard}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: PRACTICE EXAM SIMULATOR */}
          {studyMode === 'exam_sim' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center space-x-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <span>Pitmaster Certification Practice Exam Simulator</span>
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Test your knowledge on thermal physics, KCBS rules, ServSafe HACCP, and commercial pitmaster yield calculations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetExam}
                    className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-zinc-300 border border-[#333] rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Reset Exam Answers
                  </button>
                </div>

                {/* Question List */}
                <div className="space-y-5">
                  {PRACTICE_EXAM_QUESTIONS.map((q, idx) => {
                    const selectedOpt = examAnswers[q.id];
                    const isCorrect = selectedOpt === q.correctOptionIndex;

                    return (
                      <div key={q.id} className="bg-[#121212] border border-[#282828] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            Question {idx + 1}: {q.examLabel}
                          </span>
                          {examSubmitted && (
                            <span className={`text-xs font-extrabold flex items-center space-x-1 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              <span>{isCorrect ? 'Correct (+1)' : 'Incorrect'}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{q.question}</p>

                        {/* Options list */}
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isThisSelected = selectedOpt === optIdx;
                            let btnStyle = 'bg-[#1a1a1a] border-[#333] text-zinc-300 hover:bg-[#252525]';

                            if (examSubmitted) {
                              if (optIdx === q.correctOptionIndex) {
                                btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                              } else if (isThisSelected && !isCorrect) {
                                btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                              }
                            } else if (isThisSelected) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectExamOption(q.id, optIdx)}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start space-x-2.5 ${btnStyle}`}
                              >
                                <span className="font-mono font-black text-zinc-400 shrink-0">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span className="leading-relaxed">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation & CharGPT Pro-Tip */}
                        {examSubmitted && (
                          <div className="p-3 bg-[#161a18] border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
                            <p className="text-zinc-200">
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                            <div className="text-emerald-300 font-bold flex items-center space-x-1 pt-1">
                              <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{q.charGPTTip}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Exam Submit & Score Summary Footer */}
                <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                  <div>
                    {!examSubmitted ? (
                      <p className="text-xs text-zinc-400 font-medium">
                        Answered {Object.keys(examAnswers).length} of {PRACTICE_EXAM_QUESTIONS.length} questions
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xs text-zinc-400 uppercase font-bold block">Exam Result:</span>
                        <strong className="text-emerald-400 text-sm font-black font-mono">
                          Score:{' '}
                          {
                            PRACTICE_EXAM_QUESTIONS.filter(
                              (q) => examAnswers[q.id] === q.correctOptionIndex
                            ).length
                          }{' '}
                          / {PRACTICE_EXAM_QUESTIONS.length} (
                          {Math.round(
                            (PRACTICE_EXAM_QUESTIONS.filter(
                              (q) => examAnswers[q.id] === q.correctOptionIndex
                            ).length /
                              PRACTICE_EXAM_QUESTIONS.length) *
                              100
                          )}
                          %)
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExamSubmitted(true)}
                    disabled={examSubmitted || Object.keys(examAnswers).length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {examSubmitted ? 'Exam Submitted ✓' : 'Grade Practice Exam'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        </div>
      )}

    </div>
  );
};
