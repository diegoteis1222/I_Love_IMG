import { ToolPageHeader } from '@/components/ToolPageHeader';
import { ComprimirClient } from './ComprimirClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function ComprimirPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="comprimir" />
      <ComprimirClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
