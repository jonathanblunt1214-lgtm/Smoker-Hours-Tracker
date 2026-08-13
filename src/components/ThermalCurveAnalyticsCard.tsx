import React from 'react';
import { ThermalCurveAnalytics, CookLog } from '../types';
import { calculateThermalCurveAnalytics } from '../utils/thermalCurveCalculator';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Flame, TrendingUp, ShieldCheck, Clock, Zap, Sparkles, Award, Lock } from 'lucide-react';

interface ThermalCurveAnalyticsCardProps {
  cook: CookLog | null;
  analytics?: ThermalCurveAnalytics;
  title?: string;
  isPublished?: boolean;
}

export const ThermalCurveAnalyticsCard: React.FC<ThermalCurveAnalyticsCardProps> = ({
  cook,
  analytics: providedAnalytics,
  title = 'Thermal Curve Analytics & Telemetry',
  isPublished = false,
}) => {
  if (!cook) return null;

  const analytics =
    providedAnalytics ||
    cook.thermalCurveAnalytics ||
    calculateThermalCurveAnalytics(cook.temperatureReadings || [], cook.hoursLogged || 1);

  const chartData = analytics.curveDataPoints || [];

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl space-y-5">
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-white">{title}</h3>
              {isPublished && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Published & Archived</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Saved thermal rise curves, pit stability variance, and internal core progression.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-400 bg-[#1a1a1a] border border-[#2e2e2e] px-3 py-1.5 rounded-xl self-start sm:self-auto">
          Duration: <span className="text-amber-400 font-bold">{analytics.totalCookDurationMinutes} mins</span> ({cook.hoursLogged.toFixed(1)} hrs)
        </div>
      </div>

      {/* METRIC TILES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Starting Core Temp */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Starting Meat
          </span>
          <span className="text-lg font-black font-mono text-cyan-400">
            {analytics.startingMeatTempF}°F
          </span>
          <span className="text-[10px] text-zinc-500 block">Cold Start Internal</span>
        </div>

        {/* Peak Core Temp */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Peak Internal
          </span>
          <span className="text-lg font-black font-mono text-red-400">
            {analytics.peakMeatTempF}°F
          </span>
          <span className="text-[10px] text-zinc-500 block">Final Core Temp</span>
        </div>

        {/* Avg Pit Temp */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Avg Pit Temp
          </span>
          <span className="text-lg font-black font-mono text-amber-400">
            {analytics.avgPitTempF}°F
          </span>
          <span className="text-[10px] text-zinc-500 block">Range: {analytics.minPitTempF}°F-{analytics.maxPitTempF}°F</span>
        </div>

        {/* Rate of Rise */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Heat Rise Rate
          </span>
          <span className="text-lg font-black font-mono text-orange-400">
            +{analytics.tempRiseRateFPerHr}°F/hr
          </span>
          <span className="text-[10px] text-zinc-500 block">Internal Heat Gain</span>
        </div>

        {/* Thermal Stall */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Thermal Stall
          </span>
          <span className="text-sm font-black font-mono text-purple-300 truncate block">
            {analytics.stallDetected ? analytics.stallRangeF || 'Detected' : 'No Stall'}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            {analytics.stallDurationMinutes ? `Duration: ${analytics.stallDurationMinutes}m` : 'Clean Heat Curve'}
          </span>
        </div>

        {/* Pit Stability */}
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Pit Stability
          </span>
          <span className="text-sm font-black font-mono text-emerald-400 truncate block">
            ±{analytics.thermalStabilityVarianceF}°F
          </span>
          <span className="text-[10px] text-emerald-400/80 font-bold block truncate">
            {analytics.thermalStabilityRating.split(' ')[0]} Rating
          </span>
        </div>
      </div>

      {/* RECHARTS THERMAL CURVE GRAPH */}
      {chartData.length > 0 ? (
        <div className="bg-[#181818] border border-[#282828] p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span className="flex items-center space-x-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Thermal Curve Progression Chart</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Meat Core (Red) vs Pit Actual (Orange) vs Target Line (Amber)
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 'dataMax + 20']} unit="°F" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#3a3a3a',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={225} stroke="#eab308" strokeDasharray="5 5" label={{ value: 'Target 225°F', fill: '#eab308', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="meatTemp"
                  name="Meat Internal °F"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="pitTemp"
                  name="Pit Actual °F"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f97316' }}
                />
                <Line
                  type="monotone"
                  dataKey="targetTemp"
                  name="Target Pit °F"
                  stroke="#eab308"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-[#181818] border border-[#282828] rounded-xl text-center text-zinc-500 text-xs">
          No temperature readings logged yet to plot thermal curves.
        </div>
      )}

      {/* SUMMARY INSIGHTS FOOTER */}
      <div className="bg-orange-500/5 border border-orange-500/20 p-3.5 rounded-xl flex items-start space-x-3 text-xs text-orange-200">
        <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-white block mb-0.5">Thermal Curve Intelligence Summary</span>
          <p className="text-zinc-300">
            This cook logged a peak internal temperature of <strong className="text-red-300">{analytics.peakMeatTempF}°F</strong> with an average pit holding temperature of <strong className="text-amber-300">{analytics.avgPitTempF}°F</strong>. Pit thermal control achieved <strong className="text-emerald-300">{analytics.thermalStabilityRating}</strong> across {analytics.totalCookDurationMinutes} total minutes.
          </p>
        </div>
      </div>
    </div>
  );
};
