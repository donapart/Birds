const normalizeText = (value) =>
  String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const levenshtein = (left, right, max = 2) => {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > max) return max + 1;

  const distances = Array(right.length + 1).fill(0).map((_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let previous = distances[0];
    distances[0] = leftIndex;
    let bestInRow = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const current = distances[rightIndex];
      distances[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous
        : 1 + Math.min(previous, distances[rightIndex - 1], distances[rightIndex]);
      previous = current;
      bestInRow = Math.min(bestInRow, distances[rightIndex]);
    }
    if (bestInRow > max) return max + 1;
  }
  return distances[right.length];
};

export const fuzzyHit = (query, fields) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  return fields.some((field) => {
    const normalizedField = normalizeText(field);
    if (!normalizedField) return false;
    if (normalizedField.includes(normalizedQuery)) return true;
    if (normalizedQuery.length < 4) return false;

    const tolerance = Math.max(1, Math.floor(normalizedQuery.length / 5));
    return levenshtein(normalizedQuery, normalizedField, tolerance) <= tolerance
      || normalizedField
        .split(/[\s-]+/)
        .some((token) => token.length >= 3 && levenshtein(normalizedQuery, token, tolerance) <= tolerance);
  });
};

export const isNewerVersion = (current, latest) => {
  if (!current || !latest) return false;
  const currentParts = String(current).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const latestParts = String(latest).split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(currentParts.length, latestParts.length); index++) {
    if ((latestParts[index] || 0) > (currentParts[index] || 0)) return true;
    if ((latestParts[index] || 0) < (currentParts[index] || 0)) return false;
  }
  return false;
};

export const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const shannonIndex = (counts) => {
  const values = Object.values(counts || {});
  if (!values.length) return 0;
  const total = values.reduce((sum, count) => sum + count, 0);
  return -values.reduce((sum, count) => {
    const probability = count / total;
    return sum + (probability > 0 ? probability * Math.log(probability) : 0);
  }, 0);
};

export const simpsonIndex = (counts) => {
  const values = Object.values(counts || {});
  if (!values.length) return 0;
  const total = values.reduce((sum, count) => sum + count, 0);
  return 1 - values.reduce((sum, count) => sum + count * (count - 1), 0) / (total * (total - 1) || 1);
};

export const formatDuration = (seconds) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export const confidenceColor = (confidence) =>
  confidence >= 0.8 ? '#51cf66' : confidence >= 0.5 ? '#ffd43b' : '#ff6b6b';