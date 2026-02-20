// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { Story } from "@/types";
import { supabase } from "@/src/supabaseClient";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

const fetchAppConfigs = async () => {
  const { data } = await supabase.from('app_config').select('key, value');
  return data?.reduce((acc: any, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {}) || {};
};

const fetchGenrePrompt = async (genreName: string) => {
  const { data } = await supabase
    .from('genres')
    .select('prompt_extension, writing_style_examples')
    .eq('name', genreName)
    .single();
  return data;
};

export const generateEpisode = async (
  story: Story,
  userInput: string,
  currentEpisodeNum: number,
): Promise<{ content: string; suggestions: string[]; storyTitle?: string; hashtags?: string[]; }> => {
  
  const [configs, genreData] = await Promise.all([
    fetchAppConfigs(),
    fetchGenrePrompt(story.genre)
  ]);

  const isFirstEpisode = currentEpisodeNum === 1;
  const isLastEpisode = currentEpisodeNum === story.totalEpisodes;
  const isMajorEpisode = isFirstEpisode || isLastEpisode || (currentEpisodeNum % 5 === 0);
  const modelName = isMajorEpisode ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";

  // 시스템 인스트럭션 구성
  const systemInstruction = `
    ${configs.system_identity}
    
    [WRITING RULES]
    ${configs.writing_rules_common}
    
    [NARRATIVE GUIDE]
    ${configs.writing_rules_narrative}

    [GENRE SETTING: ${story.genre}]
    Instruction: ${genreData?.prompt_extension || "General Fiction"}
    Style & Mood: ${genreData?.writing_style_examples || "Standard narrative."}

    [STORY SETTINGS (INTERNAL REFERENCE ONLY)]
    - Primary Reference: ${story.leftMember} (Original Persona: ${story.leftGroup})
    - Secondary Reference: ${story.rightMember} ${story.isNafes ? `(User Persona: ${story.nafesName})` : `(Original Persona: ${story.rightGroup})`}
    
    [IMPORTANT] 
    In this "${story.genre}" universe, the "Original Persona" (Group names like ${story.leftGroup}) is ONLY a reference for their personality, tone, and habits. 
    Unless the genre is "Real", they are NOT idols. They are completely integrated into the ${story.genre} setting.
    - Theme/Prompt (Ssul): "${story.theme}"
    - Current Progress: ${currentEpisodeNum} / ${story.totalEpisodes}
    - Language: ${story.language === 'en' ? 'English' : 'Korean'}
    
    ${isFirstEpisode ? `\n${configs.writing_rules_firstEP}` : ""}
    ${isLastEpisode ? `\n${configs.writing_rules_lastEP}` : ""}

    [RESPONSE FORMAT]
    ${configs.response_format}
  `;

  // 이전 컨텍스트 1000자 유지
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
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192, // 최대 출력 토큰 유지
        temperature: 0.8,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            storyTitle: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["content", "suggestions"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini DB-Driven Service Error:", error);
    throw new Error("Failed to generate content.");
  }
};