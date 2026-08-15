// Topic validation only. Administrator and owner authority is established by
// Firebase custom claims on the server, never by email or browser storage.

const BBQ_RELATED_TERMS = [
  'bbq', 'barbecue', 'barbeque', 'smoke', 'smoker', 'grill', 'grilling', 'pellet', 'brisket',
  'pork butt', 'pulled pork', 'ribs', 'steak', 'chicken', 'turkey', 'sausage', 'wings',
  'salmon', 'meat', 'beef', 'pork', 'poultry', 'game', 'venison', 'elk', 'boar', 'bear',
  'duck', 'goose', 'bison', 'tri-tip', 'pork belly', 'burnt ends', 'rub', 'seasoning',
  'marinade', 'glaze', 'sauce', 'mop', 'brine', 'wood', 'hickory', 'oak', 'post oak',
  'pecan', 'apple', 'cherry', 'mesquite', 'alder', 'maple', 'peach', 'blend', 'btu',
  'burn rate', 'hopper', 'firebox', 'baffle', 'gasket', 'controller', 'probe', 'thermometer',
  'temp', 'temperature', 'stall', 'wrap', 'butcher paper', 'foil', 'rest', 'collagen',
  'bark', 'smoke ring', 'moisture', 'humidity', 'ambient', 'sear', 'pitmaster', 'chargpt',
  'cook log', 'smoke stack', 'pit', 'maintenance', 'ash', 'grease', 'drip tray', 'igniter',
  'internal temp', 'usda', 'food safety', 'charcoal', 'lump', 'wood chips', 'wood chunks',
];

export function validateBBQTopicConstraint(prompt: string): { isBBQ: boolean; reason?: string } {
  const cleanPrompt = prompt.toLowerCase().trim();
  if (!cleanPrompt) return { isBBQ: true };
  if (BBQ_RELATED_TERMS.some((term) => cleanPrompt.includes(term))) return { isBBQ: true };

  const nonBBQPatterns = [
    /\b(code|python|javascript|typescript|react|html|css|sql|programming|developer|algorithm|bug|git)\b/i,
    /\b(stock|bitcoin|crypto|investment|finance|bank|mortgage|tax|shares)\b/i,
    /\b(president|election|politics|law|court|congress|senate)\b/i,
    /\b(calculus|homework|geography|astronomy|movie|song)\b/i,
  ];
  if (nonBBQPatterns.some((pattern) => pattern.test(cleanPrompt)) || cleanPrompt.length > 20) {
    return { isBBQ: false, reason: 'This request is outside SmokeStack BBQ, smoking, grilling, equipment, fuel, or food-safety workflows.' };
  }
  return { isBBQ: true };
}
