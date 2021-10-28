export const nullFilter = (value: string | number, unit?: string) => {
  if (!value) return '-';
  if (unit) {
    return value + unit;
  } else {
    return value;
  }
};