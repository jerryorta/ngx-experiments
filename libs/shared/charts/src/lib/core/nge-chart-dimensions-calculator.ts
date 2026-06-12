import type { NgeD3CanvasDimension } from './chart.models';

export class NgeChartDimensionsCalculator {
  private _dimensions: NgeD3CanvasDimension = {
    height: 0,
    margin: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
    width: 0,
  };

  get dimensions() {
    return this._dimensions;
  }

  wrapper = null;
  bounds = null;

  // Values must be greater than or equal to 0 to prevent any issues
  // if a DOM container element outputs a negative value in dimensions
  // for some reason. This is rare, but occasionally happens during
  // angular render phase.
  //
  static atLeastZero(v: number): number {
    return v >= 0 ? v : 0;
  }

  get width() {
    return this._dimensions.width;
  }

  get height() {
    return this._dimensions.height;
  }

  get margin() {
    return this._dimensions.margin;
  }

  get boundedWidth() {
    return NgeChartDimensionsCalculator.atLeastZero(
      this._dimensions.width - this._dimensions.margin.left - this._dimensions.margin.right
    );
  }

  get boundedHeight() {
    return NgeChartDimensionsCalculator.atLeastZero(
      this._dimensions.height - this._dimensions.margin.top - this._dimensions.margin.bottom
    );
  }

  get centerBoundsWidth() {
    return this.boundedWidth / 2;
  }

  get centerBoundsHeight() {
    return this.boundedHeight / 2;
  }

  constructor(config: NgeD3CanvasDimension) {
    this.config(config);
  }

  resize(d: DOMRectReadOnly) {
    this._dimensions.width = NgeChartDimensionsCalculator.atLeastZero(d.width);
    this._dimensions.height = NgeChartDimensionsCalculator.atLeastZero(d.height);
  }

  private config(d: NgeD3CanvasDimension) {
    this._dimensions.margin.top = NgeChartDimensionsCalculator.atLeastZero(d.margin.top);
    this._dimensions.margin.right = NgeChartDimensionsCalculator.atLeastZero(d.margin.right);
    this._dimensions.margin.bottom = NgeChartDimensionsCalculator.atLeastZero(d.margin.bottom);
    this._dimensions.margin.left = NgeChartDimensionsCalculator.atLeastZero(d.margin.left);
  }
}
