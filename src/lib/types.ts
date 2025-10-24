
export interface Job {
  id: string;
  title: string;
  department: string;
  city: string;
  state: string;
  remoteOption: boolean;
  remoteType?: 'fully-remote-no-restrictions' | 'fully-remote-chosen-locations' | 'hybrid';
  description: string;
  createdAt: any;
  isActive?: boolean;
  order: number;
  applicationMethod?: 'enabled' | 'internal-only' | 'unlisted' | 'disabled';
}

export type ApplicationStatus = 'submitted' | 'feedback' | 'interviewing' | 'offer' | 'hired' | 'disqualified';

interface EvaluationCriterion {
    score: number;
    justification: string;
}

export interface AIScreeningAnalysis {
    overallScore: number;
    skillsAndRoleAlignment: EvaluationCriterion;
    relevantExperience: EvaluationCriterion;
    education: EvaluationCriterion;
    quantifiableAchievements: EvaluationCriterion;
    extractedSkills: string[];
}


export interface Application {
    id: string;
    jobId: string;
    jobTitle: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedinUrl?: string;
    coverLetter: string;
    portfolioUrl?: string;
    availableStartDate: string;
    experienceYears: string;
    resumeUrl: string;
    status: ApplicationStatus;
    screeningStatus: 'pending' | 'isScreening' | 'completed' | 'error';
    createdAt: string;
    aiAnalysis?: AIScreeningAnalysis;
}
