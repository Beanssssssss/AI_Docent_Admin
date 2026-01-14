"use client";

import { useState, useEffect } from "react";
import { fetchGalleries, fetchAllExhibitions, fetchAllArtworks, fetchExhibitionsByIds } from "@/lib/api";
import type { Gallery, Exhibition, Artwork } from "@/lib/types";
import AdminSidebar from "@/components/AdminSidebar";

type TableStats = {
  name: string;
  count: number;
  description: string;
  fields: string[];
};

type GalleryStats = {
  gallery: Gallery;
  exhibitionCount: number;
  artworkCount: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [galleryStats, setGalleryStats] = useState<GalleryStats[]>([]);
  const [filteredGalleryStats, setFilteredGalleryStats] = useState<GalleryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 병렬로 모든 데이터 가져오기
        const [galleries, initialExhibitions] = await Promise.all([
          fetchGalleries().catch((error) => {
            console.error("갤러리 조회 실패:", error);
            return [] as Gallery[];
          }),
          fetchAllExhibitions().catch((error) => {
            console.error("전시 조회 실패:", error);
            return [] as Exhibition[];
          }),
        ]);
        
        let allExhibitions: Exhibition[] = [...initialExhibitions];

        // Artwork 테이블에서 모든 작품 직접 가져오기
        const allArtworks = await fetchAllArtworks().catch((error) => {
          console.error("작품 조회 실패:", error);
          return [] as Artwork[];
        });
        
        // 고유 작품 수 계산 (제목+작가 기준)
        const uniqueArtworksSet = new Set<string>();
        allArtworks.forEach((artwork) => {
          const uniqueKey = `${artwork.title}|${artwork.artist}`;
          uniqueArtworksSet.add(uniqueKey);
        });
        const uniqueArtworksCount = uniqueArtworksSet.size;
        
        // 작품의 exhibition_id 수집
        const artworkExhibitionIds = allArtworks
          .filter(a => a.exhibition_id !== null && a.exhibition_id !== undefined)
          .map(a => typeof a.exhibition_id === 'number' ? a.exhibition_id : Number(a.exhibition_id))
          .filter(id => !isNaN(id));
        
        const uniqueArtworkExhibitionIds = [...new Set(artworkExhibitionIds)];
        
        // 기존 전시 목록에 없는 전시 ID 찾기
        const existingExhibitionIds = new Set(allExhibitions.map(e => e.id));
        const missingExhibitionIds = uniqueArtworkExhibitionIds.filter(id => !existingExhibitionIds.has(id));
        
        if (missingExhibitionIds.length > 0) {
          // 누락된 전시 ID로 전시 추가 조회
          const missingExhibitions = await fetchExhibitionsByIds(missingExhibitionIds).catch((error) => {
            console.error("누락된 전시 조회 실패:", error);
            return [];
          });
          
          // 기존 전시 목록과 병합 (중복 제거)
          const allExhibitionsMap = new Map<number, Exhibition>(allExhibitions.map(e => [e.id, e]));
          missingExhibitions.forEach(e => {
            if (!allExhibitionsMap.has(e.id)) {
              allExhibitionsMap.set(e.id, e as Exhibition);
            }
          });
          
          // 새로운 배열로 교체
          allExhibitions = Array.from(allExhibitionsMap.values());
        }

        // 전체 통계
        setStats([
          {
            name: "Gallery",
            count: galleries.length || 0,
            description: "갤러리 정보를 관리합니다",
            fields: ["id", "name", "location", "description"],
          },
          {
            name: "Exhibition",
            count: allExhibitions.length || 0,
            description: "전시 정보를 관리합니다",
            fields: [
              "id",
              "gallery_id",
              "name",
              "description",
              "info",
              "start_date",
              "end_date",
              "is_now",
              "brochure",
              "location",
              "admission_fee",
            ],
          },
          {
            name: "Artwork",
            count: uniqueArtworksCount || 0,
            description: "작품 정보를 관리합니다 (고유 작품 수: 제목+작가 기준)",
            fields: [
              "id",
              "exhibition_id",
              "title",
              "artist",
              "description",
              "image_url",
              "production_year",
              "ingredients",
              "size",
              "embedding",
              "management_number",
              "is_now",
            ],
          },
        ]);

        // 갤러리별 상세 통계
        // 갤러리 ID -> 전시 ID Set 매핑
        const galleryExhibitionMap = new Map<number, Set<number>>();
        
        allExhibitions.forEach((exhibition) => {
          if (!galleryExhibitionMap.has(exhibition.gallery_id)) {
            galleryExhibitionMap.set(exhibition.gallery_id, new Set());
          }
          galleryExhibitionMap.get(exhibition.gallery_id)!.add(exhibition.id);
        });

        // 갤러리별 작품 수 카운트 (고유 작품 기준: 제목+작가)
        const galleryStatsData: GalleryStats[] = galleries.map((gallery) => {
          const galleryExhibitionIds = galleryExhibitionMap.get(gallery.id) || new Set<number>();
          const exhibitionCount = galleryExhibitionIds.size;
          
          // 이 갤러리의 전시에 속한 작품들을 고유 작품(제목+작가) 기준으로 카운트
          const uniqueArtworks = new Set<string>();
          
          allArtworks.forEach((artwork) => {
            const rawExhibitionId = artwork.exhibition_id;
            
            if (!rawExhibitionId) {
              return;
            }
            
            const artworkExhibitionId = Number(rawExhibitionId);
            
            // 이 갤러리의 전시에 속한 작품인지 확인
            if (galleryExhibitionIds.has(artworkExhibitionId)) {
              // 고유 작품 키: 제목 + 작가
              const uniqueKey = `${artwork.title}|${artwork.artist}`;
              uniqueArtworks.add(uniqueKey);
            }
          });

          const artworkCount = uniqueArtworks.size;

          return {
            gallery,
            exhibitionCount,
            artworkCount,
          };
        });
        setGalleryStats(galleryStatsData);
        setFilteredGalleryStats(galleryStatsData);
      } catch (error) {
        console.error("통계 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGalleryStats(galleryStats);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = galleryStats.filter((item) =>
      item.gallery.name.toLowerCase().includes(query) ||
      item.gallery.location?.toLowerCase().includes(query) ||
      item.gallery.description?.toLowerCase().includes(query)
    );
    setFilteredGalleryStats(filtered);
  }, [searchQuery, galleryStats]);

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">대시보드</h2>

        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((table) => (
              <div
                key={table.name}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <h3 className="text-xl font-semibold mb-2">{table.name}</h3>
                <p className="text-gray-600 mb-4">{table.description}</p>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {table.count}
                </div>
                <div className="text-sm text-gray-500">
                  총 {table.count}개 레코드
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 갤러리별 상세 통계 */}
        {galleryStats.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">갤러리별 상세 통계</h3>
              <input
                type="text"
                placeholder="갤러리명, 위치, 설명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      갤러리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      전시 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      작품 수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGalleryStats.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredGalleryStats.map((item) => (
                    <tr key={item.gallery.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.gallery.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.gallery.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.exhibitionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.artworkCount}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 데이터베이스 구조 요약 */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">데이터베이스 구조</h3>
          <div className="space-y-4">
            {stats.map((table) => (
              <div key={table.name} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-lg mb-2">{table.name}</h4>
                <p className="text-gray-600 text-sm mb-2">{table.description}</p>
                <div className="flex flex-wrap gap-2">
                  {table.fields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 bg-gray-100 rounded text-xs"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
