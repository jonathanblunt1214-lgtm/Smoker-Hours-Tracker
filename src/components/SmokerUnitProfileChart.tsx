import React, { useState, useMemo } from 'react';
import { SmokerProfile, CookLog, FuelLog } from '../types';
import {
  Flame,
  Clock,
  Gauge,
  TrendingUp,
  Award,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  BarChart3,
  PieChart as PieIcon,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Zap,
  Scale,
  Trophy,
  Activity,
  ArrowUpRight,
  Table,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SmokerUnitProfileChartProps {
  rigs?: SmokerProfile[];
  profile?: SmokerProfile;
  activeRigId?: string;
  cookLogs?: CookLog[];
  fuelLogs?: FuelLog[];
  onUpdatePitBaseline?: (rigId: string, newInitial: number) => void;
  onSelectActiveRig?: (rigId: string) => void;
  onOpenCustomSmokerModal?: () => void;
}

interface SmokerUnitMetrics {
  id: string;
  name: string;
  model: string;
  smokerType: string;
  fuelType: string;
  isActive: boolean;
  initialHours: number;
  loggedHours: number;
  totalHours: number;
  cookCount: number;
  fuelLbsConsumed: number;
  avgBurnRateLbsHr: number;
  avgCookDurationHrs: number;
  avgRating: number;
  topProteinCut: string;
  proteinBreakdown: { [key: string]: number };
  maintenanceAlert: string;
  maintenanceStatus: 'Optimal' | 'Attention Needed' | 'Service Due';
  costPerHourEst: number;
  percentOfFleetHours: number;
}

const PALETTE = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#f43f5e'];

export const SmokerUnitProfileChart: React.FC<SmokerUnitProfileChartProps> = ({
  rigs = [],
  profile,
  activeRigId,
  cookLogs = [],
  fuelLogs = [],
  onUpdatePitBaseline,
  onSelectActiveRig,
  onOpenCustomSmokerModal,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [editingBaselineId, setEditingBaselineId] = useState<string | null>(null);
  const [baselineInputValue, setBaselineInputValue] = useState<string>('0');
  const [viewMode, setViewMode] = useState<'all' | 'matrix' | 'cards'>('all');
  const [comparativeMetric, setComparativeMetric] = useState<'burnRate' | 'cost' | 'rating' | 'duration'>('burnRate');

  // Consolidate Smoker Units (from rigs list + distinct smoker types in cook logs)
  const unitMetricsList = useMemo<SmokerUnitMetrics[]>(() => {
    // 1. Gather baseline rigs
    let rawRigs: SmokerProfile[] = [];
    if (rigs && rigs.length > 0) {
      rawRigs = [...rigs];
    } else if (profile) {
      rawRigs = [profile];
    }

    if (rawRigs.length === 0) {
      rawRigs = [
        {
          id: 'rig-default-1',
          name: 'Pit Boss Copperhead 5-Series',
          model: 'Copperhead 5',
          smokerType: 'Vertical Pellet Smoker',
          fuelType: 'Pellets',
          initialHours: 0,
          currentHours: 0,
          pelletHopperCapacityLbs: 55,
          maintenanceTasks: [],
        },
      ];
    }

    const activeId = activeRigId || profile?.id || rawRigs[0]?.id;

    // Check if cookLogs have smokerTypes/IDs not present in rawRigs
    const knownIds = new Set(rawRigs.map((r) => r.id));
    const knownNames = new Set(rawRigs.map((r) => (r.name || '').toLowerCase()));

    const extraRigUnits: SmokerProfile[] = [];
    cookLogs.forEach((c) => {
      if (c.smokerId && !knownIds.has(c.smokerId)) {
        const titleName = c.smokerType || 'Secondary Smoker Unit';
        if (!knownNames.has(titleName.toLowerCase())) {
          knownIds.add(c.smokerId);
          knownNames.add(titleName.toLowerCase());
          extraRigUnits.push({
            id: c.smokerId,
            name: titleName,
            model: c.smokerType || 'Smoker Rig',
            smokerType: c.smokerType || 'Pellet Smoker',
            fuelType: (c.fuelType as any) || 'Pellets',
            initialHours: c.startingSmokerHours || 0,
            currentHours: c.endingSmokerHours || 0,
            pelletHopperCapacityLbs: 0,
            maintenanceTasks: [],
          });
        }
      }
    });

    const allUnits = [...rawRigs, ...extraRigUnits];

    // Compute metrics per unit
    const totalFleetHoursAll = allUnits.reduce((acc, u) => {
      const uLogs = cookLogs.filter(
        (c) => c.smokerId === u.id || (allUnits.length === 1) || (c.smokerType && c.smokerType.toLowerCase() === u.smokerType.toLowerCase())
      );
      const loggedHrs = uLogs.reduce((sum, c) => sum + (c.hoursLogged || 0), 0);
      return acc + (u.initialHours || 0) + loggedHrs;
    }, 0) || 1;

    return allUnits.map((unit) => {
      const isActive = unit.id === activeId || (allUnits.length === 1);
      const isSingleUnitFleet = allUnits.length === 1;

      // Filter matching cook logs
      const unitLogs = cookLogs.filter((c) => {
        if (isSingleUnitFleet) return true;
        if (c.smokerId && c.smokerId === unit.id) return true;
        if (c.smokerType && unit.smokerType && c.smokerType.toLowerCase() === unit.smokerType.toLowerCase()) return true;
        if (c.smokerType && unit.name && c.smokerType.toLowerCase().includes(unit.name.toLowerCase())) return true;
        return false;
      });

      const cookCount = unitLogs.length;
      const loggedHours = unitLogs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
      const initialHours = unit.initialHours || 0;
      const totalHours = Number((initialHours + loggedHours).toFixed(2));
      const fuelLbsConsumed = Number(unitLogs.reduce((acc, c) => acc + (c.fuelLbsConsumed || 0), 0).toFixed(1));

      const avgBurnRateLbsHr = loggedHours > 0 ? Number((fuelLbsConsumed / loggedHours).toFixed(2)) : 0;
      const avgCookDurationHrs = cookCount > 0 ? Number((loggedHours / cookCount).toFixed(1)) : 0;

      // Avg Rating
      const ratingsArr = unitLogs.map((c) => c.ratings?.overall || 5);
      const avgRating = (cookCount > 0 && ratingsArr.length > 0) ? Number((ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length).toFixed(1)) : 0;

      // Top Protein & Protein breakdown
      const proteinMap: { [key: string]: number } = {};
      const cutMap: { [key: string]: number } = {};

      unitLogs.forEach((c) => {
        const pType = c.proteinType || 'Pork';
        proteinMap[pType] = (proteinMap[pType] || 0) + 1;
        const pCut = c.proteinCut || c.title || 'Barbecue';
        cutMap[pCut] = (cutMap[pCut] || 0) + 1;
      });

      let topProteinCut = cookCount > 0 ? 'Pork Shoulder / Brisket' : 'None logged';
      let maxCutCount = 0;
      Object.entries(cutMap).forEach(([cutName, count]) => {
        if (count > maxCutCount) {
          maxCutCount = count;
          topProteinCut = cutName;
        }
      });

      // Maintenance & Wear Analysis
      let maintenanceAlert = 'Grate & Chamber Cleaned. Optimal condition.';
      let maintenanceStatus: 'Optimal' | 'Attention Needed' | 'Service Due' = 'Optimal';

      if (totalHours > 250) {
        maintenanceAlert = 'Fire pot ash removal & auger tube inspection due.';
        maintenanceStatus = 'Service Due';
      } else if (totalHours > 100) {
        maintenanceAlert = 'Thermal RTD probe wipe-down & drip tray foil replacement recommended.';
        maintenanceStatus = 'Attention Needed';
      } else if (loggedHours > 40) {
        maintenanceAlert = 'Grease trap empty & hopper dust vacuum suggested.';
        maintenanceStatus = 'Attention Needed';
      }

      // Fuel cost estimation ($1.10/lb for pellets, $1.40 for LP gas, $0.80 for charcoal)
      const fuelLower = (unit.fuelType || '').toLowerCase();
      let costPerLb = 1.1;
      if (fuelLower.includes('gas') || fuelLower.includes('propane')) costPerLb = 1.4;
      if (fuelLower.includes('charcoal') || fuelLower.includes('lump')) costPerLb = 0.85;
      if (fuelLower.includes('wood') || fuelLower.includes('stick')) costPerLb = 0.65;

      const costPerHourEst = Number((avgBurnRateLbsHr * costPerLb).toFixed(2));
      const percentOfFleetHours = Number(((totalHours / totalFleetHoursAll) * 100).toFixed(1));

      return {
        id: unit.id,
        name: unit.name || 'Smoker Unit',
        model: unit.model || unit.smokerType || 'Pitmaster Smoker',
        smokerType: unit.smokerType || 'Pellet Smoker',
        fuelType: unit.fuelType || 'Wood Pellets',
        isActive,
        initialHours,
        loggedHours,
        totalHours,
        cookCount,
        fuelLbsConsumed,
        avgBurnRateLbsHr,
        avgCookDurationHrs,
        avgRating,
        topProteinCut,
        proteinBreakdown: proteinMap,
        maintenanceAlert,
        maintenanceStatus,
        costPerHourEst,
        percentOfFleetHours,
      };
    });
  }, [rigs, profile, activeRigId, cookLogs]);

  // Aggregate Fleet Totals
  const fleetTotals = useMemo(() => {
    const totalPits = unitMetricsList.length;
    const totalInitialHours = Number(unitMetricsList.reduce((acc, u) => acc + u.initialHours, 0).toFixed(2));
    const totalLoggedHours = Number(unitMetricsList.reduce((acc, u) => acc + u.loggedHours, 0).toFixed(2));
    const totalFleetHours = Number((totalInitialHours + totalLoggedHours).toFixed(2));
    const totalCooks = unitMetricsList.reduce((acc, u) => acc + u.cookCount, 0);
    const totalFuelLbs = Number(unitMetricsList.reduce((acc, u) => acc + u.fuelLbsConsumed, 0).toFixed(1));
    return { totalPits, totalInitialHours, totalLoggedHours, totalFleetHours, totalCooks, totalFuelLbs };
  }, [unitMetricsList]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    return unitMetricsList.map((unit) => ({
      name: unit.name.length > 18 ? `${unit.name.substring(0, 16)}...` : unit.name,
      fullName: unit.name,
      'Baseline Hours': unit.initialHours,
      'Logged Cook Hours': unit.loggedHours,
      'Total Operating Hours': unit.totalHours,
      'Fuel Consumed (lbs)': unit.fuelLbsConsumed,
      cooks: unit.cookCount,
    }));
  }, [unitMetricsList]);

  const pieChartData = useMemo(() => {
    return unitMetricsList.map((unit, idx) => ({
      name: unit.name,
      value: unit.totalHours,
      color: PALETTE[idx % PALETTE.length],
      percent: unit.percentOfFleetHours,
    }));
  }, [unitMetricsList]);

  const filteredUnits = useMemo(() => {
    if (selectedUnitId === 'all') return unitMetricsList;
    return unitMetricsList.filter((u) => u.id === selectedUnitId);
  }, [selectedUnitId, unitMetricsList]);

  // Leaderboard & Standout Highlights for Comparative Analysis
  const leaderboard = useMemo(() => {
    if (unitMetricsList.length === 0) return null;

    const sortedByBurn = [...unitMetricsList].sort((a, b) => a.avgBurnRateLbsHr - b.avgBurnRateLbsHr);
    const sortedByCost = [...unitMetricsList].sort((a, b) => a.costPerHourEst - b.costPerHourEst);
    const sortedByHours = [...unitMetricsList].sort((a, b) => b.totalHours - a.totalHours);
    const sortedByRating = [...unitMetricsList].sort((a, b) => b.avgRating - a.avgRating);

    return {
      mostEfficient: sortedByBurn[0],
      lowestCost: sortedByCost[0],
      fleetWorkhorse: sortedByHours[0],
      topRated: sortedByRating[0],
    };
  }, [unitMetricsList]);

  // Comparative Chart Data based on comparativeMetric
  const comparativeChartData = useMemo(() => {
    return unitMetricsList.map((unit, idx) => {
      let val = unit.avgBurnRateLbsHr;
      let unitLabel = 'lbs/hr';

      if (comparativeMetric === 'cost') {
        val = unit.costPerHourEst;
        unitLabel = '$/hr';
      } else if (comparativeMetric === 'rating') {
        val = unit.avgRating;
        unitLabel = '★ Rating';
      } else if (comparativeMetric === 'duration') {
        val = unit.avgCookDurationHrs;
        unitLabel = 'hrs/cook';
      }

      return {
        name: unit.name.length > 18 ? `${unit.name.substring(0, 16)}...` : unit.name,
        fullName: unit.name,
        val,
        unitLabel,
        fill: PALETTE[idx % PALETTE.length],
      };
    });
  }, [unitMetricsList, comparativeMetric]);

  const handleStartBaselineEdit = (unit: SmokerUnitMetrics) => {
    setEditingBaselineId(unit.id);
    setBaselineInputValue(unit.initialHours.toString());
  };

  const handleSaveBaselineEdit = (unitId: string) => {
    const val = parseFloat(baselineInputValue);
    if (!isNaN(val) && val >= 0 && onUpdatePitBaseline) {
      onUpdatePitBaseline(unitId, Number(val.toFixed(2)));
    }
    setEditingBaselineId(null);
  };

  return (
    <div className="bg-[#16161a] border border-[#262632] rounded-2xl p-4 sm:p-6 shadow-xl space-y-6 text-zinc-100 w-full overflow-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2a38] pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 rounded-xl text-orange-400">
            <BarChart3 className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Smoker Unit Profile & Runtime Analysis
              </h2>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold rounded-md">
                FLEET BREAKDOWN
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Cumulative operating hours, logged cooks, fuel telemetry, and performance analysis split by individual smoker unit.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenCustomSmokerModal && (
            <button
              type="button"
              onClick={onOpenCustomSmokerModal}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold bg-[#262632] hover:bg-[#323242] text-orange-400 border border-orange-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Flame className="w-4 h-4 mr-1.5 text-orange-400" />
              + Register New Smoker Rig
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1c1c24] border border-[#2c2c3a] p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Fleet Pits</span>
            <Layers className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {fleetTotals.totalPits} <span className="text-xs font-sans text-zinc-400 font-normal">Pits</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-1">Multi-Rig Registered Fleet</span>
        </div>

        <div className="bg-[#1c1c24] border border-[#2c2c3a] p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Fleet Cumulative Runtime</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-orange-400">
            {fleetTotals.totalFleetHours.toFixed(1)} <span className="text-xs font-sans text-zinc-400 font-normal">hrs</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">
            +{fleetTotals.totalLoggedHours.toFixed(1)}h logged • {fleetTotals.totalInitialHours.toFixed(1)}h baseline
          </div>
        </div>

        <div className="bg-[#1c1c24] border border-[#2c2c3a] p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Fleet Cooks</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            {fleetTotals.totalCooks} <span className="text-xs font-sans text-zinc-400 font-normal">Cooks</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-1">Across all smoker units</span>
        </div>

        <div className="bg-[#1c1c24] border border-[#2c2c3a] p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Fleet Fuel Consumed</span>
            <Zap className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-200">
            {fleetTotals.totalFuelLbs.toFixed(1)} <span className="text-xs font-sans text-zinc-400 font-normal">lbs</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-1">Pellets, charcoal & wood logs</span>
        </div>
      </div>

      {/* Visual Smoker Unit Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Main Bar Chart: Baseline vs Logged Cook Hours per Smoker Unit */}
        <div className="lg:col-span-2 bg-[#121216] border border-[#262632] p-4 sm:p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Smoker Unit Operating Hours Comparison
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Baseline vs Logged Hours</span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#282835" />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181822', borderColor: '#333344', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [`${val} hrs`, name]}
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px', color: '#ccc' }} />
                <Bar dataKey="Baseline Hours" stackId="hours" fill="#475569" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Logged Cook Hours" stackId="hours" fill="#f97316" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Share of Fleet Operating Hours */}
        <div className="bg-[#121216] border border-[#262632] p-4 sm:p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Fleet Runtime Share
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">% Share</span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#181822', borderColor: '#333344', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [`${val} hrs (${((Number(val) / fleetTotals.totalFleetHours) * 100).toFixed(1)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Donut Legend */}
          <div className="space-y-1.5 pt-2 border-t border-[#262632] text-xs font-mono max-h-28 overflow-y-auto">
            {pieChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-300 truncate text-[11px]">{item.name}</span>
                </div>
                <span className="text-zinc-400 font-bold text-[11px] shrink-0 ml-2">
                  {item.value.toFixed(1)}h ({item.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION: Fleet Head-to-Head Comparative Split Analysis */}
      <div className="bg-[#121218] border border-[#262636] rounded-2xl p-4 sm:p-5 space-y-5">
        
        {/* Section Header with View Modes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242434] pb-3">
          <div className="flex items-center space-x-2.5">
            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Fleet Head-to-Head Comparative Split Analysis</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  SIDE-BY-SIDE MATRIX
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Contrast fuel burn rates, hourly operating costs, cook durations, and quality ratings across all smoker units.
              </p>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[#181822] p-1 rounded-xl border border-[#2a2a3a] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                viewMode === 'all' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Views
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                viewMode === 'matrix' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Comparative Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pit Cards Only
            </button>
          </div>
        </div>

        {/* 1. Fleet Leaderboard / Performance Standouts */}
        {leaderboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Award 1: Most Efficient Pit */}
            <div className="bg-[#181824] border border-amber-500/30 p-3 rounded-xl flex items-start space-x-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">
                  Most Fuel Efficient Pit
                </span>
                <span className="text-xs font-bold text-white truncate block" title={leaderboard.mostEfficient.name}>
                  {leaderboard.mostEfficient.name}
                </span>
                <div className="text-[11px] text-amber-400 font-mono font-bold mt-0.5">
                  {leaderboard.mostEfficient.avgBurnRateLbsHr} lbs/hr <span className="text-[9px] text-zinc-400 font-normal">avg burn</span>
                </div>
              </div>
            </div>

            {/* Award 2: Lowest Operating Cost */}
            <div className="bg-[#181824] border border-emerald-500/30 p-3 rounded-xl flex items-start space-x-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">
                  Lowest Hourly Cost
                </span>
                <span className="text-xs font-bold text-white truncate block" title={leaderboard.lowestCost.name}>
                  {leaderboard.lowestCost.name}
                </span>
                <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                  ${leaderboard.lowestCost.costPerHourEst} / hr <span className="text-[9px] text-zinc-400 font-normal">est. fuel cost</span>
                </div>
              </div>
            </div>

            {/* Award 3: Fleet Workhorse */}
            <div className="bg-[#181824] border border-orange-500/30 p-3 rounded-xl flex items-start space-x-3">
              <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">
                  Fleet Workhorse Pit
                </span>
                <span className="text-xs font-bold text-white truncate block" title={leaderboard.fleetWorkhorse.name}>
                  {leaderboard.fleetWorkhorse.name}
                </span>
                <div className="text-[11px] text-orange-400 font-mono font-bold mt-0.5">
                  {leaderboard.fleetWorkhorse.totalHours.toFixed(1)} hrs <span className="text-[9px] text-zinc-400 font-normal">({leaderboard.fleetWorkhorse.percentOfFleetHours}% fleet)</span>
                </div>
              </div>
            </div>

            {/* Award 4: Top Quality Rating */}
            <div className="bg-[#181824] border border-purple-500/30 p-3 rounded-xl flex items-start space-x-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">
                  Top Cook Rating Pit
                </span>
                <span className="text-xs font-bold text-white truncate block" title={leaderboard.topRated.name}>
                  {leaderboard.topRated.name}
                </span>
                <div className="text-[11px] text-purple-300 font-mono font-bold mt-0.5">
                  ★ {leaderboard.topRated.avgRating} / 5.0 <span className="text-[9px] text-zinc-400 font-normal">({leaderboard.topRated.cookCount} cooks)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Interactive Metric Comparative Chart */}
        <div className="bg-[#181822] border border-[#2a2a3a] p-4 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-300 uppercase font-mono flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Comparative Metric Visualizer:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1 bg-[#101018] p-1 rounded-lg border border-[#282838]">
              {[
                { id: 'burnRate', label: 'Burn Rate (lbs/hr)' },
                { id: 'cost', label: 'Cost / Hour ($/hr)' },
                { id: 'rating', label: 'Avg Rating (1-5★)' },
                { id: 'duration', label: 'Avg Cook Session (hrs)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setComparativeMetric(m.id as any)}
                  className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded transition-all cursor-pointer ${
                    comparativeMetric === m.id
                      ? 'bg-amber-500 text-zinc-950 font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#282838" />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#14141e', borderColor: '#333348', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any, item: any) => [`${val} ${item.payload.unitLabel}`, item.payload.fullName]}
                />
                <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                  {comparativeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Side-by-Side Fleet Comparative Matrix Table */}
        {(viewMode === 'all' || viewMode === 'matrix') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase font-mono flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-amber-400" />
                <span>Side-by-Side Fleet Comparative Matrix</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {unitMetricsList.length} Unit(s) Evaluated
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#2a2a3a] bg-[#14141c]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1c1c28] border-b border-[#2a2a3a] text-zinc-400 font-mono text-[10px] uppercase">
                    <th className="p-3 font-bold">Smoker Unit</th>
                    <th className="p-3 font-bold">Category / Fuel</th>
                    <th className="p-3 font-bold text-right">Operating Hours</th>
                    <th className="p-3 font-bold text-right">Fleet Share</th>
                    <th className="p-3 font-bold text-right">Burn Rate</th>
                    <th className="p-3 font-bold text-right">Cost / Hour</th>
                    <th className="p-3 font-bold text-right">12h Cook Cost</th>
                    <th className="p-3 font-bold text-right">Avg Session</th>
                    <th className="p-3 font-bold text-center">Avg Rating</th>
                    <th className="p-3 font-bold text-center">Maintenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242432] font-mono">
                  {unitMetricsList.map((unit) => {
                    const est12hCost = (unit.costPerHourEst * 12).toFixed(2);
                    return (
                      <tr key={unit.id} className="hover:bg-[#1a1a24] transition-colors">
                        <td className="p-3 font-bold text-white font-sans">
                          <div className="flex items-center space-x-2">
                            <span className="truncate max-w-[150px]" title={unit.name}>{unit.name}</span>
                            {unit.isActive && (
                              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[8px] rounded font-mono shrink-0">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-300 font-sans">
                          <div className="text-[11px]">{unit.smokerType}</div>
                          <div className="text-[10px] text-amber-400 font-mono">{unit.fuelType}</div>
                        </td>
                        <td className="p-3 text-right text-orange-400 font-bold">
                          {unit.totalHours.toFixed(1)}h
                          <div className="text-[9px] text-zinc-400 font-normal">
                            {unit.initialHours.toFixed(0)}h baseline + {unit.loggedHours.toFixed(1)}h cook
                          </div>
                        </td>
                        <td className="p-3 text-right text-zinc-300 font-bold">
                          {unit.percentOfFleetHours}%
                        </td>
                        <td className="p-3 text-right text-amber-300 font-bold">
                          {unit.avgBurnRateLbsHr} lbs/hr
                        </td>
                        <td className="p-3 text-right text-emerald-400 font-bold">
                          ${unit.costPerHourEst}
                        </td>
                        <td className="p-3 text-right text-emerald-300">
                          ${est12hCost}
                        </td>
                        <td className="p-3 text-right text-zinc-200">
                          {unit.avgCookDurationHrs}h
                        </td>
                        <td className="p-3 text-center text-purple-300 font-bold">
                          ★ {unit.avgRating}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-full border inline-block ${
                              unit.maintenanceStatus === 'Optimal'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : unit.maintenanceStatus === 'Attention Needed'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}
                          >
                            {unit.maintenanceStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Filter / Unit Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#2a2a38]">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-zinc-300 uppercase font-mono">
            Analysis Breakdown Filter:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#101014] p-1 rounded-xl border border-[#2a2a38]">
          <button
            type="button"
            onClick={() => setSelectedUnitId('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedUnitId === 'all'
                ? 'bg-orange-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Smoker Units ({unitMetricsList.length})
          </button>
          {unitMetricsList.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => setSelectedUnitId(unit.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedUnitId === unit.id
                  ? 'bg-orange-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {unit.name}
            </button>
          ))}
        </div>
      </div>

      {/* Per-Smoker Unit Detailed Analysis Split Cards */}
      <div className="space-y-4 pt-2">
        {filteredUnits.map((unit) => {
          const isEditingThisBaseline = editingBaselineId === unit.id;

          return (
            <div
              key={unit.id}
              className={`bg-[#131318] border rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-4 ${
                unit.isActive
                  ? 'border-orange-500/50 bg-gradient-to-b from-[#181614] to-[#121216]'
                  : 'border-[#282836] hover:border-[#383848]'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262634] pb-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl ${unit.isActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-[#22222d] text-zinc-400'}`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-white">{unit.name}</h3>
                      {unit.isActive && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[9px] font-mono font-bold rounded-md">
                          ACTIVE PIT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5">
                      Model: <span className="text-zinc-200">{unit.model}</span> • Category: <span className="text-zinc-200">{unit.smokerType}</span> • Fuel: <span className="text-orange-300 font-bold">{unit.fuelType}</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  {!unit.isActive && onSelectActiveRig && (
                    <button
                      type="button"
                      onClick={() => onSelectActiveRig(unit.id)}
                      className="px-3 py-1.5 bg-[#22222e] hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-[#333344] hover:border-orange-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Make Active Pit
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartBaselineEdit(unit)}
                    className="px-3 py-1.5 bg-[#22222e] hover:bg-[#2c2c3c] text-orange-400 border border-[#333344] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edit Baseline</span>
                  </button>
                </div>
              </div>

              {/* Inline Edit Baseline Hours Modal/Panel */}
              {isEditingThisBaseline && (
                <div className="p-3.5 bg-[#1b1b24] border border-orange-500/40 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 uppercase font-mono">
                      Edit Initial Baseline Hours for {unit.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingBaselineId(null)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={baselineInputValue}
                      onChange={(e) => setBaselineInputValue(e.target.value)}
                      className="bg-[#0e0e12] border border-[#3a3a4c] text-orange-400 font-mono font-bold text-sm rounded-lg px-3 py-1.5 focus:outline-none w-36"
                    />
                    <span className="text-xs text-zinc-400 font-mono">hrs</span>
                    <button
                      type="button"
                      onClick={() => handleSaveBaselineEdit(unit.id)}
                      className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Save Baseline
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Updating initial baseline hours adjusts cumulative lifespan without overwriting logged cooks ({unit.loggedHours.toFixed(1)} hrs logged).
                  </p>
                </div>
              )}

              {/* Metrics Grid Split for this unit */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                
                {/* Metric 1: Hours Split */}
                <div className="bg-[#181820] border border-[#262634] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-mono block">
                    Operating Hours
                  </span>
                  <div className="text-lg font-extrabold font-mono text-orange-400">
                    {unit.totalHours.toFixed(1)} <span className="text-xs font-normal text-zinc-400">hrs total</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono space-y-0.5 pt-1 border-t border-[#262634]">
                    <div className="flex justify-between">
                      <span>Baseline:</span>
                      <span className="text-zinc-200 font-bold">{unit.initialHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Logged Cooks:</span>
                      <span className="text-emerald-400 font-bold">+{unit.loggedHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Cooks & Fuel Split */}
                <div className="bg-[#181820] border border-[#262634] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-mono block">
                    Cooks & Fuel Telemetry
                  </span>
                  <div className="text-lg font-extrabold font-mono text-amber-400">
                    {unit.cookCount} <span className="text-xs font-normal text-zinc-400">cooks</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono space-y-0.5 pt-1 border-t border-[#262634]">
                    <div className="flex justify-between">
                      <span>Fuel Consumed:</span>
                      <span className="text-zinc-200 font-bold">{unit.fuelLbsConsumed} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Burn Rate:</span>
                      <span className="text-amber-300 font-bold">{unit.avgBurnRateLbsHr} lbs/hr</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Protein Analysis Split */}
                <div className="bg-[#181820] border border-[#262634] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-mono block">
                    Favorite Protein & Cut
                  </span>
                  <div className="text-sm font-bold text-zinc-200 truncate" title={unit.topProteinCut}>
                    {unit.topProteinCut}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono space-y-0.5 pt-1 border-t border-[#262634]">
                    <div className="flex justify-between">
                      <span>Avg Session:</span>
                      <span className="text-zinc-200 font-bold">{unit.avgCookDurationHrs} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality Rating:</span>
                      <span className="text-orange-400 font-bold">★ {unit.avgRating} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Metric 4: Wear & Cost Split */}
                <div className="bg-[#181820] border border-[#262634] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-mono block">
                    Cost & Maintenance Status
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        unit.maintenanceStatus === 'Optimal'
                          ? 'bg-emerald-400'
                          : unit.maintenanceStatus === 'Attention Needed'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-zinc-200 font-mono">
                      {unit.maintenanceStatus}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono space-y-0.5 pt-1 border-t border-[#262634]">
                    <div className="flex justify-between">
                      <span>Est. Fuel Cost:</span>
                      <span className="text-emerald-400 font-bold">${unit.costPerHourEst}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fleet Share:</span>
                      <span className="text-orange-400 font-bold">{unit.percentOfFleetHours}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Unit Maintenance & Inspection Alert Banner */}
              <div className="p-2.5 bg-[#101015] border border-[#262632] rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 text-zinc-300">
                  <Wrench className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>
                    <strong className="text-white">Maintenance Advisory:</strong> {unit.maintenanceAlert}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 bg-[#1a1a24] px-2 py-0.5 rounded border border-[#2e2e3e]">
                  {unit.totalHours.toFixed(1)} Runtime Hrs
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
