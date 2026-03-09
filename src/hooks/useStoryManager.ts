import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Story } from '../../types';

export const useStoryManager = (userId?: string, lang: 'kr' | 'en' = 'kr') => {
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

  // [추가 기능] 로컬 데이터를 DB로 동기화 (마이그레이션)
  const syncLocalStories = async (newUserId: string, lang: 'kr' | 'en' = 'kr') => {
    const localSaved = localStorage.getItem('spk_stories');
    if (!localSaved) return;

    const localStories: Story[] = JSON.parse(localSaved);
    if (localStories.length === 0) return;

    try {
      // 1. 현재 DB에 있는 내 글 개수 먼저 확인하기
      const { count, error: countError } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', newUserId);

      if (countError) throw countError;

      const currentDbCount = count || 0;
      const availableSlots = 10 - currentDbCount;

      // 2. 남은 자리가 아예 없으면 동기화 중단
      if (availableSlots <= 0) {
        alert(lang === 'kr' 
          ? "내 서재가 가득 차서(최대 10개) 로그인 전 작성하신 글을 가져올 수 없습니다. 서재를 비운 뒤 새로고침 해주세요."
          : "Your Library is full (Max 10). Cannot sync local stories. Please free up space and refresh.");
        return; 
      }

      // 3. 빈자리 개수만큼만 로컬 글 잘라내기
      const storiesToSync = localStories.slice(0, availableSlots);
      if (localStories.length > availableSlots) {
        alert(lang === 'kr' 
          ? `서재 공간이 부족하여 로컬에 있던 ${localStories.length}개 중 ${availableSlots}개만 동기화됩니다.`
          : `Library space is limited. Syncing ${availableSlots} out of ${localStories.length} local stories.`);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let hasError = false;

      // 4. 잘라낸 글들만 DB로 전송
      const syncPromises = storiesToSync.map(async (story) => {
        const dbPayload: any = {
          user_id: newUserId,
          author_name: story.author_name || '익명',
          is_shared: story.is_shared || false,
          is_featured: story.is_featured || false,
          isCompleted: story.isCompleted || false,
          totalEpisodes: story.totalEpisodes || 0,
          groupName: story.groupName || null,
          title: story.title || (lang === 'kr' ? "제목 없음" : "Untitled"),
          episodes: story.episodes || [],
          hashtags: story.hashtags || [],
          language: story.language || lang,
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

        if (story.id && uuidRegex.test(story.id)) {
          dbPayload.id = story.id;
        }

        const { error } = await supabase.from('stories').upsert([dbPayload], { onConflict: 'id' });
        
        if (error) {
          console.error(`"${story.title}" 동기화 실패:`, error);
          hasError = true;
        }
      });

      await Promise.all(syncPromises);
      
      // 5. 뒷정리
      if (!hasError) {
        if (localStories.length > availableSlots) {
           const remainingStories = localStories.slice(availableSlots);
           localStorage.setItem('spk_stories', JSON.stringify(remainingStories));
        } else {
           localStorage.removeItem('spk_stories');
           alert(lang === 'kr' 
             ? "로그인 전 작성하신 글들이 내 서재로 안전하게 이동되었습니다."
             : "Your local stories have been safely moved to your Library.");
        }
      } else {
        alert(lang === 'kr' 
          ? "일부 글을 동기화하는 중에 오류가 발생했습니다."
          : "An error occurred while syncing some stories.");
      }
      
    } catch (error) {
      console.error("Sync Local Stories Error:", error);
    }
  };

  // userId 변경 감지 시 실행 (로그인 직후 호출됨)
  useEffect(() => {
    if (userId) {
      // 로그인이 된 경우: 기존 로컬 데이터를 먼저 동기화한 뒤 목록을 불러옴
      syncLocalStories(userId, lang).then(() => {
        fetchStories();
      });
    } else {
      // 비로그인 상태일 때는 즉시 로컬 목록 불러오기
      fetchStories();
    }
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
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUuid = story.id && uuidRegex.test(story.id);

      const dbPayload: any = {
        user_id: userId,
        author_name: story.author_name || '익명',
        is_shared: false,
        is_featured: false,
        isCompleted: story.isCompleted || false,
        totalEpisodes: story.totalEpisodes || 0,
        groupName: story.groupName || null,
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

      if (isValidUuid) {
        dbPayload.id = story.id;
      }

      const { error } = await supabase
        .from('stories')
        .upsert([dbPayload], { onConflict: 'id' });

      if (error) throw error;

      alert(lang === 'kr' ? "서재에 저장되었습니다." : "Saved.");
      fetchStories();

    } catch (error: any) {
      console.error("Save Error Details:", error);
      alert(lang === 'kr' ? `저장 실패: ${error.message}` : `Save Error: ${error.message}`);
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