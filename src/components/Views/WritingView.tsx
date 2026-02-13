import React, { useRef } from 'react';
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

const WritingView: React.FC<Props> = ({ currentStory, setCurrentStory, loading, setLoading, saveToLibrary, theme, setView, borderClasses, buttonActiveClasses, buttonHoverClasses, language, }) => {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [customInput, setCustomInput] = React.useState('');
  const lastEp = currentStory.episodes[currentStory.episodes.length - 1];

  const handleNext = async (choice: string) => {
    setLoading(true);
    try {
      const nextEpNum = currentStory.episodes.length + 1;
      const nextEp = await generateEpisode(currentStory, choice, nextEpNum);
      const updated = { ...currentStory, episodes: [...currentStory.episodes, { episodeNumber: nextEpNum, content: nextEp.content, suggestions: nextEp.suggestions, userChoice: choice }], isCompleted: nextEpNum >= currentStory.totalEpisodes, hashtags: nextEp.hashtags };
      setCurrentStory(updated);
      setCustomInput('');

    
      setTimeout(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) { 
      console.error("Episode Generation Error:", e);
      alert(language === 'kr' 
        ? "다음 회차 생성에 실패했습니다. 잠시 후 다시 시도해주세요." 
        : "Failed to generate the next episode. Please try again."
      ); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    // [수정 포인트] h-[calc...] 및 flex-col 제거, pb-32 추가
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in relative pb-32">
        
        {/* [수정 포인트] overflow-hidden 제거 */}
        <div className="space-y-12 py-8">
            
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${borderClasses} pb-6 mb-8 sticky top-0 bg-white/80 backdrop-blur-md z-50 ${theme === 'dark' ? 'bg-zinc-950/80' : 'bg-white/80'}`}>
            <div className="flex items-center gap-4 overflow-hidden">
              <button onClick={() => setView(AppState.SETUP)} className={`flex-shrink-0 p-2 border ${borderClasses} rounded-8 ${buttonHoverClasses}`}><ChevronLeft size={20} /></button>
              <div className="flex flex-col overflow-hidden min-w-0">
                 {/* 제목 Gradient Blur 적용 */}
                 <h1 className="text-sm font-bold truncate pr-4 relative [mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
                    {currentStory.title}
                 </h1>
                 {/* 소제목에 [멤버 X 멤버] 표시 추가 */}
                 <span className="text-[10px] opacity-60 font-medium truncate">[{currentStory.leftMember} X {currentStory.rightMember}] {currentStory.episodes.length} / {currentStory.totalEpisodes} EPISODES</span>
              </div>
            </div>
            <button onClick={() => saveToLibrary(currentStory, language)} className={`flex-shrink-0 ${buttonActiveClasses} px-5 py-2 rounded-8 text-[10px] font-black uppercase`}>SAVE</button>
          </div>

          <div className="max-w-2xl mx-auto space-y-24">
            {currentStory.episodes.map((ep, idx) => (
              <div key={idx} ref={idx === currentStory.episodes.length - 1 ? scrollAnchorRef : null} className="space-y-8 animate-in duration-1000">
                <div className="text-center py-2"><span className={`text-[10px] border ${borderClasses} px-4 py-1.5 font-bold uppercase tracking-widest rounded-full`}>Chapter {ep.episodeNumber}</span></div>
                {/* [수정 포인트] 줄바꿈 처리 로직 적용 */}
                <div className="serif-content text-l whitespace-pre-wrap leading-relaxed">{ep.content.split('\\n').join('\n').replace(/<br\s*\/?>/gi, '\n')}</div>
              </div>
            ))}
          </div>
          
          {/* 완결 시 표시되는 Footer UI */}
          {currentStory.isCompleted && (
             <div className="max-w-2xl mx-auto text-center py-16 space-y-8 animate-in zoom-in-50 duration-500">
                <div className="space-y-4">
                    <p className="text-xl font-serif opacity-80">FIN.</p>
                    {currentStory.hashtags && (
                        <div className="flex flex-wrap justify-center gap-3">
                            {currentStory.hashtags.map((tag, i) => (
                                <span key={i} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${borderClasses} opacity-80 bg-gray-50 dark:bg-zinc-900`}>
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


          {loading && (
            <div className="max-w-2xl mx-auto py-8 flex flex-col items-center gap-4">
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              <Loader2 className="animate-spin" size={32} /><p className="text-sm font-bold text-gray-500 uppercase">Writing next chapter...</p>
            </div>
          )}

          {!currentStory.isCompleted && !loading && (
            <div className={`max-w-2xl mx-auto pt-32 border-t ${borderClasses} space-y-12`}>
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              
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
              <div className="relative">
                <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)} 
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