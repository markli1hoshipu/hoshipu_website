import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Label } from '../ui/primitives/label';
import { Textarea } from '../ui/primitives/textarea';
import { Checkbox } from '../ui/primitives/checkbox';
import { Slider } from '../ui/primitives/slider';
import { Badge } from '../ui/primitives/badge';
import { Progress } from '../ui/primitives/progress';
import { Separator } from '../ui/primitives/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/primitives/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/primitives/alert-dialog';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Info,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Users,
  Building,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  TrendingUp
} from 'lucide-react';

import unifiedWorkflowApiService from '../../services/unifiedWorkflowApi';

const UnifiedWorkflowManager = ({
  onLeadsGenerated = () => {},
  onResultsUpdate = () => {},
  onProgressUpdate = () => {},
  onExecutionStatusUpdate = () => {},
  onStageUpdate = () => {},
  onStatsUpdate = () => {},
  hideResults = false
}) => {
  // Form state
  const [formData, setFormData] = useState({
    industry: '',
    location: '',
    max_results: 50,
    session_name: '',
    min_score_threshold: 30,
    save_to_database: true
  });

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Progress tracking
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [stageDetails, setStageDetails] = useState({});
  const [estimatedCompletion, setEstimatedCompletion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Configuration
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [workflowInfo, setWorkflowInfo] = useState(null);

  // Load workflow information on mount
  useEffect(() => {
    loadWorkflowInfo();
  }, []);

  // Poll for execution status
  useEffect(() => {
    let interval;
    if (isExecuting && currentSession) {
      interval = setInterval(() => {
        pollExecutionStatus();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExecuting, currentSession]);

  const loadWorkflowInfo = async () => {
    try {
      const data = await unifiedWorkflowApiService.getWorkflowInfo();
      setWorkflowInfo(data.unified_lead_generation);
    } catch (error) {
      console.error('Error loading workflow info:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const executeWorkflow = async () => {
    if (!formData.industry || !formData.location) {
      setError('Please provide both industry and location');
      return;
    }

    if (formData.max_results < 10 || formData.max_results > 200) {
      setError('Maximum results must be between 10 and 200');
      return;
    }

    setIsExecuting(true);
    onExecutionStatusUpdate(true);
    setError(null);
    setProgress(0); // Ensure it's a valid number
    onProgressUpdate(0);
    setCurrentStage('Initializing...');
    onStageUpdate('Initializing...');
    setResults(null);
    onResultsUpdate(null);
    setStageDetails({}); // Clear previous stage details
    onStatsUpdate({ companiesFound: 0, leadsCreated: 0, qualifiedLeads: 0, averageScore: 0 });

    try {
      const result = await unifiedWorkflowApiService.executeWorkflow(formData);

      setCurrentSession(result.session_id);

      // Handle immediate completion or start polling
      if (result.status === 'completed') {
        handleWorkflowCompletion(result);
      }

    } catch (error) {
      setError(error.message);
      setIsExecuting(false);
      onExecutionStatusUpdate(false);
    }
  };

  const pollExecutionStatus = async () => {
    if (!currentSession) return;

    try {
      const status = await unifiedWorkflowApiService.getWorkflowStatus(currentSession);

      setExecutionStatus(status);

      // Ensure progress is a valid number
      const progressValue = status.progress_percentage;
      const validProgress = (typeof progressValue === 'number' && !isNaN(progressValue)) ? progressValue : 0;
      setProgress(validProgress);
      onProgressUpdate(validProgress);

      setCurrentStage(status.current_step || '');
      onStageUpdate(status.current_step || '');

      // Update stats
      onStatsUpdate({
        companiesFound: status.companies_found || 0,
        leadsCreated: status.leads_created || 0,
        qualifiedLeads: status.qualified_leads || 0,
        averageScore: status.average_score || 0
      });

      // Update estimated completion and time remaining
      if (status.estimated_completion) {
        const estimatedTime = new Date(status.estimated_completion);
        setEstimatedCompletion(estimatedTime);

        const now = new Date();
        const remainingMs = estimatedTime.getTime() - now.getTime();
        if (remainingMs > 0) {
          const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
          setTimeRemaining(remainingMinutes);
        } else {
          setTimeRemaining(0);
        }
      }

      // Update stage details based on current step
      updateStageDetails(status);

      if (status.status === 'completed') {
        handleWorkflowCompletion(status);
      } else if (status.status === 'failed') {
        setError('Workflow execution failed');
        setIsExecuting(false);
        onExecutionStatusUpdate(false);
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  };

  const updateStageDetails = (status) => {
    const stageMapping = {
      'completed': {
        icon: CheckCircle,
        name: 'Completed',
        color: 'bg-green-600',
        description: 'Workflow completed successfully',
        expectedDuration: 'Done'
      },
      'initializing': {
        icon: RefreshCw,
        name: 'Initializing',
        color: 'bg-gray-500',
        description: 'Setting up workflow and preparing lead generation',
        expectedDuration: '15 seconds'
      },
      'processing': {
        icon: Zap,
        name: 'Processing',
        color: 'bg-blue-500',
        description: 'Generating leads using AI-powered workflows',
        expectedDuration: '1-2 minutes'
      }
    };

    const currentStageInfo = stageMapping[status.current_step] || stageMapping['processing'];

    setStageDetails({
      ...currentStageInfo,
      companiesFound: status.companies_found || 0,
      leadsCreated: status.leads_created || 0,
      stepsCompleted: status.steps_completed || 0,
      totalSteps: status.total_steps || 1
    });
  };

  const handleWorkflowCompletion = (result) => {
    setIsExecuting(false);
    onExecutionStatusUpdate(false);
    setProgress(100);
    onProgressUpdate(100);
    setCurrentStage('Completed');
    onStageUpdate('Completed');
    setResults(result);
    onResultsUpdate(result);

    // Parse and notify parent component with normalized lead data
    const parsedLeads = unifiedWorkflowApiService.parseWorkflowResults(result);
    if (parsedLeads.length > 0) {
      onLeadsGenerated(parsedLeads);
    }

  };

  const cancelWorkflow = async () => {
    if (!currentSession) return;

    try {
      await unifiedWorkflowApiService.cancelWorkflow(currentSession);
      setIsExecuting(false);
      onExecutionStatusUpdate(false);
      setCurrentStage('Cancelled');
      onStageUpdate('Cancelled');
    } catch (error) {
    }
  };

  const calculateTimeRemaining = (estimatedCompletion) => {
    if (!estimatedCompletion) return 'Calculating...';

    try {
      const now = new Date();
      const completion = new Date(estimatedCompletion);
      const diffMs = completion.getTime() - now.getTime();

      if (diffMs <= 0) return 'Almost done...';

      const diffMinutes = Math.ceil(diffMs / (1000 * 60));

      if (diffMinutes < 1) return 'Less than 1 minute';
      if (diffMinutes === 1) return '1 minute remaining';
      if (diffMinutes < 60) return `${diffMinutes} minutes remaining`;

      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      return `${diffHours}h ${remainingMinutes}m remaining`;
    } catch (error) {
      console.warn('Error calculating time remaining:', error);
      return 'Calculating...';
    }
  };

  const resetWorkflow = () => {
    setIsExecuting(false);
    setCurrentSession(null);
    setExecutionStatus(null);
    setResults(null);
    setError(null);
    setProgress(0);
    setCurrentStage('');
    setStageDetails({});
    setEstimatedCompletion(null);
    setTimeRemaining(null);
  };

  const renderWorkflowStages = () => {
    // Don't render the workflow stages section at all
    return null;
  };

  const renderProgressSection = () => {
    if (!isExecuting && !results) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stageDetails.icon && <stageDetails.icon className={`w-5 h-5 ${isExecuting && stageDetails.name === 'Initializing' ? 'animate-spin' : ''}`} />}
            {isExecuting ? 'Workflow Execution' : 'Workflow Results'}
            {stageDetails.stepsCompleted !== undefined && stageDetails.totalSteps && (
              <Badge variant="outline" className="ml-2">
                Step {stageDetails.stepsCompleted + 1}/{stageDetails.totalSteps}
              </Badge>
            )}
          </CardTitle>
          {isExecuting ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-gray-900">Current stage: {stageDetails.name || currentStage}</div>
              {stageDetails.description && (
                <div className="text-sm text-gray-600">{stageDetails.description}</div>
              )}
              {stageDetails.expectedDuration && (
                <div className="text-xs text-gray-500">Expected duration: {stageDetails.expectedDuration}</div>
              )}
            </div>
          ) : (
            <CardDescription>Workflow completed successfully</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progress</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-600">{(() => {
                    const progressValue = Number(progress) || 0;
                    const result = isNaN(progressValue) ? 0 : Math.round(progressValue);
                    return result;
                  })()}%</span>
                  {executionStatus?.estimated_completion && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {calculateTimeRemaining(executionStatus.estimated_completion)}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={(() => {
                const rawProgress = progress || 0;
                const clampedProgress = Math.max(0, Math.min(100, rawProgress));
                return clampedProgress;
              })()} className="w-full h-3" />

              {/* Stage Progress Indicators */}
              {stageDetails.stepsCompleted !== undefined && stageDetails.totalSteps && (
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Stage {stageDetails.stepsCompleted + 1} of {stageDetails.totalSteps}</span>
                  <span>{(() => {
                    const steps = Number(stageDetails.stepsCompleted) || 0;
                    const totalSteps = Number(stageDetails.totalSteps) || 1;
                    const currentProgress = Number(progress) || 0;
                    const calculation = ((steps + currentProgress/100) / totalSteps * 100);
                    const result = isNaN(calculation) ? 0 : Math.round(calculation);
                    return result;
                  })()}% overall</span>
                </div>
              )}
            </div>

            {(stageDetails.companiesFound > 0 || stageDetails.leadsCreated > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Building className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">
                    {stageDetails.companiesFound}
                  </div>
                  <div className="text-sm text-gray-600">Companies Found</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-1 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {stageDetails.leadsCreated}
                  </div>
                  <div className="text-sm text-gray-600">Leads Created</div>
                </div>
              </div>
            )}

            {isExecuting && (
              <div className="flex justify-center">
                <Button onClick={cancelWorkflow} variant="outline" size="sm">
                  <Square className="w-4 h-4 mr-2" />
                  Cancel Workflow
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const statistics = results.statistics || {};
    const finalLeads = results.final_leads || [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Workflow Results
          </CardTitle>
          <CardDescription>
            Generated {statistics.qualified_leads || finalLeads.length} qualified leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Building className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                {statistics.total_companies_discovered || 0}
              </div>
              <div className="text-sm text-gray-600">Companies Discovered</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">
                {statistics.companies_enriched || 0}
              </div>
              <div className="text-sm text-gray-600">Companies Enriched</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Zap className="w-6 h-6 mx-auto mb-1 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">
                {statistics.leads_created || 0}
              </div>
              <div className="text-sm text-gray-600">Leads Created</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Star className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {statistics.qualified_leads || 0}
              </div>
              <div className="text-sm text-gray-600">Qualified Leads</div>
            </div>
          </div>

          {statistics.average_score && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Average Lead Score</span>
                <span className="font-medium">{Math.round(statistics.average_score || 0)}/100</span>
              </div>
              <Progress value={Math.max(0, Math.min(100, statistics.average_score || 0))} className="w-full" />
            </div>
          )}

          {statistics.success_rate && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Success Rate</span>
                <span className="font-medium">{Math.round(statistics.success_rate || 0)}%</span>
              </div>
              <Progress value={Math.max(0, Math.min(100, statistics.success_rate || 0))} className="w-full" />
            </div>
          )}

          {statistics.score_distribution && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Lead Score Distribution</h4>
              <div className="space-y-2">
                {Object.entries(statistics.score_distribution).map(([range, count]) => (
                  <div key={range} className="flex justify-between text-sm">
                    <span>{range}</span>
                    <Badge variant="outline">{count} leads</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalLeads.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-3">Sample Leads ({finalLeads.length} total)</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {finalLeads.slice(0, 5).map((lead, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium">{lead.company_name}</h5>
                      <Badge variant={lead.final_score >= 80 ? 'default' : lead.final_score >= 60 ? 'secondary' : 'outline'}>
                        {lead.final_score}/100
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {lead.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.location}
                        </div>
                      )}
                      {lead.emails?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.emails[0]}
                        </div>
                      )}
                      {lead.phones?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phones[0]}
                        </div>
                      )}
                      {lead.websites?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {lead.websites[0]}
                        </div>
                      )}
                      {lead.primary_contact && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {lead.primary_contact}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={resetWorkflow} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
            {results.saved_leads_count > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {results.saved_leads_count} leads saved to database
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Workflow Stages */}
      {renderWorkflowStages()}

      {/* Configuration Form */}
      {(
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <Settings className="w-5 h-5" /> */}
              Workflow Configuration
            </CardTitle>
            <CardDescription className="text-xs text-gray-600">
              Configure your unified lead generation workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Basic Configuration */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Technology, Healthcare, Manufacturing"
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="border-gray-300 focus:border-gray-600 placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Toronto, Ontario, Canada"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="border-gray-300 focus:border-gray-600 placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="max_results">Maximum Results (10-200)</Label>
                <Input
                  id="max_results"
                  type="number"
                  min="10"
                  max="200"
                  placeholder="50"
                  value={formData.max_results}
                  onChange={(e) => handleInputChange('max_results', parseInt(e.target.value))}
                  className="border-gray-300 focus:border-gray-600 placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="session_name">Session Name (Optional)</Label>
                <Input
                  id="session_name"
                  placeholder="e.g., Q1-Toronto-Tech"
                  value={formData.session_name}
                  onChange={(e) => handleInputChange('session_name', e.target.value)}
                  className="border-gray-300 focus:border-gray-600 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Advanced Configuration */}
            <Separator className="mt-2" />
            <div className="py-1">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex justify-between gap-3 px-1 py-1 h-2"
              >
                <span>Advanced Options</span>
                {showAdvanced ? '▼' : '▶'}
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <Label className="text-base font-medium">Lead Generation Options</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="enhanced_ai_processing"
                        checked={true}
                        disabled={true}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="enhanced_ai_processing" className="text-sm font-medium">
                          Enhanced AI Processing
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Advanced AI algorithms for lead discovery and qualification
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="min_score_threshold">
                    Minimum Lead Score Threshold: {formData.min_score_threshold}
                  </Label>
                  <Slider
                    id="min_score_threshold"
                    min={0}
                    max={100}
                    step={10}
                    value={[formData.min_score_threshold]}
                    onValueChange={(value) => handleInputChange('min_score_threshold', value[0])}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 (All)</span>
                    <span>50 (Medium)</span>
                    <span>100 (High Quality)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save_to_database"
                    checked={formData.save_to_database}
                    onCheckedChange={(checked) => handleInputChange('save_to_database', checked)}
                  />
                  <Label htmlFor="save_to_database">
                    Save leads to database automatically
                  </Label>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <div className="flex justify-center">
              {!isExecuting ? (
                <Button
                  onClick={executeWorkflow}
                  disabled={!formData.industry || !formData.location}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:text-black"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Unified Workflow
                </Button>
              ) : (
                <Button
                  onClick={cancelWorkflow}
                  variant="outline"
                  size="lg"
                  className="min-w-48"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Cancel Workflow
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Section */}
      {!hideResults && renderProgressSection()}

      {/* Results Section */}
      {!hideResults && renderResults()}
    </div>
  );
};

export default UnifiedWorkflowManager;