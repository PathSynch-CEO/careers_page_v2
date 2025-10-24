'use server';
/**
 * @fileOverview A comprehensive AI flow to screen a job application.
 * This flow analyzes the resume and cover letter, calculates a weighted score, and returns a detailed analysis.
 *
 * - screenApplication - The main function to execute the screening process.
 * - ScreenApplicationInput - The input type for the screenApplication function.
 * - ScreenApplicationOutput - The return type for the screenApplication function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { analyzeResume } from './analyze-resume';
import { analyzeCoverLetter } from './analyze-cover-letter';
import type { AnalyzeResumeOutput } from './analyze-resume';
import type { AnalyzeCoverLetterOutput } from './analyze-cover-letter';

const ScreenApplicationInputSchema = z.object({
  resumeDataUri: z.string().describe("A resume file as a data URI."),
  coverLetter: z.string().describe('The cover letter text.'),
  jobDescription: z.string().describe('The job description for the role.'),
  experienceYears: z.string().describe('The years of experience selected by the candidate.'),
});
export type ScreenApplicationInput = z.infer<typeof ScreenApplicationInputSchema>;

const EvaluationCriterionSchema = z.object({
    score: z.number(),
    justification: z.string(),
});

const ScreenApplicationOutputSchema = z.object({
  overallScore: z.number().describe('The final weighted score for the application.'),
  skillsAndRoleAlignment: EvaluationCriterionSchema,
  relevantExperience: EvaluationCriterionSchema,
  education: EvaluationCriterionSchema,
  quantifiableAchievements: EvaluationCriterionSchema,
  extractedSkills: z.array(z.string()),
});
export type ScreenApplicationOutput = z.infer<typeof ScreenApplicationOutputSchema>;


export async function screenApplication(input: ScreenApplicationInput): Promise<ScreenApplicationOutput> {
  return screenApplicationFlow(input);
}


const screenApplicationFlow = ai.defineFlow(
  {
    name: 'screenApplicationFlow',
    inputSchema: ScreenApplicationInputSchema,
    outputSchema: ScreenApplicationOutputSchema,
  },
  async (input) => {
    const [resumeResult, coverLetterResult] = await Promise.allSettled([
      analyzeResume({
        resumeDataUri: input.resumeDataUri,
        jobDescription: input.jobDescription,
        experienceYears: input.experienceYears,
      }),
      analyzeCoverLetter({
        coverLetter: input.coverLetter,
        jobDescription: input.jobDescription,
      }),
    ]);

    let resumeAnalysis: AnalyzeResumeOutput | null = null;
    if (resumeResult.status === 'fulfilled') {
      resumeAnalysis = resumeResult.value;
    } else {
      console.error("Resume analysis failed:", resumeResult.reason);
    }

    let coverLetterAnalysis: AnalyzeCoverLetterOutput | null = null;
    if (coverLetterResult.status === 'fulfilled') {
      coverLetterAnalysis = coverLetterResult.value;
    } else {
        console.error("Cover letter analysis failed:", coverLetterResult.reason);
    }

    // Define weights for each criterion
    const weights = {
      skillsAndRoleAlignment: 0.4,
      relevantExperience: 0.3,
      education: 0.1,
      quantifiableAchievements: 0.2,
    };

    // Get scores, defaulting to 0 if analysis failed or criterion is missing
    const scores = {
      skillsAndRoleAlignment: resumeAnalysis?.skillsAndRoleAlignment?.score || 0,
      relevantExperience: resumeAnalysis?.relevantExperience?.score || 0,
      education: resumeAnalysis?.education?.score || 0,
      quantifiableAchievements: coverLetterAnalysis?.quantifiableAchievements?.score || 0,
    };

    // Calculate the weighted average
    const overallScore = 
        scores.skillsAndRoleAlignment * weights.skillsAndRoleAlignment +
        scores.relevantExperience * weights.relevantExperience +
        scores.education * weights.education +
        scores.quantifiableAchievements * weights.quantifiableAchievements;


    const defaultCriterion = { score: 0, justification: 'Analysis failed or data not available.' };

    return {
      overallScore: Math.round(overallScore),
      skillsAndRoleAlignment: resumeAnalysis?.skillsAndRoleAlignment || defaultCriterion,
      relevantExperience: resumeAnalysis?.relevantExperience || defaultCriterion,
      education: resumeAnalysis?.education || defaultCriterion,
      quantifiableAchievements: coverLetterAnalysis?.quantifiableAchievements || defaultCriterion,
      extractedSkills: resumeAnalysis?.extractedSkills || [],
    };
  }
);
