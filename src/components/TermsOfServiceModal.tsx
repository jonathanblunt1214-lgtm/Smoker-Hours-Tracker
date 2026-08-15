import React from 'react';
import { Bell, Bluetooth, Camera, CheckCircle2, Cloud, Database, HardDrive, Lock, ShieldCheck, Sliders, UserRoundCheck, X } from 'lucide-react';
import { acceptCurrentTerms, TERMS_EFFECTIVE_DATE, TERMS_REVISION } from '../lib/terms';

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
  { icon: Bell, title: 'Notifications', body: 'Requested only when you enable alerts. Alerts remain off when permission is not granted.' },
  { icon: Cloud, title: 'Google Drive backup', body: 'Optional authorization for the SmokeStack backup file. Drive is not the authoritative account database.' },
];

const termSections = [
  {
    title: 'Service and accounts',
    items: [
      'SmokeStack provides cook logging, equipment and fuel records, planning, analytics, maintenance tools, optional account synchronization, optional backups, optional CharGPT assistance, and provenance-backed community smoker information as those features are actually available.',
      'Firebase Authentication establishes signed-in identity. You are responsible for protecting your account access and for activity performed through your authenticated session.',
      'Features labeled unavailable, preview, estimated, simulated, or pending review are not represented as completed or verified services.',
    ],
  },
  {
    title: 'Your data and the limited service permission',
    items: [
      'User data always belongs to the user. SmokeStack receives no ownership interest in your cook logs, equipment records, photos, recipes, notes, preferences, backups, or other account content.',
      'You give SmokeStack only the limited, non-exclusive technical permission needed to store, process, synchronize, display, export, and delete your data on your instructions and to provide features you choose. This permission ends when the data or account is deleted, subject only to a disclosed lawful retention requirement.',
      'SmokeStack does not sell user data or use private account data for third-party advertising. Optional sharing remains off unless you take the specific consent action for that contribution.',
    ],
  },
  {
    title: 'Storage, processing, export, and deletion',
    items: [
      'Signed-in UID-scoped Firestore records are authoritative account data. Signed-out records remain on that browser and are not described as cloud-synchronized.',
      'Firebase and Google Cloud process account data to provide authentication, storage, security, server features, and CharGPT requests. A CharGPT request may include the prompt and the cook, smoker, or preference context you choose to send.',
      'Google Drive is a separate, optional backup controlled through your Google authorization. Disconnecting SmokeStack does not delete a backup already stored in your Drive.',
      'You can download a JSON copy from Settings. Authenticated account deletion removes the Firebase account, UID-scoped Firestore data, account overlays, and identifiable community submissions. Local data is cleared on the deleting device; user-controlled Drive backups must be deleted in Drive.',
    ],
  },
  {
    title: 'CharGPT, community contributions, and provenance',
    items: [
      'CharGPT is optional informational cooking assistance. Its output can be incomplete or wrong, remains distinguishable from verified facts, and does not replace direct controls or authoritative records.',
      'Community Smoker Database contributions require an authenticated account and explicit consent for each submission. They enter pending review as user-entered information and do not become manufacturer facts merely because they were submitted.',
      'You keep ownership of a community submission and grant SmokeStack the limited permission to review, label, publish, and display it in the community pool until it is withdrawn or the associated account is deleted.',
      'Broader federated cook-data sharing is unavailable unless a future granular consent workflow is implemented and separately accepted.',
    ],
  },
  {
    title: 'Safety and acceptable use',
    items: [
      'Cooking guidance, timing, temperatures, forecasts, equipment suggestions, and AI output are informational. Verify food-safety requirements with current authoritative sources and use your own judgment around heat, fire, electricity, fuel, sharp tools, allergens, and perishable food.',
      'Do not misuse SmokeStack to break the law, compromise accounts or services, upload malicious material, violate another person’s rights, misrepresent unsafe or fabricated information as verified, or interfere with the service.',
      'You are responsible for content you enter and must have the rights and permissions needed to submit it.',
    ],
  },
  {
    title: 'Availability, third parties, and legal limits',
    items: [
      'SmokeStack may change, suspend, contain, or discontinue a feature for safety, security, maintenance, legal, or technical reasons. Constitutional truth, ownership, export, deletion, and migration protections continue to apply.',
      'Firebase, Google Cloud, Google Drive, Google AI, device platforms, manufacturer websites, and other external services have their own terms and availability. SmokeStack cannot control those services.',
      'To the extent permitted by law, SmokeStack is provided without a guarantee of uninterrupted or error-free operation and is not liable for indirect, incidental, special, consequential, or punitive losses. Nothing here excludes rights or liability that applicable law does not allow to be excluded.',
      'These terms do not impose arbitration, waive non-waivable consumer rights, or invent a jurisdiction not identified by the operator. Current support and legal contact information is the contact published in the official SmokeStack app-store listing or support page.',
    ],
  },
  {
    title: 'Changes and constitutional priority',
    items: [
      `These Terms are incorporated as Section 13 of SmokeStack App Constitution Revision ${TERMS_REVISION}. Sections 1–12 govern SmokeStack and remain unchanged; Section 13 states the user-facing service agreement.`,
      'A material change to data use, ownership, permissions, sharing, AI processing, or user rights requires a new revision and renewed acceptance before the changed practice begins.',
      'If these terms conflict with another SmokeStack statement, the stricter reviewed rule protecting user ownership, consent, privacy, truth, data integrity, safety, portability, and deletion governs.',
    ],
  },
];

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose, onAccept, accepted = false, onOpenSettingsGranular }) => {
  if (!isOpen) return null;

  const acceptTerms = () => {
    try {
      acceptCurrentTerms();
    } catch {
      // Acceptance remains session-visible without fabricating durable storage.
    }
    onAccept?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4" role="presentation">
      <section aria-labelledby="smokestack-terms-title" aria-describedby="smokestack-terms-summary" className="relative flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl sm:p-6" role="dialog" aria-modal="true">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-400"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
            <div>
              <h2 id="smokestack-terms-title" className="text-base font-bold text-white sm:text-lg">SmokeStack Terms of Service, Privacy & Constitution</h2>
              <p id="smokestack-terms-summary" className="mt-1 text-xs leading-relaxed text-zinc-400">Revision {TERMS_REVISION} · Effective {TERMS_EFFECTIVE_DATE}. Acceptance never grants an optional device or Google permission. <a href="/terms.html" target="_blank" rel="noreferrer" className="text-orange-300 underline">Public terms</a></p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close terms and privacy" className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" aria-hidden="true" /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1 text-sm text-zinc-300">
          <section className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4">
            <h3 className="flex items-center gap-2 font-bold text-emerald-300"><UserRoundCheck className="h-4 w-4" aria-hidden="true" />Your data always belongs to you</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-200">SmokeStack does not take ownership of user data. It receives only the limited technical permission required to provide the features you choose, and it must honor export, correction, deletion, consent, and portability controls.</p>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <h3 className="flex items-center gap-2 font-bold text-white"><Lock className="h-4 w-4 text-orange-400" aria-hidden="true" />Contextual permissions</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Each capability is optional and requested only when you invoke it.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {optionalCapabilities.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-lg border border-zinc-800 bg-[#181818] p-3">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-white"><Icon className="h-4 w-4 text-orange-400" aria-hidden="true" />{title}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-blue-500/25 bg-blue-950/15 p-4">
            <h3 className="flex items-center gap-2 font-bold text-blue-200"><Database className="h-4 w-4" aria-hidden="true" />Complete current terms</h3>
            <div className="mt-3 space-y-2">
              {termSections.map((section) => (
                <details key={section.title} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3" open={section.title === 'Your data and the limited service permission'}>
                  <summary className="cursor-pointer font-semibold text-white">{section.title}</summary>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-zinc-300">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-4">
            <h3 className="flex items-center gap-2 font-bold text-purple-200"><HardDrive className="h-4 w-4" aria-hidden="true" />Data controls</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">Export and authenticated account deletion are available in Settings. External deletion instructions are available at <a href="/account-deletion.html" target="_blank" rel="noreferrer" className="font-semibold text-orange-300 underline">/account-deletion.html</a>.</p>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse items-stretch justify-between gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center">
          {onOpenSettingsGranular ? <button type="button" onClick={() => { onClose(); onOpenSettingsGranular(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"><Sliders className="h-4 w-4" aria-hidden="true" />Review privacy settings</button> : <span />}
          <button type="button" onClick={acceptTerms} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-orange-600"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{accepted ? `Revision ${TERMS_REVISION} accepted` : `Accept Revision ${TERMS_REVISION}`}</button>
        </footer>
      </section>
    </div>
  );
};
