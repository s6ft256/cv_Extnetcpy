
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, JobRequirements } from "../types";

export const screenResume = async (
  resumeText: string,
  jobReqs: JobRequirements
): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Act as a senior recruitment lead at TGC Global. 
      Analyze the provided HSE (Health, Safety, and Environment) resume.
      
      CRITICAL VERIFICATION:
      1. NEBOSH: Identify NEBOSH IGC, NGC, or higher.
      2. ADOSH/OSHAD: Identify Abu Dhabi OSH practitioner registrations.
      3. LEVEL 6: Identify NVQ Level 6, OTHM Level 6, or NEBOSH International Diploma (IDip).
      
      NATURE OF EXPERIENCE:
      Check if the candidate has worked in: ${jobReqs.natureOfExperience.join(', ')}.

      Resume Content:
      ${resumeText}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          yearsOfExperience: { type: Type.NUMBER },
          highestDegree: { type: Type.STRING },
          hasNebosh: { type: Type.BOOLEAN },
          hasLevel6: { type: Type.BOOLEAN },
          hasAdosh: { type: Type.BOOLEAN },
          natureOfExperienceFound: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING, description: "A 2-sentence executive summary" },
          recommendation: { type: Type.STRING, description: "One of: 'Highly Recommended', 'Recommended', 'Review Required', 'Not Suitable'" },
          keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 standout qualities" }
        },
        required: ["fullName", "email", "yearsOfExperience", "hasNebosh", "hasLevel6", "hasAdosh", "recommendation"]
      }
    }
  });

  try {
    const text = response.text.trim();
    return JSON.parse(text) as ExtractionResult;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Could not parse resume data. Ensure the document is a valid resume.");
  }
};
