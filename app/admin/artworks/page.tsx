"use client";

import { useState, useEffect } from "react";
import {
  fetchGalleries,
  fetchExhibitions,
  fetchAllExhibitions,
  fetchExhibitionsByIds,
  fetchArtworks,
  fetchArtworksByExhibitions,
  fetchAllArtists,
  fetchArtworksByArtists,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  uploadArtworkImage,
} from "@/lib/api";
import type { Artwork, Exhibition } from "@/lib/types";
import AdminSidebar from "@/components/AdminSidebar";

type SortOption = "title_asc" | "title_desc" | "artist_asc" | "artist_desc" | "year_asc" | "year_desc";
type ViewMode = "exhibition" | "artist";

export default function ArtworksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("exhibition");
  
  // 공통 상태
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filteredArtworks, setFilteredArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("title_asc");
  
  // 전시별 뷰 상태
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [filteredExhibitions, setFilteredExhibitions] = useState<Exhibition[]>([]);
  const [selectedExhibitionIds, setSelectedExhibitionIds] = useState<number[]>([]);
  const [exhibitionSearchQuery, setExhibitionSearchQuery] = useState("");
  const [exhibitionFilter, setExhibitionFilter] = useState<{
    is_now?: boolean;
    show?: boolean;
  }>({});
  
  // 작가별 뷰 상태
  const [artists, setArtists] = useState<string[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<string[]>([]);
  const [selectedArtistNames, setSelectedArtistNames] = useState<string[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
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
  });
  const [uploading, setUploading] = useState(false);
  
  // 작품 추가 폼용 작가 검색 상태
  const [formArtistSearch, setFormArtistSearch] = useState("");
  const [formArtists, setFormArtists] = useState<string[]>([]);
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);

  useEffect(() => {
    if (viewMode === "exhibition") {
      loadAllExhibitions();
    } else {
      loadAllArtists();
    }
  }, [viewMode]);
  
  // 작품 추가 폼이 열릴 때 작가 목록 로드
  useEffect(() => {
    if (showForm) {
      const loadFormArtists = async () => {
        try {
          const data = await fetchAllArtists();
          setFormArtists(data);
        } catch (error) {
          console.error("작가 로딩 실패:", error);
        }
      };
      loadFormArtists();
    }
  }, [showForm]);

  useEffect(() => {
    if (viewMode === "exhibition") {
      loadFilteredExhibitions();
    } else {
      loadFilteredArtists();
    }
  }, [viewMode, exhibitionFilter, exhibitionSearchQuery, artistSearchQuery]);

  useEffect(() => {
    if (viewMode === "exhibition") {
      if (selectedExhibitionIds.length > 0) {
        loadArtworksByExhibitions(selectedExhibitionIds);
      } else {
        setArtworks([]);
        setFilteredArtworks([]);
        setLoading(false);
      }
    } else {
      if (selectedArtistNames.length > 0) {
        loadArtworksByArtists(selectedArtistNames);
      } else {
        setArtworks([]);
        setFilteredArtworks([]);
        setLoading(false);
      }
    }
  }, [viewMode, selectedExhibitionIds, selectedArtistNames]);

  const loadAllExhibitions = async () => {
    try {
      const data = await fetchAllExhibitions();
      setExhibitions(data);
      loadFilteredExhibitions();
    } catch (error) {
      console.error("전시 로딩 실패:", error);
    }
  };

  const loadFilteredExhibitions = async () => {
    try {
      const filters: { is_now?: boolean; show?: boolean; search?: string } = {};
      if (exhibitionFilter.is_now !== undefined) filters.is_now = exhibitionFilter.is_now;
      if (exhibitionFilter.show !== undefined) filters.show = exhibitionFilter.show;
      if (exhibitionSearchQuery.trim()) filters.search = exhibitionSearchQuery;

      const data = await fetchAllExhibitions(filters);
      setFilteredExhibitions(data);
    } catch (error) {
      console.error("전시 필터링 실패:", error);
    }
  };

  const loadAllArtists = async () => {
    try {
      const data = await fetchAllArtists();
      setArtists(data);
      loadFilteredArtists();
    } catch (error) {
      console.error("작가 로딩 실패:", error);
    }
  };

  const loadFilteredArtists = () => {
    let filtered = [...artists];
    
    if (artistSearchQuery.trim()) {
      const query = artistSearchQuery.toLowerCase();
      filtered = filtered.filter((artist) =>
        artist.toLowerCase().includes(query)
      );
    }
    
    setFilteredArtists(filtered);
  };

  const loadArtworksByExhibitions = async (exhibitionIds: number[]) => {
    setLoading(true);
    try {
      // 다대다 관계를 사용하여 작품 가져오기
      const data = await fetchArtworksByExhibitions(exhibitionIds);
      setArtworks(data);
      setFilteredArtworks(data);
      
      // 작품들의 exhibition_id 수집
      const artworkExhibitionIds = data
        .filter(a => a.exhibition_id !== null && a.exhibition_id !== undefined)
        .map(a => typeof a.exhibition_id === 'number' ? a.exhibition_id : Number(a.exhibition_id))
        .filter(id => !isNaN(id));
      
      const uniqueArtworkExhibitionIds = [...new Set(artworkExhibitionIds)];
      
      // 기존 전시 목록에 없는 전시 ID 찾기
      const existingExhibitionIds = new Set(exhibitions.map(e => e.id));
      const missingExhibitionIds = uniqueArtworkExhibitionIds.filter(id => !existingExhibitionIds.has(id));
      
      // 누락된 전시 ID로 전시 추가 조회
      if (missingExhibitionIds.length > 0) {
        const missingExhibitions = await fetchExhibitionsByIds(missingExhibitionIds).catch((error) => {
          console.error("누락된 전시 조회 실패:", error);
          return [];
        });
        
        // 기존 전시 목록과 병합 (중복 제거)
        const exhibitionsMap = new Map(exhibitions.map(e => [e.id, e]));
        missingExhibitions.forEach(e => {
          if (!exhibitionsMap.has(e.id)) {
            exhibitionsMap.set(e.id, e);
          }
        });
        
        setExhibitions(Array.from(exhibitionsMap.values()));
      }
    } catch (error) {
      console.error("작품 로딩 실패:", error);
      // 다대다 관계가 없으면 기존 방식으로 폴백
      if (exhibitionIds.length === 1) {
        try {
          const data = await fetchArtworks(exhibitionIds[0]);
          setArtworks(data);
          setFilteredArtworks(data);
          
          // 작품들의 exhibition_id 수집
          const artworkExhibitionIds = data
            .filter(a => a.exhibition_id !== null && a.exhibition_id !== undefined)
            .map(a => typeof a.exhibition_id === 'number' ? a.exhibition_id : Number(a.exhibition_id))
            .filter(id => !isNaN(id));
          
          const uniqueArtworkExhibitionIds = [...new Set(artworkExhibitionIds)];
          
          // 기존 전시 목록에 없는 전시 ID 찾기
          const existingExhibitionIds = new Set(exhibitions.map(e => e.id));
          const missingExhibitionIds = uniqueArtworkExhibitionIds.filter(id => !existingExhibitionIds.has(id));
          
          // 누락된 전시 ID로 전시 추가 조회
          if (missingExhibitionIds.length > 0) {
            const missingExhibitions = await fetchExhibitionsByIds(missingExhibitionIds).catch((error) => {
              console.error("누락된 전시 조회 실패:", error);
              return [];
            });
            
            // 기존 전시 목록과 병합 (중복 제거)
            const exhibitionsMap = new Map(exhibitions.map(e => [e.id, e]));
            missingExhibitions.forEach(e => {
              if (!exhibitionsMap.has(e.id)) {
                exhibitionsMap.set(e.id, e);
              }
            });
            
            setExhibitions(Array.from(exhibitionsMap.values()));
          }
        } catch (fallbackError) {
          console.error("작품 로딩 실패 (폴백):", fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadArtworksByArtists = async (artistNames: string[]) => {
    setLoading(true);
    try {
      const data = await fetchArtworksByArtists(artistNames);
      setArtworks(data);
      setFilteredArtworks(data);
      
      // 작품들의 exhibition_id 수집
      const artworkExhibitionIds = data
        .filter(a => a.exhibition_id !== null && a.exhibition_id !== undefined)
        .map(a => typeof a.exhibition_id === 'number' ? a.exhibition_id : Number(a.exhibition_id))
        .filter(id => !isNaN(id));
      
      const uniqueArtworkExhibitionIds = [...new Set(artworkExhibitionIds)];
      
      // 기존 전시 목록에 없는 전시 ID 찾기
      const existingExhibitionIds = new Set(exhibitions.map(e => e.id));
      const missingExhibitionIds = uniqueArtworkExhibitionIds.filter(id => !existingExhibitionIds.has(id));
      
      // 누락된 전시 ID로 전시 추가 조회
      if (missingExhibitionIds.length > 0) {
        const missingExhibitions = await fetchExhibitionsByIds(missingExhibitionIds).catch((error) => {
          console.error("누락된 전시 조회 실패:", error);
          return [];
        });
        
        // 기존 전시 목록과 병합 (중복 제거)
        const exhibitionsMap = new Map(exhibitions.map(e => [e.id, e]));
        missingExhibitions.forEach(e => {
          if (!exhibitionsMap.has(e.id)) {
            exhibitionsMap.set(e.id, e);
          }
        });
        
        setExhibitions(Array.from(exhibitionsMap.values()));
      }
    } catch (error) {
      console.error("작품 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 정렬 적용
  useEffect(() => {
    let filtered = [...artworks];

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (artwork) =>
          artwork.title.toLowerCase().includes(query) ||
          artwork.artist.toLowerCase().includes(query) ||
          (artwork.description?.toLowerCase().includes(query) ?? false) ||
          (artwork.production_year?.toLowerCase().includes(query) ?? false)
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
  }, [artworks, searchQuery, sortOption]);

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
      });
      if (viewMode === "exhibition" && selectedExhibitionIds.length > 0) {
        loadArtworksByExhibitions(selectedExhibitionIds);
      } else if (viewMode === "artist" && selectedArtistNames.length > 0) {
        loadArtworksByArtists(selectedArtistNames);
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다. 백엔드 API가 구현되었는지 확인해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (artwork: Artwork) => {
    setEditingArtwork(artwork);

    setFormData({
      exhibition_id: artwork.exhibition_id || null,
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
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteArtwork(id);
      alert("작품이 삭제되었습니다.");
      if (viewMode === "exhibition" && selectedExhibitionIds.length > 0) {
        loadArtworksByExhibitions(selectedExhibitionIds);
      } else if (viewMode === "artist" && selectedArtistNames.length > 0) {
        loadArtworksByArtists(selectedArtistNames);
      }
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
                  exhibition_id: selectedExhibitionIds.length > 0 ? selectedExhibitionIds[0] : null,
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
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + 새 작품 추가
            </button>
          </div>

          {/* 탭 메뉴 */}
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => {
                setViewMode("exhibition");
                setSelectedExhibitionIds([]);
                setArtworks([]);
                setFilteredArtworks([]);
              }}
              className={`px-4 py-2 font-medium ${
                viewMode === "exhibition"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              전시별 작품
            </button>
            <button
              onClick={() => {
                setViewMode("artist");
                setSelectedArtistNames([]);
                setArtworks([]);
                setFilteredArtworks([]);
              }}
              className={`px-4 py-2 font-medium ${
                viewMode === "artist"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              작가별 작품
            </button>
          </div>

          {/* 전시별 필터링 및 검색 */}
          {viewMode === "exhibition" && (
            <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
              <div className="flex gap-4 items-center flex-wrap mb-4">
                <div className="flex-1 min-w-[300px]">
                  <input
                    type="text"
                    placeholder="전시명으로 검색..."
                    value={exhibitionSearchQuery}
                    onChange={(e) => setExhibitionSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exhibitionFilter.is_now === true}
                      onChange={(e) =>
                        setExhibitionFilter({
                          ...exhibitionFilter,
                          is_now: e.target.checked ? true : undefined,
                        })
                      }
                      className="mr-2"
                    />
                    현재 전시 중
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exhibitionFilter.show === true}
                      onChange={(e) =>
                        setExhibitionFilter({
                          ...exhibitionFilter,
                          show: e.target.checked ? true : undefined,
                        })
                      }
                      className="mr-2"
                    />
                    표시 중
                  </label>
                  {(exhibitionFilter.is_now !== undefined ||
                    exhibitionFilter.show !== undefined ||
                    exhibitionSearchQuery) && (
                    <button
                      onClick={() => {
                        setExhibitionFilter({});
                        setExhibitionSearchQuery("");
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              </div>

              {/* 전시 선택 (단일 선택) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  전시 선택
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {filteredExhibitions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">전시가 없습니다.</div>
                  ) : (
                    filteredExhibitions.map((exhibition) => (
                      <label
                        key={exhibition.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="radio"
                          name="exhibition-select"
                          checked={selectedExhibitionIds.length === 1 && selectedExhibitionIds[0] === exhibition.id}
                          onChange={() => {
                            setSelectedExhibitionIds([exhibition.id]);
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
                {selectedExhibitionIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    선택된 전시: {exhibitions.find(ex => ex.id === selectedExhibitionIds[0])?.name || selectedExhibitionIds[0]}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 작가별 필터링 및 검색 */}
          {viewMode === "artist" && (
            <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
              <div className="mb-4">
                <div className="flex-1 min-w-[300px]">
                  <input
                    type="text"
                    placeholder="작가명으로 검색..."
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                {artistSearchQuery && (
                  <button
                    onClick={() => setArtistSearchQuery("")}
                    className="mt-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    검색 초기화
                  </button>
                )}
              </div>

              {/* 작가 선택 (다중 선택) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  작가 선택 (다중 선택 가능)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {filteredArtists.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">작가가 없습니다.</div>
                  ) : (
                    filteredArtists.map((artist) => (
                      <label
                        key={artist}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedArtistNames.includes(artist)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedArtistNames([
                                ...selectedArtistNames,
                                artist,
                              ]);
                            } else {
                              setSelectedArtistNames(
                                selectedArtistNames.filter((name) => name !== artist)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{artist}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedArtistNames.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    선택된 작가: {selectedArtistNames.length}개
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 검색 및 정렬 */}
        {artworks.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <input
                  type="text"
                  placeholder="제목, 작가, 설명, 연도로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 whitespace-nowrap flex-shrink-0"
                >
                  검색 초기화
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                검색 결과: {filteredArtworks.length}개
              </div>
            )}
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
                      선택된 전시: {exhibitions.find(ex => ex.id === formData.exhibition_id)?.name || formData.exhibition_id}
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
              <div>
                <label className="block text-sm font-medium mb-1">작가</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.artist}
                    onChange={(e) => {
                      setFormData({ ...formData, artist: e.target.value });
                      setFormArtistSearch(e.target.value);
                      setShowArtistSuggestions(true);
                    }}
                    onFocus={() => setShowArtistSuggestions(true)}
                    onBlur={() => {
                      // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록
                      setTimeout(() => setShowArtistSuggestions(false), 200);
                    }}
                    placeholder="작가명을 입력하거나 검색하세요..."
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                  {formArtistSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormArtistSearch("");
                        setFormData({ ...formData, artist: "" });
                      }}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                  {showArtistSuggestions && formArtistSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                      {formArtists
                        .filter((artist) =>
                          artist.toLowerCase().includes(formArtistSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((artist) => (
                          <div
                            key={artist}
                            onClick={() => {
                              setFormData({ ...formData, artist });
                              setFormArtistSearch(artist);
                              setShowArtistSuggestions(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {artist}
                          </div>
                        ))}
                      {formArtists.filter((artist) =>
                        artist.toLowerCase().includes(formArtistSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                      {searchQuery ? "검색 결과가 없습니다." : "작품이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredArtworks.map((artwork) => {
                    // 작품의 exhibition_id로 전시 찾기
                    const artworkExhibitionId = typeof artwork.exhibition_id === 'number' 
                      ? artwork.exhibition_id 
                      : Number(artwork.exhibition_id);
                    
                    const exhibition = exhibitions.find((ex) => {
                      const exId = typeof ex.id === 'number' ? ex.id : Number(ex.id);
                      return exId === artworkExhibitionId;
                    });
                    
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
                            <span className="text-gray-400">-</span>
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