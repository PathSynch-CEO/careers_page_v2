
import Link from 'next/link';
import { Linkedin, Twitter, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className="bg-muted dark:bg-background/50 border-t">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold font-headline text-foreground">PathSynch</h3>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PathSynch. All rights reserved.
            </p>
          </div>
          <nav className="flex gap-4">
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="https://www.linkedin.com/in/charles-berry-a66a3b5/" aria-label="LinkedIn" target="_blank">
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="#" aria-label="Twitter">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="#" aria-label="GitHub">
                <Github className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
