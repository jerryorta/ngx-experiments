import { memoize } from '@nge/rxjs';
import { isEqual } from 'es-toolkit/compat';
import { pipe } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import type {
  NgeChartDimensions,
  NgeCommonChartConfig,
  NgeJSONDOMRect,
  NgeSizeConfigDimensions,
} from '../chart.models';

export function getJSONDOMRectReadOnly(d: DOMRectReadOnly): NgeJSONDOMRect {
  return <NgeJSONDOMRect>d.toJSON();
}

export const processConfig = pipe(distinctUntilChanged(isEqual), debounceTime(20), memoize());

/**
 *
 * @param config: NgeCommonChartConfig
 * @param size: NgeJSONDOMRect
 */
export function calculateDimensions(
  config: NgeCommonChartConfig,
  size: NgeJSONDOMRect
): NgeSizeConfigDimensions {
  const dimensions: NgeChartDimensions = {
    boundedHeight: 0,
    boundedWidth: 0,
    height: null,
    margin: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
    width: null,
  };

  dimensions.width =
    config.width !== undefined && config.width !== null ? config.width : size.width;
  dimensions.height =
    config.height !== undefined && config.height !== null ? config.height : size.height;

  if (config.margin) {
    dimensions.margin.top = config.margin.top || 0;
    dimensions.margin.right = config.margin.right || 0;
    dimensions.margin.bottom = config.margin.bottom || 0;
    dimensions.margin.left = config.margin.left || 0;
  }

  dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  return <NgeSizeConfigDimensions>{
    config,
    dimensions,
    size,
  };
}

/**
 * https://stackoverflow.com/a/24941988
 * @param obj
 */
export function isString(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object String]';
}

/**
 * https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
 * @param n
 */
export function isNumeric(n: any): boolean {
  return (
    !(Object.prototype.toString.call(n) === '[object String]') &&
    !Number.isNaN(parseFloat(n)) &&
    Number.isFinite(n)
  );
}

export function toFloatOrDefault(v: any, _default = 0): number {
  return isNumeric(parseFloat(v)) ? parseFloat(v) : _default;
}

export function zeroIfUndefinedOrNull(v: null | number | undefined): number {
  if (isString(v) || !isNumeric(v)) {
    return 0;
  } else {
    return <number>v;
  }
}

export type SetToRangeFn = (v: number) => number;

export function setToRange(min: number, max: number): SetToRangeFn {
  const _min = zeroIfUndefinedOrNull(min);
  const _max = zeroIfUndefinedOrNull(max);
  return (v: number): number => {
    const _v = zeroIfUndefinedOrNull(v);

    if (_v < _min) {
      return _min;
    } else if (_v > _max) {
      return _max;
    }
    return _v;
  };
}
