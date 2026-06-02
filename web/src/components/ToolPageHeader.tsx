import Link from 'next/link';
import { getToolBySlug } from '@/lib/tools';

interface Props {
  slug: string;
}

export function ToolPageHeader({ slug }: Props) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  return (
    <header className="mb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition"
      >
        ← Volver
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-brand-50 flex items-center justify-center text-2xl">
          {tool.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tool.name}</h1>
          <p className="text-sm text-slate-600">{tool.description}</p>
        </div>
      </div>
    </header>
  );
}
