
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Application, Job } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './skeleton';
import { Briefcase, Search } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';

const chartConfigBase = {
  views: {
    label: 'Page Views',
  },
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
  mobile: {
    label: 'Mobile',
    color: 'hsl(var(--chart-2))',
  },
};

// Applications per Job Chart
export function ApplicationsPerJobChart({
  applications,
  jobs,
  isLoading,
}: {
  applications: Application[];
  jobs: Job[];
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    if (!jobs || !applications) return [];
    const data = jobs.map(job => ({
      jobTitle: job.title,
      applications: applications.filter(app => app.jobId === job.id).length,
    }));
    return data.filter(d => d.applications > 0);
  }, [applications, jobs]);

  const chartConfig: ChartConfig = useMemo(() => ({
    applications: {
      label: 'Applications',
      color: 'hsl(var(--primary))',
    },
  }), []);


  if (isLoading) {
    return <Skeleton className="absolute inset-0" />;
  }

  if (chartData.length === 0) {
    return (
        <div className="text-center py-10 px-6 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-md font-semibold text-foreground">No Jobs Found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
                Create a job to start seeing application data.
            </p>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={chartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            accessibilityLayer
        >
             <XAxis
                dataKey="jobTitle"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="applications" fill="var(--color-applications)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Average Score Over Time Chart
export function AverageScoreOverTimeChart({
  applications,
  isLoading,
}: {
  applications: Application[];
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    const scoredApps = applications.filter(app => app.aiAnalysis?.overallScore != null);
    const groupedByDate = scoredApps.reduce((acc, app) => {
      const date = format(parseISO(app.createdAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { scores: [], count: 0 };
      }
      acc[date].scores.push(app.aiAnalysis!.overallScore);
      acc[date].count++;
      return acc;
    }, {} as Record<string, { scores: number[]; count: number }>);

    return Object.entries(groupedByDate)
      .map(([date, data]) => ({
        date: format(new Date(date), 'MMM d'),
        averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [applications]);

   const chartConfig: ChartConfig = useMemo(() => ({
    averageScore: {
      label: 'Avg. Score',
      color: 'hsl(var(--primary))',
    },
  }), []);


  if (isLoading) {
    return <Skeleton className="absolute inset-0" />;
  }

   if (chartData.length === 0) {
    return (
        <div className="text-center py-10 px-6 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-md font-semibold text-foreground">Not Enough Data</h3>
            <p className="mt-1 text-xs text-muted-foreground">
                Screen applications with AI to see score trends over time.
            </p>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            accessibilityLayer
        >
            <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
            />
             <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Line
                dataKey="averageScore"
                type="monotone"
                stroke="var(--color-averageScore)"
                strokeWidth={2}
                dot={true}
            />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Application Status Chart
export function ApplicationStatusChart({
  applications,
  isLoading,
}: {
  applications: Application[];
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
    }));
  }, [applications]);

  const chartConfig: ChartConfig = useMemo(() => ({
    count: {
      label: 'Count',
      color: 'hsl(var(--primary))',
    },
  }), []);
  
  if (isLoading) {
    return <Skeleton className="absolute inset-0" />;
  }

  if (chartData.length === 0) {
    return (
        <div className="text-center py-10 px-6 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-md font-semibold text-foreground">No Applications Yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
                Application statuses will be visualized here as they come in.
            </p>
        </div>
    );
  }


  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            accessibilityLayer
        >
            <YAxis
                dataKey="status"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
            />
            <XAxis type="number" hide />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
