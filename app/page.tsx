"use client";

import { useState, useEffect } from "react";
import { fetchGalleries, fetchAllExhibitions, fetchAllArtworks } from "@/lib/api";
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
  noExhibitionArtworkCount: number; // 비전시 작품 수
};

type ExhibitionStats = {
  exhibition: Exhibition;
  artworkCount: number;
  noExhibitionArtworkCount?: number; // 비전시 작품 수 (전시별 통계에서만 사용)
};

type ExhibitionFilter = "all" | "is_now" | "show";

export default function AdminDashboard() {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [galleryStats, setGalleryStats] = useState<GalleryStats[]>([]);
  const [exhibitionStats, setExhibitionStats] = useState<ExhibitionStats[]>([]);
  const [allExhibitionStats, setAllExhibitionStats] = useState<ExhibitionStats[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [exhibitionFilter, setExhibitionFilter] = useState<ExhibitionFilter>("all");
  const [noExhibitionArtworkCount, setNoExhibitionArtworkCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 병렬로 모든 데이터 가져오기
        const [galleriesData, allExhibitions] = await Promise.all([
          fetchGalleries().catch((error) => {
            console.error("갤러리 조회 실패:", error);
            return [];
          }),
          fetchAllExhibitions().catch((error) => {
            console.error("전시 조회 실패:", error);
            return [];
          }),
        ]);

        setGalleries(galleriesData);
        const galleries = galleriesData;

        console.log("갤러리 수:", galleries.length);
        console.log("전시 수:", allExhibitions.length);

        // Artwork 테이블에서 모든 작품 직접 가져오기
        const allArtworks = await fetchAllArtworks().catch((error) => {
          console.error("작품 조회 실패:", error);
          return [];
        });
        
        console.log("작품 수:", allArtworks.length);

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
              "show",
            ],
          },
          {
            name: "Artworks",
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
        // 갤러리 ID -> 전시 ID Set 매핑
        console.log("=== 갤러리-전시 매핑 시작 ===");
        const galleryExhibitionMap = new Map<number, Set<number>>();
        
        allExhibitions.forEach((exhibition) => {
          if (!galleryExhibitionMap.has(exhibition.gallery_id)) {
            galleryExhibitionMap.set(exhibition.gallery_id, new Set());
          }
          galleryExhibitionMap.get(exhibition.gallery_id)!.add(exhibition.id);
        });

        // 갤러리-전시 매핑 결과 출력
        console.log("갤러리-전시 매핑 결과:");
        galleryExhibitionMap.forEach((exhibitionIds, galleryId) => {
          const gallery = galleries.find(g => g.id === galleryId);
          console.log(`  갤러리 ${galleryId} (${gallery?.name || '알 수 없음'}): 전시 ${exhibitionIds.size}개`, Array.from(exhibitionIds).slice(0, 10));
        });

        // 작품의 exhibition_id 샘플 출력
        console.log("작품의 exhibition_id 샘플 (처음 20개):");
        allArtworks.slice(0, 20).forEach((artwork, index) => {
          console.log(`  작품 ${index + 1}: id=${artwork.id}, exhibition_id=${artwork.exhibition_id}, type=${typeof artwork.exhibition_id}`);
        });

        // 전시 ID -> Exhibition 객체 매핑 (빠른 조회를 위해)
        const exhibitionMap = new Map<number, Exhibition>();
        allExhibitions.forEach((exhibition) => {
          exhibitionMap.set(exhibition.id, exhibition);
        });

        // 전시별 작품 수 카운트 (작품 -> exhibition_id -> Exhibition)
        const exhibitionArtworkCountMap = new Map<number, number>();
        
        // 갤러리별 작품 수 카운트를 위한 매핑 (작품 -> exhibition_id -> Exhibition -> gallery_id -> Gallery)
        // 중복 카운트 허용: 같은 작품이 여러 전시에 속하면 각각 카운트
        const galleryArtworkCountMap = new Map<number, number>(); // gallery_id -> 작품 수 (중복 허용)
        
        // 비전시 작품 수 카운트 (exhibition_id가 null이거나 전시를 찾을 수 없는 작품)
        let noExhibitionArtworkCount = 0;
        
        // 작품별로 전부 확인: 작품 -> exhibition_id -> Exhibition -> gallery_id -> Gallery
        console.log("=== 작품별 갤러리 매핑 시작 ===");
        console.log(`전시 맵 크기: ${exhibitionMap.size}, 전시 목록:`, Array.from(exhibitionMap.keys()).slice(0, 10));
        console.log(`작품 샘플 (처음 5개):`, allArtworks.slice(0, 5).map(a => ({
          id: a.id,
          title: a.title,
          exhibition_id: a.exhibition_id,
          exhibition_id_type: typeof a.exhibition_id
        })));
        
        let artworkMappingCount = 0;
        let artworkNoExhibitionIdCount = 0;
        let artworkExhibitionNotFoundCount = 0;
        let artworkNoGalleryIdCount = 0;
        
        allArtworks.forEach((artwork, index) => {
          if (!artwork.exhibition_id) {
            artworkNoExhibitionIdCount++;
            noExhibitionArtworkCount++; // 비전시 작품 카운트
            if (index < 5) {
              console.warn(`작품 ${artwork.id} (${artwork.title}): exhibition_id가 없음`);
            }
            return;
          }
          
          const exhibitionId = Number(artwork.exhibition_id);
          if (isNaN(exhibitionId)) {
            noExhibitionArtworkCount++; // 비전시 작품 카운트
            console.warn(`작품 ${artwork.id} (${artwork.title}): exhibition_id가 숫자가 아님: ${artwork.exhibition_id}`);
            return;
          }
          
          // 전시별 작품 수 카운트
          const exhibitionCount = exhibitionArtworkCountMap.get(exhibitionId) || 0;
          exhibitionArtworkCountMap.set(exhibitionId, exhibitionCount + 1);
          
          // 갤러리별 작품 수 카운트를 위한 매핑
          // 작품의 exhibition_id로 Exhibition을 찾고, 그 Exhibition의 gallery_id로 갤러리 매핑
          const exhibition = exhibitionMap.get(exhibitionId);
          if (!exhibition) {
            artworkExhibitionNotFoundCount++;
            noExhibitionArtworkCount++; // 비전시 작품 카운트
            if (index < 10) {
              console.warn(`작품 ${artwork.id} (${artwork.title}): 전시 ${exhibitionId}를 찾을 수 없음. 전시 맵에 있는 ID:`, Array.from(exhibitionMap.keys()).slice(0, 10));
            }
            return;
          }
          
          if (!exhibition.gallery_id) {
            artworkNoGalleryIdCount++;
            if (index < 5) {
              console.warn(`작품 ${artwork.id} (${artwork.title}): 전시 ${exhibitionId} (${exhibition.name})의 gallery_id가 없음`);
            }
            return;
          }
          
          // 중복 카운트 허용: 같은 작품이 여러 전시에 속하면 각각 카운트
          const galleryId = exhibition.gallery_id;
          const galleryCount = galleryArtworkCountMap.get(galleryId) || 0;
          galleryArtworkCountMap.set(galleryId, galleryCount + 1);
          artworkMappingCount++;
        });
        
        console.log(`작품별 갤러리 매핑 완료:`);
        console.log(`  총 작품: ${allArtworks.length}개`);
        console.log(`  매핑 성공: ${artworkMappingCount}개`);
        console.log(`  exhibition_id 없음: ${artworkNoExhibitionIdCount}개`);
        console.log(`  전시를 찾을 수 없음: ${artworkExhibitionNotFoundCount}개`);
        console.log(`  gallery_id 없음: ${artworkNoGalleryIdCount}개`);
        console.log(`  비전시 작품: ${noExhibitionArtworkCount}개`);

        console.log("전시별 작품 수 매핑 결과:");
        exhibitionArtworkCountMap.forEach((count, exhibitionId) => {
          const exhibition = exhibitionMap.get(exhibitionId);
          const gallery = galleries.find(g => g.id === exhibition?.gallery_id);
          console.log(`  전시 ${exhibitionId} (${exhibition?.name || '알 수 없음'}) [갤러리: ${gallery?.name || '알 수 없음'}]: 작품 ${count}개`);
        });
        
        console.log("갤러리별 작품 수 매핑 결과 (중복 허용):");
        galleryArtworkCountMap.forEach((count, galleryId) => {
          const gallery = galleries.find(g => g.id === galleryId);
          console.log(`  갤러리 ${galleryId} (${gallery?.name || '알 수 없음'}): 작품 ${count}개 (중복 포함)`);
        });

        // 갤러리별 작품 수 카운트
        // 작품별로 exhibition_id를 확인하고, 그 exhibition_id가 어느 갤러리에 속하는지 전부 확인
        // 중복 카운트 허용: 같은 작품이 여러 전시에 속하면 각각 카운트
        console.log("=== 갤러리별 작품 카운트 시작 (중복 허용) ===");
        
        // 갤러리별 전시 수 카운트 (전시 목록에서)
        const galleryExhibitionCountMap = new Map<number, number>();
        allExhibitions.forEach((exhibition) => {
          const count = galleryExhibitionCountMap.get(exhibition.gallery_id) || 0;
          galleryExhibitionCountMap.set(exhibition.gallery_id, count + 1);
        });
        
        const galleryStatsData: GalleryStats[] = galleries.map((gallery) => {
          // 전시 수는 전시 목록에서 계산
          const exhibitionCount = galleryExhibitionCountMap.get(gallery.id) || 0;
          
          // 작품 수는 작품별로 exhibition_id를 확인해서 gallery_id로 매핑한 결과 사용 (중복 허용)
          const artworkCount = galleryArtworkCountMap.get(gallery.id) || 0;

          console.log(`갤러리 ${gallery.id} (${gallery.name}): 전시 ${exhibitionCount}개, 작품 ${artworkCount}개 (중복 포함)`);

          return {
            gallery,
            exhibitionCount,
            artworkCount,
            noExhibitionArtworkCount: 0, // 갤러리별로는 비전시 작품이 없음 (전시에 속하지 않은 작품)
          };
        });
        
        console.log("=== 갤러리별 작품 카운트 완료 ===");
        setGalleryStats(galleryStatsData);
        setNoExhibitionArtworkCount(noExhibitionArtworkCount);

        // 전시별 상세 통계
        // 작품 -> exhibition_id -> Exhibition 매핑 사용
        console.log("=== 전시별 상세 통계 시작 ===");
        
        // is_now 필드 확인 (Supabase boolean 타입)
        console.log("전시 is_now 필드 샘플 (전체):");
        allExhibitions.forEach((ex) => {
          console.log(`  전시 ${ex.id} (${ex.name}): is_now=${ex.is_now} (type: ${typeof ex.is_now}), show=${ex.show} (type: ${typeof ex.show})`);
        });
        
        const isNowCount = allExhibitions.filter(e => e.is_now === true).length;
        const isNowNullCount = allExhibitions.filter(e => e.is_now === null || e.is_now === undefined).length;
        const showCount = allExhibitions.filter(e => e.show === true).length;
        console.log(`전시 총 ${allExhibitions.length}개 중: is_now=TREU인 전시 ${isNowCount}개, is_now=null/undefined인 전시 ${isNowNullCount}개, show=true인 전시 ${showCount}개`);
        
        const exhibitionStatsData: ExhibitionStats[] = allExhibitions.map((exhibition) => {
          // exhibition_id로 작품 수 조회
          const artworkCount = exhibitionArtworkCountMap.get(exhibition.id) || 0;
          return {
            exhibition,
            artworkCount,
            noExhibitionArtworkCount: 0, // 전시별로는 비전시 작품이 없음
          };
        });
        
        // 비전시 작품 통계 추가
        const noExhibitionStats: ExhibitionStats = {
          exhibition: {
            id: -1,
            gallery_id: -1,
            name: "비전시 작품",
            description: "전시에 속하지 않은 작품",
            info: "",
            start_date: "",
            end_date: "",
            is_now: false,
            show: false,
            location: "",
          } as Exhibition,
          artworkCount: noExhibitionArtworkCount,
          noExhibitionArtworkCount: noExhibitionArtworkCount,
        };
        
        // 비전시 작품이 있으면 통계에 추가
        if (noExhibitionArtworkCount > 0) {
          exhibitionStatsData.push(noExhibitionStats);
        }
        
        // 작품 수 기준으로 내림차순 정렬
        exhibitionStatsData.sort((a, b) => b.artworkCount - a.artworkCount);
        
        console.log("=== 전시별 상세 통계 완료 ===");
        setAllExhibitionStats(exhibitionStatsData);
        
        // 필터 적용 (Supabase boolean 타입)
        let filteredExhibitionStats = exhibitionStatsData;
        if (exhibitionFilter === "is_now") {
          filteredExhibitionStats = exhibitionStatsData.filter(item => item.exhibition.is_now === true);
        } else if (exhibitionFilter === "show") {
          filteredExhibitionStats = exhibitionStatsData.filter(item => item.exhibition.show === true);
        }
        setExhibitionStats(filteredExhibitionStats);
      } catch (error) {
        console.error("통계 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 필터 변경 시 전시 통계 업데이트 (Supabase boolean 타입)
  useEffect(() => {
    if (allExhibitionStats.length === 0) return;
    
    let filtered = [...allExhibitionStats];
    if (exhibitionFilter === "is_now") {
      filtered = allExhibitionStats.filter(item => item.exhibition.is_now === true);
    } else if (exhibitionFilter === "show") {
      filtered = allExhibitionStats.filter(item => item.exhibition.show === true);
    }
    setExhibitionStats(filtered);
  }, [exhibitionFilter, allExhibitionStats]);

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
                  {/* 비전시 작품 행 추가 */}
                  {noExhibitionArtworkCount > 0 && (
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          비전시 작품
                        </div>
                        <div className="text-sm text-gray-500">
                          전시에 속하지 않은 작품
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {noExhibitionArtworkCount}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 전시별 상세 통계 */}
        {allExhibitionStats.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">전시별 상세 통계</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setExhibitionFilter("all")}
                  className={`px-4 py-2 text-sm rounded ${
                    exhibitionFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  전체 ({allExhibitionStats.length})
                </button>
                <button
                  onClick={() => setExhibitionFilter("is_now")}
                  className={`px-4 py-2 text-sm rounded ${
                    exhibitionFilter === "is_now"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  현재 전시 중 ({allExhibitionStats.filter(item => item.exhibition.is_now === true).length})
                </button>
                <button
                  onClick={() => setExhibitionFilter("show")}
                  className={`px-4 py-2 text-sm rounded ${
                    exhibitionFilter === "show"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  표시 중 ({allExhibitionStats.filter(item => item.exhibition.show === true).length})
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      전시명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      갤러리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      작품 수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exhibitionStats.map((item) => {
                    // 비전시 작품 행은 특별 처리
                    if (item.exhibition.id === -1) {
                      return (
                        <tr key="no-exhibition" className="bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              비전시 작품
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              비전시
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {item.artworkCount}
                          </td>
                        </tr>
                      );
                    }
                    
                    const gallery = galleries.find(g => g.id === item.exhibition.gallery_id);
                    return (
                      <tr key={item.exhibition.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.exhibition.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {gallery?.name || "알 수 없음"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>{item.exhibition.start_date}</div>
                          <div className="text-gray-400">~ {item.exhibition.end_date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {item.exhibition.is_now && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                진행중
                              </span>
                            )}
                            {item.exhibition.show && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                표시
                              </span>
                            )}
                            {!item.exhibition.is_now && !item.exhibition.show && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                종료
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {item.artworkCount}
                        </td>
                      </tr>
                    );
                  })}
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
