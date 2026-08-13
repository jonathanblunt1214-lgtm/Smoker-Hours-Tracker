import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CustomSmokerSpec, ManufacturerSmokerSpec } from '../types';
import {
  loadSavedCustomSmokers,
  saveSavedCustomSmokers,
  loadSavedManufacturerSmokers,
  saveSavedManufacturerSmokers,
} from '../utils/storage';
import {
  Flame,
  X,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Database,
  Layers,
  Thermometer,
  Scale,
  Plus,
  Sparkles,
  Info,
  AlertCircle,
  Loader2,
  Share2,
  Save,
  Tag,
  Building2,
  Search,
  Filter,
} from 'lucide-react';

interface CustomSmokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  pitmasterAlias?: string;
  onSmokerCreated: (newSmoker: CustomSmokerSpec | ManufacturerSmokerSpec, setActiveAsCurrent: boolean) => void;
}

export const CustomSmokerModal: React.FC<CustomSmokerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  pitmasterAlias = 'Pitmaster Guest',
  onSmokerCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'manufacturer' | 'community'>('custom');

  // Custom Build Form State
  const [customName, setCustomName] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [customSmokerType, setCustomSmokerType] = useState('Custom Reverse Flow Offset');
  const [customFuelType, setCustomFuelType] = useState<'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas'>('Wood Splits');
  const [metalGauge, setMetalGauge] = useState('1/4" Heavy Rolled Steel');
  const [customChamberVolumeSqIn, setCustomChamberVolumeSqIn] = useState<number | string>(1200);
  const [customHopperCapacityLbs, setCustomHopperCapacityLbs] = useState<number | string>(0);
  const [customBaselineBurnRateLbsHr, setCustomBaselineBurnRateLbsHr] = useState<number | string>(1.25);
  const [draftType, setDraftType] = useState('Reverse Flow Airflow');
  const [customNotes, setCustomNotes] = useState('');

  // Manufacturer Spec Form State
  const [mfgBrand, setMfgBrand] = useState('Traeger');
  const [mfgModel, setMfgModel] = useState('');
  const [mfgCategory, setMfgCategory] = useState('Pellet Smoker / Grill');
  const [mfgFuelType, setMfgFuelType] = useState<'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas'>('Pellets');
  const [mfgBaselineBurnRate, setMfgBaselineBurnRate] = useState<number | string>(1.20);
  const [mfgHighHeatBurnRate, setMfgHighHeatBurnRate] = useState<number | string>(2.50);
  const [mfgHopperCapacity, setMfgHopperCapacity] = useState<number | string>(22);
  const [mfgBowlCapacity, setMfgBowlCapacity] = useState<number | string>(0);
  const [mfgCookingArea, setMfgCookingArea] = useState<number | string>(850);
  const [mfgInsulation, setMfgInsulation] = useState('Double-Wall Insulated Steel');
  const [mfgThermalRating, setMfgThermalRating] = useState<'Extreme' | 'High' | 'Standard' | 'Moderate'>('High');
  const [mfgController, setMfgController] = useState('Digital PID Wi-Fi Screen');
  const [mfgNotes, setMfgNotes] = useState('');

  // Common Options
  const [setActiveAsCurrent, setSetActiveAsCurrent] = useState(true);
  const [contributeToPool, setContributeToPool] = useState(true);

  // Status & Community Database State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Community Database Pool
  const [communityCustomSmokers, setCommunityCustomSmokers] = useState<any[]>([]);
  const [communityMfgSmokers, setCommunityMfgSmokers] = useState<any[]>([]);
  const [communityFilter, setCommunityFilter] = useState<'all' | 'custom' | 'manufacturer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'community') {
      fetchCommunityDatabase();
    }
  }, [isOpen, activeTab]);

  const fetchCommunityDatabase = async () => {
    setIsLoadingCommunity(true);
    try {
      const res = await fetch('/api/smoker-database');
      const data = await res.json();
      if (data.success) {
        setCommunityCustomSmokers(data.customSmokers || []);
        setCommunityMfgSmokers(data.manufacturerSmokers || []);
      }
    } catch (e) {
      console.error('Failed to fetch community smoker database', e);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  if (!isOpen) return null;

  // Submit Custom Smoker Specs
  const handleSubmitCustomSmoker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a name for your custom built smoker.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: 'info', text: 'Saving custom smoker specs to account & contributing to server database pool...' });

    const newCustom: CustomSmokerSpec = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      builderName: builderName.trim() || 'Self-Built / Custom Shop',
      smokerType: customSmokerType.trim() || 'Custom Smoker',
      fuelType: customFuelType,
      metalGauge: metalGauge.trim() || 'Custom Steel Construction',
      chamberVolumeSqIn: Number(customChamberVolumeSqIn) || 1200,
      hopperCapacityLbs: Number(customHopperCapacityLbs) || 30,
      baselineBurnRateLbsHr: Number(customBaselineBurnRateLbsHr) || 1.25,
      draftType: draftType.trim() || 'Standard Draft',
      notes: customNotes.trim(),
      createdAt: new Date().toISOString(),
      pitmasterAlias,
    };

    // Save locally to user saved custom smokers array
    const existing = loadSavedCustomSmokers();
    saveSavedCustomSmokers([newCustom, ...existing.filter((s) => s.id !== newCustom.id)]);

    // Contribute to Server Pool if checked
    let contributedOk = false;
    if (contributeToPool) {
      try {
        const isTermsAccepted = localStorage.getItem('pitmaster_terms_accepted') !== 'false';
        const hasAccount = !!(currentUser?.email || (pitmasterAlias && pitmasterAlias !== 'Pitmaster Guest' && pitmasterAlias !== 'guest'));

        const res = await fetch('/api/custom-smokers/contribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pitmasterAlias,
            hasAccount,
            termsAccepted: isTermsAccepted,
            smokerSpecs: newCustom,
          }),
        });
        const resData = await res.json();
        if (resData.success) {
          contributedOk = true;
        }
      } catch (err) {
        console.error('Failed to contribute custom smoker specs:', err);
      }
    }

    setIsSubmitting(false);
    setStatusMessage({
      type: 'success',
      text: contributedOk
        ? `Custom smoker '${newCustom.name}' saved to user account and submitted to server database!`
        : `Custom smoker '${newCustom.name}' saved to your local user account!`,
    });

    setTimeout(() => {
      onSmokerCreated(newCustom, setActiveAsCurrent);
      onClose();
    }, 1200);
  };

  // Submit Manufacturer Smoker Specs
  const handleSubmitManufacturerSmoker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfgModel.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the manufacturer model name.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: 'info', text: 'Saving manufacturer specs to user account & contributing to server database pool...' });

    const newMfg: ManufacturerSmokerSpec = {
      id: `mfg-${Date.now()}`,
      brand: mfgBrand,
      model: mfgModel.trim(),
      category: mfgCategory,
      fuelType: mfgFuelType,
      factoryBaselineBurnRateLbsHr: Number(mfgBaselineBurnRate) || 1.20,
      factoryHighHeatBurnRateLbsHr: Number(mfgHighHeatBurnRate) || 2.50,
      hopperCapacityLbs: Number(mfgHopperCapacity) || 20,
      bowlCapacityLbs: Number(mfgBowlCapacity) || 0,
      cookingAreaSqIn: Number(mfgCookingArea) || 800,
      insulationType: mfgInsulation,
      thermalEfficiencyRating: mfgThermalRating,
      controllerType: mfgController,
      notes: mfgNotes.trim(),
      createdAt: new Date().toISOString(),
      pitmasterAlias,
      isVerifiedManufacturerData: true,
    };

    // Auto convert manufacturer capacity to account metric if set as active
    if (setActiveAsCurrent) {
      const effectiveCap = (Number(mfgBowlCapacity) || 0) > 0 ? (Number(mfgBowlCapacity) || 0) : (Number(mfgHopperCapacity) || 20);
      try {
        const rawAcc = localStorage.getItem('pitmaster_local_user_account');
        const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
        acc.fuelOnHand = `${effectiveCap} lbs`;
        localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
      } catch (e) {}
    }

    // Save locally
    const existing = loadSavedManufacturerSmokers();
    saveSavedManufacturerSmokers([newMfg, ...existing.filter((s) => s.id !== newMfg.id)]);

    // Contribute to Server Pool if checked
    let contributedOk = false;
    if (contributeToPool) {
      try {
        const isTermsAccepted = localStorage.getItem('pitmaster_terms_accepted') !== 'false';
        const hasAccount = !!(currentUser?.email || (pitmasterAlias && pitmasterAlias !== 'Pitmaster Guest' && pitmasterAlias !== 'guest'));

        const res = await fetch('/api/manufacturer-smokers/contribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pitmasterAlias,
            hasAccount,
            termsAccepted: isTermsAccepted,
            manufacturerSpecs: newMfg,
          }),
        });
        const resData = await res.json();
        if (resData.success) {
          contributedOk = true;
        }
      } catch (err) {
        console.error('Failed to contribute manufacturer smoker specs:', err);
      }
    }

    setIsSubmitting(false);
    setStatusMessage({
      type: 'success',
      text: contributedOk
        ? `Manufacturer smoker '${newMfg.brand} ${newMfg.model}' collected for server smoker database!`
        : `Manufacturer smoker '${newMfg.brand} ${newMfg.model}' saved to your local user account!`,
    });

    setTimeout(() => {
      onSmokerCreated(newMfg, setActiveAsCurrent);
      onClose();
    }, 1200);
  };

  // Import Community Smoker Spec
  const handleImportSmokerSpec = (record: any, isMfg: boolean) => {
    if (isMfg) {
      const mfgSpec: ManufacturerSmokerSpec = {
        id: `imported-mfg-${Date.now()}`,
        brand: record.brand || 'Commercial Brand',
        model: record.model || 'Smoker Model',
        category: record.category || 'Smoker',
        fuelType: record.fuelType || 'Pellets',
        factoryBaselineBurnRateLbsHr: record.factoryBaselineBurnRateLbsHr || 1.2,
        factoryHighHeatBurnRateLbsHr: record.factoryHighHeatBurnRateLbsHr || 2.5,
        hopperCapacityLbs: record.hopperCapacityLbs || 20,
        cookingAreaSqIn: record.cookingAreaSqIn || 800,
        insulationType: record.insulationType || 'Standard Steel',
        thermalEfficiencyRating: record.thermalEfficiencyRating || 'Standard',
        controllerType: record.controllerType || 'PID Controller',
        notes: record.notes || '',
        createdAt: new Date().toISOString(),
        pitmasterAlias: record.pitmasterAlias,
        isVerifiedManufacturerData: true,
      };

      const existing = loadSavedManufacturerSmokers();
      saveSavedManufacturerSmokers([mfgSpec, ...existing]);
      onSmokerCreated(mfgSpec, true);
    } else {
      const customSpec: CustomSmokerSpec = {
        id: `imported-custom-${Date.now()}`,
        name: record.name,
        builderName: record.builderName || 'Custom Builder',
        smokerType: record.smokerType || 'Custom Smoker',
        fuelType: record.fuelType || 'Wood Splits',
        metalGauge: record.metalGauge || 'Heavy Steel',
        chamberVolumeSqIn: record.chamberVolumeSqIn || 1200,
        hopperCapacityLbs: record.hopperCapacityLbs || 30,
        baselineBurnRateLbsHr: record.baselineBurnRateLbsHr || 1.25,
        draftType: record.draftType || 'Reverse Flow Airflow',
        notes: record.notes || '',
        createdAt: new Date().toISOString(),
        pitmasterAlias: record.pitmasterAlias,
      };

      const existing = loadSavedCustomSmokers();
      saveSavedCustomSmokers([customSpec, ...existing]);
      onSmokerCreated(customSpec, true);
    }
    onClose();
  };

  // Filter Community Database
  const filteredCustomList = communityCustomSmokers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.builderName?.toLowerCase().includes(q) ||
      s.smokerType?.toLowerCase().includes(q) ||
      s.pitmasterAlias?.toLowerCase().includes(q)
    );
  });

  const filteredMfgList = communityMfgSmokers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.brand?.toLowerCase().includes(q) ||
      s.model?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.pitmasterAlias?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-3xl bg-[#181818] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#202020] border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Smoker Specification & Database Collector
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-mono">
                Collect custom built & manufacturer smoker specs into the pitmaster database pool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#2e2e2e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-[#2a2a2a] bg-[#1a1a1a] px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'custom'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Custom Built Pit Specs</span>
          </button>
          <button
            onClick={() => setActiveTab('manufacturer')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'manufacturer'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Manufacturer Smoker Specs</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'community'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Community Smoker Database Pool</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs text-zinc-300">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
              }`}
            >
              {statusMessage.type === 'info' && <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />}
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: CUSTOM BUILT PIT SPECS */}
          {activeTab === 'custom' && (
            <form onSubmit={handleSubmitCustomSmoker} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Custom Smoker Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grandpa's Texas 500gal Offset"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Fabricator / Builder
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lone Star Fabrication / Self-Built"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Smoker Category / Build Type
                  </label>
                  <select
                    value={customSmokerType}
                    onChange={(e) => setCustomSmokerType(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Custom Reverse Flow Offset">Custom Reverse Flow Offset</option>
                    <option value="Custom Direct Offset Stickburner">Custom Direct Offset Stickburner</option>
                    <option value="Custom Insulated Cabinet Smoker">Custom Insulated Cabinet Smoker</option>
                    <option value="Ugly Drum Smoker (Custom UDS)">Ugly Drum Smoker (Custom UDS)</option>
                    <option value="Custom Gravity Charcoal Smoker">Custom Gravity Charcoal Smoker</option>
                    <option value="Custom Pellet Smoker Rig">Custom Pellet Smoker Rig</option>
                    <option value="Custom Brick/Stone Pit">Custom Brick/Stone Pit</option>
                    <option value="Custom Electric/Gas Hybrid Pit">Custom Electric/Gas Hybrid Pit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Primary Fuel Type
                  </label>
                  <select
                    value={customFuelType}
                    onChange={(e) => setCustomFuelType(e.target.value as any)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Wood Splits">Wood Splits (Hardwood Logs)</option>
                    <option value="Charcoal">Charcoal (Lump & Briketts)</option>
                    <option value="Pellets">Pellets</option>
                    <option value="Electric">Electric</option>
                    <option value="Gas">Gas / Propane</option>
                  </select>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Custom Thermal & Capacity Specs</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Metal Gauge / Plate Thickness
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1/4 rolled steel, double wall"
                      value={metalGauge}
                      onChange={(e) => setMetalGauge(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Cooking Area (Sq. In.)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={customChamberVolumeSqIn}
                      onChange={(e) => setCustomChamberVolumeSqIn(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Hopper / Firebox Capacity (lbs)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={customHopperCapacityLbs}
                      onChange={(e) => setCustomHopperCapacityLbs(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Est. Baseline Burn Rate (lbs/hr @ 225°F)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="10.0"
                      value={customBaselineBurnRateLbsHr}
                      onChange={(e) => setCustomBaselineBurnRateLbsHr(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Draft & Airflow Design
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reverse Flow, Gravity Feed"
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Builder Notes & Modifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes tuning baffle plates, insulated door gaskets, extended stack extension..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-[#222222] border border-[#333333] rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#2a2a2a]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setActiveAsCurrent}
                    onChange={(e) => setSetActiveAsCurrent(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500/50 bg-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    Set this custom smoker as my active smoker profile immediately
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contributeToPool}
                    onChange={(e) => setContributeToPool(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500/50 bg-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200 flex items-center space-x-1">
                    <Database className="w-3.5 h-3.5 text-orange-400" />
                    <span>Contribute custom smoker specs to Pitmaster Community Smoker Database</span>
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Custom Smoker Specs</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANUFACTURER SMOKER SPECS */}
          {activeTab === 'manufacturer' && (
            <form onSubmit={handleSubmitManufacturerSmoker} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Manufacturer / Brand Name *
                  </label>
                  <select
                    value={mfgBrand}
                    onChange={(e) => setMfgBrand(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Traeger">Traeger Grills</option>
                    <option value="Pit Boss">Pit Boss Grills</option>
                    <option value="Yoder Smokers">Yoder Smokers</option>
                    <option value="Camp Chef">Camp Chef</option>
                    <option value="Recteq">Recteq Grills</option>
                    <option value="Masterbuilt">Masterbuilt</option>
                    <option value="Kamado Joe">Kamado Joe</option>
                    <option value="Weber">Weber</option>
                    <option value="Green Mountain Grills">Green Mountain Grills (GMG)</option>
                    <option value="Oklahoma Joe's">Oklahoma Joe's</option>
                    <option value="Pit Barrel Cooker">Pit Barrel Cooker</option>
                    <option value="Horizon">Horizon Smokers</option>
                    <option value="Lone Star Grillz">Lone Star Grillz</option>
                    <option value="Outlaw Smokers">Outlaw Smokers</option>
                    <option value="Other Manufacturer">Other Commercial Brand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Model / Series Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Timberline 1300 / YS640s / RT-700 / Woodwind 36"
                    value={mfgModel}
                    onChange={(e) => setMfgModel(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Smoker Category
                  </label>
                  <select
                    value={mfgCategory}
                    onChange={(e) => setMfgCategory(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Pellet Smoker / Grill">Horizontal Pellet Smoker / Grill</option>
                    <option value="Vertical Pellet Smoker">Vertical Cabinet Pellet Smoker</option>
                    <option value="Gravity Series Digital Charcoal Smoker">Gravity Digital Charcoal Smoker</option>
                    <option value="Offset Wood & Charcoal Smoker">Offset Stickburner (Wood Splits)</option>
                    <option value="Kamado Ceramic Charcoal Cooker">Kamado Ceramic Cooker</option>
                    <option value="Ugly Drum Smoker (UDS)">Drum Smoker (Pit Barrel / UDS)</option>
                    <option value="Water Smoker / Charcoal Bullet">Water Smoker / Charcoal Bullet</option>
                    <option value="Electric Cabinet Smoker">Electric Cabinet Smoker</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={mfgFuelType}
                    onChange={(e) => setMfgFuelType(e.target.value as any)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Pellets">Pellets</option>
                    <option value="Charcoal">Charcoal (Lump & Briketts)</option>
                    <option value="Wood Splits">Wood Splits (Hardwood Logs)</option>
                    <option value="Electric">Electric</option>
                    <option value="Gas">Gas / Propane</option>
                  </select>
                </div>
              </div>

              {/* Manufacturer Performance Ratings */}
              <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Factory Burn Rates & Thermal Ratings</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Baseline Burn (lbs/hr @ 225°F)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={mfgBaselineBurnRate}
                      onChange={(e) => setMfgBaselineBurnRate(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      High-Heat Burn (lbs/hr @ 350°F+)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={mfgHighHeatBurnRate}
                      onChange={(e) => setMfgHighHeatBurnRate(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Hopper Capacity (lbs)
                    </label>
                    <input
                      type="number"
                      value={mfgHopperCapacity}
                      onChange={(e) => setMfgHopperCapacity(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">
                      Firebox / Charcoal Bowl Capacity (lbs)
                    </label>
                    <input
                      type="number"
                      value={mfgBowlCapacity}
                      onChange={(e) => setMfgBowlCapacity(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Cooking Area (Sq. In.)
                    </label>
                    <input
                      type="number"
                      value={mfgCookingArea}
                      onChange={(e) => setMfgCookingArea(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Insulation & Shell Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Double-Wall Insulated Steel"
                      value={mfgInsulation}
                      onChange={(e) => setMfgInsulation(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Thermal Efficiency Rating
                    </label>
                    <select
                      value={mfgThermalRating}
                      onChange={(e) => setMfgThermalRating(e.target.value as any)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    >
                      <option value="Extreme">Extreme (Ceramic / 10-Gauge Steel)</option>
                      <option value="High">High (Double-Wall Insulated)</option>
                      <option value="Standard">Standard Single-Wall Barrel</option>
                      <option value="Moderate">Moderate (Uninsulated Steel Plate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      Controller / Draft System
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WiFIRE PID Controller"
                      value={mfgController}
                      onChange={(e) => setMfgController(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Manufacturer & Tech Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Features downdraft exhaust, stainless steel lid gaskets, PID algorithm maintains ±5°F..."
                  value={mfgNotes}
                  onChange={(e) => setMfgNotes(e.target.value)}
                  className="w-full bg-[#222222] border border-[#333333] rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#2a2a2a]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setActiveAsCurrent}
                    onChange={(e) => setSetActiveAsCurrent(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500/50 bg-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    Set this manufacturer model as my active smoker profile immediately
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contributeToPool}
                    onChange={(e) => setContributeToPool(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500/50 bg-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200 flex items-center space-x-1">
                    <Database className="w-3.5 h-3.5 text-orange-400" />
                    <span>Contribute manufacturer specs to the Pitmaster Community Smoker Database</span>
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Collect Manufacturer Specs</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: COMMUNITY SMOKER DATABASE POOL */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Database className="w-4 h-4 text-orange-400" />
                    <span>Pitmaster Community Smoker Database Pool</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Browse verified manufacturer specs and custom built pit specifications contributed by pitmasters
                  </p>
                </div>
                <button
                  onClick={fetchCommunityDatabase}
                  disabled={isLoadingCommunity}
                  className="px-2.5 py-1.5 bg-[#282828] hover:bg-[#323232] text-xs font-semibold text-zinc-300 rounded-lg flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  {isLoadingCommunity ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" /> : 'Refresh Pool'}
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#202020] p-2 rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCommunityFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      communityFilter === 'all'
                        ? 'bg-orange-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All Specs ({communityCustomSmokers.length + communityMfgSmokers.length})
                  </button>
                  <button
                    onClick={() => setCommunityFilter('custom')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      communityFilter === 'custom'
                        ? 'bg-orange-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Custom Builds ({communityCustomSmokers.length})
                  </button>
                  <button
                    onClick={() => setCommunityFilter('manufacturer')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      communityFilter === 'manufacturer'
                        ? 'bg-orange-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Manufacturer Brands ({communityMfgSmokers.length})
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search brand, model, builder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#161616] border border-[#333333] rounded-lg pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {isLoadingCommunity ? (
                <div className="py-12 flex items-center justify-center space-x-2 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  <span>Loading server smoker database...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMfgList.length === 0 && filteredCustomList.length === 0 ? (
                    <div className="p-8 text-center bg-[#202020] rounded-xl border border-[#2a2a2a] space-y-2">
                      <div className="text-zinc-300 font-bold text-sm">Server Smoker Database Pool Cleared</div>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        The community server pool is cleared for initial deployment. When pitmasters opt-in and contribute custom smoker specs or manufacturer data to the pool, they will appear here for everyone!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Manufacturer Specs List */}
                  {(communityFilter === 'all' || communityFilter === 'manufacturer') && (
                    <div className="space-y-2">
                      {communityFilter === 'all' && (
                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5 pt-1">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Manufacturer Smoker Models ({filteredMfgList.length})</span>
                        </h4>
                      )}

                      {filteredMfgList.length === 0 ? (
                        communityFilter === 'manufacturer' && (
                          <div className="p-6 text-center bg-[#202020] rounded-xl border border-[#2a2a2a] text-zinc-400">
                            No matching manufacturer smokers found.
                          </div>
                        )
                      ) : (
                        filteredMfgList.map((mfg, idx) => (
                          <div
                            key={mfg.id || idx}
                            className="bg-[#202020] border border-[#2a2a2a] hover:border-orange-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">
                                  {mfg.brand} {mfg.model}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-mono font-bold">
                                  Manufacturer Spec
                                </span>
                                {mfg.thermalEfficiencyRating && (
                                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded text-[10px] font-mono">
                                    Thermal: {mfg.thermalEfficiencyRating}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400 font-mono">
                                <span>Category: {mfg.category}</span>
                                <span>Fuel: {mfg.fuelType}</span>
                                <span>Baseline Burn: {mfg.factoryBaselineBurnRateLbsHr} lbs/hr</span>
                                <span>Hopper: {mfg.hopperCapacityLbs} lbs</span>
                                {mfg.cookingAreaSqIn && <span>Area: {mfg.cookingAreaSqIn} sq in</span>}
                              </div>
                              {mfg.notes && <p className="text-[11px] text-zinc-400 italic">{mfg.notes}</p>}
                              <div className="text-[10px] text-zinc-500 font-mono">
                                Contributed by: <span className="text-orange-300 font-semibold">{mfg.pitmasterAlias}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleImportSmokerSpec(mfg, true)}
                              className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:text-orange-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Import Specs</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Custom Built Smokers List */}
                  {(communityFilter === 'all' || communityFilter === 'custom') && (
                    <div className="space-y-2 pt-2">
                      {communityFilter === 'all' && (
                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5 pt-1">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Custom Built Pit Specifications ({filteredCustomList.length})</span>
                        </h4>
                      )}

                      {filteredCustomList.length === 0 ? (
                        communityFilter === 'custom' && (
                          <div className="p-6 text-center bg-[#202020] rounded-xl border border-[#2a2a2a] text-zinc-400">
                            No matching custom built smokers found.
                          </div>
                        )
                      ) : (
                        filteredCustomList.map((cSmoker, idx) => (
                          <div
                            key={cSmoker.id || idx}
                            className="bg-[#202020] border border-[#2a2a2a] hover:border-orange-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">{cSmoker.name}</span>
                                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[10px] font-mono font-bold">
                                  Custom Built
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400 font-mono">
                                <span>Builder: {cSmoker.builderName || 'Custom'}</span>
                                <span>Type: {cSmoker.smokerType}</span>
                                <span>Fuel: {cSmoker.fuelType}</span>
                                <span>Gauge: {cSmoker.metalGauge}</span>
                                <span>Burn Rate: {cSmoker.baselineBurnRateLbsHr} lbs/hr</span>
                              </div>
                              {cSmoker.notes && <p className="text-[11px] text-zinc-400 italic">{cSmoker.notes}</p>}
                              <div className="text-[10px] text-zinc-500 font-mono">
                                Pitmaster: <span className="text-orange-300 font-semibold">{cSmoker.pitmasterAlias}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleImportSmokerSpec(cSmoker, false)}
                              className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:text-orange-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Import Specs</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>
  );
};
