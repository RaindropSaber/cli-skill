export interface SuccessResult<T extends object = object> {
  ok: true;
}

export interface FailureResult {
  ok: false;
  failureReason: string;
}

export function okResult<T extends object>(value: T): SuccessResult<T> & T {
  return {
    ok: true,
    ...value,
  };
}

export function failResult(failureReason: string): FailureResult {
  return {
    ok: false,
    failureReason,
  };
}
