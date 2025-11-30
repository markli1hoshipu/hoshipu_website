/**
 * App Initialization Service
 * Handles background preloading and initialization tasks
 */

class AppInitializationService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize all background services
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    console.log('🎯 Starting app initialization...');

    const tasks = [
      // Add initialization tasks here in the future
    ];

    try {
      await Promise.allSettled(tasks);
      this.isInitialized = true;
      console.log('✅ App initialization completed');
    } catch (error) {
      console.warn('⚠️ App initialization had errors:', error);
      // Don't fail the entire app if initialization has issues
      this.isInitialized = true;
    }
  }

  /**
   * Check if initialization is complete
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Wait for initialization to complete
   */
  async waitForReady() {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.isInitialized;
  }
}

// Create singleton instance
const appInitializationService = new AppInitializationService();

export default appInitializationService;