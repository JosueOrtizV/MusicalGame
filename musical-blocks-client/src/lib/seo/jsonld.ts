const BASE_URL = 'https://voxelrave.com';

export function getVideoGameSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'VoxelRave',
    alternateName: 'Musical Blocks',
    description:
      'Juego de ritmo multijugador 3D gratuito. Baila sobre bloques de colores, sobrevive rondas de eliminación y sé el último en pie.',
    url: BASE_URL,
    image: `${BASE_URL}/og-image.png`,
    applicationCategory: 'Game',
    applicationSubCategory: 'Rhythm Game',
    gamePlatform: ['Web Browser', 'Mobile Browser'],
    operatingSystem: 'Any',
    genre: ['Rhythm', 'Party Game', 'Arcade', 'Multiplayer'],
    playMode: ['SinglePlayer', 'MultiPlayer', 'CoOp'],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 10,
    },
    inLanguage: ['es', 'en'],
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    author: {
      '@type': 'Organization',
      name: 'VoxelRave Studios',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'VoxelRave Studios',
      url: BASE_URL,
    },
  };
}

export function getWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'VoxelRave',
    url: BASE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires WebGL 2.0',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
  };
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VoxelRave Studios',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    sameAs: [],
  };
}

export function getBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
