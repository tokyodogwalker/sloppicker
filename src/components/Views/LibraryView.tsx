import React from 'react';
import { Story, AppState } from '../../../types';
import { Trash2, Share2, LogIn, LogOut } from 'lucide-react'; 

interface Props {
  stories: Story[];
  language: 'kr' | 'en';
  setCurrentStory: (s: Story) => void;
  setView: (v: AppState) => void;
  deleteFromLibrary: (id: string) => void;
  shareStory: (story: Story) => void;
  theme: string;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
  session: any;
  onLogin: () => void;
  onLogout: () => void;
}

const LibraryView: React.FC<Props> = ({ stories, setCurrentStory, setView, shareStory, deleteFromLibrary, theme, borderClasses, buttonActiveClasses, buttonHoverClasses, language, session, onLogin, onLogout }) => {
  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in pb-24`}>
      <div className={`flex items-center justify-between border-b ${borderClasses} pb-8`}>
        <h1 className="text-4xl font-black font-bold uppercase">Library</h1>
        {session ? (
            <button 
              onClick={onLogout}
              className={`px-3 py-2 border ${borderClasses} rounded-full text-[10px] font-bold flex items-center gap-2 ${buttonHoverClasses} shadow-sm transition-all`}
            >
              <LogOut size={12} />
              {language === 'kr' ? '로그아웃' : 'Sign out'}
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className={`px-3 py-2 border ${borderClasses} rounded-full text-[10px] font-bold flex items-center gap-2 ${buttonActiveClasses} shadow-sm hover:opacity-80 transition-all`}
            >
              <LogIn size={12} />
              {language === 'kr' ? 'X 로그인' : 'X Sign in'}
            </button>
          )}
        <button onClick={() => setView(AppState.SETUP)} className={`flex items-center gap-1 border ${borderClasses} px-4 py-2 rounded-8 text-[10px] font-black uppercase transition-all ${buttonHoverClasses}`}>new</button>
      </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
          {language === 'kr' 
            ? `내 서재: ${stories.length} / 10 | 최대 10개까지 저장 가능합니다. 소중한 글을 위해 공간을 관리해 주세요.` 
            : `My Library: ${stories.length} / 10 | Max 10 stories. Please manage your archives carefully.`}
        </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.length === 0 ? (
          <div className="col-span-full text-center py-32 border border-dashed border-gray-300 dark:border-zinc-700 rounded-8"><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No archives found</p></div>
        ) : (
          stories.map(story => (
            <div key={story.id} className={`border ${borderClasses} rounded-8 p-6 transition-all flex flex-col justify-between ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-white'}`}>
              <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-black uppercase tracking-tight truncate w-full">{story.title}</h3>
                    {story.isCompleted ? (
                        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-100 whitespace-nowrap ml-2">FIN</span>
                    ) : (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap ml-2">
                            {story.episodes.length} / {story.totalEpisodes}
                        </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">{story.leftMember} x {story.rightMember}</p>
              </div>
              
              <div className="flex gap-2">
                  <button onClick={() => { setCurrentStory(story); setView(AppState.WRITING); }} className={`flex-1 ${buttonActiveClasses} py-3 rounded-[6px] text-[10px] font-black uppercase transition-all hover:opacity-80`}>Read Archive</button>
              
                  {/* [수정] 공유 버튼에 아이콘 추가 */}
                  {story.isCompleted && (
                    <button onClick={() => shareStory(story)} className={`p-3 border ${borderClasses} rounded-[6px] text-gray-400 hover:text-blue-500 transition-all`} title="Share to Sloptories">
                        <Share2 size={16} />
                    </button>
                  )}

                  <button onClick={() => deleteFromLibrary(story.id)} className={`p-3 border ${borderClasses} rounded-[6px] text-gray-400 hover:text-red-500 transition-all`}><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default LibraryView;