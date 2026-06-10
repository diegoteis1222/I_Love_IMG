import { ToolPageHeader } from '@/components/ToolPageHeader';
import { RotarClient } from './RotarClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function RotarPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="rotar" />
      <RotarClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
