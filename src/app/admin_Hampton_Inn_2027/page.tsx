
'use client';

import { useState, useEffect, useTransition, useMemo, useActionState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Upload,
  FileText,
  Briefcase,
  Users,
  Download,
  MoreHorizontal,
  BarChart,
  Activity,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  LineChart as LineChartIcon,
  PieChartIcon,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, parseISO } from 'date-fns';

import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { createJob, createJobFromDocument, updateJob, deleteJob, updateJobStatus, reorderJobs, screenApplication } from '@/lib/admin-actions';
import type { Job, Application } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useToast } from '@/hooks/use-toast';
import JobCardSkeleton from '@/components/job-card-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter as TableFooterComponent,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApplicationsPerJobChart, AverageScoreOverTimeChart, ApplicationStatusChart } from '@/components/ui/charts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


const jobSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  department: z.string().min(2, 'Department is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  remoteOption: z.boolean(),
  remoteType: z.string().optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters'),
  applicationMethod: z.enum(['enabled', 'internal-only', 'unlisted', 'disabled']),
}).refine(data => {
    if (data.remoteOption && !data.remoteType) {
        return false;
    }
    return true;
}, {
    message: "Please select a remote type",
    path: ["remoteType"],
});

type JobFormData = z.infer<typeof jobSchema>;

const initialState = {
  success: false,
  message: '',
};

type ParsedJobState = {
  success: boolean;
  message: string;
  data?: Partial<JobFormData>;
};

const initialParsedJobState: ParsedJobState = {
  success: false,
  message: '',
};

export default function AdminPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();

  const [createState, createAction, isCreating] = useActionState(createJob,initialState);
  const [updateState, updateAction, isUpdating] = useActionState(updateJob,initialState);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteJob,initialState);
  const [reorderState, reorderAction, isReordering] = useActionState(reorderJobs, initialState);
  const [screenState, screenAction, isScreening] = useActionState(screenApplication, initialState);

  const [parsedJobState, parseJobAction, isParsing] = useActionState(
    createJobFromDocument,
    initialParsedJobState
  );

  const [jobFile, setJobFile] = useState<File | null>(null);
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });


  const jobsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'jobs'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: jobs, isLoading: isLoadingJobs } =
    useCollection<Job>(jobsQuery);

  const applicationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'applications'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: applications, isLoading: isLoadingApps } =
    useCollection<Application>(applicationsQuery);

  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!applications) {
        setFilteredApplications([]);
        return;
    };
    if (!dateRange || !dateRange.from) {
        setFilteredApplications(applications);
        return;
    };

    const newFiltered = applications.filter(app => {
      const appDate = parseISO(app.createdAt);
      const fromDate = dateRange.from!;
      const toDate = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date();
      return appDate >= fromDate && appDate <= toDate;
    })
    setFilteredApplications(newFiltered);
  }, [applications, dateRange]);


  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      department: '',
      city: '',
      state: '',
      remoteOption: false,
      remoteType: undefined,
      description: '',
      applicationMethod: 'enabled',
    },
  });

  const remoteOptionValue = form.watch('remoteOption');

  
  const showToast = (state: {success: boolean, message: string}) => {
     if (state.message) {
      if (state.success) {
        toast({
          title: 'Success!',
          description: state.message,
        });
        setReviewModalOpen(false);
        setEditingJob(null);
        form.reset();
        setCurrentStep(1);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: state.message,
        });
      }
    }
  }

  useEffect(() => showToast(createState), [createState, toast, form]);
  useEffect(() => showToast(updateState), [updateState, toast, form]);
  useEffect(() => showToast(deleteState), [deleteState, toast, form]);
  useEffect(() => showToast(screenState), [screenState, toast]);

  useEffect(() => {
    if (reorderState.message && !reorderState.success) {
        toast({ variant: 'destructive', title: 'Reorder Error', description: reorderState.message });
    }
  }, [reorderState, toast]);


  useEffect(() => {
    if (isParsing) return;
    if (parsedJobState.message) {
      if (parsedJobState.success && parsedJobState.data) {
        form.reset(parsedJobState.data);
        setEditingJob(null); // Clear editing state
        setCurrentStep(1);
        setReviewModalOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Parsing Error',
          description: parsedJobState.message,
        });
      }
      setJobFile(null);
    }
  }, [parsedJobState, isParsing, toast, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJobFile(file);
      const formData = new FormData();
      formData.append('jobDocument', file);
      startTransition(() => {
        parseJobAction(formData);
      });
    }
  };

  const handleFormSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
     Object.entries(data).forEach(([key, value]) => {
        if(value !== undefined) formData.append(key, String(value));
    });

    startTransition(() => {
        if(editingJob){
            updateAction(formData)
        } else {
            createAction(formData);
        }
    });
  });

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    form.reset({
        id: job.id,
        title: job.title,
        department: job.department,
        city: job.city,
        state: job.state,
        remoteOption: job.remoteOption,
        remoteType: job.remoteType,
        description: job.description,
        applicationMethod: job.applicationMethod || 'enabled',
    });
    setCurrentStep(1);
    setReviewModalOpen(true);
  }

  const handleNewJobClick = () => {
    setEditingJob(null);
    form.reset({
      title: '',
      department: '',
      city: '',
      state: '',
      remoteOption: false,
      remoteType: undefined,
      description: '',
      applicationMethod: 'enabled',
    });
    setCurrentStep(1);
    setReviewModalOpen(true);
  }

  const handleDeleteJob = (jobId: string) => {
    const formData = new FormData();
    formData.append('id', jobId);
    startTransition(() => {
        deleteAction(formData);
    })
  }

  const handleToggleActive = (job: Job) => {
    startTransition(() => {
        updateJobStatus({ id: job.id, isActive: !job.isActive});
    });
  }

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    if (!jobs) return;
    const jobToMove = jobs[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const jobToSwap = jobs[swapIndex];

    if(!jobToMove || !jobToSwap) return;

    const formData = new FormData();
    formData.append('jobOneId', jobToMove.id);
    formData.append('jobOneOrder', String(jobToMove.order));
    formData.append('jobTwoId', jobToSwap.id);
    formData.append('jobTwoOrder', String(jobToSwap.order));
    
    startTransition(() => reorderAction(formData));
  };
  
  const handleScreenApplication = (application: Application) => {
      const formData = new FormData();
      formData.append('applicationId', application.id);
      startTransition(() => screenAction(formData));
  }

  const handleNextStep = async () => {
    const fieldsToValidate: (keyof JobFormData)[] = ['title', 'department', 'city', 'state', 'remoteOption', 'remoteType', 'description'];
    const isValid = await form.trigger(fieldsToValidate);
    if(isValid) {
        setCurrentStep(2);
    }
  }

  const isSubmitting = isCreating || isUpdating;


  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/20 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h1 className="text-4xl font-bold font-headline tracking-tighter">
                Admin Dashboard
            </h1>
            <div className="mt-4 md:mt-0">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="text-primary" />
                    Create New Job
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-center rounded-lg border border-dashed border-input px-6 py-10 hover:border-primary transition-colors">
                      <div className="text-center">
                        <FileText
                          className="mx-auto h-12 w-12 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                          <label
                            htmlFor="job-file-upload"
                            className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80"
                          >
                            <span>Upload a document</span>
                            <input
                              id="job-file-upload"
                              name="job-file-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx"
                              disabled={isParsing}
                            />
                          </label>
                          <p className="pl-1">and let AI do the work</p>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          PDF, DOC, DOCX up to 10MB
                        </p>
                      </div>
                    </div>
                    {isParsing && (
                      <div className="flex items-center justify-center p-3 mt-4 bg-primary/10 rounded-lg">
                        <Loader2
                          size={20}
                          className="text-primary mr-2 animate-spin"
                        />
                        <span className="text-sm font-medium text-primary">
                          AI is parsing your document...
                        </span>
                      </div>
                    )}
                     <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleNewJobClick}>Create Job Manually</Button>
                  </div>
                </CardContent>
              </Card>
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingApps ? <JobCardSkeleton/> : 
                   filteredApplications && filteredApplications.length > 0 ? (
                    filteredApplications.slice(0,3).map(app => (
                       <div key={app.id} className="flex items-center space-x-3">
                         <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                         <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{app.firstName} {app.lastName} applied for {app.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(app.createdAt), 'PPp')}</p>
                         </div>
                         {app.aiAnalysis?.overallScore &&
                            <Badge variant={app.aiAnalysis.overallScore > 80 ? 'default': 'secondary'}>{app.aiAnalysis.overallScore}</Badge>
                         }
                       </div>
                    ))
                   ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                   )
                  }
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="text-primary" />
                    Current Job Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingJobs ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <JobCardSkeleton key={i} />
                      ))
                    ) : jobs && jobs.length > 0 ? (
                      jobs.map((job, index) => (
                        <Card key={job.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || isReordering} onClick={() => handleReorder(index, 'up')}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === jobs.length - 1 || isReordering} onClick={() => handleReorder(index, 'down')}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div>
                                    <h3 className="font-bold">{job.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {job.department} - {job.city}, {job.state}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id={`active-toggle-${job.id}`}
                                        checked={job.isActive}
                                        onCheckedChange={() => handleToggleActive(job)}
                                        disabled={isPending}
                                    />
                                    <Label htmlFor={`active-toggle-${job.id}`} className="text-sm font-medium">{job.isActive ? 'Active' : 'Inactive'}</Label>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-5 h-5"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleEditClick(job)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                     <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the job posting.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteJob(job.id)} className="bg-destructive hover:bg-destructive/90">
                                                    {isDeleting ? <Loader2 className="animate-spin" /> : 'Delete'}
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No jobs posted yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="text-primary" />
                        Applications per Job
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] relative">
                    <ApplicationsPerJobChart applications={filteredApplications || []} jobs={jobs || []} isLoading={isLoadingApps || isLoadingJobs} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="text-primary" />
                        Application Status Breakdown
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] relative">
                        <ApplicationStatusChart applications={filteredApplications || []} isLoading={isLoadingApps} />
                    </CardContent>
                </Card>
            </div>
            <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChartIcon className="text-primary" />
                    Average AI Score Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] relative">
                    <AverageScoreOverTimeChart applications={filteredApplications || []} isLoading={isLoadingApps} />
                </CardContent>
              </Card>
             <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary" />
                    Recent Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                         <TableHead className="text-center">AI Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingApps && (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}>
                              <div className="p-4"><JobCardSkeleton /></div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {!isLoadingApps && filteredApplications && filteredApplications.length > 0 ? (
                        filteredApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="font-medium">{`${app.firstName} ${app.lastName}`}</div>
                              <div className="text-sm text-muted-foreground">{app.email}</div>
                            </TableCell>
                            <TableCell>{app.jobTitle}</TableCell>
                            <TableCell>{format(parseISO(app.createdAt), 'PP')}</TableCell>
                            <TableCell>
                              <Badge variant={app.status === 'submitted' ? 'secondary' : 'default'} className="capitalize">{app.status}</Badge>
                            </TableCell>
                             <TableCell className="text-center">
                              {app.screeningStatus === 'isScreening' ? (
                                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                              ) : app.aiAnalysis?.overallScore ? (
                                <Badge variant={app.aiAnalysis.overallScore > 80 ? 'default' : app.aiAnalysis.overallScore > 60 ? 'secondary': 'destructive'}>{app.aiAnalysis.overallScore}</Badge>
                              ) : (
                                <Badge variant="outline">N/A</Badge>
                              )}
                            </TableCell>
                             <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal size={16}/>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/admin_Hampton_Inn_2027/applications/${app.id}`}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            <span>View Details</span>
                                        </Link>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem asChild>
                                        <Link href={app.resumeUrl} target="_blank" download>
                                            <Download className="mr-2 h-4 w-4" />
                                            <span>Download Resume</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleScreenApplication(app)}
                                        disabled={isScreening || app.screeningStatus === 'completed'}
                                        >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        <span>
                                            {app.screeningStatus === 'completed' ? 'Screened' : 'Screen with AI'}
                                        </span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : null}
                       {!isLoadingApps && (!filteredApplications || filteredApplications.length === 0) && (
                         <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="font-semibold">No applications found for this period.</h3>
                            <p className="text-sm">Try adjusting the date range.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooterComponent>
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {filteredApplications?.length || 0} applications shown
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Download size={14} className="mr-2"/>
                                Export to CSV
                              </Button>
                              <Button size="sm">Bulk Actions</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableFooterComponent>
                  </Table>
                </CardContent>
              </Card>
        </div>
      </main>
      <Footer />

      <Dialog open={isReviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
            <DialogDescription>
              {editingJob ? 'Update the details for this job posting.' : 'Fill out the details below to create a new job posting.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-8 my-4">
              <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {currentStep > 1 ? <Check size={18} /> : '1'}
                  </div>
                  <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Job Details</span>
              </div>
              <div className={`flex-1 h-0.5 ${currentStep > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {currentStep > 2 ? <Check size={18} /> : '2'}
                  </div>
                  <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Application Method</span>
              </div>
          </div>


          <form onSubmit={handleFormSubmit} id="job-form" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
             {editingJob && <input type="hidden" {...form.register('id')} />}
            
            {currentStep === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="review-title">Job Title</Label>
                    <Input id="review-title" {...form.register('title')} />
                    {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="review-department">Department</Label>
                    <Input id="review-department" {...form.register('department')} />
                    {form.formState.errors.department && <p className="text-sm text-destructive">{form.formState.errors.department.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="review-city">Primary Location City</Label>
                            <Input id="review-city" {...form.register('city')} />
                            {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="review-state">State</Label>
                            <Input id="review-state" {...form.register('state')} />
                            {form.formState.errors.state && <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="remote-option">Does this position have a remote option?</Label>
                        <Controller
                            name="remoteOption"
                            control={form.control}
                            render={({ field }) => (
                                <Switch
                                    id="remote-option"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                    </div>

                    {remoteOptionValue && (
                        <div className="space-y-2">
                            <Label htmlFor="remote-type">Remote Type</Label>
                            <Controller
                                name="remoteType"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select a remote type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fully-remote-no-restrictions">Fully Remote, no location restrictions</SelectItem>
                                            <SelectItem value="fully-remote-chosen-locations">Fully Remote, within chosen locations</SelectItem>
                                            <SelectItem value="hybrid">Hybrid (some remote, some in-person)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.remoteType && <p className="text-sm text-destructive">{form.formState.errors.remoteType.message}</p>}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                    <Label htmlFor="review-description">Job Description</Label>
                    <Textarea
                        id="review-description"
                        {...form.register('description')}
                        rows={8}
                    />
                    {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
                    </div>
                </div>
            )}
            {currentStep === 2 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Application Method</Label>
                        <p className="text-sm text-muted-foreground">Define how candidates can apply for this position.</p>
                        <Controller
                            name="applicationMethod"
                            control={form.control}
                            render={({ field }) => (
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2 pt-2">
                                    <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                                        <RadioGroupItem value="enabled" id="enabled" />
                                        <Label htmlFor="enabled" className="flex flex-col gap-1 w-full">
                                            <span>Enabled (Default)</span>
                                            <span className="font-normal text-muted-foreground text-xs">Accept applications from your public careers page and third-party job boards.</span>
                                        </Label>
                                    </div>
                                     <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                                        <RadioGroupItem value="internal-only" id="internal-only" />
                                        <Label htmlFor="internal-only" className="flex flex-col gap-1 w-full">
                                            <span>Internal Only</span>
                                            <span className="font-normal text-muted-foreground text-xs">Only allow internal candidates to apply. Not shown on public career page.</span>
                                        </Label>
                                    </div>
                                     <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                                        <RadioGroupItem value="unlisted" id="unlisted" />
                                        <Label htmlFor="unlisted" className="flex flex-col gap-1 w-full">
                                            <span>Unlisted</span>
                                            <span className="font-normal text-muted-foreground text-xs">Share with a direct link, but not listed on the public careers page.</span>
                                        </Label>
                                    </div>
                                     <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                                        <RadioGroupItem value="disabled" id="disabled" />
                                        <Label htmlFor="disabled" className="flex flex-col gap-1 w-full">
                                            <span>Disabled</span>
                                            <span className="font-normal text-muted-foreground text-xs">This job is not accepting new applications at this time.</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            )}
                        />

                    </div>
                </div>
            )}
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
            >
              Cancel
            </Button>

            {currentStep === 1 && (
                <Button onClick={handleNextStep}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            )}

            {currentStep === 2 && (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                         <ArrowLeft className="mr-2 h-4 w-4"/>
                        Previous
                    </Button>
                    <Button
                    onClick={handleFormSubmit}
                    disabled={isSubmitting}
                    form="job-form"
                    type="submit"
                    >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        editingJob ? 'Save Changes' : 'Confirm and Create Job'
                    )}
                    </Button>
                </div>
            )}
            
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    