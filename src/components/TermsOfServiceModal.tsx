import React from 'react';
import { Bell, Bluetooth, Camera, CheckCircle2, Cloud, Database, HardDrive, Lock, ShieldCheck, Sliders, X } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  accepted?: boolean;
  onOpenSettingsGranular?: () => void;
}

const optionalCapabilities = [
  { icon: Camera, title: 'Camera and photos', body: 'Requested only when you take or attach a cook photo or scan a log.' },
  { icon: Bluetooth, title: 'Bluetooth devices', body: 'Requested only when you start a supported device connection. Selecting equipment does not claim a connection.' },
  { icon: Bell, title: 'Notifications', body: 'Requested only when you enable browser alerts. Alerts remain off when permission is not granted.' },
  { icon: Cloud, title: 'Google Drive backup', body: 'Optional authorization for one backup file. Drive is not the authoritative SmokeStack account database.' },
];

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  accepted = false,
  onOpenSettingsGranular,
}) => {
  if (!isOpen) return null;

  const acceptTerms = () => {
    try {
      localStorage.setItem('pitmaster_terms_accepted', 'true');
    } catch {
      // The app can continue without durable browser storage; no success is fabricated.
    }
    onAccept?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4" role="presentation">
      <section
        aria-labelledby="smokestack-terms-title"
        aria-describedby="smokestack-terms-summary"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="smokestack-terms-title" className="text-base font-bold text-white sm:text-lg">SmokeStack Terms and Privacy</h2>
              <p id="smokestack-terms-summary" className="mt-1 text-xs leading-relaxed text-zinc-400">
                Accepting these terms does not grant camera, Bluetooth, notification, or Google Drive permission.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terms and privacy"
            className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1 text-sm text-zinc-300">
          <section className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4">
            <h3 className="flex items-center gap-2 font-bold text-emerald-300"><Database className="h-4 w-4" aria-hidden="true" />Where your records live</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-zinc-300">
              <li>When signed in, UID-scoped Firestore records are the authoritative account data.</li>
              <li>When signed out, records and drafts remain on this browser and do not claim cloud synchronization.</li>
              <li>Local caches support offline use but must not silently replace newer account records.</li>
              <li>Google Drive is an optional, separately authorized backup with read-back verification.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <h3 className="flex items-center gap-2 font-bold text-white"><Lock className="h-4 w-4 text-orange-400" aria-hidden="true" />Contextual permissions</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">These capabilities are optional. SmokeStack asks for each permission only when you invoke that feature.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {optionalCapabilities.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-lg border border-zinc-800 bg-[#181818] p-3">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-white"><Icon className="h-4 w-4 text-orange-400" aria-hidden="true" />{title}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-4">
            <h3 className="flex items-center gap-2 font-bold text-purple-200"><HardDrive className="h-4 w-4" aria-hidden="true" />CharGPT and data use</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-zinc-300">
              <li>CharGPT can use account records only after verified retrieval and must identify uncertainty and provenance.</li>
              <li>AI suggestions do not become account facts or durable rules until you explicitly save them.</li>
              <li>Community or federated data contribution is unavailable in this release.</li>
              <li>CharGPT cannot modify application code, publish releases, or grant administrator access.</li>
            </ul>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse items-stretch justify-between gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center">
          {onOpenSettingsGranular ? (
            <button
              type="button"
              onClick={() => { onClose(); onOpenSettingsGranular(); }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              <Sliders className="h-4 w-4" aria-hidden="true" />Review privacy settings
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={acceptTerms}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-orange-600"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{accepted ? 'Terms accepted' : 'Accept terms'}
          </button>
        </footer>
      </section>
    </div>
  );
};
