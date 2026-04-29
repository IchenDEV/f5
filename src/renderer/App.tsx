import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function App(): React.JSX.Element {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-5xl font-semibold tracking-normal">f5</CardTitle>
          <CardDescription>Electron + React + Vite + Tailwind CSS + shadcn/ui</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              OpenSpec ready
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-4">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Runtime</dt>
              <dd className="mt-2 font-medium">Electron</dd>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Renderer</dt>
              <dd className="mt-2 font-medium">React + Vite</dd>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Platform</dt>
              <dd className="mt-2 font-medium">{window.f5.platform}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
