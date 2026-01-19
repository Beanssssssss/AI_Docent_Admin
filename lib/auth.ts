import { supabase } from "./supabase";

export interface User {
  id: string;
  email?: string;
}

// 현재 사용자 가져오기
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// 세션 확인
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// 이메일/비밀번호로 로그인
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 인증 상태 변경 감지
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
