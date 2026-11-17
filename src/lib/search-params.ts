/** A page's search params as URLSearchParams (repeated keys kept). */
export function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) {
      if (item !== undefined) search.append(key, item);
    }
  }
  return search;
}
