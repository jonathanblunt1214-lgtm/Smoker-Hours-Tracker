import React from 'react';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import {
  ShieldCheck,
  Lock,
  Cloud,
  Brain,
  Database,
  X,
  FileText,
  CheckCircle2,
  EyeOff,
  Camera,
  Bluetooth,
  Bell,
  HardDrive,
  Globe,
  Sliders,
  Check,
  ToggleRight,
  ChevronRight,
  Flame,
  Thermometer,
  Scale,
  Sparkles,
} from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  accepted?: boolean;
  onOpenSettingsGranular?: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  accepted = false,
  onOpenSettingsGranular,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in">
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl w-full max-w-[96vw] sm:max-w-[92vw] lg:max-w-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Terms of Service, Permissions & Privacy Disclosure</span>
              </h2>
              <p className="text-xs text-zinc-400">Required app permissions & complete list of shared data parameters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-[#242424] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 text-xs sm:text-sm text-zinc-300">
          {/* Quick Summary Banner */}
          <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1e1e] to-purple-950/30 border border-orange-500/30 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-orange-400 font-bold">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Key Principles & Data Privacy Guarantees</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 font-medium list-disc list-inside">
              <li><strong className="text-white">Local-First Storage:</strong> All cook logs, custom smoker specs, and fuel inventories are stored locally on your device by default.</li>
              <li><strong className="text-white">Google Drive Cloud Sync:</strong> Strictly limited to managing a single backup file (<code className="text-orange-400">pitmaster_smoker_data.json</code>) in your personal Google Drive.</li>
              <li><strong className="text-white">Granular Control:</strong> You can individually turn OFF sharing for every single data parameter in Settings under <strong className="text-orange-300">Data & Backups &gt; AI Federated & Privacy</strong>.</li>
              <li><strong className="text-white">Zero Data Selling:</strong> Your personal credentials, emails, and exact locations are never sold or shared with advertisers.</li>
            </ul>
          </div>

          {/* SECTION 1: REQUIRED APPLICATION PERMISSIONS */}
          <div className="bg-[#121212] border border-[#2a2a2a] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#222] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                <Lock className="w-4 h-4 text-orange-400 shrink-0" />
                <span>1. Required Application Device & API Permissions</span>
              </h3>
              <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono px-2 py-0.5 rounded">
                6 Essential Permissions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Permission 1 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <Camera className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>1. Camera & Image Capture</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required to scan unknown meat cuts with {AI_PITMASTER_NAME}, analyze scale mass photos, and attach cook logs pictures.
                </p>
              </div>

              {/* Permission 2 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <Bluetooth className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>2. WebBluetooth Wireless Probes</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required to connect wirelessly to MEATER, ThermoWorks, and Bluetooth smoker controllers for live temperature telemetry.
                </p>
              </div>

              {/* Permission 3 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>3. Web Push & Audio Chimes</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required to sound pit alarm chimes, notify on target internal temperature reach, low hopper warnings, and timer alarms.
                </p>
              </div>

              {/* Permission 4 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>4. Local Storage & Cache Access</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required to save your cook logbook, custom smoker specs, fuel logs, and offline CharGPT memory in browser local storage.
                </p>
              </div>

              {/* Permission 5 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>5. Google OAuth & Drive File Access</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required when Cloud Sync is enabled. Strictly scoped to manage <code className="text-sky-300">pitmaster_smoker_data.json</code> in your personal Drive.
                </p>
              </div>

              {/* Permission 6 */}
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white text-xs">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>6. Network & Grounded Search API</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Required for live Gemini search grounding, online USDA/NAMP meat cut catalog verification, and AI Federated contributions.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: LIST OF ALL DATA PARAMETERS SHARED & GRANULAR TOGGLE CONTROLS */}
          <div className="bg-[#121212] border border-[#2a2a2a] p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#222] pb-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>2. List of Shared Data Parameters & Individual Toggles</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When opted into the AI Federated Pool or Cloud Sync, the following 9 data parameters can be shared. You have the ability to turn off sharing for each parameter individually!
                </p>
              </div>

              {onOpenSettingsGranular && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettingsGranular();
                  }}
                  className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shrink-0 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Configure Individual Toggles</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">1. Meat Cuts & Protein Type</div>
                  <div className="text-[10px] text-zinc-400">Beef, Pork Butt, Chicken, Primal cut names</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">2. Meat Weight & Mass Specs</div>
                  <div className="text-[10px] text-zinc-400">Weight in lbs/kg, bone-in/boneless profile</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">3. Smoker Specs & Custom Mods</div>
                  <div className="text-[10px] text-zinc-400">Smoker model category, gauge & mods</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">4. Fuel & Wood Blends</div>
                  <div className="text-[10px] text-zinc-400">Wood species/blend, pellet burn rates</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">5. Thermal Cooking Curves</div>
                  <div className="text-[10px] text-zinc-400">Pit temperatures, probe logs & stall hours</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">6. Flavor Scores & Ratings</div>
                  <div className="text-[10px] text-zinc-400">Smoke ring, bark rating, tenderness, overall score</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">7. Weather & Ambient Zipcode</div>
                  <div className="text-[10px] text-zinc-400">Ambient temp, humidity & general zipcode</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">8. Custom Rub Recipes & Notes</div>
                  <div className="text-[10px] text-zinc-400">Seasonings, mop sauces & cook notes</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-[11px]">9. Meat & Cook Photos</div>
                  <div className="text-[10px] text-zinc-400">Meat scan photos & finished bark photos</div>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-purple-500/20 text-xs text-purple-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Automatic Identity Anonymization:</strong> Personal names, email addresses, and exact addresses are ALWAYS scrubbed before any data is pooled.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: YOUR RIGHTS & REVOCATION */}
          <div className="bg-[#121212] border border-[#2a2a2a] p-3.5 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>3. Data Ownership & One-Click Revocation</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You retain 100% ownership of all your data. You may export your entire history as JSON anytime or trigger one-click consent revocation to purge all server pool contributions under <strong className="text-white">Settings &gt; Data & Backups &gt; AI Federated & Privacy</strong>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#2a2a2a] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Updated August 2026 • Compliant with Google API Services User Data Policy</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('pitmaster_terms_accepted', 'true');
                } catch (e) {}
                if (onAccept) onAccept();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{accepted ? 'Agreed & Accepted' : 'I Agree to Terms & Permissions'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

