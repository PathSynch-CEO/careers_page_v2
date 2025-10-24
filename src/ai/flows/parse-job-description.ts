
'use server';
/**
 * @fileOverview An AI agent to parse job descriptions from documents.
 *
 * - parseJobDescription - A function that handles the job description parsing process.
 * - ParseJobDescriptionInput - The input type for the parseJobDescription function.
 * - ParseJobDescriptionOutput - The return type for the parseJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseJobDescriptionInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document file (PDF, DOCX) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseJobDescriptionInput = z.infer<typeof ParseJobDescriptionInputSchema>;

const ParseJobDescriptionOutputSchema = z.object({
  title: z.string().describe('The job title.'),
  department: z.string().describe('The department for the job.'),
  location: z.string().describe("The location of the job, formatted as 'City, State'."),
  description: z
    .string()
    .describe('A detailed description of the job responsibilities and qualifications.'),
});
export type ParseJobDescriptionOutput = z.infer<typeof ParseJobDescriptionOutputSchema>;

export async function parseJobDescription(input: ParseJobDescriptionInput): Promise<ParseJobDescriptionOutput> {
  return parseJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseJobDescriptionPrompt',
  input: {schema: ParseJobDescriptionInputSchema},
  output: {schema: ParseJobDescriptionOutputSchema},
  prompt: `You are an expert at parsing job descriptions from various document formats.
    Given the following document, extract the job title, department, location, and a comprehensive job description.
    For the location, please format it as "City, State".

    Document: {{media url=documentDataUri}}`,
});

const parseJobDescriptionFlow = ai.defineFlow(
  {
    name: 'parseJobDescriptionFlow',
    inputSchema: ParseJobDescriptionInputSchema,
    outputSchema: ParseJobDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
