import { ToolPageHeader } from '@/components/ToolPageHeader';
import { EditarTextoClient } from './EditarTextoClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function EditarTextoPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="editar-texto" />
      <EditarTextoClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
