import { ToolPageHeader } from '@/components/ToolPageHeader';
import { EliminarMetadatosClient } from './EliminarMetadatosClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function EliminarMetadatosPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="eliminar-metadatos" />
      <EliminarMetadatosClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
