"use client";

import { useState, useEffect } from "react";
import {
  fetchGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
} from "@/lib/api";
import type { Gallery } from "@/lib/types";
import AdminSidebar from "@/components/AdminSidebar";

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    try {
      const data = await fetchGalleries();
      setGalleries(data);
    } catch (error) {
      console.error("갤러리 로딩 실패:", error);
      alert("갤러리 로딩에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGallery) {
        await updateGallery(editingGallery.id, formData);
        alert("갤러리가 수정되었습니다.");
      } else {
        await createGallery(formData);
        alert("갤러리가 생성되었습니다.");
      }
      setShowForm(false);
      setEditingGallery(null);
      setFormData({ name: "", location: "", description: "" });
      loadGalleries();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다. 백엔드 API가 구현되었는지 확인해주세요.");
    }
  };

  const handleEdit = (gallery: Gallery) => {
    setEditingGallery(gallery);
    setFormData({
      name: gallery.name,
      location: gallery.location,
      description: gallery.description,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteGallery(id);
      alert("갤러리가 삭제되었습니다.");
      loadGalleries();
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">갤러리 관리</h2>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingGallery(null);
              setFormData({ name: "", location: "", description: "" });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + 새 갤러리 추가
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">
              {editingGallery ? "갤러리 수정" : "새 갤러리 추가"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
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
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingGallery ? "수정" : "추가"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGallery(null);
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
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    위치
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    설명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {galleries.map((gallery) => (
                  <tr key={gallery.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {gallery.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {gallery.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {gallery.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {gallery.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(gallery)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(gallery.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
