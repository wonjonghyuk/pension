"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, User, Lock, LogOut, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email ?? null);
      }
    });
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 최소 6자리 이상이어야 합니다.' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: null, text: '' });

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: 'error', text: `변경 실패: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: '비밀번호가 안전하게 변경되었습니다!' });
      setNewPassword('');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert('로그아웃 되었습니다.');
    router.push('/');
  };

  if (!userEmail) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20">
      
      {/* Top App Bar */}
      <header className="bg-white px-4 py-3 flex items-center shadow-sm border-b border-gray-100">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 ml-2">회원 관리</h1>
      </header>

      <main className="flex-1 p-4 max-w-md w-full mx-auto mt-4 space-y-6">
        
        {/* Profile Info */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1 overflow-hidden">
             <p className="text-xs font-bold text-gray-400 mb-0.5">내 계정 정보</p>
             <h2 className="text-lg font-bold text-gray-800 truncate">{userEmail}</h2>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#14c2e6]" /> 비밀번호 변경하기
          </h3>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새로운 비밀번호 입력 (6자리 이상)"
                  required
                  className="w-full p-3.5 bg-gray-50 border border-transparent focus:border-[#14c2e6] rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-100 transition-all text-sm font-medium text-gray-800"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white p-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? '변경 중...' : '새 비밀번호 저장'}
            </button>
          </form>

          {message.type === 'success' && (
             <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-start gap-2">
               <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
               <p className="text-xs font-bold text-green-700">{message.text}</p>
             </div>
          )}
          {message.type === 'error' && (
             <div className="mt-4 p-3 bg-red-50 rounded-xl text-xs font-bold text-red-600">
               {message.text}
             </div>
          )}
        </div>

        {/* Logout Zone */}
        <div className="pt-4 border-t border-gray-200 px-2 mt-8">
           <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
              <LogOut className="w-4 h-4" /> 현재 계정에서 완전히 로그아웃
           </button>
        </div>

      </main>
    </div>
  );
}
