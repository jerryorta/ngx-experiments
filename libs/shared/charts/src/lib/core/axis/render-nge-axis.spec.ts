import type { Selection } from 'd3-selection';

import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartAxisTheme } from './nge-axis.models';

import { renderNgeAxis } from './render-nge-axis';

const SVG_NS = 'http://www.w3.org/2000/svg';

const THEME: NgeChartAxisTheme = {
  lineColor: '#111111',
  lineWidth: 2,
  tickColor: '#222222',
  tickFontSize: 12,
};

/** Fresh detached <g> (in the SVG namespace so children inherit it) + a d3 selection over it. */
function makeGroup(): {
  group: Selection<SVGGElement, unknown, null, undefined>;
  node: SVGGElement;
} {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const node = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  svg.appendChild(node);
  document.body.appendChild(svg);
  return { group: select(node), node };
}

describe('renderNgeAxis', () => {
  it('renders a horizontal baseline and centered tick labels for a bottom band axis', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);

    renderNgeAxis(group, { axisTheme: THEME, orient: 'bottom', scale });

    const domain = node.querySelector('.domain');
    expect(domain).not.toBeNull();
    expect(domain?.getAttribute('d')).toBe('M0,0H300');
    expect((domain as SVGPathElement).style.stroke).toBe('#111111');
    expect((domain as SVGPathElement).style.strokeWidth).toBe('2px');
    expect(domain?.getAttribute('fill')).toBe('none');

    const ticks = node.querySelectorAll('.tick');
    expect(ticks.length).toBe(3);
    // Every tick holds exactly one <text> and NO <line> (marks are suppressed).
    expect(node.querySelectorAll('.tick text').length).toBe(3);
    expect(node.querySelectorAll('.tick line').length).toBe(0);

    // Centered band positions, transform along x (translateX).
    expect(ticks[0].getAttribute('transform')).toBe('translate(50,0)');
    expect(ticks[1].getAttribute('transform')).toBe('translate(150,0)');
    expect(ticks[2].getAttribute('transform')).toBe('translate(250,0)');

    const firstText = ticks[0].querySelector('text') as SVGTextElement;
    expect(firstText.textContent).toBe('a');
    expect(firstText.getAttribute('y')).toBe('8'); // k * spacing = 1 * 8
    expect(firstText.getAttribute('dy')).toBe('0.71em');
    expect(firstText.getAttribute('text-anchor')).toBe('middle');
    expect(firstText.getAttribute('transform')).toBeNull(); // no rotation
    expect(firstText.style.fill).toBe('#222222');
    expect(firstText.style.fontSize).toBe('12px');
  });

  it('renders a vertical baseline and end-anchored labels for a left axis', () => {
    const { group, node } = makeGroup();
    // Inverted range (y scales go top→bottom): domain 0 at pixel 300, 100 at pixel 0.
    const scale = scaleLinear().domain([0, 100]).range([300, 0]);

    renderNgeAxis(group, { axisTheme: THEME, orient: 'left', scale, ticks: 5 });

    const domain = node.querySelector('.domain');
    expect(domain?.getAttribute('d')).toBe('M0,300V0');

    const firstTick = node.querySelector('.tick') as SVGGElement;
    // Vertical axis → transform along y (translateY), x untouched.
    expect(firstTick.getAttribute('transform')).toMatch(/^translate\(0,/);

    const text = firstTick.querySelector('text') as SVGTextElement;
    expect(text.getAttribute('x')).toBe('-8'); // k * spacing = -1 * 8
    expect(text.getAttribute('dy')).toBe('0.32em');
    expect(text.getAttribute('text-anchor')).toBe('end');
    expect(node.querySelectorAll('.tick line').length).toBe(0);
  });

  it('start-anchors labels on the far side for a right axis', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([300, 0]);

    renderNgeAxis(group, { axisTheme: THEME, orient: 'right', scale, ticks: 5 });

    expect(node.querySelector('.domain')?.getAttribute('d')).toBe('M0,300V0');
    const text = node.querySelector('.tick text') as SVGTextElement;
    expect(text.getAttribute('x')).toBe('8'); // k * spacing = 1 * 8
    expect(text.getAttribute('dy')).toBe('0.32em');
    expect(text.getAttribute('text-anchor')).toBe('start');
  });

  it('renders a horizontal baseline with centered labels ABOVE it for a top axis', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderNgeAxis(group, { axisTheme: THEME, orient: 'top', scale, ticks: 5 });

    // Horizontal baseline like a bottom axis (the caller seats the group at the plot top).
    expect(node.querySelector('.domain')?.getAttribute('d')).toBe('M0,0H500');
    const text = node.querySelector('.tick text') as SVGTextElement;
    expect(text.getAttribute('y')).toBe('-8'); // k * spacing = -1 * 8 → labels above the line
    expect(text.getAttribute('dy')).toBe('0em');
    expect(text.getAttribute('text-anchor')).toBe('middle');
    expect(node.querySelectorAll('.tick line').length).toBe(0);
  });

  it('rotates bottom-axis labels and applies the matching anchor/offset nudges', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(['jan', 'feb']).range([0, 200]);

    renderNgeAxis(group, {
      axisTheme: THEME,
      orient: 'bottom',
      scale,
      tickRotation: -45,
    });

    const text = node.querySelector('.tick text') as SVGTextElement;
    expect(text.getAttribute('transform')).toBe('rotate(-45)');
    expect(text.getAttribute('text-anchor')).toBe('end'); // rotation < 0
    expect(text.getAttribute('dx')).toBe('-0.5em');
    expect(text.getAttribute('dy')).toBe('0.25em');
  });

  it('prefers an explicit tickFormat over the scale label', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderNgeAxis(group, {
      axisTheme: THEME,
      orient: 'bottom',
      scale,
      tickFormat: d => `$${d}`,
      ticks: 5,
    });

    node.querySelectorAll('.tick text').forEach(text => {
      expect(text.textContent?.startsWith('$')).toBe(true);
    });
  });

  it('reuses the group on re-render, removing exited ticks (keyed join)', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);

    renderNgeAxis(group, { axisTheme: THEME, orient: 'bottom', scale });
    expect(node.querySelectorAll('.tick').length).toBe(3);

    // Shrink the domain → the 'c' tick must exit; a single .domain path persists.
    scale.domain(['a', 'b']);
    renderNgeAxis(group, { axisTheme: THEME, orient: 'bottom', scale });
    expect(node.querySelectorAll('.tick').length).toBe(2);
    expect(node.querySelectorAll('.domain').length).toBe(1);
  });
});
