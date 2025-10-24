
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const Hero = dynamic(() => import('@/components/hero'), { ssr: false });
const TestimonialSection = dynamic(() => import('@/components/testimonial-section'), { ssr: false });
const CultureSection = dynamic(() => import('@/components/culture-section'), { ssr: false });
const JobListings = dynamic(() => import('@/components/job-listings'), { 
    ssr: false,
    loading: () => (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="space-y-6 pt-8">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    )
});


export default function HomePageClient() {
  return (
    <>
      <Hero />
      <TestimonialSection />
      <CultureSection />
      <JobListings />
    </>
  );
}
