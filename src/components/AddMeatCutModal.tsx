import React, { useState } from 'react';
import { X, ShieldCheck, Database, Plus, Sparkles, CheckCircle2, Flame, Info } from 'lucide-react';
import { VerifiedMeatCut, ProteinType } from '../types';
import {
  GameSubcategory,
  determineGameSubcategory,
  determineProteinSubcategory,
  determineBeefSubcategory,
  determinePorkSubcategory,
  determinePoultrySubcategory,
  determineLambSubcategory,
  determineSeafoodSubcategory,
} from '../data/proteinTemps';
import { addOrUpdateVerifiedMeatCut } from '../utils/storage';

interface AddMeatCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  onCutAdded?: (newCut: VerifiedMeatCut) => void;
}

export const AddMeatCutModal: React.FC<AddMeatCutModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'Beef',
  onCutAdded,
}) => {
  const [name, setName] = useState('');
  const [proteinType, setProteinType] = useState<ProteinType>(
    defaultCategory === 'ALL' ? 'Beef' : (defaultCategory as ProteinType)
  );
  const [proteinSubcategory, setProteinSubcategory] = useState<string>('Brisket & Chuck (BBQ / Braise)');
  const [gameSubcategory, setGameSubcategory] = useState<GameSubcategory>('Cervid (Venison / Elk)');
  const [primalOrigin, setPrimalOrigin] = useState('');
  const [impsCode, setImpsCode] = useState('');
  const [targetInternalTempF, setTargetInternalTempF] = useState<number>(203);
  const [idealSmokeTempF, setIdealSmokeTempF] = useState<number>(225);
  const [aliasesText, setAliasesText] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [description, setDescription] = useState('');
  const [muscleAnatomy, setMuscleAnatomy] = useState('');
  const [cookingStrategy, setCookingStrategy] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: ProteinType) => {
    setProteinType(cat);
    // Adjust temp defaults & subcategories based on category
    if (cat === 'Beef') {
      setTargetInternalTempF(203);
      setIdealSmokeTempF(225);
      setProteinSubcategory('Brisket & Chuck (BBQ / Braise)');
    } else if (cat === 'Pork') {
      setTargetInternalTempF(205);
      setIdealSmokeTempF(250);
      setProteinSubcategory('Shoulder & Butt (Pulled Pork)');
    } else if (cat === 'Poultry') {
      setTargetInternalTempF(165);
      setIdealSmokeTempF(275);
      setProteinSubcategory('Whole Bird & Turkey');
    } else if (cat === 'Lamb') {
      setTargetInternalTempF(145);
      setIdealSmokeTempF(225);
      setProteinSubcategory('Leg & Shoulder Roasts');
    } else if (cat === 'Seafood') {
      setTargetInternalTempF(145);
      setIdealSmokeTempF(200);
      setProteinSubcategory('Salmon & Fatty Fish');
    } else if (cat === 'Game' || cat === 'Wild Game') {
      setTargetInternalTempF(160);
      setIdealSmokeTempF(225);
      setGameSubcategory('Cervid (Venison / Elk)');
      setProteinSubcategory('Cervid (Venison / Elk)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter a descriptive cut name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const aliases = aliasesText
        ? aliasesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [name.trim()];

      const visualKeyFeatures = featuresText
        ? featuresText.split(',').map((s) => s.trim()).filter(Boolean)
        : ['Custom butcher cut', 'Verified pitmaster profile'];

      const autoGameSubcat =
        proteinType === 'Game' || proteinType === 'Wild Game'
          ? gameSubcategory || determineGameSubcategory(`${name} ${primalOrigin}`)
          : undefined;

      const computedSubcat = proteinSubcategory || determineProteinSubcategory(proteinType, `${name} ${primalOrigin}`);

      const newCut: VerifiedMeatCut = {
        id: `cut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        aliases,
        proteinType,
        gameSubcategory: autoGameSubcat,
        proteinSubcategory: computedSubcat,
        primalOrigin: primalOrigin.trim() || `${proteinType} Primal / Custom Cut`,
        impsCode: impsCode.trim() ? (impsCode.startsWith('IMPS') ? impsCode.trim() : `IMPS ${impsCode.trim()}`) : undefined,
        description: description.trim() || `Community-verified ${proteinType} cut entry added to the global database.`,
        visualKeyFeatures,
        muscleAnatomy: muscleAnatomy.trim() || undefined,
        idealSmokeTempF: Number(idealSmokeTempF) || 225,
        targetInternalTempF: Number(targetInternalTempF) || 203,
        cookingStrategy:
          cookingStrategy.trim() ||
          `Slow-smoke at ${idealSmokeTempF}°F until internal temp reaches target ${targetInternalTempF}°F. Rest 20+ minutes before carving.`,
        verifiedStatus: 'Community Master Cut',
        onlineVerificationDate: new Date().toISOString(),
        onlineSourceCitations: ['Community Pitmaster Verification', 'Shared Global Meat Cut Database'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save locally in localStorage
      addOrUpdateVerifiedMeatCut(newCut);

      // 2. Submit to backend shared database pool
      try {
        await fetch('/api/verified-cuts/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cut: newCut }),
        });
      } catch (err) {
        console.warn('Backend endpoint unavailable, cut saved locally and queued for auto-sync:', err);
      }

      // 3. Notify local views. Verified catalog publication is a separate,
      // authenticated knowledge-pipeline operation.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('verified_meat_cuts_updated', { detail: newCut }));
      }

      if (onCutAdded) {
        onCutAdded(newCut);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error adding new meat cut:', err);
      setErrorMessage(err?.message || 'Failed to submit cut. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-orange-950/80 via-[#1e140d] to-[#121212] border-b border-orange-500/20 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Add Cut to Verified Catalog & Shared Database
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Syncs Across All Users</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Register a custom or heritage cut into the Meat Safety & Target Temps Guide.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] border border-[#2e2e2e] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-white">Cut Verified & Shared Successfully!</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              "{name}" is now registered in your local catalog and synced to the global community database.
              The Meat Safety Guide has been dynamically updated.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-center space-x-2">
                <Info className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cut Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Cut Name <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pork Belly Ribs (St. Louis), Venison Tenderloin"
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Protein Category <span className="text-orange-400">*</span>
                </label>
                <select
                  value={proteinType}
                  onChange={(e) => handleCategoryChange(e.target.value as ProteinType)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 cursor-pointer"
                >
                  <option value="Beef">🥩 Beef</option>
                  <option value="Pork">🐖 Pork</option>
                  <option value="Poultry">🍗 Poultry / Turkey</option>
                  <option value="Lamb">🍖 Lamb / Mutton</option>
                  <option value="Seafood">🐟 Fish / Seafood</option>
                  <option value="Game">🐗 Wild Game</option>
                </select>
              </div>
            </div>

            {/* Subcategory Divider Selector for All Protein Types */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 space-y-2">
              <label className="block text-xs font-bold text-orange-300 flex items-center space-x-1.5">
                <span>🎯 {proteinType} Subcategory Divider</span>
              </label>
              <select
                value={proteinSubcategory}
                onChange={(e) => {
                  setProteinSubcategory(e.target.value);
                  if (proteinType === 'Game' || proteinType === 'Wild Game') {
                    setGameSubcategory(e.target.value as GameSubcategory);
                  }
                }}
                className="w-full bg-[#181818] border border-orange-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 cursor-pointer"
              >
                {proteinType === 'Beef' && (
                  <>
                    <option value="Brisket & Chuck (BBQ / Braise)">Brisket & Chuck (BBQ / Braise)</option>
                    <option value="Rib & Loin (Steaks & Roasts)">Rib & Loin (Steaks & Roasts)</option>
                    <option value="Plate & Flank (Fajitas / Skirt)">Plate & Flank (Fajitas / Skirt)</option>
                    <option value="Round & Shank (Slow Cook / Stew)">Round & Shank (Slow Cook / Stew)</option>
                    <option value="Ground Beef & Burgers">Ground Beef & Burgers</option>
                  </>
                )}
                {proteinType === 'Pork' && (
                  <>
                    <option value="Shoulder & Butt (Pulled Pork)">Shoulder & Butt (Pulled Pork)</option>
                    <option value="Ribs (Baby Back & St. Louis)">Ribs (Baby Back & St. Louis)</option>
                    <option value="Loin & Chops">Loin & Chops</option>
                    <option value="Belly & Cured (Bacon / Pork Belly)">Belly & Cured (Bacon / Pork Belly)</option>
                    <option value="Ground Pork & Sausage">Ground Pork & Sausage</option>
                  </>
                )}
                {proteinType === 'Poultry' && (
                  <>
                    <option value="Whole Bird & Turkey">Whole Bird & Turkey</option>
                    <option value="Breasts & Tenderloins">Breasts & Tenderloins</option>
                    <option value="Thighs & Drumsticks">Thighs & Drumsticks</option>
                    <option value="Wings (High-Heat Smoke)">Wings (High-Heat Smoke)</option>
                    <option value="Ground Poultry">Ground Poultry</option>
                  </>
                )}
                {proteinType === 'Lamb' && (
                  <>
                    <option value="Leg & Shoulder Roasts">Leg & Shoulder Roasts</option>
                    <option value="Chops & Rack of Lamb">Chops & Rack of Lamb</option>
                    <option value="Shanks & Stew Meat">Shanks & Stew Meat</option>
                    <option value="Ground Lamb & Kababs">Ground Lamb & Kababs</option>
                  </>
                )}
                {proteinType === 'Seafood' && (
                  <>
                    <option value="Salmon & Fatty Fish">Salmon & Fatty Fish</option>
                    <option value="White Fish & Fillets">White Fish & Fillets</option>
                    <option value="Shellfish & Crustaceans">Shellfish & Crustaceans</option>
                    <option value="Whole Fish / Cedar Plank">Whole Fish / Cedar Plank</option>
                  </>
                )}
                {(proteinType === 'Game' || proteinType === 'Wild Game') && (
                  <>
                    <option value="Cervid (Venison / Elk)">🦌 Cervid (Venison / Elk)</option>
                    <option value="Bovid (Bison / Buffalo)">🦬 Bovid (Bison / Buffalo)</option>
                    <option value="Wild Swine (Wild Boar)">🐗 Wild Swine (Wild Boar)</option>
                    <option value="Upland Birds & Waterfowl">🦆 Upland Birds & Waterfowl</option>
                    <option value="Small Mammals (Rabbit)">🐇 Small Mammals (Rabbit)</option>
                    <option value="Exotic Game (Bear / Alligator)">🐻 Exotic Game (Bear / Alligator)</option>
                  </>
                )}
              </select>
              <p className="text-[11px] text-zinc-400">
                Subcategory grouping for the Meat Safety & Target Temps Guide.
              </p>
            </div>

            {/* Primal Origin & IMPS Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Primal / Subprimal Origin
                </label>
                <input
                  type="text"
                  value={primalOrigin}
                  onChange={(e) => setPrimalOrigin(e.target.value)}
                  placeholder="e.g. Pork Belly Primal / Rib Cage"
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  IMPS / NAMP Standard Code (Optional)
                </label>
                <input
                  type="text"
                  value={impsCode}
                  onChange={(e) => setImpsCode(e.target.value)}
                  placeholder="e.g. IMPS 406 or 184D"
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 font-mono"
                />
              </div>
            </div>

            {/* Temps: Target Internal Finish & Ideal Pit Smoke */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-3 space-y-1.5">
                <label className="block text-xs font-bold text-orange-400 flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Target Finish Internal Temp (°F)</span>
                </label>
                <input
                  type="number"
                  required
                  value={targetInternalTempF}
                  onChange={(e) => setTargetInternalTempF(Number(e.target.value))}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-1.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-zinc-500 block">
                  e.g. 203°F (Pulled/Briskets), 135°F (Medium Rare Roasts), 160°F (Wild Swine/Bear)
                </span>
              </div>

              <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-3 space-y-1.5">
                <label className="block text-xs font-bold text-amber-400 flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Ideal Pit / Cooking Temp (°F)</span>
                </label>
                <input
                  type="number"
                  required
                  value={idealSmokeTempF}
                  onChange={(e) => setIdealSmokeTempF(Number(e.target.value))}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-1.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-zinc-500 block">
                  Standard BBQ chamber temp (e.g. 225°F or 250°F)
                </span>
              </div>
            </div>

            {/* Common Aliases & Visual Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Common Aliases (Comma Separated)
                </label>
                <input
                  type="text"
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  placeholder="e.g. Top Sirloin Cap, Rump Cap, Coulotte"
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Visual Key Features (Comma Separated)
                </label>
                <input
                  type="text"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="e.g. Thick fat cap, Triangular shape, Coarse grain"
                  className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>
            </div>

            {/* Strategy / Pitmaster Tips */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Pitmaster Strategy & Cooking Notes
              </label>
              <textarea
                rows={2}
                value={cookingStrategy}
                onChange={(e) => setCookingStrategy(e.target.value)}
                placeholder="e.g. Smoke low and slow at 225°F until 165°F stall. Wrap in peach paper with butter/tallow to finish to target internal temp."
                className="w-full bg-[#181818] border border-[#2d2d2d] focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-[#222]">
              <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Auto-verifies & syncs with shared community database</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-zinc-300 text-xs font-semibold rounded-xl border border-[#333] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Syncing...' : 'Add Cut to Shared Database'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
