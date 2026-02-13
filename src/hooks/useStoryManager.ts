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

      // 완결된 글 중복 저장 방지 (내용 변경 없으면 리턴)
      if (existingStory && story.isCompleted) {
        const isSameLength = existingStory.episodes.length === story.episodes.length;
        const lastEpExisting = existingStory.episodes[existingStory.episodes.length -