import React, { useState, useEffect } from 'react';
import { Story, AppState, Genre, ExtraCharacter } from '../../../types';
import { Plus, X, Loader2, Globe } from 'lucide-react';
import { generateEpisode } from '../../../services/geminiService';
import { LogIn, LogOut, User } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const EPISODE_OPTIONS = [10, 20, 50, 100];
const GENRE_OPTIONS: Genre[] = ['일상', '리얼', '캠퍼스', '오피스', '아포칼립스', '오메가버스', '센티넬버스', '수인', 'TS'];

// [추가] 장르 표시용 다국어 매핑
const GENRE_DISPLAY: Record<Genre, { kr: string; en: string }> = {
  '일상': { kr: '일상', en: 'Slice of Life' },
  '리얼': { kr: '리얼', en: 'Real Idol Life' },
  '캠퍼스': { kr: '캠퍼스', en: 'Campus' },
  '오피스': { kr: '오피스', en: 'Office' },
  '오메가버스': { kr: '오메가버스', en: 'Omegaverse' },
  '센티넬버스': { kr: '센티넬버스', en: 'Sentinelverse' },
  'TS': { kr: 'TS', en: 'TS' },
  '수인': { kr: '수인', en: 'Shapeshifter' },
  '아포칼립스': { kr: '아포칼립스', en: 'Apocalypse' },
};

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
  session: any;
  onLogin: () => void;
  onLogout: () => void;
}

const MAX_NAME_VJ = 20; // 이름/그룹명 최대 길이
const MAX_THEME_VJ = 200; // 주제(썰) 최대 길이

const SetupView: React.FC<Props> = ({ language, setLanguage, setLoading, loading, setCurrentStory, setView, borderClasses, buttonActiveClasses, buttonHoverClasses, session, onLogin, onLogout, theme}) => {
  // 1. 왼쪽 멤버 입력 상태
  const [leftGroupInput, setLeftGroupInput] = useState('');
  const [leftMemberInput, setLeftMemberInput] = useState('');
  
  // 2. 오른쪽 멤버 입력 상태
  const [rightGroupInput, setRightGroupInput] = useState('');
  const [rightMemberInput, setRightMemberInput] = useState('');
  
  // 3. 나페스 모드 상태
  const [isNafes, setIsNafes] = useState(false);
  const [nafesName, setNafesName] = useState('');
  
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

  // [추가] 큐레이션State
  const [featuredStories, setFeaturedStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 9; //9개씩 로드

  const loadFeatured = async (pageIndex: number) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_featured', true) // 관리자가 승인한 글만
        .range(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (data) {
        if (pageIndex === 0) setFeaturedStories(data as any);
        else setFeaturedStories(prev => [...prev, ...data as any]);
      }
      if (error) console.error("Featured Load Error:", error);
    } catch (err) {
      console.error(err);
    }
  };

  // [추가] 컴포넌트 마운트 시 큐레이션 로딩
  useEffect(() => {
    loadFeatured(0);
  }, []);

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

    const defaultName = language === 'kr' ? '여주' : 'Y/N';
    const finalRightMember = isNafes ? (nafesName || defaultName) : rightMemberInput;
    
    setLoading(true);
    try {
      const initialTitle = `${selectedGenre}물`;

      const initialStory: Story = {
        id: self.crypto.randomUUID(),
        title: initialTitle,
        
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

      const finalTitle = firstEp.storyTitle || initialTitle;
      
      const newStory = { 
        ...initialStory, 
        title: finalTitle, 
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
        alert(language === 'kr' ? "집필 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." : "An error occurred while writing. Please try again later."); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-700 pb-24 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 flex items-center gap-2">
        {session ? (
          <div className="flex items-center gap-2 animate-in fade-in">
             {/* 프로필 이미지 (없으면 아이콘) */}
             {session.user.user_metadata.avatar_url ? (
                <img 
                  src={session.user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className={`w-8 h-8 rounded-full border ${borderClasses}`}
                />
             ) : (
                <div className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center bg-gray-100 dark:bg-zinc-800`}>
                  <User size={14} />
                </div>
             )}
             
             {/* 로그아웃 버튼 (작게) */}
             <button 
                onClick={onLogout}
                className={`p-2 border ${borderClasses} rounded-full ${buttonHoverClasses} shadow-sm`}
                title={language === 'kr' ? "로그아웃" : "Sign out"}
             >
                <LogOut size={14} />
             </button>
          </div>
        ) : (
          /* 로그인 버튼 */
          <button 
            onClick={onLogin}
            className={`px-3 py-2 border ${borderClasses} rounded-full text-[10px] font-bold flex items-center gap-2 ${buttonActiveClasses} shadow-sm hover:opacity-80 transition-all`}
          >
            <LogIn size={12} />
            {language === 'kr' ? 'X 로그인' : 'X Sign in'}
          </button>
        )}
        {/* 2. 언어 변경 버튼 */}
        <button onClick={() => setLanguage(language === 'kr' ? 'en' : 'kr')} className={`px-3 py-2 border ${borderClasses} rounded-full transition-all ${buttonHoverClasses} flex items-center gap-2 shadow-sm`}>
          <Globe size={12} /><span className="text-[10px] font-bold uppercase">{language.toUpperCase()}</span>
        </button>
      </div>

      <header className="text-center pt-8">
        <img src="/slplogo.png" alt="Logo" className="mx-auto w-full max-w-[300px] mb-4" />
        <div className="space-y-1 opacity-70 text-[10px] font-bold uppercase tracking-[0.2em]">
          {language === 'kr' ? (
            <>
                <p>마이너도 크오도 성실하게 글 써드립니다🤓☝️</p>
                <p>원하는 인물과 장르를 입력하면 AI가 이야기를 완성합니다.</p>
            </>
          ) : (
            <>
                <p>We write anything, even rare pairs or crossovers! 🤓☝️</p>
                <p>Enter your characters and genre, and AI will complete the story.</p>
            </>
          )}
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
              maxLength={MAX_NAME_VJ}
              placeholder={language === 'kr' ? "그룹명" : "Group Name"}
              className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
            />
            <input 
              type="text"
              value={leftMemberInput}
              onChange={(e) => setLeftMemberInput(e.target.value)}
              maxLength={MAX_NAME_VJ}
              placeholder={language === 'kr' ? "이름" : "Name"}
              className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
            />
          </div>
        </div>

        {/* 02: 오른쪽 멤버 입력 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>02</span>{language === 'kr' ? '오른쪽 멤버' : 'RIGHT MEMBER'}👉</h2>
            <button onClick={() => setIsNafes(!isNafes)} className={`flex items-center gap-2 px-4 py-2 border ${borderClasses} rounded-full text-[10px] font-bold transition-all ${isNafes ? buttonActiveClasses : buttonHoverClasses}`}>
                🙋‍♀️ {language === 'kr' ? '저요저요' : 'Self-Insert'} {isNafes ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {isNafes ? (
            <div className="animate-in slide-in-from-top-2 space-y-4">
              <div className={`p-6 border border-dashed ${borderClasses} rounded-8 bg-transparent`}>
                <p className="text-xs font-bold mb-3 opacity-60 uppercase tracking-widest">
                    {language === 'kr' 
                        ? "이름 또는 애칭, 글에 녹이고 싶은 특징(나이, 성격, MBTI)들을 적어주세요" 
                        : "Enter name/nickname and traits (Age, Personality, MBTI) you want to include"}
                </p>
                <input 
                  type="text" 
                  value={nafesName}
                  onChange={(e) => setNafesName(e.target.value)}
                  maxLength={MAX_THEME_VJ}
                  placeholder={language === 'kr' ? "예: 여주 (털털함, 25세, ENFP)" : "e.g. Y/N (Cool, 25yo, ENFP)"}
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
                  maxLength={MAX_NAME_VJ}
                  placeholder={language === 'kr' ? "그룹명" : "Group Name"}
                  className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`}
                />
                <input 
                  type="text"
                  value={rightMemberInput}
                  onChange={(e) => setRightMemberInput(e.target.value)}
                  maxLength={MAX_NAME_VJ}
                  placeholder={language === 'kr' ? "이름" : "Name"}
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
                  className={`px-4 py-2 border border-dashed ${borderClasses} rounded-8 flex items-center gap-2 text-xs font-bold ${buttonHoverClasses} transition-all opacity-60 hover:opacity-100`}
                >
                    <Plus size={14} /> {language === 'kr' ? '등장인물 추가' : 'Add Character'}
                </button>
            ) : (
                <div className="flex items-center gap-2 animate-in fade-in">
                    <input 
                        type="text" 
                        value={tempExtraGroup} 
                        onChange={e => setTempExtraGroup(e.target.value)} 
                        placeholder={language === 'kr' ? "그룹" : "Group"} 
                        className={`w-20 p-2 border ${borderClasses} rounded-8 text-xs bg-transparent`}
                    />
                    <input 
                        type="text" 
                        value={tempExtraName} 
                        onChange={e => setTempExtraName(e.target.value)} 
                        placeholder={language === 'kr' ? "이름" : "Name"} 
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
            
            <div className="relative">
            <textarea 
                placeholder={language === 'kr' ? "보고 싶은 상황, 대사, 분위기 등을 자유롭게 적어주세요." : "Describe the situation, dialogue, or mood you want to see."}
                className={`w-full h-32 border ${borderClasses} rounded-8 p-4 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-400`} 
                value={themeInput} 
                onChange={e => setThemeInput(e.target.value)}
                maxLength={MAX_THEME_VJ} 
            />
            <div className="absolute bottom-3 right-3 text-[10px] opacity-40 font-bold">
            {themeInput.length} / {MAX_THEME_VJ}
            </div>
            </div>
            

            {/* 장르 선택 UI */}
            <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                    {/* 선택된 장르 표시 (언어에 맞게 매핑) */}
                    <div className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full ${buttonActiveClasses}`}>
                        #{language === 'kr' ? GENRE_DISPLAY[selectedGenre].kr : GENRE_DISPLAY[selectedGenre].en}
                    </div>

                    {/* 장르 변경 버튼 */}
                    <button 
                        onClick={() => setIsSelectingGenre(!isSelectingGenre)} 
                        className={`px-4 py-2 border border-dashed ${borderClasses} rounded-8 flex items-center gap-2 text-xs font-bold ${buttonHoverClasses} transition-all opacity-60 hover:opacity-100`}
                    >
                        <Plus size={14} /> {language === 'kr' ? '장르 변경' : 'Change Genre'}
                    </button>
                </div>

                {/* 장르 목록 (토글됨) */}
                {isSelectingGenre && (
                  <div className={`w-full grid grid-cols-2 md:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 p-4 border border-dashed ${borderClasses} rounded-8`}>
                    {GENRE_OPTIONS.map(genre => (
                            <button 
                                key={genre}
                                onClick={() => { setSelectedGenre(genre); setIsSelectingGenre(false); }}
                                className={`py-2 text-xs font-bold border ${borderClasses} rounded-8 transition-all ${selectedGenre === genre ? buttonActiveClasses : buttonHoverClasses}`}
                            >
                                {language === 'kr' ? GENRE_DISPLAY[genre].kr : GENRE_DISPLAY[genre].en}
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
      <div className="h-10" />

      {/* Featured Stories (글공유) */}
      <section className={`mt-24 border-t ${borderClasses} pt-12`}>
      <div className="h-5" />
        <div className="flex items-center justify-center gap-2 mb-8 opacity-60">
            <h3 className="text-center text-xs font-black uppercase tracking-[0.3em]">Sloptories</h3>
        </div>
        <div className="h-5" />

        {featuredStories.length > 0 ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredStories.map((story) => (
                    <div 
                      key={story.id} 
                      onClick={() => { setCurrentStory(story); setView(AppState.WRITING); }}
                      className={`border ${borderClasses} rounded-8 p-6 cursor-pointer transition-all relative overflow-hidden group h-[320px] ${
                          theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* 제목 & 장르 */}
                      <div className="mb-4">
                          <span className="text-[10px] font-bold border border-current opacity-40 px-2 py-1 rounded-full mb-2 inline-block">
                          {story.genre}
                          </span>
                          <span className="text-[10px] font-medium opacity-50 flex items-center gap-1 float-right">
                          by. {story.author_name || '익명'}
                          </span>
                          <h4 className="font-bold text-lg leading-tight truncate mb-1">
                            {story.title}
                          </h4>
                          <span className="text-xs opacity-60 block">
                              [{story.leftMember} X {story.rightMember}]
                          </span>
                      </div>

                      {/* 본문 미리보기 */}
                      <div className="text-sm leading-relaxed opacity-80 font-serif relative h-[160px] overflow-hidden">
                        {story.episodes?.[0]?.content}
                        
                        {/* [수정 핵심] 
                          1. Tailwind 'dark:' 대신 theme prop을 직접 확인하여 클래스를 적용합니다. (App View 호환성 해결)
                          2. from-transparent 대신 시작점과 끝점의 색상 코드를 일치시키고 Opacity만 조절합니다. (WebView 검은띠 해결)
                        */}
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{
                              background: theme === 'dark'
                                  ? 'linear-gradient(to bottom, rgba(9,9,11,0) 0%, rgba(9,9,11,1) 100%)' // Zinc-950
                                  : 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)' // White
                          }}
                        />
                      </div>

                      {/* Hover 시 '읽어보기' 표시 */}
                      {/* [수정] 다크모드에서는 흰색 오버레이, 라이트모드에서는 검은색 오버레이를 씌워 가시성 확보 */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px] ${
                          theme === 'dark' ? 'bg-white/10' : 'bg-black/5'
                      }`}>
                          <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm border ${
                              theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-black border-black'
                          }`}>
                              READ NOW
                          </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-12">
                <button 
                    onClick={() => { const nextPage = page + 1; setPage(nextPage); loadFeatured(nextPage); }}
                    className={`px-5 py-3 border border-dashed ${borderClasses} rounded-full text-xs font-bold ${buttonHoverClasses} transition-all opacity-60 hover:opacity-100`}
                >LOAD MORE</button>
                </div>
            </>
        ) : (
            <div className="text-center py-12 opacity-40 text-xs font-bold">
                {language === 'kr' ? '아직 등록된 글이 없습니다.' : 'No sloptories yet.'}
            </div>
        )}
      </section>
    </div>
  );
};
export default SetupView;