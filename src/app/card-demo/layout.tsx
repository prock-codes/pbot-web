import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Powerspike TCG',
  description: 'A trading card game for the Powerspike friend group',
  openGraph: {
    title: 'Powerspike TCG',
    description: 'A trading card game for the Powerspike friend group',
    images: ['/cards-meta.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Powerspike TCG',
    description: 'A trading card game for the Powerspike friend group',
    images: ['/cards-meta.jpg'],
  },
};

export default function CardDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
