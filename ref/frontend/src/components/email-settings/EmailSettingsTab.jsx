import React, { useState, useEffect, useRef } from 'react';
import {
    Mail, FileSignature, CheckCircle, AlertTriangle,
    ChevronRight, ChevronDown, RefreshCw, Eye, Upload, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import { Input } from '../../components/ui/primitives/input';
import { useAuth } from '../../auth/hooks/useAuth';

// Constants
const API_BASE_URL = `${import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005'}/api`;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SIGNATURE_LENGTH = 500;
const CHAR_COUNT_WARNING_THRESHOLD = 400; // Show yellow warning
const CHAR_COUNT_DANGER_THRESHOLD = 475; // Show red warning
const SUCCESS_MESSAGE_DURATION = 3000; // 3 seconds
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

const EmailSettingsTab = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // Loading and Error State
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // Helper function to convert URLs and emails to clickable links in preview
    const linkifyPreview = (text) => {
        if (!text) return '';

        let html = text;

        // Convert URLs to clickable links
        html = html.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" style="color: #2563eb; text-decoration: underline;" target="_blank">$1</a>'
        );

        // Convert email addresses to mailto links
        html = html.replace(
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            '<a href="mailto:$1" style="color: #2563eb; text-decoration: underline;">$1</a>'
        );

        // Convert newlines to <br> tags
        html = html.replace(/\n/g, '<br/>');

        return html;
    };

    // Email Personality State
    const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
    const [emailSamples, setEmailSamples] = useState([
        { subject: '', body: '' },
        { subject: '', body: '' },
        { subject: '', body: '' }
    ]);
    const [sampleStatus, setSampleStatus] = useState({
        loading: false,
        error: null,
        success: false
    });

    // Email Signature State
    const [signature, setSignature] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [fontSize, setFontSize] = useState(12);
    const [logoHeight, setLogoHeight] = useState(50);
    const [signatureLoading, setSignatureLoading] = useState(false);
    const [signatureStatus, setSignatureStatus] = useState({ error: null, success: false });
    const [logoError, setLogoError] = useState(false);

    // Load both email samples and signature on mount
    useEffect(() => {
        const loadAllData = async () => {
            if (!user?.email) return;

            setInitialLoading(true);
            setLoadError(null);

            try {
                // Load both API endpoints in parallel for better performance
                const [samplesResponse, signatureResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/email-training/?user_email=${user.email}`).catch(() => null),
                    fetch(`${API_BASE_URL}/signature/?user_email=${user.email}`).catch(() => null)
                ]);

                // Process email samples if available
                if (samplesResponse?.ok) {
                    const data = await samplesResponse.json();
                    setEmailSamples([
                        { subject: data.subject1, body: data.body1 },
                        { subject: data.subject2, body: data.body2 },
                        { subject: data.subject3, body: data.body3 }
                    ]);
                    setSampleStatus(prev => ({ ...prev, success: true }));
                }

                // Process signature if available
                if (signatureResponse?.ok) {
                    const data = await signatureResponse.json();
                    setSignature(data.signature || '');
                    setLogoUrl(data.logo_url || '');
                    setFontSize(data.font_size || 12);
                    setLogoHeight(data.logo_height || 50);
                }
            } catch (error) {
                console.error('Error loading email preferences:', error);
                setLoadError('Unable to load email preferences. Please try again.');
            } finally {
                setInitialLoading(false);
            }
        };

        loadAllData();
    }, [user?.email]);

    // Email Personality Functions
    const handleSampleSubmit = async () => {
        const currentSample = emailSamples[currentSampleIndex];

        if (!currentSample.subject.trim() || !currentSample.body.trim()) {
            setSampleStatus({
                ...sampleStatus,
                error: 'Please fill in both subject and body'
            });
            return;
        }

        if (currentSampleIndex < 2) {
            setCurrentSampleIndex(currentSampleIndex + 1);
            setSampleStatus({ loading: false, error: null, success: false });
        } else {
            await saveAllSamples();
        }
    };

    const saveAllSamples = async () => {
        // Validate all samples are complete
        for (let i = 0; i < 3; i++) {
            if (!emailSamples[i].subject.trim() || !emailSamples[i].body.trim()) {
                setSampleStatus({
                    loading: false,
                    error: `Please complete sample ${i + 1}`,
                    success: false
                });
                return;
            }
        }

        setSampleStatus({ loading: true, error: null, success: false });

        try {
            const response = await fetch(`${API_BASE_URL}/email-training/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: user?.email,
                    subject1: emailSamples[0].subject,
                    body1: emailSamples[0].body,
                    subject2: emailSamples[1].subject,
                    body2: emailSamples[1].body,
                    subject3: emailSamples[2].subject,
                    body3: emailSamples[2].body
                })
            });

            if (!response.ok) throw new Error('Failed to save email training');
            setSampleStatus({ loading: false, error: null, success: true });
        } catch (error) {
            setSampleStatus({ loading: false, error: error.message, success: false });
        }
    };

    const handleSampleChange = (field, value) => {
        const newSamples = [...emailSamples];
        newSamples[currentSampleIndex][field] = value;
        setEmailSamples(newSamples);
    };

    const handleEditSample = (index) => {
        setCurrentSampleIndex(index);
        setSampleStatus({ ...sampleStatus, success: false });
    };

    // Email Signature Functions
    const uploadLogo = async (file) => {
        // Validate file type
        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            setSignatureStatus({
                error: 'Please select an image file (PNG, JPG, GIF, WEBP)',
                success: false
            });
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setSignatureStatus({
                error: 'Image file must be less than 5MB',
                success: false
            });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setSignatureLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/signature/upload-logo?user_email=${user?.email}`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setLogoUrl(data.logo_url);
                setLogoError(false);
                setSignatureStatus({ error: null, success: true });
                setTimeout(() => setSignatureStatus({ error: null, success: false }), SUCCESS_MESSAGE_DURATION);
            } else {
                setSignatureStatus({ error: 'Failed to upload logo', success: false });
            }
        } catch (error) {
            setSignatureStatus({ error: 'Failed to upload logo', success: false });
        } finally {
            setSignatureLoading(false);
        }
    };

    const saveSignature = async () => {
        setSignatureLoading(true);
        setSignatureStatus({ error: null, success: false });

        try {
            const response = await fetch(`${API_BASE_URL}/signature/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: user?.email,
                    signature,
                    logo_url: logoUrl,
                    font_size: fontSize,
                    logo_height: logoHeight
                })
            });

            if (response.ok) {
                setSignatureStatus({ error: null, success: true });
                setTimeout(() => setSignatureStatus({ error: null, success: false }), SUCCESS_MESSAGE_DURATION);
            } else {
                setSignatureStatus({ error: 'Failed to save signature', success: false });
            }
        } catch (error) {
            setSignatureStatus({ error: 'Failed to save signature', success: false });
        } finally {
            setSignatureLoading(false);
        }
    };

    const handleClearSignature = () => {
        setSignature('');
        setLogoUrl('');
        setFontSize(12);
        setLogoHeight(50);
        setLogoError(false);
    };

    const handleRemoveLogo = () => {
        setLogoUrl('');
        setLogoError(false);
    };

    const retryLoad = () => {
        window.location.reload();
    };

    // Show loading screen during initial data fetch
    if (initialLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading email preferences...</span>
                </div>
            </div>
        );
    }

    // Show error screen if initial load failed
    if (loadError) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Preferences</h3>
                    <p className="text-gray-600 mb-4">{loadError}</p>
                    <Button onClick={retryLoad}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Personality Section */}
            <div className="pr-6 border-r border-gray-200">
                <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-purple-600" />
                        Email Personality Training
                    </h3>
                    <p className="text-xs text-gray-600">Train your AI to write emails in your style</p>
                </div>

                {sampleStatus.success ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Trained · 3 samples
                                </span>
                                <span className="text-xs text-gray-600">Your AI uses your tone</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSampleStatus({ ...sampleStatus, success: false })}
                                className="text-xs text-gray-600 hover:text-gray-900 h-7"
                            >
                                Update
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {emailSamples.map((sample, index) => (
                                <div key={index} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-gray-900">#{index + 1}</div>
                                        <div className="text-xs text-gray-600 truncate">{sample.subject}</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditSample(index)}
                                        className="ml-2 text-gray-600 hover:text-gray-900 h-6 px-2"
                                    >
                                        <Eye className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Sample {currentSampleIndex + 1} of 3</span>
                                <span className="text-sm text-gray-500">
                                    {currentSampleIndex === 0 && "Getting started"}
                                    {currentSampleIndex === 1 && "One more to go"}
                                    {currentSampleIndex === 2 && "Last one!"}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentSampleIndex + 1) / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                                <Input
                                    value={emailSamples[currentSampleIndex].subject}
                                    onChange={(e) => handleSampleChange('subject', e.target.value)}
                                    placeholder="Enter a typical email subject"
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                                <textarea
                                    value={emailSamples[currentSampleIndex].body}
                                    onChange={(e) => handleSampleChange('body', e.target.value)}
                                    placeholder="Enter the email body content..."
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>

                            {sampleStatus.error && (
                                <div className="flex items-center gap-2 text-red-600 text-sm">
                                    <AlertTriangle className="h-4 w-4" />
                                    {sampleStatus.error}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                {currentSampleIndex > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentSampleIndex(currentSampleIndex - 1)}
                                        disabled={sampleStatus.loading}
                                    >
                                        <ChevronDown className="h-4 w-4 mr-1 rotate-90" />
                                        Previous
                                    </Button>
                                )}
                                <div className="flex-1" />
                                <Button
                                    onClick={handleSampleSubmit}
                                    disabled={sampleStatus.loading}
                                    className="min-w-[140px]"
                                >
                                    {sampleStatus.loading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : currentSampleIndex < 2 ? (
                                        <>
                                            Save & Continue
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Complete Training
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                            <h4 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-2">
                                <span className="text-blue-600">💡</span>
                                Tips for best results
                            </h4>
                            <ul className="text-sm text-blue-800 space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Use emails that represent your typical writing style</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Include different types of emails (formal, casual, follow-ups)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Make sure the emails are complete and well-structured</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Signature Section */}
            <div className="pl-6">
                <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1">
                        <FileSignature className="w-4 h-4 text-purple-600" />
                        Email Signature
                    </h3>
                    <p className="text-xs text-gray-600">Customize your email signature with logo</p>
                </div>

                <div className="space-y-3">
                    {/* Signature Text + Logo Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Signature Text - takes 2/3 */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Signature Text</label>
                            <textarea
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="John Smith&#10;Senior Manager&#10;Acme Corp&#10;john@acme.com | 555-1234"
                                rows={5}
                                maxLength={MAX_SIGNATURE_LENGTH}
                                disabled={signatureLoading}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Logo Upload - takes 1/3 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Logo (Optional)</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])}
                                aria-label="Upload signature logo"
                            />
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="outline"
                                    disabled={signatureLoading}
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-1 text-xs h-7"
                                >
                                    <Upload className="h-3 w-3" />
                                    {logoUrl ? 'Change' : 'Upload'}
                                </Button>
                                {logoUrl && (
                                    <>
                                        <Button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            variant="ghost"
                                            disabled={signatureLoading}
                                            size="sm"
                                            className="w-full flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 h-7"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Remove
                                        </Button>
                                        <div className="p-2 bg-gray-50 rounded border">
                                            <img
                                                src={logoUrl}
                                                alt="Logo"
                                                onError={() => setLogoError(true)}
                                                className={`w-full ${logoError ? 'hidden' : ''}`}
                                                style={{ height: `${logoHeight}px`, width: 'auto', objectFit: 'contain' }}
                                            />
                                            {logoError && (
                                                <div className="text-red-500 text-xs flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Failed
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Compact Settings Row */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 pb-2 border-b border-gray-100">
                        <span className={`font-medium ${
                            signature.length < CHAR_COUNT_WARNING_THRESHOLD ? 'text-green-600' :
                            signature.length < CHAR_COUNT_DANGER_THRESHOLD ? 'text-yellow-600' :
                            'text-red-600'
                        }`}>
                            {signature.length}/{MAX_SIGNATURE_LENGTH}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                            <label className="whitespace-nowrap">Text {fontSize}px</label>
                            <input
                                type="range"
                                min="8"
                                max="20"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                disabled={signatureLoading}
                                aria-label="Signature text size"
                                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
                            />
                        </div>
                        {logoUrl && (
                            <div className="flex items-center gap-2 flex-1">
                                <label className="whitespace-nowrap">Logo {logoHeight}px</label>
                                <input
                                    type="range"
                                    min="30"
                                    max="100"
                                    value={logoHeight}
                                    onChange={(e) => setLogoHeight(Number(e.target.value))}
                                    disabled={signatureLoading}
                                    aria-label="Logo height"
                                    className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Preview
                        </div>
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.6', color: '#374151' }}>
                                <div className="mb-2 text-gray-600">Regards,</div>
                                <div
                                    className="text-gray-900 mb-3"
                                    dangerouslySetInnerHTML={{
                                        __html: signature
                                            ? linkifyPreview(signature)
                                            : '<span class="text-gray-400 italic text-sm">Start typing above to see your signature preview...</span>'
                                    }}
                                />
                                {logoUrl && (
                                    <div className="mt-3">
                                        <img
                                            src={logoUrl}
                                            alt="Signature Logo"
                                            onError={() => setLogoError(true)}
                                            style={{ height: `${logoHeight}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
                                            className={logoError ? 'hidden' : ''}
                                        />
                                        {logoError && (
                                            <div className="text-red-500 text-sm flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                Failed to load logo
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Messages */}
                    {signatureStatus.success && (
                        <div
                            className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
                            role="status"
                            aria-live="polite"
                        >
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Signature saved successfully!</span>
                        </div>
                    )}
                    {signatureStatus.error && (
                        <div
                            className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
                            role="alert"
                            aria-live="assertive"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">{signatureStatus.error}</span>
                        </div>
                    )}

                    {/* Save/Clear Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={saveSignature}
                            disabled={signatureLoading}
                            size="sm"
                            className="flex items-center gap-1 text-sm h-8"
                        >
                            {signatureLoading ? (
                                <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                        <Button
                            onClick={handleClearSignature}
                            variant="outline"
                            disabled={signatureLoading}
                            size="sm"
                            className="text-sm h-8"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default EmailSettingsTab;
