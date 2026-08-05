import { ProteinType } from '../types';

export interface RecipeSuggestion {
  id: string;
  title: string;
  proteinType: ProteinType;
  proteinCut: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Pitmaster Expert';
  estHours: number;
  targetPitTemp: number; // °F
  targetMeatTemp: number; // °F
  wrapTemp?: number; // °F
  recommendedWood: string;
  estPelletsLbs: number;
  rubIngredients: string;
  sauceGlaze?: string;
  description: string;
  keySteps: string[];
  proTip: string;
  prepTimeMinutes: number;
  flavorProfile: string;
  tags: string[];
}

export const RECIPE_SUGGESTIONS: RecipeSuggestion[] = [
  {
    id: 'recipe-texas-brisket',
    title: 'Central Texas Style Packer Brisket',
    proteinType: 'Beef',
    proteinCut: '12-14 lb Full Packer Brisket (Flat & Point)',
    difficulty: 'Pitmaster Expert',
    estHours: 12.5,
    targetPitTemp: 225,
    targetMeatTemp: 203,
    wrapTemp: 165,
    recommendedWood: 'Pit Boss Competition Blend (Oak / Hickory)',
    estPelletsLbs: 16.0,
    rubIngredients: '50/50 Coarse 16-Mesh Black Pepper & Kosher Salt (Dalmatian Rub), Granulated Garlic',
    sauceGlaze: 'None required (Served dry with rendered tallow wrap)',
    description: 'The ultimate pitmaster milestone. Low and slow smoked overnight with a dark mahogany bark and buttery rendered fat cap.',
    keySteps: [
      'Trim brisket fat cap to 1/4 inch thickness; square up thin flat edges for aerodynamic smoke flow.',
      'Apply mustard binder and heavy Dalmatian rub 1 hour prior to loading.',
      'Preheat vertical smoker to 225°F using Oak/Hickory pellets.',
      'Smoke for 6-7 hours until internal temp hits the 165°F stall and bark sets firm.',
      'Wrap tightly in peach butcher paper with beef tallow; return to smoker at 250°F until probe-tender (~203°F).',
      'Rest in insulated cooler for minimum 2-3 hours before slicing flat against the grain.'
    ],
    proTip: 'Render leftover brisket fat trimmings into liquid beef tallow in a foil pan on the top rack while smoking.',
    prepTimeMinutes: 30,
    flavorProfile: 'Bold Peppery Bark, Rich Beef Fat Render & Deep Smoke',
    tags: ['Low & Slow', 'Overnight', 'Texas Legend', 'Butcher Paper Wrap']
  },
  {
    id: 'recipe-pulled-pork',
    title: 'Competition Carolina Pulled Pork Butt',
    proteinType: 'Pork',
    proteinCut: '8-10 lb Bone-In Pork Shoulder (Boston Butt)',
    difficulty: 'Intermediate',
    estHours: 10.0,
    targetPitTemp: 225,
    targetMeatTemp: 205,
    wrapTemp: 168,
    recommendedWood: 'Apple Wood & Hickory Blend',
    estPelletsLbs: 13.5,
    rubIngredients: 'Brown Sugar, Sweet Paprika, Smoked Sea Salt, Garlic Powder, Cayenne, Black Pepper',
    sauceGlaze: 'Vinegar-based Eastern Carolina Mop Sauce (Apple Cider Vinegar, Red Pepper Flakes, Brown Sugar)',
    description: 'Melt-in-your-mouth juicy shredded pork shoulder packed with sweet mahogany bark and a tangy cider mop sauce.',
    keySteps: [
      'Score fat cap in crosshatch pattern; coat thoroughly with sweet BBQ rub.',
      'Preheat smoker to 225°F with Apple Wood pellets.',
      'Smoke fat side up for 5-6 hours, spritzing hourly with 50/50 apple juice & cider vinegar.',
      'At 168°F stall, foil wrap with butter slices, brown sugar, and apple juice.',
      'Increase pit temp to 260°F until internal meat temp reaches 205°F and bone pulls clean.',
      'Rest 1 hour, then shred with claw forks and toss with vinegar mop sauce.'
    ],
    proTip: 'Toss a splash of apple cider vinegar mop sauce directly into the shredded meat right after pulling to absorb maximum flavor.',
    prepTimeMinutes: 20,
    flavorProfile: 'Sweet & Tangy, Caramelized Bark, Ultra Moist',
    tags: ['Crowd Pleaser', 'Meal Prep', 'Carolina Style', 'Shredded']
  },
  {
    id: 'recipe-321-ribs',
    title: 'Classic 3-2-1 St. Louis Cut Pork Ribs',
    proteinType: 'Pork',
    proteinCut: '3-4 lb St. Louis Cut Pork Spare Ribs',
    difficulty: 'Beginner',
    estHours: 6.0,
    targetPitTemp: 225,
    targetMeatTemp: 198,
    wrapTemp: 160,
    recommendedWood: 'Cherry & Apple Blend',
    estPelletsLbs: 7.5,
    rubIngredients: 'Brown Sugar, Paprika, Onion Powder, Chili Powder, Kosher Salt',
    sauceGlaze: 'Sweet & Smoky Molasses BBQ Glaze',
    description: 'The bulletproof 3-2-1 method: 3 hours unwrapped smoke, 2 hours wrapped tenderizing, and 1 hour glazed finish.',
    keySteps: [
      'Peel membrane off back of rib rack using paper towel for leverage.',
      'Apply yellow mustard binder and rub liberally on both sides.',
      '3 Hours Smoke: Place bone-side down at 225°F unwrapped.',
      '2 Hours Foil Wrap: Wrap in heavy foil with butter pads, honey, and brown sugar.',
      '1 Hour Sauce & Set: Unwrap, brush with sweet BBQ sauce, and set glaze for 45-60 mins.'
    ],
    proTip: 'Check bend test at 5.5 hours — when held with tongs, the rib rack should flex nearly 90 degrees with bark cracking slightly.',
    prepTimeMinutes: 15,
    flavorProfile: 'Fruity Smoke, Sticky Sweet Glaze, Fall-Off-The-Bone',
    tags: ['3-2-1 Method', 'Foil Wrap', 'Glazed', 'Weekend Favorite']
  },
  {
    id: 'recipe-beef-ribs',
    title: 'Dino Beef Plate Short Ribs',
    proteinType: 'Beef',
    proteinCut: '3-Bone Beef Plate Short Ribs (approx 6-8 lbs)',
    difficulty: 'Intermediate',
    estHours: 8.5,
    targetPitTemp: 250,
    targetMeatTemp: 203,
    wrapTemp: 175,
    recommendedWood: 'Post Oak & Hickory',
    estPelletsLbs: 11.0,
    rubIngredients: 'Coarse Black Pepper, Kosher Salt, Onion Powder, Ancho Chili Powder',
    sauceGlaze: 'Serve Dry (Optional Beef Au Jus side)',
    description: 'Massive "Dinosaur" ribs with thick marbling that melts into rich beefy gelatin over an 8 hour post oak smoke.',
    keySteps: [
      'Trim top silverskin to expose rich red meat; leave bottom membrane intact so bones stay connected.',
      'Coat evenly with coarse beef rub.',
      'Smoke at 250°F fat side up.',
      'Spritz with beef broth & Worcestershire sauce every 90 minutes after hour 3.',
      'Optionally wrap at 175°F in butcher paper if bark is getting too dark.',
      'Cook until thermometer probe glides through like warm butter (~203°F).'
    ],
    proTip: 'Do NOT remove the tough bottom membrane on beef short ribs, or the meat will slide right off the bones during the long smoke.',
    prepTimeMinutes: 20,
    flavorProfile: 'Rich & Decadent, Unmatched Beefiness, Deep Smoke',
    tags: ['Dino Ribs', 'Post Oak', 'Showstopper', 'Heavy Smoke']
  },
  {
    id: 'recipe-pork-belly-burnt-ends',
    title: 'Pork Belly Burnt Ends ("Meat Candy")',
    proteinType: 'Pork',
    proteinCut: '5 lb Skinless Pork Belly Slab',
    difficulty: 'Beginner',
    estHours: 4.5,
    targetPitTemp: 250,
    targetMeatTemp: 200,
    recommendedWood: 'Apple / Cherry / Maple',
    estPelletsLbs: 6.0,
    rubIngredients: 'Sweet Brown Sugar BBQ Rub, Cinnamon, Paprika',
    sauceGlaze: 'Honey, Butter, Brown Sugar & Bourbon BBQ Glaze',
    description: 'Bite-sized cubes of pork belly smoked to perfection then caramelized in butter, honey, and sticky sweet BBQ glaze.',
    keySteps: [
      'Cube pork belly slab into 1.5 inch bite-sized pieces.',
      'Toss thoroughly with sweet rub in a large bowl.',
      'Arrange on wire rack and smoke at 250°F for 2.5 - 3 hours until golden mahogany.',
      'Transfer to foil pan; add 1 stick butter, 1/2 cup honey, brown sugar, and BBQ sauce.',
      'Cover tightly with foil and return to smoker for 1 to 1.5 hours until super tender.',
      'Uncover for final 15 mins to let sauce thicken into a shiny sticky glaze.'
    ],
    proTip: 'Use a wire baking rack inside the smoker so you can load and unload all 50 cubes at once without opening the smoker door repeatedly.',
    prepTimeMinutes: 25,
    flavorProfile: 'Ultra Sweet, Butter Glazed, Melt-in-Your-Mouth',
    tags: ['Meat Candy', 'Party Favorite', 'Appetizer', 'Quick Smoke']
  },
  {
    id: 'recipe-smoked-turkey-breast',
    title: 'Herb-Butter Smoked Turkey Breast',
    proteinType: 'Turkey',
    proteinCut: '5-6 lb Skinless Boneless Turkey Breast',
    difficulty: 'Beginner',
    estHours: 3.5,
    targetPitTemp: 275,
    targetMeatTemp: 165,
    recommendedWood: 'Pecan & Apple Blend',
    estPelletsLbs: 4.5,
    rubIngredients: 'Kosher Salt, Cracked Black Pepper, Dried Thyme, Rosemary, Garlic Powder, Sage',
    sauceGlaze: 'Clarified Herb Butter Bath',
    description: 'Juicy, clean-slicing turkey breast smoked with poultry herbs and submerged in an herb-butter foil wrap for supreme moisture.',
    keySteps: [
      'Wet brine in salt, sugar, citrus, and rosemary solution for 12 hours prior (optional but recommended).',
      'Pat completely dry; rub with olive oil and poultry herb seasoning.',
      'Smoke at 275°F for 2 hours until internal temp reaches 140°F.',
      'Place in foil pan with 1.5 sticks melted unsalted herb butter and cover tightly.',
      'Cook until internal temp reaches precisely 165°F in thickest part.',
      'Rest 20 mins before thin slicing for sandwiches or dinner platters.'
    ],
    proTip: 'Wrapping turkey in melted butter at 140°F prevents lean turkey breast from drying out during the final push to 165°F.',
    prepTimeMinutes: 15,
    flavorProfile: 'Savory Herb, Mild Smoke, Juicy & Lean',
    tags: ['Lean & Healthy', 'Poultry', 'Holiday Special', 'Butter Bath']
  },
  {
    id: 'recipe-crispy-wings',
    title: 'Crispy Smoked Honey-Chili Wings',
    proteinType: 'Chicken',
    proteinCut: '4 lbs Fresh Chicken Wings (Flats & Drumettes)',
    difficulty: 'Beginner',
    estHours: 2.0,
    targetPitTemp: 225, // then bump to 375°F for crisping
    targetMeatTemp: 175,
    recommendedWood: 'Apple Wood / Cherry',
    estPelletsLbs: 3.0,
    rubIngredients: 'Kosher Salt, Garlic Powder, Paprika, Black Pepper & 1 tsp Baking Powder (for crisp skin)',
    sauceGlaze: 'Warm Honey, Frank\'s RedHot, Butter & Lime Juice',
    description: 'Baking powder dry-brined wings smoked for maximum smoke absorption then flashed at high heat for super crispy skin.',
    keySteps: [
      'Toss raw wings with salt and baking powder; air dry uncovered in fridge for 4-12 hours.',
      'Season with garlic & paprika rub.',
      'Smoke at 225°F for 1 hour for deep smoke penetration.',
      'Crank smoker temperature to 375°F (or finish in air fryer) for 25 mins to crisp skin to golden crackle.',
      'Toss immediately in warm honey hot sauce glaze and serve with ranch.'
    ],
    proTip: 'The 1 tsp baking powder trick draws out surface skin moisture in the fridge, guaranteeing crispy skin instead of rubbery smoker wings.',
    prepTimeMinutes: 15,
    flavorProfile: 'Crispy Skin, Sweet & Spicy Glaze, Game Day Favorite',
    tags: ['Game Day', 'Fast Smoke', 'Crispy Skin', 'Appetizer']
  },
  {
    id: 'recipe-cedar-salmon',
    title: 'Bourbon Maple Cedar Plank Salmon',
    proteinType: 'Seafood',
    proteinCut: '2-3 lb Whole Side Skin-On Salmon Fillet',
    difficulty: 'Beginner',
    estHours: 1.2,
    targetPitTemp: 225,
    targetMeatTemp: 145,
    recommendedWood: 'Alder Wood or Fruitwood',
    estPelletsLbs: 2.0,
    rubIngredients: 'Coarse Sea Salt, Lemon Pepper, Brown Sugar, Garlic Granules',
    sauceGlaze: 'Pure Maple Syrup, Bourbon, Soy Sauce & Dijion Mustard Glaze',
    description: 'Fresh salmon smoked gently on an aromatic cedar plank with a caramelized bourbon maple glaze.',
    keySteps: [
      'Submerge western red cedar plank in water for at least 1 hour.',
      'Place salmon fillet skin-side down on soaked plank; season with lemon pepper & brown sugar rub.',
      'Preheat smoker to 225°F with Alder pellets.',
      'Smoke on cedar plank for 45 minutes.',
      'Brush generously with bourbon maple glaze every 10 mins during final 20 mins.',
      'Pull at 145°F internal temperature (or 135°F for medium).'
    ],
    proTip: 'Char the cedar plank on the grill grates for 3 minutes before placing the salmon on top to ignite the essential wood oils.',
    prepTimeMinutes: 10,
    flavorProfile: 'Aromatic Cedar, Sweet Maple Bourbon, Silky & Tender',
    tags: ['Quick Smoke', 'Seafood', 'Cedar Plank', 'Healthy']
  },
  {
    id: 'recipe-reverse-sear-tritip',
    title: 'Santa Maria Reverse-Seared Tri-Tip',
    proteinType: 'Beef',
    proteinCut: '2.5 - 3.5 lb Beef Tri-Tip Roast',
    difficulty: 'Intermediate',
    estHours: 2.2,
    targetPitTemp: 225,
    targetMeatTemp: 135, // Medium Rare
    recommendedWood: 'Oak / Red Oak',
    estPelletsLbs: 3.5,
    rubIngredients: 'Santa Maria Rub: Garlic Salt, Coarse Black Pepper, Cayenne, Parsley',
    sauceGlaze: 'Chimichurri Herb Sauce garnish',
    description: 'Slow-smoked over oak to 125°F internal, then reverse-seared hot for a crusty char and pink edge-to-edge center.',
    keySteps: [
      'Trim silver skin while keeping a thin fat layer intact.',
      'Season heavily with traditional Santa Maria garlic salt & black pepper rub.',
      'Smoke at 225°F until internal temperature reaches 125°F (~1.5 hours).',
      'Remove from smoker; crank smoker or cast iron skillet to 450°F+ high heat.',
      'Sear 2-3 minutes per side to build a deep crust until center hits 135°F for medium-rare.',
      'Rest 15 minutes, then slice thin perpendicular to the grain direction change.'
    ],
    proTip: 'Tri-tip grain shifts directions halfway through the roast — slice the roast into two halves first, then slice each half against its specific grain.',
    prepTimeMinutes: 15,
    flavorProfile: 'Savory Garlic Pepper, Medium-Rare Pink Center, Smoky Sear',
    tags: ['Reverse Sear', 'Santa Maria', 'Quick Beef', 'Medium Rare']
  },
  {
    id: 'recipe-spatchcock-chicken',
    title: 'Smoked Applewood Spatchcock Whole Chicken',
    proteinType: 'Chicken',
    proteinCut: '5 lb Whole Young Chicken',
    difficulty: 'Beginner',
    estHours: 2.5,
    targetPitTemp: 275,
    targetMeatTemp: 165,
    recommendedWood: 'Bear Mountain Apple Wood Pellets',
    estPelletsLbs: 3.5,
    rubIngredients: 'Paprika, Onion Powder, Garlic Powder, Lemon Zest, Thyme, Sea Salt',
    sauceGlaze: 'Albamama White BBQ Sauce (Mayonnaise, Apple Cider Vinegar, Horseradish, Black Pepper)',
    description: 'Flattened spatchcock chicken smokes evenly in half the time with crisp skin, juicy breast meat, and Alabama white sauce.',
    keySteps: [
      'Spatchcock the bird: Use kitchen shears to cut out the backbone, then press breastbone flat.',
      'Toss skin with avocado oil and savory poultry rub.',
      'Smoke at 275°F for approx 2 - 2.5 hours.',
      'Verify internal breast temp reaches 165°F and thigh hits 175°F.',
      'Drizzle or dunk slices into tangy Alabama White BBQ sauce.'
    ],
    proTip: 'Spatchcocking exposes both legs and breasts on the same flat plane, preventing overcooked dry breasts while waiting for thighs to cook.',
    prepTimeMinutes: 15,
    flavorProfile: 'Tangy White Sauce, Crispy Skin, Fruity Apple Smoke',
    tags: ['Spatchcock', 'Alabama White Sauce', 'Easy Sunday Smoke', 'Poultry']
  },
  {
    id: 'recipe-smoked-venison-backstrap',
    title: 'Smoked Bacon-Wrapped Venison Backstrap',
    proteinType: 'Venison',
    proteinCut: '2.5 - 3 lb Venison (Deer) Backstrap / Loin',
    difficulty: 'Intermediate',
    estHours: 1.8,
    targetPitTemp: 225,
    targetMeatTemp: 132,
    recommendedWood: 'Hickory & Cherry Pellet Blend',
    estPelletsLbs: 2.5,
    rubIngredients: 'Coarse Kosher Salt, Fresh Cracked Black Pepper, Garlic Powder, Cracked Juniper Berries & Rosemary',
    sauceGlaze: 'Garlic Herb Compound Butter Baste with Red Wine Reduction',
    description: 'Ultra-lean venison loin wrapped in thin smoked bacon and reverse-seared with garlic butter for tender crimson perfection.',
    keySteps: [
      'Trim all silver skin carefully from backstrap to prevent curling or tough chew.',
      'Season generously with garlic, black pepper, and crushed juniper berries.',
      'Wrap tightly in thin-cut hardwood smoked bacon strips secured with wooden toothpicks.',
      'Preheat smoker to 225°F with Cherry & Hickory pellets.',
      'Smoke for 1.25 - 1.5 hours until internal temperature reaches 125°F.',
      'Melt garlic herb butter over high heat sear for 2 minutes to crisp bacon and finish meat at 132°F (Medium Rare).',
      'Rest 10 minutes before slicing into 1/2-inch medallions.'
    ],
    proTip: 'Because wild venison has almost zero fat, wrapping in thin bacon acts as a self-basting jacket that locks in moisture.',
    prepTimeMinutes: 20,
    flavorProfile: 'Rich Savory Bacon, Crimson Soft Tenderness, Earthy Juniper & Cherry Smoke',
    tags: ['Wild Game', 'Venison', 'Bacon Wrapped', 'Medium Rare', 'Hunters Choice']
  },
  {
    id: 'recipe-smoked-bear-roast',
    title: 'Slow-Smoked Bear Roast with Blackberry Wine Glaze',
    proteinType: 'Bear',
    proteinCut: '4-5 lb Black Bear Shoulder Roast',
    difficulty: 'Pitmaster Expert',
    estHours: 7.5,
    targetPitTemp: 225,
    targetMeatTemp: 165,
    recommendedWood: 'Oak & Pecan Wood Blend',
    estPelletsLbs: 9.0,
    rubIngredients: 'Coarse Salt, Black Pepper, Dried Thyme, Cracked Allspice, Rosemary & Garlic',
    sauceGlaze: 'Wild Blackberry & Red Wine Reduction Glaze',
    description: 'Rich, savory bear roast smoked over pecan wood and braised in blackberry red wine. Bear MUST reach 165°F minimum internal temp for safety.',
    keySteps: [
      'Trim excess outer tallow while preserving natural dark muscular roast.',
      'Season heavily with coarse salt, cracked pepper, garlic, dried thyme, and allspice.',
      'Smoke at 225°F over Oak & Pecan pellets for 4 hours until bark darkens.',
      'Place in foil braising pan with 1 cup wild blackberry jam, 1 cup Pinot Noir, and beef stock; cover tightly with foil.',
      'Braise on smoker at 250°F until internal temp reaches 165°F+ minimum (or 200°F for tender pulled bear).',
      'Rest 30 minutes before shredding or slicing.'
    ],
    proTip: 'CRITICAL SAFETY: Bear meat must reach a minimum internal temperature of 165°F throughout to eliminate trichinosis risks.',
    prepTimeMinutes: 25,
    flavorProfile: 'Sweet Blackberry Glaze, Rich Earthy Roast, Pecan Smoke Depth',
    tags: ['Wild Game', 'Bear', 'Safety 165°F', 'Blackberry Wine', 'Slow Smoke']
  },
  {
    id: 'recipe-wild-boar-pulled-pork',
    title: 'Low & Slow Smoked Wild Boar Shoulder',
    proteinType: 'Wild Boar',
    proteinCut: '6-8 lb Bone-In Wild Boar Shoulder / Pork Butt',
    difficulty: 'Pitmaster Expert',
    estHours: 9.5,
    targetPitTemp: 240,
    targetMeatTemp: 202,
    wrapTemp: 165,
    recommendedWood: 'Oak & Apple Wood Pellets',
    estPelletsLbs: 12.0,
    rubIngredients: 'Smoked Paprika, Brown Sugar, Kosher Salt, Cumin, Mustard Powder, Cayenne',
    sauceGlaze: 'Bourbon Apple Cider Mop Sauce & Spicy Chipotle Glaze',
    description: 'Wild boar shoulder possesses a deeper, nuttier flavor than domestic pork. Smoked low and wrapped with apple cider butter.',
    keySteps: [
      'Brine wild boar shoulder overnight in apple cider, kosher salt, and brown sugar to tenderize muscular game fibers.',
      'Apply yellow mustard binder and smoked paprika rub.',
      'Smoke at 240°F for 5 hours, spritzing every 45 mins with apple cider.',
      'At 165°F stall, place in foil pan with 1/2 cup apple cider, butter, and brown sugar; cover tightly with foil.',
      'Continue smoking until internal temp reaches 202°F and bone slides out effortlessly.',
      'Rest 1.5 hours, then shred and toss with bourbon cider mop sauce.'
    ],
    proTip: 'Wild boar MUST reach a safe minimum temperature (160°F+) for safety, but wrapping in a braising pan pushes it to 202°F for meltingly tender pulled boar.',
    prepTimeMinutes: 25,
    flavorProfile: 'Nutty Pork Depth, Sweet Apple Cider & Bourbon, Rich Mahogany Bark',
    tags: ['Wild Game', 'Wild Boar', 'Pulled Pork', 'Braise Wrap', 'Low & Slow']
  },
  {
    id: 'recipe-bison-tomahawk',
    title: 'Reverse-Seared Bison Tomahawk Steak',
    proteinType: 'Bison',
    proteinCut: '32 oz Bone-In Bison Ribeye Tomahawk',
    difficulty: 'Intermediate',
    estHours: 1.5,
    targetPitTemp: 200,
    targetMeatTemp: 130,
    recommendedWood: 'Mesquite & Oak Blend',
    estPelletsLbs: 2.0,
    rubIngredients: 'Flaky Sea Salt, Coarse Black Pepper, Granulated Garlic, Espresso Powder',
    sauceGlaze: 'Tallow & Herb Butter Board',
    description: 'A massive 2-inch thick bison tomahawk reverse-seared over mesquite smoke. Rich, sweet red meat with zero greasy fat.',
    keySteps: [
      'Dry-brine bison tomahawk with coarse salt in refrigerator for 4 hours.',
      'Season with black pepper, garlic, and a pinch of espresso rub.',
      'Set smoker to low 200°F temperature to gently infuse smoke without overcooking the lean center.',
      'Smoke for approx 55-65 mins until probe hits 118°F.',
      'Transfer immediately to a white-hot cast iron skillet or 500°F grill grate with beef tallow for 90 seconds per side.',
      'Rest on a cutting board loaded with fresh rosemary, thyme, and garlic butter.'
    ],
    proTip: 'Bison cooks 30% faster than beef due to less fat insulation — use low 200°F smoker temp and monitor internal probe closely!',
    prepTimeMinutes: 15,
    flavorProfile: 'Sweet Rich Bison, Espresso Salt Crust, Clean Lean Finish',
    tags: ['Wild Game', 'Bison', 'Reverse Sear', 'Tomahawk', 'Steakhouse Quality']
  },
  {
    id: 'recipe-smoked-duck-breast',
    title: 'Smoked Duck Breast with Bourbon Cherry Glaze',
    proteinType: 'Duck',
    proteinCut: '2x 10 oz Skin-On Wild Duck Breasts',
    difficulty: 'Intermediate',
    estHours: 1.5,
    targetPitTemp: 225,
    targetMeatTemp: 140,
    recommendedWood: 'Cherry & Pecan Wood Blend',
    estPelletsLbs: 2.0,
    rubIngredients: 'Kosher Salt, Five-Spice Powder, Black Pepper, Orange Zest',
    sauceGlaze: 'Tart Cherry Preserve, Bourbon, Honey & Balsamic Reduction',
    description: 'Crisp rendered duck skin infused with sweet cherry pecan smoke and brushed with bourbon balsamic glaze.',
    keySteps: [
      'Score duck fat skin in 1/4-inch crosshatch diamond pattern without puncturing underlying breast meat.',
      'Season flesh side with salt, pepper, five-spice, and orange zest.',
      'Place skin-side down in cold cast iron pan first to render fat, then move to 225°F smoker.',
      'Smoke over cherry wood for 45-60 minutes until internal temp reaches 135°F.',
      'Glaze with warm bourbon cherry reduction and flash-sear skin for 1 min to crisp.',
      'Rest 10 mins and slice thin on a bias.'
    ],
    proTip: 'Scoring the duck skin unlocks the fat layer to render smoothly into the pan instead of leaving rubbery skin on the breast.',
    prepTimeMinutes: 15,
    flavorProfile: 'Tart Cherry Glaze, Crisp Skin, Fruity Pecan Smoke',
    tags: ['Wild Game', 'Duck', 'Cherry Glaze', 'Crispy Skin', 'Gourmet']
  }
];
