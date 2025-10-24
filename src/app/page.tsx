
import Header from '@/components/header';
import Footer from '@/components/footer';
import HomePageClient from '@/components/home-page-client';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header /> */}
      <main className="flex-1">
        <HomePageClient />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
