import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-xl font-medium">recompose</h1>
      <Link className="text-fd-foreground underline" to="/docs/$" params={{ _splat: '' }}>
        Open docs
      </Link>
    </main>
  );
}
