import { ToolPageHeader } from '@/components/ToolPageHeader';
import { EliminarMarcaAguaClient } from './EliminarMarcaAguaClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function EliminarMarcaAguaPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="eliminar-marca-agua" />
      <EliminarMarcaAguaClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
