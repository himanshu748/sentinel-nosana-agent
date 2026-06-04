export function deploymentErrorSummary(err) {
  const name = err && typeof err === 'object' && 'name' in err ? err.name : 'Error';
  return `${name || 'Error'}; details sanitized`;
}

function statusCategory(statusCode) {
  if (statusCode >= 500) return 'server_error';
  if (statusCode === 401) return 'unauthorized';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not_found';
  if (statusCode >= 400) return 'client_error';
  return 'unexpected_status';
}

async function responseBodyLength(response) {
  const contentLength = response?.headers?.get?.('content-length');
  if (contentLength && Number.isFinite(Number(contentLength))) {
    return Number(contentLength);
  }

  if (typeof response?.text === 'function') {
    try {
      const body = await response.text();
      return body.length;
    } catch {
      return 0;
    }
  }

  if (response?.data !== undefined) {
    return String(response.data).length;
  }

  return 0;
}

export async function deploymentResponseSummary(response) {
  const statusCode = Number(response?.status ?? response?.statusCode ?? 0);
  const statusLabel = statusCode || 'unknown';
  const category = statusCode ? statusCategory(statusCode) : 'unknown_status';
  const omittedBytes = await responseBodyLength(response);
  return `HTTP ${statusLabel} ${category}; response body omitted (${omittedBytes} bytes)`;
}
