import React, { useState, useEffect, useRef } from 'react';
import { Story, AppState, Theme } from '../../../types';
import { ArrowLeft, Send, Save, Loader2, Share2, Copy, Check } from 'lucide-react';
import { generateEpisode } from '../../../services/geminiService';
import AdPlaceholder from '../Layout/AdPlaceholder';

interface Props {
  currentStory: Story;
  setCurrentStory: (s: Story) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  saveToLibrary: (s: Story) => void;
  theme: Theme;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
}

const WritingView: React.FC<Props> = ({ currentStory, setCurrentStory, loading, setLoading, saveToLibrary, theme, setView, borderClasses, buttonActiveClasses, buttonHoverClasses }) => {
  const [userInput, setUserInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
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
      // 마지막 에피소드에 사용자 선택 저장
      const updatedEpisodes = [...currentStory.episodes];
      updatedEpisodes[updatedEpisodes.length - 1].userChoice = choice;

      const tempStory = { ...currentStory, episodes: updatedEpisodes };
      setCurrentStory(tempStory);

      // 다음 화 생성 요청
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
      saveToLibrary(newStory);
    } catch (e) {
      console.error(e);
      alert("다음 이야기를 쓰는 도중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
      setUserInput('');
    }
  };

  const handleShare = async () => {
    const text = `${currentStory.title}\n\n${currentStory.episodes[0].content.substring(0, 100)}...\n\nRead more at PikFic!`;
    if (navigator.share) {
      try { await navigator.share({ title: currentStory.title, text }); } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col relative">
      {/* Header */}
      <header className={`flex items-center justify-between p-4 border-b ${borderClasses} bg-white/80 backdrop-blur-md sticky top-0 z-50 ${theme === 'dark' ? 'bg-zinc-950/80' : 'bg-white/80'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={() => setView(AppState.LIBRARY)} className={`p-2 rounded-full border ${borderClasses} ${buttonHoverClasses}`}>
            <ArrowLeft size={18} />
          </button>
          
          {/* 제목이 길 경우 Gradient Fade 처리 */}
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-sm font-bold truncate pr-4 relative [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
                {currentStory.title}
            </h1>
            <span className="text-[10px] opacity-60 font-medium">EP {currentStory.episodes.length} / {currentStory.totalEpisodes}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={() => saveToLibrary(currentStory)} className={`p-2 rounded-full border ${borderClasses} ${buttonHoverClasses}`}>
                <Save size={18} />
            </button>
            <button onClick={handleShare} className={`p-2 rounded-full border ${borderClasses} ${buttonHoverClasses}`}>
                {copied ? <Check size={18} /> : <Share2 size={18} />}
            </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {currentStory.episodes.map((ep, idx) => (
          <div key={idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {/* Chapter Header */}
            <div className="flex items-center justify-center gap-4 opacity-30">
                <div className={`h-px w-12 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chapter {ep.episodeNumber}</span>
                <div className={`h-px w-12 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}></div>
            </div>

            {/* Content */}
            <div className="prose prose-sm md:prose-base max-w-none leading-loose whitespace-pre-wrap font-serif opacity-90">
              {ep.content}
            </div>
            
            {/* User Choice (if made) */}
            {ep.userChoice && (
                <div className={`flex justify-end mt-4`}>
                    <div className={`px-5 py-3 rounded-2xl rounded-tr-none text-sm font-bold ${theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-black'}`}>
                        {ep.userChoice}
                    </div>
                </div>
            )}
            
            {/* Ad Placeholder after every 3 episodes */}
            {idx > 0 && idx % 3 === 0 && <AdPlaceholder theme={theme} />}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50">
                <Loader2 className="animate-spin w-8 h-8" />
                <p className="text-xs font-bold animate-pulse">WRITING NEXT CHAPTER...</p>
            </div>
        )}
        
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${borderClasses} bg-white/95 backdrop-blur ${theme === 'dark' ? 'bg-zinc-950/95' : 'bg-white/95'} absolute bottom-0 w-full z-40`}>
        {!loading && currentStory.episodes.length < currentStory.totalEpisodes ? (
            <div className="space-y-3 max-w-4xl mx-auto">
                {/* Suggestions */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {currentStory.episodes[currentStory.episodes.length - 1].suggestions.map((sugg, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleNextEpisode(sugg)}
                            className={`flex-shrink-0 px-4 py-2 border ${borderClasses} rounded-full text-xs font-medium whitespace-nowrap transition-all ${buttonHoverClasses}`}
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
                <div className="text-center py-4">
                    <p className="text-sm font-bold opacity-50">THE END</p>
                    <button onClick={() => setView(AppState.LIBRARY)} className={`mt-4 px-6 py-2 border ${borderClasses} rounded-full text-xs font-bold ${buttonHoverClasses}`}>
                        서재로 돌아가기
                    </button>
                </div>
             )
        )}
      </div>
    </div>
  );
};

export default WritingView;