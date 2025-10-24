
'use server';
/**
 * @fileOverview AI-powered resume analysis flow to evaluate a candidate based on specific criteria.
 *
 * - analyzeResume - A function that analyzes a resume and evaluates it.
 * - AnalyzeResumeInput - The input type for the analyzeResume function.
 * - AnalyzeResumeOutput - The return type for the analyzeResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "A resume file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobDescription: z.string().describe('The job description for the role.'),
  experienceYears: z.string().describe('The years of experience selected by the candidate in the form (e.g., "2-3 years", "10+ years").'),
});
export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

const EvaluationCriterionSchema = z.object({
    score: z.number().min(0).max(100).describe('The score from 0-100 for this criterion.'),
    justification: z.string().describe('The justification for the given score.'),
});

const AnalyzeResumeOutputSchema = z.object({
  skillsAndRoleAlignment: EvaluationCriterionSchema.describe("Evaluation of candidate's skills from the job description and relevant experience."),
  relevantExperience: EvaluationCriterionSchema.describe("Evaluation of candidate's demonstrated experience in core job functions."),
  education: EvaluationCriterionSchema.describe("Evaluation of candidate's educational background and formal qualifications."),
  extractedSkills: z.array(z.string()).describe('A list of key skills extracted from the resume.'),
});
export type AnalyzeResumeOutput = z.infer<typeof AnalyzeResumeOutputSchema>;

export async function analyzeResume(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
  return analyzeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeResumePrompt',
  input: {schema: AnalyzeResumeInputSchema},
  output: {schema: AnalyzeResumeOutputSchema},
  prompt: `You are an expert AI recruiter. Analyze the provided resume against the job description and the candidate's stated years of experience. Your task is to extract key skills and evaluate the candidate on three criteria.

Job Description: {{{jobDescription}}}
Candidate's Stated Experience: {{{experienceYears}}}
Resume: {{media url=resumeDataUri}}

Part 1: Extract Key Skills
Identify and list the key technical and soft skills from the resume.

Part 2: Evaluate and Score
For each of the following criteria, provide a score from 0-100 and a brief justification.

- **Skills and Role Alignment**: How well do the candidate's skills and experiences mentioned in the resume align with the core functions and requirements listed in the job description?
- **Years of Relevant Experience**: Based on the resume, does the candidate's experience align with the range they self-reported ({{{experienceYears}}})? Evaluate the depth and relevance of their roles, not just the duration.
- **Educational and Formal Qualifications**: Does the candidate possess the required degrees, certifications, or other qualifications mentioned in the job description? Consider equivalent experience if applicable.
`,
});

const analyzeResumeFlow = ai.defineFlow(
  {
    name: 'analyzeResumeFlow',
    inputSchema: AnalyzeResumeInputSchema,
    outputSchema: AnalyzeResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
