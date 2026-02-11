import React, { useState, useEffect, useRef } from 'react';
import { Story, AppState, Theme } from '../../../types';
import { ArrowLeft, Send, Loader2, Save } from 'lucide-react'; // Share, Check 제거, Save 추가
import { generateEpisode } from '../../../services/geminiService';
import AdPlaceholder from '../Layout/AdPlaceholder';

interface Props {
  currentStory: Story;
  setCurrentStory: (s: Story) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  saveToLibrary: (s: Story, lang?: 'kr' | 'en') => void;
  theme: Theme;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
  language: 'kr' | 'en';
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
  language // [해결] 여기서 language를 받아와야 오류가 안 납니다!
}) => {
  const [userInput, setUserInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStory.episodes, autoScroll]);

  const handleNextEpisode = async (choice: string) => {
    if (currentStory.episodes.length >= currentStory.totalEpisodes) return;
    setLoading(true);
    setAutoScroll(true);
    try {
      const updatedEpisodes = [...currentStory.episodes];
      updatedEpisodes[updatedEpisodes.length - 1].userChoice = choice;

      const tempStory = { ...currentStory, episodes: updatedEpisodes };
      setCurrentStory(tempStory);

      const nextEpData = await generateEpisode(tempStory, choice, currentStory.episodes.length + 1);
      
      const newStory = {
        ...tempStory,
        episodes: [
          ...updatedEpisodes,
          {
            episodeNumber: currentStory.episodes.length + 1,
            content: nextEpData.content,
            suggestions: nextEpData.suggestions
          }
        ]
      };
      
      setCurrentStory(newStory);
      saveToLibrary(newStory, language);
    } catch (e) {
      console.error(e);
      alert(language === 'kr' ? "다음 이야기를 쓰는 도중 문제가 발생했습니다." : "Error generating next episode.");
    } finally {
      setLoading(false);
      setUserInput('');
    }
  };

  return (
    // [복구] 챗봇 스타일(h-screen, overflow) 제거 -> 전체 스크롤 방식
    <div className="max-w-4xl mx-auto min-h-screen flex flex-col relative pb-32">
      
      {/* Header */}
      <header className={`flex items-center justify-between p-4 border-b ${borderClasses} bg-white/80 backdrop-blur-md sticky top-0 z-50 ${theme === 'dark' ? 'bg-zinc-950/80' : 'bg-white/80'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={() => setView(AppState.LIBRARY)} className={`p-2 rounded-full border ${borderClasses} ${buttonHoverClasses}`}>
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-sm font-bold truncate pr-4 relative [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
                {currentStory.title}
            </h1>
            <span className="text-[10px] opacity-60 font-medium">EP {currentStory.episodes.length} / {currentStory.totalEpisodes}</span>
          </div>
        </div>
        
        {/* [복구] 저장 버튼: 검정 배경 + 흰 글씨 (다크모드 대응) */}
        <button 
            onClick={() => saveToLibrary(currentStory, language)} 
            className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
        >
            {language === 'kr' ? '저장' : 'SAVE'}
        </button>
      </header>

      {/* Content Area */}
      <div className="p-6 space-y-8">
        {currentStory.episodes.map((ep, idx) => (
          <div key={idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* [복구] Chapter Header: 타원형(Pill) 스타일 */}
            <div className="flex justify-center">
                <span className={`inline-block px-4 py-1 rounded-full border ${borderClasses} text-[10px] font-bold uppercase tracking-widest opacity-60`}>
                    Chapter {ep.episodeNumber}
                </span>
            </div>

            {/* Content */}
            <div className="prose prose-sm md:prose-base max-w-none leading-loose whitespace-pre-wrap font-serif opacity-90">
              {ep.content}
            </div>
            
            {/* User Choice */}
            {ep.userChoice && (
                <div className={`flex justify-end mt-4`}>
                    <div className={`px-5 py-3 rounded-2xl rounded-tr-none text-sm font-bold ${theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-black'}`}>
                        {ep.userChoice}
                    </div>
                </div>
            )}
            
            {/* [복구] 3화마다 광고 배너 + 저장 버튼 노출 */}
            {idx > 0 && idx % 3 === 0 && (
                <div className="my-12">
                    <AdPlaceholder theme={theme} borderClasses={borderClasses} />
                    <button 
                        onClick={() => saveToLibrary(currentStory, language)}
                        className={`w-full py-4 border ${borderClasses} rounded-8 text-sm font-bold flex items-center justify-center gap-2 ${buttonHoverClasses} mt-4`}
                    >
                        <Save size={16} />
                        {language === 'kr' ? '내 서재에 저장' : 'Save to Library'}
                    </button>
                </div>
            )}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50">
                <Loader2 className="animate-spin w-8 h-8" />
                <p className="text-xs font-bold animate-pulse">WRITING NEXT CHAPTER...</p>
            </div>
        )}

        {/* [복구] Input Area: 챗봇(Fixed) 스타일 제거하고 글 아래에 자연스럽게 배치 */}
        {!loading && currentStory.episodes.length < currentStory.totalEpisodes ? (
            <div className="space-y-4 pt-8 border-t border-dashed border-gray-200 mt-8">
                {/* Suggestions */}
                <div className="flex flex-wrap gap-2">
                    {currentStory.episodes[currentStory.episodes.length - 1].suggestions.map((sugg, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleNextEpisode(sugg)}
                            className={`px-4 py-2 border ${borderClasses} rounded-full text-xs font-medium transition-all ${buttonHoverClasses} text-left`}
                        >
                            {sugg}
                        </button>
                    ))}
                </div>
                
                {/* Custom Input */}
                <div className="relative flex items-center gap-2">
                    <input 
                        type="text" 
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && userInput && handleNextEpisode(userInput)}
                        placeholder={language === 'kr' 
                            ? "다음 상황으로 보고 싶은 장면, 대사, 분위기 등을 자유롭게 적어주세요" 
                            : "Describe the scene, dialogue, or mood you want to see next..."}
                        className={`flex-1 p-4 pr-12 rounded-full border ${borderClasses} bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-gray-400`}
                    />
                    <button 
                        onClick={() => userInput && handleNextEpisode(userInput)}
                        disabled={!userInput}
                        className={`absolute right-2 p-2 rounded-full ${userInput ? buttonActiveClasses : 'opacity-20 cursor-not-allowed'}`}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        ) : (
             !loading && (
                <div className="text-center py-12">
                    <p className="text-sm font-bold opacity-50 mb-6">THE END</p>
                    <button onClick={() => setView(AppState.LIBRARY)} className={`px-8 py-3 border ${borderClasses} rounded-full text-sm font-bold ${buttonHoverClasses}`}>
                        {language === 'kr' ? '서재로 돌아가기' : 'Back to Library'}
                    </button>
                </div>
             )
        )}
        
        <div ref={scrollRef} />
      </div>
    </div>
  );
};

export default WritingView;