export interface ProteinGuide {
  proteinType: string;
  category: 'Beef' | 'Pork' | 'Poultry' | 'Lamb' | 'Fish/Seafood' | 'Game';
  usdaMinSafeF: number;
  usdaNote: string;
  stallTempF?: number;
  wrapTempF?: number;
  targetFinishF: number;
  bbqTargetRangeF: string;
  donenessLevels: {
    label: string;
    tempF: number;
    description: string;
  }[];
  pitmasterTips: string;
}

export const PROTEIN_SAFETY_AND_COOK_TEMPS: ProteinGuide[] = [
  {
    proteinType: 'Beef Brisket / Chuck Roast',
    category: 'Beef',
    usdaMinSafeF: 145,
    usdaNote: 'USDA safe minimum is 145°F + 3 min rest, but BBQ collagen renders at 195°-205°F.',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 203,
    bbqTargetRangeF: '198°F - 205°F',
    donenessLevels: [
      { label: 'Medium Rare (Steak Cut)', tempF: 135, description: 'Not recommended for brisket; rubbery fat.' },
      { label: 'Collagen Breakdown Begins', tempF: 160, description: 'Stall phase starts; sweat evaporative cooling.' },
      { label: 'Wrap Threshold (Peach Paper)', tempF: 165, description: 'Bark set; wrap to preserve moisture.' },
      { label: 'Probe Tender Finish (Sliced/Pulled)', tempF: 203, description: 'Butter-like probe feel; collagen fully liquid.' }
    ],
    pitmasterTips: 'Pull when thermal probe slides in with zero resistance like warm butter, usually between 202°F and 205°F.'
  },
  {
    proteinType: 'Beef Ribeye / Prime Rib / Tri-Tip',
    category: 'Beef',
    usdaMinSafeF: 145,
    usdaNote: '145°F medium doneness. Reverse sear recommended: pull 10°F below target before searing.',
    targetFinishF: 135,
    bbqTargetRangeF: '125°F - 135°F',
    donenessLevels: [
      { label: 'Rare', tempF: 125, description: 'Cool red center, soft texture.' },
      { label: 'Medium Rare (Ideal)', tempF: 135, description: 'Warm pink center, juicy rendered fat.' },
      { label: 'Medium', tempF: 145, description: 'Warm pink throughout, firmer feel.' },
      { label: 'Well Done', tempF: 160, description: 'Little to no pink, firm.' }
    ],
    pitmasterTips: 'Smoke at 225°F until 120°F internal, then sear over high heat (500°F+) for 2 mins per side.'
  },
  {
    proteinType: 'Pork Shoulder / Boston Butt (Pulled Pork)',
    category: 'Pork',
    usdaMinSafeF: 145,
    usdaNote: 'USDA minimum is 145°F for pork cuts, but pulled pork requires 203°-205°F for shredding.',
    stallTempF: 160,
    wrapTempF: 170,
    targetFinishF: 205,
    bbqTargetRangeF: '200°F - 208°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe', tempF: 145, description: 'Safe for chops/roasts, too tough for pulled pork.' },
      { label: 'Stall Zone', tempF: 160, description: 'Moisture pushes out; temp plateaus.' },
      { label: 'Foil Boat / Wrap', tempF: 170, description: 'Bark locked in; wrap with apple juice/cider vinegar.' },
      { label: 'Competition Shredding', tempF: 205, description: 'Bone pulls out clean without resistance.' }
    ],
    pitmasterTips: 'When the blade bone slides out completely clean with zero pull, it is done.'
  },
  {
    proteinType: 'Pork Spare Ribs / Baby Back Ribs',
    category: 'Pork',
    usdaMinSafeF: 145,
    usdaNote: 'USDA minimum is 145°F, but ribs finish around 195°-200°F.',
    wrapTempF: 165,
    targetFinishF: 198,
    bbqTargetRangeF: '195°F - 202°F',
    donenessLevels: [
      { label: 'USDA Safe', tempF: 145, description: 'Chewy, not tender.' },
      { label: 'Wrap Stage (3-2-1 Method)', tempF: 165, description: 'Wrap with butter, brown sugar, honey.' },
      { label: 'Bend Test Pass', tempF: 198, description: 'Rack cracks slightly when lifted with tongs.' }
    ],
    pitmasterTips: 'Rely on the bend test: pick up rack 1/3 down; if meat cracks visibly on surface, it is ready.'
  },
  {
    proteinType: 'Poultry: Chicken Breast / Turkey Breast',
    category: 'Poultry',
    usdaMinSafeF: 165,
    usdaNote: 'CRITICAL SAFETY: USDA mandates 165°F minimum internal temp for all poultry to eliminate Salmonella.',
    targetFinishF: 165,
    bbqTargetRangeF: '165°F - 168°F',
    donenessLevels: [
      { label: 'Raw Danger Zone', tempF: 140, description: 'Unsafe to consume.' },
      { label: 'USDA Safe Minimum', tempF: 165, description: 'Juicy, safe, fully cooked.' },
      { label: 'Overcooked Breast', tempF: 175, description: 'Dry and stringy.' }
    ],
    pitmasterTips: 'Pull white meat at 162°F and allow carryover cooking to push it to 165°F during 10 min rest.'
  },
  {
    proteinType: 'Poultry: Chicken Thighs / Whole Bird / Wings',
    category: 'Poultry',
    usdaMinSafeF: 165,
    usdaNote: 'USDA minimum 165°F. Dark meat (thighs/legs) tastes best and stays moist at 175°-185°F.',
    targetFinishF: 178,
    bbqTargetRangeF: '175°F - 185°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe', tempF: 165, description: 'Safe but dark meat can feel slightly rubbery.' },
      { label: 'Ideal Dark Meat Texture', tempF: 178, description: 'Tender connective tissue, crisp skin.' }
    ],
    pitmasterTips: 'Run smoker at 275°-325°F to crisp up chicken skin; low temps (225°F) cause rubbery skin.'
  },
  {
    proteinType: 'Lamb Rack / Leg of Lamb',
    category: 'Lamb',
    usdaMinSafeF: 145,
    usdaNote: 'USDA minimum safe temp is 145°F + 3 min rest.',
    targetFinishF: 135,
    bbqTargetRangeF: '130°F - 140°F',
    donenessLevels: [
      { label: 'Medium Rare', tempF: 135, description: 'Pink, delicate game flavor.' },
      { label: 'Medium', tempF: 145, description: 'Warm pink, firmer.' }
    ],
    pitmasterTips: 'Pair with rosemary and garlic rub; smoke with cherry wood for mild sweetness.'
  },
  {
    proteinType: 'Salmon Fillet / Trout / Fish',
    category: 'Fish/Seafood',
    usdaMinSafeF: 145,
    usdaNote: 'USDA minimum is 145°F or until fish flakes easily with a fork.',
    targetFinishF: 135,
    bbqTargetRangeF: '130°F - 140°F',
    donenessLevels: [
      { label: 'Medium (Silky)', tempF: 130, description: 'Moist and flaking.' },
      { label: 'USDA Safe / Well Done', tempF: 145, description: 'Fully firm, albacore flaking.' }
    ],
    pitmasterTips: 'Hot-smoke salmon at 180°-200°F over alder wood until white albumin barely begins to bead.'
  },
  {
    proteinType: 'Venison (Deer) / Elk Backstrap & Loin',
    category: 'Game',
    usdaMinSafeF: 145,
    usdaNote: 'USDA suggests 145°F for farm-raised game roasts. Ultra-lean wild game dries out above 135°F.',
    targetFinishF: 132,
    bbqTargetRangeF: '128°F - 135°F',
    donenessLevels: [
      { label: 'Rare', tempF: 125, description: 'Deep red, highly tender.' },
      { label: 'Medium Rare (Pitmaster Choice)', tempF: 132, description: 'Warm crimson center, juicy lean finish.' },
      { label: 'USDA Safe / Medium', tempF: 145, description: 'Loses juiciness quickly due to lack of intramuscular fat.' }
    ],
    pitmasterTips: 'Reverse-sear over oak or hickory. Baste generously with bacon fat or butter to compensate for zero fat marbling.'
  },
  {
    proteinType: 'Venison / Elk Shoulder Roast & Shank (BBQ Pulled Game)',
    category: 'Game',
    usdaMinSafeF: 160,
    usdaNote: 'USDA requires 160°F for ground game, but braised/smoked game shanks finish around 200°F.',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 200,
    bbqTargetRangeF: '198°F - 203°F',
    donenessLevels: [
      { label: 'USDA Ground/Roast Safe', tempF: 160, description: 'Tough if sliced without braising liquid.' },
      { label: 'Wrap with Beef Stock & Butter', tempF: 165, description: 'Prevent moisture loss in Dutch oven or foil.' },
      { label: 'Shredding Finish', tempF: 200, description: 'Collagen fully melted; easily shredded with forks.' }
    ],
    pitmasterTips: 'Smoke for 2 hours for smoke flavor, then wrap with beef broth, red wine, and butter in a covered foil pan until 200°F.'
  },
  {
    proteinType: 'Wild Boar Roast & Chops',
    category: 'Game',
    usdaMinSafeF: 160,
    usdaNote: 'CRITICAL SAFETY: Wild boar MUST reach 160°F minimum internal temp to destroy potential Trichinella parasites.',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F (Roasts up to 200°F)',
    donenessLevels: [
      { label: 'Danger Zone (Raw)', tempF: 140, description: 'Unsafe due to trichinosis risk in wild boar.' },
      { label: 'USDA Safe Minimum (Chops)', tempF: 160, description: 'Fully safe, rich nutty pork-like flavor.' },
      { label: 'Pulled Wild Boar (Shoulder)', tempF: 202, description: 'Slow-braised or wrapped shoulder for shredding.' }
    ],
    pitmasterTips: 'Brine wild boar overnight in apple cider and brown sugar to tenderize lean muscular fibers.'
  },
  {
    proteinType: 'Bison / Buffalo Ribeye & Tenderloin',
    category: 'Game',
    usdaMinSafeF: 145,
    usdaNote: 'USDA minimum is 145°F. Bison cooks ~30% faster than beef due to zero fat insulation.',
    targetFinishF: 132,
    bbqTargetRangeF: '128°F - 135°F',
    donenessLevels: [
      { label: 'Medium Rare (Peak Flavor)', tempF: 132, description: 'Juicy, rich, naturally sweet red meat.' },
      { label: 'Medium', tempF: 142, description: 'Starts drying out fast.' }
    ],
    pitmasterTips: 'Cook at lower smoker temps (200°-225°F) and pull 5°F earlier than beef steak; rest 10 minutes.'
  },
  {
    proteinType: 'Wild Duck & Goose Breast',
    category: 'Game',
    usdaMinSafeF: 165,
    usdaNote: 'USDA mandates 165°F for all poultry. Culinary chefs often serve farm duck rare at 135°F, but wild waterfowl safety requires caution.',
    targetFinishF: 140,
    bbqTargetRangeF: '135°F - 165°F',
    donenessLevels: [
      { label: 'Culinary Medium Rare Breast', tempF: 135, description: 'Rich steak-like texture (Check source).' },
      { label: 'USDA Safe Standard', tempF: 165, description: 'Fully safe for wild game birds.' }
    ],
    pitmasterTips: 'Score the fatty skin in a diamond pattern to render fat crisp before smoking over cherry wood.'
  },
  {
    proteinType: 'Wild Pheasant, Quail & Upland Birds',
    category: 'Game',
    usdaMinSafeF: 165,
    usdaNote: 'CRITICAL: 165°F minimum internal temperature required for safety.',
    targetFinishF: 165,
    bbqTargetRangeF: '165°F - 168°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe', tempF: 165, description: 'Safe and juicy if wrapped or basted.' },
      { label: 'Overcooked', tempF: 175, description: 'Extremely dry.' }
    ],
    pitmasterTips: 'Wrap pheasant breasts in bacon or caul fat before smoking at 250°F to lock in natural juices.'
  },
  {
    proteinType: 'Rabbit (Whole / Hind Quarter)',
    category: 'Game',
    usdaMinSafeF: 160,
    usdaNote: 'USDA recommends 160°F internal temperature for domestic and wild rabbit.',
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F',
    donenessLevels: [
      { label: 'USDA Safe Minimum', tempF: 160, description: 'Moist white meat akin to chicken thigh.' },
      { label: 'Braised Tender', tempF: 175, description: 'Fall-off-the-bone tender when braised with wine/stock.' }
    ],
    pitmasterTips: 'Smoke at 225°F until 140°F, then submerge in a butter-herbed bath to finish to 160°F.'
  }
];

