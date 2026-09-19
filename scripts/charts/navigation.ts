let navigationQueue = Promise.resolve();

export async function withChartNavigationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = navigationQueue;
  let release!: () => void;
  navigationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}