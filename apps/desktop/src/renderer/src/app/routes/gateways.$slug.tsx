import { gatewaySlugSchema } from '@recompose/contracts';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { GatewayCanvasPage } from '../../pages/gateway-canvas';
import {
  accountsQueryOptions,
  engineStatesQueryOptions,
  gatewaysQueryOptions,
} from '../../shared/api';
import { lookedAtGateway } from '../../shared/lib';

function parseSlug(rawSlug: string) {
  const result = gatewaySlugSchema.safeParse(rawSlug);

  if (!result.success) throw notFound();

  return { slug: result.data };
}

export const Route = createFileRoute('/gateways/$slug')({
  params: {
    parse: (params) => parseSlug(params.slug),
    stringify: (params) => params,
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(gatewaysQueryOptions),
      context.queryClient.ensureQueryData(accountsQueryOptions),
      context.queryClient.ensureQueryData(engineStatesQueryOptions),
    ]);
  },
  remountDeps: ({ params }) => params.slug,
  component: GatewayCanvasRoute,
});

function GatewayCanvasRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    lookedAtGateway(slug);
  }, [slug]);

  return (
    <GatewayCanvasPage
      onGatewayRemoved={() => {
        void navigate({ to: '/' });
      }}
      slug={slug}
    />
  );
}
