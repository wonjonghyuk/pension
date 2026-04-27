"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: null, text: '' });

    // 1. 로그인 먼저 시도
    let { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error?.message.includes('Invalid login credentials')) {
      // 2. 가입되지 않은 경우 회원가입 처리
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setMessage({ type: 'error', text: `회원가입 에러: ${signUpError.message}` });
      } else {
        setMessage({ type: 'success', text: '회원가입 성공! 메인화면으로 이동합니다...' });
        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } else if (error) {
      // 3. 다른 에러
      setMessage({ type: 'error', text: `오류 발생: ${error.message}` });
    } else {
      // 4. 기존 회원 로그인 성공
      window.location.href = '/';
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans pb-20">
      <div className="w-full max-w-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#14c2e6] to-[#8e54e9] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">연금 관리 시작하기</h1>
          <p className="text-sm text-gray-500 mt-2">이메일과 비밀번호로 빠르고 안전하게 가입하세요.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">이메일 주소</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="예: user@example.com"
                  required
                  className="w-full pl-11 p-3.5 bg-gray-50 border border-transparent focus:border-[#14c2e6] rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-100 transition-all font-medium text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">비밀번호</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요 (6자리 이상)"
                  required
                  className="w-full pl-11 p-3.5 bg-gray-50 border border-transparent focus:border-[#14c2e6] rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-100 transition-all font-medium text-gray-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-gradient-to-r from-[#14c2e6] to-[#8e54e9] hover:opacity-90 active:scale-[0.98] text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-cyan-200/50 flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">확인 중...</span>
              ) : (
                <span className="flex items-center gap-2">로그인 / 가입하기 <ArrowRight className="w-5 h-5" /></span>
              )}
            </button>
          </form>

          {/* Messages */}
          {message.type === 'success' && (
             <div className="mt-5 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3">
               <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
               <p className="text-sm font-bold text-green-700">{message.text}</p>
             </div>
          )}
          {message.type === 'error' && (
             <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600 text-center">
               {message.text}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
