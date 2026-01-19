"use client";

import AdminSidebar from "@/components/AdminSidebar";

export default function DatabaseStructurePage() {
  const tables = [
    {
      name: "Gallery",
      description: "갤러리 정보를 저장하는 테이블",
      fields: [
        { name: "id", type: "integer", description: "갤러리 고유 ID (Primary Key)" },
        { name: "name", type: "string", description: "갤러리 이름" },
        { name: "location", type: "string", description: "갤러리 위치" },
        { name: "description", type: "string", description: "갤러리 설명" },
      ],
    },
    {
      name: "Exhibition",
      description: "전시 정보를 저장하는 테이블",
      fields: [
        { name: "id", type: "integer", description: "전시 고유 ID (Primary Key)" },
        { name: "gallery_id", type: "integer", description: "갤러리 ID (Foreign Key → Gallery.id)" },
        { name: "name", type: "string", description: "전시 이름" },
        { name: "description", type: "string", description: "전시 설명" },
        { name: "info", type: "string", description: "전시 상세 정보" },
        { name: "start_date", type: "date", description: "전시 시작일" },
        { name: "end_date", type: "date", description: "전시 종료일" },
        { name: "is_now", type: "boolean", description: "현재 진행 중인 전시 여부" },
        { name: "brochure", type: "string (nullable)", description: "브로셔 URL" },
        { name: "location", type: "string", description: "전시 위치" },
        { name: "admission_fee", type: "string (nullable)", description: "입장료" },
      ],
    },
    {
      name: "Artwork",
      description: "작품 정보를 저장하는 테이블",
      fields: [
        { name: "id", type: "UUID", description: "작품 고유 ID (Primary Key)" },
        { name: "exhibition_id", type: "integer", description: "전시 ID (Foreign Key → Exhibition.id)" },
        { name: "title", type: "string", description: "작품 제목" },
        { name: "artist", type: "string", description: "작가 이름" },
        { name: "description", type: "string (nullable)", description: "작품 설명" },
        { name: "image_url", type: "string (nullable)", description: "작품 이미지 URL" },
        { name: "production_year", type: "string (nullable)", description: "제작 연도" },
        { name: "ingredients", type: "string (nullable)", description: "재료/기법" },
        { name: "size", type: "string (nullable)", description: "작품 크기" },
        { name: "embedding", type: "float[] (nullable)", description: "이미지 임베딩 벡터 (CLIP 모델)" },
        { name: "management_number", type: "integer (nullable)", description: "관리 번호" },
        { name: "is_now", type: "boolean (nullable)", description: "현재 전시 중인 작품 여부" },
      ],
    },
  ];

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">데이터베이스 구조</h2>

        <div className="space-y-6">
          {tables.map((table) => (
            <div
              key={table.name}
              className="bg-white rounded-lg shadow p-6 border border-gray-200"
            >
              <h3 className="text-2xl font-semibold mb-2 text-blue-600">
                {table.name}
              </h3>
              <p className="text-gray-600 mb-4">{table.description}</p>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        필드명
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        타입
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        설명
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.fields.map((field) => (
                      <tr key={field.name}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-semibold text-sm">
                            {field.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {field.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {field.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* 관계도 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-2xl font-semibold mb-4">테이블 관계도</h3>
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-lg">Gallery</div>
              <div className="text-sm text-gray-600">1</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-lg">Exhibition</div>
              <div className="text-sm text-gray-600">N</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-lg">Artwork</div>
              <div className="text-sm text-gray-600">N</div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            Gallery 1:N Exhibition 1:N Artwork
          </p>
        </div>
      </main>
    </div>
  );
}
