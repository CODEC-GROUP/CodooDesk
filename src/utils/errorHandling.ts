export function createErrorResponse(error: unknown) {
  return {
    success: false,
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    error: error instanceof Error ? error.stack : String(error)
  };
}

export function createSuccessResponse<T>(data: T, message = 'Operation successful') {
  return {
    success: true,
    message,
    data
  };
} 