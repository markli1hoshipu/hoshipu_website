import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Label } from '../ui/primitives/label';
import { Select } from '../ui/primitives/select';
import { Alert } from '../ui/primitives/alert';
import { Separator } from '../ui/primitives/separator';
import { Table, TableHeader, TableRow, TableCell, FormField, FormGroup } from '../shared';
import { useAuth } from '../../auth/hooks/useAuth';
import { invitationsApi } from '../../services/invitationsApi';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Building2, 
  Shield, 
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const InvitationsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer',
    level: 1
  });
  const [submitting, setSubmitting] = useState(false);

  // Role options with descriptions
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Full system access', minLevel: 7 },
    { value: 'manager', label: 'Manager', description: 'Team and data management', minLevel: 5 },
    { value: 'user', label: 'User', description: 'Standard access', minLevel: 3 },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access', minLevel: 1 }
  ];

  // Level options (1-10)
  const levelOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  // Fetch current user's invitations on mount
  useEffect(() => {
    fetchUserInvitations();
  }, [user]);

  const fetchUserInvitations = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    setUserNotFound(false);
    
    try {
      const data = await invitationsApi.getUserInvitations(user.email);
      
      // Extract invitations array from the response
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
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.email === user?.email) {
      toast.error('You cannot invite yourself');
      return;
    }

    // Check if email already exists in invitations
    const existingInvitation = invitations.find(inv => inv.email === formData.email);
    if (existingInvitation) {
      toast.error('This email has already been invited');
      return;
    }

    setSubmitting(true);
    
    try {
      // Get current user's company and database from their invitation record
      const currentUserInvitation = invitations.find(inv => inv.email === user?.email) || {};
      
      const invitationData = {
        email: formData.email,
        company: currentUserInvitation.company || user?.company || 'prelude',
        role: formData.role,
        database_name: currentUserInvitation.database_name || 'postgres',
        level: formData.level
      };

      const result = await invitationsApi.createInvitation(invitationData);
      
      if (result.success) {
        toast.success(`Successfully invited ${formData.email}`);
        
        // Reset form
        setFormData({
          email: '',
          role: 'viewer',
          level: 1
        });
        
        // Refresh invitations list
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

  // Get current user's info from invitations
  const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-prelude-800" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Team Invitations</h1>
              <p className="text-sm text-gray-600 mt-1">Invite and manage team members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Current User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : userNotFound ? (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <div className="ml-2">
                    <p className="text-sm text-yellow-800">
                      Your account information was not found in the database.
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Please contact your administrator to be added to the system.
                    </p>
                  </div>
                </Alert>
              ) : currentUserInfo.email ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {currentUserInfo.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Company</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {currentUserInfo.company}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Role</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Shield className="h-4 w-4 text-gray-400" />
                      {currentUserInfo.role}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Access Level</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Database className="h-4 w-4 text-gray-400" />
                      Level {currentUserInfo.level}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Loading your account information...</p>
              )}
            </CardContent>
          </Card>

          {/* Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite New Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={submitting || userNotFound}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-prelude-500"
                      disabled={submitting || userNotFound}
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
                  
                  <div>
                    <Label htmlFor="level">Access Level (1-10) *</Label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-prelude-500"
                      disabled={submitting || userNotFound}
                    >
                      {levelOptions.map(level => (
                        <option key={level} value={level}>
                          Level {level}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Higher levels have more permissions
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    The new member will join <strong>{currentUserInfo.company || 'your company'}</strong> with access to <strong>{currentUserInfo.database_name || 'the database'}</strong>
                  </p>
                  <Button 
                    type="submit" 
                    disabled={submitting || userNotFound}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-pink-500/25 transform hover:scale-105 transition-all duration-200"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Members
                      </>
                    )}
                  </Button>
                </div>

                {userNotFound && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div className="ml-2">
                      <p className="text-sm text-red-800">
                        You must be registered in the system to send invitations.
                      </p>
                    </div>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Team Members List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members ({invitations.length})
                </CardTitle>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : invitations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-gray-600">
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Company</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Level</th>
                        <th className="pb-3 font-medium">Database</th>
                        <th className="pb-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invitations.map((invitation, index) => (
                        <tr key={invitation.id || index} className="text-sm">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              {invitation.email}
                              {invitation.email === user?.email && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">You</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">{invitation.company}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium
                              ${invitation.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                invitation.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                invitation.role === 'user' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'}`}>
                              {invitation.role}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-medium">{invitation.level}</span>
                          </td>
                          <td className="py-3">{invitation.database_name}</td>
                          <td className="py-3 text-gray-500">
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
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No team members found</p>
                  <p className="text-sm mt-1">Start by inviting your first team member above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvitationsPage;