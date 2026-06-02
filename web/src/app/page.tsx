import { TOOLS, CATEGORIES } from '@/lib/tools';
import { ToolCard } from '@/components/ToolCard';
import { APP_NAME } from '@/lib/config';

export default function HomePage() {
  // Agrupamos por categoría para que la home crezca de forma ordenada cuando añadamos más tools
  const grouped = TOOLS.reduce<Record<string, typeof TOOLS>>((acc, tool) => {
    (acc[tool.category] ||= []).push(tool);
    return acc;
  }, {});

  return (
    <div className="container-app py-12">
      <header className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Uso interno
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
          {APP_NAME}
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Convierte, comprime y edita imágenes sin que salgan del perímetro de la
          empresa.
        </p>
      </header>

      <div className="space-y-12">
        {(Object.keys(grouped) as Array<keyof typeof CATEGORIES>).map((cat) => (
          <section key={cat}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              {CATEGORIES[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[cat].map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
