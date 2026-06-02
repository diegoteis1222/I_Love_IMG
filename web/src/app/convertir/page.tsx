import { ToolPageHeader } from '@/components/ToolPageHeader';
import { ConvertirClient } from './ConvertirClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function ConvertirPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="convertir" />
      <ConvertirClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
