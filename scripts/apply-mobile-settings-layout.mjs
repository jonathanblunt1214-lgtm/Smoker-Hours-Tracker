import fs from 'node:fs';

const sourcePath = 'src/components/SettingsModal.tsx';
const outPath = 'src/components/SettingsModal.trusted.tsx';
const appPath = 'src/App.trusted.tsx';

let modal = fs.readFileSync(sourcePath, 'utf8');

modal = modal.replace(
  'className="flex min-h-[62px] items-center justify-between gap-4 border-b border-zinc-800/70 py-3 last:border-0"',
  'className="flex min-h-[62px] flex-col items-stretch justify-between gap-3 border-b border-zinc-800/70 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4"'
);
modal = modal.replace(
  '<div className="shrink-0">{control}</div>',
  '<div className="shrink-0 self-start sm:self-auto">{control}</div>'
);
modal = modal.replace(
  'className="mx-auto flex min-h-full max-w-5xl flex-col overflow-hidden bg-[#111] sm:min-h-0 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl md:flex-row"',
  'className="mx-auto flex min-h-full w-full max-w-5xl flex-col overflow-hidden bg-[#111] sm:min-h-0 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl md:flex-row"'
);
modal = modal.replace(
  'className="border-b border-zinc-800 bg-zinc-950/80 p-4 md:w-60 md:border-b-0 md:border-r"',
  'className="min-w-0 w-full max-w-full border-b border-zinc-800 bg-zinc-950/80 p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r"'
);
modal = modal.replace(
  'className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible"',
  'className="flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 md:block md:space-y-1 md:overflow-visible"'
);
modal = modal.replace(
  '<section className="min-w-0 flex-1">',
  '<section className="min-w-0 w-full flex-1 overflow-x-hidden">'
);
modal = modal.replace(
  'className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-[#111]/95 px-5 py-4 backdrop-blur"',
  'className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 bg-[#111]/95 px-4 py-4 backdrop-blur sm:px-5"'
);
modal = modal.replace(
  '<div><h2 className="text-lg font-semibold text-white">{navItems.find((x) => x.id === tab)?.label}</h2><p className="mt-0.5 text-xs text-zinc-500">Production settings use real account and integration state.</p></div>',
  '<div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold text-white">{navItems.find((x) => x.id === tab)?.label}</h2><p className="mt-0.5 text-xs leading-5 text-zinc-500">Production settings use real account and integration state.</p></div>'
);
modal = modal.replace(
  '<div className="space-y-5 p-5 sm:p-6">',
  '<div className="min-w-0 space-y-5 p-4 sm:p-6">'
);

if (!modal.includes('overscroll-x-contain')) throw new Error('[mobile-settings] horizontal tab containment missing');
if (!modal.includes('sm:flex-row sm:items-center')) throw new Error('[mobile-settings] responsive settings rows missing');
fs.writeFileSync(outPath, modal, 'utf8');

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace("from './components/SettingsModal'", "from './components/SettingsModal.trusted'");
if (!app.includes("from './components/SettingsModal.trusted'")) throw new Error('[mobile-settings] trusted Settings import missing');
fs.writeFileSync(appPath, app, 'utf8');
console.log('[mobile-settings] Settings navigation and rows constrained for phone-width layouts.');
