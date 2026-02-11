
export interface JobRequirements {
  minExperience: number;
  requiredSkills: string[];
  certifications: {
    nebosh: boolean;
    level6: boolean;
    adosh: boolean;
  };
  natureOfExperience: string[];
}

export type HSEDesignation = 'HSE/Safety Manager' | 'HSE/Safety Engineer' | 'HSE/Safety Officer' | 'HSE/Safety Inspector' | 'Not Qualified';

export interface ExtractionResult {
  fullName: string;
  email: string;
  phone: string;
  technicalSkills: string[];
  yearsOfExperience: number;
  highestDegree: string;
  hasNebosh: boolean;
  hasLevel6: boolean; // Includes NVQ level 6, OTHM, NEBOSH Diploma
  hasAdosh: boolean;
  natureOfExperienceFound: string[];
  summary: string;
  recommendation: string;
  keyStrengths: string[];
}

export interface CandidateResult extends ExtractionResult {
  id: string;
  fileName: string;
  matchScore: number;
  designation: HSEDesignation;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}
