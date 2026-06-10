import { ToolPageHeader } from '@/components/ToolPageHeader';
import { RecortarClient } from './RecortarClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function RecortarPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="recortar" />
      <RecortarClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
