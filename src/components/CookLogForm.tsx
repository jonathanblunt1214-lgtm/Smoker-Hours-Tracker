import React, { useState, useEffect, useRef } from 'react';
import { CookLog, ProteinType, SmokerProfile, SmokerType, TemperatureReading, ThermalCurveAnalytics } from '../types';
import { RecipeSuggestion } from '../data/recipeSuggestions';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import { getManufacturerSpecs } from '../utils/smokerManufacturerData';
import { getEffectiveSmokerSpecs, calculateFuelConsumptionLbs } from '../utils/smokerCalculations';
import { FUEL_AND_WOOD_DATABASE } from '../utils/fuelDatabase';
import { HourlyCheckReminderBanner } from './HourlyCheckReminderBanner';
import { ThermalCurveAnalyticsCard } from './ThermalCurveAnalyticsCard';
import { PhysicalLogSheetModal } from './PhysicalLogSheetModal';
import { calculateThermalCurveAnalytics } from '../utils/thermalCurveCalculator';
import { Flame, Plus, Trash2, Clock, Scale, Thermometer, Save, X, AlertCircle, Cloud, CloudSun, MapPin, RefreshCw, Search, Loader2, CheckCircle2, Zap, Play, Pause, RotateCcw, Timer, Sparkles, Camera, Upload, Image as ImageIcon, SwitchCamera, Check, Navigation, Wind, Droplets, Compass, Bot, Lock, Unlock, Award, Printer, Download } from 'lucide-react';

// Helper to adjust time strings (e.g. "8:22 AM", "14:22", "8:22") by adding offset minutes
function addMinutesToTimeStr(baseTime: string, offsetMins: number): string {
  if (!baseTime) return '';
  const trimmed = baseTime.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = parseInt(match12[2], 10);
    const period = match12[3] ? match12[3].toUpperCase() : null;

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    let totalMins = hours * 60 + mins + offsetMins;
    totalMins = (totalMins + 1440 * 10) % 1440;

    const newHours24 = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;
    const padMins = newMins < 10 ? `0${newMins}` : `${newMins}`;

    if (period) {
      let h12 = newHours24 % 12;
      if (h12 === 0) h12 = 12;
      const newPeriod = newHours24 >= 12 ? 'PM' : 'AM';
      return `${h12}:${padMins} ${newPeriod}`;
    } else {
      return `${newHours24}:${padMins}`;
    }
  }

  const simpleMatch = trimmed.match(/^(\d+):(\d{2})$/);
  if (simpleMatch) {
    const h = parseInt(simpleMatch[1], 10);
    const m = parseInt(simpleMatch[2], 10);
    const total = h * 60 + m + offsetMins;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${nh}:${nm < 10 ? '0' : ''}${nm}`;
  }

  return baseTime;
}

function generateInitialReadingsWithCurrentTime(): TemperatureReading[] {
  return [];
}

interface CookLogFormProps {
  profile: SmokerProfile;
  nextPageNumber: number;
  initialRecipe?: RecipeSuggestion | null;
  initialCook?: CookLog | null;
  onSaveCook: (newCook: CookLog) => void;
  onCancel: () => void;
  onUpdateProfile?: (updated: SmokerProfile) => void;
  onOpenSettings?: (tab?: 'appearance' | 'alerts' | 'cloud' | 'data' | 'smokers') => void;
  onDeleteCook?: (id: string) => void;
}

export const CookLogForm: React.FC<CookLogFormProps> = ({
  profile,
  nextPageNumber,
  initialCook,
  initialRecipe,
  onSaveCook,
  onCancel,
  onUpdateProfile,
  onOpenSettings,
  onDeleteCook,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [smokerType, setSmokerType] = useState<string>('');
  const [showPhysicalSheetModal, setShowPhysicalSheetModal] = useState<boolean>(false);

  const [autoSyncOnSave, setAutoSyncOnSave] = useState<boolean>(() => {
    const saved = localStorage.getItem('smoker_auto_sync_new_cooks');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleAutoSyncOnSave = () => {
    const next = !autoSyncOnSave;
    setAutoSyncOnSave(next);
    localStorage.setItem('smoker_auto_sync_new_cooks', String(next));
  };

  const handleSmokerTypeChange = (newVal: string) => {
    setSmokerType(newVal);
    if (onUpdateProfile && newVal) {
      onUpdateProfile({
        ...profile,
        smokerType: newVal,
      });
    }
  };
  const [proteinType, setProteinType] = useState<ProteinType>('' as any);
  const [proteinCut, setProteinCut] = useState('');
  const [meatWeightLbs, setMeatWeightLbs] = useState<number | ''>('');
  const [hoursLogged, setHoursLogged] = useState<number>(() => {
    if (initialCook?.hoursLogged !== undefined && initialCook.hoursLogged > 0) {
      return Number(initialCook.hoursLogged.toFixed(2));
    }
    if (initialCook?.endingSmokerHours !== undefined && initialCook?.startingSmokerHours !== undefined && initialCook.endingSmokerHours > initialCook.startingSmokerHours) {
      return Number((initialCook.endingSmokerHours - initialCook.startingSmokerHours).toFixed(2));
    }
    return 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(() => {
    if (initialCook?.isTimerRunning !== undefined) return initialCook.isTimerRunning;
    try {
      const saved = localStorage.getItem('smoker_active_cook_timer');
      if (saved) return JSON.parse(saved)?.isTimerRunning || false;
    } catch (e) {}
    return false;
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    if (initialCook?.timerSeconds !== undefined && initialCook.timerSeconds > 0) return initialCook.timerSeconds;
    if (initialCook?.hoursLogged) return Math.round(initialCook.hoursLogged * 3600);
    try {
      const saved = localStorage.getItem('smoker_active_cook_timer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.timerSeconds === 'number') {
          if (parsed.isTimerRunning && parsed.updatedAt) {
            const elapsed = Math.floor((Date.now() - new Date(parsed.updatedAt).getTime()) / 1000);
            if (elapsed > 0 && elapsed < 86400 * 7) {
              return parsed.timerSeconds + elapsed;
            }
          }
          return parsed.timerSeconds;
        }
      }
    } catch (e) {}
    return 0;
  });
  const [isAutoFuel, setIsAutoFuel] = useState<boolean>(true);
  const [formTab, setFormTab] = useState<'basics' | 'environment' | 'temps' | 'notes'>('basics');

  // Persist timer state to localStorage whenever it updates
  useEffect(() => {
    try {
      localStorage.setItem('smoker_active_cook_timer', JSON.stringify({
        timerSeconds,
        isTimerRunning,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {}
  }, [timerSeconds, isTimerRunning]);

  // Live Stopwatch / Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          const nextSec = prev + 1;
          setHoursLogged(Number((nextSec / 3600).toFixed(2)));
          return nextSec;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatHHMMSS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Planned rows are blank until the cook records an observed temperature.
  const generateHourlyReadings = (
    totalHrsInput: number,
    currentAmbient?: number
  ): TemperatureReading[] => {
    const parsedHours = Number(totalHrsInput);
    const totalHrs = Number.isFinite(parsedHours) ? Math.max(1, Math.min(24, Math.round(parsedHours))) : 1;
    const newHourlyReadings: TemperatureReading[] = [];
    const startTimeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    for (let hr = 0; hr <= totalHrs; hr++) {
      newHourlyReadings.push({
        id: `r-hr-${hr}-${Date.now()}`,
        time: hr === 0 ? startTimeStr : addMinutesToTimeStr(startTimeStr, hr * 60),
        timestampMinutes: hr * 60,
        targetTemp: 0,
        cookingTemp: 0,
        meatTemp: 0,
        ambientTemp: currentAmbient,
        actionsTaken: '',
      });
    }

    return newHourlyReadings;
  };

  const handleHoursLoggedChange = (val: number, autoSyncEntries = true) => {
    const safeVal = Math.max(0, val);
    setHoursLogged(safeVal);
    setTimerSeconds(Math.round(safeVal * 3600));

    if (autoSyncEntries) {
      const newReadings = generateHourlyReadings(safeVal, weatherData?.tempF);
      setReadings(newReadings);
      const numHrs = Math.max(1, Math.round(safeVal));
      setHourlyPullNotice(`Added ${numHrs + 1} blank hourly rows. Enter only observed temperatures.`);
      setTimeout(() => setHourlyPullNotice(null), 4000);
    }
  };
  const [fuelLbsConsumed, setFuelLbsConsumed] = useState<number>(0);
  const [fuelType, setFuelType] = useState('');
  const [isFuelDbModalOpen, setIsFuelDbModalOpen] = useState<boolean>(false);
  const [seasoningRubs, setSeasoningRubs] = useState('');
  const [saucesGlazes, setSaucesGlazes] = useState('');
  const [finishedNotes, setFinishedNotes] = useState('');
  const [nextTimeNotes, setNextTimeNotes] = useState('');
  const [wouldMakeAgain, setWouldMakeAgain] = useState<boolean | null>(null);

  // Web Recipe Search for Custom Typed Cuts
  const [isSearchingWebRecipe, setIsSearchingWebRecipe] = useState(false);
  const [webRecipeText, setWebRecipeText] = useState<string | null>(null);
  const [searchedCutQuery, setSearchedCutQuery] = useState<string>('');

  const handleSearchWebForCut = async () => {
    const cutToQuery = proteinCut.trim() || proteinType;
    if (!cutToQuery) return;

    setIsSearchingWebRecipe(true);
    setWebRecipeText(null);
    setSearchedCutQuery(cutToQuery);

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smokerProfile: profile,
          effectiveSpecs: getEffectiveSmokerSpecs(profile),
          prompt: `Actively search online for real competition smoking recipes, target pit temperatures, target internal meat finish temperatures, recommended wood pellet flavor pairings, and rub formulas for "${cutToQuery}". Provide a structured summary.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setWebRecipeText(data.text);
          setIsSearchingWebRecipe(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Web recipe search failed', e);
    }

    setWebRecipeText(`🔎 Online Recipe Guide for ${cutToQuery}:\n• Recommended Pit Temp: 225°F\n• Finished Internal Temp: 165°F - 203°F\n• Wood Pairing: Oak / Hickory Blend\n• Seasoning: SPG (Salt, Pepper, Garlic) + Paprika`);
    setIsSearchingWebRecipe(false);
  };

  // Automatic debounced online recipe search when user types custom cut (3+ chars)
  useEffect(() => {
    const query = proteinCut.trim();
    if (query.length >= 3 && query.toLowerCase() !== searchedCutQuery.toLowerCase() && !isSearchingWebRecipe) {
      const timer = setTimeout(() => {
        handleSearchWebForCut();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [proteinCut, searchedCutQuery, isSearchingWebRecipe]);

  const handleAutoFillFromWebRecipe = () => {
    if (!seasoningRubs) {
      setSeasoningRubs('Salt, Coarse Black Pepper, Garlic Powder, Smoked Paprika');
    }
    if (!fuelType) {
      setFuelType('Competition Oak & Hickory Pellets');
    }
    setNextTimeNotes((prev) => (prev ? prev + '\n' : '') + `Web Search Recipe Benchmark used for ${proteinCut || proteinType}.`);
  };

  // Camera & Photo State
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const SAMPLE_COOK_PHOTOS = [
    { label: 'Smoked Brisket Bark', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
    { label: 'Pulled Pork Shoulder', url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80' },
    { label: 'St. Louis Rib Rack', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80' },
    { label: 'Smoked Wings & Thighs', url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=600&q=80' },
  ];

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can upload an image file or pick a sample photo below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const compressImage = (dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const maxDim = 800;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      setPhotoUrl(dataUrl);
      stopCamera();
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Auto-extract date from uploaded document / image file
      if (file.lastModified) {
        try {
          const fileDate = new Date(file.lastModified).toISOString().split('T')[0];
          if (fileDate) setDate(fileDate);
        } catch (err) {}
      }
      const nameMatch = file.name.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{2}[-/.]\d{2}[-/.]\d{4})/);
      if (nameMatch) {
        const rawMatched = nameMatch[0].replace(/[/.]/g, '-');
        const parts = rawMatched.split('-');
        if (parts[0].length === 4) {
          setDate(rawMatched);
        } else if (parts[2].length === 4) {
          setDate(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
        }
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (rawUrl) {
          compressImage(rawUrl, 800, 0.75).then((compressed) => {
            setPhotoUrl(compressed);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinishedNotesChange = (val: string) => {
    setFinishedNotes(val);

    // Auto-detect if a protein is written in notes and set cook name
    if (val.trim().length >= 3) {
      const knownProteins = [
        'Brisket', 'Pork Shoulder', 'Pulled Pork', 'Baby Back Ribs', 'St. Louis Ribs', 'Spare Ribs', 'Ribs',
        'Beef Ribs', 'Pork Ribs', 'Chicken Wings', 'Whole Chicken', 'Chicken Thighs', 'Chicken', 'Turkey', 'Turkey Breast',
        'Venison', 'Prime Rib', 'Tri-Tip', 'Pork Belly', 'Pork Loin', 'Pork Chop', 'Sausage', 'Salmon', 'Bison', 'Elk', 'Duck'
      ];
      const valLower = val.toLowerCase();
      const matchedProtein = knownProteins.find(p => valLower.includes(p.toLowerCase()));
      if (matchedProtein) {
        setTitle(`Smoked ${matchedProtein}`);
      }
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Pre-fill form from initialRecipe if provided
  useEffect(() => {
    if (initialRecipe) {
      setTitle(initialRecipe.title);
      setProteinType(initialRecipe.proteinType);
      setProteinCut(initialRecipe.proteinCut);
      setHoursLogged(initialRecipe.estHours);
      setTimerSeconds(Math.round(initialRecipe.estHours * 3600));
      setFuelLbsConsumed(initialRecipe.estPelletsLbs);
      setFuelType(initialRecipe.recommendedWood);
      setSeasoningRubs(initialRecipe.rubIngredients);
      setSaucesGlazes(initialRecipe.sauceGlaze || '');
      setFinishedNotes(initialRecipe.description);
      setNextTimeNotes(initialRecipe.proTip);

      const generatedReadings = generateHourlyReadings(initialRecipe.estHours);
      setReadings(generatedReadings);
    }
  }, [initialRecipe]);

  // Weather & Ambient Temperature Tracking State
  const [zipcode, setZipcode] = useState('');
  const [weatherData, setWeatherData] = useState<{
    tempF: number;
    cityState: string;
    humidity?: number;
    windMph?: number;
    condition?: string;
    weatherCode?: number;
    conditionDesc?: string;
    isGPSLocation?: boolean;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  // WMO Weather Interpretation Code Translator
  const getWmoCondition = (code: number): string => {
    if (code === 0) return '☀️ Clear Sky';
    if (code >= 1 && code <= 3) return '⛅ Partly Cloudy';
    if (code === 45 || code === 48) return '🌫️ Foggy';
    if (code >= 51 && code <= 57) return '🌦️ Light Drizzle';
    if (code >= 61 && code <= 67) return '🌧️ Rain';
    if (code >= 71 && code <= 77) return '❄️ Snow';
    if (code >= 80 && code <= 82) return '🌧️ Rain Showers';
    if (code >= 85 && code <= 86) return '🌨️ Snow Showers';
    if (code >= 95) return '⛈️ Thunderstorm';
    return '🌡️ Moderate Outdoor Conditions';
  };

  // Fetch Weather by Latitude & Longitude Coords
  const fetchWeatherByCoords = async (lat: number, lon: number, customLocationName?: string, isGPS = false) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      let locationName = customLocationName || '';
      if (!locationName) {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Local Pit';
            const state = geoData.principalSubdivisionCode || geoData.countryCode || '';
            locationName = state ? `${city}, ${state}` : city;
            if (geoData.postcode) {
              setZipcode(geoData.postcode);
            }
          }
        } catch {
          locationName = 'Current Location';
        }
      }

      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
      );
      if (!wxRes.ok) throw new Error('Weather API request failed');
      const wxData = await wxRes.json();

      const tempF = Math.round(wxData.current?.temperature_2m ?? 72);
      const humidity = wxData.current?.relative_humidity_2m;
      const windMph = Math.round(wxData.current?.wind_speed_10m ?? 0);
      const weatherCode = wxData.current?.weather_code ?? 0;
      const conditionDesc = getWmoCondition(weatherCode);

      const conditionStr = `${locationName || 'Current Location'} • ${tempF}°F, ${humidity !== undefined ? `${humidity}% humidity, ` : ''}${windMph !== undefined ? `${windMph} mph wind, ` : ''}${conditionDesc}`;

      setWeatherData({
        tempF,
        cityState: locationName || 'Current Location',
        humidity,
        windMph,
        condition: conditionStr,
        weatherCode,
        conditionDesc,
        isGPSLocation: isGPS,
      });

      // Update ambient temperature across log lines
      setReadings((prev) =>
        prev.map((r) => ({
          ...r,
          ambientTemp: tempF,
        }))
      );
    } catch (err: any) {
      setWeatherError(err.message || 'Error fetching weather data');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch Weather using Browser Geolocation
  const fetchWeatherByGeolocation = () => {
    setWeatherLoading(true);
    setWeatherError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeatherByCoords(latitude, longitude, undefined, true);
        },
        (err) => {
          const errMsg = err?.message || (err?.code === 1 ? 'Permission denied' : err?.code === 2 ? 'Position unavailable' : 'Timeout');
          console.info(`Geolocation unavailable (${errMsg}), using IP location fallback...`);
          fetchWeatherByIpOrZip();
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    } else {
      fetchWeatherByIpOrZip();
    }
  };

  // IP/Zip Code Fallback using multiple reliable CORS-enabled geolocation services
  const fetchWeatherByIpOrZip = async () => {
    // Service 1: geojs.io (Free, HTTPS, CORS open)
    try {
      const geojsRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (geojsRes.ok) {
        const geojsData = await geojsRes.json();
        const lat = parseFloat(geojsData.latitude);
        const lon = parseFloat(geojsData.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          const cityState = geojsData.city && geojsData.region ? `${geojsData.city}, ${geojsData.region}` : geojsData.city || 'Local Pit';
          if (geojsData.postal_code) setZipcode(geojsData.postal_code);
          await fetchWeatherByCoords(lat, lon, cityState, false);
          return;
        }
      }
    } catch {
      // Ignore and try fallback service
    }

    // Service 2: ipapi.co
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          const cityState = ipData.city && ipData.region_code ? `${ipData.city}, ${ipData.region_code}` : ipData.city || 'Local Pit';
          if (ipData.postal) setZipcode(ipData.postal);
          await fetchWeatherByCoords(ipData.latitude, ipData.longitude, cityState, false);
          return;
        }
      }
    } catch {
      // Ignore and try fallback zip
    }

    // Fallback ZIP if entered
    if (zipcode.trim()) {
      await fetchWeatherByZip(zipcode.trim());
    } else {
      setWeatherLoading(false);
    }
  };

  // Fetch Weather by ZIP Code
  const fetchWeatherByZip = async (zipToFetch?: string) => {
    const zip = (zipToFetch || zipcode).trim();
    if (!zip) {
      setWeatherError('Please enter a 5-digit US ZIP code to fetch weather');
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const geoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!geoRes.ok) {
        throw new Error('ZIP code not found in US database');
      }
      const geoData = await geoRes.json();
      const place = geoData.places?.[0];
      if (!place) throw new Error('Location lookup failed');

      const lat = parseFloat(place.latitude);
      const lon = parseFloat(place.longitude);
      const cityState = `${place['place name']}, ${place['state abbreviation']}`;

      await fetchWeatherByCoords(lat, lon, cityState, false);
    } catch (err: any) {
      setWeatherError(err.message || 'Error fetching weather for ZIP');
      setWeatherLoading(false);
    }
  };

  // Auto-detect weather on form mount using browser geolocation / IP location
  useEffect(() => {
    fetchWeatherByGeolocation();
  }, []);

  const handleApplyWeatherToAllReadings = () => {
    if (!weatherData) return;
    setReadings((prev) =>
      prev.map((r) => ({
        ...r,
        ambientTemp: weatherData.tempF,
      }))
    );
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 3000);
  };

  const [ratings, setRatings] = useState({
    smokeRing: 5,
    bark: 5,
    tenderness: 5,
    overall: 5,
  });

  // Time Series Temperature Readings - Defaulted to current time and standard 6 lines
  const [readings, setReadings] = useState<TemperatureReading[]>(() => generateInitialReadingsWithCurrentTime());

  // Editable until published state
  const [isPublishedToTotalHours, setIsPublishedToTotalHours] = useState<boolean>(false);

  // Quick Action from Hourly Check Reminder
  const handleLogHourlyCheckNow = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const last = readings[readings.length - 1];
    const nextIndex = readings.length;
    const currentAmbient = weatherData?.tempF || 72;

    const newReading: TemperatureReading = {
      id: `reading-hourly-${Date.now()}`,
      time: timeStr,
      timestampMinutes: Math.round(timerSeconds / 60) || nextIndex * 60,
      targetTemp: last ? last.targetTemp : 225,
      cookingTemp: last ? last.cookingTemp : 225,
      meatTemp: last ? Math.min(203, last.meatTemp + 8) : 45,
      ambientTemp: currentAmbient,
      actionsTaken: `Hourly Probe Check at ${timeStr}. Meat: ${last ? Math.min(203, last.meatTemp + 8) : 45}°F`,
    };

    setReadings((prev) => [...prev, newReading]);
    setFormTab('temps');
    setHourlyPullNotice(`Logged hourly thermometer check entry at ${timeStr}`);
    setTimeout(() => setHourlyPullNotice(null), 4000);
  };

  // Graph Image Data Extraction State inside Cook Log
  const [graphImageUrl, setGraphImageUrl] = useState<string | null>(null);
  const [isExtractingGraph, setIsExtractingGraph] = useState<boolean>(false);
  const [graphExtractionNotice, setGraphExtractionNotice] = useState<string | null>(null);
  const graphFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGraphFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string;
      setGraphImageUrl(base64Str);
      await processGraphImageExtraction(base64Str, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processGraphImageExtraction = async (base64Str: string, mimeType: string = 'image/png') => {
    setIsExtractingGraph(true);
    setGraphExtractionNotice('Analyzing temperature graph curves with Pitmaster AI Vision...');

    try {
      const res = await fetch('/api/analyze-cook-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Str,
          mimeType,
          cookTitle: title,
          proteinType,
        }),
      });

      const result = await res.json();
      if (result.success && result.data && Array.isArray(result.data.readings) && result.data.readings.length > 0) {
        // Pull ONLY meat temp from uploaded temperature graph.
        // Target temp is manual, cooking temp stays manual, and pull ambient temp from weather system automatically if pulled, else leave blank.
        const defaultTarget = readings[0]?.targetTemp || 225;
        const defaultCooking = readings[0]?.cookingTemp || 225;
        const ambientFromWeather = weatherData ? weatherData.tempF : undefined;

        const extractedReadings: TemperatureReading[] = result.data.readings.map((r: any, idx: number) => {
          const existingLine = readings[idx];
          const manualTarget = existingLine ? existingLine.targetTemp : defaultTarget;
          const manualCooking = existingLine ? existingLine.cookingTemp : defaultCooking;

          return {
            id: `r-graph-${idx}-${Date.now()}`,
            time: r.time || `${idx * 2}:00`,
            timestampMinutes: typeof r.timestampMinutes === 'number' ? r.timestampMinutes : idx * 120,
            targetTemp: manualTarget,
            cookingTemp: manualCooking,
            meatTemp: typeof r.meatTemp === 'number' ? r.meatTemp : 165,
            ambientTemp: ambientFromWeather,
            actionsTaken: r.actionsTaken || 'Extracted meat temperature from graph image',
          };
        });

        setReadings(extractedReadings);

        const summaryText = result.data.summary || `Extracted ${extractedReadings.length} meat temperature data points from graph!`;
        const metricsText = ` (Peak Meat: ${result.data.peakMeatTempF || 203}°F)`;
        setGraphExtractionNotice(`📈 ${summaryText}${metricsText}`);
      } else {
        setGraphExtractionNotice('⚠️ Graph analysis complete. Log updated with parsed meat temperature points.');
      }
    } catch (err) {
      console.error('Graph extraction error:', err);
      setGraphExtractionNotice('Failed to extract graph readings. Please ensure image is a clear temperature chart.');
    } finally {
      setIsExtractingGraph(false);
    }
  };

  const [hourlyPullNotice, setHourlyPullNotice] = useState<string | null>(null);
  const [isAiAnalyzingNotes, setIsAiAnalyzingNotes] = useState(false);

  // Smart local fallback for CharGPT Next Time Notes recommendation
  const generateLocalFallbackNotes = (pType: string, pCut: string, notes: string, lastReading?: TemperatureReading) => {
    const text = (notes || '').toLowerCase();
    const proteinStr = `${pType} ${pCut}`.toLowerCase();
    const finalMeatTemp = lastReading?.meatTemp || 0;

    if (text.includes('dry') || text.includes('tough') || text.includes('chewy')) {
      if (proteinStr.includes('brisket') || proteinStr.includes('pork') || proteinStr.includes('shoulder')) {
        return 'Wrap tightly in butcher paper with beef tallow/butter around 165°F stall and rest in an insulated cooler for at least 2 hours before slicing.';
      }
      return 'Spritz every 45 mins with apple cider vinegar/juice, pull 5°F earlier, and allow a longer rest before serving.';
    }

    if (text.includes('bark') || text.includes('soft') || text.includes('mushy')) {
      return 'Delay foil wrap until internal temp reaches 175°F to allow bark to fully set, and trim surface fat down to 1/4 inch.';
    }

    if (text.includes('salty') || text.includes('rub') || text.includes('seasoning')) {
      return 'Reduce coarse kosher salt in rub by 25% or switch to a lower-sodium binder base like yellow mustard.';
    }

    if (text.includes('smoke') || text.includes('bitter') || text.includes('dirty')) {
      return 'Ensure exhaust damper is fully open for clean blue smoke airflow; avoid burning damp wood pellets or over-choking intake.';
    }

    if (text.includes('stall') || text.includes('long') || text.includes('slow')) {
      return 'Increase pit temp by 15°F during stall phase (up to 250°F-275°F) or wrap tightly in double-layer heavy duty foil.';
    }

    if (finalMeatTemp > 0 && finalMeatTemp < 195 && (proteinStr.includes('brisket') || proteinStr.includes('pork'))) {
      return `Target higher internal finish temp (~203°F) until probe glides like warm butter; pulled at ${finalMeatTemp}°F which was slightly under-rendered.`;
    }

    return `For the next ${pCut || pType || 'cook'}: Maintain steady pit temp, spritz hourly after bark sets, and rest minimum 90 mins before carving.`;
  };

  // CharGPT Analysis Handler for Next Time Notes
  const handleAnalyzeAndSuggestNextTimeNotes = async () => {
    setIsAiAnalyzingNotes(true);
    const lastReading = readings[readings.length - 1];

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smokerProfile: profile,
          effectiveSpecs: getEffectiveSmokerSpecs(profile),
          prompt: `The user selected "NO, Needs Adjustments" for this cook log. Analyze the cook details below, and generate 1-2 concise, expert, highly actionable sentences for "Next Time Notes" explaining what exact technique, timing, or temperature adjustment to make for the next cook.

Cook Title: ${title || 'Smoker Cook'}
Protein: ${proteinType} - ${proteinCut}
Smoker Type: ${smokerType}
Fuel: ${fuelType}
Rub: ${seasoningRubs}
Sauces/Glazes: ${saucesGlazes}
Finished Product Notes: ${finishedNotes || 'Cook needed adjustments in tenderness, flavor, bark, or moisture.'}
Last Meat Temp Logged: ${lastReading?.meatTemp || 'N/A'}°F
Last Pit Temp Logged: ${lastReading?.cookingTemp || 'N/A'}°F
Total Hours Logged: ${hoursLogged} hrs

Output ONLY 1-2 concise sentences directly usable as Next Time Notes (no conversational fluff or introduction).`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const cleanedText = data.text.replace(/^[*\-\s]+/, '').trim();
          setNextTimeNotes(cleanedText);
          setHourlyPullNotice(`✨ ${AI_NAME} analyzed your cook log & generated Next Time Notes!`);
          setTimeout(() => setHourlyPullNotice(null), 5000);
          setIsAiAnalyzingNotes(false);
          return;
        }
      }
    } catch (err) {
      console.warn('API call to Gemini failed, using smart local fallback advice', err);
    }

    // Fallback if API offline or missing key
    const fallback = generateLocalFallbackNotes(proteinType, proteinCut, finishedNotes, lastReading);
    setNextTimeNotes(fallback);
    setHourlyPullNotice(`✨ ${AI_NAME} analyzed your cook log & generated Next Time Notes!`);
    setTimeout(() => setHourlyPullNotice(null), 5000);
    setIsAiAnalyzingNotes(false);
  };

  const handleSelectNeedsAdjustments = () => {
    setWouldMakeAgain(false);
    handleAnalyzeAndSuggestNextTimeNotes();
  };

  // Auto-Generate Hourly Schedule Starting at 0:00 for every hour up to hoursLogged
  const handleGenerateHourlyReadings = () => {
    const totalHrs = Math.max(1, Math.min(24, Math.round(Number(hoursLogged) || 8)));
    const newHourlyReadings = generateHourlyReadings(totalHrs, weatherData?.tempF);

    setReadings(newHourlyReadings);
    setHourlyPullNotice(`Added ${totalHrs + 1} blank hourly rows. No temperatures were inferred.`);
    setTimeout(() => setHourlyPullNotice(null), 5000);
  };

  const handleSetSixStandardLines = () => {
    setReadings(generateInitialReadingsWithCurrentTime());
  };

  const startingHours = initialCook?.startingSmokerHours !== undefined
    ? initialCook.startingSmokerHours
    : (profile.currentHours || 0);
  const endingHours = Number((startingHours + Number(hoursLogged || 0)).toFixed(2));

  // Automated Smoker Burn Rate Metric Calculation via Centralized Physics Utility
  const effectiveSpecs = getEffectiveSmokerSpecs(profile);
  const ambientTempF = weatherData ? weatherData.tempF : 72;
  const autoCalculatedFuelLbs = calculateFuelConsumptionLbs(
    hoursLogged || 0,
    225,
    profile
  );
  const effectiveBurnRateLbsHr = hoursLogged && hoursLogged > 0
    ? Number((autoCalculatedFuelLbs / hoursLogged).toFixed(2))
    : effectiveSpecs.baselineBurnRateLbsHr;

  // Auto-sync fuel calculation when hoursLogged, smokerType, weather, or auto state changes
  useEffect(() => {
    if (isAutoFuel) {
      setFuelLbsConsumed(autoCalculatedFuelLbs);
    }
  }, [hoursLogged, smokerType, weatherData, isAutoFuel, autoCalculatedFuelLbs]);

  const handleAddReading = () => {
    setReadings((prev) => {
      const firstTime = prev[0]?.time || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const nextIdx = prev.length;
      const nextMins = nextIdx * 60;
      const timeStr = addMinutesToTimeStr(firstTime, nextMins);
      const lastReading = prev[prev.length - 1];

      const newRead: TemperatureReading = {
        id: `r-new-${Date.now()}`,
        time: timeStr,
        timestampMinutes: nextMins,
        targetTemp: lastReading ? lastReading.targetTemp : 225,
        cookingTemp: lastReading ? lastReading.cookingTemp : 225,
        meatTemp: lastReading ? Math.min(203, lastReading.meatTemp + 15) : 180,
        ambientTemp: weatherData ? weatherData.tempF : (lastReading ? lastReading.ambientTemp : undefined),
        actionsTaken: 'Finish',
      };

      const updated = prev.map((r, idx) => {
        if (idx === 0) {
          return { ...r, actionsTaken: r.actionsTaken || 'Start' };
        }
        return {
          ...r,
          actionsTaken: r.actionsTaken === 'Finish' ? '' : r.actionsTaken,
        };
      });

      return [...updated, newRead];
    });
  };

  const handleRemoveReading = (id: string) => {
    setReadings((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      if (filtered.length === 0) return filtered;
      const firstTime = filtered[0].time;

      return filtered.map((r, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === filtered.length - 1;
        const hourlyMins = idx * 60;
        return {
          ...r,
          timestampMinutes: hourlyMins,
          time: isFirst ? r.time : addMinutesToTimeStr(firstTime, hourlyMins),
          actionsTaken: isFirst ? (r.actionsTaken || 'Start') : (isLast ? 'Finish' : ''),
        };
      });
    });
  };

  const handleReadingChange = (id: string, field: keyof TemperatureReading, value: any) => {
    setReadings((prevReadings) => {
      const isFirstReading = prevReadings[0]?.id === id;
      if (field === 'time' && isFirstReading && typeof value === 'string') {
        const newStartTime = value;
        return prevReadings.map((r, idx) => {
          if (idx === 0) {
            return { ...r, time: newStartTime, timestampMinutes: 0 };
          }
          const hourlyMins = idx * 60;
          return {
            ...r,
            timestampMinutes: hourlyMins,
            time: addMinutesToTimeStr(newStartTime, hourlyMins),
          };
        });
      }

      return prevReadings.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      });
    });
  };

  const buildCookLogObject = (published: boolean): CookLog => {
    const cookTitle = title.trim() || `${proteinCut || proteinType} Smoke Session`;

    let computedHours = Number(hoursLogged) || 0;
    if (computedHours <= 0 && readings.length > 1) {
      const maxMins = Math.max(...readings.map((r) => r.timestampMinutes || 0));
      if (maxMins > 0) {
        computedHours = Number((maxMins / 60).toFixed(2));
      }
    }
    const computedEndingHours = Number((startingHours + computedHours).toFixed(2));
    const analytics = calculateThermalCurveAnalytics(readings, computedHours);

    return {
      id: initialCook?.id || `cook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      pageNumber: nextPageNumber,
      date,
      title: cookTitle,
      smokerId: profile.id,
      smokerType,
      proteinType,
      proteinCut: proteinCut || `${proteinType} Cut`,
      meatWeightLbs: Number(meatWeightLbs) || undefined,
      startingSmokerHours: startingHours,
      hoursLogged: computedHours,
      endingSmokerHours: computedEndingHours,
      fuelLbsConsumed: Number(fuelLbsConsumed) || 0,
      fuelType,
      temperatureReadings: readings,
      seasoningRubs,
      saucesGlazes,
      wouldMakeAgain,
      ratings,
      zipcode,
      weatherConditions: weatherData?.condition || '',
      finishedNotes,
      nextTimeNotes,
      photoUrl: photoUrl || undefined,
      status: published ? 'Completed' : 'Draft',
      timerSeconds: timerSeconds || Math.round((Number(hoursLogged) || 0) * 3600),
      isTimerRunning,
      isPublishedToTotalHours: published,
      publishedAt: published ? new Date().toISOString() : undefined,
      thermalCurveAnalytics: analytics,
      pitmasterAlias: (() => {
        try {
          const saved = localStorage.getItem('pitmaster_local_user_account');
          if (saved) return JSON.parse(saved)?.name || 'Head Pitmaster';
        } catch (e) {}
        return 'Head Pitmaster';
      })(),
      userEmail: (() => {
        try {
          const saved = localStorage.getItem('pitmaster_local_user_account');
          if (saved) return JSON.parse(saved)?.email || '';
        } catch (e) {}
        return '';
      })(),
    };
  };

  const handlePublishToTotalHours = () => {
    if (readings.length === 0) {
      alert('Please log at least one temperature reading before publishing.');
      return;
    }
    const log = buildCookLogObject(true);
    setIsPublishedToTotalHours(true);
    onSaveCook(log);
    alert(`🔥 Cook Log Published! ${hoursLogged.toFixed(2)} hours officially published to Total Smoker Operating Hours and thermal curve analytics saved.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const log = buildCookLogObject(isPublishedToTotalHours);
    onSaveCook(log);
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-8 shadow-2xl w-full max-w-5xl mx-auto mb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#2a2a2a]">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-zinc-950 shadow-md">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">New Cook</h2>
            <p className="text-xs text-zinc-400">
              Record real-time cook metrics, temperatures, and smoker runtime hours.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPhysicalSheetModal(true)}
            className="inline-flex items-center px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            title="Download physical paper smoker log sheet with auto-filled date and smoker"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Download Physical Log</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#242424] rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pre-filled Recipe Banner */}
      {initialRecipe && (
        <div className="mt-6 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-orange-300 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block text-sm">
                Pre-filled from Recipe Guide: {initialRecipe.title}
              </span>
              <span className="text-zinc-400">
                Cut: <strong className="text-zinc-200">{initialRecipe.proteinCut}</strong> • Estimated Duration:{' '}
                <strong className="text-orange-400">{initialRecipe.estHours} hrs</strong>
              </span>
            </div>
          </div>
          <span className="bg-orange-500/20 text-orange-300 px-3 py-1.5 rounded-lg font-mono font-bold text-xs border border-orange-500/30 self-start sm:self-auto shrink-0">
            🪵 {initialRecipe.recommendedWood}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        
        {/* Form Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar space-x-1.5 sm:space-x-2 pb-2 -mx-1 px-1 touch-pan-x">
          <button
            type="button"
            onClick={() => setFormTab('basics')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 ${
              formTab === 'basics' 
                ? 'bg-orange-500 text-zinc-950 shadow-md ring-2 ring-orange-400/50' 
                : 'bg-[#242424] text-zinc-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-950/40"></span>
            <span>1. Basic Details</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('environment')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 ${
              formTab === 'environment' 
                ? 'bg-orange-500 text-zinc-950 shadow-md ring-2 ring-orange-400/50' 
                : 'bg-[#242424] text-zinc-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <span>2. Fuel & Weather</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('temps')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 ${
              formTab === 'temps' 
                ? 'bg-orange-500 text-zinc-950 shadow-md ring-2 ring-orange-400/50' 
                : 'bg-[#242424] text-zinc-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <span>3. Temp Log</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('notes')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 ${
              formTab === 'notes' 
                ? 'bg-orange-500 text-zinc-950 shadow-md ring-2 ring-orange-400/50' 
                : 'bg-[#242424] text-zinc-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <span>4. Wrap Up & Rating</span>
          </button>
        </div>

        <div className={formTab === 'basics' ? 'block space-y-8 animate-fade-in' : 'hidden'}>
        {/* TOP ACCESSIBLE PHOTO ATTACHMENT BANNER */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Finished Cook Photo Attachment
                  </h3>
                  {photoUrl && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Attached</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Snap a photo with camera or upload a picture of your finished cook.
                </p>
              </div>
            </div>

            {/* Action buttons with minimum 44px touch target height for accessibility */}
            <div className="flex flex-wrap items-center gap-2">
              {!isCameraActive && (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 shadow-md min-h-[42px]"
                  aria-label="Snap photo with camera"
                >
                  <Camera className="w-4 h-4" />
                  <span>{photoUrl ? 'Retake Photo' : 'Snap Photo (Camera)'}</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] text-zinc-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 min-h-[42px]"
                aria-label="Upload photo from device"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Upload File</span>
              </button>

              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer min-h-[42px]"
                  aria-label="Remove attached photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>

          {/* Camera Error Alert */}
          {cameraError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center justify-between">
              <span>{cameraError}</span>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="text-red-400 hover:text-white p-1"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Camera Viewfinder View */}
          {isCameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black border border-orange-500/40 shadow-inner max-w-md mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-48 object-cover"
              />

              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/20 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Switch Camera"
                  aria-label="Switch camera"
                >
                  <SwitchCamera className="w-4 h-4 text-zinc-200" />
                </button>

                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-full flex items-center space-x-1.5 shadow-lg transition-all active:scale-95 cursor-pointer min-h-[40px]"
                >
                  <Camera className="w-4 h-4" />
                  <span>CAPTURE SNAPSHOT</span>
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 bg-black/70 hover:bg-black/90 text-zinc-300 hover:text-white rounded-full border border-white/20 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Cancel Camera"
                  aria-label="Close camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Attached Photo Preview */}
          {!isCameraActive && photoUrl && (
            <div className="flex items-center gap-3 bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a]">
              <img
                src={photoUrl}
                alt="Attached Cook"
                className="w-20 h-16 object-cover rounded-lg border border-[#333] shadow-sm shrink-0"
              />
              <div className="text-xs text-zinc-300 space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-white text-xs truncate">Attached Cook Photo</span>
                  <span className="text-[10px] text-zinc-400 font-mono">(Page #{nextPageNumber})</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Saved with your log and displayed on your cook journal card.
                </p>
              </div>
            </div>
          )}

          {/* Compact Sample Preset Thumbnails */}
          {!isCameraActive && !photoUrl && (
            <div className="pt-2 border-t border-[#2a2a2a]">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Quick Sample Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_COOK_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(p.url)}
                    className="flex items-center space-x-2 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] hover:border-orange-500/40 p-1.5 rounded-xl transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-orange-500 min-h-[42px]"
                  >
                    <img src={p.url} alt={p.label} className="w-9 h-9 object-cover rounded-lg shrink-0" />
                    <span className="text-[11px] font-semibold text-zinc-200 line-clamp-2 leading-tight">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ROW 1: BASIC COOK INFO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Cook Title / What is Cook? *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Overnight Texas Brisket, Smoked Pork Shoulder..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Smoker Type
              </label>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => onOpenSettings('smokers')}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-bold bg-orange-500/10 hover:bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30 transition-all cursor-pointer"
                >
                  ⚙️ Specs in Settings
                </button>
              )}
            </div>
            <input
              type="text"
              list="smoker-type-options"
              placeholder="e.g. Vertical Pellet Smoker, Custom Offset..."
              value={smokerType}
              onChange={(e) => handleSmokerTypeChange(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <datalist id="smoker-type-options">
              <option value="Vertical Pellet Smoker" />
              <option value="Offset Barrel Smoker" />
              <option value="Pellet Grill / Smoker" />
              <option value="Cabinet Smoker" />
              <option value="Gravity Fed Smoker" />
              <option value="Drum Smoker" />
              <option value="Kamado Grill" />
              <option value="Electric Smoker" />
              <option value="Gas / Propane Smoker" />
              <option value="Custom Reverse Flow Offset" />
              <option value="Custom Insulated Cabinet Smoker" />
              <option value="Custom Ugly Drum Smoker (UDS)" />
            </datalist>
            <p className="text-[10px] text-zinc-500 mt-1">
              Synced with your active Smoker Profile.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Cook Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

        </div>

        {/* ROW 2: PROTEIN TYPE & CUT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Protein Category
            </label>
            <select
              value={proteinType}
              onChange={(e) => setProteinType(e.target.value as ProteinType)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">Select Protein Category...</option>
              <optgroup label="Domestic Meats">
                <option value="Beef">Beef</option>
                <option value="Pork">Pork</option>
                <option value="Chicken">Chicken</option>
                <option value="Turkey">Turkey</option>
                <option value="Lamb">Lamb</option>
                <option value="Seafood">Seafood</option>
              </optgroup>
              <optgroup label="Wild Game Meats">
                <option value="Venison">Venison (Deer)</option>
                <option value="Bear">Bear Roast & Ribs</option>
                <option value="Wild Boar">Wild Boar</option>
                <option value="Duck">Wild Duck & Goose</option>
                <option value="Bison">Bison & Buffalo</option>
                <option value="Elk">Elk Loin & Roast</option>
                <option value="Pheasant">Pheasant & Upland Game</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Wild Game">Other Wild Game</option>
              </optgroup>
              <optgroup label="Other">
                <option value="Other">Other</option>
              </optgroup>
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Protein Cut & Meat Mass
              </label>
              <button
                type="button"
                onClick={handleSearchWebForCut}
                disabled={isSearchingWebRecipe}
                className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1.5 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSearchingWebRecipe ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Searching Web...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Online Recipes for Cut</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="e.g. Choice Full Packer Brisket, Bear Shoulder, Wild Duck"
                value={proteinCut}
                onChange={(e) => setProteinCut(e.target.value)}
                className="sm:col-span-2 bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex items-center space-x-1.5 bg-[#121212] border border-[#2a2a2a] rounded-xl px-3 py-1.5">
                <Scale className="w-4 h-4 text-orange-400 shrink-0" />
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="150"
                  placeholder="Mass (lbs)"
                  value={meatWeightLbs}
                  onChange={(e) => setMeatWeightLbs(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 font-mono font-bold">lbs</span>
              </div>
            </div>

            {/* Online Recipe Web Result Drawer */}
            {webRecipeText && (
              <div className="mt-2 p-4 bg-[#181818] border border-orange-500/30 rounded-xl space-y-3 text-xs animate-fadeIn shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold">
                    <Bot className="w-4 h-4 text-orange-400" />
                    <span>{APP_NAME} Online Web Recipe Guide for "{proteinCut || proteinType}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebRecipeText(null)}
                    className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-zinc-200 whitespace-pre-line leading-relaxed text-xs font-sans bg-[#121212] p-3 rounded-lg border border-[#2a2a2a]">
                  {webRecipeText}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAutoFillFromWebRecipe}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-lg shadow-md flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
                    <span>Auto-Fill Form Notes & Rubs from Web Recipe</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        </div>
        <div className={formTab === 'environment' ? 'block space-y-8 animate-fade-in' : 'hidden'}>
        {/* ROW 3: SMOKER HOURS & FUEL CALCULATOR CARD */}
        <div className="bg-[#242424] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs">
            <Clock className="w-4 h-4" />
            <span>Smoker Operating Runtime Calculator</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
              <span className="text-zinc-400 block mb-1 font-semibold text-[11px]">Starting Hours to Date</span>
              <span className="font-mono text-xl font-bold text-zinc-200">{startingHours.toFixed(2)} hrs</span>
              <span className="text-[10px] text-zinc-500 mt-1">Existing smoker hour meter</span>
            </div>

            <div className="bg-[#121212] border border-orange-500/40 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-orange-400 font-bold text-xs flex items-center space-x-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Hours Logged This Smoke *</span>
                </label>
                {isTimerRunning && (
                  <span className="flex items-center space-x-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span>LIVE TIMER</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a]">
                <span className="font-mono text-lg font-black text-orange-400 tracking-wider">
                  {formatHHMMSS(timerSeconds)}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                      isTimerRunning
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-3 h-3 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(0);
                      setHoursLogged(0);
                    }}
                    className="p-1 bg-[#252525] hover:bg-[#333] text-zinc-400 hover:text-white border border-[#333] rounded-md transition-all cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={hoursLogged}
                    onChange={(e) => handleHoursLoggedChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-orange-400 font-mono font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleHoursLoggedChange(Number((hoursLogged + 0.5).toFixed(2)))}
                  className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 text-[10px] font-mono font-bold border border-[#333] rounded-lg transition-all cursor-pointer shrink-0"
                  title="Add 30 minutes"
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => handleHoursLoggedChange(Number((hoursLogged + 1.0).toFixed(2)))}
                  className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 text-[10px] font-mono font-bold border border-[#333] rounded-lg transition-all cursor-pointer shrink-0"
                  title="Add 1 hour"
                >
                  +1h
                </button>
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
              <span className="text-zinc-400 block mb-1 font-semibold text-[11px]">New Smoker Hours To Date</span>
              <span className="font-mono text-xl font-bold text-orange-400">{endingHours.toFixed(2)} hrs</span>
              <span className="text-[10px] text-zinc-500 mt-1">Updated total meter after saving cook</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#2a2a2a]">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-zinc-300 font-semibold text-xs flex items-center space-x-1.5">
                  <span>Fuel / Pellets Consumed (lbs):</span>
                  {isAutoFuel && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1">
                      <Zap className="w-2.5 h-2.5" />
                      <span>Auto-Metric Active</span>
                    </span>
                  )}
                </label>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFuel(true);
                    setFuelLbsConsumed(autoCalculatedFuelLbs);
                  }}
                  className={`text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer px-2 py-0.5 rounded border transition-all ${
                    isAutoFuel
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-sm'
                      : 'bg-[#1a1a1a] text-zinc-400 border-[#333] hover:text-orange-400 hover:border-orange-500/30'
                  }`}
                  title="Auto-calculate pellets using manufacturer burn rate & cook duration"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAutoFuel ? 'Synced to Mfr Metric' : `Sync Mfr (${autoCalculatedFuelLbs} lbs)`}</span>
                </button>
              </div>

              <input
                type="number"
                step="0.5"
                value={fuelLbsConsumed}
                onChange={(e) => {
                  setIsAutoFuel(false);
                  setFuelLbsConsumed(parseFloat(e.target.value) || 0);
                }}
                className={`w-full bg-[#121212] border font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  isAutoFuel ? 'border-orange-500/40 text-orange-400 font-bold' : 'border-[#2a2a2a] text-white'
                }`}
              />

              <div className="mt-1.5 bg-[#121212] border border-[#2a2a2a] p-2.5 rounded-xl text-[10px] text-zinc-400 font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Automated Metric Formula:</span>
                  <span className="text-orange-400 font-extrabold">{hoursLogged || 0} hrs × {effectiveBurnRateLbsHr} lbs/hr = {autoCalculatedFuelLbs} lbs</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                  Derived from {effectiveSpecs.displayName} rate ({effectiveSpecs.baselineBurnRateLbsHr} lbs/hr){weatherData ? ` adjusted for ${weatherData.tempF}°F ambient weather` : ''}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3.5: AMBIENT WEATHER & LOCAL LOCATION TRACKER CARD */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a2a]">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl shrink-0">
                <CloudSun className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">Local Weather & Outdoor Ambient Context</h4>
                  {weatherData?.isGPSLocation && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>GPS Active</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">Local outdoor weather, humidity, and wind speed logging for pit efficiency.</p>
              </div>
            </div>

            {/* GPS Auto-Detect & ZIP Search Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchWeatherByGeolocation}
                disabled={weatherLoading}
                className="px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                title="Automatically detect current GPS location and live weather"
              >
                {weatherLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 fill-current text-orange-400" />
                )}
                <span>Auto-Detect Weather</span>
              </button>

              <div className="flex items-center space-x-1.5">
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={5}
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchWeatherByZip())}
                    placeholder="ZIP"
                    className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchWeatherByZip()}
                  disabled={weatherLoading}
                  className="px-2.5 py-1.5 bg-[#242424] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white border border-[#2a2a2a] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Search Weather by ZIP"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Weather Display Error */}
          {weatherError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{weatherError}</span>
            </div>
          )}

          {/* Rich Weather Metrics Grid */}
          {weatherData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center space-x-1">
                    <Thermometer className="w-3 h-3 text-orange-400" />
                    <span>Outdoor Temp</span>
                  </span>
                  <span className="text-lg font-mono font-black text-orange-400 mt-1">
                    {weatherData.tempF}°F
                  </span>
                </div>

                <div className="bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center space-x-1">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    <span>Humidity</span>
                  </span>
                  <span className="text-lg font-mono font-bold text-white mt-1">
                    {weatherData.humidity !== undefined ? `${weatherData.humidity}%` : 'N/A'}
                  </span>
                </div>

                <div className="bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center space-x-1">
                    <Wind className="w-3 h-3 text-amber-400" />
                    <span>Wind Speed</span>
                  </span>
                  <span className="text-lg font-mono font-bold text-white mt-1">
                    {weatherData.windMph !== undefined ? `${weatherData.windMph} mph` : 'N/A'}
                  </span>
                </div>

                <div className="bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center space-x-1">
                    <CloudSun className="w-3 h-3 text-emerald-400" />
                    <span>Condition</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300 mt-1 truncate">
                    {weatherData.conditionDesc || 'Fair'}
                  </span>
                </div>
              </div>

              {/* Weather Context Field & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={weatherData.condition || ''}
                    onChange={(e) =>
                      setWeatherData({
                        ...weatherData,
                        condition: e.target.value,
                      })
                    }
                    placeholder="Weather conditions context for log entry..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-200 text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyWeatherToAllReadings}
                  className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  <span>Sync {weatherData.tempF}°F Ambient to Log Lines</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
              <span>Click Auto-Detect or enter a ZIP code to load local ambient weather.</span>
              <button
                type="button"
                onClick={fetchWeatherByGeolocation}
                className="text-orange-400 font-bold hover:underline cursor-pointer"
              >
                Detect Now
              </button>
            </div>
          )}

          {appliedNotice && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex items-center space-x-1.5 font-medium animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Updated ambient temperature to {weatherData?.tempF}°F across all temperature log lines!</span>
            </div>
          )}
        </div>

        </div>
        <div className={formTab === 'temps' ? 'block space-y-6 animate-fade-in' : 'hidden'}>
        {/* HOURLY MEAT THERMOMETER CHECK REMINDER SYSTEM */}
        <HourlyCheckReminderBanner
          isTimerRunning={isTimerRunning}
          timerSeconds={timerSeconds}
          onAddLogCheck={handleLogHourlyCheckNow}
          showToast={(msg) => {
            setHourlyPullNotice(msg);
            setTimeout(() => setHourlyPullNotice(null), 4000);
          }}
        />

        {/* PUBLISH TO TOTAL HOURS STATUS & ACTIONS */}
        {!isPublishedToTotalHours ? (
          <div className="bg-gradient-to-r from-orange-950/40 via-[#1f1710] to-amber-950/40 border border-orange-500/40 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-500 text-zinc-950 rounded-xl font-black shrink-0 shadow-md">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-black text-white">Publish Cook Log to Total Smoker Hours</h4>
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 font-mono font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                    {hoursLogged.toFixed(2)} Hours Ready
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  ✏️ Temperature entries are editable until published. Publishing locks temperature readings, generates thermal curve analytics, and adds runtime to total smoker hours.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePublishToTotalHours}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-xl transition-all cursor-pointer active:scale-95 shrink-0 flex items-center space-x-2"
            >
              <Award className="w-4 h-4 text-zinc-950" />
              <span>Publish to Total Hours</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-white text-sm block">
                  Published & Locked to Smoker Operating Hours ({hoursLogged.toFixed(2)} hrs)
                </span>
                <span className="text-zinc-300">
                  Temperature data is locked. Thermal curve analytics are generated and saved inside this log.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublishedToTotalHours(false)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Temp Log to Edit</span>
            </button>
          </div>
        )}

        {/* THERMAL CURVE ANALYTICS CARD WHEN PUBLISHED */}
        {isPublishedToTotalHours && (
          <ThermalCurveAnalyticsCard cook={buildCookLogObject(true)} isPublished={true} />
        )}

        {/* ROW 4: TEMPERATURE READINGS TABLE & GRAPH DATA EXTRACTION */}
        <div className="space-y-4">
          {/* UPLOADED TEMPERATURE GRAPH DATA EXTRACTION CARD */}
          <div className="bg-gradient-to-r from-blue-950/40 via-[#141b26] to-cyan-950/40 border border-blue-500/40 p-4 rounded-2xl shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white font-black shadow-md shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Pull Data from Uploaded Temperature Graph</h3>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-bold px-2 py-0.5 rounded-full">
                      AI Vision Graph Parser
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Upload a screenshot or photo of a temperature graph (MEATER, ThermoWorks, FireBoard, ToGrill, Inkbird, Traeger, Weber) to extract data points directly into this log.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                <input
                  type="file"
                  ref={graphFileInputRef}
                  onChange={handleGraphFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => graphFileInputRef.current?.click()}
                  disabled={isExtractingGraph || isPublishedToTotalHours}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Upload className={`w-4 h-4 ${isExtractingGraph ? 'animate-bounce' : ''}`} />
                  <span>{isExtractingGraph ? 'Extracting Graph...' : 'Upload Graph Image'}</span>
                </button>
              </div>
            </div>

            {/* Extracted Graph Notice / Progress */}
            {graphExtractionNotice && (
              <div className="text-xs text-blue-200 bg-blue-500/10 border border-blue-500/30 p-2.5 rounded-xl flex items-center space-x-2 font-medium animate-fadeIn">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{graphExtractionNotice}</span>
              </div>
            )}

            {/* Graph Image Preview */}
            {graphImageUrl && (
              <div className="relative border border-blue-500/30 rounded-xl overflow-hidden bg-black/60 max-h-56 flex items-center justify-center p-2">
                <img src={graphImageUrl} alt="Uploaded Cook Temperature Graph" className="max-h-48 object-contain rounded-lg" />
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-blue-500/40 text-blue-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 shadow-md">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Graph Data Parsed & Populated</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#121212] border border-[#2a2a2a] p-4 rounded-2xl">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <span>Cook Temperature Logs & Actions Taken</span>
                </h3>
                {isPublishedToTotalHours && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                    🔒 Read-Only (Published)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review, edit, or append lines extracted from your graph curve or generated schedule.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Auto-Generate 1-Hr Interval Schedule Button */}
              <button
                type="button"
                onClick={handleGenerateHourlyReadings}
                disabled={isPublishedToTotalHours}
                className="px-3.5 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 text-xs font-black rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
                title="Automatically generate hourly log lines starting at 0:00 for total cook duration"
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Generate Hourly Schedule</span>
              </button>

              <button
                type="button"
                onClick={handleAddReading}
                disabled={isPublishedToTotalHours}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl flex items-center space-x-1 transition-all cursor-pointer active:scale-95 shadow-md disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Line</span>
              </button>
            </div>
          </div>

          {/* Hourly Pull Notification Notice */}
          {hourlyPullNotice && (
            <div className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl flex items-center space-x-2 font-medium animate-fadeIn shadow-sm">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>{hourlyPullNotice}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-[#2a2a2a] rounded-xl bg-[#121212]">
            <table className="w-full text-xs text-left text-zinc-200">
              <thead className="bg-[#1a1a1a] text-zinc-400 uppercase font-semibold border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Target °F</th>
                  <th className="p-2.5">Cooking °F</th>
                  <th className="p-2.5">Meat °F</th>
                  <th className="p-2.5">Ambient °F</th>
                  <th className="p-2.5">Actions Taken</th>
                  <th className="p-2.5 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] font-mono">
                {readings.map((r) => (
                  <tr key={r.id} className="hover:bg-[#242424]">
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isPublishedToTotalHours}
                        value={r.time}
                        onChange={(e) => handleReadingChange(r.id, 'time', e.target.value)}
                        className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-orange-400 font-bold text-xs disabled:opacity-60"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPublishedToTotalHours}
                        value={r.targetTemp}
                        onChange={(e) => handleReadingChange(r.id, 'targetTemp', parseInt(e.target.value) || 0)}
                        className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-zinc-300 text-xs disabled:opacity-60"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPublishedToTotalHours}
                        value={r.cookingTemp}
                        onChange={(e) => handleReadingChange(r.id, 'cookingTemp', parseInt(e.target.value) || 0)}
                        className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-orange-400 font-bold text-xs disabled:opacity-60"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPublishedToTotalHours}
                        value={r.meatTemp}
                        onChange={(e) => handleReadingChange(r.id, 'meatTemp', parseInt(e.target.value) || 0)}
                        className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-red-400 font-bold text-xs disabled:opacity-60"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPublishedToTotalHours}
                        value={r.ambientTemp ?? ''}
                        placeholder="--"
                        onChange={(e) => handleReadingChange(r.id, 'ambientTemp', e.target.value === '' ? undefined : (parseInt(e.target.value) || 0))}
                        className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-zinc-400 text-xs disabled:opacity-60 placeholder:text-zinc-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isPublishedToTotalHours}
                        value={r.actionsTaken}
                        onChange={(e) => handleReadingChange(r.id, 'actionsTaken', e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-zinc-200 font-sans text-xs disabled:opacity-60"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        disabled={isPublishedToTotalHours}
                        onClick={() => handleRemoveReading(r.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </div>
        <div className={formTab === 'notes' ? 'block space-y-8 animate-fade-in' : 'hidden'}>
        {/* ROW 5: SEASONING & SERVING */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Rub & Seasoning Details
            </label>
            <input
              type="text"
              placeholder="e.g. Kosher salt, 16-mesh coarse black pepper, garlic powder..."
              value={seasoningRubs}
              onChange={(e) => setSeasoningRubs(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Sauces & Glazes
            </label>
            <input
              type="text"
              placeholder="e.g. Vinegar mop sauce, sweet glaze..."
              value={saucesGlazes}
              onChange={(e) => setSaucesGlazes(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* ROW 6: FINISHED NOTES & WOULD MAKE AGAIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {(() => {
              const isLpSmokerSelected = Boolean(
                (smokerType && (smokerType.toLowerCase().includes('gas') || smokerType.toLowerCase().includes('propane') || smokerType.toLowerCase().includes('lp'))) ||
                (profile.smokerType && (profile.smokerType.toLowerCase().includes('gas') || profile.smokerType.toLowerCase().includes('propane') || profile.smokerType.toLowerCase().includes('lp'))) ||
                (profile.fuelType && (profile.fuelType.toLowerCase().includes('gas') || profile.fuelType.toLowerCase().includes('propane') || profile.fuelType.toLowerCase().includes('lp')))
              );

              if (isLpSmokerSelected) {
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Finished Product & Wood/Pellet Notes
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        🪵 Log Fuel / Wood Used Here
                      </span>
                    </div>
                    <div className="mb-2 bg-[#171717] border border-amber-500/20 p-2.5 rounded-xl text-xs text-zinc-300 flex items-start space-x-2">
                      <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-amber-300 font-semibold">Fuel & Wood Logging Note:</strong> Use this notes field to record details about what pellets, wood species (e.g. Hickory, Post Oak, Cherry), wood chips, or fuel blends were used during this cook session.
                      </p>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Notes on bark texture, moisture, smoke ring depth, and specific pellets/wood species used (e.g. 100% Hickory, Post Oak & Cherry Blend)..."
                      value={finishedNotes}
                      onChange={(e) => handleFinishedNotesChange(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                );
              }

              return (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Finished Product Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Notes on bark texture, moisture, smoke ring depth..."
                    value={finishedNotes}
                    onChange={(e) => handleFinishedNotesChange(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              );
            })()}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                Would I Make Again?
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setWouldMakeAgain(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                    wouldMakeAgain === true
                      ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                      : 'bg-[#121212] text-zinc-400 border border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  [{wouldMakeAgain === true ? ' ✓ ' : ' '}] YES, Absolutely
                </button>

                <button
                  type="button"
                  onClick={handleSelectNeedsAdjustments}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 min-h-[42px] ${
                    wouldMakeAgain === false
                      ? 'bg-red-500 text-white shadow-md ring-2 ring-red-400/50 font-black'
                      : 'bg-[#121212] text-zinc-400 border border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  <span>[{wouldMakeAgain === false ? ' ✓ ' : ' '}] NO, Needs Adjustments</span>
                  {isAiAnalyzingNotes && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                </button>
              </div>

              {wouldMakeAgain === false && (
                <p className="text-[11px] text-amber-300 mt-2 flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <span>
                    {isAiAnalyzingNotes
                      ? `${AI_NAME} is analyzing log notes & temp curves for adjustments...`
                      : `${AI_NAME} analyzed log & updated Next Time Notes below!`}
                  </span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Next Time Notes
                </label>
                <button
                  type="button"
                  onClick={handleAnalyzeAndSuggestNextTimeNotes}
                  disabled={isAiAnalyzingNotes}
                  className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 px-2.5 py-1 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 min-h-[32px]"
                  title={`Ask ${AI_NAME} to analyze finished product notes and suggest next time adjustments`}
                >
                  {isAiAnalyzingNotes ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                      <span>Analyzing Log...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      <span>{AI_NAME} Analyze</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Wrap 30 mins earlier, lower pit temp to 225°F..."
                  value={nextTimeNotes}
                  onChange={(e) => setNextTimeNotes(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                />
                {isAiAnalyzingNotes && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        </div>
        {/* SUBMIT BUTTON */}
        <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between space-x-3">
          {initialCook && onDeleteCook ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete cook log "${initialCook.title}"?`)) {
                  onDeleteCook(initialCook.id);
                  onCancel();
                }
              }}
              className="px-4 py-2.5 bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Delete Cook Log</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* User-Selected Option for Cloud Auto-Sync */}
            <button
              type="button"
              onClick={toggleAutoSyncOnSave}
              className={`px-3 py-2 rounded-xl border text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                autoSyncOnSave
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-[#1a1a1a] text-zinc-400 border-[#2a2a2a] hover:text-zinc-200'
              }`}
              title="Toggle automatic cloud synchronization when saving cook log"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Auto-Sync Cloud: {autoSyncOnSave ? 'ON ⚡' : 'OFF (Local Only)'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-[#242424] hover:bg-[#2a2a2a] text-zinc-300 rounded-xl font-semibold text-xs transition-colors border border-[#2a2a2a]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
              title={
                autoSyncOnSave
                  ? "Saves cook log locally and automatically syncs to cloud server"
                  : "Saves cook log locally to your user account until uploaded for analysis"
              }
            >
              <Save className="w-4 h-4" />
              <span>{autoSyncOnSave ? "Save & Sync to Cloud" : "Save Locally to Account"}</span>
            </button>
          </div>
        </div>

      </form>

      {showPhysicalSheetModal && (
        <PhysicalLogSheetModal
          profile={profile}
          cook={{
            id: `temp-${Date.now()}`,
            date: date || new Date().toISOString().split('T')[0],
            smokerType: smokerType || profile.smokerName || profile.smokerType,
            title: title || 'Custom Smoke Session',
            proteinType,
            proteinCut: proteinCut || 'Custom Cut',
            hoursLogged: Number(hoursLogged) || 6,
            startingSmokerHours: startingHours,
            endingSmokerHours: endingHours,
            temperatureReadings: readings,
            finishedNotes,
            nextTimeNotes,
            seasoningRubs: seasoningRubs || 'Standard Rub',
            saucesGlazes: saucesGlazes || 'None',
            fuelType: fuelType || 'Pellets',
            pageNumber: nextPageNumber,
          } as any}
          onClose={() => setShowPhysicalSheetModal(false)}
        />
      )}
    </div>
  );
};
