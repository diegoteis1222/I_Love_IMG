import { ToolPageHeader } from '@/components/ToolPageHeader';
import { BordesClient } from './BordesClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function BordesPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="bordes" />
      <BordesClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
