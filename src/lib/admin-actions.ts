'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
    createJob as createJobAdmin,
    updateJob as updateJobAdmin,
    deleteJob as deleteJobAdmin,
    updateJobStatus as updateJobStatusAdmin,
    reorderJobs as reorderJobsAdmin,
    screenApplication as screenApplicationAdmin,
    parseJobDescriptionFromDocument
} from '@/lib/firebase-admin-api';

// 1. Define the base schema that can be extended.
const baseJobSchema = z.object({
    title: z.string().min(3, 'Title is required'),
    department: z.string().min(2, 'Department is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    remoteOption: z.preprocess((val) => String(val) === 'true', z.boolean()),
    remoteType: z.string().optional(),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    applicationMethod: z.enum(['enabled', 'internal-only', 'unlisted', 'disabled']),
});

// 2. Create the final schema for creation by applying the refinement to the base.
const jobSchema = baseJobSchema.refine(data => {
    if (data.remoteOption && !data.remoteType) {
        return false;
    }
    return true;
}, {
    message: "Please select a remote type if remote option is enabled.",
    path: ["remoteType"],
});

// 3. Create the update schema by extending the original base schema.
const updateJobSchema = baseJobSchema.extend({
    id: z.string().min(1, 'Job ID is required'),
});


export async function createJob(prevState: any, formData: FormData) {
  const validatedFields = jobSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    console.error('Job validation failed:', validatedFields.error.flatten());
    return {
      success: false,
      message: 'Invalid form data. Please check your entries.',
    };
  }

  try {
    await createJobAdmin(validatedFields.data);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, message: 'Job posting created successfully!' };
  } catch (error) {
    console.error('Error creating job:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: errorMessage };
  }
}

export async function createJobFromDocument(prevState: any, formData: FormData) {
    try {
        const parsedData = await parseJobDescriptionFromDocument(formData);
        return { 
            success: true, 
            message: 'Document parsed successfully.', 
            data: {
                ...parsedData,
                remoteOption: false,
                applicationMethod: 'enabled',
            }
        };

    } catch (error) {
        console.error('Error parsing job document:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during parsing.';
        return { success: false, message: errorMessage };
    }
}


export async function updateJob(prevState: any, formData: FormData) {
    const validatedFields = updateJobSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data for update.' };
    }

    const { id, ...jobData } = validatedFields.data;

    try {
        await updateJobAdmin(id, jobData);
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath(`/jobs/${id}`);
        return { success: true, message: 'Job updated successfully!' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage };
    }
}

const idSchema = z.string().min(1, 'ID is required');

export async function deleteJob(prevState: any, formData: FormData) {
    const id = formData.get('id');
    const validatedId = idSchema.safeParse(id);
    if(!validatedId.success) {
        return { success: false, message: 'Job ID is missing.' };
    }
    
    try {
        await deleteJobAdmin(validatedId.data);
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true, message: 'Job deleted successfully.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage };
    }
}

const statusSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    isActive: z.boolean(),
});

export async function updateJobStatus(data: z.infer<typeof statusSchema>) {
    const validatedFields = statusSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error("Invalid data for status update:", validatedFields.error);
        return;
    }

    try {
        await updateJobStatusAdmin(validatedFields.data.id, validatedFields.data.isActive);
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath(`/jobs/${validatedFields.data.id}`);
    } catch (error) {
        console.error("Error updating job status:", error);
    }
}

const reorderSchema = z.object({
    jobOneId: z.string(),
    jobOneOrder: z.coerce.number(),
    jobTwoId: z.string(),
    jobTwoOrder: z.coerce.number(),
});

export async function reorderJobs(prevState: any, formData: FormData) {
    const validatedFields = reorderSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data for reordering.' };
    }

    try {
        await reorderJobsAdmin(validatedFields.data);
        revalidatePath('/admin');
        revalidatePath('/');
        return { success: true, message: 'Jobs reordered.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage };
    }
}

const screenApplicationSchema = z.object({
    applicationId: z.string().min(1, 'Application ID is required'),
});

export async function screenApplication(prevState: any, formData: FormData) {
    const validated = screenApplicationSchema.safeParse({
        applicationId: formData.get('applicationId'),
    });

    if (!validated.success) {
        return { success: false, message: 'Invalid application ID.' };
    }

    const { applicationId } = validated.data;

    try {
        await screenApplicationAdmin(applicationId);
        revalidatePath('/admin');
        revalidatePath(`/admin/applications/${applicationId}`);
        return { success: true, message: 'AI screening completed successfully.' };
    } catch (error) {
        console.error("Screening Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage };
    }
}