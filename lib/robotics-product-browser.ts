export function moveProductIndex(currentIndex: number, direction: -1 | 1, productCount: number) {
  return (currentIndex + direction + productCount) % productCount;
}
