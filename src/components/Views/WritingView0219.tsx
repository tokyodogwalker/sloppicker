import React, { useRef, useEffect, useState } from 'react';
import { Story, AppState } from '@/types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { generateEpisode } from '@/services/geminiService';
import { AdPlaceholder } from '../Layout/AdPlaceholder';

interface Props {
  currentStory: Story;
  setCurrentStory: (s: Story) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  saveToLibrary: (s: Story, lang?: 'kr' | 'en') => void;
  theme: string;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
  language: 'kr' | 'en';
  hashtags?: string[];
}

const WritingView: React.FC<Props> = ({ 
  currentStory, 
  setCurrentStory, 
  loading, 
  setLoading, 
  saveToLibrary, 
  theme, 
  setView, 
  borderClasses, 
  buttonActiveClasses, 
  buttonHoverClasses, 
  language, 
}) => {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [customInput, setCustomInput] = useState('');
  
  // [추가] 스트리밍 중인 텍스트를 실시간으로 담을 상태
  const [streamingContent, setStreamingContent] = useState('');
  
  // 마지막 에피소드 가져오기 (없을 경우 대비 안전 처리)
  const lastEp = currentStory.episodes.length > 0 
    ? currentStory.episodes[currentStory.episodes.length - 1] 
    : null;

  // [핵심 로직] 에피소드 추가 시 스크롤 제어
  useEffect(() => {
    // 에피소드가 없으면 아무것도 안 함
    if (!currentStory.episodes || currentStory.episodes.length === 0) return;

    // 1. 첫 번째 에피소드(1화) 생성 직후 -> 화면 맨 위로 이동
    if (currentStory.episodes.length === 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } 
    // 2. 2화 이상인 경우 -> 방금 생성된 최신 에피소드로 스크롤 이동
    else {
      setTimeout(() => {
        // 스트리밍 중이 아닐 때만 일반 스크롤 로직 작동
        if (!streamingContent) {
          scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [currentStory.episodes.length]);

  // [추가] 스트리밍 중일 때 글자가 써지는 속도에 맞춰 화면을 아래로 자동 스크롤
  useEffect(() => {
    if (loading && streamingContent) {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [streamingContent, loading]);

  const handleNext = async (choice: string) => {
    setLoading(true);
    setStreamingContent(''); // 생성 시작 전 초기화
    try {
      const nextEpNum = currentStory.episodes.length + 1;
      
      // [수정] generateEpisode에 네 번째 인자로 스트리밍 콜백 전달
      const nextEp = await generateEpisode(
        currentStory, 
        choice, 
        nextEpNum, 
        (text) => setStreamingContent(text)
      );

      // 완결 여부 계산
      const isComp = nextEpNum >= currentStory.totalEpisodes;
      
      const updated = { 
        ...currentStory, 
        episodes: [
          ...currentStory.episodes, 
          { 
            episodeNumber: nextEpNum, 
            content: nextEp.content, 
            suggestions: nextEp.suggestions, 
            userChoice: choice 
          }
        ], 
        isCompleted: nextEpNum >= currentStory.totalEpisodes, 
        hashtags: nextEp.hashtags || currentStory.hashtags
      };
      
      setCurrentStory(updated);
      setCustomInput('');

      // [추가] 완결 시 자동으로 서재에 저장
      if (isComp) {
        saveToLibrary(updated, language);
      }
      
    } catch (e) { 
      console.error("Episode Generation Error:", e);
      alert(language === 'kr' 
        ? "다음 회차 생성에 실패했습니다. 잠시 후 다시 시도해주세요." 
        : "Failed to generate the next episode. Please try again."
      ); 
    } finally { 
      setLoading(false); 
      setStreamingContent(''); // 완료 후 스트리밍 텍스트 초기화
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in relative pb-32">
        
        <div className="space-y-12 py-8">
            
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${borderClasses} pb-6 mb-8 sticky top-0 bg-white/80 backdrop-blur-md z-50 ${theme === 'dark' ? 'bg-zinc-950/80' : 'bg-white/80'}`}>
            <div className="flex items-center gap-4 overflow-hidden">
              <button onClick={() => setView(AppState.SETUP)} className={`flex-shrink-0 p-2 border ${borderClasses} rounded-8 ${buttonHoverClasses}`}><ChevronLeft size={20} /></button>
              <div className="flex flex-col overflow-hidden min-w-0">
                 <h1 className="text-sm font-bold truncate pr-4 relative [mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
                    {currentStory.title}
                 </h1>
                 <span className="text-[10px] opacity-60 font-medium truncate">
                    [{currentStory.leftMember} X {currentStory.rightMember}] {currentStory.episodes.length} / {currentStory.totalEpisodes} EPISODES
                 </span>
              </div>
            </div>
            <button onClick={() => saveToLibrary(currentStory, language)} className={`flex-shrink-0 ${buttonActiveClasses} px-5 py-2 rounded-8 text-[10px] font-black uppercase`}>SAVE</button>
          </div>

          {/* 에피소드 목록 렌더링 */}
          <div className="max-w-2xl mx-auto space-y-24">
            {currentStory.episodes.map((ep, idx) => (
              <div 
                key={idx} 
                // 스트리밍 중이 아닐 때만 마지막 에피소드에 ref 연결
                ref={idx === currentStory.episodes.length - 1 && !streamingContent ? scrollAnchorRef : null} 
                className="space-y-8 animate-in duration-1000"
              >
                <div className="text-center py-2">
                    <span className={`text-[10px] border ${borderClasses} px-4 py-1.5 font-bold uppercase tracking-widest rounded-full`}>
                        Chapter {ep.episodeNumber}
                    </span>
                </div>
                <div className="serif-content text-l whitespace-pre-wrap leading-relaxed">
                    {ep.content.split('\\n').join('\n').replace(/<br\s*\/?>/gi, '\n')}
                </div>
              </div>
            ))}

            {/* [추가] 스트리밍 중인 내용 표시 섹션 */}
            {loading && streamingContent && (
              <div 
                ref={scrollAnchorRef} 
                className="space-y-8 animate-in fade-in duration-500"
              >
                <div className="text-center py-2">
                    <span className={`text-[10px] border ${borderClasses} px-4 py-1.5 font-bold uppercase tracking-widest rounded-full opacity-50`}>
                        Chapter {currentStory.episodes.length + 1} (Writing...)
                    </span>
                </div>
                <div className="serif-content text-l whitespace-pre-wrap leading-relaxed opacity-80">
                    {streamingContent.split('\\n').join('\n').replace(/<br\s*\/?>/gi, '\n')}
                    {/* 타이핑 효과를 위한 커서 */}
                    <span className="inline-block w-1.5 h-5 ml-1 bg-current animate-pulse align-middle" />
                </div>
              </div>
            )}
          </div>
          
          {/* 완결 시 표시되는 Footer UI */}
          {currentStory.isCompleted && (
             <div className="max-w-2xl mx-auto text-center py-16 space-y-8 animate-in zoom-in-50 duration-500">
                <div className="space-y-4">
                    <p className="text-xl font-serif opacity-80">FIN.</p>
                    {currentStory.hashtags && (
                    <div className="flex flex-wrap justify-center gap-2">
                    {currentStory.hashtags.slice(0, 3).map((tag, i) => (
                        <span 
                            key={i} 
                            className={`px-3 py-1 rounded-full text-[10px] font-medium border border-gray-200 text-gray-200 bg-white hover:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-500`}
                        >
                            #{tag.replace('#', '')}
                        </span>
                            ))}
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => saveToLibrary(currentStory, language)} 
                    className={`px-3 py-2 ${buttonActiveClasses} rounded-full font-bold text-xs shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 mx-auto`}
                >
                    {language === 'kr' ? '내 서재에 저장' : 'Save to Library'}
                </button>
             </div>
          )}


          {/* 로딩 표시 (스트리밍 중이 아닐 때만 Loader 표시) */}
          {loading && !streamingContent && (
            <div className="max-w-2xl mx-auto py-8 flex flex-col items-center gap-4">
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-bold text-gray-500 uppercase">Writing next chapter...</p>
            </div>
          )}

          {/* 진행 중(완결X, 로딩X)일 때 입력 UI */}
          {!currentStory.isCompleted && !loading && lastEp && (
            <div className={`max-w-2xl mx-auto pt-32 border-t ${borderClasses} space-y-12`}>
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              
              {/* 중간 저장 버튼 */}
              <div className="flex justify-center">
                  <button onClick={() => saveToLibrary(currentStory, language)} className={`border ${borderClasses} px-5 py-2 rounded-8 text-xs font-black uppercase flex items-center gap-2 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
                    {language === 'kr' ? '내 서재에 저장' : 'Save to Library'}
                  </button>
              </div>

              {/* 선택지 목록 */}
              <div className="space-y-6">
                <h4 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Selection</h4>
                <div className="space-y-2">
                  {lastEp.suggestions.map((s, idx) => (
                    <button key={idx} onClick={() => handleNext(s)} className={`w-full p-5 border ${borderClasses} text-sm text-left rounded-8 font-medium flex items-center gap-4 group ${theme === 'dark' ? 'hover:bg-zinc-100 hover:text-zinc-950' : 'hover:bg-black hover:text-white'}`}>
                      <span className={`text-[10px] font-black w-6 h-6 rounded-full border ${borderClasses} flex items-center justify-center group-hover:border-current`}>{idx + 1}</span>{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* 커스텀 입력창 */}
              <div className="relative">
                <input 
                    type="text" 
                    value={customInput} 
                    onChange={e => setCustomInput(e.target.value)} 
                    placeholder={language === 'kr' ? "당신만의 서사를 입력하세요..." : "Enter your own narrative..."}
                    className={`w-full bg-transparent border ${borderClasses} rounded-8 py-5 pl-6 pr-16 text-sm focus:outline-none`} 
                    onKeyDown={(e) => e.key === 'Enter' && customInput && handleNext(customInput)}
                />
                <button disabled={!customInput} onClick={() => handleNext(customInput)} className={`absolute right-2 top-2 bottom-2 px-4 ${buttonActiveClasses} rounded-[6px] disabled:opacity-20`}><ChevronRight size={20} /></button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default WritingView;