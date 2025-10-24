import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeServerSideFirebase } from '@/firebase/server-init-admin';
import { parseJobDescription } from '@/ai/flows/parse-job-description';
import { screenApplication as screenApplicationFlow } from '@/ai/flows/screen-application';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';
import type { Job, Application } from './types';

const adminApp = initializeServerSideFirebase();
const firestore = getFirestore(adminApp);
const storage = getStorage(adminApp);

const jobSchemaData = z.object({
    title: z.string(),
    department: z.string(),
    city: z.string(),
    state: z.string(),
    remoteOption: z.boolean(),
    remoteType: z.string().optional(),
    description: z.string(),
    applicationMethod: z.enum(['enabled', 'internal-only', 'unlisted', 'disabled']),
});

export async function createJob(jobData: z.infer<typeof jobSchemaData>) {
    const jobsCollection = firestore.collection('jobs');
    const jobsSnapshot = await jobsCollection.get();
    const newOrder = jobsSnapshot.size;

    const { remoteOption, remoteType, ...rest } = jobData;

    const newJobData: Partial<Job> = {
        ...rest,
        remoteOption,
        isActive: true, // Default to active
        createdAt: new Date().toISOString(),
        order: newOrder,
    };
    
    if (remoteOption) {
        newJobData.remoteType = remoteType as Job['remoteType'];
    }

    await jobsCollection.add(newJobData);
}

const fileSchema = z.instanceof(File).refine(file => file.size > 0, 'File is required.');

export async function parseJobDescriptionFromDocument(formData: FormData) {
    const jobDocument = formData.get('jobDocument');
  
    const validatedFile = fileSchema.safeParse(jobDocument);
    if (!validatedFile.success) {
        throw new Error('A valid document file is required.');
    }
  
    const file = validatedFile.data;
    const buffer = Buffer.from(await file.arrayBuffer());
    const documentDataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const parsedData = await parseJobDescription({ documentDataUri });
    
    const { location, ...rest } = parsedData;
    let city = '';
    let state = '';
    if (location) {
        const parts = location.split(',').map(p => p.trim());
        city = parts[0] || '';
        state = parts.length > 1 ? parts[1] : '';
    }

    return { ...rest, city, state };
}

export async function updateJob(id: string, jobData: Omit<z.infer<typeof jobSchemaData>, 'id'>) {
    const jobRef = firestore.collection('jobs').doc(id);
    const { remoteOption, remoteType, ...rest } = jobData;

    const dataToUpdate: { [key: string]: any } = {
        ...rest,
        remoteOption,
    };

    if (remoteOption) {
        dataToUpdate.remoteType = remoteType as Job['remoteType'];
    } else {
        dataToUpdate.remoteType = FieldValue.delete();
    }

    await jobRef.update(dataToUpdate);
}


export async function deleteJob(id: string) {
    await firestore.collection('jobs').doc(id).delete();
}

export async function updateJobStatus(id: string, isActive: boolean) {
    await firestore.collection('jobs').doc(id).update({ isActive });
}

export async function reorderJobs(data: { jobOneId: string, jobOneOrder: number, jobTwoId: string, jobTwoOrder: number }) {
    const { jobOneId, jobOneOrder, jobTwoId, jobTwoOrder } = data;
    const batch = firestore.batch();

    const jobOneRef = firestore.collection('jobs').doc(jobOneId);
    batch.update(jobOneRef, { order: jobTwoOrder });

    const jobTwoRef = firestore.collection('jobs').doc(jobTwoId);
    batch.update(jobTwoRef, { order: jobOneOrder });

    await batch.commit();
}


export async function screenApplication(applicationId: string) {
    let appDocRef;

    try {
        appDocRef = firestore.collection('applications').doc(applicationId);

        await appDocRef.update({ screeningStatus: 'isScreening' });

        const appDocSnap = await appDocRef.get();
        if (!appDocSnap.exists) {
            throw new Error('Application not found.');
        }
        const application = appDocSnap.data() as Application;

        const jobDocSnap = await firestore.collection('jobs').doc(application.jobId).get();
        if (!jobDocSnap.exists) {
            throw new Error('Job not found for this application.');
        }
        const job = jobDocSnap.data() as Job;

        const url = new URL(application.resumeUrl);
        const pathName = decodeURIComponent(url.pathname);
        const filePath = pathName.substring(pathName.indexOf('/o/') + 3);

        const file = storage.bucket().file(filePath);
        const [resumeBytes] = await file.download();

        const resumeBuffer = Buffer.from(resumeBytes);
        const [metadata] = await file.getMetadata();
        const resumeMimeType = metadata.contentType || 'application/octet-stream';
        const resumeDataUri = `data:${resumeMimeType};base64,${resumeBuffer.toString('base64')}`;

        const analysisResult = await screenApplicationFlow({
            resumeDataUri,
            coverLetter: application.coverLetter,
            jobDescription: job.description,
            experienceYears: application.experienceYears,
        });

        await appDocRef.update({
            aiAnalysis: analysisResult,
            screeningStatus: 'completed',
        });
    } catch (error) {
        if (appDocRef) {
            try {
                await appDocRef.update({ screeningStatus: 'error' });
            } catch (updateError) {
                console.error("Failed to update status to 'error':", updateError);
            }
        }
        // Re-throw the original error to be caught by the server action
        throw error;
    }
}