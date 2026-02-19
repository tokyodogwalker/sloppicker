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
        // DB에서 가져온 데이터(isCompleted 등)가 이미 CamelCase이므로 별도 변환 없이 사용 가능
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

  // 2. 저장하기 (컬럼명 이슈 완벽 수정)
  const saveToLibrary = async (story: Story, lang: 'kr' | 'en' = 'kr') => {
    // [비로그인] 로컬 스토리지 저장
    if (!userId) {
      const currentStories = JSON.parse(localStorage.getItem('spk_stories') || '[]');
      const existingIdx = currentStories.findIndex((s: Story) => s.id === story.id);
      
      const updated = existingIdx >= 0 
        ? currentStories.map((s: Story, i: number) => i === existingIdx ? story : s)
        : [story, ...currentStories];
      
      localStorage.setItem('spk_stories', JSON.stringify(updated));
      setStories(updated);
      alert(lang === 'kr' ? "내 브라우저에 저장되었습니다. 비로그인시에는 일회성으로 저장됩니다." : "Saved to local browser.");
      return;
    }

    // [로그인] Supabase 저장 로직
    try {
      // 2-1. 중복 및 개수 제한 체크
      const existingStory = stories.find(s => s.id === story.id);

      // 신규 글 개수 제한 (10개)
      if (!existingStory && stories.length >= 10) {
        alert(lang === 'kr' ? "서재가 가득 찼습니다! (최대 10개)" : "Library is full! (Max 10)");
        return;
      }

      if (existingStory && story.isCompleted) {
        const isSameLength = existingStory.episodes.length === story.episodes.length;
        const lastEpExisting = existingStory.episodes[existingStory.episodes.length - 1]?.content;
        const lastEpCurrent = story.episodes[story.episodes.length - 1]?.content;
        const tagsExisting = JSON.stringify(existingStory.hashtags || []);
        const tagsCurrent = JSON.stringify(story.hashtags || []);

        if (isSameLength && lastEpExisting === lastEpCurrent && tagsExisting === tagsCurrent) {
          alert(lang === 'kr' ? "이미 최신 상태로 저장되어 있습니다." : "Already up to date.");
          return;
        }
      }

      // 2-2. Payload 생성
      // UUID 유효성 검사 (임시 ID 제외)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUuid = story.id && uuidRegex.test(story.id);

      // [핵심] DB 컬럼 구조에 맞게 매핑 (updated_at 삭제됨)
      const dbPayload: any = {
        // 1. Snake Case 컬럼
        user_id: userId,
        author_name: story.author_name || '익명',
        is_shared: false,
        is_featured: false,
        
        // 2. Camel Case 컬럼
        isCompleted: story.isCompleted || false,
        totalEpisodes: story.episodes?.length || 0,
        groupName: story.groupName || null,
        
        // 3. 일반 컬럼
        title: story.title || (lang === 'kr' ? "제목 없음" : "Untitled"),
        episodes: story.episodes || [],
        hashtags: story.hashtags || [],
        language: lang,
        
        genre: story.genre,
        theme: story.theme,
        leftGroup: story.leftGroup,
        leftMember: story.leftMember,
        rightGroup: story.rightGroup,
        rightMember: story.rightMember,
        isNafes: story.isNafes,
        nafesName: story.nafesName,
        extraMembers: story.extraMembers || [],
      };

      // ID가 유효한 UUID일 때만 포함 (없으면 Supabase가 새 ID 생성)
      if (isValidUuid) {
        dbPayload.id = story.id;
      }

      // 2-3. Upsert 실행
      const { error } = await supabase
        .from('stories')
        .upsert([dbPayload], { onConflict: 'id' });

      if (error) throw error;

      alert(lang === 'kr' ? "서재에 저장되었습니다." : "Saved.");
      fetchStories(); // 목록 갱신

    } catch (error: any) {
      console.error("Save Error Details:", error);
      alert(lang === 'kr' 
        ? `저장 실패: ${error.message}` 
        : `Save Error: ${error.message}`
      );
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

    if (!confirm(lang === 'kr' ? "메인에 공유하시겠습니까? (검토 후 메인에 공개됩니다)" : "Submit to admin?")) return;
    
    let finalName = '익명';
    const { data: { user } } = await supabase.auth.getUser();
    const nickname = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';

    const useNickname = confirm(
        lang === 'kr' 
        ? `닉네임 [${nickname}]으로 공유하시겠습니까?\n\n[확인] : 닉네임 공개\n[취소] : 익명으로 공유`
        : `Share as [${nickname}]?\n\n[OK] : Show Nickname\n[Cancel] : Share Anonymously`
    );

    if (useNickname) finalName = nickname;

    // 업데이트: CSV 기준 snake_case 컬럼 사용
    const { error } = await supabase
      .from('stories')
      .update({ 
        is_shared: true, 
        author_name: finalName 
      })
      .eq('id', story.id); 

    if (!error) {
      alert(lang === 'kr' ? "제출되었습니다!" : "Submitted successfully!");
      fetchStories();
    } else {
      console.error("Share Error:", error);
      alert(lang === 'kr' ? "공유 실패: 잠시 후 다시 시도해주세요." : "Failed to share.");
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
    shareStory, 
  };
};