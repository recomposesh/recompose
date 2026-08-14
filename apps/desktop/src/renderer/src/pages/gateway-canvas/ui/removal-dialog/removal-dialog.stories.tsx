import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { RemovalDialog } from './removal-dialog';

const asked = {
  name: 'fast',
  onConfirm: () => undefined,
  onCancel: () => undefined,
};

const meta = preview.meta({
  component: RemovalDialog,
  args: { removal: { ...asked, kind: 'target' as const } },
  render: (args) => (
    <div className="h-64 w-96 bg-surface-content dot-grid">
      <RemovalDialog {...args} />
    </div>
  ),
});

/** The question, found the way a person reading the screen finds it rather than through the markup. */
function theQuestion(): HTMLElement {
  return screen.getByRole('dialog');
}

export const BoundTarget = meta.story({
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the target "fast"?');
    void expect(theQuestion()).toHaveTextContent('returns to the canvas as a draft');
  },
});

/** A target under a router costs its own binding and nothing else, which the wording has to say. */
export const TargetUnderARouter = meta.story({
  args: { removal: { ...asked, kind: 'child-target' as const, name: 'work' } },
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the target "work"?');
    void expect(theQuestion()).toHaveTextContent('everything else that router holds keeps serving');
  },
});

/** The entry router takes the whole ladder, which is the most expensive answer on this canvas. */
export const EntryRouter = meta.story({
  args: { removal: { ...asked, kind: 'router' as const, name: 'Failover' } },
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the router "Failover"?');
    void expect(theQuestion()).toHaveTextContent('The whole ladder goes with it');
  },
});

export const RouterUnderARouter = meta.story({
  args: { removal: { ...asked, kind: 'child-router' as const, name: 'Round-robin' } },
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the router "Round-robin"?');
    void expect(theQuestion()).toHaveTextContent('every child standing under it goes too');
  },
});

export const VirtualModel = meta.story({
  args: { removal: { ...asked, kind: 'virtual-model' as const } },
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the virtual model "fast"?');
    void expect(theQuestion()).toHaveTextContent('clients stop being served under its id');
  },
});

export const Gateway = meta.story({
  args: { removal: { ...asked, kind: 'gateway' as const, name: 'Codex' } },
  play: () => {
    void expect(theQuestion()).toHaveTextContent('Delete the gateway "Codex"?');
    void expect(theQuestion()).toHaveTextContent('its whole composition leaves this app');
  },
});

/** Nothing stands over the canvas while no press has asked anything. */
export const NothingAsked = meta.story({
  args: { removal: undefined },
  play: () => {
    void expect(screen.queryByRole('dialog')).toBeNull();
  },
});
