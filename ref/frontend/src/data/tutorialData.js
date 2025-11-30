// Tutorial content for the Prelude Platform
export const tutorialData = {
  title: "Prelude Platform User Guide",
  description: "Learn how to navigate and use all the features of the Prelude Platform",
  sections: [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: "Play",
      description: "Learn the basics of navigating the platform",
      steps: [
        {
          title: "Dashboard Overview",
          content: "Welcome to Prelude Platform! The dashboard is your central hub for accessing all features. Use the sidebar on the left to navigate between different sections.",
          image: null,
          tips: [
            "The sidebar can be collapsed by clicking the hamburger menu",
            "Your current role and email are displayed at the bottom of the sidebar",
            "Different users see different tabs based on their role permissions"
          ]
        },
        {
          title: "User Roles & Permissions",
          content: "Your access level determines which features you can use. There are three main roles: Employee (basic access), Manager (advanced access), and Admin (full access).",
          image: null,
          tips: [
            "Different roles have access to different features",
            "Your available tabs depend on your assigned role",
            "Contact your administrator if you need access to additional features"
          ]
        }
      ]
    },
    {
      id: "navigation",
      title: "Navigation & Interface",
      icon: "Navigation",
      description: "Master the platform's navigation and interface elements",
      steps: [
        {
          title: "Sidebar Navigation",
          content: "The left sidebar contains all main navigation options. Click on any section to switch views. The active section is highlighted in color.",
          image: null,
          tips: [
            "Business Operations: Core business functions like leads and sales",
            "Team & Resources: Employee management and calendar",
            "Analytics & Insights: Data and usage analytics (admin only)"
          ]
        },
        {
          title: "Mobile Navigation",
          content: "On mobile devices, navigation switches to a horizontal scrollable bar at the top for easier thumb navigation.",
          image: null,
          tips: [
            "Swipe horizontally to see all available tabs",
            "Tap any tab to switch to that section",
            "The current section is highlighted with a colored background"
          ]
        }
      ]
    },
    {
      id: "lead-generation",
      title: "Lead Generation",
      icon: "Target",
      description: "Generate and manage leads effectively",
      steps: [
        {
          title: "Creating New Leads",
          content: "Use the Lead Generation hub to find and create new business opportunities. You can search by location, industry, or company size.",
          image: null,
          tips: [
            "Use specific geographic filters for targeted local searches",
            "Set industry filters to find relevant businesses",
            "Save successful search parameters for future use"
          ]
        },
        {
          title: "Lead Management",
          content: "Track and manage your leads through different stages of the sales funnel. Update lead status and add notes as you progress.",
          image: null,
          tips: [
            "Regularly update lead status to track progress",
            "Add detailed notes for better follow-up",
            "Set reminders for important follow-up dates"
          ]
        }
      ]
    },
    {
      id: "sales-center",
      title: "Sales Center",
      icon: "BarChart3",
      description: "Analyze sales performance and manage your pipeline",
      steps: [
        {
          title: "Sales Analytics",
          content: "View comprehensive sales metrics, performance trends, and pipeline analysis. Upload data and generate custom reports.",
          image: null,
          tips: [
            "Upload CSV files for bulk data analysis",
            "Use the natural language query feature to ask questions about your data",
            "Export reports for presentations and meetings"
          ]
        },
        {
          title: "Performance Tracking",
          content: "Monitor individual and team performance metrics. Track conversion rates, deal sizes, and sales velocity.",
          image: null,
          tips: [
            "Set performance goals and track progress",
            "Compare performance across different time periods",
            "Identify top performers and areas for improvement"
          ]
        }
      ]
    },
    {
      id: "crm",
      title: "Customer Relationship Management",
      icon: "Heart",
      description: "Manage customer relationships and interactions",
      steps: [
        {
          title: "Customer Profiles",
          content: "Create and maintain detailed customer profiles with contact information, interaction history, and preferences.",
          image: null,
          tips: [
            "Keep customer information up to date",
            "Log all interactions for complete history",
            "Set follow-up reminders for important customers"
          ]
        },
        {
          title: "Interaction Tracking",
          content: "Record all customer interactions including calls, emails, meetings, and notes. Build a comprehensive relationship timeline.",
          image: null,
          tips: [
            "Log interactions immediately after they occur",
            "Include relevant details and outcomes",
            "Tag interactions for easy searching and filtering"
          ]
        }
      ]
    },
    {
      id: "calendar",
      title: "Calendar & Scheduling",
      icon: "Calendar",
      description: "Manage appointments and integrate with Google Calendar",
      steps: [
        {
          title: "Calendar Integration",
          content: "Connect your Google Calendar to sync appointments and meetings. View and manage your schedule directly from the platform.",
          image: null,
          tips: [
            "Authorize Google Calendar access for full sync",
            "Set meeting preferences and availability",
            "Use calendar blocking for focused work time"
          ]
        },
        {
          title: "Meeting Management",
          content: "Schedule meetings with customers and team members. Track meeting outcomes and follow-up actions.",
          image: null,
          tips: [
            "Always include agenda items in meeting descriptions",
            "Set automatic reminders for important meetings",
            "Log meeting outcomes for future reference"
          ]
        }
      ]
    },
    {
      id: "analytics",
      title: "Usage Analytics",
      icon: "BarChart2",
      description: "Monitor platform usage and performance",
      steps: [
        {
          title: "Usage Tracking",
          content: "Monitor how the platform is being used across your organization. Track user activity, feature adoption, and performance metrics. Access may be limited based on your role.",
          image: null,
          tips: [
            "Monitor user adoption of new features",
            "Identify underutilized platform capabilities",
            "Track system performance and response times"
          ]
        },
        {
          title: "Insights & Optimization",
          content: "Use analytics data to optimize platform usage and identify training needs across your organization. Available features depend on your access level.",
          image: null,
          tips: [
            "Regular analytics reviews help identify trends",
            "Use data to inform training and onboarding",
            "Share insights with team leaders for better adoption"
          ]
        }
      ]
    },
    {
      id: "ai-assistant",
      title: "AI Assistant",
      icon: "MessageCircle",
      description: "Interact with the AI-powered chat assistant",
      steps: [
        {
          title: "Chat Interface",
          content: "Use the AI Assistant to get help, ask questions, and automate tasks. The chat panel can be toggled on/off as needed.",
          image: null,
          tips: [
            "Ask specific questions for better responses",
            "Use the chat for data analysis and insights",
            "Save important conversations for future reference"
          ]
        },
        {
          title: "Session Management",
          content: "Create multiple chat sessions for different topics or projects. Rename and organize sessions for easy access.",
          image: null,
          tips: [
            "Create separate sessions for different projects",
            "Use descriptive names for easy identification",
            "Delete old sessions to keep the interface clean"
          ]
        }
      ]
    }
  ],
  shortcuts: [
    {
      keys: ["Ctrl", "+"],
      description: "Zoom in"
    },
    {
      keys: ["Ctrl", "-"],
      description: "Zoom out"
    },
    {
      keys: ["Ctrl", "Shift", "C"],
      description: "Toggle chat panel"
    },
    {
      keys: ["Esc"],
      description: "Close modal or panel"
    }
  ],
  troubleshooting: [
    {
      problem: "Can't see certain tabs or features",
      solution: "Check your user role at the bottom of the sidebar. Some features are only available to managers or administrators."
    },
    {
      problem: "Calendar integration not working",
      solution: "Ensure you've authorized Google Calendar access and that your browser allows pop-ups from this domain."
    },
    {
      problem: "Data not loading or displaying",
      solution: "Try refreshing the page. If the problem persists, check your internet connection and contact support."
    },
    {
      problem: "Chat assistant not responding",
      solution: "Check your internet connection and ensure the backend services are running. Try creating a new chat session."
    }
  ]
};

export default tutorialData;