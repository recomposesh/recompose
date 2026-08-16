import { describe, expect, it } from 'vitest';

import { chartSubCaption, scopeSentence } from './usage-caption';

describe('the sentence under the chart title', () => {
  it('names the width and what a column height means', () => {
    expect(chartSubCaption('hour')).toBe('hour buckets · the column height is the window total');
  });

  it('follows the width the window actually draws', () => {
    expect(chartSubCaption('minute')).toContain('minute buckets');
    expect(chartSubCaption('day')).toContain('day buckets');
  });
});

describe('the sentence under the title', () => {
  it('reads all gateways and all providers while both filters stand on everything', () => {
    expect(scopeSentence({ gateways: [], providers: [], window: 'Last 24 hours' })).toBe(
      'All gateways · All providers · Last 24 hours',
    );
  });

  it('names one filtered member outright', () => {
    expect(scopeSentence({ gateways: ['relay'], providers: [], window: 'Last 7 days' })).toBe(
      'relay · All providers · Last 7 days',
    );
  });

  it('counts the members once a filter holds more than one', () => {
    expect(
      scopeSentence({
        gateways: ['relay', 'backup'],
        providers: ['Work key'],
        window: 'Last hour',
      }),
    ).toBe('2 gateways · Work key · Last hour');
  });
});
