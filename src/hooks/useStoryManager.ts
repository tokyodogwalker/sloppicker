import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Story } from '../../types';

export const useStoryManager = (userId?: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);

  // 1. 스토리 불러오기
  const fetchStories = async () => {
    if (userId) {
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
      // 이미 존재하는 ID인지 확인 (클라이언트 상태 기준)
      const existingStory = stories.find(s => s.id === story.id);
      
      // 새 글인 경우에만 개수 제한 체크
      if (!existingStory && stories.length >= 10) {
        alert(lang === 'kr' ? "서재가 가득 찼습니다! (최대 10개)" : "Library is full! (Max 10)");
        return;
      }

      // [수정] Upsert 시 id가 일치하면 무조건 업데이트됩니다.
      const { error } = await supabase.from('stories').upsert([
        { 
          ...story,
          user_id: userId,
          // 기존 필드들 업데이트
        }
      ], { onConflict: 'id' });

      if (error) {
        console.error("Save Error:", error);
        alert(lang === 'kr' ? "저장 중 오류가 발생했습니다." : "Error saving story.");
      } else {
        // alert(lang === 'kr' ? "저장되었습니다." : "Saved.");
        fetchStories(); // 목록 갱신
      }

    } else {
      // LocalStorage 저장
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

  // 3. 삭제하기
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

    // 공유 전 자동 저장
    await saveToLibrary(story, lang);

    if (!confirm(lang === 'kr' ? "운영자에게 제출하시겠습니까? (검토 후 메인에 공개됩니다)" : "Submit to admin?")) return;
    
    let finalName = '익명';
    const { data: { user } } = await supabase.auth.getUser();
    const nickname = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';

    const useNickname = confirm(
        lang === 'kr' 
        ? `닉네임 [${nickname}]으로 공유하시겠습니까?\n\n[확인] : 닉네임 공개\n[취소] : 익명으로 공유`
        : `Share as [${nickname}]?\n\n[OK] : Show Nickname\n[Cancel] : Share Anonymously`
    );

    if (useNickname) finalName = nickname;

    // [수정] story 객체가 아니라 story.id를 전달해야 함
    const { error } = await supabase
      .from('stories')
      .update({ is_shared: true, author_name: finalName })
      .eq('id', story.id); 

    if (!error) {
      alert(lang === 'kr' ? "제출되었습니다!" : "Submitted successfully!");
      fetchStories();
    } else {
      console.error("Share Error:", error);
      alert("공유 실패: 잠시 후 다시 시도해주세요.");
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