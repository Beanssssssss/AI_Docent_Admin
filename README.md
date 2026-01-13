# AI Docent Admin Panel

Next.js 기반 관리자 페이지

## 개요

AI Docent 관리자 페이지는 갤러리, 전시, 작품을 관리할 수 있는 웹 인터페이스입니다. Supabase를 직접 호출하여 데이터를 관리합니다.

## 주요 기능

- 📊 **대시보드**: 갤러리/전시/작품 통계
- 🏛️ **갤러리 관리**: CRUD 작업
- 🎨 **전시 관리**: CRUD 작업
- 🖼️ **작품 관리**: CRUD 작업, 이미지 업로드
- 🔍 **검색 및 정렬**: 작품 검색 및 정렬 기능
- 🔐 **인증**: Supabase Auth를 사용한 로그인

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

### 4. 로그인

1. `http://localhost:3000/login` 접속
2. Supabase에서 생성한 관리자 계정으로 로그인

## 프로젝트 구조

```
frontend-web/
├── app/
│   ├── admin/           # 관리자 페이지
│   │   ├── galleries/   # 갤러리 관리
│   │   ├── exhibitions/  # 전시 관리
│   │   ├── artworks/    # 작품 관리
│   │   └── database/    # 데이터베이스 스키마
│   ├── login/          # 로그인 페이지
│   └── layout.tsx      # 루트 레이아웃
├── components/          # 재사용 가능한 컴포넌트
│   ├── AdminSidebar.tsx    # 사이드바
│   ├── AuthGuard.tsx       # 인증 가드
│   └── LogoutButton.tsx    # 로그아웃 버튼
└── lib/                # 유틸리티
    ├── supabase.ts     # Supabase 클라이언트
    ├── api.ts          # Supabase 직접 호출 API
    ├── auth.ts         # 인증 함수
    └── types.ts        # TypeScript 타입
```

## 주요 기술

- **Next.js 16** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Supabase JS** - 데이터베이스 클라이언트

## 데이터 관리

### Supabase 직접 호출

모든 데이터 조회/수정은 프론트엔드에서 Supabase를 직접 호출합니다:

```typescript
// lib/api.ts
import { supabase } from "./supabase";

export async function fetchGalleries() {
  const { data, error } = await supabase
    .from("Gallery")
    .select("*");
  
  if (error) throw new Error(error.message);
  return data || [];
}
```

### 이미지 업로드

작품 이미지는 Supabase Storage에 업로드됩니다:

```typescript
// lib/api.ts
export async function uploadArtworkImage(
  file: File,
  artistName: string
): Promise<string> {
  const filePath = `Artworks/${artistName}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from("AI_Docent")
    .upload(filePath, file);
  
  if (error) throw new Error(error.message);
  
  const { data: { publicUrl } } = supabase.storage
    .from("AI_Docent")
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

## 인증

### Supabase Auth 사용

관리자 페이지는 Supabase Auth를 사용하여 인증합니다:

```typescript
// lib/auth.ts
import { supabase } from "./supabase";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}
```

### 인증 가드

모든 관리자 페이지는 `AuthGuard`로 보호됩니다:

```typescript
// app/layout.tsx
import { AuthGuard } from "@/components/AuthGuard";

export default function RootLayout({ children }) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
```

## 페이지 설명

### 대시보드 (`/`)

- 갤러리/전시/작품 통계
- 데이터베이스 구조 확인

### 갤러리 관리 (`/admin/galleries`)

- 갤러리 목록 조회
- 갤러리 생성/수정/삭제

### 전시 관리 (`/admin/exhibitions`)

- 전시 목록 조회
- 전시 생성/수정/삭제
- 갤러리별 필터링

### 작품 관리 (`/admin/artworks`)

- 작품 목록 조회
- 작품 생성/수정/삭제
- 이미지 업로드
- 검색 및 정렬

## 배포

### Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 배포

### 빌드

```bash
npm run build
npm start
```

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |

## 문제 해결

### 로그인 실패

- Supabase Authentication 설정 확인
- 이메일 인증 활성화 확인
- 관리자 계정 생성 확인

### 이미지 업로드 실패

- Supabase Storage 버킷 생성 확인
- 버킷 이름: `AI_Docent`
- Public bucket 설정 확인
- Storage 정책 확인

## 라이선스

MIT
