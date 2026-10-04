export const SITE_URL = 'https://medistore.sanctum.health';
export const SITE_NAME = 'MediStore: Temple of Asclepius';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generates Schema.org LocalBusiness / Pharmacy structured data
 */
export function getPharmacySchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    '@id': `${SITE_URL}/#pharmacy`,
    name: SITE_NAME,
    description:
      'Sanctified ancient Hellenic apothecary and decentralized pharmaceutical dispensary. High-potency herbal, analgesic, and botanical formulations sealed with cryptographic on-chain batch verification.',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    image: DEFAULT_OG_IMAGE,
    telephone: '+30-27530-22000',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Sacred Sanctuary Road 1',
      addressLocality: 'Epidaurus',
      addressRegion: 'Peloponnese',
      postalCode: '21052',
      addressCountry: 'GR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.5961,
      longitude: 23.0792,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Asclepeion Pharmacopeia',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Pain Relief Remedies',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Respiratory & Cold Elixirs',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Digestive Balms',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Vitality Minerals & Vitamins',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Pilgrim First Aid',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Sacred Botanicals',
        },
      ],
    },
  };
}

/**
 * Generates Schema.org WebSite structured data with SearchAction
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: 'Apothecary of Antiquity & Decentralized Oracle Ledger',
    publisher: {
      '@id': `${SITE_URL}/#pharmacy`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates Schema.org Product structured data with Offer
 */
export function getProductSchema(product: {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  batchId: string;
  dosage: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE_URL}/shop/${product.id}#product`,
    name: product.name,
    description: product.description,
    image: DEFAULT_OG_IMAGE,
    category: product.category,
    sku: product.batchId,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Temple of Asclepius Pharmacopeia',
    },
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      priceValidUntil: '2028-12-31',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/shop/${product.id}`,
      seller: {
        '@id': `${SITE_URL}/#pharmacy`,
      },
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Batch ID',
        value: product.batchId,
      },
      {
        '@type': 'PropertyValue',
        name: 'Dosage Protocol',
        value: product.dosage,
      },
      {
        '@type': 'PropertyValue',
        name: 'Provenance Verification',
        value: 'Keccak-256 On-Chain Stamped',
      },
    ],
  };
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
