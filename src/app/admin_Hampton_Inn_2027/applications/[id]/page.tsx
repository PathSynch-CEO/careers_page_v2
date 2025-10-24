
'use client';

import React, { useEffect, useMemo, useState, useActionState, useTransition } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { notFound, useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Download,
  FileText,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  User,
  Star,
  Link as LinkIcon,
  Check,
  Award,
  ThumbsDown,
  Gift,
  Users,
  Target,
  GraduationCap,
  TrendingUp,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';

import { useFirestore } from '@/firebase';
import type { Application, Job, ApplicationStatus, AIScreeningAnalysis } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { updateApplicationStatus } from '@/lib/actions';
import { screenApplication } from '@/lib/admin-actions';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { Progress } from '@/components/ui/progress';

const statusPipeline: {
  status: ApplicationStatus;
  label: string;
  icon: React.ElementType;
}[] = [
  { status: 'submitted', label: 'Applied', icon: FileText },
  { status: 'feedback', label: 'Feedback', icon: MessageSquare },
  { status: 'interviewing', label: 'Interviewing', icon: Users },
  { status: 'offer', label: 'Made Offer', icon: Gift },
  { status: 'hired', label: 'Hired', icon: Award },
];

const disqualifiedStatus = {
  status: 'disqualified',
  label: 'Disqualified',
  icon: ThumbsDown,
};

const statusOrder: ApplicationStatus[] = statusPipeline.map(s => s.status);

const AnalysisCriterion = ({ title, icon: Icon, data }: { title: string, icon: React.ElementType, data?: { score: number, justification: string } }) => {
    if (!data) return null;
    return (
        <div>
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Icon size={16} className="text-primary"/> 
                {title}
            </h4>
            <div className="flex items-center gap-3 mb-1">
                <Progress value={data.score} className="h-2 w-24" />
                <span className="text-sm font-bold">{data.score}/100</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.justification}</p>
        </div>
    )
};


export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusPending, startStatusTransition] = useTransition();


  const [statusState, statusAction, isStatusUpdating] = useActionState(updateApplicationStatus, { success: false, message: '', status: '' });
  const [screenState, screenAction, isScreening] = useActionState(screenApplication, { success: false, message: '' });
  const [interviewQuestionsState, setInterviewQuestionsState] = useState<{ questions: string[]; isLoading: boolean; error: string | null }>({ questions: [], isLoading: false, error: null });

  useEffect(() => {
    if (!firestore || !id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const appRef = doc(firestore, 'applications', id);
        const appSnap = await getDoc(appRef);

        if (appSnap.exists()) {
          const appData = { id: appSnap.id, ...appSnap.data() } as Application;
          setApplication(appData);

          const jobRef = doc(firestore, 'jobs', appData.jobId);
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            setJob({ id: jobSnap.id, ...jobSnap.data() } as Job);
          }
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, id]);

  const showToast = (state: { success: boolean; message: string }, title: string) => {
    if (state.message) {
      toast({
        title: state.success ? 'Success!' : 'Error',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      });
    }
  };

  useEffect(() => showToast(statusState, 'Status Update'), [statusState]);
  useEffect(() => showToast(screenState, 'AI Screening'), [screenState]);

  useEffect(() => {
    if (statusState.success || screenState.success) {
        if (!id || !firestore) return;
        const appRef = doc(firestore, 'applications', id);
        getDoc(appRef).then(snap => {
            if(snap.exists()){
                const serverApp = {id: snap.id, ...snap.data()} as Application;
                setApplication(serverApp);
            }
        })
    }
  }, [statusState.success, screenState.success, firestore, id]);


  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (!application || application.status === newStatus || isStatusPending) return;
    const formData = new FormData();
    formData.append('applicationId', application.id);
    formData.append('status', newStatus);
    startStatusTransition(() => {
        statusAction(formData);
    });
  };
  
  const handleScreen = () => {
    if (!application) return;
    const formData = new FormData();
    formData.append('applicationId', application.id);
    screenAction(formData);
  }

  const handleGenerateQuestions = async () => {
      if(!application || !job) return;

      setInterviewQuestionsState({ questions: [], isLoading: true, error: null });
      try {
        const result = await generateInterviewQuestions({
            coverLetter: application.coverLetter,
            resume: `Experience: ${application.experienceYears} years. Key skills from resume: ${application.aiAnalysis?.extractedSkills?.join(', ') || 'N/A'}`
        })
        if(result.questions){
            setInterviewQuestionsState({ questions: result.questions, isLoading: false, error: null });
        } else {
            throw new Error('No questions were generated.');
        }

      } catch (error) {
         const message = error instanceof Error ? error.message : 'An unknown error occurred.';
         setInterviewQuestionsState({ questions: [], isLoading: false, error: message });
         toast({ title: 'Error Generating Questions', description: message, variant: 'destructive'})
      }
  }

  const currentStatusIndex = useMemo(() => {
    if (!application) return -1;
    return statusOrder.indexOf(application.status);
  }, [application]);

  const aiAnalysis = application?.aiAnalysis as AIScreeningAnalysis | undefined;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft size={16} className="mr-2" />
            Back to All Applications
          </Button>

          {isLoading ? (
            <ApplicationDetailSkeleton />
          ) : application && job ? (
            <div>
              <div className="mb-8">
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold font-headline">
                                    {application.firstName} {application.lastName}
                                </h1>
                                <p className="text-muted-foreground">
                                    Applying for <span className="font-semibold text-primary">{job.title}</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline">
                                    <Link href={application.resumeUrl} target="_blank" download>
                                        <Download className="mr-2" size={16} /> Resume
                                    </Link>
                                </Button>
                                <Button 
                                    onClick={handleScreen} 
                                    disabled={isScreening || application.screeningStatus === 'completed'}
                                >
                                    {isScreening && <Loader2 className="mr-2 animate-spin" />}
                                    <Sparkles className="mr-2" size={16} />
                                    {application.screeningStatus === 'completed' ? 'Screened' : 'Screen with AI'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
              </div>

            {/* Status Pipeline */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Application Pipeline</h2>
              <div className="flex items-center">
                {statusPipeline.map((stage, index) => (
                  <React.Fragment key={stage.status}>
                    <div className="flex flex-col items-center text-center gap-2">
                      <Button
                        size="icon"
                        variant={application.status === stage.status ? 'default' : 'outline'}
                        className={`rounded-full h-12 w-12 transition-all duration-300 ${application.status === stage.status ? 'ring-4 ring-primary/30' : ''}`}
                        onClick={() => handleStatusChange(stage.status)}
                        disabled={isStatusPending}
                      >
                        {isStatusPending && statusState.status === stage.status ? <Loader2 className="animate-spin"/> : <stage.icon size={20} />}
                      </Button>
                      <span className={`text-xs font-medium ${application.status === stage.status ? 'text-primary' : 'text-muted-foreground'}`}>{stage.label}</span>
                    </div>
                    {index < statusPipeline.length - 1 && <div className={`flex-1 h-1 mx-2 rounded-full ${currentStatusIndex > index ? 'bg-primary' : 'bg-muted'}`} />}
                  </React.Fragment>
                ))}
                <div className="flex-1 h-1 mx-2 bg-muted" />
                 <div className="flex flex-col items-center text-center gap-2">
                    <Button
                        size="icon"
                        variant={application.status === 'disqualified' ? 'destructive' : 'outline'}
                        className={`rounded-full h-12 w-12 transition-all duration-300 ${application.status === 'disqualified' ? 'ring-4 ring-destructive/30' : ''}`}
                        onClick={() => handleStatusChange(disqualifiedStatus.status)}
                        disabled={isStatusPending}
                    >
                         {isStatusPending && statusState.status === disqualifiedStatus.status ? <Loader2 className="animate-spin"/> : <disqualifiedStatus.icon size={20} />}
                    </Button>
                    <span className={`text-xs font-medium ${application.status === 'disqualified' ? 'text-destructive' : 'text-muted-foreground'}`}>{disqualifiedStatus.label}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Applicant Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div className="flex items-center gap-3"><Mail size={16} className="text-muted-foreground"/> <a href={`mailto:${application.email}`} className="text-primary hover:underline">{application.email}</a></div>
                             <div className="flex items-center gap-3"><Phone size={16} className="text-muted-foreground"/> <span>{application.phone}</span></div>
                             {application.linkedinUrl && <div className="flex items-center gap-3"><Linkedin size={16} className="text-muted-foreground"/> <a href={application.linkedinUrl} target="_blank" className="text-primary hover:underline">LinkedIn Profile</a></div>}
                             {application.portfolioUrl && <div className="flex items-center gap-3"><LinkIcon size={16} className="text-muted-foreground"/> <a href={application.portfolioUrl} target="_blank" className="text-primary hover:underline">Portfolio</a></div>}
                           </div>
                           <div className="grid grid-cols-2 gap-4 text-sm pt-4">
                             <div className="flex items-start gap-3"><Briefcase size={16} className="text-muted-foreground mt-1"/><div><p className="text-muted-foreground text-xs">Experience</p><p>{application.experienceYears} years</p></div></div>
                             <div className="flex items-start gap-3"><Calendar size={16} className="text-muted-foreground mt-1"/><div><p className="text-muted-foreground text-xs">Available From</p><p>{format(parseISO(application.availableStartDate), 'PP')}</p></div></div>
                           </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Cover Letter</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{application.coverLetter}</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>AI Generated Interview Questions</CardTitle>
                             <Button size="sm" onClick={handleGenerateQuestions} disabled={interviewQuestionsState.isLoading}>
                                 {interviewQuestionsState.isLoading && <Loader2 className="mr-2 animate-spin"/>}
                                 Generate Questions
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {interviewQuestionsState.isLoading && <div className="text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin h-8 w-8 text-primary"/> <p className="mt-2 text-sm">Generating questions...</p></div>}
                            {interviewQuestionsState.error && <p className="text-destructive text-sm">{interviewQuestionsState.error}</p>}
                            {interviewQuestionsState.questions.length > 0 && (
                                <ul className="space-y-3 text-sm list-decimal pl-5">
                                    {interviewQuestionsState.questions.map((q, i) => <li key={i}>{q}</li>)}
                                </ul>
                            )}
                            {!interviewQuestionsState.isLoading && interviewQuestionsState.questions.length === 0 && interviewQuestionsState.error === null && (
                                <p className="text-center text-muted-foreground text-sm py-4">Click "Generate Questions" to get AI-powered suggestions.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles size={18} className="text-primary" />
                                AI Screening Analysis
                            </CardTitle>
                             <CardDescription>
                                The overall score is a weighted average of the categories below.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {application.screeningStatus === 'pending' && <p className="text-sm text-muted-foreground text-center py-4">Run AI Screening to see analysis.</p>}
                            {application.screeningStatus === 'isScreening' && <div className="text-center py-4"><Loader2 className="mx-auto animate-spin h-8 w-8 text-primary"/> <p className="mt-2 text-sm text-muted-foreground">AI is screening...</p></div>}
                            {application.screeningStatus === 'completed' && aiAnalysis && (
                                <>
                                 <div className="text-center pb-4 border-b">
                                    <p className="text-xs text-muted-foreground">Overall Score</p>
                                    <p className="text-4xl font-bold text-primary">{aiAnalysis.overallScore}</p>
                                 </div>
                                 <div className="space-y-5 pt-4">
                                     <AnalysisCriterion title="Skills and Role Alignment" icon={Target} data={aiAnalysis.skillsAndRoleAlignment} />
                                     <AnalysisCriterion title="Years of Relevant Experience" icon={Briefcase} data={aiAnalysis.relevantExperience} />
                                     <AnalysisCriterion title="Educational Qualifications" icon={GraduationCap} data={aiAnalysis.education} />
                                     <AnalysisCriterion title="Quantifiable Achievements" icon={TrendingUp} data={aiAnalysis.quantifiableAchievements} />
                                      <div>
                                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Check size={16} className="text-primary"/> Extracted Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aiAnalysis.extractedSkills?.length > 0 ? aiAnalysis.extractedSkills.map((skill: string) => <Badge key={skill} variant="secondary">{skill}</Badge>) : <p className="text-xs text-muted-foreground">No skills extracted.</p>}
                                        </div>
                                     </div>
                                 </div>
                                </>
                            )}
                             {application.screeningStatus === 'error' && <p className="text-sm text-destructive text-center py-4">An error occurred during screening.</p>}
                             {application.screeningStatus === 'completed' && !aiAnalysis && <p className="text-sm text-destructive text-center py-4">Analysis data is missing. Please try screening again.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Hiring Team</CardTitle>
                            <CardDescription>
                                Manage the team working together to fill this position.{' '}
                                <Link href="#" className="text-primary hover:underline">Learn More</Link>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div>
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-sm">Individuals</h4>
                                <Button variant="secondary" size="sm">
                                    <PlusCircle size={14} className="mr-2"/>
                                    Add Team Members
                                </Button>
                             </div>
                             <div className="border rounded-lg p-6 text-center">
                                 <p className="text-sm text-muted-foreground">No individual users have been added to this position.</p>
                             </div>
                           </div>
                             <div>
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-sm">External Recruiters</h4>
                                <Button variant="secondary" size="sm">
                                    <PlusCircle size={14} className="mr-2"/>
                                    Add Recruiters
                                </Button>
                             </div>
                               <div className="border rounded-lg p-6 text-center">
                                 <p className="text-sm text-muted-foreground">No external recruiters have been added.</p>
                             </div>
                           </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ApplicationDetailSkeleton() {
  return (
    <div>
        <Card className="mb-8">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <Skeleton className="h-9 w-48 mb-2" />
                        <Skeleton className="h-5 w-64" />
                    </div>
                    <div className="flex gap-2">
                         <Skeleton className="h-10 w-28" />
                         <Skeleton className="h-10 w-36" />
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="mb-8">
            <Skeleton className="h-6 w-40 mb-4" />
             <div className="flex items-center">
                {[...Array(5)].map((_, index) => (
                  <React.Fragment key={index}>
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    {index < 4 && <Skeleton className="flex-1 h-1 mx-2" />}
                  </React.Fragment>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card><CardHeader><Skeleton className="h-6 w-32"/></CardHeader><CardContent><Skeleton className="h-20 w-full"/></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-32"/></CardHeader><CardContent><Skeleton className="h-32 w-full"/></CardContent></Card>
            </div>
             <div className="lg:col-span-1">
                <Card><CardHeader><Skeleton className="h-6 w-40"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
            </div>
        </div>
    </div>
  );
}
