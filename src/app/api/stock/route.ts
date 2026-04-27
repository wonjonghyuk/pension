import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No stock code provided' }, { status: 400 });

  try {
    // 현재가 (기본 정보)
    const basicRes = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const basicData = await basicRes.json();
    const closePrice = String(basicData.closePrice || '0').replace(/,/g, '');

    // 130일치 일봉 데이터 → 1개월(22영업일), 3개월(65영업일), 6개월(128영업일) 수익률 계산
    const chartRes = await fetch(
      `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=130&requestType=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.naver.com' } }
    );
    const chartXml = await chartRes.text();

    // XML 파싱: data="YYYYMMDD|시가|고가|저가|종가|거래량"
    const matches = [...chartXml.matchAll(/data="(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|/g)];
    const prices = matches.map(m => Number(m[5])); // 종가만 추출

    const len = prices.length;
    const current = Number(closePrice) || prices[len - 1] || 0;

    const calcRate = (daysAgo: number) => {
      if (len <= daysAgo) return null;
      const past = prices[len - 1 - daysAgo];
      if (!past) return null;
      return ((current - past) / past) * 100;
    };

    return NextResponse.json({
      closePrice: current,
      fluctuationsRatio: basicData.fluctuationsRatio,
      compareToPreviousClosePrice: basicData.compareToPreviousClosePrice,
      compareName: basicData.compareToPreviousPrice?.name,
      rate1m: calcRate(22),
      rate3m: calcRate(65),
      rate6m: calcRate(128),
    });
  } catch (error) {
    console.error("Stock fetch error:", error);
    return NextResponse.json({ error: 'Failed to fetch stock info' }, { status: 500 });
  }
}
