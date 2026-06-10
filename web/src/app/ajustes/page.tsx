import { ToolPageHeader } from '@/components/ToolPageHeader';
import { AjustesClient } from './AjustesClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function AjustesPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="ajustes" />
      <AjustesClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
