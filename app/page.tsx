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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 병렬로 모든 데이터 가져오기
        const [galleries, allExhibitions] = await Promise.all([
          fetchGalleries().catch((error) => {
            console.error("갤러리 조회 실패:", error);
            return [];
          }),
          fetchAllExhibitions().catch((error) => {
            console.error("전시 조회 실패:", error);
            return [];
          }),
        ]);

        console.log("갤러리 수:", galleries.length);
        console.log("전시 수:", allExhibitions.length);

        // Artwork 테이블에서 모든 작품 직접 가져오기
        const allArtworks = await fetchAllArtworks().catch((error) => {
          console.error("작품 조회 실패:", error);
          return [];
        });
        
        console.log("작품 수:", allArtworks.length);
        
        // 작품의 exhibition_id 수집
        const artworkExhibitionIds = allArtworks
          .filter(a => a.exhibition_id !== null && a.exhibition_id !== undefined)
          .map(a => typeof a.exhibition_id === 'number' ? a.exhibition_id : Number(a.exhibition_id))
          .filter(id => !isNaN(id));
        
        const uniqueArtworkExhibitionIds = [...new Set(artworkExhibitionIds)];
        console.log("작품이 참조하는 전시 ID 개수:", uniqueArtworkExhibitionIds.length);
        
        // 기존 전시 목록에 없는 전시 ID 찾기
        const existingExhibitionIds = new Set(allExhibitions.map(e => e.id));
        const missingExhibitionIds = uniqueArtworkExhibitionIds.filter(id => !existingExhibitionIds.has(id));
        
        console.log("기존 전시 목록에 없는 전시 ID 개수:", missingExhibitionIds.length);
        if (missingExhibitionIds.length > 0) {
          console.log("누락된 전시 ID 샘플:", missingExhibitionIds.slice(0, 20).sort((a, b) => a - b));
          
          // 누락된 전시 ID로 전시 추가 조회
          const missingExhibitions = await fetchExhibitionsByIds(missingExhibitionIds).catch((error) => {
            console.error("누락된 전시 조회 실패:", error);
            return [];
          });
          
          console.log("추가로 조회한 전시 수:", missingExhibitions.length);
          
          // 기존 전시 목록과 병합 (중복 제거)
          const allExhibitionsMap = new Map(allExhibitions.map(e => [e.id, e]));
          missingExhibitions.forEach(e => {
            if (!allExhibitionsMap.has(e.id)) {
              allExhibitionsMap.set(e.id, e);
            }
          });
          
          allExhibitions.length = 0;
          allExhibitions.push(...Array.from(allExhibitionsMap.values()));
          
          console.log("병합 후 전시 수:", allExhibitions.length);
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
            count: allArtworks.length || 0,
            description: "작품 정보를 관리합니다",
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
        // 1. 갤러리 ID -> 전시 ID Set 매핑 (전시 수 카운트용)
        const galleryExhibitionMap = new Map<number, Set<number>>();
        // 2. 전시 ID -> 갤러리 ID 매핑 (작품의 exhibition_id로 갤러리 찾기용)
        const exhibitionGalleryMap = new Map<number, number>();
        
        allExhibitions.forEach((exhibition) => {
          // 갤러리 -> 전시 매핑
          if (!galleryExhibitionMap.has(exhibition.gallery_id)) {
            galleryExhibitionMap.set(exhibition.gallery_id, new Set());
          }
          galleryExhibitionMap.get(exhibition.gallery_id)!.add(exhibition.id);
          
          // 전시 -> 갤러리 매핑
          exhibitionGalleryMap.set(exhibition.id, exhibition.gallery_id);
        });

        // 3. 갤러리별 작품 수 카운트
        // 작품의 exhibition_id(FK) -> 전시 찾기 -> 전시의 gallery_id(FK) -> 갤러리 찾기
        const galleryArtworkCountMap = new Map<number, number>();
        
        // 디버깅: 전시 ID 범위 확인
        const exhibitionIds = Array.from(exhibitionGalleryMap.keys());
        console.log("전시 ID 범위:", exhibitionIds.length > 0 ? `${Math.min(...exhibitionIds)} ~ ${Math.max(...exhibitionIds)}` : "없음");
        console.log("전시 ID 샘플 (처음 10개):", exhibitionIds.slice(0, 10));
        
        // 작품의 exhibition_id 범위 확인 (이미 위에서 계산됨)
        if (artworkExhibitionIds.length > 0) {
          console.log("작품의 exhibition_id 범위:", `${Math.min(...artworkExhibitionIds)} ~ ${Math.max(...artworkExhibitionIds)}`);
          console.log("작품의 exhibition_id 고유값 샘플:", uniqueArtworkExhibitionIds.slice(0, 20).sort((a, b) => a - b));
        }
        
        let matchedCount = 0;
        let unmatchedCount = 0;
        const unmatchedSamples: any[] = [];
        
        allArtworks.forEach((artwork) => {
          // 작품의 exhibition_id가 없으면 제외
          if (!artwork.exhibition_id) {
            unmatchedCount++;
            if (unmatchedSamples.length < 5) {
              unmatchedSamples.push({ artworkId: artwork.id, reason: 'exhibition_id가 null/undefined' });
            }
            return;
          }
          
          // 작품의 exhibition_id로 전시를 찾기
          const artworkExhibitionId = typeof artwork.exhibition_id === 'number' 
            ? artwork.exhibition_id 
            : Number(artwork.exhibition_id);
          
          if (isNaN(artworkExhibitionId)) {
            unmatchedCount++;
            if (unmatchedSamples.length < 5) {
              unmatchedSamples.push({ artworkId: artwork.id, exhibition_id: artwork.exhibition_id, reason: 'NaN' });
            }
            return;
          }
          
          const galleryId = exhibitionGalleryMap.get(artworkExhibitionId);
          
          // 전시를 찾았으면 해당 갤러리에 작품 수 카운트
          if (galleryId !== undefined) {
            galleryArtworkCountMap.set(
              galleryId,
              (galleryArtworkCountMap.get(galleryId) || 0) + 1
            );
            matchedCount++;
          } else {
            unmatchedCount++;
            if (unmatchedSamples.length < 5) {
              unmatchedSamples.push({ 
                artworkId: artwork.id, 
                exhibition_id: artwork.exhibition_id,
                converted: artworkExhibitionId,
                inMap: exhibitionGalleryMap.has(artworkExhibitionId)
              });
            }
          }
        });
        
        console.log(`작품 매칭 결과: 매칭됨 ${matchedCount}개, 매칭 안됨 ${unmatchedCount}개`);
        if (unmatchedSamples.length > 0) {
          console.log("매칭 안된 작품 샘플:", unmatchedSamples);
        }
        console.log("갤러리별 작품 수:", Array.from(galleryArtworkCountMap.entries()));

        // 갤러리별 통계 생성
        const galleryStatsData: GalleryStats[] = galleries.map((gallery) => {
          const galleryExhibitionIds = galleryExhibitionMap.get(gallery.id) || new Set<number>();
          const exhibitionCount = galleryExhibitionIds.size;
          const artworkCount = galleryArtworkCountMap.get(gallery.id) || 0;

          console.log(`갤러리 ${gallery.id} (${gallery.name}): 전시 ${exhibitionCount}개, 작품 ${artworkCount}개`);

          return {
            gallery,
            exhibitionCount,
            artworkCount,
          };
        });
        setGalleryStats(galleryStatsData);
      } catch (error) {
        console.error("통계 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
            <h3 className="text-xl font-semibold mb-4">갤러리별 상세 통계</h3>
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
                  {galleryStats.map((item) => (
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
                  ))}
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
