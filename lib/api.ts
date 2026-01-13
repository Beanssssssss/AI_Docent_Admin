import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ==================== Gallery API (Supabase 직접 호출) ====================
export async function fetchGalleries() {
  const { data, error } = await supabase.from("Gallery").select("*");
  if (error) throw new Error(`갤러리 조회 실패: ${error.message}`);
  return data || [];
}

export async function createGallery(data: {
  name: string;
  location: string;
  description: string;
}) {
  const { data: result, error } = await supabase
    .from("Gallery")
    .insert([data])
    .select()
    .single();
  if (error) throw new Error(`갤러리 생성 실패: ${error.message}`);
  return result;
}

export async function updateGallery(
  id: number,
  data: { name: string; location: string; description: string }
) {
  const { data: result, error } = await supabase
    .from("Gallery")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`갤러리 수정 실패: ${error.message}`);
  return result;
}

export async function deleteGallery(id: number) {
  const { error } = await supabase.from("Gallery").delete().eq("id", id);
  if (error) throw new Error(`갤러리 삭제 실패: ${error.message}`);
  return { success: true };
}

// ==================== Exhibition API (Supabase 직접 호출) ====================
export async function fetchExhibitions(galleryId: number) {
  const { data, error } = await supabase
    .from("Exhibition")
    .select("id, gallery_id, name, description, info, start_date, end_date, is_now, show, brochure, location, admission_fee, poster_url")
    .eq("gallery_id", galleryId)
    .order("id", { ascending: false });
  if (error) throw new Error(`전시 조회 실패: ${error.message}`);
  return data || [];
}

// 모든 전시 가져오기 (필터링 옵션 포함)
export async function fetchAllExhibitions(filters?: {
  is_now?: boolean;
  show?: boolean;
  search?: string;
}) {
  let query = supabase
    .from("Exhibition")
    .select("id, gallery_id, name, description, info, start_date, end_date, is_now, show, brochure, location, admission_fee, poster_url")
    .order("id", { ascending: false });

  if (filters?.is_now !== undefined) {
    query = query.eq("is_now", filters.is_now);
  }
  if (filters?.show !== undefined) {
    query = query.eq("show", filters.show);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`전시 조회 실패: ${error.message}`);
  return data || [];
}

// 특정 ID 목록으로 전시 가져오기
export async function fetchExhibitionsByIds(exhibitionIds: number[]) {
  if (exhibitionIds.length === 0) return [];
  
  // Supabase의 in() 쿼리는 최대 1000개까지만 지원하므로, 1000개씩 나눠서 조회
  const chunks: number[][] = [];
  for (let i = 0; i < exhibitionIds.length; i += 1000) {
    chunks.push(exhibitionIds.slice(i, i + 1000));
  }
  
  const allExhibitions: any[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("Exhibition")
      .select("id, gallery_id, name, description, info, start_date, end_date, is_now, show, brochure, location, admission_fee, poster_url")
      .in("id", chunk);
    
    if (error) throw new Error(`전시 조회 실패: ${error.message}`);
    if (data) allExhibitions.push(...data);
  }
  
  return allExhibitions;
}

export async function createExhibition(data: {
  gallery_id: number;
  name: string;
  description: string;
  info?: string;
  start_date: string;
  end_date: string;
  is_now: boolean;
  show: boolean;
  brochure?: string;
  location: string;
  admission_fee?: string;
  poster_url?: string;
}) {
  const { data: result, error } = await supabase
    .from("Exhibition")
    .insert([data])
    .select()
    .single();
  if (error) throw new Error(`전시 생성 실패: ${error.message}`);
  return result;
}

export async function updateExhibition(
  id: number,
  data: {
    gallery_id: number;
    name: string;
    description: string;
    info?: string;
    start_date: string;
    end_date: string;
    is_now: boolean;
    show?: boolean;
    brochure?: string;
    location: string;
    admission_fee?: string;
    poster_url?: string;
  }
) {
  const { data: result, error } = await supabase
    .from("Exhibition")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`전시 수정 실패: ${error.message}`);
  return result;
}

export async function deleteExhibition(id: number) {
  const { error } = await supabase.from("Exhibition").delete().eq("id", id);
  if (error) throw new Error(`전시 삭제 실패: ${error.message}`);
  return { success: true };
}

// ==================== Artwork API (Supabase 직접 호출) ====================
export async function uploadArtworkImage(
  file: File,
  artistName: string
): Promise<string> {
  // 작가명을 안전한 형식으로 변환
  let sanitizedArtistName = artistName.trim();
  
  if (!sanitizedArtistName) {
    sanitizedArtistName = "unknown";
  }

  // 브라우저 환경에서 Base64 인코딩 (URL-safe)
  // 한글을 포함한 모든 문자를 안전하게 처리
  const utf8Bytes = new TextEncoder().encode(sanitizedArtistName);
  const base64String = btoa(String.fromCharCode(...utf8Bytes));
  const encodedArtistName = base64String
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // 파일 확장자 추출
  const fileExt = file.name.split(".").pop() || "jpg";
  
  // 작가 폴더 경로
  const folderPath = `Artworks/${encodedArtistName}`;
  
  // 작가 폴더의 기존 파일 목록 가져오기
  const { data: existingFiles, error: listError } = await supabase.storage
    .from("AI_Docent")
    .list(folderPath);

  let nextNumber = 1;
  
  if (!listError && existingFiles && existingFiles.length > 0) {
    // 파일명에서 숫자 추출 (예: "123.jpg" -> 123)
    const numbers = existingFiles
      .map((file) => {
        const match = file.name.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => num > 0);
    
    if (numbers.length > 0) {
      // 가장 큰 번호 찾기
      const maxNumber = Math.max(...numbers);
      nextNumber = maxNumber + 1;
    }
  }
  
  // 다음 번호로 파일명 생성
  const fileName = `${nextNumber}.${fileExt}`;
  
  // 경로 구성: Artworks/{인코딩된작가명}/{파일명}
  const filePath = `${folderPath}/${fileName}`;

  // Supabase Storage에 업로드
  // 버킷 이름: "AI_Docent", 경로: "Artworks/{작가명}/{파일명}"
  const { data, error } = await supabase.storage
    .from("AI_Docent")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  // Public URL 가져오기
  const {
    data: { publicUrl },
  } = supabase.storage.from("AI_Docent").getPublicUrl(filePath);

  return publicUrl;
}

export async function fetchAllArtworks() {
  const { data, error } = await supabase
    .from("Artworks")
    .select("*");
  if (error) throw new Error(`작품 조회 실패: ${error.message}`);
  return data || [];
}

export async function fetchArtworks(exhibitionId: number) {
  const { data, error } = await supabase
    .from("Artworks")
    .select("*")
    .eq("exhibition_id", exhibitionId);
  if (error) throw new Error(`작품 조회 실패: ${error.message}`);
  return data || [];
}

export async function fetchArtworkDetail(id: string) {
  const { data, error } = await supabase
    .from("Artworks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`작품 상세 조회 실패: ${error.message}`);
  return data;
}

export async function createArtwork(data: {
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
}) {
  if (!data.exhibition_id) {
    throw new Error("전시를 선택해야 합니다.");
  }

  const { data: result, error } = await supabase
    .from("Artworks")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`작품 생성 실패: ${error.message}`);
  
  return result;
}

export async function updateArtwork(
  id: string,
  data: {
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
  }
) {
  if (!data.exhibition_id) {
    throw new Error("전시를 선택해야 합니다.");
  }

  const { data: updated, error } = await supabase
    .from("Artworks")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`작품 수정 실패: ${error.message}`);
  
  return updated;
}

export async function deleteArtwork(id: string) {
  // 먼저 현재 작품 정보 가져오기
  const { data: currentArtwork, error: fetchError } = await supabase
    .from("Artworks")
    .select("title, artist")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(`작품 조회 실패: ${fetchError.message}`);
  if (!currentArtwork) throw new Error("작품을 찾을 수 없습니다.");

  // 같은 작품(제목+작가)의 모든 레코드 삭제
  const { error } = await supabase
    .from("Artworks")
    .delete()
    .eq("title", currentArtwork.title)
    .eq("artist", currentArtwork.artist);

  if (error) throw new Error(`작품 삭제 실패: ${error.message}`);
  return { success: true };
}

// ==================== Artwork-Exhibition 관계 API ====================
// 작품에 연결된 전시 목록 가져오기 (제목+작가로 같은 작품의 모든 전시 조회)
export async function getArtworkExhibitions(artworkId: string) {
  // 먼저 현재 작품 정보 가져오기
  const { data: currentArtwork, error: fetchError } = await supabase
    .from("Artworks")
    .select("title, artist")
    .eq("id", artworkId)
    .single();

  if (fetchError) throw new Error(`작품 조회 실패: ${fetchError.message}`);
  if (!currentArtwork) return [];

  // 같은 작품(제목+작가)의 모든 레코드에서 exhibition_id 조회
  const { data, error } = await supabase
    .from("Artworks")
    .select("exhibition_id")
    .eq("title", currentArtwork.title)
    .eq("artist", currentArtwork.artist);

  if (error) throw new Error(`연결된 전시 조회 실패: ${error.message}`);
  return [...new Set(data?.map((item) => item.exhibition_id) || [])];
}

// 전시에 연결된 작품 목록 가져오기 (직접 exhibition_id로 조회)
export async function fetchArtworksByExhibitions(exhibitionIds: number[]) {
  if (exhibitionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("Artworks")
    .select("*")
    .in("exhibition_id", exhibitionIds);

  if (error) throw new Error(`작품 조회 실패: ${error.message}`);
  return data || [];
}

// 모든 작가 목록 가져오기
export async function fetchAllArtists() {
  const { data, error } = await supabase
    .from("Artworks")
    .select("artist")
    .order("artist", { ascending: true });

  if (error) throw new Error(`작가 조회 실패: ${error.message}`);
  
  // 중복 제거
  const uniqueArtists = [...new Set(data?.map((item) => item.artist) || [])];
  return uniqueArtists.sort();
}

// 작가별 작품 목록 가져오기
export async function fetchArtworksByArtists(artistNames: string[]) {
  if (artistNames.length === 0) return [];

  const { data, error } = await supabase
    .from("Artworks")
    .select("*")
    .in("artist", artistNames)
    .order("title", { ascending: true });

  if (error) throw new Error(`작품 조회 실패: ${error.message}`);
  return data || [];
}

// ==================== Image Search API ====================
export async function searchByImage(file: File, exhibitionId: number) {
  const form = new FormData();
  form.append("image", file);
  form.append("exhibition_id", String(exhibitionId));

  const res = await fetch(`${API_BASE}/image-search/`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("이미지 검색 실패");
  return res.json();
}
export async function uploadExhibitionPosterById(
  file: File,
  exhibitionId: number
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const filePath = `poster/${exhibitionId}/poster.${ext}`;

  const { error } = await supabase.storage
    .from("AI_Docent")
    .upload(filePath, file, {
      upsert: true, // ✅ 같은 전시 포스터 교체 가능
      contentType: file.type,
    });

  if (error) {
    throw new Error("포스터 업로드 실패: " + error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("AI_Docent").getPublicUrl(filePath);

  return publicUrl;
}