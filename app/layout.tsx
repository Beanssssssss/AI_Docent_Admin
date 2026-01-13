import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "AI Docent 관리자",
  description: "AI Docent 데이터베이스 관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-screen flex bg-gray-50">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
