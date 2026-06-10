import { ToolPageHeader } from '@/components/ToolPageHeader';
import { FiltrosClient } from './FiltrosClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function FiltrosPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="filtros" />
      <FiltrosClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
