import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold">Student profile</h1>
        <Card>
          <CardHeader><CardTitle className="font-mono text-sm">{id}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Per-student timeline, photo and embeddings count land here once the DB migration is applied.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
