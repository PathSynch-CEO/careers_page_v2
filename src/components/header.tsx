
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Rocket, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ThemeToggle from '@/components/theme-toggle';
import { useAuthContext } from '@/lib/auth-provider';
import { logout } from '@/lib/auth-actions';
import { useActionState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isUserLoading } = useAuthContext();
  const [state, formAction, isPending] = useActionState(logout, { success: false, message: '' });

  const navLinks = [
    { href: '#jobs', label: 'Open Roles' },
    { href: '#culture', label: 'Culture' },
    { href: '#about', label: 'About Us' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold font-headline text-lg">
          <Rocket className="h-6 w-6 text-primary" />
          PathSynch
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!isUserLoading && user && (
            <form action={formAction}>
              <Button variant="ghost" size="icon" type="submit" disabled={isPending} aria-label="Log out">
                  <LogOut className="h-5 w-5" />
              </Button>
            </form>
          )}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-6 p-6">
                  <Link href="/" className="flex items-center gap-2 font-bold font-headline text-lg" onClick={() => setIsMenuOpen(false)}>
                    <Rocket className="h-6 w-6 text-primary" />
                    PathSynch
                  </Link>
                  <nav className="flex flex-col gap-4">
                    {navLinks.map(link => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
