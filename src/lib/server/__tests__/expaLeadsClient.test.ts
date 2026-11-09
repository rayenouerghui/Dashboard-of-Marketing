import { describe, expect, it } from 'vitest';
import { buildExpaLeadQuery } from '../expaLeadsClient';

describe('buildExpaLeadQuery', () => {
  it('uses the working EXPA application-based query shape', () => {
    const query = buildExpaLeadQuery(1);

    expect(query).toContain('allOpportunityApplication');
    expect(query).toContain('person_home_lc');
    expect(query).not.toContain('allPeople');
  });

  it('fetches every status so the funnel can see the drop-offs', () => {
    const query = buildExpaLeadQuery(1);

    expect(query).not.toContain('statuses');
    expect(query).toContain('person');
  });
});
