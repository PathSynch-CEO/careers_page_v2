
'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  const scrollToJobs = () => {
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="about" className="w-full py-20 md:py-32 lg:py-40">
      <div className="container mx-auto text-center px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold font-headline tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Build the Future of Local Commerce
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Join PathSynch and help us create tools that empower small businesses to thrive in a digital world. We're looking for passionate problem-solvers to join our mission.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={scrollToJobs} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              See Open Positions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
