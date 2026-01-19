"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 로그인 페이지는 체크하지 않음
      if (pathname === "/login") {
        setLoading(false);
        return;
      }

      try {
        const session = await getSession();
        if (session) {
          setAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("인증 확인 실패:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
