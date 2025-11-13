/**
 * Convert an absolute path to a relative path based on a base directory
 */
export function makePathRelative(absolutePath: string, basePath?: string): string {
  if (!basePath || !absolutePath) {
    return absolutePath;
  }

  // Ensure both paths end without trailing slashes for comparison
  const normalizedBase = basePath.replace(/\/$/, '');
  const normalizedPath = absolutePath.replace(/\/$/, '');

  // Check if the path starts with the base path
  if (normalizedPath.startsWith(normalizedBase)) {
    // Remove the base path and return relative path
    const relativePath = normalizedPath.slice(normalizedBase.length);
    // Ensure we have a leading slash
    return relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  }

  // If path doesn't start with base, return as-is
  return absolutePath;
}

/**
 * Process a JSON object recursively and replace absolute paths with relative ones
 */
export function makePathsRelativeInObject(
  obj: unknown,
  basePath?: string
): unknown {
  if (!basePath || !obj) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if this looks like an absolute path (starts with /)
    if (obj.startsWith('/')) {
      return makePathRelative(obj, basePath);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => makePathsRelativeInObject(item, basePath));
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = makePathsRelativeInObject(value, basePath);
    }
    return result;
  }

  return obj;
}
