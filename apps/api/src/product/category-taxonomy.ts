export interface SubcategoryDefinition {
  name: string;
  /** Semantic keywords used both to classify new products and to match legacy products in GET /products?subcategory=... */
  keywords: string[];
  patterns: RegExp[];
}

export interface CategoryTaxonomyEntry {
  bucket: string;
  categoryTokens: string[];
  subcategories: SubcategoryDefinition[];
}

export interface ProductDimensions {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: 'cm' | 'mm' | 'in' | 'm';
}

export interface ProductWeight {
  value?: number | null;
  unit?: 'kg' | 'g' | 'lb';
}

export interface StructuredProductAttributes {
  subcategory?: string;
  dimensions?: ProductDimensions;
  weight?: ProductWeight;
  color?: string;
  material?: string;
  size?: string;
  warranty?: string;
  sku?: string;
  [key: string]: unknown;
}

export const CATEGORY_SUBCATEGORIES: CategoryTaxonomyEntry[] = [
  {
    bucket: 'electronics',
    categoryTokens: ['electronic', 'tech', 'gadget', 'computer', 'phone'],
    subcategories: [
      {
        name: 'Phones',
        keywords: [
          'phone',
          'smartphone',
          'iphone',
          'samsung galaxy',
          'tecno',
          'infinix',
          'redmi',
          'xiaomi',
          'pixel',
          'itel',
        ],
        patterns: [
          /\b(smartphones?|smart\s*phones?|mobile\s*phones?|iphones?|samsung\s*galaxy\s*[aszm]|tecno|infinix|itel|redmi|xiaomi|oppo|vivo|oneplus|google\s*pixel|huawei\s*p\d+|nokia)\b/i,
        ],
      },
      {
        name: 'Laptops',
        keywords: [
          'laptop',
          'macbook',
          'notebook',
          'thinkpad',
          'elitebook',
          'hp pavilion',
          'dell xps',
          'chromebook',
        ],
        patterns: [
          /\b(laptops?|macbooks?|notebooks?|thinkpads?|elitebooks?|probooks?|chromebooks?|ultrabooks?|ideapads?|vivobooks?|zenbooks?|pavilion|inspiron|latitude|xps|surface\s*laptop)\b/i,
        ],
      },
      {
        name: 'Tablets',
        keywords: ['tablet', 'ipad', 'galaxy tab', 'kindle', 'surface pro'],
        patterns: [
          /\b(tablets?|ipads?|galaxy\s*tab|lenovo\s*tab|kindles?|e-?readers?|surface\s*pro)\b/i,
        ],
      },
      {
        name: 'Audio & Headphones',
        keywords: [
          'headphone',
          'earbud',
          'airpods',
          'speaker',
          'soundbar',
          'microphone',
          'jbl',
        ],
        patterns: [
          /\b(headphones?|earphones?|earbuds?|airpods?|headsets?|speakers?|soundbars?|subwoofers?|microphones?|jbl|beats|bose|sony\s*wh)\b/i,
        ],
      },
      {
        name: 'Smartwatches',
        keywords: [
          'smartwatch',
          'apple watch',
          'galaxy watch',
          'fitness tracker',
          'fitbit',
        ],
        patterns: [
          /\b(smart\s*watch(?:es)?|smartwatch(?:es)?|apple\s*watch|galaxy\s*watch|garmin|fitbit|fitness\s*trackers?|mi\s*band)\b/i,
        ],
      },
      {
        name: 'TVs & Monitors',
        keywords: [
          'tv',
          'television',
          'monitor',
          'projector',
          'display',
          'smart tv',
        ],
        patterns: [
          /\b(smart\s*tvs?|televisions?|oled|qled|uhd|4k\s*tvs?|monitors?|projectors?|displays?)\b/i,
        ],
      },
      {
        name: 'Cameras & Drones',
        keywords: [
          'camera',
          'dslr',
          'drone',
          'gopro',
          'gimbal',
          'tripod',
          'ring light',
        ],
        patterns: [
          /\b(cameras?|dslrs?|mirrorless|camcorders?|gopros?|action\s*cams?|drones?|gimbals?|tripods?|ring\s*lights?|lenses?)\b/i,
        ],
      },
      {
        name: 'Gaming',
        keywords: [
          'playstation',
          'ps5',
          'ps4',
          'xbox',
          'nintendo',
          'controller',
          'gaming',
        ],
        patterns: [
          /\b(playstations?|ps[345]|xbox|nintendo|switch|gaming\s*consoles?|controllers?|gamepads?|vr\s*headsets?)\b/i,
        ],
      },
      {
        name: 'Chargers & Accessories',
        keywords: [
          'charger',
          'power bank',
          'cable',
          'adapter',
          'phone case',
          'router',
          'flash drive',
          'keyboard',
          'mouse',
        ],
        patterns: [
          /\b(power\s*banks?|powerbanks?|chargers?|adapters?|usb-?c|hdmi|lightning\s*cables?|phone\s*cases?|screen\s*protectors?|routers?|wi-?fi|starlink|flash\s*drives?|ssds?|hard\s*drives?|keyboards?|mice|mouse|webcams?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'fashion',
    categoryTokens: ['fashion', 'clothing', 'apparel', 'wear', 'shoes'],
    subcategories: [
      {
        name: "Women's Dresses",
        keywords: [
          'dress',
          'gown',
          'maxi dress',
          'midi dress',
          'mini dress',
          'jumpsuit',
          'skirt',
        ],
        patterns: [
          /\b(dress(?:es)?|gowns?|maxi\s*dress(?:es)?|midi\s*dress(?:es)?|mini\s*dress(?:es)?|evening\s*dress|bodycon|sundress|jumpsuits?|rompers?)\b/i,
        ],
      },
      {
        name: "Women's Clothing",
        keywords: [
          'blouse',
          'crop top',
          'skirt',
          'leggings',
          'bodysuit',
          'lingerie',
          'bikini',
          'womens',
        ],
        patterns: [
          /\b(blouses?|crop\s*tops?|tank\s*tops?|skirts?|bodysuits?|leggings?|lingerie|bras?|swimwear|bikinis?|womenswear|women'?s)\b/i,
        ],
      },
      {
        name: "Men's Clothing",
        keywords: [
          'shirt',
          't-shirt',
          'polo',
          'hoodie',
          'jeans',
          'trousers',
          'suit',
          'jacket',
          'mens',
        ],
        patterns: [
          /\b(t-?shirts?|shirts?|polos?|hoodies?|sweatshirts?|sweaters?|jackets?|coats?|blazers?|suits?|jeans|denim|trousers?|pants|chinos|shorts|joggers?|menswear|men'?s|boxers)\b/i,
        ],
      },
      {
        name: 'Shoes',
        keywords: [
          'shoe',
          'sneaker',
          'boot',
          'sandal',
          'heel',
          'loafer',
          'slipper',
          'slide',
          'footwear',
        ],
        patterns: [
          /\b(sneakers?|trainers?|shoes?|boots?|sandals?|slippers?|slides?|flip-?flops?|loafers?|moccasins?|oxfords?|brogues?|heels?|stilettos?|wedges?|flats?|clogs?|crocs|footwear)\b/i,
        ],
      },
      {
        name: 'Bags & Handbags',
        keywords: [
          'bag',
          'handbag',
          'tote',
          'backpack',
          'purse',
          'wallet',
          'clutch',
          'luggage',
        ],
        patterns: [
          /\b(handbags?|tote\s*bags?|shoulder\s*bags?|crossbody|sling\s*bags?|clutches?|purses?|wallets?|cardholders?|backpacks?|duffels?|luggage|suitcases?|bags?)\b/i,
        ],
      },
      {
        name: 'African Wear & Kente',
        keywords: [
          'kente',
          'ankara',
          'kaftan',
          'agbada',
          'dashiki',
          'smock',
          'fugu',
          'boubou',
        ],
        patterns: [
          /\b(kente|ankara|kaftans?|agbada|dashiki|boubou|smocks?|fugu|african\s*print|african\s*wear)\b/i,
        ],
      },
      {
        name: 'Watches & Accessories',
        keywords: ['watch', 'belt', 'scarf', 'tie', 'socks'],
        patterns: [
          /\b(watches?|belts?|scarves?|scarfs?|shawls?|ties?|cufflinks?|socks)\b/i,
        ],
      },
      {
        name: 'Eyewear & Caps',
        keywords: [
          'sunglasses',
          'glasses',
          'cap',
          'hat',
          'beanie',
          'bucket hat',
        ],
        patterns: [
          /\b(sunglasses|eyewear|glasses|baseball\s*caps?|caps?|hats?|beanies?|bucket\s*hats?)\b/i,
        ],
      },
      {
        name: 'Sportswear',
        keywords: [
          'tracksuit',
          'jersey',
          'activewear',
          'gym wear',
          'sweatpants',
        ],
        patterns: [
          /\b(tracksuits?|jerseys?|activewear|sportswear|gym\s*wear|sweatpants)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'jewelry & watches',
    categoryTokens: ['jewelry', 'jewellery', 'watch'],
    subcategories: [
      {
        name: 'Watches',
        keywords: [
          'watch',
          'wristwatch',
          'chronograph',
          'rolex',
          'casio',
          'seiko',
          'tissot',
          'fossil',
        ],
        patterns: [
          /\b(wrist\s*watch(?:es)?|analog\s*watch(?:es)?|quartz\s*watch(?:es)?|automatic\s*watch(?:es)?|chronographs?|rolex|casio|seiko|tissot|fossil|curren|naviforce|poedagar|watch(?:es)?)\b/i,
        ],
      },
      {
        name: 'Necklaces & Chains',
        keywords: ['necklace', 'chain', 'pendant', 'choker', 'locket'],
        patterns: [/\b(necklaces?|chains?|pendants?|chokers?|lockets?)\b/i],
      },
      {
        name: 'Rings',
        keywords: ['ring', 'wedding band', 'engagement ring', 'signet'],
        patterns: [/\b(rings?|wedding\s*bands?|signet\s*rings?|engagement)\b/i],
      },
      {
        name: 'Bracelets',
        keywords: ['bracelet', 'bangle', 'cuff', 'anklet'],
        patterns: [/\b(bracelets?|bangles?|cuff\s*bracelets?|anklets?)\b/i],
      },
      {
        name: 'Earrings',
        keywords: ['earring', 'stud', 'hoop'],
        patterns: [/\b(earrings?|stud\s*earrings?|hoop\s*earrings?)\b/i],
      },
      {
        name: 'Luxury Sets',
        keywords: [
          'jewelry set',
          'bridal set',
          'diamond',
          'gold plated',
          'pearl',
        ],
        patterns: [
          /\b(jewelry\s*sets?|bridal\s*sets?|diamonds?|pearls?|gemstones?|brooches?|tiaras?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'beauty & personal care',
    categoryTokens: ['beauty', 'personal care', 'skincare', 'cosmetic'],
    subcategories: [
      {
        name: 'Perfumes & Fragrances',
        keywords: [
          'perfume',
          'parfum',
          'cologne',
          'fragrance',
          'body mist',
          'body spray',
          'deodorant',
        ],
        patterns: [
          /\b(perfumes?|parfums?|colognes?|fragrances?|eau\s*de\s*parfum|eau\s*de\s*toilette|body\s*mists?|body\s*sprays?|deodorants?|oud|attar)\b/i,
        ],
      },
      {
        name: 'Skincare',
        keywords: [
          'skincare',
          'serum',
          'cleanser',
          'moisturizer',
          'sunscreen',
          'toner',
          'face cream',
          'black soap',
        ],
        patterns: [
          /\b(skincare|serums?|vitamin\s*c|retinol|niacinamide|hyaluronic|cleansers?|face\s*wash|micellar|toners?|sunscreens?|spf|face\s*creams?|face\s*masks?|moisturizers?|black\s*soap)\b/i,
        ],
      },
      {
        name: 'Hair & Wigs',
        keywords: [
          'wig',
          'lace front',
          'hair',
          'shampoo',
          'conditioner',
          'bundles',
          'braiding',
        ],
        patterns: [
          /\b(wigs?|lace\s*fronts?|frontals?|closures?|bundles?|weaves?|braiding\s*hair|shampoos?|conditioners?|hair\s*oils?|hair\s*growth|edge\s*control|hair\s*dryers?|straighteners?)\b/i,
        ],
      },
      {
        name: 'Makeup',
        keywords: [
          'lipstick',
          'foundation',
          'concealer',
          'mascara',
          'eyeshadow',
          'makeup',
          'lip gloss',
        ],
        patterns: [
          /\b(lipsticks?|lip\s*gloss(?:es)?|lip\s*balms?|foundations?|concealers?|mascaras?|eyeliners?|eyeshadows?|blush(?:es)?|bronzers?|highlighters?|makeup|cosmetics?|nail\s*polish)\b/i,
        ],
      },
      {
        name: 'Body Care',
        keywords: [
          'shea butter',
          'body butter',
          'body lotion',
          'body wash',
          'scrub',
          'soap',
        ],
        patterns: [
          /\b(shea\s*butter|body\s*butter|body\s*lotions?|lotions?|body\s*scrubs?|shower\s*gels?|body\s*wash|soaps?)\b/i,
        ],
      },
      {
        name: 'Grooming & Shaving',
        keywords: ['clipper', 'trimmer', 'shaver', 'razor', 'beard oil'],
        patterns: [
          /\b(clippers?|trimmers?|shavers?|razors?|beard\s*oils?|grooming)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'home & kitchen',
    categoryTokens: ['home', 'kitchen', 'living', 'appliance', 'furniture'],
    subcategories: [
      {
        name: 'Kitchen Appliances',
        keywords: [
          'blender',
          'air fryer',
          'microwave',
          'kettle',
          'rice cooker',
          'fridge',
          'freezer',
          'toaster',
          'gas cooker',
        ],
        patterns: [
          /\b(blenders?|juicers?|food\s*processors?|mixers?|toasters?|kettles?|microwaves?|ovens?|air\s*fryers?|rice\s*cookers?|pressure\s*cookers?|coffee\s*makers?|gas\s*cookers?|fridges?|refrigerators?|freezers?|water\s*dispensers?)\b/i,
        ],
      },
      {
        name: 'Cookware & Dining',
        keywords: [
          'pot',
          'pan',
          'cookware',
          'cutlery',
          'plate',
          'flask',
          'tumbler',
          'mug',
          'water bottle',
        ],
        patterns: [
          /\b(cookware|saucepans?|frying\s*pans?|skillets?|woks?|cooking\s*pots?|cutlery|knife\s*sets?|plates?|dinnerware|bowls?|mugs?|flasks?|thermos|tumblers?|water\s*bottles?|glassware)\b/i,
        ],
      },
      {
        name: 'Fans & Cooling',
        keywords: [
          'fan',
          'standing fan',
          'air conditioner',
          'ac',
          'humidifier',
          'heater',
        ],
        patterns: [
          /\b(standing\s*fans?|pedestal\s*fans?|ceiling\s*fans?|table\s*fans?|rechargeable\s*fans?|fans?|air\s*conditioners?|split\s*ac|humidifiers?|air\s*purifiers?)\b/i,
        ],
      },
      {
        name: 'Furniture',
        keywords: [
          'sofa',
          'table',
          'chair',
          'bed',
          'mattress',
          'wardrobe',
          'cabinet',
          'bookshelf',
        ],
        patterns: [
          /\b(sofas?|couches?|armchairs?|tables?|bed\s*frames?|mattresses?|bookshelves?|cabinets?|wardrobes?|shoe\s*racks?)\b/i,
        ],
      },
      {
        name: 'Bedding & Decor',
        keywords: [
          'bedsheet',
          'duvet',
          'pillow',
          'curtain',
          'carpet',
          'rug',
          'lamp',
          'mirror',
          'clock',
        ],
        patterns: [
          /\b(bedsheets?|bed\s*sheets?|duvets?|comforters?|pillows?|blankets?|curtains?|carpets?|rugs?|lamps?|chandeliers?|mirrors?|wall\s*clocks?|home\s*decor)\b/i,
        ],
      },
      {
        name: 'Storage & Cleaning',
        keywords: [
          'vacuum',
          'iron',
          'washing machine',
          'mop',
          'laundry',
          'dustbin',
        ],
        patterns: [
          /\b(washing\s*machines?|vacuum\s*cleaners?|irons?|ironing\s*boards?|laundry\s*baskets?|mops?|brooms?|dustbins?|trash\s*cans?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'health & wellness',
    categoryTokens: ['health', 'wellness', 'medical', 'pharma'],
    subcategories: [
      {
        name: 'Vitamins & Supplements',
        keywords: [
          'vitamin',
          'supplement',
          'collagen',
          'omega',
          'protein',
          'moringa',
          'probiotic',
        ],
        patterns: [
          /\b(vitamins?|multivitamins?|supplements?|omega-?3|collagen|magnesium|zinc|probiotics?|biotin|ashwagandha|moringa|protein\s*powders?|creatine)\b/i,
        ],
      },
      {
        name: 'Medical Devices',
        keywords: [
          'blood pressure',
          'thermometer',
          'oximeter',
          'glucometer',
          'nebulizer',
          'first aid',
        ],
        patterns: [
          /\b(blood\s*pressure|bp\s*monitors?|glucometers?|thermometers?|oximeters?|nebulizers?|stethoscopes?|first\s*aid)\b/i,
        ],
      },
      {
        name: 'Fitness Recovery',
        keywords: [
          'massage gun',
          'massager',
          'waist trainer',
          'posture',
          'brace',
        ],
        patterns: [
          /\b(massage\s*guns?|massagers?|waist\s*trainers?|posture|braces?)\b/i,
        ],
      },
      {
        name: 'Aromatherapy',
        keywords: ['essential oil', 'diffuser', 'aromatherapy'],
        patterns: [/\b(essential\s*oils?|aromatherapy|diffusers?)\b/i],
      },
    ],
  },
  {
    bucket: 'sports & outdoors',
    categoryTokens: ['sport', 'outdoor', 'fitness', 'gym'],
    subcategories: [
      {
        name: 'Gym & Fitness',
        keywords: [
          'dumbbell',
          'treadmill',
          'yoga mat',
          'resistance band',
          'jump rope',
          'gym',
        ],
        patterns: [
          /\b(dumbbells?|barbells?|kettlebells?|treadmills?|exercise\s*bikes?|yoga\s*mats?|resistance\s*bands?|jump\s*ropes?|ab\s*rollers?|gym|fitness)\b/i,
        ],
      },
      {
        name: 'Football & Team Sports',
        keywords: [
          'football',
          'soccer',
          'basketball',
          'boot',
          'cleats',
          'boxing',
        ],
        patterns: [
          /\b(footballs?|soccer|basketballs?|football\s*boots?|cleats|shin\s*guards?|goalkeeper|boxing|tennis|badminton)\b/i,
        ],
      },
      {
        name: 'Outdoor & Camping',
        keywords: ['tent', 'camping', 'hiking', 'fishing', 'sleeping bag'],
        patterns: [/\b(tents?|sleeping\s*bags?|camping|hiking|fishing)\b/i],
      },
      {
        name: 'Cycling & Mobility',
        keywords: ['bicycle', 'bike', 'scooter', 'skateboard'],
        patterns: [
          /\b(bicycles?|mountain\s*bikes?|scooters?|skateboards?|rollerblades?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'food & beverages',
    categoryTokens: ['food', 'beverage', 'grocery', 'drink', 'snack'],
    subcategories: [
      {
        name: 'Local Staples & Spices',
        keywords: [
          'shito',
          'gari',
          'rice',
          'spice',
          'honey',
          'banku',
          'fufu',
          'pepper',
        ],
        patterns: [
          /\b(shito|gari|rice|spices?|seasonings?|honey|banku|fufu|ginger|turmeric|cinnamon)\b/i,
        ],
      },
      {
        name: 'Snacks & Sweets',
        keywords: [
          'chocolate',
          'plantain chips',
          'biscuit',
          'cookie',
          'cashew',
          'groundnut',
          'granola',
        ],
        patterns: [
          /\b(chocolates?|plantain\s*chips|groundnuts?|cashews?|almonds?|biscuits?|cookies?|snacks?|granola)\b/i,
        ],
      },
      {
        name: 'Coffee & Tea',
        keywords: ['coffee', 'tea', 'cocoa'],
        patterns: [/\b(coffee|tea|cocoa\s*powder)\b/i],
      },
      {
        name: 'Drinks & Juices',
        keywords: ['juice', 'wine', 'whisky', 'drink', 'beverage', 'sobolo'],
        patterns: [
          /\b(juices?|wines?|whiskey|whisky|gin|vodka|rum|beers?|beverages?|sobolo|drinks?)\b/i,
        ],
      },
      {
        name: 'Oils & Pantry',
        keywords: [
          'olive oil',
          'palm oil',
          'coconut oil',
          'peanut butter',
          'pasta',
          'jam',
        ],
        patterns: [
          /\b(olive\s*oil|palm\s*oil|coconut\s*oil|peanut\s*butter|pasta|spaghetti|noodles|jams?|ketchup|mayonnaise)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'baby & kids',
    categoryTokens: ['baby', 'kid', 'infant', 'toddler'],
    subcategories: [
      {
        name: 'Baby Gear & Strollers',
        keywords: [
          'stroller',
          'crib',
          'cot',
          'carrier',
          'car seat',
          'high chair',
        ],
        patterns: [
          /\b(strollers?|prams?|cribs?|cots?|bassinets?|carriers?|car\s*seats?|high\s*chairs?|baby\s*monitors?)\b/i,
        ],
      },
      {
        name: 'Diapers & Care',
        keywords: ['diaper', 'pampers', 'huggies', 'baby wipe'],
        patterns: [/\b(diapers?|pampers|huggies|baby\s*wipes?)\b/i],
      },
      {
        name: 'Feeding',
        keywords: [
          'feeding bottle',
          'breast pump',
          'sterilizer',
          'pacifier',
          'bib',
        ],
        patterns: [
          /\b(feeding\s*bottles?|sippy\s*cups?|breast\s*pumps?|sterilizers?|pacifiers?|teethers?|bibs?)\b/i,
        ],
      },
      {
        name: 'Kids Clothing',
        keywords: ['onesie', 'baby clothes', 'kids', 'toddler', 'newborn'],
        patterns: [
          /\b(onesies?|baby\s*clothes|kids?\s*clothing|newborns?|toddlers?|maternity)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'books & stationery',
    categoryTokens: ['book', 'stationery'],
    subcategories: [
      {
        name: 'Books & Novels',
        keywords: [
          'novel',
          'book',
          'biography',
          'bible',
          'devotional',
          'manga',
        ],
        patterns: [
          /\b(novels?|books?|paperbacks?|hardcovers?|biographies?|devotionals?|bibles?|qurans?|manga)\b/i,
        ],
      },
      {
        name: 'Textbooks & Study',
        keywords: ['textbook', 'workbook', 'dictionary', 'encyclopedia'],
        patterns: [
          /\b(textbooks?|workbooks?|dictionaries?|encyclopedias?|study)\b/i,
        ],
      },
      {
        name: 'Notebooks & Pens',
        keywords: [
          'notebook',
          'journal',
          'planner',
          'pen',
          'pencil',
          'marker',
          'stationery',
        ],
        patterns: [
          /\b(notebooks?|journals?|diaries?|planners?|sketchbooks?|pens?|pencils?|markers?|highlighters?|stationery)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'office supplies',
    categoryTokens: ['office', 'supplies'],
    subcategories: [
      {
        name: 'Printers & Tech',
        keywords: [
          'printer',
          'scanner',
          'toner',
          'cartridge',
          'shredder',
          'laminator',
          'calculator',
        ],
        patterns: [
          /\b(printers?|scanners?|toners?|ink\s*cartridges?|photocopiers?|shredders?|laminators?|calculators?)\b/i,
        ],
      },
      {
        name: 'Office Furniture',
        keywords: ['office chair', 'ergonomic chair', 'office desk'],
        patterns: [
          /\b(office\s*chairs?|ergonomic\s*chairs?|office\s*desks?)\b/i,
        ],
      },
      {
        name: 'Paper & Filing',
        keywords: [
          'a4 paper',
          'binder',
          'folder',
          'stapler',
          'whiteboard',
          'organizer',
        ],
        patterns: [
          /\b(a4\s*paper|paper\s*reams?|binders?|folders?|staplers?|whiteboards?|envelopes?|organizers?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'toys & games',
    categoryTokens: ['toy', 'game'],
    subcategories: [
      {
        name: 'Educational Toys',
        keywords: ['lego', 'building blocks', 'puzzle', 'rubik', 'educational'],
        patterns: [
          /\b(legos?|building\s*blocks?|puzzles?|rubik|educational\s*toys?)\b/i,
        ],
      },
      {
        name: 'Board & Card Games',
        keywords: [
          'board game',
          'card game',
          'chess',
          'ludo',
          'scrabble',
          'monopoly',
        ],
        patterns: [
          /\b(board\s*games?|card\s*games?|chess|ludo|scrabble|monopoly)\b/i,
        ],
      },
      {
        name: 'Plush & Dolls',
        keywords: ['doll', 'barbie', 'teddy bear', 'plush', 'rc car', 'nerf'],
        patterns: [
          /\b(dolls?|barbies?|teddy\s*bears?|plush|action\s*figures?|rc\s*cars?|nerf|playsets?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'vehicles & parts',
    categoryTokens: ['vehicle', 'auto', 'car', 'part', 'motor'],
    subcategories: [
      {
        name: 'Car Parts & Tires',
        keywords: [
          'tire',
          'tyre',
          'rim',
          'brake',
          'battery',
          'spark plug',
          'headlight',
          'filter',
        ],
        patterns: [
          /\b(tires?|tyres?|rims?|brake\s*pads?|car\s*batter|spark\s*plugs?|headlights?|taillights?|filters?|alternators?)\b/i,
        ],
      },
      {
        name: 'Car Electronics',
        keywords: ['dash cam', 'car stereo', 'gps', 'reverse camera'],
        patterns: [/\b(dash\s*cams?|dashcams?|car\s*stereos?|car\s*audio)\b/i],
      },
      {
        name: 'Motorbikes & Helmets',
        keywords: ['motorcycle', 'motorbike', 'helmet'],
        patterns: [/\b(motorcycles?|motorbikes?|helmets?)\b/i],
      },
      {
        name: 'Oils & Care',
        keywords: [
          'engine oil',
          'motor oil',
          'coolant',
          'seat cover',
          'floor mat',
        ],
        patterns: [
          /\b(engine\s*oil|motor\s*oil|coolants?|seat\s*covers?|floor\s*mats?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'art & crafts',
    categoryTokens: ['art', 'craft'],
    subcategories: [
      {
        name: 'Paintings & Wall Art',
        keywords: ['painting', 'canvas', 'wall art', 'framed print', 'artwork'],
        patterns: [
          /\b(paintings?|canvas|wall\s*art|framed\s*prints?|artworks?)\b/i,
        ],
      },
      {
        name: 'Craft Supplies',
        keywords: [
          'paint',
          'brush',
          'resin',
          'yarn',
          'beading',
          'sewing machine',
          'clay',
        ],
        patterns: [
          /\b(acrylic\s*paints?|oil\s*paints?|watercolors?|paintbrushes?|resin|yarn|beading|sewing\s*machines?|embroidery|clay)\b/i,
        ],
      },
      {
        name: 'Handmade & Carvings',
        keywords: ['carving', 'sculpture', 'pottery', 'vase', 'handmade'],
        patterns: [
          /\b(carvings?|sculptures?|pottery|ceramic\s*vases?|handmade)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'services',
    categoryTokens: ['service'],
    subcategories: [
      {
        name: 'Repairs & Tech',
        keywords: ['repair', 'installation', 'maintenance', 'web design'],
        patterns: [/\b(repair|installation|maintenance|web\s*design)\b/i],
      },
      {
        name: 'Events & Media',
        keywords: ['photography', 'videography', 'catering', 'event planning'],
        patterns: [/\b(photography|videography|catering|event\s*planning)\b/i],
      },
      {
        name: 'Home Services',
        keywords: ['cleaning', 'tailoring', 'tutoring', 'consultation'],
        patterns: [/\b(cleaning|tailoring|tutoring|consultation|coaching)\b/i],
      },
    ],
  },
];

export const ALL_SUBCATEGORIES: SubcategoryDefinition[] =
  CATEGORY_SUBCATEGORIES.flatMap((entry) => entry.subcategories);

export const ALL_SUBCATEGORY_NAMES: string[] = Array.from(
  new Set(ALL_SUBCATEGORIES.map((s) => s.name)),
);

export function getSubcategoriesForCategory(
  categoryName: string | undefined | null,
): SubcategoryDefinition[] {
  const clean = (categoryName || '').trim().toLowerCase();
  if (!clean) return [];

  const exact = CATEGORY_SUBCATEGORIES.find((entry) => entry.bucket === clean);
  if (exact) return exact.subcategories;

  const partial = CATEGORY_SUBCATEGORIES.find((entry) =>
    entry.categoryTokens.some((tok) => clean.includes(tok)),
  );
  return partial ? partial.subcategories : [];
}

export function findSubcategoryDefinition(
  subcategoryName: string | undefined | null,
  categoryName?: string | null,
): SubcategoryDefinition | null {
  const clean = (subcategoryName || '').trim().toLowerCase();
  if (!clean) return null;

  const scoped = categoryName ? getSubcategoriesForCategory(categoryName) : [];
  const searchPool =
    scoped.length > 0 ? [...scoped, ...ALL_SUBCATEGORIES] : ALL_SUBCATEGORIES;

  const exact = searchPool.find((s) => s.name.toLowerCase() === clean);
  if (exact) return exact;

  const partial = searchPool.find(
    (s) =>
      s.name.toLowerCase().includes(clean) ||
      clean.includes(s.name.toLowerCase()),
  );
  return partial || null;
}

export function matchSubcategoryName(
  rawSubcategory: string | undefined | null,
  categoryName: string | undefined | null,
  context?: {
    title?: string;
    description?: string;
    tags?: string[];
    breadcrumbs?: string[];
  },
): string | undefined {
  const scoped = getSubcategoriesForCategory(categoryName);
  const candidates = scoped.length > 0 ? scoped : ALL_SUBCATEGORIES;

  const cleanRaw = (rawSubcategory || '').trim();
  if (cleanRaw) {
    const direct = findSubcategoryDefinition(cleanRaw, categoryName);
    if (direct) return direct.name;
  }

  const combinedText = [
    cleanRaw,
    ...(context?.breadcrumbs || []),
    context?.title || '',
    (context?.tags || []).join(' '),
    (context?.description || '').slice(0, 300),
  ]
    .filter(Boolean)
    .join(' ');

  if (!combinedText.trim()) return undefined;

  let bestName: string | undefined;
  let bestScore = 0;

  for (const sub of candidates) {
    let score = 0;
    for (const pat of sub.patterns) {
      if (pat.test(context?.title || '')) score += 5;
      if (pat.test(cleanRaw)) score += 6;
      if (pat.test((context?.tags || []).join(' '))) score += 3;
      if (pat.test((context?.breadcrumbs || []).join(' '))) score += 4;
      if (pat.test((context?.description || '').slice(0, 300))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestName = sub.name;
    }
  }

  return bestName;
}

const VALID_DIM_UNITS = new Set(['cm', 'mm', 'in', 'm']);
const VALID_WEIGHT_UNITS = new Set(['kg', 'g', 'lb']);

function parsePositiveNumber(val: unknown): number | null {
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 0) return null;
    return Number(val.toFixed(2));
  }
  if (typeof val !== 'string' || val.trim() === '') return null;
  const n = Number.parseFloat(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number(n.toFixed(2));
}

function cleanAttrString(val: unknown, maxLen = 80): string | undefined {
  if (typeof val !== 'string') return undefined;
  const clean = val.trim().replace(/\s+/g, ' ').slice(0, maxLen);
  return clean || undefined;
}

/**
 * Normalizes structured product attributes (`subcategory`, `dimensions`, `weight`,
 * `color`, `material`, `size`, `warranty`, `sku`) while preserving any custom keys.
 */
export function normalizeProductAttributes(
  raw: unknown,
  categoryName?: string | null,
  context?: { title?: string; description?: string; tags?: string[] },
): StructuredProductAttributes {
  const base: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};

  const out: StructuredProductAttributes = { ...base };

  const rawSub = cleanAttrString(base.subcategory, 60);
  const resolvedSub =
    matchSubcategoryName(rawSub, categoryName, context) || rawSub;
  if (resolvedSub) {
    out.subcategory = resolvedSub;
  } else {
    delete out.subcategory;
  }

  // Dimensions (L x W x H + unit)
  if (
    base.dimensions &&
    typeof base.dimensions === 'object' &&
    !Array.isArray(base.dimensions)
  ) {
    const d = base.dimensions as Record<string, unknown>;
    const length = parsePositiveNumber(d.length);
    const width = parsePositiveNumber(d.width);
    const height = parsePositiveNumber(d.height);
    const rawUnit =
      typeof d.unit === 'string' ? d.unit.trim().toLowerCase() : 'cm';
    const unit = (
      VALID_DIM_UNITS.has(rawUnit) ? rawUnit : 'cm'
    ) as ProductDimensions['unit'];
    if (length !== null || width !== null || height !== null) {
      out.dimensions = {
        ...(length !== null ? { length } : {}),
        ...(width !== null ? { width } : {}),
        ...(height !== null ? { height } : {}),
        unit,
      };
    } else {
      delete out.dimensions;
    }
  } else {
    delete out.dimensions;
  }

  // Weight (value + unit)
  if (
    base.weight &&
    typeof base.weight === 'object' &&
    !Array.isArray(base.weight)
  ) {
    const w = base.weight as Record<string, unknown>;
    const value = parsePositiveNumber(w.value);
    const rawUnit =
      typeof w.unit === 'string' ? w.unit.trim().toLowerCase() : 'kg';
    const unit = (
      VALID_WEIGHT_UNITS.has(rawUnit) ? rawUnit : 'kg'
    ) as ProductWeight['unit'];
    if (value !== null) {
      out.weight = { value, unit };
    } else {
      delete out.weight;
    }
  } else {
    delete out.weight;
  }

  const color = cleanAttrString(base.color, 60);
  if (color) out.color = color;
  else delete out.color;

  const material = cleanAttrString(base.material, 80);
  if (material) out.material = material;
  else delete out.material;

  const size = cleanAttrString(base.size, 60);
  if (size) out.size = size;
  else delete out.size;

  const warranty = cleanAttrString(base.warranty, 80);
  if (warranty) out.warranty = warranty;
  else delete out.warranty;

  const sku = cleanAttrString(base.sku, 60);
  if (sku) out.sku = sku;
  else delete out.sku;

  return out;
}
