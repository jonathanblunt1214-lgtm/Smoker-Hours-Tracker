import fs from 'node:fs';

const target = 'src/App.trusted.tsx';
let source = fs.readFileSync(target, 'utf8');

if (!source.includes("./components/HomeCommandCenter")) {
  const importAnchor = "import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';";
  if (!source.includes(importAnchor)) throw new Error('Home command center import anchor not found.');
  source = source.replace(importAnchor, `${importAnchor}\nimport { HomeCommandCenter } from './components/HomeCommandCenter';`);
}

if (!source.includes('<HomeCommandCenter')) {
  const marker = '      {/* Main Content Area */}';
  if (!source.includes(marker)) throw new Error('Home command center mount anchor not found.');
  const panel = `      <HomeCommandCenter\n        profile={profile}\n        cookLogs={cookLogs}\n        tempUnit={tempUnit}\n        onOpenCharGPT={(prompt) => {\n          if (prompt) setAiInitialPrompt(prompt);\n          setAiInitialCookId('ALL_LOGS');\n          handleTabChange('ai-pitmaster');\n        }}\n        onOpenPlanner={() => handleTabChange('planner')}\n        onOpenNewCook={() => {\n          setPrefilledRecipe(null);\n          setEditingCook(null);\n          handleTabChange('new-cook');\n        }}\n      />\n\n`;
  source = source.replace(marker, `${panel}${marker}`);
}

fs.writeFileSync(target, source, 'utf8');
console.log('[home-command-center] Mounted trust-safe AI Studio command center.');
