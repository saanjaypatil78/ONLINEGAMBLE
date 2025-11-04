const randomSegment = () => Math.random().toString(36).slice(2, 10);

export const createId = (prefix = "id"): string => {
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${randomSegment()}`;
};

// TODO: replace with UUID v4 generator once crypto APIs are standardised across runtimes.
