import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../ui/header/UnifiedHeader';
import { useAuth } from '../../auth/hooks/useAuth';
import { invitationsApi } from '../../services/invitationsApi';
import templateApi from '../../services/templateApi';
import PlatformTutorial from '../tutorial/PlatformTutorial';
import TutorialSelector from '../tutorial/TutorialSelector';
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  Shield,
  Database,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCog,
  GraduationCap,
  CheckCircle,
  XCircle,
  BookOpen,
  PlayCircle,
  Eye,
  X,
  Pencil,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserOnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team-organization');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer'
  });
  const [submitting, setSubmitting] = useState(false);

  // Onboarding state
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [tableChecklist, setTableChecklist] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [creatingTable, setCreatingTable] = useState(null); // Track which table is being created
  const [creatingAllTables, setCreatingAllTables] = useState(false); // Track bulk table creation

  // Tutorial state
  const [tutorialSelectorOpen, setTutorialSelectorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState('dashboard');

  // Table content viewer state
  const [viewingTable, setViewingTable] = useState(null);
  const [tableContent, setTableContent] = useState(null);
  const [loadingTableContent, setLoadingTableContent] = useState(false);

  // Writing style state
  const [emailSamplesText, setEmailSamplesText] = useState('');
  const [analyzingWritingStyle, setAnalyzingWritingStyle] = useState(false);
  const [writingStyle, setWritingStyle] = useState(null);
  const [writingStyleError, setWritingStyleError] = useState(null);

  // Role options with descriptions
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Team and data management' },
    { value: 'user', label: 'User', description: 'Standard access' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
  ];

  // Tab configuration - memoized to prevent unnecessary re-renders
  const tabs = useMemo(() => [
    { id: 'team-organization', label: 'Team Organization', icon: Users },
    { id: 'personal-onboarding', label: 'Personal Onboarding', icon: GraduationCap }
  ], []);

  // Fetch current user's invitations on mount
  useEffect(() => {
    fetchUserInvitations();
  }, [user]);

  // Fetch table checklist when Personal Onboarding tab is active or invitations change
  useEffect(() => {
    if (activeTab === 'personal-onboarding' && invitations.length > 0) {
      fetchTableChecklist();
    }
  }, [activeTab, invitations]);

  // Fetch existing writing style on mount
  useEffect(() => {
    const fetchWritingStyle = async () => {
      if (!user?.email) return;

      try {
        const idToken = localStorage.getItem('id_token');
        if (!idToken) {
          console.log('No auth token available, skipping writing style fetch');
          return;
        }

        const data = await templateApi.getWritingStyle();

        if (data.writing_style) {
          setWritingStyle(data.writing_style);
        }
      } catch (error) {
        console.error('Error fetching writing style:', error);
      }
    };

    fetchWritingStyle();
  }, [user?.email]);

  const fetchUserInvitations = async () => {
    if (!user?.email) return;

    setLoading(true);
    setUserNotFound(false);

    try {
      const data = await invitationsApi.getUserInvitations(user.email);
      const invitations = data.invitations || [];

      if (invitations && invitations.length > 0) {
        setInvitations(invitations);
        setUserNotFound(false);
      } else {
        setInvitations([]);
        setUserNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setUserNotFound(true);
      toast.error('Failed to fetch invitation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableChecklist = async () => {
    setChecklistLoading(true);

    try {
      // Get current user info from invitations data
      const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};
      
      // Pass user email and database name for proper routing
      const options = {
        userEmail: user?.email,
        databaseName: currentUserInfo.database_name
      };
      
      console.log('Fetching table checklist with options:', options);
      
      // Fetch both table checklist and database status
      const [checklistData, statusData] = await Promise.all([
        invitationsApi.getTableChecklist(options),
        invitationsApi.getDatabaseStatus(options)
      ]);
      
      setTableChecklist(checklistData);
      setDatabaseStatus(statusData);
    } catch (error) {
      console.error('Error fetching table checklist:', error);
      toast.error('Failed to load database table checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserInvitations();
    setRefreshing(false);
    toast.success('Invitations refreshed');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.email === user?.email) {
      toast.error('You cannot invite yourself');
      return;
    }

    const existingInvitation = invitations.find(inv => inv.email === formData.email);
    if (existingInvitation) {
      toast.error('This email has already been invited');
      return;
    }

    setSubmitting(true);

    try {
      const currentUserInvitation = invitations.find(inv => inv.email === user?.email) || {};

      const invitationData = {
        email: formData.email,
        company: currentUserInvitation.company || user?.company || 'prelude',
        role: formData.role,
        database_name: currentUserInvitation.database_name || 'postgres'
      };

      const result = await invitationsApi.createInvitation(invitationData);

      if (result.success) {
        toast.success(`Successfully invited ${formData.email}`);
        setFormData({ email: '', role: 'viewer' });
        await fetchUserInvitations();
      } else {
        toast.error(result.message || 'Failed to create invitation');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

  // Tutorial handlers
  const handleOpenTutorialSelector = () => {
    setTutorialSelectorOpen(true);
  };

  const handleSelectTutorial = (tutorialType) => {
    setSelectedTutorial(tutorialType);
    setTutorialOpen(true);
    toast.success(`${tutorialType} tutorial started! Follow the spotlight to continue.`);
  };

  const handleTutorialNavigate = (viewId) => {
    // For now, we're on the User Onboarding page
    // In a full implementation, this would navigate to different dashboard views
    // Since we're in a separate page, we'll just show a message
    console.log(`Tutorial requesting navigation to: ${viewId}`);
    // You could implement actual navigation here if needed
  };

  const handleCreateTable = async (tableName) => {
    if (!tableName || creatingTable) return;

    setCreatingTable(tableName);
    const toastId = toast.loading(`Creating table: ${tableName}...`);

    try {
      const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

      const options = {
        tableName,
        userEmail: user?.email,
        databaseName: currentUserInfo.database_name
      };

      console.log('Creating table with options:', options);

      const result = await invitationsApi.createTable(options);

      if (result.success) {
        toast.success(`Successfully created table: ${tableName}`, { id: toastId });

        // Refresh the checklist to show the new table
        await fetchTableChecklist();
      } else {
        toast.error(result.message || `Failed to create table: ${tableName}`, { id: toastId });
      }
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error(error.message || `Failed to create table: ${tableName}`, { id: toastId });
    } finally {
      setCreatingTable(null);
    }
  };

  const handleCreateAllTables = async () => {
    if (creatingAllTables) return;

    setCreatingAllTables(true);
    const toastId = toast.loading('Creating all missing tables...');

    try {
      const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

      const options = {
        userEmail: user?.email,
        databaseName: currentUserInfo.database_name
      };

      console.log('Creating all tables with options:', options);

      const result = await invitationsApi.createAllTables(options);

      if (result.success) {
        toast.success(
          `Successfully created ${result.created_tables.length} table${result.created_tables.length !== 1 ? 's' : ''}!`,
          { id: toastId, duration: 4000 }
        );

        // Show details about created tables
        if (result.created_tables.length > 0) {
          console.log('Created tables:', result.created_tables);
        }

        if (Object.keys(result.failed_tables || {}).length > 0) {
          toast.error(
            `Warning: ${Object.keys(result.failed_tables).length} table${Object.keys(result.failed_tables).length !== 1 ? 's' : ''} could not be created`,
            { duration: 4000 }
          );
          console.error('Failed tables:', result.failed_tables);
        }
      } else {
        toast.error(result.message || 'Failed to create tables', { id: toastId });
      }

      // Always refresh the checklist after creation attempt (success or partial success)
      // Add a small delay to ensure database changes are committed
      toast.loading('Refreshing table checklist...', { id: 'refresh-toast' });
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchTableChecklist();
      toast.success('Table checklist updated!', { id: 'refresh-toast', duration: 2000 });

    } catch (error) {
      console.error('Error creating all tables:', error);
      toast.error(error.message || 'Failed to create tables', { id: toastId });

      // Still refresh to show any partial progress
      try {
        await fetchTableChecklist();
      } catch (refreshError) {
        console.error('Error refreshing checklist:', refreshError);
      }
    } finally {
      setCreatingAllTables(false);
    }
  };

  const handleViewTableContent = async (tableName) => {
    if (!tableName || loadingTableContent) return;

    setViewingTable(tableName);
    setLoadingTableContent(true);
    setTableContent(null);

    try {
      const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

      const options = {
        tableName,
        userEmail: user?.email,
        databaseName: currentUserInfo.database_name
      };

      console.log('Fetching table content with options:', options);

      const result = await invitationsApi.getTableContent(options);

      if (result.success) {
        setTableContent(result);
      } else {
        toast.error(result.message || `Failed to fetch table content for: ${tableName}`);
        setViewingTable(null);
      }
    } catch (error) {
      console.error('Error fetching table content:', error);
      toast.error(error.message || `Failed to fetch table content for: ${tableName}`);
      setViewingTable(null);
    } finally {
      setLoadingTableContent(false);
    }
  };

  const handleCloseTableViewer = () => {
    setViewingTable(null);
    setTableContent(null);
  };

  const parsePastedEmails = (text) => {
    const samples = [];
    const emailBlocks = text.split(/\n\s*\n/).filter(block => block.trim());

    for (const block of emailBlocks) {
      const lines = block.split('\n');
      let subject = '';
      let body = '';
      let foundSubject = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().startsWith('subject:')) {
          subject = line.substring(8).trim();
          foundSubject = true;
          body = lines.slice(i + 1).join('\n').trim();
          break;
        }
      }

      if (!foundSubject && lines.length > 0) {
        subject = lines[0].trim();
        body = lines.slice(1).join('\n').trim();
      }

      if (subject && body) {
        samples.push({ subject, body });
      }
    }

    return samples;
  };

  const handleAnalyzeWritingStyle = async () => {
    if (!emailSamplesText.trim()) {
      toast.error('Please paste at least 3 sample emails');
      return;
    }

    const samples = parsePastedEmails(emailSamplesText);

    if (samples.length < 3) {
      toast.error(`Found ${samples.length} email samples. Please provide at least 3 emails.`);
      return;
    }

    if (samples.length > 20) {
      toast.error(`Found ${samples.length} email samples. Maximum is 20 emails.`);
      return;
    }

    setAnalyzingWritingStyle(true);
    setWritingStyleError(null);
    const toastId = toast.loading('Analyzing your writing style...');

    try {
      // Get auth token
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const data = await templateApi.initializeWritingStyle(samples);

      if (data.success) {
        toast.success('Writing style learned successfully!', { id: toastId });
        setWritingStyle(data.writing_style);
        setEmailSamplesText('');
      } else {
        toast.error(data.message || 'Failed to analyze writing style', { id: toastId });
        setWritingStyleError(data.message || 'Failed to analyze writing style');
      }
    } catch (error) {
      console.error('Error analyzing writing style:', error);
      toast.error(error.message || 'Failed to analyze writing style', { id: toastId });
      setWritingStyleError(error.message || 'Failed to analyze writing style');
    } finally {
      setAnalyzingWritingStyle(false);
    }
  };

  const renderTeamOrganization = () => (
    <div className="space-y-6">
      {/* Current User Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Your Account Information</h3>
          </div>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : userNotFound ? (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Your account information was not found in the database.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Please contact your administrator to be added to the system.
                </p>
              </div>
            </div>
          ) : currentUserInfo.email ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Company</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.company}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.role}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Loading your account information...</p>
          )}
        </div>
      </div>

      {/* Invitation Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Invite New Team Member</h3>
          </div>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={submitting || userNotFound}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={submitting || userNotFound}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {roleOptions.find(r => r.value === formData.role)?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                The new member will join <strong className="text-gray-900">{currentUserInfo.company || 'your company'}</strong> with access to <strong className="text-gray-900">{currentUserInfo.database_name || 'the database'}</strong>
              </p>
              <button
                type="submit"
                disabled={submitting || userNotFound}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </>
                )}
              </button>
            </div>

            {userNotFound && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  You must be registered in the system to send invitations.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Team Members List Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Team Members ({invitations.length})</h3>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitations.map((invitation, index) => (
                    <tr key={invitation.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{invitation.email}</span>
                          {invitation.email === user?.email && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">You</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-700">{invitation.company}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          invitation.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          invitation.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          invitation.role === 'user' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-700">{invitation.database_name}</td>
                      <td className="py-3 text-sm text-gray-500">
                        {invitation.created_at ?
                          new Date(invitation.created_at).toLocaleDateString() :
                          'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No team members found</p>
              <p className="text-sm text-gray-500 mt-1">Start by inviting your first team member above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonalOnboarding = () => (
    <div className="space-y-6">
      {/* Platform Tutorial Card */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  New to Prelude Platform?
                </h3>
                <p className="text-white/90 text-sm mb-3">
                  Take interactive tutorials to learn specific features! Choose from Dashboard & Navigation, Lead Generation, CRM, Sales Center, or User Onboarding tutorials.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    5 tutorial modules
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Spotlight guidance
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Interactive learning
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenTutorialSelector}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-teal-600 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0"
            >
              <PlayCircle className="h-5 w-5" />
              Choose Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Writing Style Setup Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Writing Style Setup</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Help AI learn your unique writing style for personalized email generation
          </p>
        </div>
        <div className="px-6 py-5">
          {writingStyle ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    Writing style learned successfully!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    AI will now match your writing style when generating emails
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  Your Writing Style Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Typical Length</p>
                    <p className="text-gray-900">{writingStyle.typicalLength || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Formality</p>
                    <p className="text-gray-900">{writingStyle.formality || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Common Greeting</p>
                    <p className="text-gray-900">{writingStyle.commonGreeting || 'N/A'}</p>
                  </div>
                </div>
                {writingStyle.notableTraits && writingStyle.notableTraits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Notable Traits</p>
                    <div className="flex flex-wrap gap-2">
                      {writingStyle.notableTraits.map((trait, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setWritingStyle(null);
                  setEmailSamplesText('');
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
              >
                Update Writing Style
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Paste 3-5 sample emails to get started
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Include emails you've sent that represent your typical writing style
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="emailSamples" className="block text-sm font-medium text-gray-700 mb-2">
                  Sample Emails (3-20 emails)
                </label>
                <textarea
                  id="emailSamples"
                  rows={12}
                  placeholder={`Paste your emails here. Separate each email with a blank line.

Example format:

Subject: Quick follow-up
Hey, just checking in on our last conversation. Let me know if you need anything else!

Subject: Meeting confirmation
Hi! Confirmed for Tuesday at 2pm. Looking forward to it.

Subject: Thank you
Thanks for your time today. I'll send over those details shortly.`}
                  value={emailSamplesText}
                  onChange={(e) => setEmailSamplesText(e.target.value)}
                  disabled={analyzingWritingStyle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Copy emails from your sent folder. Include subject and body for each email.
                </p>
              </div>

              {writingStyleError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{writingStyleError}</p>
                </div>
              )}

              <button
                onClick={handleAnalyzeWritingStyle}
                disabled={analyzingWritingStyle || !emailSamplesText.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzingWritingStyle ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing Writing Style...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Analyze Writing Style
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Database Setup Progress Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-teal-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Database Setup Progress</h3>
                {databaseStatus && (
                  <p className="text-sm text-gray-600">
                    Connected to: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{databaseStatus.database_name}</code>
                    {currentUserInfo.database_name && currentUserInfo.database_name !== databaseStatus.database_name && (
                      <span className="ml-2 text-yellow-600">(Expected: {currentUserInfo.database_name})</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={fetchTableChecklist}
              disabled={checklistLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${checklistLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {checklistLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Loading table checklist...</span>
            </div>
          ) : tableChecklist ? (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                  <p className="text-xs font-medium text-teal-600 mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-teal-900">{tableChecklist.total_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-green-600 mb-1">Existing Tables</p>
                  <p className="text-2xl font-bold text-green-900">{tableChecklist.existing_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-red-600 mb-1">Missing Tables</p>
                  <p className="text-2xl font-bold text-red-900">{tableChecklist.missing_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 mb-1">Completion</p>
                  <p className="text-2xl font-bold text-blue-900">{tableChecklist.completion_percentage}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Database Initialization</span>
                  <span className="text-gray-600">{tableChecklist.existing_tables} of {tableChecklist.total_tables} tables</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${tableChecklist.completion_percentage}%` }}
                  />
                </div>
              </div>

              {/* Create All Tables Button */}
              {tableChecklist.missing_tables > 0 && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={handleCreateAllTables}
                    disabled={creatingAllTables || creatingTable}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingAllTables ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating All Tables...
                      </>
                    ) : (
                      <>
                        <Database className="h-5 w-5" />
                        Create All Missing Tables ({tableChecklist.missing_tables})
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Table Checklist */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Table Status Checklist</h4>
                <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="divide-y divide-gray-100">
                    {tableChecklist.checklist.map((table, index) => (
                      <div
                        key={table.table_name}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                          table.exists ? 'bg-white' : 'bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {table.exists ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className={`text-sm font-mono font-medium ${
                                table.exists ? 'text-gray-900' : 'text-red-900'
                              }`}>
                                {table.table_name}
                              </code>
                              {table.exists ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Missing
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${
                              table.exists ? 'text-gray-600' : 'text-red-600'
                            }`}>
                              {table.description}
                            </p>
                          </div>
                          {!table.exists && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleCreateTable(table.table_name)}
                                disabled={creatingTable === table.table_name}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {creatingTable === table.table_name ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Database className="h-3 w-3" />
                                    Create Table
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {table.exists && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleViewTableContent(table.table_name)}
                                disabled={loadingTableContent}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Eye className="h-3 w-3" />
                                View Content
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Completion Message */}
              {tableChecklist.completion_percentage === 100 ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Database Setup Complete!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      All required tables have been initialized successfully.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Database Setup In Progress
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {tableChecklist.missing_tables} table{tableChecklist.missing_tables !== 1 ? 's' : ''} still need to be created. Please contact your administrator if this persists.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No checklist data available</p>
              <p className="text-sm text-gray-500 mt-1">Click refresh to load the database status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'team-organization':
        return renderTeamOrganization();
      case 'personal-onboarding':
        return renderPersonalOnboarding();
      default:
        return renderTeamOrganization();
    }
  };

  // Memoize the tabs configuration for UnifiedHeader to prevent unnecessary re-renders
  const headerTabs = useMemo(() =>
    tabs.map(tab => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon,
      isActive: activeTab === tab.id,
      onClick: () => setActiveTab(tab.id)
    })),
    [activeTab, tabs]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <UnifiedHeader
        title="User Onboarding"
        themeColor="teal"
        tabs={headerTabs}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-y-auto bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Tutorial Selector */}
      <TutorialSelector
        isOpen={tutorialSelectorOpen}
        onClose={() => setTutorialSelectorOpen(false)}
        onSelectTutorial={handleSelectTutorial}
      />

      {/* Platform Tutorial */}
      <PlatformTutorial
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        tutorialType={selectedTutorial}
        onNavigate={handleTutorialNavigate}
      />

      {/* Table Content Viewer Modal */}
      {viewingTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Table Content: <code className="font-mono text-blue-600">{viewingTable}</code>
                  </h3>
                  {tableContent && (
                    <p className="text-sm text-gray-600">
                      {tableContent.row_count} row{tableContent.row_count !== 1 ? 's' : ''} • {tableContent.column_count} column{tableContent.column_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseTableViewer}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {loadingTableContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading table data...</span>
                </div>
              ) : tableContent && tableContent.rows && tableContent.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        {tableContent.columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {tableContent.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                          {tableContent.columns.map((column, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-100 last:border-r-0"
                            >
                              {row[column] !== null && row[column] !== undefined ? (
                                typeof row[column] === 'object' ? (
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {JSON.stringify(row[column])}
                                  </code>
                                ) : (
                                  String(row[column])
                                )
                              ) : (
                                <span className="text-gray-400 italic">null</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium">No data found in this table</p>
                  <p className="text-sm text-gray-500 mt-1">The table exists but contains no rows</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-600">
                {tableContent && tableContent.rows ? `Showing ${tableContent.rows.length} of ${tableContent.row_count} rows` : 'Loading...'}
              </p>
              <button
                onClick={handleCloseTableViewer}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserOnboardingPage;
