
// Constants for local storage keys
const STORAGE_KEYS = {
  SESSION_START: 'usage_session_start',
  TOTAL_TIME: 'usage_total_time',
  MODULE_USAGE: 'usage_module_data',
  TOKEN_USAGE: 'usage_token_data',
};

// Module names for tracking
export const TRACKED_MODULES = {
  CALENDAR: 'Calendar',
  CRM: 'Customer Relations',
  LEADS: 'Lead Generation',
  SALES: 'Sales Center',
  EMPLOYEES: 'Team Management',
  CHAT: 'Chat Assistant',
  SETTINGS: 'Settings',
};

class UsageAnalyticsService {
  constructor() {
    this.sessionStart = null;
    this.currentModule = null;
    this.moduleStartTime = null;
    
    // Initialize or load saved data
    this.initializeData();
  }

  initializeData() {
    // Load or initialize module usage data
    this.moduleUsage = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODULE_USAGE)) || {
      [TRACKED_MODULES.CALENDAR]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.CRM]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.LEADS]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.SALES]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.EMPLOYEES]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.CHAT]: { timeSpent: 0, visits: 0, lastVisit: null },
      [TRACKED_MODULES.SETTINGS]: { timeSpent: 0, visits: 0, lastVisit: null },
    };

    // Load or initialize token usage data
    this.tokenUsage = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOKEN_USAGE)) || {
      total: 0,
      byModule: {
        [TRACKED_MODULES.CALENDAR]: 0,
        [TRACKED_MODULES.CRM]: 0,
        [TRACKED_MODULES.LEADS]: 0,
        [TRACKED_MODULES.SALES]: 0,
        [TRACKED_MODULES.EMPLOYEES]: 0,
        [TRACKED_MODULES.CHAT]: 0,
        [TRACKED_MODULES.SETTINGS]: 0,
      },
      history: [], // Array of { timestamp, module, tokens }
    };

    // Start new session or continue existing
    const savedSessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
    if (!savedSessionStart) {
      this.startNewSession();
    } else {
      this.sessionStart = new Date(savedSessionStart);
    }
  }

  startNewSession() {
    this.sessionStart = new Date();
    localStorage.setItem(STORAGE_KEYS.SESSION_START, this.sessionStart.toISOString());
  }

  startModuleTracking(moduleName) {
    if (this.currentModule) {
      this.endModuleTracking();
    }
    
    this.currentModule = moduleName;
    this.moduleStartTime = new Date();
    
    // Update visit count and last visit
    if (this.moduleUsage[moduleName]) {
      this.moduleUsage[moduleName].visits += 1;
      this.moduleUsage[moduleName].lastVisit = new Date().toISOString();
      this.saveModuleUsage();
    }
  }

  endModuleTracking() {
    if (!this.currentModule || !this.moduleStartTime) return;

    const timeSpent = new Date() - this.moduleStartTime;
    this.moduleUsage[this.currentModule].timeSpent += timeSpent;
    this.saveModuleUsage();

    this.currentModule = null;
    this.moduleStartTime = null;
  }

  recordTokenUsage(moduleName, tokens) {
    this.tokenUsage.total += tokens;
    this.tokenUsage.byModule[moduleName] += tokens;
    this.tokenUsage.history.push({
      timestamp: new Date().toISOString(),
      module: moduleName,
      tokens,
    });
    this.saveTokenUsage();
  }

  getTotalTimeSpent() {
    return Object.values(this.moduleUsage).reduce((total, module) => total + module.timeSpent, 0);
  }

  getModuleUsageData() {
    return this.moduleUsage;
  }

  getTokenUsageData() {
    return this.tokenUsage;
  }

  getRadarChartData() {
    const maxTimeSpent = Math.max(...Object.values(this.moduleUsage).map(m => m.timeSpent));
    const maxVisits = Math.max(...Object.values(this.moduleUsage).map(m => m.visits));
    const maxTokens = Math.max(...Object.values(this.tokenUsage.byModule));

    return {
      labels: Object.values(TRACKED_MODULES),
      datasets: [
        {
          label: 'Time Spent',
          data: Object.values(this.moduleUsage).map(m => maxTimeSpent > 0 ? Math.round((m.timeSpent / maxTimeSpent) * 100) : 0),
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
          pointRadius: 4,
        },
        {
          label: 'Visits',
          data: Object.values(this.moduleUsage).map(m => maxVisits > 0 ? Math.round((m.visits / maxVisits) * 100) : 0),
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
          pointRadius: 4,
        },
        {
          label: 'Token Usage',
          data: Object.values(this.tokenUsage.byModule).map(t => maxTokens > 0 ? Math.round((t / maxTokens) * 100) : 0),
          backgroundColor: 'rgba(245, 101, 101, 0.2)',
          borderColor: 'rgba(245, 101, 101, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(245, 101, 101, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(245, 101, 101, 1)',
          pointRadius: 4,
        },
      ],
    };
  }

  generateWorkReport() {
    const totalTime = this.getTotalTimeSpent();
    const mostUsedModule = Object.entries(this.moduleUsage)
      .reduce((prev, [name, data]) => data.timeSpent > prev.timeSpent ? { name, ...data } : prev,
        { name: '', timeSpent: 0 });
    
    const report = {
      period: {
        start: this.sessionStart,
        end: new Date(),
      },
      summary: {
        totalTimeSpent: totalTime,
        totalTokensUsed: this.tokenUsage.total,
        mostUsedModule: mostUsedModule.name,
        totalModuleVisits: Object.values(this.moduleUsage).reduce((sum, m) => sum + m.visits, 0),
      },
      moduleBreakdown: Object.entries(this.moduleUsage).map(([name, data]) => ({
        name,
        timeSpent: data.timeSpent,
        visits: data.visits,
        lastVisit: data.lastVisit,
        tokensUsed: this.tokenUsage.byModule[name],
        percentageOfTotal: (data.timeSpent / totalTime * 100).toFixed(2),
      })),
      tokenUsageHistory: this.tokenUsage.history,
    };

    return report;
  }

  saveModuleUsage() {
    localStorage.setItem(STORAGE_KEYS.MODULE_USAGE, JSON.stringify(this.moduleUsage));
  }

  saveTokenUsage() {
    localStorage.setItem(STORAGE_KEYS.TOKEN_USAGE, JSON.stringify(this.tokenUsage));
  }
}

export const usageAnalyticsService = new UsageAnalyticsService(); 