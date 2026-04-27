import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ items: [] });

  try {
    const response = await fetch(
      `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=index,stock,marketindicator`,
      {
        headers: {
          'Referer': 'https://finance.naver.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );
    const data = await response.json();

    // ac.stock.naver.com 응답 포맷: { items: [{code, name, ...}] }
    const results = (data.items || []).map((item: any) => ({
      code: item.code,
      name: item.name
    }));

    return NextResponse.json({ items: results });
  } catch (error) {
    console.error("Search fetch error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
