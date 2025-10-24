'use server';

/**
 * @fileOverview An AI agent to analyze cover letters and assess candidate fit based on specific criteria.
 *
 * - analyzeCoverLetter - A function that handles the cover letter analysis process.
 * - AnalyzeCoverLetterInput - The input type for the analyzeCoverLetter function.
 * - AnalyzeCoverLetterOutput - The return type for the analyzeCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCoverLetterInputSchema = z.object({
  coverLetter: z.string().describe('The cover letter text to analyze.'),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type AnalyzeCoverLetterInput = z.infer<typeof AnalyzeCoverLetterInputSchema>;


const EvaluationCriterionSchema = z.object({
    score: z.number().min(0).max(100).describe('The score from 0-100 for this criterion.'),
    justification: z.string().describe('The justification for the given score.'),
});

const AnalyzeCoverLetterOutputSchema = z.object({
  quantifiableAchievements: EvaluationCriterionSchema.describe('Evaluation of evidence of meaningful contributions and impact in previous roles.'),
});
export type AnalyzeCoverLetterOutput = z.infer<typeof AnalyzeCoverLetterOutputSchema>;

export async function analyzeCoverLetter(input: AnalyzeCoverLetterInput): Promise<AnalyzeCoverLetterOutput> {
  return analyzeCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCoverLetterPrompt',
  input: {schema: AnalyzeCoverLetterInputSchema},
  output: {schema: AnalyzeCoverLetterOutputSchema},
  prompt: `You are an expert AI recruiter. Analyze the provided cover letter against the job description. Your task is to evaluate and score the candidate's quantifiable achievements and impact.

  Job Description: {{{jobDescription}}}
  Cover Letter: {{{coverLetter}}}

  Evaluate the following criterion and provide a score from 0-100, along with a brief justification for your score.

  - **Quantifiable Achievements and Impact**: Look for evidence of meaningful contributions in previous roles. This can include metrics, project outcomes, or clear descriptions of impact.
  `,
});

const analyzeCoverLetterFlow = ai.defineFlow(
  {
    name: 'analyzeCoverLetterFlow',
    inputSchema: AnalyzeCoverLetterInputSchema,
    outputSchema: AnalyzeCoverLetterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
