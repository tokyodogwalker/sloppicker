import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import { useAppConfig } from './src/hooks/useAppConfig';
import { useStoryManager } from './src/hooks/useStoryManager';
import SetupView from './src/components/Views/SetupView';
import WritingView from './src/components/Views/WritingView';
import LibraryView from './src/components/Views/LibraryView';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { supabase } from './src/supabaseClient';

const App: React.FC = () => {
  const { theme, setTheme, language, setLanguage } = useAppConfig();
  
  // [추가] 유저 세션(로그인 상태) 관리
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 세션 변경 감지 (로그인/로그아웃)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // [수정] 로그인 시 userId를 useStoryManager에 전달 (내 서재 연동)
  const { stories, currentStory, setCurrentStory, loading, setLoading, saveToLibrary, deleteFromLibrary } = useStoryManager(session?.user?.id);
  
  const [view, setView] = useState<AppState>(AppState.SETUP);

  const borderClasses = theme === 'dark' ? 'border-zinc-800' : 'border-black';
  const buttonActiveClasses = theme === 'dark' ? 'bg-zinc-100 text-zinc-950' : 'bg-black text-white';
  const buttonHoverClasses = theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-gray-100';

  // [추가] 로그인 핸들러
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
    });
    if (error) alert(error.message);
  };

  // [추가] 로그아웃 핸들러
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // alert(language === 'kr' ? "로그아웃 되었습니다." : "Logged out.");
  };

  return (
    <div className={`min-h-screen overflow-y-scroll relative flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-black'}`} style={{ scrollbarGutter: 'stable' }}>
      <main className="flex-1">
        {view === AppState.SETUP && (
            <SetupView 
                language={language} 
                setLanguage={setLanguage} 
                theme={theme} 
                setLoading={setLoading} 
                loading={loading} 
                setCurrentStory={setCurrentStory} 
                setView={setView} 
                borderClasses={borderClasses} 
                buttonActiveClasses={buttonActiveClasses} 
                buttonHoverClasses={buttonHoverClasses}
                // [추가] SetupView에 로그인 기능 전달
                session={session}
                onLogin={handleLogin}
                onLogout={handleLogout}
            />
        )}
        {view === AppState.WRITING && currentStory && (
            <WritingView 
                currentStory={currentStory} 
                setCurrentStory={setCurrentStory} 
                loading={loading} 
                setLoading={setLoading} 
                saveToLibrary={saveToLibrary} 
                theme={theme} 
                setView={setView} 
                borderClasses={borderClasses} 
                buttonActiveClasses={buttonActiveClasses} 
                buttonHoverClasses={buttonHoverClasses} 
                language={language} 
            />
        )}
        {view === AppState.LIBRARY && (
            <LibraryView 
                stories={stories} 
                setCurrentStory={setCurrentStory} 
                setView={setView} 
                deleteFromLibrary={deleteFromLibrary} 
                theme={theme} 
                borderClasses={borderClasses} 
                buttonActiveClasses={buttonActiveClasses} 
                buttonHoverClasses={buttonHoverClasses} 
            />
        )}
      </main>

      <footer className={`py-12 pb-40 border-t border-solid ${borderClasses} text-center opacity-50`}>
        <div className="space-y-1 text-[9px] font-medium max-w-2xl mx-auto px-6">
            <p>{language === 'kr' ? '본 서비스는 AI를 활용한 픽션 창작 도구이며, 생성된 내용은 실존 인물 및 단체와 무관합니다.' : 'This service is an AI-powered fiction tool. Generated content is unrelated to real persons or organizations.'}</p>
            <p>{language === 'kr' ? '생성된 콘텐츠의 공유 및 배포로 인해 발생하는 모든 법적 책임은 사용자 본인에게 있습니다.' : 'Users are solely responsible for any legal consequences arising from sharing generated content.'}</p>
        </div>
      </footer>

      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-8 py-3 rounded-full flex items-center gap-12 z-[100] shadow-xl`}>
        <button onClick={() => setView(AppState.SETUP)} className={`flex flex-col items-center ${view === AppState.SETUP ? 'opacity-100 font-black' : 'opacity-30'}`}><span className="text-[10px] uppercase tracking-[0.2em]">Home</span></button>
        <button onClick={() => setView(AppState.LIBRARY)} className={`flex flex-col items-center ${view === AppState.LIBRARY ? 'opacity-100 font-black' : 'opacity-30'}`}><span className="text-[10px] uppercase tracking-[0.2em]">Library</span></button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex flex-col items-center opacity-30"><span className="text-[10px] uppercase tracking-[0.2em]">{theme === 'light' ? 'Dark' : 'Light'}</span></button>
      </nav>

      {view === AppState.WRITING ? (
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg`}><ArrowUp size={20} /></button>
      ) : (
        <a href="https://spin-spin.com/jonnagal" target="_blank" rel="noopener noreferrer" className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg`}><MessageSquare size={17} /></a>
      )}
    </div>
  );
};

export default App;