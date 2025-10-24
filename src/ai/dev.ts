'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-cover-letter.ts';
import '@/ai/flows/analyze-resume.ts';
import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/parse-job-description.ts';
import '@/ai/flows/screen-application.ts';
