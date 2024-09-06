"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SearchResult() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword');  // 쿼리 파라미터에서 'keyword' 값 가져오기

  return (
    <div>
      <h1>Search Page</h1>
      <p>Search Keyword: {keyword}</p>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResult />
    </Suspense>
  );
}
