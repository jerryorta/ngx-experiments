import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';

import { computeAxisTickPositions, computeAxisTicks } from './compute-axis-ticks';

describe('computeAxisTickPositions', () => {
  it('centers one position per domain entry for a band scale', () => {
    const scale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);

    // bandwidth is 100 → each band is centered at its start + 50
    expect(computeAxisTickPositions(scale)).toEqual([50, 150, 250]);
  });

  it('honors the tick count for a linear scale (mirrors d3-axis)', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);
    const expected = scale.ticks(5).map(t => scale(t));

    expect(computeAxisTickPositions(scale, 5)).toEqual(expected);
    // d3 picks nice ticks 0,20,40,60,80,100 for count 5 over the [0,100] domain
    expect(computeAxisTickPositions(scale, 5)).toEqual([0, 100, 200, 300, 400, 500]);
  });

  it('falls back to d3 default ticks when no count is supplied', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);
    const expected = scale.ticks().map(t => scale(t));

    expect(computeAxisTickPositions(scale)).toEqual(expected);
    // the default tick count (10) yields more positions than an explicit count of 5
    expect(computeAxisTickPositions(scale).length).toBeGreaterThan(
      computeAxisTickPositions(scale, 5).length
    );
  });

  it('returns exact point positions for a point scale (bandwidth 0)', () => {
    const scale = scalePoint<string>().domain(['a', 'b', 'c']).range([0, 300]);

    expect(computeAxisTickPositions(scale)).toEqual([0, 150, 300]);
  });

  it('honors the tick count for a time scale (the other production continuous scale)', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2020, 0, 11)])
      .range([0, 500]);
    const expected = scale.ticks(5).map(t => scale(t));

    expect(computeAxisTickPositions(scale, 5)).toEqual(expected);
    expect(computeAxisTickPositions(scale, 5).length).toBeGreaterThan(0);
  });

  it('returns an empty array for a band scale with an empty domain (no data yet)', () => {
    const scale = scaleBand<string>().domain([]).range([0, 300]);

    expect(computeAxisTickPositions(scale)).toEqual([]);
  });

  it('projects exactly the positions the full tick model reports', () => {
    const band = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);
    const linear = scaleLinear().domain([0, 100]).range([0, 500]);

    expect(computeAxisTickPositions(band)).toEqual(computeAxisTicks(band).map(t => t.position));
    expect(computeAxisTickPositions(linear, 5)).toEqual(
      computeAxisTicks(linear, 5).map(t => t.position)
    );
  });
});

describe('computeAxisTicks', () => {
  it('pairs each band domain value with its centered position and String label', () => {
    const scale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);

    expect(computeAxisTicks(scale)).toEqual([
      { label: 'a', position: 50, value: 'a' },
      { label: 'b', position: 150, value: 'b' },
      { label: 'c', position: 250, value: 'c' },
    ]);
  });

  it('labels linear ticks via the scale tickFormat, honoring the tick count', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);
    const format = scale.tickFormat(5);
    const ticks = computeAxisTicks(scale, 5);

    // value = the domain tick, position = its projection, label = scale.tickFormat(count)(value)
    expect(ticks.map(t => t.value)).toEqual(scale.ticks(5));
    expect(ticks.map(t => t.position)).toEqual(scale.ticks(5).map(v => scale(v)));
    expect(ticks.map(t => t.label)).toEqual(scale.ticks(5).map(v => format(v)));
  });

  it('returns exact point positions with String labels for a point scale', () => {
    const scale = scalePoint<string>().domain(['a', 'b', 'c']).range([0, 300]);

    expect(computeAxisTicks(scale)).toEqual([
      { label: 'a', position: 0, value: 'a' },
      { label: 'b', position: 150, value: 'b' },
      { label: 'c', position: 300, value: 'c' },
    ]);
  });

  it('carries Date values with time-formatted labels for a time scale', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2020, 0, 11)])
      .range([0, 500]);
    const format = scale.tickFormat(5);
    const ticks = computeAxisTicks(scale, 5);

    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach(tick => {
      expect(tick.value).toBeInstanceOf(Date);
      expect(typeof tick.label).toBe('string');
    });
    expect(ticks.map(t => t.label)).toEqual(scale.ticks(5).map(v => format(v)));
  });

  it('falls back to domain projection with String labels for a tick-less, band-less scale', () => {
    // A minimal scale exposing only domain() + call projection (neither bandwidth nor ticks).
    const domainValues = [2, 5, 9];
    const fallbackScale = Object.assign((value: number) => value * 10, {
      domain: () => domainValues,
    });

    expect(computeAxisTicks(fallbackScale as never)).toEqual([
      { label: '2', position: 20, value: 2 },
      { label: '5', position: 50, value: 5 },
      { label: '9', position: 90, value: 9 },
    ]);
  });

  it('returns an empty array for an empty band domain', () => {
    const scale = scaleBand<string>().domain([]).range([0, 300]);

    expect(computeAxisTicks(scale)).toEqual([]);
  });
});
