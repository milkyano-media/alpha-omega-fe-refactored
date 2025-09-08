/**
 * Error handling utilities for consistent error message extraction
 * and display across the frontend application
 */

/**
 * Extracts a user-friendly error message from various error formats
 * Handles API errors, network errors, and validation errors
 */
export function getErrorMessage(error: any, fallbackMessage = "An unexpected error occurred"): string {
  // Handle null/undefined errors
  if (!error) {
    return fallbackMessage;
  }

  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle formatted API client errors (from our axios interceptor)
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // Handle raw axios errors that might not have been intercepted
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Handle axios error with error property
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Handle validation errors (array format)
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    return error.response.data.errors.join(', ');
  }

  // Handle network or connection errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
    return "Network error. Please check your connection and try again.";
  }

  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    return "Request timeout. Please try again.";
  }

  // Handle HTTP status code errors
  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;
    switch (status) {
      case 400:
        return "Bad request. Please check your input and try again.";
      case 401:
        return "Unauthorized. Please log in and try again.";
      case 403:
        return "Access denied. You don't have permission to perform this action.";
      case 404:
        return "Resource not found.";
      case 409:
        return "Conflict. The resource already exists or there's a data conflict.";
      case 422:
        return "Validation error. Please check your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 503:
        return "Service unavailable. Please try again later.";
      default:
        return `Server error (${status}). Please try again.`;
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Last resort fallback
  return fallbackMessage;
}

/**
 * Shows an error toast with proper error message extraction
 */
export function showErrorToast(error: any, fallbackMessage = "An unexpected error occurred") {
  // This function can be extended to use different toast libraries
  // For now, it returns the message for manual toast calling
  return getErrorMessage(error, fallbackMessage);
}

/**
 * Type guard to check if an error has a specific property
 */
export function hasErrorProperty(error: any, property: string): boolean {
  return error && typeof error === 'object' && property in error;
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  return error?.code === 'NETWORK_ERROR' || 
         error?.code === 'ERR_NETWORK' ||
         error?.message?.includes('Network Error');
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(error: any): boolean {
  return error?.status === 422 || 
         error?.response?.status === 422 ||
         (error?.response?.data?.errors && Array.isArray(error.response.data.errors));
}