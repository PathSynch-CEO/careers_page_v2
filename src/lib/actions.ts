
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { initializeServerSideFirebase } from '@/firebase/server-init';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getStorage } from 'firebase/storage';
import type { ApplicationStatus } from './types';


const applicationSchema = z.object({
  jobId: z.string(),
  jobTitle: z.string(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  linkedinUrl: z.string().optional(),
  coverLetter: z.string().min(1, 'Required'),
  portfolioUrl: z.string().optional(),
  availableStartDate: z.string().min(1, 'Required'),
  experienceYears: z.string().min(1, 'Required'),
});

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'Resume is required.')
  .refine(
    (file) => file.size <= 10 * 1024 * 1024,
    `Max file size is 10MB.`
  )
  .refine(
    (file) =>
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
        file.type
      ),
    'Resume must be a PDF or Word document.'
  );

const combinedSchema = applicationSchema.extend({
    resume: fileSchema,
});


export async function submitApplication(prevState: any, formData: FormData) {
  const { firestore, firebaseApp } = initializeServerSideFirebase();
  const storage = getStorage(firebaseApp);
  
  const rawData = Object.fromEntries(formData.entries());

  const validatedFields = combinedSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    const errorDetails = JSON.stringify(validatedFields.error.flatten().fieldErrors);
    console.error('Form validation failed:', errorDetails);
    return { success: false, message: `Invalid form data: ${errorDetails}` };
  }

  try {
    const { resume: resumeFile, ...otherData } = validatedFields.data;

    const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
    const storageRef = ref(storage, `resumes/${uuidv4()}-${resumeFile.name}`);
    await uploadBytes(storageRef, resumeBuffer, { contentType: resumeFile.type });
    const resumeUrl = await getDownloadURL(storageRef);

    const newApplication = {
      ...otherData,
      resumeUrl,
      status: 'submitted' as ApplicationStatus,
      screeningStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(firestore, 'applications'), newApplication);
    
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, message: 'Application submitted successfully!' };
  } catch (error) {
    console.error('Submission Error:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}

const updateStatusSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  status: z.enum(['submitted', 'feedback', 'interviewing', 'offer', 'hired', 'disqualified']),
});


export async function updateApplicationStatus(prevState: any, formData: FormData) {
    const { firestore } = initializeServerSideFirebase();

    const validated = updateStatusSchema.safeParse(Object.fromEntries(formData));

    if (!validated.success) {
        return { success: false, message: 'Invalid data for status update.', status: '' };
    }

    const { applicationId, status } = validated.data;
    try {
        const appRef = doc(firestore, 'applications', applicationId);
        await updateDoc(appRef, { status: status });

        revalidatePath(`/admin/applications/${applicationId}`);
        revalidatePath('/admin');
        return { success: true, message: 'Status updated successfully.', status };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage, status };
    }
}

    
