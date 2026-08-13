import React, { useState, useMemo } from 'react';
import { FuelDatabaseItem, FUEL_AND_WOOD_DATABASE, filterFuelDatabase } from '../utils/fuelDatabase';
import { ProteinType, FuelLog } from '../types';
import { Search, Filter, Flame, FlaskConical, Layers, Zap, Sparkles, Check, Plus, X, ChevronRight, Award, Info, Scale, ShieldCheck, ArrowUpDown, BookOpen, RefreshCw, Database } from 'lucide-react';
import { checkAndUpdateRetailerPricesOnline, getLastPriceSyncTimestamp, loadRetailerFuelPrices } from '../utils/retailerPriceSync';

interface FuelDatabaseExplorerProps {
  onAddFuelLog?: (newFuel: FuelLog) => void;
  onSelectForBlend?: (item: FuelDatabaseItem) => void;
  onSelectFuel?: (item: FuelDatabaseItem) => void;
  isOpen?: boolean;
  onClose?: () => void;
  selectedFuelId?: string;
  hopperCapacityLbs?: number;
  fuelLogs?: FuelLog[];
  isLpSmoker?: boolean;
}

export const FuelDatabaseExplorer: React.FC<FuelDatabaseExplorerProps> = ({
  onAddFuelLog,
  onSelectForBlend,
  onSelectFuel,
  isOpen,
  onClose,
  selectedFuelId,
  hopperCapacityLbs = 40,
  fuelLogs = [],
  isLpSmoker = false,
}) => {
  if (isOpen === false) return null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSmokeDensity, setSelectedSmokeDensity] = useState<string>('all');
  const [selectedProtein, setSelectedProtein] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'btu' | 'name' | 'efficiency' | 'moisture'>('btu');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const lastSync = getLastPriceSyncTimestamp();
  const lastSyncText = lastSync > 0 ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

  const handleManualPriceSync = () => {
    const res = checkAndUpdateRetailerPricesOnline(true);
    setSyncStatusMsg(res.message);
    setTimeout(() => setSyncStatusMsg(null), 5000);
  };

  // Detail Modal State
  const [inspectedItem, setInspectedItem] = useState<FuelDatabaseItem | null>(null);

  // Quick Restock Modal State
  const [restockItem, setRestockItem] = useState<FuelDatabaseItem | null>(null);
  const [restockBagLbs, setRestockBagLbs] = useState<number>(hopperCapacityLbs);
  const [restockPrice, setRestockPrice] = useState<number>(Number((hopperCapacityLbs * 0.75).toFixed(2)));
  const [restockDate, setRestockDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredItems = useMemo(() => {
    return filterFuelDatabase(
      FUEL_AND_WOOD_DATABASE,
      searchQuery,
      selectedCategory,
      selectedSmokeDensity,
      selectedProtein,
      sortBy
    );
  }, [searchQuery, selectedCategory, selectedSmokeDensity, selectedProtein, sortBy]);

  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    const costPerLb = restockBagLbs > 0 ? Number((restockPrice / restockBagLbs).toFixed(2)) : 0.75;

    const newLog: FuelLog = {
      id: `fuel-${Date.now()}`,
      date: restockDate,
      fuelBrand: restockItem.brand !== 'Pure Wood Species' ? restockItem.name : `${restockItem.brand} - ${restockItem.name}`,
      woodType: restockItem.blendRatioSummary || restockItem.name,
      quantityLbs: Number(restockBagLbs),
      costPerLb,
      pricePaid: Number(restockPrice),
      isBlend: restockItem.category === 'Pitmaster Blends' || !!restockItem.blendComponents,
      blendComponents: restockItem.blendComponents,
      calculatedBtuPerLb: restockItem.btuPerLb,
      calculatedEfficiencyRating: restockItem.burnRateEfficiencyRating,
      estimatedRunTimeHoursPer10Lbs: restockItem.estimatedRunTimeHoursPer10Lbs,
    };

    onAddFuelLog(newLog);
    setRestockItem(null);
  };

  const explorerContent = (
    <div className={`bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xl ${isOpen ? 'max-w-5xl w-full max-h-[90vh] overflow-y-auto' : ''}`}>
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-lg font-black text-white tracking-tight">Fuel & Wood Blend Searchable Database</h2>
              <span className="text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-md">
                {filteredItems.length} / {FUEL_AND_WOOD_DATABASE.length} Profiles
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Search thermal BTU ratings, moisture percentages, smoke densities, bark impacts, and master pitmaster wood blend pairings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 24-HOUR ONLINE RETAIL PRICE INDEX STATUS */}
          <div className="flex items-center space-x-2 bg-[#202020] border border-[#333] px-3 py-2 rounded-xl text-xs shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-300 font-mono text-[11px]">
                Daily Retail Price Sync (Last: <span className="text-emerald-400 font-bold">{lastSyncText}</span>)
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualPriceSync}
              className="p-1 rounded-lg bg-[#2a2a2a] hover:bg-[#383838] text-zinc-200 transition-colors cursor-pointer border border-[#444]"
              title="Force immediate online retail price update"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#242424] hover:bg-[#333] text-zinc-400 hover:text-white border border-[#333] transition-colors cursor-pointer"
              title="Close Database"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isLpSmoker && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>LP Gas / Propane Smoker Active:</strong> Wood chip, chunk & pellet selections are tuned for LP chip trays and matched directly with your restock log & inventory.</span>
          </div>
        </div>
      )}

      {syncStatusMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs px-3.5 py-2 rounded-xl font-mono flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
        {/* Search Input (3 Cols) */}
        <div className="lg:col-span-3 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search species, chips, pellets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl pl-10 pr-9 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-zinc-500 font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter (2 Cols) */}
        <div className="lg:col-span-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[#121212] border border-[#2a2a2a] text-amber-400 font-bold rounded-xl px-2.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">🔥 All Fuel Categories</option>
            <option value="Smoker Wood Chips">🪵 Wood Chips (LP / Gas)</option>
            <option value="Pure Wood Species">🪵 Pure Wood Species</option>
            <option value="Commercial Pellets">🪵 Commercial Pellets</option>
            <option value="Pitmaster Blends">🧪 Pitmaster Blends</option>
            <option value="Charcoal & Lump">🔥 Charcoal & Lump</option>
          </select>
        </div>

        {/* Smoke Density Filter (2 Cols) */}
        <div className="lg:col-span-2">
          <select
            value={selectedSmokeDensity}
            onChange={(e) => setSelectedSmokeDensity(e.target.value)}
            className="w-full bg-[#121212] border border-[#2a2a2a] text-zinc-200 rounded-xl px-2.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">💨 All Densities</option>
            <option value="Light">Light Density</option>
            <option value="Medium">Medium Density</option>
            <option value="Bold">Bold Density</option>
            <option value="Heavy">Heavy Density</option>
          </select>
        </div>

        {/* Protein Pairing Filter (2 Cols) */}
        <div className="lg:col-span-2">
          <select
            value={selectedProtein}
            onChange={(e) => setSelectedProtein(e.target.value)}
            className="w-full bg-[#121212] border border-[#2a2a2a] text-zinc-200 rounded-xl px-2.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">🥩 All Pairings</option>
            <option value="Beef">Beef (Brisket)</option>
            <option value="Pork">Pork (Shoulder, Ribs)</option>
            <option value="Chicken">Chicken & Poultry</option>
            <option value="Turkey">Turkey</option>
            <option value="Seafood">Seafood & Salmon</option>
            <option value="Lamb">Lamb & Game</option>
          </select>
        </div>

        {/* Sort By Filter (3 Cols) */}
        <div className="lg:col-span-3 flex items-center space-x-2">
          <span className="text-[10px] text-zinc-400 font-bold uppercase shrink-0 font-mono">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="btu">⚡ Thermal Output (BTU/lb High → Low)</option>
            <option value="efficiency">🔥 Efficiency Rating (% High → Low)</option>
            <option value="moisture">💧 Moisture Content (Low → High)</option>
            <option value="name">🔤 Alphabetical Name (A → Z)</option>
          </select>
        </div>
      </div>

      {/* NO RESULTS DISPLAY */}
      {filteredItems.length === 0 && (
        <div className="bg-[#121212] border border-dashed border-[#333] rounded-2xl p-8 text-center space-y-3">
          <Flame className="w-10 h-10 text-zinc-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Matching Wood Fuel or Blend Specs Found</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Try adjusting your search keywords or clearing active smoke density / protein filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedSmokeDensity('all');
              setSelectedProtein('all');
              setSortBy('btu');
            }}
            className="px-4 py-2 bg-[#222222] hover:bg-[#2a2a2a] text-orange-400 font-bold text-xs rounded-xl border border-[#333] transition-all cursor-pointer"
          >
            Reset All Database Filters
          </button>
        </div>
      )}

      {/* FUEL & WOOD DATABASE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-[#141414] hover:bg-[#181818] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-lg group"
          >
            <div>
              {/* TOP BADGES */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  item.category === 'Smoker Wood Chips'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-extrabold'
                    : item.category === 'Pure Wood Species'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : item.category === 'Commercial Pellets'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : item.category === 'Pitmaster Blends'
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {item.category}
                </span>

                <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                  <span className="bg-[#1e1e1e] border border-[#333] text-orange-400 font-bold px-2 py-0.5 rounded-md">
                    ⚡ {item.btuPerLb.toLocaleString()} BTU/lb
                  </span>
                </div>
              </div>

              {/* TITLE & BRAND */}
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white group-hover:text-orange-400 transition-colors">
                  {item.name}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  {item.brand} • <span className="text-zinc-300">{item.blendRatioSummary || `${item.moisturePercent}% Moisture`}</span>
                </p>
              </div>

              {/* DESCRIPTION & FLAVOR */}
              <p className="text-xs text-zinc-300 mt-2.5 line-clamp-2 leading-relaxed font-sans">
                {item.flavorNotes}
              </p>

              {/* METRICS GRID */}
              <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 bg-[#0e0e0e] border border-[#242424] rounded-xl text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500 uppercase block font-sans text-[9px] font-bold">Smoke Density</span>
                  <span className={`font-bold ${
                    item.smokeDensity === 'Bold' || item.smokeDensity === 'Heavy' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {item.smokeDensity}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase block font-sans text-[9px] font-bold">Moisture</span>
                  <span className="text-blue-400 font-bold">{item.moisturePercent}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase block font-sans text-[9px] font-bold">Efficiency</span>
                  <span className="text-emerald-400 font-bold">{item.burnRateEfficiencyRating}%</span>
                </div>
              </div>

              {/* BARK & PAIRING TAGS */}
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] text-zinc-400 flex items-center space-x-1">
                  <span className="font-bold text-zinc-300 shrink-0">Bark Effect:</span>
                  <span className="truncate text-orange-300/90">{item.barkImpact}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.recommendedProteins.map((p) => (
                    <span
                      key={p}
                      className="bg-[#1e1e1e] border border-[#2d2d2d] text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium"
                    >
                      🥩 {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD ACTION BUTTONS */}
            <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-2 text-xs font-sans">
              <button
                type="button"
                onClick={() => setInspectedItem(item)}
                className="px-2.5 py-1.5 bg-[#1e1e1e] hover:bg-[#282828] text-zinc-300 hover:text-white border border-[#333] rounded-xl font-bold flex items-center space-x-1 cursor-pointer transition-all text-[11px]"
              >
                <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                <span>Specs & Chemistry</span>
              </button>

              {onSelectFuel ? (
                <button
                  type="button"
                  onClick={() => onSelectFuel(item)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-[11px] shadow-md transition-all cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Select Fuel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRestockItem(item);
                    setRestockBagLbs(hopperCapacityLbs);
                    setRestockPrice(Number((hopperCapacityLbs * 0.75).toFixed(2)));
                  }}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-[11px] shadow-md transition-all cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Restock Bag</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* INSPECTED ITEM SPECS & CHEMISTRY MODAL */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-start justify-between pb-3 border-b border-[#2a2a2a]">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {inspectedItem.category} • Spec Profile
                </span>
                <h3 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
                  <span>{inspectedItem.name}</span>
                </h3>
                <p className="text-xs text-zinc-400">{inspectedItem.brand}</p>
              </div>

              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="p-1.5 rounded-xl bg-[#242424] hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {inspectedItem.description}
            </p>

            {/* CHEMISTRY & THERMAL MATRIX */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Thermal Value</span>
                <span className="text-orange-400 font-extrabold text-sm">{inspectedItem.btuPerLb.toLocaleString()}</span>
                <span className="text-[9px] text-zinc-500 block font-sans">BTU / lb</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Moisture Content</span>
                <span className="text-blue-400 font-extrabold text-sm">{inspectedItem.moisturePercent}%</span>
                <span className="text-[9px] text-zinc-500 block font-sans">Avg Moisture</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Burn Efficiency</span>
                <span className="text-emerald-400 font-extrabold text-sm">{inspectedItem.burnRateEfficiencyRating}%</span>
                <span className="text-[9px] text-zinc-500 block font-sans">Rating Grade</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Est Runtime</span>
                <span className="text-white font-extrabold text-sm">~{inspectedItem.estimatedRunTimeHoursPer10Lbs}</span>
                <span className="text-[9px] text-zinc-500 block font-sans">hrs / 10 lbs</span>
              </div>
            </div>

            {/* DETAILED PROPERTIES */}
            <div className="space-y-3 text-xs">
              <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                <span className="font-bold text-white block mb-1">💨 Smoke Profile & Aroma Notes:</span>
                <p className="text-zinc-300 leading-relaxed font-sans">{inspectedItem.flavorNotes}</p>
              </div>

              <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                <span className="font-bold text-white block mb-1">🍖 Bark Color & Surface Texture Impact:</span>
                <p className="text-amber-300/90 font-sans">{inspectedItem.barkImpact}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                  <span className="font-bold text-white block mb-1">🔥 Ideal Smoking Temperature:</span>
                  <span className="text-orange-400 font-mono font-bold">{inspectedItem.idealSmokingTempRange}</span>
                </div>
                <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                  <span className="font-bold text-white block mb-1">🧹 Ash Output Level:</span>
                  <span className="text-emerald-400 font-mono font-bold">{inspectedItem.ashOutput}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-white block mb-2">🥩 Recommended Protein Pairings:</span>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedItem.recommendedProteins.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-bold font-sans flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3 text-orange-400" />
                      <span>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 bg-[#242424] text-zinc-300 hover:text-white border border-[#2a2a2a] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setRestockItem(inspectedItem);
                  setInspectedItem(null);
                  setRestockBagLbs(hopperCapacityLbs);
                  setRestockPrice(Number((hopperCapacityLbs * 0.75).toFixed(2)));
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Restock Bag to My Inventory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK BAG MODAL */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Restock {restockItem.name}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Add to your active wood pellet inventory logs.</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                className="p-1.5 rounded-xl bg-[#242424] hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Restock Date</label>
                <input
                  type="date"
                  required
                  value={restockDate}
                  onChange={(e) => setRestockDate(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bag Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={restockBagLbs}
                    onChange={(e) => {
                      const lbs = parseFloat(e.target.value) || 0;
                      setRestockBagLbs(lbs);
                      setRestockPrice(Number((lbs * 0.75).toFixed(2)));
                    }}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Price Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between font-mono">
                <span className="text-zinc-400 text-[11px] font-sans">Calculated Cost / lb:</span>
                <span className="text-amber-400 font-bold">
                  ${restockBagLbs > 0 ? (restockPrice / restockBagLbs).toFixed(2) : '0.00'} / lb
                </span>
              </div>

              <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold hover:bg-[#2a2a2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Confirm & Log Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
        <div className="relative w-full max-w-5xl">
          {explorerContent}
        </div>
      </div>
    );
  }

  return explorerContent;
};
