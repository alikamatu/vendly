export interface CategoryMatchContext {
  breadcrumbs?: string[];
  title?: string;
  description?: string;
  tags?: string[];
  brand?: string;
  url?: string;
}

export const GENERIC_CATEGORY_TOKENS = new Set([
  'home',
  'shop',
  'store',
  'all',
  'all products',
  'products',
  'product',
  'catalog',
  'catalogue',
  'general',
  'other',
  'misc',
  'miscellaneous',
  'uncategorized',
  'default',
  'featured',
  'new',
  'new arrivals',
  'sale',
  'deals',
  'best sellers',
  'trending',
]);

interface SemanticCategoryRule {
  bucket: string;
  /** Tokens used to map this semantic bucket to whichever Category.name exists in Verndly's DB */
  categoryTokens: string[];
  /** High-signal keyword regexes */
  patterns: RegExp[];
  /** Negative patterns that should NOT boost this bucket (e.g. "smartwatch" is Electronics, not Jewelry) */
  excludePatterns?: RegExp[];
}

const SEMANTIC_CATEGORY_RULES: SemanticCategoryRule[] = [
  {
    bucket: 'electronics',
    categoryTokens: ['electronic', 'tech', 'gadget', 'computer', 'phone'],
    patterns: [
      /\b(laptops?|notebook\s*pcs?|macbooks?|thinkpads?|elitebooks?|probooks?|chromebooks?|ultrabooks?|ideapads?|vivobooks?|zenbooks?|pavilion|inspiron|latitude|xps|surface\s*pro)\b/i,
      /\b(desktops?|computers?|pcs?|workstations?|monitors?|displays?|cpus?|processors?|core\s*i[3579]|ryzen|gpus?|graphics\s*cards?|ssds?|nvme|hdds?|ram|motherboards?|keyboards?|mice|mouse|trackpads?|webcams?)\b/i,
      /\b(smartphones?|smart\s*phones?|mobile\s*phones?|iphones?|samsung\s*galaxy|tecno|infinix|itel|redmi|xiaomi|oppo|vivo|huawei|oneplus|google\s*pixel|nokia|tablets?|ipads?|kindles?|e-?readers?)\b/i,
      /\b(headphones?|earphones?|earbuds?|airpods?|headsets?|speakers?|soundbars?|subwoofers?|bluetooth|microphones?|amplifiers?|mixers?|turntables?)\b/i,
      /\b(smart\s*tvs?|televisions?|oled|qled|uhd|4k\s*tvs?|projectors?|streaming\s*sticks?|fire\s*sticks?|chromecasts?|apple\s*tv|decoders?|set-?top)\b/i,
      /\b(cameras?|dslrs?|mirrorless|camcorders?|gopros?|action\s*cams?|drones?|gimbals?|tripods?|ring\s*lights?|lenses?)\b/i,
      /\b(playstations?|ps[345]|xbox|nintendo|switch|gaming\s*consoles?|controllers?|gamepads?|vr\s*headsets?)\b/i,
      /\b(routers?|wi-?fi|modems?|mesh|starlink|ethernet|network\s*switches?|power\s*banks?|powerbanks?|chargers?|fast\s*charg|adapters?|usb-?c|hdmi|lightning\s*cables?|surge\s*protectors?|extension\s*cords?|ups|inverters?|solar\s*panels?|portable\s*power\s*stations?)\b/i,
      /\b(smart\s*watch(?:es)?|smartwatch(?:es)?|apple\s*watch(?:es)?|galaxy\s*watch(?:es)?|garmin|fitbit|fitness\s*trackers?|flash\s*drives?|pendrives?|memory\s*cards?|sd\s*cards?|hard\s*drives?|external\s*drives?|phone\s*cases?|screen\s*protectors?|electronics?|gadgets?|computing|phones?\s*&\s*tablets?)\b/i,
    ],
  },
  {
    bucket: 'home & kitchen',
    categoryTokens: ['home', 'kitchen', 'living', 'appliance', 'furniture'],
    patterns: [
      /\b(standing\s*fans?|pedestal\s*fans?|ceiling\s*fans?|table\s*fans?|tower\s*fans?|wall\s*fans?|rechargeable\s*fans?|ox\s*fans?|mist\s*fans?|fans?)\b/i,
      /\b(air\s*conditioners?|split\s*ac|heaters?|humidifiers?|dehumidifiers?|air\s*purifiers?|ventilators?)\b/i,
      /\b(blenders?|juicers?|food\s*processors?|stand\s*mixers?|hand\s*mixers?|toasters?|electric\s*kettles?|kettles?|microwaves?|ovens?|air\s*fryers?|rice\s*cookers?|pressure\s*cookers?|slow\s*cookers?|coffee\s*makers?|espresso|waffle\s*makers?|sandwich\s*makers?|hot\s*plates?|gas\s*cookers?|gas\s*stoves?|induction\s*cookers?|burners?)\b/i,
      /\b(fridges?|refrigerators?|freezers?|chest\s*freezers?|water\s*dispensers?|washing\s*machines?|washers?|dryers?|dishwashers?|vacuum\s*cleaners?|steam\s*irons?|pressing\s*irons?|dry\s*irons?|ironing\s*boards?)\b/i,
      /\b(cookware|saucepans?|frying\s*pans?|skillets?|woks?|pot\s*sets?|cooking\s*pots?|cutlery|knife\s*sets?|chopping\s*boards?|plates?|dinnerware|bowls?|mugs?|teacups?|flasks?|thermos(?:es)?|tumblers?|water\s*bottles?|glassware|baking|kitchenware|kitchens?)\b/i,
      /\b(sofas?|couches?|armchairs?|dining\s*tables?|coffee\s*tables?|center\s*tables?|bed\s*frames?|mattresses?|pillows?|bedsheets?|bed\s*sheets?|duvets?|comforters?|blankets?|curtains?|drapes?|carpets?|rugs?|doormats?|lamps?|chandeliers?|wall\s*clocks?|mirrors?|bookshelves?|cabinets?|wardrobes?|shoe\s*racks?|laundry\s*baskets?|towels?|bath\s*mats?|mops?|brooms?|trash\s*cans?|dustbins?|home\s*&\s*office|appliances?|furniture|home\s*decor)\b/i,
    ],
  },
  {
    bucket: 'fashion',
    categoryTokens: ['fashion', 'clothing', 'apparel', 'wear', 'shoes'],
    patterns: [
      /\b(t-?shirts?|shirts?|polos?|hoodies?|sweatshirts?|sweaters?|cardigans?|pullovers?|jackets?|coats?|trench|blazers?|suits?|waistcoats?|vests?|dress(?:es)?|gowns?|maxi|midi|mini\s*dress(?:es)?|skirts?|blouses?|crop\s*tops?|tank\s*tops?|bodysuits?|jumpsuits?|rompers?)\b/i,
      /\b(jeans|denim|trousers?|pants|chinos|shorts|joggers?|sweatpants|leggings?|tracksuits?|kaftans?|agbada|kente|ankara|dashiki|boubou|abayas?|kimonos?|hijabs?|smocks?|fugu)\b/i,
      /\b(sneakers?|trainers?|shoes?|boots?|sandals?|slippers?|slides?|flip-?flops?|loafers?|moccasins?|oxfords?|brogues?|heels?|stilettos?|wedges?|flats?|clogs?|crocs|footwear)\b/i,
      /\b(handbags?|tote\s*bags?|shoulder\s*bags?|crossbody|sling\s*bags?|clutches?|purses?|wallets?|cardholders?|backpacks?|duffels?|luggage|suitcases?|belts?|baseball\s*caps?|hats?|beanies?|bucket\s*hats?|scarves?|scarfs?|shawls?|sunglasses|eyewear|socks|boxers|briefs|lingerie|bras?|pajamas|sleepwear|swimwear|bikinis?)\b/i,
      /\b(fashion|clothing|apparel|menswear|womenswear|streetwear|activewear|outfits?)\b/i,
    ],
  },
  {
    bucket: 'jewelry & watches',
    categoryTokens: ['jewelry', 'jewellery', 'watch'],
    patterns: [
      /\b(wrist\s*watch(?:es)?|analog\s*watch(?:es)?|quartz\s*watch(?:es)?|automatic\s*watch(?:es)?|chronographs?|luxury\s*watch(?:es)?|dress\s*watch(?:es)?|rolex|casio|seiko|tissot|fossil|curren|naviforce|poedagar|watch(?:es)?)\b/i,
      /\b(bracelets?|bangles?|cuff\s*bracelets?|necklaces?|pendants?|chains?|chokers?|lockets?|earrings?|stud\s*earrings?|hoop\s*earrings?|rings?|wedding\s*bands?|signet\s*rings?|anklets?|brooches?|tiaras?|jewelry|jewellery|sterling\s*silver|18k\s*gold|24k\s*gold|gold\s*plated|diamonds?|pearls?|gemstones?)\b/i,
    ],
    excludePatterns: [
      /\b(smart\s*watch(?:es)?|smartwatch(?:es)?|apple\s*watch(?:es)?|galaxy\s*watch(?:es)?|garmin|fitbit|watch\s*tv|watch\s*movies?)\b/i,
    ],
  },
  {
    bucket: 'beauty & personal care',
    categoryTokens: ['beauty', 'personal care', 'skincare', 'cosmetic'],
    patterns: [
      /\b(shea\s*butter|body\s*butter|body\s*lotions?|lotions?|moisturizers?|face\s*creams?|night\s*creams?|serums?|vitamin\s*c\s*serum|retinol|niacinamide|hyaluronic|cleansers?|face\s*wash|micellar|toners?|sunscreens?|spf\s*\d+|face\s*masks?|body\s*scrubs?|exfoliants?|black\s*soap|alata\s*samina)\b/i,
      /\b(perfumes?|parfums?|colognes?|fragrances?|eau\s*de\s*parfum|eau\s*de\s*toilette|body\s*mists?|body\s*sprays?|deodorants?|antiperspirants?|roll-?ons?)\b/i,
      /\b(lipsticks?|lip\s*gloss(?:es)?|lip\s*balms?|foundations?|concealers?|mascaras?|eyeliners?|eyeshadows?|blush(?:es)?|bronzers?|highlighters?|setting\s*sprays?|makeup|cosmetics?|nail\s*polish(?:es)?|manicures?|pedicures?)\b/i,
      /\b(shampoos?|conditioners?|hair\s*oils?|hair\s*growth|hair\s*masks?|leave-?in|wigs?|lace\s*fronts?|frontals?|closures?|bundles?|weaves?|braiding\s*hair|edge\s*control|pomades?|hair\s*gels?|hair\s*dryers?|blow\s*dryers?|straighteners?|flat\s*irons?|curling\s*irons?|hair\s*clippers?|beard\s*trimmers?|shavers?|razors?|beard\s*oils?|shower\s*gels?|body\s*wash|soaps?|toothpastes?|toothbrushes?|skincare|beauty|personal\s*care)\b/i,
    ],
  },
  {
    bucket: 'health & wellness',
    categoryTokens: ['health', 'wellness', 'medical', 'pharma'],
    patterns: [
      /\b(vitamins?|multivitamins?|supplements?|omega-?3|fish\s*oil|collagen|magnesium|zinc|iron\s*tablets?|probiotics?|biotin|ashwagandha|moringa|herbal|capsules?|tablets?|protein\s*powders?|whey\s*protein|creatine|bcaa)\b/i,
      /\b(blood\s*pressure|bp\s*monitors?|glucometers?|thermometers?|oximeters?|pulse\s*oximeters?|nebulizers?|stethoscopes?|first\s*aid|bandages?|gauze|wheelchairs?|crutches?|knee\s*braces?|ankle\s*braces?|posture\s*correctors?|waist\s*trainers?|massage\s*guns?|massagers?|essential\s*oils?|aromatherapy|diffusers?|health\s*&\s*wellness|medical)\b/i,
    ],
  },
  {
    bucket: 'sports & outdoors',
    categoryTokens: ['sport', 'outdoor', 'fitness', 'gym'],
    patterns: [
      /\b(dumbbells?|barbells?|kettlebells?|weight\s*plates?|bench\s*press|treadmills?|exercise\s*bikes?|ellipticals?|rowing\s*machines?|yoga\s*mats?|resistance\s*bands?|jump\s*ropes?|skipping\s*ropes?|pull-?up\s*bars?|ab\s*rollers?|gym|fitness|workouts?)\b/i,
      /\b(footballs?|soccer\s*balls?|basketballs?|volleyballs?|tennis\s*rackets?|badminton|ping\s*pong|table\s*tennis|jerseys?|football\s*boots?|cleats|shin\s*guards?|goalkeeper\s*gloves?|boxing\s*gloves?|punching\s*bags?|bicycles?|mountain\s*bikes?|scooters?|skateboards?|rollerblades?|tents?|sleeping\s*bags?|camping|hiking|fishing\s*rods?|swim\s*goggles|sports?\s*&\s*outdoors?)\b/i,
    ],
  },
  {
    bucket: 'food & beverages',
    categoryTokens: ['food', 'beverage', 'grocery', 'drink', 'snack'],
    patterns: [
      /\b(coffee\s*beans?|ground\s*coffee|instant\s*coffee|green\s*tea|black\s*tea|herbal\s*tea|cocoa\s*powder|dark\s*chocolate|chocolate\s*bars?|raw\s*honey|organic\s*honey|shito|pepper\s*sauce|spices?|seasonings?|ginger\s*powder|turmeric|cinnamon)\b/i,
      /\b(jasmin(?:e)?\s*rice|basmati\s*rice|perfumed\s*rice|gari|banku\s*mix|fufu\s*flour|plantain\s*chips|groundnuts?|peanut\s*butter|cashews?|almonds?|pasta|spaghetti|noodles|olive\s*oil|palm\s*oil|coconut\s*oil|granola|oats|cereals?|biscuits?|cookies?|snacks?|jams?|marmalade|ketchup|mayonnaise|wines?|whiskey|whisky|gin|vodka|rum|beers?|fruit\s*juices?|beverages?|grocery|groceries|foods?)\b/i,
    ],
  },
  {
    bucket: 'books & stationery',
    categoryTokens: ['book', 'stationery'],
    patterns: [
      /\b(paperbacks?|hardcovers?|novels?|textbooks?|workbooks?|story\s*books?|children'?s\s*books?|comic\s*books?|manga|biographies?|biography|memoirs?|devotionals?|bibles?|qurans?|dictionaries?|encyclopedias?|self-?help\s*books?|books?)\b/i,
      /\b(notebooks?|spiral\s*notebooks?|journals?|diaries?|diary|sketchbooks?|planners?|fountain\s*pens?|ballpoint\s*pens?|gel\s*pens?|colored\s*pencils?|marker\s*sets?|highlighters?|geometry\s*sets?|stationery)\b/i,
    ],
  },
  {
    bucket: 'office supplies',
    categoryTokens: ['office', 'supplies'],
    patterns: [
      /\b(printers?|laser\s*printers?|inkjets?|scanners?|toners?|ink\s*cartridges?|paper\s*reams?|a4\s*paper|photocopiers?|paper\s*shredders?|laminators?|binding\s*machines?|staplers?|ring\s*binders?|file\s*folders?|clipboards?|whiteboards?|corkboards?|scientific\s*calculators?|label\s*makers?|envelopes?|sticky\s*notes|desk\s*organizers?|office\s*chairs?|ergonomic\s*chairs?|office\s*desks?|office\s*supplies)\b/i,
    ],
  },
  {
    bucket: 'toys & games',
    categoryTokens: ['toy', 'game'],
    patterns: [
      /\b(legos?|building\s*blocks?|dolls?|barbies?|action\s*figures?|plush\s*toys?|teddy\s*bears?|stuffed\s*animals?|board\s*games?|card\s*games?|chess\s*sets?|ludo|scrabble|monopoly|jigsaw\s*puzzles?|rubik|rc\s*cars?|remote\s*control\s*cars?|nerf|playsets?|toy\s*cars?|educational\s*toys?|toys?\s*&\s*games?)\b/i,
    ],
  },
  {
    bucket: 'baby & kids',
    categoryTokens: ['baby', 'kid', 'infant', 'toddler'],
    patterns: [
      /\b(diapers?|pampers|huggies|baby\s*wipes?|strollers?|prams?|baby\s*cribs?|baby\s*cots?|bassinets?|baby\s*carriers?|feeding\s*bottles?|sippy\s*cups?|breast\s*pumps?|bottle\s*sterilizers?|pacifiers?|teethers?|baby\s*bibs?|high\s*chairs?|baby\s*car\s*seats?|baby\s*monitors?|onesies?|baby\s*clothes|baby\s*shower|newborns?|infants?|toddlers?|maternity|baby\s*&\s*kids?)\b/i,
    ],
  },
  {
    bucket: 'vehicles & parts',
    categoryTokens: ['vehicle', 'auto', 'car', 'part', 'motor'],
    patterns: [
      /\b(car\s*tyres?|car\s*tires?|tyres?|tires?|alloy\s*rims?|wheel\s*rims?|brake\s*pads?|brake\s*discs?|spark\s*plugs?|air\s*filters?|oil\s*filters?|engine\s*oil|motor\s*oil|coolants?|car\s*batteries?|car\s*battery|alternators?|starter\s*motors?|headlights?|taillights?|wiper\s*blades?|dash\s*cams?|dashcams?|car\s*stereos?|car\s*seat\s*covers?|floor\s*mats?|motorcycles?|motorbikes?|crash\s*helmets?|riding\s*helmets?|spare\s*parts?|auto\s*parts?|automotive|vehicles?)\b/i,
    ],
  },
  {
    bucket: 'art & crafts',
    categoryTokens: ['art', 'craft'],
    patterns: [
      /\b(acrylic\s*paints?|oil\s*paints?|watercolors?|gouache|stretched\s*canvas(?:es)?|canvas\s*paintings?|easels?|paintbrushes?|wood\s*carvings?|sculptures?|pottery|ceramic\s*vases?|polymer\s*clay|beadwork|beading\s*kits?|sewing\s*machines?|crochet|knitting\s*yarn|embroidery|epoxy\s*resin|craft\s*kits?|calligraphy|wall\s*art|framed\s*prints?|artworks?|art\s*&\s*crafts?)\b/i,
    ],
  },
  {
    bucket: 'services',
    categoryTokens: ['service'],
    patterns: [
      /\b(repair\s*services?|installation\s*services?|consultations?|cleaning\s*services?|photography\s*packages?|videography|web\s*design|tutoring|coaching|catering|event\s*planning|tailoring\s*services?|maintenance\s*plans?)\b/i,
    ],
  },
];

function findDbCategoryForBucket(
  rule: SemanticCategoryRule,
  availableCategories: string[],
): string | null {
  const exact = availableCategories.find(
    (c) => c.toLowerCase() === rule.bucket,
  );
  if (exact) return exact;
  for (const token of rule.categoryTokens) {
    const found = availableCategories.find((c) =>
      c.toLowerCase().includes(token),
    );
    if (found) return found;
  }
  return null;
}

export function matchCategoryName(
  rawCategory: string | undefined | null,
  availableCategories: string[],
  context?: CategoryMatchContext,
): string {
  const fallback = availableCategories[0] || 'General';
  if (availableCategories.length === 0) return fallback;

  // 1. Direct exact/clean substring match against explicit rawCategory & breadcrumbs
  const rawParts = [
    ...(rawCategory ? rawCategory.split(/[>/,|›»]/) : []),
    ...(context?.breadcrumbs || []).flatMap((b) => b.split(/[>/,|›»]/)),
  ]
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length >= 2 && !GENERIC_CATEGORY_TOKENS.has(p));

  for (const part of rawParts) {
    const exact = availableCategories.find((c) => c.toLowerCase() === part);
    if (exact) return exact;
  }
  for (const part of rawParts) {
    if (part.length < 4) continue;
    const partial = availableCategories.find((c) => {
      const lowerC = c.toLowerCase();
      return (
        lowerC === part ||
        (part.length >= 5 && lowerC.includes(part)) ||
        (lowerC.length >= 5 && part.includes(lowerC))
      );
    });
    if (partial) return partial;
  }

  // 2. Weighted semantic keyword scoring across category, breadcrumbs, tags, title, URL, and description
  const weightedFields: Array<{ text: string; weight: number }> = [
    { text: (rawCategory || '').trim(), weight: 6 },
    {
      text: (context?.breadcrumbs || [])
        .filter((b) => !GENERIC_CATEGORY_TOKENS.has(b.trim().toLowerCase()))
        .join(' '),
      weight: 4,
    },
    { text: (context?.tags || []).join(' '), weight: 3 },
    { text: (context?.title || '').trim(), weight: 3 },
    { text: (context?.brand || '').trim(), weight: 2 },
    {
      text: (context?.url || '')
        .replace(/^https?:\/\/[^/]+/i, '')
        .replace(/[-_/.?=&]+/g, ' '),
      weight: 2,
    },
    { text: (context?.description || '').slice(0, 500), weight: 1 },
  ].filter((f) => f.text.length > 0);

  if (weightedFields.length === 0) return fallback;

  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const rule of SEMANTIC_CATEGORY_RULES) {
    const mappedDbCat = findDbCategoryForBucket(rule, availableCategories);
    if (!mappedDbCat) continue;

    let score = 0;
    for (const field of weightedFields) {
      const excluded =
        rule.excludePatterns?.some((ex) => ex.test(field.text)) ?? false;
      if (excluded) continue;

      let matchedRulesInField = 0;
      for (const pat of rule.patterns) {
        if (pat.test(field.text)) {
          matchedRulesInField += 1;
        }
      }
      if (matchedRulesInField > 0) {
        score += field.weight * Math.min(matchedRulesInField, 3);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = mappedDbCat;
    }
  }

  return bestCategory || fallback;
}
