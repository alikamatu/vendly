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
          'keyboard',
          'mouse',
        ],
        patterns: [
          /\b(power\s*banks?|powerbanks?|chargers?|adapters?|usb-?c|hdmi|lightning\s*cables?|phone\s*cases?|screen\s*protectors?|keyboards?|mice|mouse|webcams?)\b/i,
        ],
      },
      {
        name: 'Desktops & PCs',
        keywords: [
          'desktop',
          'imac',
          'mac mini',
          'pc',
          'gaming pc',
          'all-in-one',
          'cpu',
          'gpu',
        ],
        patterns: [
          /\b(desktops?|imacs?|mac\s*mini|gaming\s*pcs?|workstations?|all-?in-?one\s*pc|motherboards?|graphics\s*cards?|gpus?)\b/i,
        ],
      },
      {
        name: 'Networking & Wi-Fi',
        keywords: [
          'router',
          'starlink',
          'mifi',
          'wifi',
          'modem',
          'extender',
          'switch',
          'ethernet',
        ],
        patterns: [
          /\b(routers?|starlink|mifi|wi-?fi\s*extenders?|modems?|mesh\s*wi-?fi|network\s*switch|ethernet)\b/i,
        ],
      },
      {
        name: 'Solar & Power Solutions',
        keywords: [
          'solar',
          'inverter',
          'power station',
          'ecoflow',
          'bluetti',
          'ups',
          'stabilizer',
          'extension board',
        ],
        patterns: [
          /\b(solar\s*panels?|inverters?|power\s*stations?|ecoflow|bluetti|ups|voltage\s*stabilizers?|surge\s*protectors?|extension\s*boards?)\b/i,
        ],
      },
      {
        name: 'Smart Home & Security',
        keywords: [
          'cctv',
          'security camera',
          'smart bulb',
          'doorbell',
          'smart lock',
          'alexa',
        ],
        patterns: [
          /\b(cctv|security\s*cameras?|smart\s*bulbs?|smart\s*plugs?|smart\s*locks?|video\s*doorbells?|alexa|google\s*nest)\b/i,
        ],
      },
      {
        name: 'Storage & Memory',
        keywords: [
          'ssd',
          'hard drive',
          'flash drive',
          'sd card',
          'memory card',
          'ram',
          'usb',
        ],
        patterns: [
          /\b(ssds?|external\s*hard\s*drives?|hard\s*drives?|hdd|flash\s*drives?|pen\s*drives?|sd\s*cards?|memory\s*cards?|nvme)\b/i,
        ],
      },
      {
        name: 'Printers & Scanners',
        keywords: [
          'printer',
          'scanner',
          'inkjet',
          'laserjet',
          'photocopier',
          'toner',
        ],
        patterns: [
          /\b(printers?|scanners?|inkjet|laserjet|all-?in-?one\s*printers?|photo\s*printers?)\b/i,
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
        name: 'Sneakers',
        keywords: [
          'sneaker',
          'trainer',
          'air force',
          'jordan',
          'yeezy',
          'new balance',
          'dunk',
          'running shoe',
        ],
        patterns: [
          /\b(sneakers?|trainers?|air\s*force|jordans?|air\s*jordan|yeezy|new\s*balance|nike\s*dunk|air\s*max|samba|gazelle|vans|converse|running\s*shoes?)\b/i,
        ],
      },
      {
        name: 'Sandals & Slippers',
        keywords: [
          'sandal',
          'slipper',
          'slide',
          'crocs',
          'birkenstock',
          'flip flop',
        ],
        patterns: [
          /\b(sandals?|slippers?|slides?|flip-?flops?|crocs|birkenstocks?|palm\s*sandals?|leather\s*sandals?)\b/i,
        ],
      },
      {
        name: 'Heels & Formal Shoes',
        keywords: [
          'heel',
          'stiletto',
          'wedge',
          'loafer',
          'oxford',
          'brogue',
          'dress shoe',
        ],
        patterns: [
          /\b(heels?|stilettos?|wedges?|pumps?|loafers?|moccasins?|oxfords?|brogues?|dress\s*shoes?|formal\s*shoes?)\b/i,
        ],
      },
      {
        name: 'Shoes',
        keywords: ['shoe', 'boot', 'flat', 'clog', 'footwear'],
        patterns: [/\b(shoes?|boots?|flats?|clogs?|footwear)\b/i],
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
      {
        name: 'Hoodies & Streetwear',
        keywords: [
          'hoodie',
          'sweatshirt',
          'streetwear',
          'cargo pants',
          'oversized tee',
          'varsity',
        ],
        patterns: [
          /\b(hoodies?|sweatshirts?|streetwear|cargo\s*pants?|oversized\s*t-?shirts?|varsity\s*jackets?)\b/i,
        ],
      },
      {
        name: 'Jeans & Denim',
        keywords: [
          'jeans',
          'denim',
          'denim jacket',
          'ripped jeans',
          'mom jeans',
        ],
        patterns: [
          /\b(jeans|denim\s*jackets?|denim\s*shorts?|denim\s*skirts?|denim)\b/i,
        ],
      },
      {
        name: 'Lingerie & Sleepwear',
        keywords: [
          'lingerie',
          'pajamas',
          'pyjamas',
          'nightwear',
          'robe',
          'shapewear',
          'bra',
        ],
        patterns: [
          /\b(lingerie|pajamas?|pyjamas?|nightwear|sleepwear|robes?|shapewear|bras?|panties)\b/i,
        ],
      },
      {
        name: 'Workwear & Suits',
        keywords: [
          'suit',
          'blazer',
          'office wear',
          'formal shirt',
          'pencil skirt',
          'chinos',
        ],
        patterns: [
          /\b(suits?|blazers?|tuxedos?|office\s*wear|corporate\s*wear|formal\s*shirts?|pencil\s*skirts?)\b/i,
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
      {
        name: 'Smart & Luxury Bands',
        keywords: [
          'watch strap',
          'watch band',
          'apple watch band',
          'leather strap',
          'milanese loop',
        ],
        patterns: [
          /\b(watch\s*straps?|watch\s*bands?|apple\s*watch\s*bands?|milanese\s*loop)\b/i,
        ],
      },
      {
        name: "Men's Jewelry",
        keywords: [
          'cuban link',
          'men chain',
          'cufflinks',
          'tie clip',
          'signet ring',
          'men bracelet',
        ],
        patterns: [
          /\b(cuban\s*links?|cufflinks?|tie\s*clips?|men'?s\s*jewelry|men'?s\s*chains?)\b/i,
        ],
      },
      {
        name: 'Anklets & Body Jewelry',
        keywords: [
          'anklet',
          'waist beads',
          'nose ring',
          'belly ring',
          'toe ring',
        ],
        patterns: [
          /\b(anklets?|waist\s*beads?|nose\s*rings?|belly\s*rings?|body\s*jewelry)\b/i,
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
      {
        name: 'Nails & Manicure',
        keywords: [
          'nail',
          'press on',
          'gel polish',
          'uv lamp',
          'acrylic nails',
          'manicure',
        ],
        patterns: [
          /\b(press-?on\s*nails?|acrylic\s*nails?|gel\s*polish|nail\s*polish|manicure|pedicure|nail\s*lamps?)\b/i,
        ],
      },
      {
        name: 'Beauty Tools & Brushes',
        keywords: [
          'makeup brush',
          'beauty blender',
          'jade roller',
          'lash curler',
          'mirror',
        ],
        patterns: [
          /\b(makeup\s*brush(?:es)?|beauty\s*blenders?|sponges?|jade\s*rollers?|gua\s*sha|eyelash\s*curlers?|vanity\s*mirrors?)\b/i,
        ],
      },
      {
        name: 'Bath & Spa',
        keywords: [
          'bath bomb',
          'bath salt',
          'candle',
          'spa set',
          'loofah',
          'bath oil',
        ],
        patterns: [
          /\b(bath\s*bombs?|bath\s*salts?|scented\s*candles?|spa\s*sets?|bath\s*oils?|loofahs?)\b/i,
        ],
      },
      {
        name: 'Oral Care',
        keywords: [
          'toothbrush',
          'electric toothbrush',
          'teeth whitening',
          'water flosser',
          'mouthwash',
        ],
        patterns: [
          /\b(electric\s*toothbrushes?|toothbrushes?|teeth\s*whitening|water\s*flossers?|mouthwash)\b/i,
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
      {
        name: 'Lighting & Lamps',
        keywords: [
          'lamp',
          'led strip',
          'chandelier',
          'solar light',
          'ceiling light',
          'desk lamp',
        ],
        patterns: [
          /\b(desk\s*lamps?|floor\s*lamps?|bedside\s*lamps?|led\s*strips?|chandeliers?|solar\s*lights?|pendant\s*lights?|wall\s*sconces?)\b/i,
        ],
      },
      {
        name: 'Bathroom Essentials',
        keywords: [
          'towel',
          'bath mat',
          'shower curtain',
          'soap dispenser',
          'bathroom rack',
        ],
        patterns: [
          /\b(bath\s*towels?|towels?|bath\s*mats?|shower\s*curtains?|soap\s*dispensers?|bathroom\s*organizers?)\b/i,
        ],
      },
      {
        name: 'Garden & Outdoor Living',
        keywords: [
          'planter',
          'flower pot',
          'garden',
          'patio',
          'grill',
          'barbecue',
          'hose',
        ],
        patterns: [
          /\b(planters?|flower\s*pots?|garden\s*tools?|patio\s*furniture|bbq|barbecue|grills?|outdoor\s*chairs?)\b/i,
        ],
      },
      {
        name: 'Generators & Backup Power',
        keywords: ['generator', 'inverter', 'stabilizer', 'backup battery'],
        patterns: [
          /\b(generators?|fuel\s*generators?|backup\s*power|power\s*inverters?)\b/i,
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
      {
        name: 'Herbal & Natural Remedies',
        keywords: [
          'herbal',
          'bitters',
          'seamoss',
          'black seed oil',
          'neem',
          'hibiscus',
          'baobab',
        ],
        patterns: [
          /\b(herbal\s*tea|herbal|sea\s*moss|black\s*seed\s*oil|bitters|baobab|neem)\b/i,
        ],
      },
      {
        name: 'Personal Hygiene',
        keywords: [
          'sanitizer',
          'feminine care',
          'pads',
          'wipes',
          'antiseptic',
          'hygiene',
        ],
        patterns: [
          /\b(hand\s*sanitizers?|sanitary\s*pads?|feminine\s*care|wet\s*wipes?|antiseptic)\b/i,
        ],
      },
      {
        name: 'Weight Management',
        keywords: [
          'slimming tea',
          'fat burner',
          'meal replacement',
          'scale',
          'detox tea',
        ],
        patterns: [
          /\b(slimming\s*tea|detox\s*tea|fat\s*burners?|meal\s*replacement|body\s*scales?)\b/i,
        ],
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
      {
        name: 'Running & Training',
        keywords: [
          'running',
          'training',
          'hydration vest',
          'gym bag',
          'lifting belt',
          'gloves',
        ],
        patterns: [
          /\b(running\s*gear|gym\s*bags?|lifting\s*belts?|gym\s*gloves?|training\s*cones?)\b/i,
        ],
      },
      {
        name: 'Swimming & Water Sports',
        keywords: [
          'goggles',
          'swim cap',
          'swimsuit',
          'floatie',
          'life jacket',
          'snorkel',
        ],
        patterns: [
          /\b(swim\s*goggles?|swim\s*caps?|life\s*jackets?|snorkels?|pool\s*floats?)\b/i,
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
      {
        name: 'Fresh Produce & Groceries',
        keywords: [
          'plantain',
          'yam',
          'tomato',
          'onion',
          'fruits',
          'vegetables',
          'groceries',
        ],
        patterns: [
          /\b(fresh\s*produce|vegetables?|groceries|plantains?|yams?|fresh\s*fruits?)\b/i,
        ],
      },
      {
        name: 'Baked Goods & Cakes',
        keywords: [
          'cake',
          'cupcake',
          'bread',
          'pastry',
          'meat pie',
          'brownie',
          'doughnut',
        ],
        patterns: [
          /\b(birthday\s*cakes?|cakes?|cupcakes?|pastries|meat\s*pies?|brownies?|doughnuts?|bakery)\b/i,
        ],
      },
      {
        name: 'Organic & Health Foods',
        keywords: [
          'organic',
          'chia',
          'oats',
          'flaxseed',
          'quinoa',
          'moringa powder',
          'raw honey',
        ],
        patterns: [
          /\b(organic|chia\s*seeds?|rolled\s*oats?|flaxseeds?|quinoa|raw\s*honey|superfoods?)\b/i,
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
      {
        name: 'Kids Shoes',
        keywords: [
          'kids shoes',
          'baby shoes',
          'school shoes',
          'toddler sneakers',
        ],
        patterns: [
          /\b(kids?\s*shoes?|baby\s*shoes?|school\s*shoes?|toddler\s*sneakers?)\b/i,
        ],
      },
      {
        name: 'School Bags & Supplies',
        keywords: [
          'school bag',
          'lunch box',
          'kids backpack',
          'water bottle',
          'pencil case',
        ],
        patterns: [
          /\b(school\s*bags?|lunch\s*box(?:es)?|kids?\s*backpacks?|pencil\s*cases?)\b/i,
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
      {
        name: 'Business & Self-Help',
        keywords: [
          'self help',
          'finance book',
          'entrepreneurship',
          'leadership',
          'atomic habits',
        ],
        patterns: [
          /\b(self-?help|business\s*books?|finance\s*books?|entrepreneurship|leadership\s*books?)\b/i,
        ],
      },
      {
        name: "Children's Books",
        keywords: ['storybook', 'coloring book', 'picture book', 'kids book'],
        patterns: [
          /\b(storybooks?|coloring\s*books?|picture\s*books?|children'?s\s*books?)\b/i,
        ],
      },
      {
        name: 'Religious & Inspirational',
        keywords: [
          'bible',
          'quran',
          'devotional',
          'christian book',
          'prayer journal',
        ],
        patterns: [
          /\b(bibles?|qurans?|devotionals?|prayer\s*journals?|inspirational\s*books?)\b/i,
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
      {
        name: 'POS & Retail Equipment',
        keywords: [
          'thermal printer',
          'receipt printer',
          'barcode scanner',
          'cash drawer',
          'pos',
        ],
        patterns: [
          /\b(thermal\s*printers?|receipt\s*printers?|barcode\s*scanners?|cash\s*drawers?|pos\s*machines?)\b/i,
        ],
      },
      {
        name: 'Packaging & Shipping',
        keywords: [
          'mailer',
          'shipping box',
          'bubble wrap',
          'packing tape',
          'label',
          'polymailer',
        ],
        patterns: [
          /\b(polymailers?|shipping\s*boxes?|bubble\s*wrap|packing\s*tape|thermal\s*labels?|gift\s*boxes?)\b/i,
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
        keywords: ['doll', 'barbie', 'teddy bear', 'plush', 'nerf'],
        patterns: [
          /\b(dolls?|barbies?|teddy\s*bears?|plush|action\s*figures?|nerf|playsets?)\b/i,
        ],
      },
      {
        name: 'Remote Control & Drones',
        keywords: [
          'rc car',
          'remote control',
          'toy drone',
          'rc helicopter',
          'rc truck',
        ],
        patterns: [
          /\b(rc\s*cars?|remote\s*control|toy\s*drones?|rc\s*helicopters?|rc\s*trucks?)\b/i,
        ],
      },
      {
        name: 'Outdoor Play',
        keywords: [
          'trampoline',
          'slide',
          'swing',
          'ride on car',
          'water gun',
          'playhouse',
        ],
        patterns: [
          /\b(trampolines?|ride-?on\s*cars?|water\s*guns?|playhouses?|kids?\s*swings?)\b/i,
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
        keywords: ['engine oil', 'motor oil', 'coolant'],
        patterns: [
          /\b(engine\s*oil|motor\s*oil|coolants?|brake\s*fluid|transmission\s*fluid)\b/i,
        ],
      },
      {
        name: 'Car Care & Detailing',
        keywords: [
          'car wash',
          'wax',
          'polish',
          'microfiber',
          'tire shine',
          'air freshener',
        ],
        patterns: [
          /\b(car\s*wash|car\s*wax|car\s*polish|tire\s*shine|car\s*fresheners?|car\s*vacuums?)\b/i,
        ],
      },
      {
        name: 'Interior Accessories',
        keywords: [
          'seat cover',
          'floor mat',
          'steering cover',
          'phone holder',
          'sunshade',
        ],
        patterns: [
          /\b(seat\s*covers?|floor\s*mats?|steering\s*wheel\s*covers?|car\s*phone\s*holders?|sunshades?)\b/i,
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
      {
        name: 'Kente & Woven Fabrics',
        keywords: [
          'kente cloth',
          'woven fabric',
          'ankara fabric',
          'lace fabric',
          'batik',
          'tie dye',
        ],
        patterns: [
          /\b(kente\s*cloth|woven\s*fabrics?|ankara\s*fabrics?|lace\s*fabrics?|batik|tie-?dye)\b/i,
        ],
      },
      {
        name: 'Beadwork & Jewelry Making',
        keywords: [
          'krobo beads',
          'glass beads',
          'beadwork',
          'jewelry wire',
          'clasps',
        ],
        patterns: [
          /\b(krobo\s*beads?|glass\s*beads?|beadwork|jewelry\s*making|beading\s*kits?)\b/i,
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
      {
        name: 'Beauty & Salon Services',
        keywords: [
          'braiding',
          'makeup artist',
          'barber',
          'nail tech',
          'wig installation',
          'massage',
        ],
        patterns: [
          /\b(braiding|makeup\s*artist|barber|nail\s*tech|wig\s*install|home\s*massage)\b/i,
        ],
      },
      {
        name: 'Delivery & Logistics',
        keywords: ['dispatch', 'courier', 'delivery', 'moving', 'errand'],
        patterns: [
          /\b(dispatch\s*rider|courier|delivery\s*service|moving\s*service)\b/i,
        ],
      },
      {
        name: 'Digital & Creative Services',
        keywords: [
          'graphic design',
          'logo design',
          'social media',
          'video editing',
          'branding',
        ],
        patterns: [
          /\b(graphic\s*design|logo\s*design|social\s*media\s*management|video\s*editing|branding)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'pets & animals',
    categoryTokens: ['pet', 'dog', 'cat', 'animal'],
    subcategories: [
      {
        name: 'Dog Food & Treats',
        keywords: [
          'dog food',
          'puppy food',
          'dog treats',
          'kibble',
          'chew bones',
        ],
        patterns: [
          /\b(dog\s*food|puppy\s*food|dog\s*treats?|kibble|dog\s*chews?)\b/i,
        ],
      },
      {
        name: 'Cat Supplies',
        keywords: [
          'cat food',
          'cat litter',
          'litter box',
          'scratching post',
          'catnip',
        ],
        patterns: [
          /\b(cat\s*food|cat\s*litter|litter\s*box|scratching\s*post|catnip)\b/i,
        ],
      },
      {
        name: 'Pet Accessories & Beds',
        keywords: [
          'leash',
          'collar',
          'pet bed',
          'dog cage',
          'pet carrier',
          'feeding bowl',
        ],
        patterns: [
          /\b(dog\s*leash|pet\s*collar|pet\s*beds?|dog\s*crates?|pet\s*carriers?|pet\s*bowls?)\b/i,
        ],
      },
      {
        name: 'Pet Grooming & Health',
        keywords: ['dog shampoo', 'tick collar', 'flea spray', 'pet brush'],
        patterns: [
          /\b(dog\s*shampoo|pet\s*shampoo|tick\s*collar|flea\s*treatment|pet\s*grooming)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'tools & hardware',
    categoryTokens: ['tool', 'hardware', 'industrial', 'construction', 'diy'],
    subcategories: [
      {
        name: 'Power Tools',
        keywords: [
          'drill',
          'angle grinder',
          'saw',
          'pressure washer',
          'welding',
          'bosch',
          'makita',
        ],
        patterns: [
          /\b(cordless\s*drills?|power\s*drills?|angle\s*grinders?|jigsaws?|circular\s*saws?|pressure\s*washers?|makita|dewalt|bosch)\b/i,
        ],
      },
      {
        name: 'Hand Tools',
        keywords: [
          'toolbox',
          'screwdriver',
          'wrench',
          'hammer',
          'pliers',
          'tape measure',
        ],
        patterns: [
          /\b(tool\s*kits?|toolboxes?|screwdrivers?|wrenches?|spanners?|hammers?|pliers|tape\s*measures?)\b/i,
        ],
      },
      {
        name: 'Electrical & Plumbing',
        keywords: [
          'socket',
          'switch',
          'wire',
          'faucet',
          'tap',
          'shower head',
          'circuit breaker',
        ],
        patterns: [
          /\b(wall\s*sockets?|light\s*switches?|faucets?|shower\s*heads?|plumbing|circuit\s*breakers?)\b/i,
        ],
      },
      {
        name: 'Safety & Work Gear',
        keywords: [
          'safety boots',
          'reflective vest',
          'helmet',
          'work gloves',
          'padlock',
        ],
        patterns: [
          /\b(safety\s*boots?|reflective\s*vests?|hard\s*hats?|work\s*gloves?|padlocks?)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'musical instruments',
    categoryTokens: ['music', 'instrument', 'audio gear', 'studio'],
    subcategories: [
      {
        name: 'Guitars & Strings',
        keywords: [
          'guitar',
          'acoustic guitar',
          'electric guitar',
          'bass guitar',
          'violin',
          'ukulele',
        ],
        patterns: [
          /\b(acoustic\s*guitars?|electric\s*guitars?|bass\s*guitars?|guitars?|violins?|ukuleles?)\b/i,
        ],
      },
      {
        name: 'Keyboards & Pianos',
        keywords: [
          'keyboard',
          'piano',
          'midi controller',
          'yamaha psr',
          'synthesizer',
        ],
        patterns: [
          /\b(digital\s*pianos?|pianos?|midi\s*keyboards?|midi\s*controllers?|yamaha\s*psr|synthesizers?)\b/i,
        ],
      },
      {
        name: 'Drums & Percussion',
        keywords: [
          'drum',
          'drum kit',
          'cajon',
          'djembe',
          'talking drum',
          'cymbal',
        ],
        patterns: [
          /\b(drum\s*kits?|drums?|cajons?|djembes?|talking\s*drums?|cymbals?|percussion)\b/i,
        ],
      },
      {
        name: 'Studio & DJ Gear',
        keywords: [
          'audio interface',
          'condenser mic',
          'studio monitor',
          'dj controller',
          'mixer',
        ],
        patterns: [
          /\b(audio\s*interfaces?|condenser\s*mics?|studio\s*monitors?|dj\s*controllers?|sound\s*mixers?|focusrite)\b/i,
        ],
      },
    ],
  },
  {
    bucket: 'gifts & hampers',
    categoryTokens: ['gift', 'hamper', 'flower', 'party', 'event'],
    subcategories: [
      {
        name: 'Gift Boxes & Hampers',
        keywords: [
          'gift box',
          'hamper',
          'curated gift',
          'birthday box',
          'valentine box',
          'care package',
        ],
        patterns: [
          /\b(gift\s*box(?:es)?|gift\s*hampers?|hampers?|care\s*packages?|birthday\s*box(?:es)?|valentine\s*gifts?)\b/i,
        ],
      },
      {
        name: 'Flowers & Bouquets',
        keywords: [
          'flower',
          'bouquet',
          'roses',
          'money bouquet',
          'preserved roses',
        ],
        patterns: [
          /\b(bouquets?|money\s*bouquets?|fresh\s*flowers?|roses|flower\s*arrangements?)\b/i,
        ],
      },
      {
        name: 'Personalized Gifts',
        keywords: [
          'custom mug',
          'engraved',
          'photo frame',
          'personalized',
          'custom keychain',
        ],
        patterns: [
          /\b(personalized\s*gifts?|custom\s*mugs?|engraved\s*gifts?|custom\s*frames?|monogram)\b/i,
        ],
      },
      {
        name: 'Party & Event Decor',
        keywords: ['balloon', 'party decor', 'banner', 'candle', 'cake topper'],
        patterns: [
          /\b(balloons?|party\s*decor|birthday\s*banners?|cake\s*toppers?|confetti)\b/i,
        ],
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
