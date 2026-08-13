export interface StudyFlashcard {
  id: string;
  category: 'physics_thermodynamics' | 'kcbs_judging' | 'haccp_safety' | 'butchery_geometry' | 'wood_combustion';
  categoryLabel: string;
  question: string;
  answer: string;
  explanation: string;
  keyFormula?: string;
}

export interface PracticeExamQuestion {
  id: string;
  examType: 'kcbs_judge' | '10k_master_physics' | 'servsafe_haccp' | 'cbp_commercial';
  examLabel: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  charGPTTip: string;
}

export const CERTIFICATION_FLASHCARDS: StudyFlashcard[] = [
  {
    id: 'fc-1',
    category: 'physics_thermodynamics',
    categoryLabel: 'Thermal Physics',
    question: 'What physical mechanism causes the "Thermal Stall" at 155°F–170°F during long smoker cooks?',
    answer: 'Surface Evaporative Cooling',
    explanation: 'As moisture sweats out from the meat to the surface, heat energy is converted into latent heat of vaporization, balancing the heat input from ambient pit air until surface moisture dries or is wrapped.',
    keyFormula: 'Heat Energy Input = Latent Heat of Evaporation (q = m * L_v)',
  },
  {
    id: 'fc-2',
    category: 'physics_thermodynamics',
    categoryLabel: 'Thermal Physics',
    question: 'Why does dry-brining with kosher salt penetrate meat deep into muscle tissue, whereas sugar and spices stay on the surface?',
    answer: 'Ionic Osmosis & Small Molecular Radius',
    explanation: 'Sodium (Na+) and Chloride (Cl-) ions are extremely small and dissolve into surface moisture, diffusing deep into muscle fiber matrices via ionic gradient. Larger sugar and protein molecules are too large to penetrate cell membranes.',
    keyFormula: 'Fick\'s Law of Osmotic Diffusion: J = -D (dC/dx)',
  },
  {
    id: 'fc-3',
    category: 'kcbs_judging',
    categoryLabel: 'KCBS Judging',
    question: 'In KCBS competition scoring, what are the three official criteria and their relative weighting priority?',
    answer: 'Taste (highest weight ~35.8%), Tenderness (~32.1%), Appearance (~14.3%)',
    explanation: 'Taste is weighted heaviest, followed by tenderness and appearance. Scores range from 9 (Excellent) down to 2 (Poor) or 1 (Disqualified).',
  },
  {
    id: 'fc-4',
    category: 'haccp_safety',
    categoryLabel: 'HACCP Safety',
    question: 'According to ServSafe HACCP standards, what is the Maximum Time allowed in the Temperature Danger Zone (41°F to 135°F) for cooked meat holding & cooling?',
    answer: 'Maximum 2 hours from 135°F to 70°F, and within 4 total hours down to 41°F',
    explanation: 'Rapid cooling protocols prevent bacterial spore germination (e.g., Clostridium perfringens) during holding, resting, and storage.',
  },
  {
    id: 'fc-5',
    category: 'wood_combustion',
    categoryLabel: 'Wood Combustion',
    question: 'What causes bitter creosote deposit on meat, and how is it prevented in off-set and pellet smokers?',
    answer: 'Incomplete Combustion & Oxygen Starvation',
    explanation: 'Creosote forms when unburned volatile wood hydrocarbons condense on cool meat surfaces. It is prevented by maintaining high exhaust flow, clean blue flame/smoke, and dry wood (<18% moisture).',
  },
  {
    id: 'fc-6',
    category: 'butchery_geometry',
    categoryLabel: 'Butchery Geometry',
    question: 'In prime beef brisket, where is the natural fat layer separating the Flat (pectoralis profundus) and Point (pectoralis superficialis)?',
    answer: 'The Decal fat layer (fat seam)',
    explanation: 'Trimming the dense hard decal fat allows heat and smoke to reach muscle fibers evenly while preserving soft renderable surface cover fat.',
  },
];

export const PRACTICE_EXAM_QUESTIONS: PracticeExamQuestion[] = [
  {
    id: 'q-1',
    examType: '10k_master_physics',
    examLabel: '10,000-Hour Thermal Physics Master Exam',
    question: 'When wrapping a beef brisket in peach butcher paper at the 162°F stall point, how does paper wrap differ fundamentally from foil wrap (Texas Crutch)?',
    options: [
      'Paper completely stops heat transfer while foil accelerates it',
      'Paper is porous and allows steam to escape while trapping fat, preserving crisp bark while foil steams the surface',
      'Foil creates a chemical smoke ring while paper degrades nitrites',
      'Foil lowers pit humidity while paper raises ambient pit temperature by 50°F',
    ],
    correctOptionIndex: 1,
    explanation: 'Peach butcher paper is air and moisture permeable. It retains renderable rendered fats and heat, accelerating past the stall while allowing excess steam to dissipate, maintaining mahogany bark crispness unlike impermeable aluminum foil.',
    charGPTTip: 'CharGPT Pro-Tip: Spritz paper lightly with beef tallow before wrapping to seal heat without braising.',
  },
  {
    id: 'q-2',
    examType: 'kcbs_judge',
    examLabel: 'KCBS Certified Barbeque Judge (CBJ) Exam',
    question: 'A judge receives a KCBS turn-in box containing turn-in chicken thigh with pooling red sauce completely covering the top garnish, and 5 thigh pieces for 6 judges. What score must be assigned?',
    options: [
      'Score 9 because chicken looks glossy and saucy',
      'Disqualification / Score 1 due to insufficient pieces (fewer than 6 pieces for 6 judges)',
      'Score 5 for average presentation',
      'Ask the table captain for a replacement box',
    ],
    correctOptionIndex: 1,
    explanation: 'KCBS rules mandate at least 6 separate entry portions in each turn-in container so all 6 table judges receive a piece. Failing to provide 6 pieces results in a mandatory score 1 disqualification for appearance.',
    charGPTTip: 'CharGPT Pro-Tip: Always trim and fit exactly 6 or 8 uniform chicken thighs per competition turn-in box.',
  },
  {
    id: 'q-3',
    examType: 'servsafe_haccp',
    examLabel: 'ServSafe Low-and-Slow HACCP Certification',
    question: 'What is the absolute minimum internal resting holding temperature required for cooked pork shoulder held in a Cambro insulated hot box prior to pulling?',
    options: [
      '110°F',
      '125°F',
      '135°F',
      '165°F',
    ],
    correctOptionIndex: 2,
    explanation: 'ServSafe and USDA FDA guidelines require hot-held foods to be maintained at 135°F or higher to prevent pathogen proliferation.',
    charGPTTip: 'CharGPT Pro-Tip: Pre-heat your Cambro holding box with hot water vessels to keep internal ambient temp above 145°F during 4-8 hour rests.',
  },
  {
    id: 'q-4',
    examType: 'cbp_commercial',
    examLabel: 'Certified Barbecue Pitmaster (CBP) Exam',
    question: 'When estimating raw meat yield for a 100-person catering order of pulled pork butts with a target serving size of 0.33 lbs cooked meat per person, assuming 45% cooking and trimming loss, how many raw pounds must be ordered?',
    options: [
      '33 lbs raw',
      '45 lbs raw',
      '60 lbs raw',
      '75 lbs raw',
    ],
    correctOptionIndex: 2,
    explanation: '100 people * 0.33 lbs = 33 lbs cooked meat required. Accounting for 45% cook loss (55% yield): 33 lbs / 0.55 = 60 lbs raw meat required.',
    charGPTTip: 'CharGPT Pro-Tip: Use CharGPT Mass & Yield Calculator tab anytime to automate shrink calculations.',
  },
  {
    id: 'q-5',
    examType: '10k_master_physics',
    examLabel: '10,000-Hour Thermal Physics Master Exam',
    question: 'Which wood combustion compound is directly responsible for fixing myoglobin in meat protein to create a dark pink "smoke ring"?',
    options: [
      'Carbon Dioxide (CO2) only',
      'Nitric Oxide (NO) and Carbon Monoxide (CO)',
      'Methane gas (CH4)',
      'Guaiacol and Syringol aroma phenols',
    ],
    correctOptionIndex: 1,
    explanation: 'Nitric Oxide (NO) and Carbon Monoxide (CO) gas molecules bind to iron atoms in myoglobin at muscle surfaces before temperatures reach 140°F, preventing denaturation and locking in the pink smoke ring color.',
    charGPTTip: 'CharGPT Pro-Tip: Keep meat surface moist and cold early in the cook to maximize NO absorption and smoke ring thickness.',
  },
];
