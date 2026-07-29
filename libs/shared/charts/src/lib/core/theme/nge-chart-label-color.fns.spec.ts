import {
  NGE_CHART_DARK_FILL_LIGHTNESS,
  NGE_CHART_TOKEN_FALLBACKS,
  resolveNgeChartThemeColor,
  resolveLabelColor,
  toCssFontSize,
} from './nge-chart-label-color.fns';

/** A perceptually DARK fill (Lab L* well below the threshold). */
const DARK_FILL = '#101820';

/** A perceptually LIGHT fill (Lab L* well above the threshold). */
const LIGHT_FILL = '#fff3c4';

const THEME = { color: '#000000', colorOnDark: '#ffffff' };

describe('resolveNgeChartThemeColor', () => {
  it('passes a concrete colour through untouched', () => {
    expect(resolveNgeChartThemeColor(null, '#ff0000', '#cccccc')).toBe('#ff0000');
  });

  it('returns the supplied fallback for an empty value', () => {
    expect(resolveNgeChartThemeColor(null, '', '#cccccc')).toBe('#cccccc');
  });

  it('falls back to the token map when the custom property does not resolve', () => {
    // jsdom returns '' for a custom property, so this is the live path under Jest.
    expect(resolveNgeChartThemeColor(null, 'var(--nge-chart-primary)', '#cccccc')).toBe(
      NGE_CHART_TOKEN_FALLBACKS['--nge-chart-primary']
    );
  });

  it('honours the token map for the absolute white / black tokens', () => {
    expect(resolveNgeChartThemeColor(null, 'var(--nge-chart-white, #ffffff)', '')).toBe(
      '#ffffff'
    );
    expect(resolveNgeChartThemeColor(null, 'var(--nge-chart-black, #000000)', '')).toBe(
      '#000000'
    );
  });

  it('falls back to the supplied default for an unknown token', () => {
    expect(resolveNgeChartThemeColor(null, 'var(--nge-chart-nope)', '#cccccc')).toBe('#cccccc');
  });

  it('reads the resolved custom property off the node when one is available', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ getPropertyValue: () => ' #abcdef ' } as unknown as CSSStyleDeclaration);

    expect(resolveNgeChartThemeColor(el, 'var(--nge-chart-primary)', '#cccccc')).toBe('#abcdef');

    jest.restoreAllMocks();
    el.remove();
  });
});

describe('resolveLabelColor', () => {
  it('rung 1 — a per-datum colour wins over every other rung', () => {
    expect(
      resolveLabelColor({
        configColor: '#00ff00',
        datumColor: '#ff0000',
        fill: DARK_FILL,
        node: null,
        theme: THEME,
      })
    ).toBe('#ff0000');
  });

  it('rung 2 — a layer-config colour wins over derived contrast and the theme', () => {
    expect(
      resolveLabelColor({
        configColor: '#00ff00',
        fill: DARK_FILL,
        node: null,
        theme: THEME,
      })
    ).toBe('#00ff00');
  });

  it('rung 3 — derives colorOnDark from a perceptually dark fill', () => {
    expect(resolveLabelColor({ fill: DARK_FILL, node: null, theme: THEME })).toBe('#ffffff');
  });

  it('rung 3 — derives color from a perceptually light fill', () => {
    expect(resolveLabelColor({ fill: LIGHT_FILL, node: null, theme: THEME })).toBe('#000000');
  });

  it('rung 3 — resolves a var() fill before measuring it', () => {
    // --nge-chart-primary falls back to #1976d2, which is dark → colorOnDark.
    expect(resolveLabelColor({ fill: 'var(--nge-chart-primary)', node: null, theme: THEME })).toBe(
      '#ffffff'
    );
  });

  it('rung 4 — an unparseable fill falls through to the theme colour', () => {
    expect(resolveLabelColor({ fill: 'not-a-colour', node: null, theme: THEME })).toBe('#000000');
  });

  it('rung 4 — an EMPTY fill falls through to the theme colour (label not on the mark)', () => {
    // How a layer opts a label out of derivation: bar value labels and the funnel's
    // 'edge' / 'right' labels sit on the plot surface, not on a data fill.
    expect(resolveLabelColor({ fill: '', node: null, theme: THEME })).toBe('#000000');
  });

  it('rung 4 — a theme with no colorOnDark never derives, whatever the fill', () => {
    expect(resolveLabelColor({ fill: DARK_FILL, node: null, theme: { color: '#123456' } })).toBe(
      '#123456'
    );
  });

  it('the two explicit rungs still apply when the label is not on a fill', () => {
    expect(resolveLabelColor({ datumColor: '#ff0000', fill: '', node: null, theme: THEME })).toBe(
      '#ff0000'
    );
    expect(resolveLabelColor({ configColor: '#00ff00', fill: '', node: null, theme: THEME })).toBe(
      '#00ff00'
    );
  });

  it('splits at the documented lightness threshold', () => {
    // hsl() lets the L* be dialled either side of the threshold without hardcoding hexes.
    const below = resolveLabelColor({
      fill: `hsl(0, 0%, ${NGE_CHART_DARK_FILL_LIGHTNESS - 20}%)`,
      node: null,
      theme: THEME,
    });
    const above = resolveLabelColor({
      fill: `hsl(0, 0%, ${NGE_CHART_DARK_FILL_LIGHTNESS + 20}%)`,
      node: null,
      theme: THEME,
    });

    expect(below).toBe('#ffffff');
    expect(above).toBe('#000000');
  });
});

describe('toCssFontSize', () => {
  it('treats a number as px', () => {
    expect(toCssFontSize(18)).toBe('18px');
  });

  it('passes a string through verbatim so a token reference survives', () => {
    expect(toCssFontSize('var(--nge-chart-label-font-size, 10px)')).toBe(
      'var(--nge-chart-label-font-size, 10px)'
    );
    expect(toCssFontSize('1rem')).toBe('1rem');
  });
});
