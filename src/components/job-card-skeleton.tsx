
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-7 w-3/4 rounded-md mb-3" />
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md mt-2" />
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
