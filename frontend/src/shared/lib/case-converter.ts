const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const camelToSnake = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const snakeToCamel = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

export const convertKeys = (
  data: unknown,
  convert: (key: string) => string,
): unknown => {
  if (Array.isArray(data)) {
    return data.map((item) => convertKeys(item, convert));
  }
  if (isPlainObject(data)) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        convert(key),
        convertKeys(value, convert),
      ]),
    );
  }
  return data;
};
