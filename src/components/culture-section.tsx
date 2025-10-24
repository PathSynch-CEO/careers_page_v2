
'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { cultures } from '@/lib/data';

export default function CultureSection() {
  return (
    <section id="culture" className="w-full py-12 md:py-24 lg:py-32 bg-muted/40 dark:bg-muted/20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl text-primary">
              Why PathSynch?
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We're a team of innovators passionate about empowering local businesses. Learn more about our mission and what it's like to work with us.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12">
            <Carousel 
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {cultures.map((item, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                      <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300">
                        <CardContent className="flex flex-col items-start gap-4 p-6 flex-1">
                            <div className="p-3 rounded-full bg-primary/10">
                                <item.icon className="w-8 h-8 text-primary" strokeWidth={1.5}/>
                            </div>
                            <h3 className="text-xl font-bold font-headline">{item.title}</h3>
                            <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex"/>
              <CarouselNext className="hidden sm:flex"/>
            </Carousel>
        </div>
      </div>
    </section>
  );
}
