import { ToolPageHeader } from '@/components/ToolPageHeader';
import { FaviconClient } from './FaviconClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function FaviconPackPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="favicon-pack" />
      <FaviconClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
