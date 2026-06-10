import { ToolPageHeader } from '@/components/ToolPageHeader';
import { MarcaAguaClient } from './MarcaAguaClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function MarcaAguaPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="marca-agua" />
      <MarcaAguaClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
