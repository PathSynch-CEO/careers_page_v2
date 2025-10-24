
'use client';

import Image from 'next/image';
import { Quote } from 'lucide-react';
import { testimonials } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function TestimonialSection() {
  const testimonial = testimonials[0];
  const ceoImage = PlaceHolderImages.find(img => img.id === 'ceo-portrait');

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-1 flex flex-col items-center text-center">
              {ceoImage && (
                <Image
                  src={ceoImage.imageUrl}
                  alt={testimonial.name}
                  width={150}
                  height={150}
                  className="rounded-full object-cover mb-4 border-4 border-primary/20 shadow-lg"
                  data-ai-hint={ceoImage.imageHint}
                />
              )}
              <h4 className="font-bold text-lg font-headline">{testimonial.name}</h4>
              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
            </div>
            <div className="md:col-span-2 relative">
                <Quote className="w-16 h-16 text-primary/10 absolute -top-4 -left-4" fill="currentColor" />
                <blockquote className="text-lg italic text-foreground relative z-10">
                  {testimonial.quote}
                </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
