import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="container-app h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition">
            {APP_NAME}
          </span>
        </Link>
        <nav className="text-sm text-slate-600">
          <Link href="/" className="hover:text-brand-600 transition">
            Herramientas
          </Link>
        </nav>
      </div>
    </header>
  );
}
