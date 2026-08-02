/** Error with an HTTP status, thrown by routes/validators and caught by middleware. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Short, single-line, user-safe message from any thrown value. */
export function errorMessage(error, maxLength = 500) {
  return String(error?.message || error).slice(0, maxLength);
}
