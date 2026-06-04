export function deploymentErrorSummary(err) {
  const name = err && typeof err === 'object' && 'name' in err ? err.name : 'Error';
  return `${name || 'Error'}; details sanitized`;
}

export function deploymentCreatedSummary(deployment) {
  const id = typeof deployment?.id === 'string' && deployment.id ? deployment.id : 'unknown';
  const status =
    typeof deployment?.status === 'string' && deployment.status
      ? deployment.status
      : 'unknown';
  const endpointCount = Array.isArray(deployment?.endpoints)
    ? deployment.endpoints.length
    : 0;
  return `id=${id}; status=${status}; endpoints=${endpointCount}; details sanitized`;
}

export function deploymentStatusSummary(deployment) {
  const status =
    typeof deployment?.status === 'string' && deployment.status
      ? deployment.status
      : 'unknown';
  const endpoint = Array.isArray(deployment?.endpoints) && deployment.endpoints[0]?.url
    ? deployment.endpoints[0].url
    : 'pending';
  return `status=${status}; endpoint=${endpoint}`;
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
