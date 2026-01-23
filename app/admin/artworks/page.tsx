"use client";

import { useState, useEffect } from "react";
import {
  fetchGalleries,
  fetchExhibitions,
  fetchAllExhibitions,
  fetchArtworks,
  fetchArtworksByExhibitions,
  fetchAllArtists,
  fetchArtworksByArtists,
  getArtworkExhibitions,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  uploadArtworkImage,
  fetchAllArtworks,
} from "@/lib/api";
import type { Artwork, Exhibition } from "@/lib/types";
import AdminSidebar from "@/components/AdminSidebar";

type SortOption = "title_asc" | "title_desc" | "artist_asc" | "artist_desc" | "year_asc" | "year_desc";

export default function ArtworksPage() {
  
  // 공통 상태
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filteredArtworks, setFilteredArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("title_asc");
  
  // 검색 필드
  const [exhibitionSearchQuery, setExhibitionSearchQuery] = useState(""); // 전시명 검색
  const [artistSearchQuery, setArtistSearchQuery] = useState(""); // 작가명 검색
  const [artworkTitleSearch, setArtworkTitleSearch] = useState(""); // 작품명 검색
  
  // 전시 및 작가 목록 (검색용)
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    exhibition_id: null as number | null,
    title: "",
    artist: "",
    description: "",
    image_url: "",
    imageFile: null as File | null,
    production_year: "",
    ingredients: "",
    size: "",
    management_number: "",
    is_now: false,
    embedding: "",
  });
  const [uploading, setUploading] = useState(false);
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [exhibitionsData, artistsData, artworksData] = await Promise.all([
          fetchAllExhibitions().catch(() => []),
          fetchAllArtists().catch(() => []),
          fetchAllArtworks().catch(() => []),
        ]);
        setExhibitions(exhibitionsData);
        setArtists(artistsData);
        setArtworks(artworksData);
        setFilteredArtworks(artworksData);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // 작가 입력 시 자동완성 필터링
  useEffect(() => {
    if (formData.artist.trim()) {
      const query = formData.artist.toLowerCase();
      const filtered = artists.filter((artist) =>
        artist.toLowerCase().includes(query) && artist !== formData.artist
      );
      setArtistSuggestions(filtered.slice(0, 5)); // 최대 5개만 표시
      setShowArtistSuggestions(filtered.length > 0);
    } else {
      setArtistSuggestions([]);
      setShowArtistSuggestions(false);
    }
  }, [formData.artist, artists]);


  // 검색 및 정렬 적용
  useEffect(() => {
    let filtered = [...artworks];

    // 전시명으로 검색
    if (exhibitionSearchQuery.trim()) {
      const query = exhibitionSearchQuery.toLowerCase();
      // 작품의 exhibition_id로 전시를 찾아서 전시명으로 필터링
      filtered = filtered.filter((artwork) => {
        if (!artwork.exhibition_id) return false;
        const exhibition = exhibitions.find(e => e.id === artwork.exhibition_id);
        return exhibition?.name.toLowerCase().includes(query) ?? false;
      });
    }

    // 작가명으로 검색
    if (artistSearchQuery.trim()) {
      const query = artistSearchQuery.toLowerCase();
      filtered = filtered.filter((artwork) =>
        artwork.artist.toLowerCase().includes(query)
      );
    }

    // 작품명으로 검색
    if (artworkTitleSearch.trim()) {
      const query = artworkTitleSearch.toLowerCase();
      filtered = filtered.filter((artwork) =>
        artwork.title.toLowerCase().includes(query)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "title_asc":
          return a.title.localeCompare(b.title, "ko");
        case "title_desc":
          return b.title.localeCompare(a.title, "ko");
        case "artist_asc":
          return a.artist.localeCompare(b.artist, "ko");
        case "artist_desc":
          return b.artist.localeCompare(a.artist, "ko");
        case "year_asc":
          const yearA = a.production_year || "";
          const yearB = b.production_year || "";
          return yearA.localeCompare(yearB);
        case "year_desc":
          const yearA2 = a.production_year || "";
          const yearB2 = b.production_year || "";
          return yearB2.localeCompare(yearA2);
        default:
          return 0;
      }
    });

    setFilteredArtworks(filtered);
  }, [artworks, exhibitionSearchQuery, artistSearchQuery, artworkTitleSearch, exhibitions, sortOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = formData.image_url;

      // 이미지 파일이 있으면 업로드
      if (formData.imageFile) {
        if (!formData.artist.trim()) {
          alert("작가명을 입력해주세요. 이미지 업로드를 위해 필요합니다.");
          setUploading(false);
          return;
        }
        try {
          imageUrl = await uploadArtworkImage(formData.imageFile, formData.artist);
        } catch (error: any) {
          alert(`이미지 업로드 실패: ${error.message}`);
          setUploading(false);
          return;
        }
      }

      if (!formData.exhibition_id) {
        alert("전시를 선택해주세요.");
        setUploading(false);
        return;
      }

      // embedding 파싱 (쉼표로 구분된 숫자 또는 [0.1, 0.2, 0.3] 형식 지원)
      let embeddingArray: number[] | undefined = undefined;
      if (formData.embedding.trim()) {
        try {
          let embeddingText = formData.embedding.trim();
          
          // [] 형식인 경우 양끝의 [] 제거
          if (embeddingText.startsWith("[") && embeddingText.endsWith("]")) {
            embeddingText = embeddingText.slice(1, -1).trim();
          }
          
          // 쉼표로 구분된 숫자 파싱
          embeddingArray = embeddingText
            .split(",")
            .map((val) => parseFloat(val.trim()))
            .filter((val) => !isNaN(val));
          
          if (embeddingArray.length === 0) {
            embeddingArray = undefined;
          }
        } catch (error) {
          console.error("Embedding 파싱 실패:", error);
          alert("Embedding 형식이 올바르지 않습니다. 쉼표로 구분된 숫자 또는 [0.1, 0.2, 0.3] 형식을 입력해주세요.");
          setUploading(false);
          return;
        }
      }

      const submitData = {
        exhibition_id: formData.exhibition_id,
        title: formData.title,
        artist: formData.artist,
        description: formData.description || undefined,
        image_url: imageUrl || undefined,
        production_year: formData.production_year || undefined,
        ingredients: formData.ingredients || undefined,
        size: formData.size || undefined,
        management_number: formData.management_number
          ? Number(formData.management_number)
          : undefined,
        is_now: formData.is_now, // boolean 값은 명시적으로 전달 (false도 유지)
        embedding: embeddingArray,
      };

      if (editingArtwork) {
        await updateArtwork(editingArtwork.id, submitData);
        alert("작품이 수정되었습니다.");
      } else {
        await createArtwork(submitData);
        alert("작품이 생성되었습니다.");
      }
      setShowForm(false);
      setEditingArtwork(null);
      setFormData({
        exhibition_id: null,
        title: "",
        artist: "",
        description: "",
        image_url: "",
        imageFile: null,
        production_year: "",
        ingredients: "",
        size: "",
        management_number: "",
        is_now: false,
        embedding: "",
      });
      // 검색 필드로 필터링되므로 전체 작품 다시 로드
      loadAllArtworks();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다. 백엔드 API가 구현되었는지 확인해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (artwork: Artwork) => {
    setEditingArtwork(artwork);
    
    // 작품에 연결된 전시 ID 가져오기 (단일 선택)
    let exhibitionId: number | null = null;
    if (artwork.exhibition_id) {
      exhibitionId = artwork.exhibition_id;
    } else {
      // 폴백: 작품에 연결된 전시 목록에서 첫 번째 사용
      try {
        const exhibitionIds = await getArtworkExhibitions(artwork.id);
        if (exhibitionIds.length > 0) {
          exhibitionId = exhibitionIds[0];
        }
      } catch (error) {
        console.error("연결된 전시 조회 실패:", error);
      }
    }

    // embedding 처리: Supabase vector 타입은 배열로 반환됨
    let embeddingText = "";
    if (artwork.embedding) {
      if (Array.isArray(artwork.embedding)) {
        embeddingText = artwork.embedding.join(", ");
      } else if (typeof artwork.embedding === "string") {
        // 이미 문자열 형태인 경우
        embeddingText = artwork.embedding;
      } else {
        // 다른 형태인 경우 JSON으로 변환 시도
        try {
          const parsed = JSON.parse(String(artwork.embedding));
          if (Array.isArray(parsed)) {
            embeddingText = parsed.join(", ");
          }
        } catch {
          console.warn("Embedding 파싱 실패:", artwork.embedding);
        }
      }
    }

    setFormData({
      exhibition_id: exhibitionId,
      title: artwork.title,
      artist: artwork.artist,
      description: artwork.description || "",
      image_url: artwork.image_url || "",
      imageFile: null,
      production_year: artwork.production_year || "",
      ingredients: artwork.ingredients || "",
      size: artwork.size || "",
      management_number: String(artwork.management_number || ""),
      is_now: Boolean(artwork.is_now), // boolean으로 명시적 변환
      embedding: embeddingText,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteArtwork(id);
      alert("작품이 삭제되었습니다.");
      // 전체 작품 다시 로드
      loadAllArtworks();
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다. 백엔드 API가 구현되었는지 확인해주세요.");
    }
  };

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">작품 관리</h2>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingArtwork(null);
                setFormData({
                  exhibition_id: null,
                  title: "",
                  artist: "",
                  description: "",
                  image_url: "",
                  imageFile: null,
                  production_year: "",
                  ingredients: "",
                  size: "",
                  management_number: "",
                  is_now: false,
                  embedding: "",
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + 새 작품 추가
            </button>
          </div>

          {/* 검색 필드 */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium mb-1">전시명으로 검색</label>
                <input
                  type="text"
                  placeholder="전시명 입력..."
                  value={exhibitionSearchQuery}
                  onChange={(e) => setExhibitionSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium mb-1">작가명으로 검색</label>
                <input
                  type="text"
                  placeholder="작가명 입력..."
                  value={artistSearchQuery}
                  onChange={(e) => setArtistSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium mb-1">작품명으로 검색</label>
                <input
                  type="text"
                  placeholder="작품명 입력..."
                  value={artworkTitleSearch}
                  onChange={(e) => setArtworkTitleSearch(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              {(exhibitionSearchQuery || artistSearchQuery || artworkTitleSearch) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setExhibitionSearchQuery("");
                      setArtistSearchQuery("");
                      setArtworkTitleSearch("");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded"
                  >
                    검색 초기화
                  </button>
                </div>
              )}
            </div>
            {(exhibitionSearchQuery || artistSearchQuery || artworkTitleSearch) && (
              <div className="mt-2 text-sm text-gray-600">
                검색 결과: {filteredArtworks.length}개
              </div>
            )}
          </div>
        </div>

        {/* 정렬 */}
        {artworks.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-sm font-medium whitespace-nowrap">정렬:</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="px-3 py-2 border rounded min-w-[150px]"
                >
                  <option value="title_asc">제목 (가나다순)</option>
                  <option value="title_desc">제목 (역순)</option>
                  <option value="artist_asc">작가 (가나다순)</option>
                  <option value="artist_desc">작가 (역순)</option>
                  <option value="year_asc">연도 (오름차순)</option>
                  <option value="year_desc">연도 (내림차순)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">
              {editingArtwork ? "작품 수정" : "새 작품 추가"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  전시 <span className="text-red-500">*</span>
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {exhibitions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">전시가 없습니다.</div>
                  ) : (
                    exhibitions.map((exhibition) => (
                      <label
                        key={exhibition.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="radio"
                          name="exhibition"
                          checked={formData.exhibition_id === exhibition.id}
                          onChange={() => {
                            setFormData({
                              ...formData,
                              exhibition_id: exhibition.id,
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {exhibition.name}
                          {exhibition.is_now && (
                            <span className="ml-2 text-xs text-blue-600">[진행중]</span>
                          )}
                          {exhibition.show && (
                            <span className="ml-2 text-xs text-green-600">[표시]</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {formData.exhibition_id && (
                  <div className="mt-1 text-xs text-gray-500">
                    선택된 전시: {exhibitions.find(e => e.id === formData.exhibition_id)?.name || "알 수 없음"}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">작가</label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => {
                    setFormData({ ...formData, artist: e.target.value });
                    setShowArtistSuggestions(true);
                  }}
                  onFocus={() => {
                    if (formData.artist.trim() && artistSuggestions.length > 0) {
                      setShowArtistSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // 약간의 지연을 두어 클릭 이벤트가 먼저 발생하도록
                    setTimeout(() => setShowArtistSuggestions(false), 200);
                  }}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                {showArtistSuggestions && artistSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {artistSuggestions.map((artist) => (
                      <div
                        key={artist}
                        onClick={() => {
                          setFormData({ ...formData, artist });
                          setShowArtistSuggestions(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        {artist}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이미지</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, imageFile: file, image_url: "" });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded"
                  />
                  {formData.imageFile && (
                    <div className="text-sm text-gray-600">
                      선택된 파일: {formData.imageFile.name}
                    </div>
                  )}
                  {formData.image_url && !formData.imageFile && (
                    <div className="text-sm text-gray-600">
                      현재 이미지 URL: {formData.image_url}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    이미지를 업로드하면 작가명 폴더에 자동으로 저장됩니다.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">제작 연도</label>
                  <input
                    type="text"
                    value={formData.production_year}
                    onChange={(e) =>
                      setFormData({ ...formData, production_year: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">재료/기법</label>
                  <input
                    type="text"
                    value={formData.ingredients}
                    onChange={(e) =>
                      setFormData({ ...formData, ingredients: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">크기</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">관리 번호</label>
                <input
                  type="number"
                  value={formData.management_number}
                  onChange={(e) =>
                    setFormData({ ...formData, management_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_now}
                    onChange={(e) =>
                      setFormData({ ...formData, is_now: e.target.checked })
                    }
                    className="mr-2"
                  />
                  현재 전시 중인 작품
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Embedding (쉼표로 구분된 숫자 또는 배열 형식)
                </label>
                <textarea
                  value={formData.embedding}
                  onChange={(e) =>
                    setFormData({ ...formData, embedding: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="예: 0.123, -0.456, 0.789 또는 [0.123, -0.456, 0.789]"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Embedding 벡터를 쉼표로 구분하여 입력하거나 [0.1, 0.2, 0.3] 형식으로 입력하세요. 빈 값이면 저장되지 않습니다.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingArtwork ? "수정" : "추가"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingArtwork(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden min-h-[500px] w-full">
            <div className="overflow-x-auto">
              <table className="divide-y divide-gray-200" style={{ minWidth: "900px", width: "100%" }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: "120px", minWidth: "120px" }}>
                    이미지
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: "250px" }}>
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: "180px" }}>
                    작가
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: "200px" }}>
                    전시
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: "120px" }}>
                    제작연도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: "150px", minWidth: "150px" }}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredArtworks.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                      {(exhibitionSearchQuery || artistSearchQuery || artworkTitleSearch) 
                        ? "검색 결과가 없습니다." 
                        : "작품이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredArtworks.map((artwork) => {
                    const exhibition = exhibitions.find(e => e.id === artwork.exhibition_id);
                    return (
                      <tr key={artwork.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {artwork.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {artwork.artist}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {exhibition ? (
                            <div>
                              <div className="font-medium">{exhibition.name}</div>
                              {exhibition.is_now && (
                                <span className="text-xs text-blue-600">[진행중]</span>
                              )}
                              {exhibition.show && (
                                <span className="text-xs text-green-600 ml-1">[표시]</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">전시 없음</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {artwork.production_year || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEdit(artwork)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(artwork.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}