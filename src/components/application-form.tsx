
'use client';

import React, { useState, useTransition, useActionState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  X,
  Upload,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
} from 'lucide-react';

import type { Job } from '@/lib/types';
import { submitApplication } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ApplicationFormProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const fileSchema = z
  .any()
  .refine((files) => typeof window === 'undefined' || (files instanceof FileList && files.length > 0), 'Resume is required.')
  .refine((files) => typeof window === 'undefined' || (files instanceof FileList && files[0]?.size <= 10 * 1024 * 1024), `Max file size is 10MB.`)
  .refine(
    (files) => typeof window === 'undefined' || (files instanceof FileList && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(files[0]?.type)),
    "Only .pdf, .doc, and .docx formats are supported."
  );

const formSchema = z.object({
  jobId: z.string(),
  jobTitle: z.string(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  linkedinUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters').min(1, 'Required'),
  portfolioUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  availableStartDate: z.string().min(1, 'Required'),
  experienceYears: z.string().min(1, 'Required'),
  resume: fileSchema,
});

type FormData = z.infer<typeof formSchema>;

const initialState = {
  success: false,
  message: '',
};

export default function ApplicationForm({ job, isOpen, onClose }: ApplicationFormProps) {
  const { toast } = useToast();
  const [formState, formAction, isSubmitting] = useActionState(submitApplication, initialState);
  const [isPending, startTransition] = useTransition();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobId: job?.id,
      jobTitle: job?.title,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      coverLetter: '',
      portfolioUrl: '',
      availableStartDate: '',
      experienceYears: '',
    },
  });

  const resumeFileRef = form.register('resume');
  const resumeValue = form.watch('resume');

  React.useEffect(() => {
    if (job) {
      form.reset({
        jobId: job.id,
        jobTitle: job.title,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        coverLetter: '',
        portfolioUrl: '',
        availableStartDate: '',
        experienceYears: '',
        resume: undefined,
      });
      setCurrentStep(1);
      setHasSubmitted(false);
    }
  }, [job, form]);

  useEffect(() => {
    if (formState.message) {
      if (formState.success) {
        setHasSubmitted(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: formState.message,
        });
      }
    }
  }, [formState, toast]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'linkedinUrl'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['coverLetter', 'availableStartDate', 'experienceYears', 'portfolioUrl'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = form.handleSubmit(async (data) => {
    startTransition(() => {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'resume' && value instanceof FileList) {
          formData.append('resume', value[0]);
        } else if (value != null) {
          formData.append(key, String(value));
        }
      });

      formAction(formData);
    });
  }, () => {
    // This is the error handler for handleSubmit, runs on validation failure
    const errors = form.formState.errors;
    const fieldOrder: (keyof FormData)[][] = [
        ['firstName', 'lastName', 'email', 'phone', 'linkedinUrl'],
        ['coverLetter', 'availableStartDate', 'experienceYears', 'portfolioUrl'],
        ['resume']
    ];
    
    for (let i = 0; i < fieldOrder.length; i++) {
        if (fieldOrder[i].some(field => errors[field as keyof typeof errors])) {
          setCurrentStep(i + 1);
          break;
        }
    }
  });
  
  const handleDialogClose = () => {
      onClose();
      // Use a timeout to allow the closing animation to finish before resetting state
      setTimeout(() => {
        if(hasSubmitted){
          form.reset();
          setCurrentStep(1);
          setHasSubmitted(false);
        }
      }, 300);
  }


  if (!job) return null;

  if (hasSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <PartyPopper size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Application Submitted!
            </h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying for the {job.title} position. Your resume has been successfully uploaded.
            </p>
            <p className="text-sm text-muted-foreground/80 mb-8">
             Our team will review your application and you should hear from us shortly.
            </p>
            <Button onClick={handleDialogClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-headline font-bold">Apply for {job.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground flex items-center gap-2 mt-2">
                PathSynch Careers
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDialogClose} className="shrink-0">
              <X size={24} />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-6">
              {[ {label: 'Personal'}, {label: 'Details'}, {label: 'Resume'} ].map((stepInfo, index) => (
                <React.Fragment key={index}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${ index + 1 <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground' }`}>
                      {index + 1}
                    </div>
                    <p className={`text-xs font-medium ${index+1 <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>{stepInfo.label}</p>
                  </div>
                  {index < 2 && <div className={`flex-1 h-0.5 mx-4 transition-colors ${ index + 1 < currentStep ? 'bg-primary' : 'bg-muted'}`} />}
                </React.Fragment>
              ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6">
          <input type="hidden" {...form.register('jobId')} value={job.id} />
          <input type="hidden" {...form.register('jobTitle')} value={job.title} />
          <div className="space-y-6">
            {currentStep === 1 && (
              <section className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" {...form.register('firstName')} name="firstName" placeholder="John" />
                    {form.formState.errors.firstName && <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" {...form.register('lastName')} name="lastName" placeholder="Doe" />
                    {form.formState.errors.lastName && <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...form.register('email')} name="email" placeholder="john.doe@email.com" />
                  {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" type="tel" {...form.register('phone')} name="phone" placeholder="(123) 456-7890" />
                  {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input id="linkedinUrl" {...form.register('linkedinUrl')} name="linkedinUrl" placeholder="https://linkedin.com/in/yourprofile" />
                  {form.formState.errors.linkedinUrl && <p className="text-sm text-destructive">{form.formState.errors.linkedinUrl.message}</p>}
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label htmlFor="coverLetter">Cover Letter *</Label>
                  <Textarea id="coverLetter" {...form.register('coverLetter')} name="coverLetter" rows={6} placeholder="Tell us why you're a great fit for this role..." />
                   <p className="text-xs text-muted-foreground">
                    {form.watch('coverLetter')?.length || 0} / 50 characters minimum
                  </p>
                  {form.formState.errors.coverLetter && <p className="text-sm text-destructive">{form.formState.errors.coverLetter.message}</p>}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="availableStartDate">Available Start Date *</Label>
                     <Input id="availableStartDate" type="date" {...form.register('availableStartDate')} name="availableStartDate" />
                     {form.formState.errors.availableStartDate && <p className="text-sm text-destructive">{form.formState.errors.availableStartDate.message}</p>}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="experienceYears">Years of Experience *</Label>
                     <Select name="experienceYears" onValueChange={(value) => form.setValue('experienceYears', value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">0-1 years</SelectItem>
                          <SelectItem value="2-3">2-3 years</SelectItem>
                          <SelectItem value="4-5">4-5 years</SelectItem>
                          <SelectItem value="6-10">6-10 years</SelectItem>
                          <SelectItem value="10+">10+ years</SelectItem>
                        </SelectContent>
                     </Select>
                     {form.formState.errors.experienceYears && <p className="text-sm text-destructive">{form.formState.errors.experienceYears.message}</p>}
                   </div>
                 </div>
                 <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input id="portfolioUrl" {...form.register('portfolioUrl')} name="portfolioUrl" placeholder="https://yourportfolio.com" />
                  {form.formState.errors.portfolioUrl && <p className="text-sm text-destructive">{form.formState.errors.portfolioUrl.message}</p>}
                </div>
              </section>
            )}
            
            {currentStep === 3 && (
              <section className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label htmlFor="resume">Upload Resume *</Label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-input px-6 py-10 hover:border-primary transition-colors">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                        <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                          <label
                            htmlFor="resume"
                            className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80"
                          >
                            <span>Upload a file</span>
                            <input id="resume" type="file" className="sr-only" {...resumeFileRef} accept=".pdf,.doc,.docx" />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    </div>
                    {resumeValue && resumeValue.length > 0 && (
                       <div className="flex items-center justify-center p-3 mt-4 bg-primary/10 rounded-lg">
                        <Check size={20} className="text-primary mr-2" />
                        <span className="text-sm font-medium text-primary">{resumeValue[0].name}</span>
                       </div>
                    )}
                    {form.formState.errors.resume && <p className="text-sm text-destructive">{form.formState.errors.resume.message as string}</p>}
                </div>
              </section>
            )}
          </div>
        </form>

        <DialogFooter className="p-6 mt-auto border-t">
           <div className="flex justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isSubmitting || isPending || currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={onSubmit}
                disabled={isSubmitting || isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting || isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    