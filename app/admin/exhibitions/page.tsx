"use client";

import { useState, useEffect } from "react";
import {
  fetchGalleries,
  fetchExhibitions,
  createExhibition,
  updateExhibition,
  deleteExhibition,
  uploadExhibitionPosterById,
} from "@/lib/api";
import type { Exhibition, Gallery } from "@/lib/types";
import AdminSidebar from "@/components/AdminSidebar";

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [filteredExhibitions, setFilteredExhibitions] = useState<Exhibition[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExhibition, setEditingExhibition] =
    useState<Exhibition | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    gallery_id: "",
    name: "",
    description: "",
    info: "",
    start_date: "",
    end_date: "",
    is_now: false,
    show: true,
    brochure: "",
    location: "",
    admission_fee: "",
    poster_url: "",
  });

  /* ===================== Load ===================== */
  useEffect(() => {
    loadGalleries();
  }, []);

  useEffect(() => {
    if (selectedGalleryId) {
      loadExhibitions(selectedGalleryId);
      setSearchQuery(""); // 갤러리 변경 시 검색어 초기화
    }
  }, [selectedGalleryId]);

  const loadGalleries = async () => {
    try {
      const data = await fetchGalleries();
      setGalleries(data);
      if (data.length > 0 && !selectedGalleryId) {
        setSelectedGalleryId(data[0].id);
      }
    } catch (error) {
      console.error("갤러리 로딩 실패:", error);
    }
  };

  const loadExhibitions = async (galleryId: number) => {
    setLoading(true);
    try {
      const data = await fetchExhibitions(galleryId);
      setExhibitions(data);
      setFilteredExhibitions(data);
    } catch (error) {
      console.error("전시 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExhibitions(exhibitions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = exhibitions.filter(
      (exhibition) =>
        exhibition.name.toLowerCase().includes(query) ||
        (exhibition.description?.toLowerCase().includes(query) ?? false) ||
        (exhibition.info?.toLowerCase().includes(query) ?? false) ||
        (exhibition.location?.toLowerCase().includes(query) ?? false)
    );
    setFilteredExhibitions(filtered);
  }, [exhibitions, searchQuery]);

  /* ===================== Submit ===================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let exhibitionId = editingExhibition?.id;

      // 1️⃣ 전시 먼저 생성 (ID 필요)
      if (!editingExhibition) {
        const created = await createExhibition({
          gallery_id: Number(formData.gallery_id),
          name: formData.name,
          description: formData.description,
          info: formData.info || undefined,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_now: formData.is_now,
          show: formData.show,
          brochure: formData.brochure || undefined,
          location: formData.location,
          admission_fee: formData.admission_fee || undefined,
          poster_url: undefined, // 일단 없음
        });

        exhibitionId = created.id;
      }

      // 2️⃣ 포스터 업로드
      let posterUrl = formData.poster_url;

      if (posterFile && exhibitionId) {
        posterUrl = await uploadExhibitionPosterById(
          posterFile,
          exhibitionId
        );
      }

      // 3️⃣ 수정 or 포스터 URL 업데이트
      if (editingExhibition) {
        await updateExhibition(exhibitionId!, {
          gallery_id: Number(formData.gallery_id),
          name: formData.name,
          description: formData.description,
          info: formData.info || undefined,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_now: formData.is_now,
          show: formData.show,
          brochure: formData.brochure || undefined,
          location: formData.location,
          admission_fee: formData.admission_fee || undefined,
          poster_url: posterUrl || undefined,
        });
      } else if (posterUrl) {
        await updateExhibition(exhibitionId!, {
          poster_url: posterUrl,
        } as any);
      }

      alert(editingExhibition ? "전시가 수정되었습니다." : "전시가 생성되었습니다.");

      setPosterFile(null);
      setShowForm(false);
      setEditingExhibition(null);

      if (selectedGalleryId) loadExhibitions(selectedGalleryId);
    } catch (error) {
      console.error(error);
      alert("저장에 실패했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteExhibition(id);
      alert("전시가 삭제되었습니다.");
      if (selectedGalleryId) loadExhibitions(selectedGalleryId);
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };
  const handleEdit = (exhibition: Exhibition) => {
    setEditingExhibition(exhibition);
    setFormData({
      gallery_id: String(exhibition.gallery_id),
      name: exhibition.name,
      description: exhibition.description,
      info: exhibition.info || "",
      start_date: exhibition.start_date,
      end_date: exhibition.end_date,

      // ⭐ 핵심
      is_now: Boolean(exhibition.is_now),
      show: Boolean(exhibition.show ?? true),

      brochure: exhibition.brochure || "",
      location: exhibition.location,
      admission_fee: exhibition.admission_fee || "",
      poster_url: exhibition.poster_url || "",
    });
    setShowForm(true);
  };

  /* ===================== Render ===================== */
  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">전시 관리</h2>
          <div className="flex gap-4 items-center">
            <select
              value={selectedGalleryId || ""}
              onChange={(e) => setSelectedGalleryId(Number(e.target.value))}
              className="px-4 py-2 border rounded"
            >
              <option value="">갤러리 선택</option>
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setShowForm(true);
                setEditingExhibition(null);
                setFormData({
                  gallery_id: String(selectedGalleryId || ""),
                  name: "",
                  description: "",
                  info: "",
                  start_date: "",
                  end_date: "",
                  is_now: false,
                  show: true,
                  brochure: "",
                  location: "",
                  admission_fee: "",
                  poster_url: "",
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded"
              disabled={!selectedGalleryId}
            >
              + 새 전시 추가
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border">
            <h3 className="text-xl font-semibold mb-4">
              {editingExhibition ? "전시 수정" : "새 전시 추가"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">갤러리</label>
                  <select
                    value={formData.gallery_id}
                    onChange={(e) =>
                      setFormData({ ...formData, gallery_id: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    <option value="">선택</option>
                    {galleries.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">이름</label>
                  <input
                    className="w-full border px-3 py-2 rounded"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">설명</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">상세 정보</label>
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={3}
                  value={formData.info}
                  onChange={(e) =>
                    setFormData({ ...formData, info: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">포스터 이미지</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setPosterFile(e.target.files[0]);
                    }
                  }}
                />

                {formData.poster_url && (
                  <img
                    src={formData.poster_url}
                    alt="poster preview"
                    className="mt-2 w-32 rounded border"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="border px-3 py-2 rounded"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
                <input
                  type="date"
                  className="border px-3 py-2 rounded"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_now}
                  onChange={(e) =>
                    setFormData({ ...formData, is_now: e.target.checked })
                  }
                />
                  <label>현재 진행 중</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show}
                    onChange={(e) =>
                      setFormData({ ...formData, show: e.target.checked })
                    }
                  />
                  <label>표시</label>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded">
                  저장
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => setShowForm(false)}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 검색 */}
        {exhibitions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <input
                  type="text"
                  placeholder="제목, 설명, 위치로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
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
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">포스터</th>
                <th className="px-4 py-2">이름</th>
                <th className="px-4 py-2">기간</th>
                <th className="px-4 py-2">진행</th>
                <th className="px-4 py-2">표시</th>
                <th className="px-4 py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredExhibitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "검색 결과가 없습니다." : "전시가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredExhibitions.map((ex) => (
                <tr key={ex.id} className="border-t">
                  <td className="px-4 py-2">{ex.id}</td>
                  <td className="px-4 py-2">
                    {ex.poster_url ? (
                      <img
                        src={ex.poster_url}
                        alt={ex.name}
                        className="w-16 rounded border"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2">{ex.name}</td>
                  <td className="px-4 py-2 text-sm">
                    {ex.start_date} ~ {ex.end_date}
                  </td>
                  <td className="px-4 py-2">
                    {ex.is_now ? "진행중" : "종료"}
                  </td>
                  <td className="px-4 py-2">
                    {ex.show ?? true ? "표시" : "숨김"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="text-blue-600 mr-2"
                      onClick={() => handleEdit(ex)}
                    >
                      수정
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() => handleDelete(ex.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}