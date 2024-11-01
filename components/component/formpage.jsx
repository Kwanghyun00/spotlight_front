"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Header } from "@/components/component/header";

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function FormPage() {
  const [plays, setPlays] = useState([]);
  const [displayedIds, setDisplayedIds] = useState(new Set()); // 이미 표시된 ID들을 추적
  const [selectedPlays, setSelectedPlays] = useState([]);
  const [tokenData, setTokenData] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true); // 더 불러올 데이터가 있는지 추적
  const loader = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetchPlays();
    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (typeof window !== "undefined") {
      const storedTokenData = sessionStorage.getItem('tokenData');
      const storedRegion = sessionStorage.getItem('selectedRegion');
      const storedArea = sessionStorage.getItem('selectedArea');
      setTokenData(storedTokenData);
      setSelectedRegion(storedRegion);
      setSelectedArea(storedArea);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  const addNewPlaysWithoutDuplicates = (newPlays) => {
    const uniquePlays = newPlays.filter(play => !displayedIds.has(play.mt20id));
    
    if (uniquePlays.length === 0) {
      setHasMore(false);
      return false;
    }

    const newIds = new Set(uniquePlays.map(play => play.mt20id));
    setDisplayedIds(prev => new Set([...prev, ...newIds]));
    
    setPlays(prevPlays => [...prevPlays, ...uniquePlays.map(play => ({
      id: play.mt20id,
      title: play.prfnm,
      image: play.poster,
      description: play.sty || play.syn
    }))]);

    return true;
  };

  const fetchPlays = async () => {
    try {
      const response = await fetch('https://artause.co.kr/api/data');
      const data = await response.json();
      
      const formattedPlays = data.map(play => ({
        id: play.mt20id,
        title: play.prfnm,
        image: play.poster,
        description: play.syn
      }));
      
      setPlays(formattedPlays);
      setDisplayedIds(new Set(formattedPlays.map(play => play.id)));
    } catch (error) {
      console.error("Error fetching plays:", error);
    }
  };

  const loadMorePlays = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      
      let url;
      if (selectedPlays.length > 0) {
        // 선택된 연극이 있는 경우 추천 API 호출
        const selectedIds = selectedPlays.join(',');
        url = `https://artause.co.kr/userselect?plays=${selectedIds}`;
      } else {
        // 선택된 연극이 없는 경우 기본 20개 로드
        url = `https://artause.co.kr/api/data?page=${page}&limit=20`;
      }

      const response = await fetch(url);
      const newPlays = await response.json();
      
      if (Array.isArray(newPlays)) {
        const hasNewPlays = addNewPlaysWithoutDuplicates(newPlays);
        if (hasNewPlays) {
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error loading more plays:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, page, selectedPlays, hasMore, displayedIds]);

  // Intersection Observer 설정
  useEffect(() => {
    if (!hasMore) return;

    const options = {
      root: null,
      rootMargin: "20px",
      threshold: 1.0
    };

    const observer = new IntersectionObserver(entries => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadMorePlays();
      }
    }, options);

    const currentLoader = loader.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loadMorePlays, hasMore]);

  const handlePlaySelection = (playId) => {
    if (selectedPlays.includes(playId)) {
      setSelectedPlays(selectedPlays.filter((id) => id !== playId));
    } else {
      setSelectedPlays([...selectedPlays, playId]);
    }
    // 선택이 변경될 때 hasMore를 true로 리셋하여 새로운 추천을 가능하게 함
    setHasMore(true);
  };
  
  const handleRecommendationClick = async () => {
    const selectedIds = selectedPlays.join(',');
    
    try {
      const response = await fetch('https://artause.co.kr/userinfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedIds,
          tokenData,
          selectedRegion,
          selectedArea,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send data');
      }
      
      router.push(`/result?plays=${selectedIds}`);
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };
  
  const renderPlays = () => {
    if (isMobile) {
      return (
        <div>
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            className="w-full pb-12"
          >
            {plays.map((play) => (
              <SwiperSlide key={play.id} className="w-full">
                <PlayCard 
                  play={play} 
                  isSelected={selectedPlays.includes(play.id)} 
                  onSelect={handlePlaySelection} 
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <div ref={loader} className="h-10 flex items-center justify-center">
            {isLoading && <div>Loading...</div>}
            {!hasMore && <div>모든 연극을 불러왔습니다.</div>}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {plays.map((play) => (
              <PlayCard 
                key={play.id} 
                play={play} 
                isSelected={selectedPlays.includes(play.id)} 
                onSelect={handlePlaySelection} 
              />
            ))}
          </div>
          <div ref={loader} className="h-10 flex items-center justify-center">
            {isLoading && <div>Loading...</div>}
            {!hasMore && <div>모든 연극을 불러왔습니다.</div>}
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      <Header/>
      <div className="container mx-auto py-8 px-4 md:px-6">
        {renderPlays()}
        
        <div className={`${isMobile ? 'static mt-8 w-full' : 'fixed bottom-8 right-8'} z-50`}>
          <Button
            className={`bg-black text-white hover:bg-gray-800 transition-colors ${isMobile ? 'w-full' : ''}`}
            onClick={handleRecommendationClick}
          >
            추천 연극 확인하러 가기!
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlayCard({ play, isSelected, onSelect }) {
  const [showDescription, setShowDescription] = useState(false);

  const handleClick = () => {
    onSelect(play.id);
    setShowDescription(!showDescription);
  };

  return (
    <div
      className={`bg-card rounded-lg overflow-hidden shadow-sm group relative ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={handleClick}
    >
      <div className="relative w-full pb-[150%]">
        <img
          src={play.image}
          alt={play.title}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-300 ${
            showDescription ? "blur-sm" : ""
          }`}
        />
        {showDescription && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <p className="text-white text-sm overflow-y-auto max-h-full">
              {play.description}
            </p>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 flex flex-col items-center">
            <div className="bg-primary text-primary-foreground rounded-full p-2 mb-1">
              <CheckIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold bg-white px-1 py-0.5 rounded">
              {play.title}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{play.title}</h3>
      </div>
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}