import { ToolPageHeader } from '@/components/ToolPageHeader';
import { RedimensionarClient } from './RedimensionarClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function RedimensionarPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="redimensionar" />
      <RedimensionarClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
