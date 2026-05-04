class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

const isApiError = (error) => Boolean(error) && typeof error.statusCode === 'number';

module.exports = {
  ApiError,
  isApiError,
};