/**
 * Converts a nested Map into a nested plain object.
 */
export function convertNestedMapToObject(nestedMap: Map<string, Map<string, string>>): Record<string, Record<string, string>> {
  // 1. Convert the outer Map entries into an array
  const outerEntries = Array.from(nestedMap.entries()).map(([outerKey, innerMap]) => {

    // 2. Convert the inner Map into a plain object using Object.fromEntries
    const innerObject = Object.fromEntries(innerMap);

    // 3. Return the outer key paired with the newly created inner object
    return [outerKey, innerObject] as [string, Record<string, string>];
  });

  // 4. Reconstruct the final outer object from the processed entries
  return Object.fromEntries(outerEntries);
}

/**
 * Converts a Map into a plain object.
 */
export function convertMapToObject<T = any>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map);
}