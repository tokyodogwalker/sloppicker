import { useState, useEffect } from 'react';
import { Story } from '../../types';

export const useStoryManager = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('spk_stories');
    if (saved) setStories(JSON.parse(saved));
  }, []);

  const saveStories = (updated: Story[]) => {
    setStories(updated);
    localStorage.setItem('spk_stories', JSON.stringify(updated));
  };

  const saveToLibrary = (story: Story, language: 'kr' | 'en' = 'kr') => {
    const currentStories = JSON.parse(localStorage.getItem('pikfic_stories') || '[]');
    const existingIdx = currentStories.findIndex((s: Story) => s.id === story.id);
    const updated = existingIdx >= 0 
      ? currentStories.map((s: Story, i: number) => i === existingIdx ? story : s)
      : [story, ...currentStories];
    saveStories(updated);
    
    // 언어에 따른 메시지 출력
    const message = language === 'kr' ? "서재에 안전하게 저장되었습니다." : "Saved safely to library.";
    alert(message);
  };

  // 언어(language) 인자를 받아 팝업 메시지 다국어 처리
  const deleteFromLibrary = (id: string, language: 'kr' | 'en' = 'kr') => {
    const message = language === 'kr' ? "이 기록을 삭제하시겠습니까?" : "Are you sure you want to delete this story?";
    if (confirm(message)) {
      saveStories(stories.filter(s => s.id !== id));
    }
  };

  return { stories, currentStory, setCurrentStory, loading, setLoading, saveToLibrary, deleteFromLibrary };
};