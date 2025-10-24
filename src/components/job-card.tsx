
import Link from 'next/link';
import type { Job } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface JobCardProps {
  job: Job;
  onApply: (job: Job) => void;
}

function getRemoteTypeDescription(remoteType?: Job['remoteType']) {
    switch (remoteType) {
        case 'fully-remote-no-restrictions':
            return 'Fully Remote';
        case 'fully-remote-chosen-locations':
            return 'Remote';
        case 'hybrid':
            return 'Hybrid';
        default:
            return null;
    }
}

export default function JobCard({ job, onApply }: JobCardProps) {
  const remoteDescription = getRemoteTypeDescription(job.remoteType);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <Link href={`/jobs/${job.id}`} className="group">
                        <h3 className="text-xl font-bold font-headline text-foreground group-hover:text-primary transition-colors">
                            {job.title}
                        </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm mt-2 mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={16} />
                            <span>{job.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{job.city}, {job.state}</span>
                        </div>
                         {job.remoteOption && remoteDescription && (
                            <div className="flex items-center gap-2">
                                <Globe size={16} />
                                <Badge variant="secondary">{remoteDescription}</Badge>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>
                </div>
                <div className='mt-4 md:mt-0 shrink-0'>
                    <Button onClick={() => onApply(job)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Apply Now</Button>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
