export class ErrorUtil {
static toError(error: unknown): Error {
  if (error instanceof Error) return error;

  try {
    const message = typeof error === 'string'
      ? error
      : (error as any)?.message ?? JSON.stringify(error);
    
    return new Error(message || 'Unknown Error Occurred ❌.');
  } catch {
    return new Error('Unknown Error Occurred ❌.');
  }
}

  static getMessage(error: unknown): string {
    return ErrorUtil.toError(error).message;
  }

  static getStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }
}