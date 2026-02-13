// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { Story } from "@/types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

/**
 * 장르별 특수 프롬프트 정의
 */
const GENRE_PROMPTS: Record<string, string> = {
  '일상': "Focus on realistic, slice-of-life details, cafes, practice rooms, and subtle emotional shifts. Create a cozy and natural atmosphere.",
  '리얼물': "Based on the actual idol industry reality. Incorporate schedules, dorm life, waiting rooms, and stage behind-the-scenes dynamics.",
  '캠퍼스': "University setting. Focus on majors, sunbae-hubae dynamics, campus festivals, library encounters, and drinking parties.",
  '오피스': "Company hierarchy setting. Focus on meeting rooms, overtime work, business trips, and secret office romance tension.",
  '오메가버스': "Apply Omegaverse rules (Alpha/Beta/Omega, Pheromones, Heat/Rut cycles). Focus on instinct vs. reason and biological tension.",
  '센티넬버스': "Sentinel/Guide universe. Focus on Guiding, bonding, sensory overload, and the urgency of battles or missions.",
  'TS': "TS (Genderbend AU). An alternate universe where the character is born as the opposite gender. No physical transformation. Focus on the natural tension, distinctive social dynamics, and the reimagined relationship chemistry driven by this gender swap.",
  '수인': "Characters have animal traits (ears, tail) or transformation abilities. Focus on animalistic instincts and behaviors.",
  '아포칼립스': "Zombie or disaster survival setting. Focus on scarcity, trust issues, danger, and survival romance in a ruined world."
};

export const generateEpisode = async (
  story: Story,
  userInput: string,
  currentEpisodeNum: number
): Promise<{ content: string; suggestions: string[]; storyTitle?: string; hashtags?: string[]; }> => {
  const isFirstEpisode = currentEpisodeNum === 1;
  const isLastEpisode = currentEpisodeNum === story.totalEpisodes;
  const isMajorEpisode = isFirstEpisode || isLastEpisode || (currentEpisodeNum % 5 === 0);

  const safeUserInput = `<user_action>${userInput}</user_action>`;

  const modelName = isMajorEpisode ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";

  let narrativeStageInstruction = "";
  const progress = currentEpisodeNum / story.totalEpisodes;

  if (isFirstEpisode) {
    narrativeStageInstruction = "Stage: [Introduction]. Establish the setting, characters, and the initial incident. Hook the reader immediately.";
  } else if (isLastEpisode) {
    narrativeStageInstruction = "Stage: [Conclusion/Resolution]. Bring all conflicts to a close. Provide a satisfying emotional payoff or a lingering ending.";
  } else if (progress < 0.4) {
    narrativeStageInstruction = "Stage: [Rising Action]. Develop the relationships and introduce minor conflicts or events that build tension.";
  } else if (progress < 0.8) {
    narrativeStageInstruction = "Stage: [Crisis]. Deepen the conflict. The characters should face emotional or external hurdles.";
  } else {
    // 80% 이상 ~ 마지막 전
    narrativeStageInstruction = "Stage: [Climax/Cliffhanger]. The tension reaches its peak. Prepare for the final resolution. End with a strong emotional beat or cliffhanger.";
  }

  const baseGuidelines = `
    You are Sloppicker, a top-tier K-pop fanfiction writer renowned for deep emotional insight and vivid sensory descriptions.
    
    [WRITING RULES]
   1. EXTENSIVE LENGTH: 500-1000 Korean characters. Ensure the narrative is immersive and detailed.
   2. SHOW, DON'T TELL: Do not describe personalities directly. Show them through actions, hesitation, and small habits.
   3. NO EXTERNAL DB: Rely solely on the provided names and group names to simulate their persona based on your own knowledge of K-pop idols. If the person is unknown, infer a persona based on the genre context.
   4. GENRE FAITHFULNESS: Strictly adhere to the rules of the selected genre.
   5. NEXT STEPS: Provide exactly 3 diverse plot suggestions for the next chapter.
   6. NATURAL DIALOGUE: Use Korean nuances perfectly. Do not overuse titles/honorifics if they are close.
   7. FORMATTING: Use double newline characters (\\n\\n) for paragraph breaks. No HTML.
   8. NARRATIVE STRUCTURE: Follow the requested '${narrativeStageInstruction}' strictly.
   9. [CRITICAL] NO REPETITION: Do NOT summarize, repeat, or rephrase the events from the 'Previous Story Context'. Start the new narrative IMMEDIATELY after the last sentence of the previous context. 

    [TONE & STYLE - CRITICAL]
   - NARRATION: You MUST use Korean Plain Form (Haera-che, ~ㄴ다, ~다) for all narration and descriptions. NEVER use polite forms (~니다, ~요) in the narrative text.
   - DIALOGUE: Characters should speak naturally based on their relationship (honorifics or casual speech).
  `;

  // 장르 및 캐릭터 컨텍스트 생성 로직 변경
  const selectedGenreInstruction = GENRE_PROMPTS[story.genre] || "General Fiction";
  
  const rightCharacterDesc = story.isNafes 
    ? `'${story.rightMember}' (The Protagonist/User, often referred to as 'You' or 'Yeoju').`
    : `'${story.rightMember}' (Idol from ${story.rightGroup}).`;

  const extraMembersContext = story.extraMembers.length > 0
    ? `Supporting Characters: ${story.extraMembers.map(e => `${e.name} (${e.groupName})`).join(', ')}`
    : "No major supporting characters yet.";

  const systemInstruction = `
    ${baseGuidelines}

    [STORY SETTINGS]
    - Genre: ${story.genre} (${selectedGenreInstruction})
    - Main Characters: 
      1. ${story.leftMember} (Group: ${story.leftGroup})
      2. ${rightCharacterDesc}
    - ${extraMembersContext}
    - Theme/Prompt (Ssul): "${story.theme}"
    - Current Episode: ${currentEpisodeNum} / ${story.totalEpisodes}
    - Language: ${story.language === 'en' ? 'English' : 'Korean'}
    - ${narrativeStageInstruction}

    ${isFirstEpisode ? "\n[SPECIAL TASK] Generate a poetic and captivating title for this story based on the theme in the JSON response." : ""}
    ${isLastEpisode ? "\n[SPECIAL TASK] Generate 3 hashtags (#Keyword) that summarize this entire story's mood and theme." : ""}
    `;

  const previousContext = story.episodes
    .map((ep) => `[Chapter ${ep.episodeNumber}]\n${ep.content.substring(Math.max(0, ep.content.length - 1000))}`)
    .join("\n\n");

  const prompt = isFirstEpisode
    ? `Write the First Episode based on the theme: "${userInput}".`
    : `Previous Story Context:
      ${previousContext}
      
      User's Choice/Action for this turn: "${userInput}". 
      Write the ${currentEpisodeNum}th episode following the genre '${story.genre}'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", //gemini-flash-latest
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.8, // 창의성
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            storyTitle: { type: Type.STRING }
          },
          required: ["content", "suggestions"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw new Error("Failed to generate content.");
  }
};