export interface PlayAppMetadata {
  appId: string;
  title: string;
  summary?: string;
  description?: string;
  developer: string;
  developerId?: string;
  developerEmail?: string;
  developerWebsite?: string;
  developerAddress?: string;
  score: number;
  scoreText?: string;
  ratings?: number;
  reviews?: number;
  installs?: string;
  minInstalls: number;
  maxInstalls: number;
  free: boolean;
  price: number;
  currency?: string;
  priceText?: string;
  offersIAP?: boolean;
  size?: string;
  androidVersion?: string;
  androidVersionText?: string;
  genre: string;
  genreId: string;
  icon: string;
  headerImage?: string;
  screenshots: string[];
  video?: string;
  videoImage?: string;
  contentRating?: string;
  adSupported?: boolean;
  released?: string;
  updated?: number | string;
  version?: string;
  recentChanges?: string;
  url: string;
}

export interface PlaySearchResultItem {
  appId: string;
  title: string;
  summary?: string;
  developer: string;
  developerId?: string;
  score: number;
  scoreText?: string;
  priceText?: string;
  free: boolean;
  icon: string;
  installs?: string;
  currency?: string;
  price: number;
  genre?: string;
  genreId?: string;
  url: string;
}

export enum PlayCollection {
  TOP_FREE = 'TOP_FREE',
  TOP_PAID = 'TOP_PAID',
  GROSSING = 'GROSSING',
}

export interface PlayCategoryItem {
  id: string;
  name: string;
}

