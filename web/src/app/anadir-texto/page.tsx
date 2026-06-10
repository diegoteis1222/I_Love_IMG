import { ToolPageHeader } from '@/components/ToolPageHeader';
import { AnadirTextoClient } from './AnadirTextoClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function AnadirTextoPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="anadir-texto" />
      <AnadirTextoClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
