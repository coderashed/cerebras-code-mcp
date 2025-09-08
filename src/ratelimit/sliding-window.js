// Sliding window counter for minute/hour rate limiting
export class SlidingWindow {
  constructor(windowSeconds, bucketSeconds = 1) {
    this.windowSize = windowSeconds;
    this.bucketSize = bucketSeconds;
    this.bucketCount = Math.ceil(windowSeconds / bucketSeconds);
    this.buckets = new Array(this.bucketCount).fill(0);
    this.currentIndex = 0;
    this.lastRotation = Date.now();
  }

  increment() {
    this.rotate();
    this.buckets[this.currentIndex]++;
  }

  getCount() {
    this.rotate();
    return this.buckets.reduce((sum, count) => sum + count, 0);
  }

  canIncrement(limit) {
    return this.getCount() < limit;
  }

  rotate() {
    const now = Date.now();
    const elapsed = Math.floor((now - this.lastRotation) / 1000);
    const bucketsToRotate = Math.floor(elapsed / this.bucketSize);
    
    if (bucketsToRotate > 0) {
      // Clear buckets that have expired
      for (let i = 0; i < Math.min(bucketsToRotate, this.bucketCount); i++) {
        this.currentIndex = (this.currentIndex + 1) % this.bucketCount;
        this.buckets[this.currentIndex] = 0;
      }
      // Update last rotation to the last bucket boundary we rotated to
      this.lastRotation = this.lastRotation + (bucketsToRotate * this.bucketSize * 1000);
    }
  }

  reset() {
    this.buckets.fill(0);
    this.currentIndex = 0;
    this.lastRotation = Date.now();
  }
}