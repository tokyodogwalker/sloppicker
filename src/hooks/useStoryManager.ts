import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Story } from '../../types';

export const useStoryManager = (userId?: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  // [추가] App.tsx에서 필요한 state 복구
  const [currentStory, setCurrentStory] = useState<Story | null>(null);

  // 1. 스토리 불러오기
  const fetchStories = async () => {
    // 로딩 상태는 외부 제어가 가능하도록 두되, fetch 시에는 내부적으로 관리하지 않음 (App.tsx의 loading 사용 권장)
    // 필요하다면 여기서 setLoading(true) 사용 가능
    
    if (userId) {
      // [로그인] Supabase
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setStories(data as any);
      } else if (error) {
        console.error("Supabase load error:", error);
      }
    } else {
      // [비로그인] LocalStorage
      const saved = localStorage.getItem('spk_stories');
      if (saved) {
        setStories(JSON.parse(saved));
      } else {
        setStories([]);
      }
    }
  };

  useEffect(() => {
    fetchStories();
  }, [userId]);

  // 2. 저장하기
  const saveToLibrary = async (story: Story, lang: 'kr' | 'en' = 'kr') => {
    if (userId) {
      const isNew = !stories.some(s => s.id === story.id);
      if (isNew && stories.length >= 10) {
        alert(lang === 'kr' ? "서재가 가득 찼습니다! (최대 10개)" : "Library is full! (Max 10)");
        return;
      }

      const { id, ...storyData } = story; 
      const { error } = await supabase.from('stories').upsert([
        { 
          ...storyData, 
          user_id: userId, 
          is_shared: false, 
          is_featured: false 
        }
      ], { onConflict: 'id' });

      if (error) {
        console.error(error);
        alert(lang === 'kr' ? "저장 중 오류가 발생했습니다." : "Error saving story.");
      } else {
        alert(lang === 'kr' ? "서재에 안전하게 저장되었습니다." : "Saved to cloud library.");
        fetchStories();
      }

    } else {
      // 비로그인 - LocalStorage
      const currentStories = JSON.parse(localStorage.getItem('spk_stories') || '[]');
      const existingIdx = currentStories.findIndex((s: Story) => s.id === story.id);
      
      const updated = existingIdx >= 0 
        ? currentStories.map((s: Story, i: number) => i === existingIdx ? story : s)
        : [story, ...currentStories];
      
      localStorage.setItem('spk_stories', JSON.stringify(updated));
      setStories(updated);
      alert(lang === 'kr' ? "내 브라우저에 저장되었습니다. 비로그인시에는 일회성으로 저장됩니다." : "Saved to local browser.");
    }
  };

  // 3. 삭제하기 (App.tsx에서는 deleteFromLibrary라는 이름으로 사용 중)
  const deleteFromLibrary = async (storyId: string, lang: 'kr' | 'en' = 'kr') => {
    if (!confirm(lang === 'kr' ? "정말 삭제하시겠습니까?" : "Are you sure?")) return;

    if (userId) {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) {
        console.error(error);
        alert("삭제 실패");
      } else {
        fetchStories();
      }
    } else {
      const updated = stories.filter(s => s.id !== storyId);
      localStorage.setItem('spk_stories', JSON.stringify(updated));
      setStories(updated);
    }
  };

  // 4. 공유하기
  const shareStory = async (story: Story, lang: 'kr' | 'en' = 'kr') => {
    if (!userId) {
      alert(lang === 'kr' ? "공유 기능은 로그인 후 사용할 수 있습니다." : "Please login to share.");
      return;
    }

    if (!story.isCompleted) {
        alert(lang === 'kr' ? "완결된 이야기만 공유할 수 있습니다." : "Only completed stories can be shared.");
        return;
    }

    if (!confirm(lang === 'kr' ? "운영자에게 제출하시겠습니까? (검토 후 메인에 공개됩니다)" : "Submit to admin?")) return;
    
    // 닉네임 사용 여부 확인
    let finalName = '익명';
    const { data: { user } } = await supabase.auth.getUser();
    const nickname = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';

    const useNickname = confirm(
        lang === 'kr' 
        ? `닉네임 [${nickname}]으로 공유하시겠습니까?\n\n[확인] : 닉네임 공개\n[취소] : 익명으로 공유`
        : `Share as [${nickname}]?\n\n[OK] : Show Nickname\n[Cancel] : Share Anonymously`
    );

    if (useNickname) finalName = nickname;

    const { error } = await supabase
      .from('stories')
      .update({ is_shared: true, author_name: finalName })
      .eq('id', story);

    if (!error) {
      alert(lang === 'kr' ? "제출되었습니다!" : "Submitted successfully!");
      fetchStories();

    } else {
      console.error(error);
      alert("공유 실패");
    }
  };
  
  return { 
    stories, 
    loading, 
    setLoading, 
    currentStory, 
    setCurrentStory, 
    saveToLibrary, 
    deleteFromLibrary, 
    shareStory 
  };
};