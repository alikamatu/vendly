export interface CategorySeoProfile {
  slug: string;
  /** Exact category name in the Verndly database / API */
  apiName: string;
  /** Display label */
  name: string;
  /** SEO page title */
  metaTitle: string;
  /** SEO meta description */
  metaDescription: string;
  /** Hero H1 */
  headline: string;
  /** Editorial subtitle */
  subheadline: string;
  /** Rich crawlable editorial paragraphs */
  editorialCopy: string[];
  /** Key highlights for buyers */
  buyerHighlights: Array<{ title: string; detail: string }>;
  /** Category-specific FAQs */
  faqs: Array<{ question: string; answer: string }>;
  /** Keywords */
  keywords: string[];
  /** Related guide slug */
  relatedGuideSlug?: string;
}

export const CATEGORY_PROFILES: CategorySeoProfile[] = [
  {
    slug: 'fashion',
    apiName: 'Fashion',
    name: 'Fashion & Apparel',
    metaTitle: 'Ghanaian Fashion from Verified Independent Brands Online',
    metaDescription:
      'Shop clothing, footwear, thrift finds, and accessories from verified Ghanaian fashion brands on Verndly. Protected by 7-day Paystack escrow and nationwide delivery.',
    headline: 'Ghanaian fashion from verified independent brands.',
    subheadline:
      'Discover streetwear, tailored pieces, footwear, bags, and curated thrift from vetted local designers and boutiques — every order protected by 7-day Paystack escrow.',
    editorialCopy: [
      "Ghana's most exciting fashion rarely lives in massive corporate warehouses — it comes from independent designers, campus labels, thrift curators, and small boutiques in Greater Accra and across Ghana. Until now, buying from independent fashion sellers meant paying Mobile Money up front in an Instagram DM and hoping the right size or fabric showed up.",
      'Every fashion store on Verndly is identity-verified before listing a single item. Your payment via MTN MoMo, Telecel Cash, AirtelTigo Money, or card is held safely in Paystack escrow until your order arrives and passes your 7-day inspection window. If a piece arrives damaged, stained, or completely different from the listing photos, you are protected for a free return or full refund.',
      'For fashion founders, Verndly charges a flat 4% fee (including Paystack processing) instead of the 20% fashion commission plus shipping deductions charged by legacy marketplaces — letting independent Ghanaian brands offer fairer prices directly to shoppers.',
    ],
    buyerHighlights: [
      {
        title: 'Verified boutiques & designers',
        detail:
          'Every seller passes identity and storefront checks before receiving a Verified Merchant badge.',
      },
      {
        title: '7-day inspection & fit protection',
        detail:
          'Received the wrong size, color, or defective stitching? Claim a protected return within 7 days of delivery.',
      },
      {
        title: 'Nationwide doorstep delivery',
        detail:
          'Same-day express in Accra & Kumasi, 24–48 hour inter-regional delivery, or free store pickup.',
      },
    ],
    faqs: [
      {
        question: 'Is it safe to buy clothes from independent Ghanaian brands on Verndly?',
        answer:
          'Yes. Unlike paying directly to an unverified Instagram vendor via MoMo, Verndly holds your payment in Paystack escrow until your order is delivered and backed by our 7-day buyer protection window.',
      },
      {
        question: 'What happens if the clothing I receive does not match the photos?',
        answer:
          'You have 7 calendar days from delivery confirmation to submit a return claim with photos. For wrong items, defects, or misrepresentation, the seller covers return courier fees and you receive a full Paystack refund.',
      },
      {
        question: 'How much does Verndly charge fashion sellers in Ghana?',
        answer:
          'Verndly charges a flat 4% platform fee (Paystack processing included) with zero buyer surcharges — compared to up to 20% commission plus shipping contributions on traditional marketplaces.',
      },
    ],
    keywords: [
      'ghanaian fashion brands online',
      'buy clothes online ghana',
      'independent fashion stores accra',
      'online thrift shop ghana',
      'verified clothing vendors ghana',
    ],
    relatedGuideSlug: 'sell-clothes-online-ghana',
  },
  {
    slug: 'electronics',
    apiName: 'Electronics',
    name: 'Electronics & Gadgets',
    metaTitle: 'Verified Electronics, Phones & Laptops in Ghana with Escrow',
    metaDescription:
      'Buy smartphones, laptops, audio gear, and tech accessories from verified Ghanaian tech vendors. Every purchase protected by 7-day Paystack escrow.',
    headline: 'Electronics and gadgets backed by 7-day escrow.',
    subheadline:
      'Shop smartphones, laptops, headphones, chargers, and accessories from verified Ghanaian tech stores without risking your Mobile Money.',
    editorialCopy: [
      'Buying a phone, laptop, or pair of headphones online in Ghana carries the highest scam risk on classifieds and social media — from swapped refurb devices to vanishing sellers after a MoMo transfer. Verndly eliminates pre-payment risk by holding your payment in Paystack escrow until your device is delivered and verified.',
      'Every electronics listing displays clear condition labels (Brand New, Refurbished, Used – Like New), storage specifications, and warranty terms directly from vetted Ghanaian merchants. You get 7 full calendar days from delivery to test battery health, ports, screen quality, and authenticity.',
    ],
    buyerHighlights: [
      {
        title: 'Zero fake-device risk',
        detail:
          'Test your phone, laptop, or accessory during the 7-day inspection period before funds settle permanently.',
      },
      {
        title: 'Clear condition & warranty specs',
        detail:
          'Listings specify Brand New, Refurbished, or Used grades alongside storage and warranty details.',
      },
      {
        title: 'Direct Paystack reversal on defects',
        detail:
          'Dead-on-arrival or misrepresented hardware qualifies for seller-paid return pickup and full refund.',
      },
    ],
    faqs: [
      {
        question: 'How does escrow protect me when buying a phone or laptop in Ghana?',
        answer:
          "Your Mobile Money or card payment stays in Verndly's Paystack escrow ledger while your device ships. You inspect and test the device for up to 7 days after delivery, and if it is faulty or counterfeit, you can file a claim for a full refund.",
      },
      {
        question: "Can I pick up electronics directly from the seller's shop?",
        answer:
          'Yes. Many verified tech merchants in Accra, Kumasi, and Takoradi offer free Store Pickup at checkout while keeping full escrow protection.',
      },
    ],
    keywords: [
      'buy electronics online ghana',
      'verified phone sellers accra',
      'laptops ghana escrow',
      'safe tech shopping ghana',
    ],
    relatedGuideSlug: 'how-to-shop-online-safely-in-ghana',
  },
  {
    slug: 'beauty-personal-care',
    apiName: 'Beauty & Personal Care',
    name: 'Beauty & Personal Care',
    metaTitle: 'Authentic Beauty, Skincare & Fragrance Brands in Ghana',
    metaDescription:
      'Shop genuine skincare, Ghanaian shea formulations, makeup, haircare, and fragrances from verified beauty stores on Verndly with 7-day buyer protection.',
    headline: 'Authentic beauty and skincare from vetted stores.',
    subheadline:
      'From locally formulated shea skincare and hair care to original fragrances and cosmetics — sourced exclusively from verified merchants.',
    editorialCopy: [
      'Counterfeit skincare and diluted fragrances are widespread across unmoderated marketplaces and pop-up social pages. On Verndly, every beauty merchant is verified with identity and proof of trade before opening a storefront, giving shoppers confidence in both international staples and authentic made-in-Ghana botanical brands.',
      'Pay safely with MTN MoMo, Telecel Cash, or card. Your funds remain protected in Paystack escrow so damaged bottles, expired stock, or wrong shades are immediately eligible for replacement or refund.',
    ],
    buyerHighlights: [
      {
        title: 'Vetted beauty merchants',
        detail:
          'Shop authentic local skincare formulators and verified cosmetics retailers in one place.',
      },
      {
        title: 'Transit-damage protection',
        detail:
          'Leaking bottles or shattered glass palettes delivered in transit are replaced or refunded in full.',
      },
      {
        title: 'Transparent product details',
        detail: 'Skin type, volume, and shelf-life details clearly listed before you check out.',
      },
    ],
    faqs: [
      {
        question: 'What if a skincare bottle leaks or breaks during delivery?',
        answer:
          "Take photos of the parcel and item within 7 days of delivery and open a return claim. Transit damage is covered 100% under Verndly's Buyer Protection Guarantee.",
      },
    ],
    keywords: [
      'beauty products ghana online',
      'skincare ghana verified',
      'authentic perfumes accra',
      'made in ghana skincare',
    ],
    relatedGuideSlug: 'how-to-check-if-online-seller-is-legit-ghana',
  },
  {
    slug: 'home-kitchen',
    apiName: 'Home & Kitchen',
    name: 'Home & Kitchen',
    metaTitle: 'Home Essentials, Appliances & Decor in Ghana — Verndly',
    metaDescription:
      'Shop furniture, kitchen appliances, lighting, and home decor from verified independent Ghanaian stores with escrow protection and nationwide courier delivery.',
    headline: 'Thoughtful home goods and kitchen appliances.',
    subheadline:
      'Furnish your space with appliances, cookware, lighting, and artisan decor from verified local shops across Ghana.',
    editorialCopy: [
      "Upgrading an apartment or stocking a kitchen shouldn't require navigating crowded markets or gambling on unverified delivery promises. Verndly connects you with verified Ghanaian homeware stores and independent makers offering tracked delivery and transparent shipping rates displayed right at checkout — with zero surprise rider surcharges.",
    ],
    buyerHighlights: [
      {
        title: 'Zero hidden delivery surcharges',
        detail:
          'The delivery fee shown at checkout is final. Couriers cannot demand extra gate or fuel fees.',
      },
      {
        title: 'Escrow-backed appliances',
        detail:
          'Verify that blenders, kettles, and electronics power on properly during your 7-day inspection period.',
      },
      {
        title: 'Flexible pickup or doorstep drop',
        detail: 'Choose tracked doorstep courier delivery or free store collection on bulky items.',
      },
    ],
    faqs: [
      {
        question: 'Can Verndly merchants deliver home appliances outside Accra?',
        answer:
          'Delivery reach is configured per merchant. Sellers based in Greater Accra today offer local courier delivery, free store pickup where enabled, and regional dispatch where their courier options support it.',
      },
    ],
    keywords: [
      'home appliances ghana online',
      'kitchenware accra',
      'furniture ghana verified stores',
      'home decor ghana',
    ],
    relatedGuideSlug: 'nationwide-delivery-ghana-accra-kumasi-takoradi-tamale',
  },
  {
    slug: 'food-beverages',
    apiName: 'Food & Beverages',
    name: 'Food & Beverages',
    metaTitle: 'Artisan Snacks, Groceries & Local Drinks in Ghana — Verndly',
    metaDescription:
      'Order packaged foods, spices, organic honey, snacks, and beverages directly from verified Ghanaian producers with fast dispatch.',
    headline: 'Packaged foods, spices, and Ghanaian pantry favorites.',
    subheadline:
      'Support local food entrepreneurs delivering fresh-packed snacks, spices, teas, and specialty beverages nationwide.',
    editorialCopy: [
      'From small-batch shito and organic northern honey to specialty coffee, granola, and hibiscus blends, independent Ghanaian food brands thrive on direct customer relationships. Verndly gives food entrepreneurs a flat 4% fee structure so more value goes into fresh ingredients and safe packaging.',
    ],
    buyerHighlights: [
      {
        title: 'Direct from local producers',
        detail: 'Buy fresh-batch pantry staples straight from verified Ghanaian food brands.',
      },
      {
        title: 'Fast same-day & 24h dispatch',
        detail:
          'Merchants publish clear dispatch windows so perishable or snack orders arrive fresh.',
      },
      {
        title: 'Safe MoMo & card checkout',
        detail: 'Pay seamlessly via Paystack with full order tracking from kitchen to doorstep.',
      },
    ],
    faqs: [
      {
        question: 'How quickly are food and snack orders delivered?',
        answer:
          'Intra-city orders in Accra or Kumasi with same-day dispatch typically arrive within 2 to 6 hours of courier handover.',
      },
    ],
    keywords: [
      'buy snacks online ghana',
      'made in ghana food brands',
      'groceries online accra',
      'ghanaian spices online',
    ],
  },
  {
    slug: 'books-stationery',
    apiName: 'Books & Stationery',
    name: 'Books & Stationery',
    metaTitle: 'Books, Journals & Stationery from Ghanaian Bookshops — Verndly',
    metaDescription:
      'Find African literature, university textbooks, planners, and office stationery from verified independent Ghanaian bookshops on Verndly.',
    headline: 'Books, planners, and stationery from local shops.',
    subheadline:
      'Explore textbooks, African fiction, business books, journals, and study essentials delivered to campuses and offices across Ghana.',
    editorialCopy: [
      'Whether you are sourcing university textbooks, African literary classics, or minimalist journals, Verndly connects readers directly with independent Ghanaian booksellers and stationery studios — complete with transparent pricing and campus-friendly courier delivery.',
    ],
    buyerHighlights: [
      {
        title: 'Independent Ghanaian bookshops',
        detail: 'Discover curated titles from local booksellers and student-run stationery brands.',
      },
      {
        title: 'Accra & inter-regional delivery',
        detail:
          'Same-day and next-day delivery in Accra (including Legon), plus inter-regional parcel dispatch arranged directly with participating sellers.',
      },
      {
        title: 'Escrow-protected orders',
        detail: 'Wrong edition or damaged spine? Protected by our 7-day return guarantee.',
      },
    ],
    faqs: [
      {
        question: 'Do sellers deliver books to university campuses across Ghana?',
        answer:
          'Yes. Each merchant sets their delivery coverage on their storefront — including Accra campus drop-offs, free store pickup where offered, and inter-regional parcel dispatch where supported.',
      },
    ],
    keywords: ['buy books online ghana', 'stationery shop accra', 'textbooks ghana online'],
  },
  {
    slug: 'jewelry-watches',
    apiName: 'Jewelry & Watches',
    name: 'Jewelry & Watches',
    metaTitle: 'Jewelry, Watches & Handcrafted Accessories in Ghana — Verndly',
    metaDescription:
      'Shop verified timepieces, minimalist jewelry, and Ghanaian beadwork from trusted independent makers with 7-day escrow protection.',
    headline: 'Fine jewelry, beadwork, and watches you can trust.',
    subheadline:
      'Shop authentic watches and handcrafted jewelry from verified Ghanaian artisans and jewelers with Paystack escrow protection.',
    editorialCopy: [
      'Jewelry and watches are among the most frequently misrepresented items on social media shops. Shopping through Verndly guarantees that your payment is protected in escrow while you confirm metal finish, craftsmanship, and watch functionality in person.',
    ],
    buyerHighlights: [
      {
        title: 'Verified jewelers & artisans',
        detail: 'Buy directly from vetted independent brands and traditional beadwork studios.',
      },
      {
        title: '7-day quality verification',
        detail: 'Confirm material finish and timepiece accuracy with zero pre-payment risk.',
      },
      {
        title: 'Gift-ready delivery',
        detail: 'Tracked courier delivery straight to you or your recipient anywhere in Ghana.',
      },
    ],
    faqs: [
      {
        question: 'What if a watch arrives non-functional or different from the listing?',
        answer:
          'Open a return claim within 7 calendar days of delivery for a seller-covered return pickup and full Paystack refund.',
      },
    ],
    keywords: ['jewelry online ghana', 'watches accra verified', 'ghanaian beadwork online'],
  },
  {
    slug: 'art-crafts',
    apiName: 'Art & Crafts',
    name: 'Art & Crafts',
    metaTitle: 'Handmade Art, Crafts & Made-in-Ghana Decor — Verndly',
    metaDescription:
      'Discover original paintings, textile art, ceramics, and handcrafted decor from independent Ghanaian artists on Verndly.',
    headline: 'Original art and handmade Ghanaian craft.',
    subheadline:
      'Collect paintings, woven textiles, pottery, and bespoke pieces directly from verified independent artists across Ghana.',
    editorialCopy: [
      'Ghanaian creators produce extraordinary paintings, kente-inspired textiles, woodcraft, and ceramics. Verndly gives artists a clean digital gallery with a flat 4% fee and escrow-backed checkout so collectors can commission and purchase confidently.',
    ],
    buyerHighlights: [
      {
        title: 'Direct from the creator',
        detail: '96% of every sale goes directly to the independent artist or craft studio.',
      },
      {
        title: 'Safe fragile-item transit',
        detail: 'Damage-in-transit protection ensures art arrives safely or is refunded in full.',
      },
      {
        title: 'Custom & made-to-order clarity',
        detail: 'Clear lead times and dimensions published upfront on every piece.',
      },
    ],
    faqs: [
      {
        question: 'Are fragile art and craft items protected during delivery?',
        answer:
          'Yes. If an artwork arrives damaged due to transit mishandling, document it within 7 days for a full escrow refund or replacement.',
      },
    ],
    keywords: ['made in ghana art online', 'ghanaian crafts marketplace', 'buy paintings accra'],
  },
  {
    slug: 'health-wellness',
    apiName: 'Health & Wellness',
    name: 'Health & Wellness',
    metaTitle: 'Health, Supplements & Wellness Products in Ghana — Verndly',
    metaDescription:
      'Shop verified wellness essentials, herbal formulations, and fitness gear from vetted Ghanaian stores with escrow protection.',
    headline: 'Health and wellness from verified stores.',
    subheadline:
      'Source supplements, herbal teas, and personal wellness tools from vetted merchants with transparent labeling.',
    editorialCopy: [
      'Trust matters most with anything that goes into or onto your body. Verndly vets every health and wellness merchant and holds checkout funds in Paystack escrow so expired, unsealed, or counterfeit items never cost you money.',
    ],
    buyerHighlights: [
      {
        title: 'Sealed & authentic guarantee',
        detail: 'Tampered seals or expired stock qualify immediately for full escrow refunds.',
      },
      {
        title: 'Verified Ghanaian herbal & wellness brands',
        detail: 'Discover trusted local and international wellness essentials in one directory.',
      },
      {
        title: 'Discreet tracked courier delivery',
        detail:
          'Seller-configured doorstep delivery in Greater Accra and regional dispatch where offered.',
      },
    ],
    faqs: [
      {
        question: 'What if a wellness product arrives expired or with a broken seal?',
        answer:
          'Do not use the product — photograph the expiry date or seal and file a claim within 7 days for an immediate full refund from escrow.',
      },
    ],
    keywords: [
      'health wellness ghana online',
      'supplements accra verified',
      'herbal products ghana',
    ],
  },
  {
    slug: 'sports-outdoors',
    apiName: 'Sports & Outdoors',
    name: 'Sports & Outdoors',
    metaTitle: 'Sports Gear, Gym Equipment & Outdoor Essentials in Ghana — Verndly',
    metaDescription:
      'Shop football boots, gym accessories, activewear, and outdoor gear from verified Ghanaian sports stores with 7-day buyer protection.',
    headline: 'Sports gear and fitness essentials built to perform.',
    subheadline:
      'Find gym equipment, football boots, activewear, and outdoor accessories from verified independent sports vendors across Ghana.',
    editorialCopy: [
      'Gear up for the pitch, gym, or weekend trail without worrying about knockoff cleats or flimsy equipment. Every sports store on Verndly is verified and backed by 7-day escrow protection.',
    ],
    buyerHighlights: [
      {
        title: 'Verified sports retailers',
        detail: 'Shop jerseys, boots, weights, and yoga gear from trusted local specialists.',
      },
      {
        title: 'Protected sizing & quality',
        detail: 'Wrong size delivered or defective gear? Covered by our 7-day return window.',
      },
      {
        title: 'Fast courier dispatch',
        detail: 'Same-day and next-day delivery options available across major cities.',
      },
    ],
    faqs: [
      {
        question: 'Can I pay with Mobile Money for sports equipment?',
        answer:
          'Yes — MTN MoMo, Telecel Cash, AirtelTigo Money, and bank cards are all supported through Paystack escrow.',
      },
    ],
    keywords: ['sports equipment ghana online', 'gym gear accra', 'football boots ghana'],
  },
  {
    slug: 'baby-kids',
    apiName: 'Baby & Kids',
    name: 'Baby & Kids',
    metaTitle: 'Baby Gear, Kids Clothing & Toys from Verified Stores in Ghana',
    metaDescription:
      'Shop safe baby essentials, kids apparel, and educational toys from vetted Ghanaian family shops with 7-day Paystack escrow protection.',
    headline: 'Everyday essentials for babies and growing kids.',
    subheadline:
      'Discover gentle babywear, nursery items, and kids clothing from trusted independent family boutiques across Ghana.',
    editorialCopy: [
      'Parents deserve dependable quality and stress-free delivery. Verndly verifies every baby and kids merchant and holds payments in escrow until your order reaches your doorstep in perfect condition.',
    ],
    buyerHighlights: [
      {
        title: 'Trusted family boutiques',
        detail: "Vetted independent Ghanaian baby and children's stores.",
      },
      {
        title: 'Age-clear product details',
        detail: 'Clear age-group sizing and material specs on every listing.',
      },
      {
        title: 'Doorstep convenience',
        detail: 'Skip traffic with tracked courier delivery right to your home.',
      },
    ],
    faqs: [
      {
        question: 'Are baby and kids orders covered by the 7-day return guarantee?',
        answer:
          'Yes. Unused, unopened items that arrive damaged, defective, or incorrect are eligible for a full refund or free replacement within 7 days.',
      },
    ],
    keywords: ['baby shop ghana online', 'kids clothing accra', 'baby gear ghana'],
  },
  {
    slug: 'office-supplies',
    apiName: 'Office Supplies',
    name: 'Office Supplies',
    metaTitle: 'Office Supplies, Desk Gear & Packaging in Ghana — Verndly',
    metaDescription:
      'Order desk accessories, printing supplies, and business packaging from verified Ghanaian suppliers with transparent pricing and escrow protection.',
    headline: 'Office essentials and business supplies delivered.',
    subheadline:
      'Keep your studio, startup, or home office stocked with supplies from verified Ghanaian merchants.',
    editorialCopy: [
      'From small business shipping boxes and thermal labels to desk setups and everyday stationery, Verndly makes sourcing reliable office supplies simple — with clean digital receipts and Paystack escrow protection on every order.',
    ],
    buyerHighlights: [
      {
        title: 'Digital receipts for every order',
        detail: 'Clean payment records for startup and SME bookkeeping.',
      },
      {
        title: 'Packaging for fellow sellers',
        detail: 'Find boxes, mailers, and branding supplies from verified local vendors.',
      },
      {
        title: 'Direct store pickup or office drop',
        detail: 'Fast intra-city dispatch straight to your workplace.',
      },
    ],
    faqs: [
      {
        question: 'Do I get an order receipt for business expenses?',
        answer:
          'Yes. Every completed Verndly order includes a downloadable digital order receipt in your account.',
      },
    ],
    keywords: [
      'office supplies ghana online',
      'packaging materials accra',
      'desk accessories ghana',
    ],
  },
];

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCategoryProfileBySlug(slug: string): CategorySeoProfile | undefined {
  const normalized = slug.toLowerCase().trim();
  return CATEGORY_PROFILES.find(
    (c) => c.slug === normalized || slugifyCategory(c.apiName) === normalized,
  );
}

export function getCategoryProfileByName(name: string): CategorySeoProfile | undefined {
  const normalized = slugifyCategory(name);
  return CATEGORY_PROFILES.find(
    (c) => c.slug === normalized || slugifyCategory(c.apiName) === normalized,
  );
}
