type TimestampLike = {
  toDate: () => Date;
};

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  );
}

export function timestampToIso(value: unknown) {
  return isTimestampLike(value) ? value.toDate().toISOString() : undefined;
}
