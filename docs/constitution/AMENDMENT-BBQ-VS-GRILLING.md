# SMOKESTACK ENGINEERING CONSTITUTION — CULINARY DEFINITIONS AMENDMENT

Status: Governing amendment
Date: 2026-08-13
Scope: culinary classification, meat knowledge ingestion, CharGPT terminology, analytics, recipes, planner, and UI labels

## 1. Purpose
SmokeStack MUST distinguish barbecue from grilling using cooking method rather than appliance name, sauce, marketing language, or user shorthand.

## 2. Governing definitions

### BARBECUE / BBQ
For SmokeStack classification, **barbecue (BBQ)** means a smoke-involved dry-heat cooking process intentionally operated at comparatively low cooking temperatures for an extended period to develop smoke character and/or tenderness. The canonical SmokeStack BBQ profile is low-and-slow, commonly using indirect heat.

A cook MAY still be classified as barbecue when a credible culinary source describes a direct-heat barbecue tradition; therefore indirect heat is a strong canonical characteristic, not an absolute universal requirement. Smoke involvement and the source-described barbecue method are controlling evidence.

### SMOKING
**Smoking** is the indirect cooking of food in the presence of a fire/smoke source. SmokeStack treats smoking as a core barbecue technique when used as the cooking process, while preserving `smoking` as a more precise technique label where useful.

### GRILLING
For SmokeStack classification, **grilling** means cooking primarily by direct, comparatively intense radiant heat at or near the heat source, normally producing substantially shorter cook times than low-and-slow barbecue. A food does not become BBQ merely because barbecue sauce is applied or because the appliance is sold as a barbecue/grill.

### INDIRECT GRILLING / HYBRID METHODS
Indirect cooking on a grill is not automatically barbecue. SmokeStack MUST classify the actual process from supported evidence: heat relationship, smoke application, temperature/time profile, and the source's technique description. Hybrid cooks may carry multiple technique tags rather than being forced into a false binary.

## 3. Evidence hierarchy
Culinary classification claims MUST retain source provenance. Preferred evidence order:
1. Government food-safety or agricultural sources for safety/process facts.
2. Accredited culinary education sources for culinary technique definitions.
3. University meat-science / extension sources for barbecue process and meat-science claims.
4. Approved primary industry sources for product-specific claims.

Community entries, recipes, retailer copy, AI output, and inferred values MUST NOT be promoted to verified culinary definitions without independent qualifying evidence.

## 4. Source basis for this amendment
- USDA Food Safety and Inspection Service, `Smoking Meat and Poultry`: smoking is slowly cooking food indirectly over a fire; USDA instructs monitoring smoker/grill air temperature between 225–300°F for safe smoking. https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/smoking-meat-and-poultry
- USDA FSIS, `Grilling Food Safely`: describes smoking as indirect and much slower than grilling. https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/grilling-food-safely
- The Culinary Institute of America, `Technique of the Quarter: Barbecue`: distinguishes barbecue from grilling; describes smoke, low temperatures and long cooking as core barbecue characteristics, while also documenting both indirect low-temperature and direct higher-temperature barbecue applications. https://www.ciachef.edu/wp-content/uploads/2024/07/barbecue.pdf
- Texas A&M Meat Science, `Cooking and Smoking Barbecue`: describes barbecue as commonly `low and slow`, typically 200–250°F for large cuts, with indirect cookery most often used. https://meat.tamu.edu/texas-bbq/cooking-and-smoking/

## 5. Data-system requirements
1. `cookingMethod` MUST be claim-scoped and source-backed when marked verified.
2. Allowed technique tags SHOULD include `barbecue`, `smoking`, `grilling`, `indirect_grilling`, `roasting`, `braising`, and `hybrid`.
3. A scraper MUST NOT infer `barbecue` solely from the words `BBQ`, `barbecue sauce`, appliance category, recipe title, or retailer taxonomy.
4. Temperature, time, doneness, tenderness, anatomy, cut identity, and technique are separate claims with separate provenance.
5. USDA safety minimums MUST remain distinct from culinary finish/tenderness targets.
6. Conflicting credible sources MUST be preserved as competing claims for review; the scraper MUST NOT silently select a winner.
7. Harvested data enters as `candidate` and requires the existing review/publish boundary before becoming verified/shared knowledge.

## 6. Non-fabrication rule
No scraper, AI process, UI, analytics system, or market system may create a missing culinary fact, source, timestamp, market price, cook time, temperature, cut identity, or verification state. Unknown means unknown.
