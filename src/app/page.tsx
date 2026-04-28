"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Treemap, Tooltip, ComposedChart, Bar, Line, Legend } from 'recharts';
import { Menu, Settings, Bell, Plus, Rocket, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 한국 주식 앱(토스, 업비트 등) 기준 색상: 상승=빨강, 하락=파랑
const getReturnColor = (rate: number) => {
  if (rate >= 80) return '#7f1d1d'; // 엄청 짙은 빨강 (80% 이상)
  if (rate >= 40) return '#b91c1c'; // 짙은 빨강 (40% 이상)
  if (rate >= 15) return '#ef4444'; // 기본 빨강 (15% 이상)
  if (rate >= 5) return '#f87171';  // 중간 빨강
  if (rate > 0) return '#fca5a5';   // 옅은 빨강
  
  if (rate <= -40) return '#1e3a8a'; // 엄청 짙은 파랑
  if (rate <= -15) return '#1d4ed8'; // 짙은 파랑
  if (rate <= -5) return '#3b82f6';  // 중간 파랑
  if (rate < 0) return '#93c5fd';    // 옅은 파랑
  return '#9ca3af'; // 보합 회색
};

const CustomizedTreemapContent = (props: any) => {
  const { x, y, width, height, name } = props;
  
  const returnRate = Number(props.returnRate ?? props.payload?.returnRate ?? 0);
  const color = getReturnColor(returnRate);
  const isLightColor = Math.abs(returnRate) <= 5 && returnRate !== 0;
  const textColor = isLightColor ? "#1f2937" : "#ffffff";
  const displayName = name || '';

  return (
    <g>
      {width > 5 && height > 5 && (
        <rect x={x} y={y} width={width} height={height} fill={color} stroke="#ffffff" strokeWidth="0" rx={6} />
      )}
      
      {width > 65 && height > 40 ? (
        <>
          <text x={x + 6} y={y + 18} fill={textColor} fontSize={11} fontWeight="300" className="tracking-tighter">
            {displayName.length > 7 ? displayName.substring(0,7) + '..' : displayName}
          </text>
          <text x={x + 6} y={y + 32} fill={textColor} fontSize={10} fontWeight="300" opacity={0.9} className="tracking-tighter">
             {returnRate > 0 ? '+' : ''}{returnRate.toFixed(1)}%
          </text>
        </>
      ) : width > 35 && height > 25 ? (
        <>
          <text x={x + 4} y={y + 14} fill={textColor} fontSize={9} fontWeight="300" className="tracking-tighter">
            {displayName.length > 4 ? displayName.substring(0,4) + '..' : displayName}
          </text>
          <text x={x + 4} y={y + 24} fill={textColor} fontSize={8} fontWeight="300" opacity={0.9} className="tracking-tighter">
             {returnRate > 0 ? '+' : ''}{Math.round(returnRate)}%
          </text>
        </>
      ) : width > 20 && height > 15 ? (
        <text x={x + 2} y={y + 12} fill={textColor} fontSize={8} fontWeight="300" className="tracking-tighter">
          {displayName.substring(0, 2)}..
        </text>
      ) : null}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-100 text-gray-800 p-3 rounded-xl shadow-xl z-50">
        <p className="font-bold text-sm mb-1">{data.name}</p>
        <p className="text-xs text-gray-600">평가 자산 비중 합산: {formatCurrency(data.size)}</p>
        <p className="text-xs text-gray-500 mb-1">순수 매수 합산: {formatCurrency(data.invested)}</p>
        <div className="pt-1 border-t border-gray-100/80 flex justify-between items-center">
           <p className={`text-xs font-bold mt-1 ${data.returnRate > 0 ? 'text-red-500' : data.returnRate < 0 ? 'text-blue-500' : 'text-gray-500'}`}>
            종목 수익률: {data.returnRate > 0 ? '+' : ''}{data.returnRate.toFixed(2)}%
          </p>
          {data.isAuto && <span className="text-[10px] bg-cyan-50 text-cyan-600 border border-cyan-100 px-1.5 py-0.5 rounded font-bold">실시간 연동</span>}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [rawAccounts, setRawAccounts] = useState<any[]>([]); 
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // 1. 유저 계정 로드
  useEffect(() => {
    const bypassId = localStorage.getItem('bypass_user_id');
    if (bypassId) {
      setUserEmail('wonjonghyuk@gmail.com (우회모드)');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. DB 데이터 로드
  useEffect(() => {
    async function loadDashData() {
      let userId = localStorage.getItem('bypass_user_id');

      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }
        userId = session.user.id;
      }
      
      const { data: aData } = await supabase.from('accounts').select('*').eq('user_id', userId);
      if (aData) setRawAccounts(aData);

      const { data: qData } = await supabase.from('quarter_records').select('*').eq('user_id', userId).order('quarter', { ascending: true });
      if (qData && qData.length > 0) {
        let cumDeposit = 0;
        let prevTotalAsset = 0;

        const processed = qData.map(row => {
          const deposit   = Number(row.total_invested); // 이번 분기 입금
          const cumProfit = Number(row.total_current);  // 누적 수익금 (절대금액)
          cumDeposit += deposit;

          const totalAsset = cumDeposit + cumProfit;
          // 누적 수익률 = 누적수익금 / 누적원금 × 100
          const returnRate = cumDeposit > 0
            ? parseFloat(((cumProfit / cumDeposit) * 100).toFixed(2)) : 0;

          // 이번 분기 수익률(막대) = (총자산 증가 - 이번 입금) / 직전 총자산 × 100
          const quarterGain = totalAsset - prevTotalAsset - deposit;
          const quarterRate = prevTotalAsset > 0
            ? parseFloat(((quarterGain / prevTotalAsset) * 100).toFixed(2))
            : returnRate; // 첫 분기는 누적 수익률로 표시

          prevTotalAsset = totalAsset;

          return {
            quarter: String(row.quarter).replace('-Q', ' '),
            deposit,
            cumDeposit,
            totalAsset,
            quarterRate,  // 이번 분기 수익률 → 막대
            returnRate,   // 누적 수익률 → tooltip
          };
        });
        setHistoryData(processed);
      }


      const { data: iData } = await supabase.from('item_records').select('*, accounts(account_name)').eq('user_id', userId);
      if (iData) setRawItems(iData);

      setIsLoading(false);
    }
    loadDashData();
  }, [userEmail]);

  // 3. 실시간 가격 페치 (ETF 자동 모드 전용)
  useEffect(() => {
    async function fetchLivePrices() {
      if (rawItems.length === 0) return;
      const codes = Array.from(new Set(rawItems.filter(item => item.stock_code).map(item => item.stock_code)));
      if (codes.length === 0) return;
      const newPrices: Record<string, number> = {};
      await Promise.all(codes.map(async (code) => {
        try {
          const res = await fetch(`/api/stock?code=${code}`);
          const data = await res.json();
          const parsed = Number(data.closePrice || 0);
          if (parsed > 0) newPrices[code] = parsed;
        } catch(e) {}
      }));
      setLivePrices(newPrices);
    }
    fetchLivePrices();
  }, [rawItems]);


  // 4. 종목 병합 및 히트맵 포트폴리오 가공 (실시간 자동 가격 반영)
  const aggregatedPortfolio = useMemo(() => {
    let filtered = rawItems;
    if (selectedAccount !== 'all') {
      filtered = rawItems.filter(item => item.accounts?.account_name === selectedAccount);
    }
    
    // name 기준으로 병합하되, 하나라도 자동 연동이면 isAuto 표기
    const groups: Record<string, { current: number, invested: number, isAuto: boolean }> = {};
    
    filtered.forEach(item => {
      const name = item.stock_name;
      if (!groups[name]) groups[name] = { current: 0, invested: 0, isAuto: false };
      
      const isAutoMode = item.mode === 'auto' || item.stock_code; // 하이브리드 지원
      
      if (isAutoMode && item.quantity > 0) {
        groups[name].isAuto = true;
        const liveP = livePrices[item.stock_code];
        
        if (liveP > 0) {
          // 실시간 종가 * 수량!
          groups[name].current += (liveP * Number(item.quantity));
        } else {
          // 통신 지연으로 아직 안 불러온 경우 방어 (원금 유지)
          groups[name].current += Number(item.invested_amount || 0);
        }
      } else {
         // 수동 펀드 모드 - 사용자가 직접 입력한 평가금
         groups[name].current += Number(item.current_amount || 0);
      }

      groups[name].invested += Number(item.invested_amount || 0);
    });
    
    return Object.entries(groups).map(([name, data]) => {
      const returnRate = data.invested > 0 ? ((data.current - data.invested) / data.invested) * 100 : 0;
      return {
        name,
        size: data.current || 1, // Treemap 에러 방지용 1
        invested: data.invested,
        returnRate,
        isAuto: data.isAuto
      };
    }).filter(p => p.size > 0).sort((a, b) => b.size - a.size);
  }, [rawItems, selectedAccount, livePrices]);

  const accountOptions = useMemo(() => {
    const accs = Array.from(new Set(rawItems.map(item => item.accounts?.account_name || '기타')));
    return accs.filter(Boolean);
  }, [rawItems]);

  const selectedStats = useMemo(() => {
    if (selectedAccount === 'all') return null;
    const acc = rawAccounts.find(a => a.account_name === selectedAccount);
    if (!acc) return null;
    
    const cur = Number(acc.current_amount || 0);
    const inv = Number(acc.invested_amount || 0);
    const rate = inv > 0 ? ((cur - inv) / inv) * 100 : 0;
    return { cur, inv, rate };
  }, [rawAccounts, selectedAccount]);

  const currentTotal = rawAccounts.reduce((sum, acc) => sum + Number(acc.current_amount || 0), 0);
  const investedTotal = rawAccounts.reduce((sum, acc) => sum + Number(acc.invested_amount || 0), 0);
  const returnAmount = currentTotal - investedTotal;
  const returnRate = investedTotal > 0 ? (returnAmount / investedTotal) * 100 : 0;
  
  const hasHistory = historyData.length > 0;
  const hasItems = rawItems.length > 0;
  const hasAccounts = rawAccounts.length > 0;
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* Top Navigation Bar */}
      <header className="bg-white px-5 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm border-b border-gray-100/50 md:hidden">
        <Menu className="w-6 h-6 text-gray-700" />
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">연금 관리</h1>
        <Bell className="w-6 h-6 text-gray-700" />
      </header>

      {/* Main Container - Responsive */}
      <div className="max-w-3xl mx-auto md:pt-10">
        
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center mb-8 px-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">내 연금 자산</h1>
            <p className="text-gray-500 mt-1">오늘도 든든한 노후를 준비하고 있어요.</p>
          </div>
          <div className="flex gap-3 items-center">
            {!userEmail ? (
              <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-gray-800 transition px-2">로그인</Link>
            ) : (
              <Link href="/profile" className="p-2.5 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center">
                 <Settings className="w-5 h-5 text-gray-600" />
              </Link>
            )}
            <Link href="/add" className="flex items-center gap-2 bg-gradient-to-r from-[#14c2e6] to-[#0ba8c9] text-white px-5 py-2.5 rounded-full shadow-sm hover:opacity-90 transition-opacity font-semibold text-sm">
              <Plus className="w-4 h-4" /> 기록 추가
            </Link>
          </div>
        </header>

        {/* Greeting Mobile */}
        <div className="px-6 pt-6 pb-2 md:hidden flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{userEmail ? userEmail.split('@')[0] + '님' : '방문자님 환영합니다'}</h2>
            <p className="text-sm text-gray-500 mt-1">{userEmail ? '든든한 노후 자산을 책임질게요.' : '로그인하고 자산을 관리해보세요.'}</p>
          </div>
          {userEmail ? (
             <Link href="/profile" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors mt-0.5">
              <Settings className="w-5 h-5"/>
            </Link>
          ) : (
             <Link href="/login" className="text-sm font-bold text-[#14c2e6] mt-1 border border-[#14c2e6] px-3 py-1 rounded-full">로그인</Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-gray-400 font-bold">자동 연동 데이터를 불러오는 중...</div>
        ) : (!userEmail ? (
          <div className="mx-5 my-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
             <div className="w-16 h-16 bg-gradient-to-tr from-[#14c2e6] to-[#8e54e9] rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                <Rocket className="w-8 h-8 text-white" />
             </div>
             <h2 className="text-xl font-bold text-gray-800 mb-2">당신의 연금 성장기를 시작하세요</h2>
             <p className="text-sm text-gray-500 mb-6">로그인하시면 분산된 계좌와 종목을 한눈에 보고 평가 수익률을 평생 관리할 수 있습니다.</p>
             <Link href="/login" className="inline-block bg-gray-900 text-white font-bold px-6 py-3 rounded-full shadow-lg">지금 바로 로그인하기</Link>
          </div>
        ) : (
          <>
            {(!hasHistory && !hasItems && !hasAccounts) && (
              <div className="mx-5 my-8 bg-blue-50/50 border border-blue-100/50 rounded-3xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                   <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">아직 기록된 연금 데이터가 없습니다!</h2>
                <p className="text-sm text-gray-500 mb-6">첫 번째 자산 내역을 등록하고 화려한 차트를 그려보세요.</p>
                <Link href="/add" className="inline-flex items-center gap-2 bg-[#14c2e6] text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-cyan-200/50 hover:bg-[#0da9ca] transition-colors">
                   <Plus className="w-5 h-5"/> 첫 자산 기록 추가하기
                </Link>
              </div>
            )}

            {hasAccounts && (
              <div className="px-5 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-[#14c2e6] to-[#0ba8c9] rounded-2xl p-5 text-white shadow-md flex flex-col h-32">
                    <p className="text-white text-sm font-bold opacity-90 drop-shadow-sm">총 납입액</p>
                    <h3 className="text-3xl font-black mt-auto text-right drop-shadow-md tracking-tight">{formatCurrency(investedTotal)}</h3>
                  </div>
                  <div className="bg-gradient-to-br from-[#4facfe] to-[#00f2fe] rounded-2xl p-5 text-white shadow-md flex flex-col h-32">
                    <p className="text-white text-sm font-bold opacity-90 drop-shadow-sm">총 평가액</p>
                    <h3 className="text-3xl font-black mt-auto text-right drop-shadow-md tracking-tight">{formatCurrency(currentTotal)}</h3>
                  </div>
                  <div className="bg-gradient-to-br from-[#8e54e9] to-[#6a35c9] rounded-2xl p-5 text-white shadow-md flex flex-col h-32 relative">
                    <div className="flex justify-between items-start">
                       <p className="text-white text-sm font-bold opacity-90 drop-shadow-sm">운용 수익</p>
                       <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                         {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
                       </span>
                    </div>
                    <h3 className="text-3xl font-black mt-auto text-right drop-shadow-md tracking-tight">
                      {returnAmount > 0 ? '+' : ''}{formatCurrency(returnAmount)}
                    </h3>
                  </div>
              </div>
            )}

            <div className="px-5 mt-6 space-y-6">
              {hasItems && (
                <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="p-4 md:p-5 border-b border-gray-50 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">종목 실시간 히트맵</h3>
                        <p className="text-xs text-gray-400 mt-1">블록 크기 = 실시간 비중 / 색상 = <span className="text-red-400 font-bold">오름</span>, <span className="text-blue-400 font-bold">내림</span></p>
                      </div>
                      <select 
                        value={selectedAccount} 
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="text-xs md:text-sm font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl p-2 outline-none focus:ring-2 focus:ring-[#14c2e6] w-full sm:w-auto"
                      >
                        <option value="all">전체 계좌 보기 (중복 합산)</option>
                        {accountOptions.map(acc => <option key={acc} value={acc}>{acc} 전용</option>)}
                      </select>
                    </div>

                    {selectedStats && (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-wrap gap-4 items-center text-sm shadow-inner transition-all animate-in fade-in slide-in-from-top-1">
                        <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-200">{selectedAccount}</span>
                        <span className="text-gray-500 font-medium">실제 납입: {formatCurrency(selectedStats.inv)}</span>
                        <span className="text-gray-800 font-bold">실제 평가: {formatCurrency(selectedStats.cur)}</span>
                        <span className={`font-bold ml-auto ${selectedStats.rate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                          실제 수익률 {selectedStats.rate > 0 ? '+' : ''}{selectedStats.rate.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 pt-4">
                    {aggregatedPortfolio.length > 0 ? (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <Treemap
                            data={aggregatedPortfolio}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            content={<CustomizedTreemapContent />}
                          >
                            <Tooltip content={<CustomTooltip />} />
                          </Treemap>
                        </ResponsiveContainer>
                        <div className="flex justify-end pt-2">
                           {Object.keys(livePrices).length > 0 && <span className="text-[10px] text-gray-400 font-bold animate-pulse">● 실시간 자동 연동 켜짐</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-gray-400 font-bold text-sm bg-gray-50 rounded-xl">
                        해당 계좌에는 보유중인 종목이 없습니다.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {hasHistory && (
                <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="p-5 pb-3 border-b border-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">자산 성장 사이클</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="inline-flex items-center gap-1 mr-2"><span className="w-3 h-1 bg-[#14c2e6] rounded inline-block"></span>총자산</span>
                      <span className="inline-flex items-center gap-1 mr-2"><span className="w-3 h-1 bg-[#8e54e9] rounded inline-block"></span>누적원금</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-2.5 bg-red-400 rounded-sm inline-block"></span>분기수익률</span>
                    </p>
                  </div>
                  <CardContent className="p-0 pt-2">
                    <div className="h-[300px] w-full px-1 pb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={historyData} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14c2e6" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#14c2e6" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="gradDeposit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8e54e9" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#8e54e9" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis
                            dataKey="quarter" axisLine={false} tickLine={false}
                            tick={{ fontSize: 9, fill: '#9ca3af' }} dy={6}
                            interval="preserveStartEnd"
                          />

                          {/* 좌측 Y축: 금액 */}
                          <YAxis
                            yAxisId="money" orientation="left"
                            tickFormatter={v => v >= 100000000 ? `${(v/100000000).toFixed(1)}억` : `${Math.floor(v/10000)}만`}
                            axisLine={false} tickLine={false}
                            tick={{ fontSize: 9, fill: '#9ca3af' }} width={48}
                          />
                          {/* 우측 Y축: 수익률 % */}
                          <YAxis
                            yAxisId="rate" orientation="right"
                            tickFormatter={v => `${v}%`}
                            axisLine={false} tickLine={false}
                            tick={{ fontSize: 9, fill: '#f87171' }} width={36}
                          />

                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#ffffff', color: '#1f2937', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 500 }}
                            formatter={(value: any, name: any) => {
                              if (name === 'quarterRate') return [`${Number(value).toFixed(2)}%`, '분기 수익률'];
                              if (name === 'returnRate')  return [`${Number(value).toFixed(2)}%`, '누적 수익률'];
                              const labels: Record<string, string> = { cumDeposit: '누적원금', totalAsset: '총자산' };
                              return [formatCurrency(Number(value)), labels[name] || name];
                            }}
                            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                          />

                          {/* 누적원금 에어리어 */}
                          <Area
                            yAxisId="money" type="monotone" dataKey="cumDeposit"
                            stroke="#8e54e9" strokeWidth={2}
                            fill="url(#gradDeposit)" fillOpacity={1}
                            dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                            name="cumDeposit"
                          />
                          {/* 총자산 에어리어 */}
                          <Area
                            yAxisId="money" type="monotone" dataKey="totalAsset"
                            stroke="#14c2e6" strokeWidth={3}
                            fill="url(#gradTotal)" fillOpacity={1}
                            dot={{ r: 2.5, fill: '#14c2e6', strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            name="totalAsset"
                          />

                          {/* 분기별 수익률 막대 (우측 Y축) - 상승:빨강 하락:파랑 */}
                          <Bar
                            yAxisId="rate"
                            dataKey="quarterRate"
                            radius={[3, 3, 0, 0]}
                            barSize={14}
                            name="quarterRate"
                            fill="#f87171"
                            label={false}
                          >
                            {historyData.map((entry: any, index: number) => (
                              <rect
                                key={index}
                                fill={entry.quarterRate >= 0 ? '#f87171' : '#60a5fa'}
                              />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ))}
      </div>
      
      {/* Mobile Bottom Navigation Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center md:hidden pb-safe z-30">
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="text-[#14c2e6]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-[10px] font-medium text-[#14c2e6]">홈</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400">자산</span>
        </div>
        <Link href="/add" className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-12 h-12 bg-gradient-to-r from-[#14c2e6] to-[#8e54e9] rounded-full flex items-center justify-center shadow-lg -mt-8 border-4 border-gray-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
        </Link>
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400">분석</span>
        </div>
        <Link href={userEmail ? "/profile" : "/login"} className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400">나</span>
        </Link>
      </div>
    </div>
  );
}
