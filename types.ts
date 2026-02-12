// types.ts

/**
 * 장르 타입 정의 추가
 * 사용자가 선택할 수 있는 10가지 장르
 */
export type Genre = '일상' | '리얼' | '캠퍼스' | '오피스' | '아포칼립스' | '센티넬버스' | '오메가버스' | '수인' | 'TS';

/**
 * 등장인물(엑스트라) 타입 정의
 */
export interface ExtraCharacter {
  groupName: string;
  name: string;
}

export interface Episode {
  episodeNumber: number;
  content: string;
  suggestions: string[];
  userChoice?: string;
}

/**
 * Story 인터페이스 업데이트
 * - DB ID 기반 참조 제거 -> 직접 입력한 문자열(leftGroup, leftMember 등) 사용
 * - genre 필드 추가
 */
export interface Story {
  id: string;
  title: string;
  
  // 주요 설정
  genre: Genre;           // 장르
  theme: string;          // 주제/소재 (프롬프트)
  
  // 왼쪽 멤버 (주인공 1)
  leftGroup: string;      // 왼쪽 멤버 그룹명
  leftMember: string;     // 왼쪽 멤버 이름
  
  // 오른쪽 멤버 (주인공 2)
  rightGroup?: string;    // 오른쪽 멤버 그룹명 (나페스 아닐 경우)
  rightMember: string;    // 오른쪽 멤버 이름 (나페스일 경우 사용자 이름)
  
  // 나페스 여부
  isNafes?: boolean;
  nafesName?: string;
  
  // 엑스트라
  extraMembers: ExtraCharacter[]; // 엑스트라 목록

  // 메타 데이터
  groupName: string;      // 표시용 통합 그룹명
  totalEpisodes: number;
  episodes: Episode[];
  isCompleted: boolean;
  createdAt: number;
  language?: 'kr' | 'en'; 
}

export enum AppState {
  SETUP = 'SETUP',
  WRITING = 'WRITING',
  LIBRARY = 'LIBRARY'
}

export type Theme = 'light' | 'dark';