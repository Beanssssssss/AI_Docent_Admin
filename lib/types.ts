// 기본 타입
export type Gallery = {
  id: number;
  name: string;
  location: string;
  description: string;
};

export type Exhibition = {
  id: number;
  gallery_id: number;
  name: string;
  description: string;
  info: string;
  start_date: string;
  end_date: string;
  is_now: boolean;
  show: boolean;
  brochure?: string;
  location: string;
  admission_fee?: string;
  poster_url?: string;
};

export type Artwork = {
  id: string;
  exhibition_id: number;
  title: string;
  artist: string;
  description?: string;
  image_url?: string;
  production_year?: string;
  ingredients?: string;
  size?: string;
  management_number?: number;
  is_now?: boolean;
};

export type ImageSearchResult = {
  score: number;
  artwork: Artwork;
};

// 관리자 페이지용 타입
export type GalleryFormData = {
  name: string;
  location: string;
  description: string;
};

export type ExhibitionFormData = {
  gallery_id: number;
  name: string;
  description: string;
  info: string;
  start_date: string;
  end_date: string;
  is_now: boolean;
  show: boolean;
  brochure?: string;
  location: string;
  admission_fee?: string;
};

export type ArtworkFormData = {
  exhibition_id: number;
  title: string;
  artist: string;
  description?: string;
  image_url?: string;
  production_year?: string;
  ingredients?: string;
  size?: string;
  management_number?: number;
  is_now?: boolean;
};