
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Job } from '@/lib/types';
import JobCard from './job-card';
import JobCardSkeleton from './job-card-skeleton';
import ApplicationForm from './application-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Briefcase } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function JobListings() {
  const firestore = useFirestore();

  const jobsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'jobs'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: jobs, isLoading: isLoadingJobs, error } = useCollection<Job>(jobsQuery);

  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const activeJobs = useMemo(() => {
    if(!jobs) return [];
    // Only show jobs that are 'enabled' and 'isActive' is not explicitly false
    return jobs.filter(job => job.applicationMethod === 'enabled' && job.isActive !== false);
  }, [jobs])

  const departments = useMemo(() => {
    if (!activeJobs) return ['All'];
    const uniqueDepartments = new Set(activeJobs.map(job => job.department));
    return ['All', ...Array.from(uniqueDepartments)];
  }, [activeJobs]);

  useEffect(() => {
    if (!activeJobs) {
      setFilteredJobs([]);
      return;
    };
    
    let results = activeJobs;

    if (searchTerm) {
      results = results.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment !== 'All') {
      results = results.filter(job => job.department === selectedDepartment);
    }

    setFilteredJobs(results);
  }, [searchTerm, selectedDepartment, activeJobs]);

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    // Delay setting job to null to prevent content flicker during closing animation
    setTimeout(() => setSelectedJob(null), 300);
  };

  const hasActiveFilters = searchTerm || selectedDepartment !== 'All';

  return (
    <section id="jobs" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">
              Find Your Next Opportunity
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We're looking for talented individuals to join our team. Explore our open positions below.
            </p>
          </div>
        </div>

        <div className="mt-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or keyword..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={!activeJobs || activeJobs.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6">
            {isLoadingJobs ? (
              Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
            ) : error ? (
                <div className="text-center py-12 px-6 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Jobs</h3>
                    <p className="mt-2 text-sm">{error.message}</p>
                </div>
            ) : activeJobs && activeJobs.length > 0 ? (
                filteredJobs.length > 0 ? (
                    filteredJobs.map(job => (
                        <JobCard key={job.id} job={job} onApply={handleApply} />
                    ))
                ) : (
                    <div className="text-center py-12 px-6 rounded-lg bg-muted/50">
                        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">No Matching Positions Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                        Please try adjusting your search or filter.
                        </p>
                    </div>
                )
            ) : (
                <div className="text-center py-12 px-6 rounded-lg bg-muted/50">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">No Open Positions</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                    We are not currently hiring, but please check back soon!
                    </p>
                </div>
            )}
          </div>
        </div>
      </div>
      {selectedJob && (
        <ApplicationForm
          job={selectedJob}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
        />
      )}
    </section>
  );
}
