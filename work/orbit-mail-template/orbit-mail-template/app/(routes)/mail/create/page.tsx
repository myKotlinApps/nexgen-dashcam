import { redirect } from 'next/navigation';

// Define the type for search params
interface CreatePageProps {
  searchParams: Promise<{
    to?: string;
    subject?: string;
    body?: string;
  }>;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = await searchParams;
  const toParam = params.to || 'someone@someone.com';
  redirect(
    `/mail/inbox?isComposeOpen=true&to=${encodeURIComponent(toParam)}${params.subject ? `&subject=${encodeURIComponent(params.subject)}` : ''}`,
  );
}

export async function generateMetadata({ searchParams }: CreatePageProps) {
  const params = await searchParams;
  const toParam = params.to || 'someone';
  const title = `Email ${toParam} on Orbit`;
  const description = 'Orbit - The future of email is here';

  return {
    title,
    description,
  };
}
