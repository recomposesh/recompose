import { createFileRoute } from '@tanstack/react-router';

import { NotFoundScreen } from '../components/not-found-screen';

export const Route = createFileRoute('/404')({
  component: NotFoundScreen,
});
