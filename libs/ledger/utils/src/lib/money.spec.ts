import { formatMoney, parseMoney } from './money';

describe('money', () => {
  describe('formatMoney', () => {
    it('formats positive cents as USD by default', () => {
      expect(formatMoney(123456)).toBe('$1,234.56');
      expect(formatMoney(100)).toBe('$1.00');
      expect(formatMoney(1)).toBe('$0.01');
    });

    it('formats negative cents with a leading minus before the symbol', () => {
      expect(formatMoney(-1234)).toBe('-$12.34');
      expect(formatMoney(-1)).toBe('-$0.01');
    });

    it('formats zero (and negative zero) without a stray minus sign', () => {
      expect(formatMoney(0)).toBe('$0.00');
      expect(formatMoney(-0)).toBe('$0.00');
    });

    it('honors currency/locale overrides', () => {
      expect(formatMoney(123456, { currency: 'EUR' })).toBe('€1,234.56');
    });
  });

  describe('parseMoney', () => {
    it('parses a plain integer/decimal string', () => {
      expect(parseMoney('1234.56')).toBe(123456);
      expect(parseMoney('1')).toBe(100);
    });

    it('tolerates $, commas, and surrounding whitespace', () => {
      expect(parseMoney('$1,234.56')).toBe(123456);
      expect(parseMoney('  $ 1,234.56  ')).toBe(123456);
    });

    it('parses negatives regardless of where the minus sign sits', () => {
      expect(parseMoney('-$12.34')).toBe(-1234);
      expect(parseMoney('$-12.34')).toBe(-1234);
      expect(parseMoney('-12.34')).toBe(-1234);
    });

    it('parses zero without producing -0', () => {
      expect(parseMoney('0')).toBe(0);
      expect(parseMoney('-0.00')).toBe(0);
    });

    it('throws on input with no digits', () => {
      expect(() => parseMoney('$-')).toThrow();
      expect(() => parseMoney('abc')).toThrow();
      expect(() => parseMoney('')).toThrow();
    });

    it('round-trips through formatMoney for a range of values', () => {
      const cases = [0, 1, 99, 100, 1234, 123456, -1, -1234, -123456, 29999, 1999];
      for (const cents of cases) {
        expect(parseMoney(formatMoney(cents))).toBe(cents);
      }
    });
  });
});
