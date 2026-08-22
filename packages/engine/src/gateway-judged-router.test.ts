import { describe, expect, it } from 'vitest';

import {
  aJudgedModel,
  aJudgedModelOverElseAlone,
  childOverloaded,
  childServing,
  judgeNaming,
  judgeRefusing,
  rowsRaisedBy,
  servingJudged,
} from './gateway-judged-router.testkit';

describe('a conditional router serves the branch its judge named', () => {
  it('hands the request to the child behind the answered label', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());
    const answer = await scene.ask();

    expect(scene.reached()).toEqual(['coder']);
    expect(answer.status).toBe(200);
  });

  it('hands a differently judged request to the child behind that other label', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('chat'), childServing());

    await scene.ask();

    expect(scene.reached()).toEqual(['talker']);
  });

  it('asks the judge exactly once before the child carries the request', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());

    await scene.ask();

    expect(scene.askedJudge()).toHaveLength(1);
    expect(scene.sent.at(0)?.url).toContain('judge.test');
  });

  it('hands the judge every branch label with the rule a person wrote for it', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());

    await scene.ask();

    const asked = scene.askedJudge().at(0)?.body ?? '';

    expect(asked).toContain('asks to write or change code');
    expect(asked).toContain('small talk and questions');
    expect(asked).toContain('rename this function');
  });
});

describe('a conditional router refuses the request its judge could not classify', () => {
  it('refuses a rate-limited judge’s request rather than sending it to the else child', async () => {
    const scene = servingJudged(aJudgedModel(), judgeRefusing(), childServing());
    const answer = await scene.ask();

    expect(scene.reached()).toEqual([]);
    expect(answer.status).toBe(503);
  });

  it('spends no second call on a judge already standing down', async () => {
    const scene = servingJudged(aJudgedModel(), judgeRefusing(), childServing());

    await scene.ask();
    await scene.ask();

    expect(scene.askedJudge()).toHaveLength(1);
    expect(scene.reached()).toEqual([]);
  });

  it('sends an answer naming no branch to else after exactly two asks', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('weather'), childServing());

    await scene.ask();

    expect(scene.askedJudge()).toHaveLength(2);
    expect(scene.reached()).toEqual(['catchall']);
  });

  it('never hands the judge’s own refusal to the caller', async () => {
    const scene = servingJudged(aJudgedModel(), judgeRefusing(), childServing());
    const answer = await scene.ask();

    await expect(answer.text()).resolves.not.toContain('slow down');
  });
});

describe('a conversation keeps the branch its first request earned', () => {
  it('reaches the earned branch on the second turn with no classification call', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());

    await scene.ask();
    await scene.ask();

    expect(scene.askedJudge()).toHaveLength(1);
    expect(scene.reached()).toEqual(['coder', 'coder']);
  });

  it('judges a second conversation of its own', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());

    await scene.ask();
    await scene.ask({ model: 'fast', messages: [{ role: 'user', content: 'how are you' }] });

    expect(scene.askedJudge()).toHaveLength(2);
  });

  it('asks again on every request when the router is set to re-judge', async () => {
    const scene = servingJudged(aJudgedModel(true), judgeNaming('code'), childServing());

    await scene.ask();
    await scene.ask();

    expect(scene.askedJudge()).toHaveLength(2);
    expect(scene.reached()).toEqual(['coder', 'coder']);
  });

  it('never pins the branch trouble picked, so a recovered judge is asked again', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('weather'), childServing());

    await scene.ask();
    await scene.ask();

    expect(scene.reached()).toEqual(['catchall', 'catchall']);
    expect(scene.askedJudge()).toHaveLength(4);
  });
});

describe('the judge stays off the canvas the request paints', () => {
  it('raises a row for the child that carried the request and none for the judge', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childOverloaded());

    await scene.ask();

    expect(rowsRaisedBy(scene)).toContain('coder');
    expect(rowsRaisedBy(scene)).not.toContain('judge');
  });

  it('raises no row at all for a judge that refused the classification', async () => {
    const scene = servingJudged(aJudgedModel(), judgeRefusing(), childOverloaded());

    await scene.ask();

    expect(rowsRaisedBy(scene)).not.toContain('judge');
  });

  it('never names the judge among the children an exhausted router tried', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childOverloaded());
    const answer = await scene.ask();
    const said = await answer.text();

    expect(answer.status).toBe(502);
    expect(said).toContain('gpt-5-codex');
    expect(said).not.toContain('gpt-5-nano');
  });
});

describe('a router holding only its else child keeps its judge standing down', () => {
  it('spends no second call on the judge though no sibling target stands', async () => {
    const scene = servingJudged(aJudgedModelOverElseAlone(), judgeRefusing(), childServing());

    await scene.ask();
    await scene.ask({ model: 'fast', messages: [{ role: 'user', content: 'how are you' }] });

    expect(scene.askedJudge()).toHaveLength(1);
    expect(scene.reached()).toEqual([]);
  });
});
