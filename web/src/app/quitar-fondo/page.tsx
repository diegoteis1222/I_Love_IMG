import { ToolPageHeader } from '@/components/ToolPageHeader';
import { QuitarFondoClient } from './QuitarFondoClient';
import { MAX_FILE_SIZE_MB } from '@/lib/config';

export default function QuitarFondoPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <ToolPageHeader slug="quitar-fondo" />
      <QuitarFondoClient maxSizeMB={MAX_FILE_SIZE_MB} />
    </div>
  );
}
