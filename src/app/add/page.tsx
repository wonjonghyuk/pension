"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, RefreshCw, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AccountType = { id: string | number, account_name: string, invested: string, current: string };

const formatNum = (val: string | number) => {
  if (!val) return '';
  const num = String(val).replace(/[^0-9]/g, '');
  return num ? Number(num).toLocaleString() : '';
};
const parseNum = (val: string) => Number(String(val).replace(/,/g, '')) || 0;

// ─── ETF 검색 자동완성 컴포넌트 ───────────────────────────
function StockAutocomplete({ row, updateRow }: any) {
  const [results, setResults] = useState<{code:string, name:string}[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // 종목명 변경 → 자동완성 검색
  useEffect(() => {
    if (!row.stock || !open) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(row.stock)}`);
        const d = await res.json();
        setResults(d.items || []);
      } catch (e) {}
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [row.stock, open]);

  // 종목 코드가 세팅되면 현재가 자동 조회
  useEffect(() => {
    if (!row.stockCode) return;
    fetchLivePrice(row.stockCode);
  }, [row.stockCode]);

  const fetchLivePrice = async (code: string) => {
    setFetchingPrice(true);
    try {
      const res = await fetch(`/api/stock?code=${code}`);
      const d = await res.json();
      const price = Number(d.closePrice || 0);
      if (price > 0) {
        updateRow(row.id, 'livePrice', String(price));
        // 1m/3m/6m 수익률 저장
        updateRow(row.id, 'rate1m', d.rate1m != null ? String(d.rate1m.toFixed(2)) : '');
        updateRow(row.id, 'rate3m', d.rate3m != null ? String(d.rate3m.toFixed(2)) : '');
        updateRow(row.id, 'rate6m', d.rate6m != null ? String(d.rate6m.toFixed(2)) : '');
      }
    } catch (e) {}
    setFetchingPrice(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={row.stock}
          onChange={(e) => {
            updateRow(row.id, 'stock', e.target.value);
            updateRow(row.id, 'stockCode', '');
            updateRow(row.id, 'livePrice', '');
            setOpen(true);
          }}
          onFocus={() => { if (row.stock) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="ETF 이름 검색..."
          className="w-full p-2.5 pr-14 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 outline-none focus:border-[#14c2e6] focus:ring-1 focus:ring-[#14c2e6]"
        />
        {row.stockCode && (
          <span className="absolute right-2 top-2.5 text-[10px] text-[#14c2e6] font-mono font-bold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100">
            {row.stockCode}
          </span>
        )}
      </div>

      {/* 현재가 + 기간별 수익률 표시 줄 */}
      {row.stockCode && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {fetchingPrice ? (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> 시세 조회중...
            </span>
          ) : row.livePrice ? (
            <>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                현재가 {Number(row.livePrice).toLocaleString()}원
              </span>
              {(['1개월', '3개월', '6개월'] as const).map((label, i) => {
                const rateStr = [row.rate1m, row.rate3m, row.rate6m][i];
                if (!rateStr) return null;
                const rate = Number(rateStr);
                return (
                  <span key={label} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    rate >= 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'
                  }`}>
                    {label} {rate > 0 ? '+' : ''}{rate}%
                  </span>
                );
              })}
            </>
          ) : (
            <button
              onClick={() => fetchLivePrice(row.stockCode)}
              className="text-[10px] text-gray-400 underline hover:text-[#14c2e6]"
            >
              현재가 재조회
            </button>
          )}
        </div>
      )}

      {open && row.stock.length > 0 && (
        <ul className="absolute z-50 bg-white border border-gray-100 shadow-xl max-h-48 overflow-y-auto w-[280px] md:w-[350px] rounded-xl mt-1 left-0 divide-y divide-gray-50">
          {searching ? (
            <li className="p-3 text-xs text-gray-400 text-center">검색중...</li>
          ) : results.length === 0 ? (
            <li className="p-3 text-xs text-gray-400 text-center">검색 결과가 없습니다</li>
          ) : (
            results.map(r => (
              <li
                key={r.code}
                className="p-3 text-sm hover:bg-cyan-50 cursor-pointer transition-colors flex justify-between items-center"
                onClick={() => {
                  updateRow(row.id, 'stock', r.name);
                  updateRow(row.id, 'stockCode', r.code);
                  setOpen(false);
                }}
              >
                <span className="font-bold text-gray-800 truncate pr-2">{r.name}</span>
                <span className="text-gray-400 text-xs font-mono">{r.code}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}


// ─── 메인 페이지 ───────────────────────────────────────────
export default function AddDataPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'grid' | 'quarter' | 'accounts'>('grid');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 세션 + DB 로딩
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      const { data: accData } = await supabase
        .from('accounts').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (accData && accData.length > 0) {
        setAccountRows(accData.map(a => ({
          id: a.id,
          account_name: a.account_name,
          invested: formatNum(a.invested_amount || 0),
          current: formatNum(a.current_amount || 0)
        })));
      } else {
        setAccountRows([{ id: Date.now(), account_name: '', invested: '', current: '' }]);
      }

      const { data: itemData } = await supabase
        .from('item_records').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (itemData && itemData.length > 0) {
        setGridRows(itemData.map(item => ({
          id: item.id,
          accountId: item.account_id,
          mode: item.mode || (item.stock_code ? 'auto' : 'manual'),
          stock: item.stock_name,
          stockCode: item.stock_code || '',
          buyPrice: formatNum(item.buy_price || 0),
          quantity: formatNum(item.quantity || 0),
          livePrice: '',
          rate1m: '', rate3m: '', rate6m: '',
          invested: formatNum(item.invested_amount || 0),
          current: formatNum(item.current_amount || 0)
        })));
      }

      const { data: qData } = await supabase
        .from('quarter_records').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (qData && qData.length > 0) {
        // 기존 포맷(YYYY-Q#) 파싱, 혹은 legacy 포맷 대응
        setQuarterRows(qData.map(q => {
          const parts = String(q.quarter).split('-');
          const year  = parts[0] || String(currentYear);
          const rawQ  = parts[1] || 'Q1';
          const qtr   = rawQ.startsWith('Q') ? rawQ : `Q${rawQ.replace('Q','')}`;
          return {
            id: q.id, year, qtr,
            deposit: formatNum(q.total_invested),
            profit:  formatNum(q.total_current),  // 누적 수익금
          };
        }));
      }
    }
    loadData();
  }, [router]);

  // ── 계좌 ──
  const [accountRows, setAccountRows] = useState<AccountType[]>([]);
  const addAccountRow = () => setAccountRows(prev => [...prev, { id: Date.now(), account_name: '', invested: '', current: '' }]);
  const updateAccountRow = (id: string | number, field: string, value: string) =>
    setAccountRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  const removeAccountRow = async (idToRemove: string | number) => {
    if (typeof idToRemove === 'string' && idToRemove.includes('-')) {
      if (!confirm("이 계좌를 삭제하시면 해당 계좌의 종목 기록도 모두 지워집니다. 진행하시겠습니까?")) return;
      await supabase.from('accounts').delete().eq('id', idToRemove);
    }
    setAccountRows(prev => prev.filter(row => row.id !== idToRemove));
    setGridRows(prev => prev.filter(row => row.accountId !== idToRemove));
  };

  const handleSaveAccounts = async () => {
    if (!userId) return;
    const validRows = accountRows.filter(r => r.account_name.trim() !== '');
    if (validRows.length === 0) return alert('저장할 데이터가 없습니다.');
    setLoading(true);
    let hasError = false;
    for (const row of validRows) {
      const payload = {
        user_id: userId,
        account_name: row.account_name.trim(),
        invested_amount: parseNum(row.invested),
        current_amount: parseNum(row.current)
      };
      if (typeof row.id === 'string' && row.id.includes('-')) {
        const { error } = await supabase.from('accounts').update(payload).eq('id', row.id);
        if (error) hasError = true;
      } else {
        const { error } = await supabase.from('accounts').insert(payload);
        if (error) hasError = true;
      }
    }
    setLoading(false);
    if (hasError) alert('일부 계좌 저장에 실패했습니다.');
    else { alert('계좌 데이터가 성공적으로 저장되었습니다!'); router.push('/'); }
  };

  // ── 종목 그리드 ──
  const [gridRows, setGridRows] = useState<{
    id: string | number, accountId: string, mode: 'auto'|'manual',
    stock: string, stockCode: string, buyPrice: string, quantity: string,
    livePrice: string, rate1m: string, rate3m: string, rate6m: string,
    invested: string, current: string
  }[]>([
    { id: 1, accountId: '', mode: 'auto', stock: '', stockCode: '', buyPrice: '', quantity: '', livePrice: '', rate1m: '', rate3m: '', rate6m: '', invested: '', current: '' },
    { id: 2, accountId: '', mode: 'manual', stock: '', stockCode: '', buyPrice: '', quantity: '', livePrice: '', rate1m: '', rate3m: '', rate6m: '', invested: '', current: '' },
  ]);
  const addGridRow = () => setGridRows(prev => [...prev, { id: Date.now(), accountId: '', mode: 'auto', stock: '', stockCode: '', buyPrice: '', quantity: '', livePrice: '', rate1m: '', rate3m: '', rate6m: '', invested: '', current: '' }]);
  const updateGridRow = (id: string | number, field: string, value: string) =>
    setGridRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  const removeGridRow = (id: string | number) => setGridRows(prev => prev.filter(row => row.id !== id));

  const handleSaveGrid = async () => {
    if (!userId) return;
    const validRows = gridRows.filter(r => r.accountId && String(r.accountId).includes('-') && r.stock.trim());
    if (validRows.length === 0) return alert('저장할 데이터가 없습니다. 빈 칸을 확인해주세요.');
    for (const row of validRows) {
      if (row.mode === 'auto' && !row.stockCode)
        return alert(`자동 연동(ETF) 모드인 [${row.stock}] 종목의 코드가 없습니다. 검색을 통해 정확히 입력해주세요.`);
    }
    setLoading(true);
    await supabase.from('item_records').delete().eq('user_id', userId);
    const insertData = validRows.map(row => {
      const isAuto = row.mode === 'auto';
      const bp = parseNum(row.buyPrice);
      const q = parseNum(row.quantity);
      return {
        user_id: userId,
        account_id: row.accountId,
        stock_name: row.stock.trim(),
        mode: row.mode,
        stock_code: isAuto ? row.stockCode : null,
        buy_price: isAuto ? bp : 0,
        quantity: isAuto ? q : 0,
        invested_amount: isAuto ? (bp * q) : parseNum(row.invested),
        current_amount: isAuto ? 0 : parseNum(row.current),
      };
    });
    const { error } = await supabase.from('item_records').insert(insertData);
    setLoading(false);
    if (error) alert(`저장 실패: ${error.message}`);
    else { alert('종목 기록이 안전하게 저장되었습니다!'); router.push('/'); }
  };

  // ── 분기 (연도+분기 드롭다운, 입금 + 누적수익률% 입력 → 나머지는 자동계산) ──
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2010 + 4 }, (_, i) => 2010 + i);
  const qOptions = ['Q1', 'Q2', 'Q3', 'Q4'];

  // 저장필드: deposit=입금, profit=누적 수익금
  const [quarterRows, setQuarterRows] = useState<{ id: string|number, year:string, qtr:string, deposit:string, profit:string }[]>([
    { id: 1, year: String(currentYear), qtr: 'Q1', deposit: '', profit: '' },
  ]);
  const addQuarterRow = () => setQuarterRows(prev => [...prev, { id: Date.now(), year: String(currentYear), qtr: 'Q1', deposit: '', profit: '' }]);
  const updateQuarterRow = (id: string|number, field: string, value: string) =>
    setQuarterRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  const removeQuarterRow = (id: string|number) => setQuarterRows(prev => prev.filter(row => row.id !== id));

  // 누적원금 + 수익률 실시간 자동 계산 (form 표시용)
  const quarterDisplayData = React.useMemo(() => {
    let cum = 0;
    return quarterRows.map(row => {
      const dep    = parseNum(row.deposit);
      const profit = parseNum(row.profit);
      cum += dep;
      const rate  = cum > 0 ? parseFloat(((profit / cum) * 100).toFixed(2)) : 0;
      const total = cum + profit;
      return { cumDeposit: cum, rate, total };
    });
  }, [quarterRows]);

  const handleSaveQuarter = async () => {
    if (!userId) return;
    const validRows = quarterRows.filter(r => r.year && r.qtr && r.deposit);
    if (validRows.length === 0) return alert('저장할 유효한 분기 데이터가 없습니다.');
    setLoading(true);
    await supabase.from('quarter_records').delete().eq('user_id', userId);
    const { error } = await supabase.from('quarter_records').insert(
      validRows.map(row => ({
        user_id: userId,
        quarter: `${row.year}-${row.qtr}`,
        total_invested: parseNum(row.deposit),   // 이번 분기 입금
        total_current:  parseNum(row.profit),    // 누적 수익금 (절대금액)
      }))
    );
    setLoading(false);
    if (error) alert(`저장 실패: ${error.message}`);
    else { alert('분기별 자산 기록이 안전하게 저장되었습니다!'); router.push('/'); }
  };

  if (!userId) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-bold">불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">자산 이력 관리</h1>
        <button
          onClick={() => activeTab === 'grid' ? handleSaveGrid() : activeTab === 'quarter' ? handleSaveQuarter() : handleSaveAccounts()}
          disabled={loading}
          className="px-3 py-1.5 bg-[#14c2e6] text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50"
        >
          {loading ? '저장중' : '저장'}
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white px-4 pt-4 border-b border-gray-200 overflow-x-auto hide-scrollbar sticky top-[60px] z-10">
        <div className="flex gap-6 min-w-max pb-3">
          {[
            { key: 'grid', label: '종목별 기록', color: 'border-[#8e54e9] text-[#8e54e9]' },
            { key: 'quarter', label: '분기별 추세', color: 'border-[#14c2e6] text-[#14c2e6]' },
            { key: 'accounts', label: '계좌 관리', color: 'border-gray-800 text-gray-800' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`font-bold transition-colors pb-3 -mb-3 border-b-2 ${activeTab === key ? color : 'border-transparent text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 mt-2">

        {/* ─── TAB: 계좌 관리 ─── */}
        {activeTab === 'accounts' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4 px-1">
              <h2 className="text-xl font-bold text-gray-800">내 연금 계좌 관리</h2>
              <p className="text-xs text-gray-500 mt-0.5">계좌별 실제 납입 원금과 평가 금액을 입력하여 정확한 수익률을 추적하세요.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto pb-8">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="p-3 pl-4 w-[25%]">계좌 별칭</th>
                      <th className="p-3 text-right">총 납입 원금 (원)</th>
                      <th className="p-3 text-right">총 평가 자산 (원)</th>
                      <th className="p-3 text-right w-[15%]">수익률</th>
                      <th className="p-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accountRows.map((row) => {
                      const inv = parseNum(row.invested), cur = parseNum(row.current);
                      const rate = inv > 0 ? (((cur - inv) / inv) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={row.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-2 pl-4">
                            <input value={row.account_name} onChange={e => updateAccountRow(row.id, 'account_name', e.target.value)}
                              placeholder="예: TDF 전용 IRP"
                              className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 outline-none focus:border-[#8e54e9] focus:ring-1 focus:ring-[#8e54e9]" />
                          </td>
                          <td className="p-2">
                            <input type="text" value={row.invested} onChange={e => updateAccountRow(row.id, 'invested', formatNum(e.target.value))}
                              placeholder="0" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-right text-gray-800 outline-none focus:border-[#8e54e9] focus:ring-1 focus:ring-[#8e54e9]" />
                          </td>
                          <td className="p-2">
                            <input type="text" value={row.current} onChange={e => updateAccountRow(row.id, 'current', formatNum(e.target.value))}
                              placeholder="0" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-right text-[#8e54e9] outline-none focus:border-[#8e54e9] focus:ring-1 focus:ring-[#8e54e9]" />
                          </td>
                          <td className="p-2 text-right pr-4">
                            <span className={`text-sm font-bold ${Number(rate) >= 0 ? 'text-[#ff6b6b]' : 'text-blue-500'}`}>
                              {Number(rate) > 0 ? '+' : ''}{rate}%
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeAccountRow(row.id)} className="p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50/50 border-t border-gray-100">
                <button onClick={addAccountRow} className="flex items-center gap-2 text-sm text-[#8e54e9] font-bold py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors">
                  <Plus className="w-4 h-4" /> 계좌 추가하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: 종목별 하이브리드 그리드 ─── */}
        {activeTab === 'grid' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4 px-1">
              <h2 className="text-xl font-bold text-gray-800">종목 자산 상세 기록</h2>
              <p className="text-xs text-gray-500 mt-0.5">ETF는 검색 후 단가·수량을, 펀드/예수금은 수동으로 총 금액을 입력하세요.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto pb-24">
                <table className="w-full text-left border-collapse min-w-[980px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="p-3 pl-4 w-[14%]">연금 계좌</th>
                      <th className="p-3 w-[12%] text-center">모드</th>
                      <th className="p-3 w-[22%]">종목명 / 검색</th>
                      <th className="p-3 text-right w-[14%]">매수단가 (원)</th>
                      <th className="p-3 text-right w-[10%]">수량</th>
                      <th className="p-3 text-right w-[14%]">현재가 (원)</th>
                      <th className="p-3 text-right w-[14%]">평가금 (원)</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gridRows.map((row) => {
                      const isAuto = row.mode === 'auto';
                      const bp = parseNum(row.buyPrice);
                      const q = parseNum(row.quantity);
                      const lp = parseNum(row.livePrice);
                      const investedTotal = bp * q;
                      const liveTotal = lp > 0 ? lp * q : 0;
                      const returnRate = investedTotal > 0 && liveTotal > 0
                        ? (((liveTotal - investedTotal) / investedTotal) * 100)
                        : null;

                      return (
                        <tr key={row.id} className="hover:bg-blue-50/20 transition-colors align-top">
                          {/* 계좌 선택 */}
                          <td className="p-2 pl-4 pt-3">
                            <select value={row.accountId} onChange={e => updateGridRow(row.id, 'accountId', e.target.value)}
                              className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 outline-none focus:border-[#8e54e9] focus:ring-1 focus:ring-[#8e54e9]">
                              <option value="">계좌 선택...</option>
                              {accountRows.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name || '이름없음'}</option>)}
                            </select>
                          </td>

                          {/* 모드 */}
                          <td className="p-2 pt-3">
                            <select value={row.mode} onChange={e => updateGridRow(row.id, 'mode', e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-300 shadow-sm rounded-lg text-sm font-bold text-gray-800 outline-none focus:border-[#14c2e6] focus:ring-1 focus:ring-[#14c2e6]">
                              <option value="auto">🔥 ETF 자동</option>
                              <option value="manual">✍️ 펀드/예수금</option>
                            </select>
                          </td>

                          {/* 종목명/검색 */}
                          <td className="p-2 pt-3">
                            {isAuto ? (
                              <StockAutocomplete row={row} updateRow={updateGridRow} />
                            ) : (
                              <input value={row.stock} onChange={e => updateGridRow(row.id, 'stock', e.target.value)}
                                placeholder="예: 예금, TDF펀드"
                                className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400" />
                            )}
                          </td>

                          {/* 매수단가 / 총매수금 */}
                          <td className="p-2 pt-3">
                            <input type="text"
                              value={isAuto ? row.buyPrice : row.invested}
                              onChange={e => updateGridRow(row.id, isAuto ? 'buyPrice' : 'invested', formatNum(e.target.value))}
                              placeholder={isAuto ? "단가 (원)" : "총 매수금 (원)"}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-right text-gray-800 outline-none focus:border-[#14c2e6] focus:ring-1 focus:ring-[#14c2e6]" />
                            {isAuto && investedTotal > 0 && (
                              <div className="text-[10px] text-gray-400 text-right mt-0.5 font-semibold">
                                매수총액 {investedTotal.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* 수량 / 현재잔고 */}
                          <td className="p-2 pt-3">
                            <input type="text"
                              value={isAuto ? row.quantity : row.current}
                              onChange={e => updateGridRow(row.id, isAuto ? 'quantity' : 'current', formatNum(e.target.value))}
                              placeholder={isAuto ? "수량" : "잔고 (원)"}
                              className={`w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 ${isAuto ? 'text-gray-800 focus:border-[#14c2e6] focus:ring-[#14c2e6]' : 'text-[#8e54e9] focus:border-gray-400 focus:ring-gray-400'}`} />
                          </td>

                          {/* 현재가 (자동 전용) */}
                          <td className="p-2 pt-3">
                            {isAuto ? (
                              <div className={`w-full p-2.5 rounded-lg text-sm font-bold text-right border ${lp > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-dashed border-gray-200 text-gray-300'}`}>
                                {lp > 0 ? lp.toLocaleString() : '—'}
                              </div>
                            ) : (
                              <div className="w-full p-2.5 rounded-lg text-xs text-center text-gray-300 border border-dashed border-gray-100">
                                수동 입력
                              </div>
                            )}
                          </td>

                          {/* 실시간 평가금 */}
                          <td className="p-2 pt-3">
                            {isAuto ? (
                              <div>
                                <div className={`w-full p-2.5 rounded-lg text-sm font-bold text-right border ${liveTotal > 0 ? (liveTotal >= investedTotal ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600') : 'bg-gray-50 border-dashed border-gray-200 text-gray-300'}`}>
                                  {liveTotal > 0 ? liveTotal.toLocaleString() : '—'}
                                </div>
                                {returnRate !== null && (
                                  <div className={`text-[10px] text-right mt-0.5 font-bold ${returnRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                    {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full p-2.5 rounded-lg text-xs text-center text-gray-300 border border-dashed border-gray-100">
                                수동 입력
                              </div>
                            )}
                          </td>

                          {/* 삭제 */}
                          <td className="p-2 pt-4 text-center">
                            <button onClick={() => removeGridRow(row.id)} className="p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50/50 border-t border-gray-100">
                <button onClick={addGridRow} className="flex items-center gap-2 text-sm text-[#14c2e6] font-bold py-2 px-3 rounded-lg hover:bg-cyan-50 transition-colors">
                  <Plus className="w-4 h-4" /> 자산 기록 추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: 분기별 그리드 ─── */}
        {activeTab === 'quarter' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4 px-1">
              <h2 className="text-xl font-bold text-gray-800">분기별 자산 내역</h2>
              <p className="text-xs text-gray-500 mt-0.5">① <strong>입금</strong>(분기 신규 납입액)을 입력하면 누적원금이 자동 표시됩니다. &nbsp;② <strong>수익률(%)</strong>를 입력하면 수익금과 원금+수익이 자동 계산됩니다.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto pb-8">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="p-3 pl-4 w-[8%]">연도</th>
                      <th className="p-3 w-[7%]">분기</th>
                      <th className="p-3 text-right w-[15%]">입금 ✏️</th>
                      <th className="p-3 text-right w-[15%] text-gray-400">누적원금 ▼자동</th>
                      <th className="p-3 text-right w-[15%]">누적 수익금 ✏️</th>
                      <th className="p-3 text-right w-[12%] text-gray-400">수익률 ▼자동</th>
                      <th className="p-3 text-right w-[18%] text-gray-400">원금+수익 ▼자동</th>
                      <th className="p-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {quarterRows.map((row, idx) => {
                      const disp = quarterDisplayData[idx];
                      return (
                        <tr key={row.id} className="hover:bg-cyan-50/20 transition-colors align-middle">
                          {/* 연도 */}
                          <td className="p-2 pl-4">
                            <select value={row.year} onChange={e => updateQuarterRow(row.id, 'year', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-[#14c2e6]">
                              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </td>
                          {/* 분기 */}
                          <td className="p-2">
                            <select value={row.qtr} onChange={e => updateQuarterRow(row.id, 'qtr', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-[#14c2e6]">
                              {qOptions.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                          </td>
                          {/* [INPUT] 입금 */}
                          <td className="p-2">
                            <input type="text" value={row.deposit}
                              onChange={e => updateQuarterRow(row.id, 'deposit', formatNum(e.target.value))}
                              placeholder="입금액"
                              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-right text-gray-800 outline-none focus:border-[#14c2e6] focus:ring-1 focus:ring-[#14c2e6]" />
                          </td>
                          {/* [AUTO] 누적원금 */}
                          <td className="p-2">
                            <div className="w-full p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm font-bold text-right text-gray-500">
                              {disp.cumDeposit > 0 ? disp.cumDeposit.toLocaleString() : '—'}
                            </div>
                          </td>
                          {/* [INPUT] 누적 수익금 */}
                          <td className="p-2">
                            <input type="text" value={row.profit}
                              onChange={e => updateQuarterRow(row.id, 'profit', formatNum(e.target.value))}
                              placeholder="이 시점 누적 수익금"
                              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-right outline-none focus:border-[#8e54e9] focus:ring-1 focus:ring-[#8e54e9] text-[#8e54e9]" />
                          </td>
                          {/* [AUTO] 수익률 */}
                          <td className="p-2">
                            <div className={`w-full p-2.5 rounded-lg border border-dashed text-sm font-bold text-right ${
                              disp.rate > 0 ? 'bg-red-50 border-red-100 text-red-600' :
                              disp.rate < 0 ? 'bg-blue-50 border-blue-100 text-blue-600' :
                              'bg-gray-50 border-gray-200 text-gray-400'
                            }`}>
                              {disp.rate !== 0 ? `${disp.rate > 0 ? '+' : ''}${disp.rate}%` : '—'}
                            </div>
                          </td>
                          {/* [AUTO] 원금+수익 */}
                          <td className="p-2">
                            <div className={`w-full p-2.5 rounded-lg border border-dashed text-sm font-bold text-right ${
                              disp.total > 0 ? 'bg-cyan-50 border-cyan-100 text-[#14c2e6]' : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}>
                              {disp.total > 0 ? disp.total.toLocaleString() : '—'}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeQuarterRow(row.id)} className="p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <button onClick={addQuarterRow} className="flex items-center gap-2 text-sm text-[#14c2e6] font-bold py-2 px-3 rounded-lg hover:bg-cyan-50 transition-colors">
                  <Plus className="w-4 h-4" /> 분기 추가
                </button>
                <p className="text-[11px] text-gray-400 pr-2">▼자동 필드는 자동 계산된 읽기전용 표시입니다</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
