
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { MapPin, Users, Briefcase, Calendar, ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';

import { useFirestore } from '@/firebase';
import type { Job } from '@/lib/types';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ApplicationForm from '@/components/application-form';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

function getRemoteTypeDescription(remoteType?: Job['remoteType']) {
    switch (remoteType) {
        case 'fully-remote-no-restrictions':
            return 'Fully Remote';
        case 'fully-remote-chosen-locations':
            return 'Remote (Specific Locations)';
        case 'hybrid':
            return 'Hybrid';
        default:
            return null;
    }
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!firestore || !id) return;

    const fetchJob = async () => {
      setIsLoading(true);
      try {
        const jobRef = doc(firestore, 'jobs', id);
        const jobSnap = await getDoc(jobRef);

        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() } as Job);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching job:", error);
        // Handle error state if needed
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [firestore, id]);
  
  const handleApply = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft size={16} />
                Back to all jobs
            </Link>
          {isLoading ? (
            <JobDetailSkeleton />
          ) : job ? (
            <div className="bg-card p-8 rounded-lg shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground sm:text-4xl">
                    {job.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>{job.city}, {job.state}</span>
                    </div>
                     {job.remoteOption && job.remoteType && (
                        <div className="flex items-center gap-2">
                           <Globe size={16} />
                           <Badge variant="secondary">{getRemoteTypeDescription(job.remoteType)}</Badge>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Posted on {format(new Date(job.createdAt), 'PP')}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                    <Button onClick={handleApply} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Briefcase size={18} className="mr-2"/>
                        Apply Now
                    </Button>
                </div>
              </div>

              <div className="prose prose-quoteless prose-neutral dark:prose-invert max-w-none text-foreground/90">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
      {job && (
        <ApplicationForm 
            job={job}
            isOpen={isFormOpen}
            onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

function JobDetailSkeleton() {
    return (
        <div className="bg-card p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-start gap-6 mb-8">
                <div className="w-2/3">
                    <Skeleton className="h-10 w-3/4 rounded-md mb-6" />
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-5 w-24 rounded-md" />
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="h-5 w-40 rounded-md" />
                    </div>
                </div>
                 <Skeleton className="h-12 w-36 rounded-md" />
            </div>
             <div className="space-y-4">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                 <Skeleton className="h-4 w-full rounded-md mt-4" />
                <Skeleton className="h-4 w-4/6 rounded-md" />
             </div>
        </div>
    )
}
