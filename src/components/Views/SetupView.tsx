import React, { useState } from 'react';
import { Story, AppState, Genre, ExtraCharacter } from '../../../types';
import { Plus, X, Loader2, Globe } from 'lucide-react';
import { generateEpisode } from '../../../services/geminiService';

const EPISODE_OPTIONS = [10, 20, 50, 100];
const GENRE_OPTIONS: Genre[] = ['일상', '리얼', '캠퍼스', '오피스', '아포칼립스', '센티넬버스', '오메가버스', '빙의', '수인', 'TS'];

interface Props {
  language: 'kr' | 'en';
  setLanguage: (l: 'kr' | 'en') => void;
  theme: string;
  setLoading: (l: boolean) => void;
  loading: boolean;
  setCurrentStory: (s: Story) => void;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
}

const SetupView: React.FC<Props> = ({ language, setLanguage, setLoading, loading, setCurrentStory, setView, borderClasses, buttonActiveClasses, buttonHoverClasses }) => {
  // 1. 왼쪽 멤버 입력 상태
  const [leftGroupInput, setLeftGroupInput] = useState('');
  const [leftMemberInput, setLeftMemberInput] = useState('');
  
  // 2. 오른쪽 멤버 입력 상태
  const [rightGroupInput, setRightGroupInput] = useState('');
  const [rightMemberInput, setRightMemberInput] = useState('');
  
  // 3. 나페스 모드 상태
  const [isNafes, setIsNafes] = useState(false);
  const [nafesName, setNafesName] = useState('여주');
  
  // 4. 등장인물 추가 상태
  const [extraMembers, setExtraMembers] = useState<ExtraCharacter[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [tempExtraGroup, setTempExtraGroup] = useState('');
  const [tempExtraName, setTempExtraName] = useState('');
  
  // 5. 장르 선택 상태
  const [selectedGenre, setSelectedGenre] = useState<Genre>('일상');
  const [isSelectingGenre, setIsSelectingGenre] = useState(false); 
  
  // 6. 썰(프롬프트) 및 분량 상태
  const [themeInput, setThemeInput] = useState('');
  const [episodeLimit, setEpisodeLimit] = useState(10);

  // 등장인물 추가 핸들러
  const handleAddExtra = () => {
    if (tempExtraGroup && tempExtraName) {
      setExtraMembers([...extraMembers, { groupName: tempExtraGroup, name: tempExtraName }]);
      setTempExtraGroup('');
      setTempExtraName('');
      setIsAddingExtra(false);
    }
  };

  // 연재 시작 핸들러
  const handleStart = async () => {
    if (!leftGroupInput || !leftMemberInput || !themeInput) return;
    if (!isNafes && (!rightGroupInput || !rightMemberInput)) return;

    const finalRightMember = isNafes ? nafesName : rightMemberInput;
    
    setLoading(true);
    try {
      const initialStory: Story = {
        id: Date.now().toString(),
        title: `[${leftMemberInput} X ${finalRightMember}] ${selectedGenre}물`,
        
        genre: selectedGenre,
        theme: themeInput,
        
        leftGroup: leftGroupInput,
        leftMember: leftMemberInput,
        
        rightGroup: isNafes ? undefined : rightGroupInput,
        rightMember: finalRightMember,
        
        isNafes,
        nafesName: isNafes ? nafesName : undefined,
        
        extraMembers: extraMembers,
        groupName: leftGroupInput, 
        
        totalEpisodes: episodeLimit,
        episodes: [], 
        isCompleted: false,
        createdAt: Date.now(),
        language
      };

      const firstEp = await generateEpisode(initialStory, themeInput, 1);
      
      const newStory = { 
        ...initialStory, 
        title: firstEp.storyTitle || initialStory.title, 
        episodes: [{ 
            episodeNumber: 1, 
            content: firstEp.content, 
            suggestions: firstEp.suggestions 
        }]
      };
      
      setCurrentStory(newStory);
      setView(AppState.WRITING);
    } catch (e) { 
        console.error(e);
        alert("집필 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-700 pb-24 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button onClick={() => setLanguage(language === 'kr' ? 'en' : 'kr')} className={`p-3 border ${borderClasses} rounded-full transition-all ${buttonHoverClasses} flex items-center gap-2 shadow-sm`}>
          <Globe size={18} /><span className="text-[10px] font-bold uppercase">{language.toUpperCase()}</span>
        </button>
      </div>

      <header className="text-center pt-8">
        <img src="/slplogo.png" alt="Logo" className="mx-auto w-full max-w-[350px] mb-4" />
        <div className="space-y-1 opacity-70 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>마이너도 크오도 성실하게 글 써드립니다🤓☝️</p>
          <p>원하는 인물과 장르를 입력하면 AI가 이야기를 완성합니다.</p>
        </div>
      </header>

      <section className={`space-y-10 border-t ${borderClasses} pt-10`}>
        
        {/* 01: 왼쪽 멤버 입력 */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>01</span>{language === 'kr' ? '왼쪽 멤버' : 'LEFT MEMBER'}👈</h2>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text"
              value={leftGroupInput}
              onChange={(e) => setLeftGroupInput(e.target.value)}
              placeholder={language === 'kr' ? "그룹명" : "Group Name"}
              className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
            />
            <input 
              type="text"
              value={leftMemberInput}
              onChange={(e) => setLeftMemberInput(e.target.value)}
              placeholder={language === 'kr' ? "이름" : "Member Name"}
              className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
            />
          </div>
        </div>

        {/* 02: 오른쪽 멤버 입력 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>02</span>{language === 'kr' ? '오른쪽 멤버' : 'RIGHT MEMBER'}👉</h2>
            <button onClick={() => setIsNafes(!isNafes)} className={`flex items-center gap-2 px-4 py-2 border ${borderClasses} rounded-full text-[10px] font-bold transition-all ${isNafes ? buttonActiveClasses : buttonHoverClasses}`}>🙋‍♀️ {language === 'kr' ? '저요저요' : 'NAFES'} {isNafes ? 'ON' : 'OFF'}</button>
          </div>
          
          {isNafes ? (
            <div className="animate-in slide-in-from-top-2 space-y-4">
              <div className={`p-6 border border-dashed ${borderClasses} rounded-8 bg-transparent`}>
                <p className="text-xs font-bold mb-3 opacity-60 uppercase tracking-widest">이름 또는 애칭, 글에 녹이고 싶은 특징(나이, 성격, MBTI)들을 적어주세요</p>
                <input 
                  type="text" 
                  value={nafesName}
                  onChange={(e) => setNafesName(e.target.value)}
                  placeholder="예: 여주 (털털함, 25세, ENFP)"
                  className={`w-full p-4 border ${borderClasses} rounded-8 text-sm focus:outline-none bg-transparent`}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text"
                  value={rightGroupInput}
                  onChange={(e) => setRightGroupInput(e.target.value)}
                  placeholder={language === 'kr' ? "그룹명" : "Group Name"}
                  className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
                />
                <input 
                  type="text"
                  value={rightMemberInput}
                  onChange={(e) => setRightMemberInput(e.target.value)}
                  placeholder={language === 'kr' ? "이름" : "Member Name"}
                  className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
                />
            </div>
          )}

          {/* 등장인물 추가 버튼 */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {extraMembers.map((em, i) => (
              <div key={i} className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full`}>
                {em.name} ({em.groupName}) <X size={12} className="cursor-pointer" onClick={() => setExtraMembers(extraMembers.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            
            {!isAddingExtra ? (
                <button 
                  onClick={() => setIsAddingExtra(true)} 
                  className={`px-4 py-3 border border-dashed ${borderClasses} rounded-8 flex items-center gap-2 text-xs font-bold hover:bg-gray-50 transition-all opacity-60 hover:opacity-100`}
                >
                    <Plus size={14} /> {language === 'kr' ? '등장인물 추가' : 'Add Character'}
                </button>
            ) : (
                <div className="flex items-center gap-2 animate-in fade-in">
                    <input 
                        type="text" 
                        value={tempExtraGroup} 
                        onChange={e => setTempExtraGroup(e.target.value)} 
                        placeholder="그룹" 
                        className={`w-20 p-2 border ${borderClasses} rounded-8 text-xs bg-transparent`}
                    />
                    <input 
                        type="text" 
                        value={tempExtraName} 
                        onChange={e => setTempExtraName(e.target.value)} 
                        placeholder="이름" 
                        className={`w-20 p-2 border ${borderClasses} rounded-8 text-xs bg-transparent`}
                    />
                    <button onClick={handleAddExtra} className={`p-2 ${buttonActiveClasses} rounded-8 text-xs font-bold`}>OK</button>
                    <button onClick={() => setIsAddingExtra(false)} className={`p-2 border ${borderClasses} rounded-8 text-xs`}><X size={14} /></button>
                </div>
            )}
          </div>
        </div>

        {/* 03: 주제 및 소재 + 장르 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>03</span>{language === 'kr' ? '주제 및 소재 (썰)' : 'THEME & PROMPT'}</h2>
            
            <textarea 
                placeholder="보고 싶은 상황, 대사, 분위기 등을 자유롭게 적어주세요." 
                className={`w-full h-32 border ${borderClasses} rounded-8 p-4 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`} 
                value={themeInput} 
                onChange={e => setThemeInput(e.target.value)} 
            />

            {/* 장르 선택 UI */}
            <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                    {/* 선택된 장르 표시 */}
                    <div className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full ${buttonActiveClasses}`}>
                        #{selectedGenre}
                    </div>

                    {/* 장르 변경 버튼 (네모 점선 스타일) */}
                    <button 
                        onClick={() => setIsSelectingGenre(!isSelectingGenre)} 
                        className={`px-4 py-2 border border-dashed ${borderClasses} rounded-8 flex items-center gap-2 text-xs font-bold hover:bg-gray-50 transition-all opacity-60 hover:opacity-100`}
                    >
                        <Plus size={14} /> {language === 'kr' ? '장르 변경' : 'Change Genre'}
                    </button>
                </div>

                {/* 장르 목록 (토글됨) */}
                {isSelectingGenre && (
                    <div className={`grid grid-cols-3 md:grid-cols-5 gap-2 animate-in fade-in slide-in-from-top-2 p-4 border border-dashed ${borderClasses} rounded-8`}>
                        {GENRE_OPTIONS.map(genre => (
                            <button 
                                key={genre}
                                onClick={() => { setSelectedGenre(genre); setIsSelectingGenre(false); }}
                                className={`py-2 text-xs font-bold border ${borderClasses} rounded-8 transition-all ${selectedGenre === genre ? buttonActiveClasses : buttonHoverClasses}`}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* 04: 연재 분량 */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>04</span>{language === 'kr' ? '연재 분량' : 'LENGTH'}</h2>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_OPTIONS.map(opt => (
                <button key={opt} disabled={opt > 20} onClick={() => setEpisodeLimit(opt)} className={`py-3 text-xs font-bold border ${borderClasses} rounded-8 ${opt > 20 ? 'opacity-40 cursor-not-allowed' : episodeLimit === opt ? buttonActiveClasses : buttonHoverClasses}`}>
                  {opt} {language === 'kr' ? '회 분량' : 'EPISODES'} {opt > 20 && "🔒"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
            onClick={handleStart} 
            disabled={!leftMemberInput || (!isNafes && !rightMemberInput) || !themeInput || loading} 
            className={`w-full py-5 border ${borderClasses} ${buttonActiveClasses} font-black text-xl rounded-8 flex items-center justify-center gap-3 transition-all disabled:opacity-30`}
        >
          {loading && <Loader2 className="animate-spin" />} {language === 'kr' ? '연재 시작하기' : 'START WRITING'}
        </button>
      </section>
    </div>
  );
};
export default SetupView;