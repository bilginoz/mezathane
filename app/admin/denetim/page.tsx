export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuditLogViewer } from './_components/audit-log-viewer';

export default function AuditLogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <AuditLogViewer />
      <Footer />
    </div>
  );
}
