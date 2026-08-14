import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="text-xl mb-4 font-medium">recompose</h1>
      <Link className="text-fd-foreground underline" to="/docs/$" params={{ _splat: '' }}>
        Open docs
      </Link>
    </main>
  );
}
