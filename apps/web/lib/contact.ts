/**
 * Single source of truth for Verndly's public support and contact details.
 * Keep `legalEmail` for legal and dispute correspondence only.
 */
export const SUPPORT_CONTACT = {
  email: 'support@verndly.com',
  emailHref: 'mailto:support@verndly.com',
  legalEmail: 'legal@verndly.com',
  legalEmailHref: 'mailto:legal@verndly.com',
  phoneDisplay: '+233 53 406 5652',
  phoneHref: 'tel:+233534065652',
  whatsappHref: 'https://wa.me/233534065652',
  whatsappSupportHref: 'https://wa.me/233534065652?text=Hello%20Verndly%20Support',
  hours: 'Mon–Sat, 8:00 AM – 8:00 PM GMT',
  location: 'Accra, Ghana',
} as const;
