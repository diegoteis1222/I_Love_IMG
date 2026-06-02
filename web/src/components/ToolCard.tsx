import Link from 'next/link';
import { clsx } from 'clsx';
import type { Tool } from '@/lib/tools';

interface Props {
  tool: Tool;
}

export function ToolCard({ tool }: Props) {
  const isAvailable = tool.status === 'available';

  const content = (
    <div
      className={clsx(
        'card p-5 h-full transition group',
        isAvailable
          ? 'hover:border-brand-400 hover:shadow-md cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'h-11 w-11 rounded-lg flex items-center justify-center text-2xl shrink-0',
            isAvailable ? 'bg-brand-50 group-hover:bg-brand-100' : 'bg-slate-100'
          )}
        >
          {tool.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">
              {tool.name}
            </h3>
            {!isAvailable && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Próximamente
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>
    </div>
  );

  if (!isAvailable) return content;

  return (
    <Link href={`/${tool.slug}`} className="block h-full">
      {content}
    </Link>
  );
}
