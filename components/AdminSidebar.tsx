"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-8">AI Docent 관리자</h1>
      <nav className="space-y-2">
        <Link
          href="/"
          className={`block px-4 py-2 rounded ${
            isActive("/") ? "bg-gray-800 hover:bg-gray-700" : "hover:bg-gray-800"
          }`}
        >
          대시보드
        </Link>
        <Link
          href="/admin/galleries"
          className={`block px-4 py-2 rounded ${
            isActive("/admin/galleries")
              ? "bg-gray-800 hover:bg-gray-700"
              : "hover:bg-gray-800"
          }`}
        >
          갤러리 관리
        </Link>
        <Link
          href="/admin/exhibitions"
          className={`block px-4 py-2 rounded ${
            isActive("/admin/exhibitions")
              ? "bg-gray-800 hover:bg-gray-700"
              : "hover:bg-gray-800"
          }`}
        >
          전시 관리
        </Link>
        <Link
          href="/admin/artworks"
          className={`block px-4 py-2 rounded ${
            isActive("/admin/artworks")
              ? "bg-gray-800 hover:bg-gray-700"
              : "hover:bg-gray-800"
          }`}
        >
          작품 관리
        </Link>
        <Link
          href="/admin/database"
          className={`block px-4 py-2 rounded ${
            isActive("/admin/database")
              ? "bg-gray-800 hover:bg-gray-700"
              : "hover:bg-gray-800"
          }`}
        >
          데이터베이스 구조
        </Link>
        <LogoutButton />
      </nav>
    </aside>
  );
}
