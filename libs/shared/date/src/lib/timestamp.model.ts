/** Generic Firebase-style timestamp shape (ported from @gigasoftware/api GigaTimeStamp). */
export interface NgeTimeStamp {
  nanoseconds: null | number;
  seconds: null | number;
}

/** Convert a Firebase-style timestamp to unix milliseconds. */
export function convertToUnixTimestamp(timeStamp: null | NgeTimeStamp): null | number {
  if (timeStamp && timeStamp.seconds !== null) {
    return timeStamp.seconds * 1000 + (timeStamp.nanoseconds || 0) / 1e6;
  }
  return null;
}
