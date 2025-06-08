import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar } from 'recharts';
import { storage, db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';

const ATSScoreChecker = () => {
    const [resume, setResume] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [selectedJdType, setSelectedJdType] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    const [sampleJdOpen, setSampleJdOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('score');
    const [resumeFile, setResumeFile] = useState(null);
    const [error, setError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [firebaseFileData, setFirebaseFileData] = useState(null);


    // Backend API URL - Fixed for browser environment
    const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://your-backend-url.com';

    const sampleJDs = {
        'java': `Job Title: Java Full Stack Developer
Location: Remote with occasional onsite meetings
Employment type: Contract (6-12 months)

Required Skills & Competencies:
- 5+ years of experience in Java development
- Strong proficiency in Spring Boot, Spring Framework, Hibernate
- Experience with front-end technologies (Angular, React, or Vue)
- Experience with microservices architecture and RESTful APIs
- Proficient with relational databases (MySQL, PostgreSQL, Oracle)
- Knowledge of cloud technologies (AWS, Azure, or GCP)
- Understanding of DevOps practices and CI/CD pipelines
- Version control with Git`,

        'servicenow': `Job Title: ServiceNow Developer
Location: Remote (US-based)
Employment type: Contract (6 months, possible extension)

Required Skills & Competencies:
- 3+ years of experience in ServiceNow development and administration
- ServiceNow Certified System Administrator and Application Developer certifications
- Strong knowledge of JavaScript, AngularJS, and ServiceNow scripting
- Experience with ITIL processes and frameworks
- Proficiency in ServiceNow modules (ITSM, ITBM, ITOM, CSM)`,

        'vmware': `Job Title: VMware/Windows Administrator
Location: Houston, TX
Employment type: Contract (12 months)

Required Skills & Competencies:
- 5+ years of experience in VMware administration
- 7+ years of experience in Windows Server administration (2012, 2016, 2019)
- VMware vSphere 6.x/7.x certification
- Experience with VMware ESXi, vCenter, vSAN, and NSX
- Proficiency in Active Directory, DNS, DHCP, and Group Policy`,

        'data': `Job Title: Data Engineer
Location: Chicago, IL (Hybrid)
Employment type: Contract (9 months)

Required Skills & Competencies:
- 4+ years of experience in data engineering
- Proficiency in Python, Scala, or Java for data processing
- Experience with big data technologies (Hadoop, Spark, Hive)
- Strong SQL skills and experience with relational databases
- Experience with cloud data services (AWS Redshift, S3, EMR)`
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            handleFileUpload(file);
        }
    };

    const handleFileUpload = async (file) => {
        setError(null);
        setResumeFile(file);
        setFileUploaded(true);
        setUploadProgress(25);

        try {
            // Upload to Firebase Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}-${file.name}`;
            const storageRef = ref(storage, `resumes/${fileName}`);

            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setFirebaseFileData({
                fileName,
                downloadURL,
                filePath: snapshot.ref.fullPath,
                size: file.size,
                type: file.type
            });

            setUploadProgress(100);

            if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setResume(e.target.result);
                };
                reader.readAsText(file);
            } else {
                setResume('');
            }
        } catch (error) {
            setError(`File upload failed: ${error.message}`);
            setUploadProgress(0);
        }
    };

    const handleResumeUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        handleFileUpload(file);
    };

    const loadSampleJD = (jdType) => {
        setSelectedJdType(jdType);
        setJobDescription(sampleJDs[jdType]);
        setSampleJdOpen(false);
    };

    const analyzeResume = async () => {
        if ((!resumeFile && !resume.trim()) || !jobDescription.trim()) {
            setError('Please upload your resume and enter a job description');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let response;

            if (resumeFile) {
                const formData = new FormData();
                formData.append('resume', resumeFile);
                formData.append('jobDescription', jobDescription);

                response = await fetch(`${API_BASE_URL}/api/analyze-resume`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/analyze-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        resumeText: resume,
                        jobDescription: jobDescription,
                    }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const data = await response.json();
            const transformedResult = transformBackendResponse(data.data);
            setResult(transformedResult);
            setActiveTab('score');
            try {
                await addDoc(collection(db, 'analyses'), {
                    userId: 'user_' + Date.now(), // You can improve this with proper user auth
                    timestamp: new Date(),
                    score: transformedResult.score,
                    analysis: data.data,
                    file: firebaseFileData || { fileName: 'text-input', type: 'text/plain' },
                    jobDescription: jobDescription.substring(0, 200) // Save first 200 chars
                });
            } catch (saveError) {
                console.error('Error saving to database:', saveError);
            }

        } catch (error) {
            console.error('Analysis error:', error);
            setError(`Analysis failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const transformBackendResponse = (backendData) => {
        const { overallScore, breakdown, matchedSkills, recommendations } = backendData;

        const matchedKeywords = [];
        const missingKeywords = [];

        if (matchedSkills) {
            Object.entries(matchedSkills).forEach(([category, data]) => {
                if (data.matched) {
                    data.matched.forEach(skill => {
                        matchedKeywords.push({
                            name: skill.skill,
                            resumeMentions: skill.resumeCount,
                            jobMentions: skill.jobCount
                        });
                    });
                }

                if (data.missing) {
                    data.missing.forEach(skill => {
                        missingKeywords.push({
                            name: skill.skill,
                            importance: skill.importance,
                            jobMentions: skill.jobCount
                        });
                    });
                }
            });
        }

        const scoreBreakdown = [
            {
                name: 'Skill Match',
                value: Math.round((breakdown?.skillMatch?.score || 0) * 0.6),
                color: '#6366F1',
                percentage: breakdown?.skillMatch?.score || 0,
                weight: breakdown?.skillMatch?.weight || '60%'
            },
            {
                name: 'Semantic Match',
                value: Math.round((breakdown?.semanticSimilarity?.score || 0) * 0.2),
                color: '#10B981',
                percentage: breakdown?.semanticSimilarity?.score || 0,
                weight: breakdown?.semanticSimilarity?.weight || '20%'
            },
            {
                name: 'Structure',
                value: Math.round((breakdown?.structure?.score || 0) * 0.15),
                color: '#F59E0B',
                percentage: breakdown?.structure?.score || 0,
                weight: breakdown?.structure?.weight || '15%'
            },
            {
                name: 'Content Quality',
                value: Math.round((breakdown?.contentQuality?.score || 0) * 0.05),
                color: '#EF4444',
                percentage: breakdown?.contentQuality?.score || 0,
                weight: breakdown?.contentQuality?.weight || '5%'
            }
        ];

        const totalMentions = matchedKeywords.reduce((sum, skill) => sum + skill.resumeMentions, 0);
        const uniqueKeywords = matchedKeywords.length;
        const density = uniqueKeywords > 0 ? parseFloat((totalMentions / uniqueKeywords).toFixed(1)) : 0;

        return {
            score: overallScore || 0,
            keywordMatch: breakdown?.skillMatch?.score || 0,
            rawMatchPercentage: breakdown?.skillMatch?.score || 0,
            matchedKeywords,
            missingKeywords,
            keywordDensity: {
                totalMentions,
                uniqueKeywords,
                density
            },
            lengthScore: breakdown?.structure?.score || 0,
            formatScore: breakdown?.structure?.score || 0,
            pageLengthEstimate: Math.ceil((breakdown?.contentQuality?.wordCount || 500) / 500),
            recommendations: recommendations || [],
            scoreBreakdown,
            advancedData: {
                semanticSimilarity: breakdown?.semanticSimilarity?.score || 0,
                skillCategories: matchedSkills || {},
                foundSections: breakdown?.structure?.foundSections || []
            }
        };
    };

    const getScoreRating = (score) => {
        if (score >= 85) return { text: 'Excellent', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' };
        if (score >= 70) return { text: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' };
        if (score >= 60) return { text: 'Moderate', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' };
        return { text: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Hero Header */}
            <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                                CareerScan Pro
                            </h1>
                        </div>
                        <div className="flex items-center justify-center mt-4 space-x-6 text-sm text-indigo-200">
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                Semantic Analysis
                            </div>
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                                Skill Matching
                            </div>
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                Real-time Processing
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-sm">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-red-700">
                                    <strong className="font-medium">Error:</strong> {error}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Section */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                📄
                            </span>
                            Upload Resume & Job Description
                        </h2>
                        <p className="text-gray-600 mt-2">Start by uploading your resume and the target job description for AI analysis</p>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Resume Upload Section */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        📎 Upload Your Resume
                                    </label>

                                    {/* Drag and Drop Area */}
                                    <div
                                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                                            isDragOver
                                                ? 'border-indigo-400 bg-indigo-50'
                                                : fileUploaded
                                                    ? 'border-green-400 bg-green-50'
                                                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            onChange={handleResumeUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept=".txt,.doc,.docx,.pdf"
                                        />

                                        {fileUploaded ? (
                                            <div className="space-y-2">
                                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                                    <span className="text-2xl">✅</span>
                                                </div>
                                                <p className="text-green-700 font-medium">Resume uploaded successfully!</p>
                                                <p className="text-sm text-gray-600">
                                                    File: {resumeFile?.name}
                                                    {firebaseFileData && (
                                                        <span className="block text-xs text-purple-600 mt-1">✨ Stored in Firebase Storage</span>
                                                    )}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                                    <span className="text-2xl">📄</span>
                                                </div>
                                                <p className="text-lg font-medium text-gray-700">
                                                    Drop your resume here or click to browse
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Supports PDF, DOC, DOCX, TXT (max 10MB)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Alternative */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        ✏️ Or paste resume text:
                                    </label>
                                    <textarea
                                        value={resume}
                                        onChange={(e) => setResume(e.target.value)}
                                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        rows="6"
                                        placeholder="Paste your resume text here as an alternative to file upload..."
                                    />
                                </div>
                            </div>

                            {/* Job Description Section */}
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            🎯 Job Description
                                        </label>
                                        <button
                                            onClick={() => setSampleJdOpen(!sampleJdOpen)}
                                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center transition-colors"
                                        >
                                            <span className="mr-1">⚡</span>
                                            Load Sample JD
                                        </button>
                                    </div>

                                    {sampleJdOpen && (
                                        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-3">Choose a sample job description:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(sampleJDs).map(([key, _]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => loadSampleJD(key)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                            selectedJdType === key
                                                                ? 'bg-indigo-600 text-white shadow-md'
                                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {key === 'java' && '☕ Java Full Stack'}
                                                        {key === 'servicenow' && '🔧 ServiceNow Dev'}
                                                        {key === 'vmware' && '🖥️ VMware Admin'}
                                                        {key === 'data' && '📊 Data Engineer'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        rows="12"
                                        placeholder="Paste the job description here..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Analyze Button */}
                        <div className="mt-8 text-center">
                            <button
                                onClick={analyzeResume}
                                disabled={loading || (!fileUploaded && !resume.trim()) || !jobDescription.trim()}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                        🤖 AI is analyzing your resume...
                                    </div>
                                ) : (
                                    <span className="flex items-center">
                                        <span className="mr-2">🚀</span>
                                        Analyze Resume with AI
                                    </span>
                                )}
                            </button>

                            {loading && (
                                <div className="mt-6 max-w-md mx-auto">
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                        <p className="text-indigo-800 font-medium">Our AI is performing deep analysis...</p>
                                        <p className="text-sm text-indigo-600 mt-1">Using advanced NLP and machine learning for comprehensive scoring</p>
                                        <div className="mt-3 bg-indigo-200 rounded-full h-2">
                                            <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {result && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        {/* Enhanced Tabs */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <div className="flex overflow-x-auto">
                                {[
                                    { id: 'score', label: '📊 AI Score Analysis', icon: '📊' },
                                    { id: 'missing', label: '❌ Missing Skills', icon: '❌' },
                                    { id: 'matched', label: '✅ Matched Skills', icon: '✅' },
                                    { id: 'recommendations', label: '💡 AI Recommendations', icon: '💡' },
                                    { id: 'advanced', label: '🔬 Advanced Analysis', icon: '🔬' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        className={`px-6 py-4 font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                                            activeTab === tab.id
                                                ? 'text-indigo-600 border-indigo-600 bg-white'
                                                : 'text-gray-600 border-transparent hover:text-gray-800 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Score Tab */}
                        {activeTab === 'score' && (
                            <div className="p-8">
                                {/* Score Hero Section */}
                                <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-8 mb-8 border border-indigo-100">
                                    <div className="flex flex-col lg:flex-row items-center justify-between">
                                        <div className="text-center lg:text-left mb-6 lg:mb-0">
                                            <h2 className="text-3xl font-bold text-gray-800 mb-4">Your ATS Score</h2>
                                            <div className="flex items-center justify-center lg:justify-start mb-4">
                                                <div className="text-7xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                    {result.score}%
                                                </div>
                                                <div className={`ml-4 px-4 py-2 rounded-full ${getScoreRating(result.score).bgColor} ${getScoreRating(result.score).borderColor} border`}>
                                                    <span className={`font-semibold ${getScoreRating(result.score).color}`}>
                                                        {getScoreRating(result.score).text}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-lg text-gray-600 max-w-lg">
                                                {result.score >= 85
                                                    ? '🎉 Outstanding! Your resume is excellently optimized for ATS systems.'
                                                    : result.score >= 70
                                                        ? '👍 Great work! Your resume is well-optimized with minor improvements needed.'
                                                        : result.score >= 60
                                                            ? '⚡ Good foundation. Key improvements will boost your score significantly.'
                                                            : '🔧 Optimization needed. Follow our AI recommendations for better results.'}
                                            </p>
                                            <div className="flex items-center justify-center lg:justify-start mt-4 space-x-4 text-sm text-gray-500">
                                                <span className="flex items-center">
                                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                                    Advanced NLP
                                                </span>
                                                <span className="flex items-center">
                                                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                                                    Semantic Analysis
                                                </span>
                                                <span className="flex items-center">
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                                    ML Scoring
                                                </span>
                                            </div>
                                        </div>

                                        {/* Enhanced Score Visualization */}
                                        <div className="w-80 h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{score: result.score, fill: '#6366F1'}]}>
                                                    <RadialBar dataKey="score" cornerRadius={10} fill="#6366F1" />
                                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-600 text-sm font-medium">
                                                        {result.score}%
                                                    </text>
                                                </RadialBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Metrics Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    {[
                                        {
                                            title: 'Skill Match',
                                            value: Math.round(result.keywordMatch),
                                            unit: '%',
                                            description: `${result.matchedKeywords.length} of ${result.matchedKeywords.length + result.missingKeywords.length} skills matched`,
                                            color: 'indigo',
                                            icon: '🎯'
                                        },
                                        {
                                            title: 'Semantic Match',
                                            value: Math.round(result.advancedData?.semanticSimilarity || 0),
                                            unit: '%',
                                            description: 'AI language similarity analysis',
                                            color: 'emerald',
                                            icon: '🧠'
                                        },
                                        {
                                            title: 'Resume Length',
                                            value: result.pageLengthEstimate,
                                            unit: 'pages',
                                            description: result.pageLengthEstimate <= 2 ? 'Optimal length' : result.pageLengthEstimate <= 4 ? 'Good length' : 'Consider condensing',
                                            color: 'amber',
                                            icon: '📄'
                                        },
                                        {
                                            title: 'Structure Score',
                                            value: result.formatScore,
                                            unit: '/100',
                                            description: 'Organization and formatting',
                                            color: 'purple',
                                            icon: '📋'
                                        }
                                    ].map((metric, index) => (
                                        <div key={index} className={`bg-gradient-to-br from-${metric.color}-50 to-${metric.color}-100 p-6 rounded-xl border border-${metric.color}-200 shadow-sm hover:shadow-md transition-shadow`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-2xl">{metric.icon}</span>
                                                <div className={`w-12 h-12 bg-${metric.color}-200 rounded-full flex items-center justify-center`}>
                                                    <div className={`w-8 h-8 bg-${metric.color}-500 rounded-full`}></div>
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-gray-700 mb-1">{metric.title}</h3>
                                            <div className="flex items-baseline mb-2">
                                                <span className={`text-3xl font-bold text-${metric.color}-600`}>
                                                    {metric.value}
                                                </span>
                                                <span className={`text-lg text-${metric.color}-500 ml-1`}>
                                                    {metric.unit}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{metric.description}</p>
                                            <div className="mt-3">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-700 ${
                                                            metric.color === 'indigo' ? 'bg-indigo-500' :
                                                                metric.color === 'emerald' ? 'bg-emerald-500' :
                                                                    metric.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                                                        }`}
                                                        style={{
                                                            width: `${
                                                                metric.title === 'Skill Match' ? result.keywordMatch :
                                                                    metric.title === 'Semantic Match' ? result.advancedData?.semanticSimilarity || 0 :
                                                                        metric.title === 'Resume Length' ? Math.min(result.lengthScore, 100) :
                                                                            result.formatScore
                                                            }%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Score Breakdown Chart */}
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                        <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            📈
                                        </span>
                                        Detailed Score Breakdown
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {result.scoreBreakdown.map((item, index) => (
                                            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center">
                                                        <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                                                        <span className="font-semibold text-gray-800">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        Weight: {item.weight}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Raw Score:</span>
                                                        <span className="font-medium">{Math.round(item.percentage)}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Weighted Score:</span>
                                                        <span className="font-medium text-indigo-600">{item.value}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                        <div
                                                            className="h-2 rounded-full transition-all duration-700"
                                                            style={{
                                                                backgroundColor: item.color,
                                                                width: `${item.percentage}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Missing Skills Tab */}
                        {activeTab === 'missing' && (
                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Missing Skills Analysis</h2>
                                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                                        Our AI identified these skills from the job description that weren't found in your resume.
                                        Consider adding them if you have experience with them.
                                    </p>
                                </div>

                                {result.missingKeywords.length === 0 ? (
                                    <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                                        <div className="text-8xl mb-6">🎉</div>
                                        <h3 className="text-2xl font-bold text-green-700 mb-2">Perfect Skill Match!</h3>
                                        <p className="text-lg text-green-600">Your resume contains all the key skills mentioned in the job description.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {['High', 'Medium', 'Low'].map(importance => {
                                            const skillsOfImportance = result.missingKeywords.filter(skill => skill.importance === importance);
                                            if (skillsOfImportance.length === 0) return null;

                                            const colorMap = {
                                                'High': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
                                                'Medium': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
                                                'Low': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' }
                                            };

                                            return (
                                                <div key={importance} className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className={`text-xl font-bold ${colorMap[importance].text} flex items-center`}>
                                                            <span className="mr-3">
                                                                {importance === 'High' ? '🔴' : importance === 'Medium' ? '🟡' : '⚪'}
                                                            </span>
                                                            {importance} Priority Skills
                                                        </h3>
                                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorMap[importance].badge} ${colorMap[importance].text}`}>
                                                            {skillsOfImportance.length} skills
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {skillsOfImportance.map((skill, index) => (
                                                            <div
                                                                key={index}
                                                                className={`p-4 rounded-xl ${colorMap[importance].bg} ${colorMap[importance].border} border shadow-sm hover:shadow-md transition-shadow`}
                                                            >
                                                                <h4 className="font-semibold text-gray-800 mb-2">{skill.name}</h4>
                                                                <p className={`text-sm ${colorMap[importance].text}`}>
                                                                    Mentioned {skill.jobMentions} time(s) in job description
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* AI Recommendations for Missing Skills */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                            <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                                                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                    💡
                                                </span>
                                                AI Recommendations for Missing Skills
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[
                                                    'Focus on high-priority missing skills first - these have the biggest impact',
                                                    'Only add skills you genuinely have experience with',
                                                    'Include skills in context: "Developed REST APIs using Spring Boot"',
                                                    'Add them to multiple sections: summary, skills, and experience',
                                                    'Use both acronyms and full terms where applicable',
                                                    'Consider taking courses for critical missing skills'
                                                ].map((tip, index) => (
                                                    <div key={index} className="flex items-start bg-white p-3 rounded-lg border border-blue-100">
                                                        <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mr-3 mt-0.5">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-gray-700 text-sm">{tip}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Matched Skills Tab */}
                        {activeTab === 'matched' && (
                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Matched Skills Analysis</h2>
                                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                                        Excellent! These skills from the job description were found in your resume.
                                        The visualization shows how frequently each skill appears.
                                    </p>
                                </div>

                                {result.matchedKeywords.length === 0 ? (
                                    <div className="text-center py-16 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border border-red-200">
                                        <div className="text-8xl mb-6">⚠️</div>
                                        <h3 className="text-2xl font-bold text-red-700 mb-2">No Matching Skills Found</h3>
                                        <p className="text-lg text-red-600">Please review the Missing Skills tab for detailed guidance.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Chart */}
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Skill Frequency Comparison</h3>
                                            <div className="h-96">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={result.matchedKeywords.slice(0, 10)}
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis type="category" dataKey="name" />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px'
                                                            }}
                                                        />
                                                        <Legend />
                                                        <Bar dataKey="resumeMentions" fill="#6366F1" name="Resume Mentions" radius={[0, 4, 4, 0]} />
                                                        <Bar dataKey="jobMentions" fill="#10B981" name="Job Description Mentions" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Skill Analysis Cards */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                                                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                                                    <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                                        ✅
                                                    </span>
                                                    Well-Represented Skills
                                                </h3>
                                                <div className="space-y-3">
                                                    {result.matchedKeywords
                                                        .filter(skill => skill.resumeMentions >= skill.jobMentions)
                                                        .slice(0, 5)
                                                        .map((skill, index) => (
                                                            <div key={index} className="bg-white p-3 rounded-lg border border-green-100 flex justify-between items-center">
                                                                <span className="font-medium text-gray-800">{skill.name}</span>
                                                                <span className="text-green-600 font-semibold">{skill.resumeMentions} mentions</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200">
                                                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                                                    <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                                        ⚡
                                                    </span>
                                                    Could Use More Mentions
                                                </h3>
                                                <div className="space-y-3">
                                                    {result.matchedKeywords
                                                        .filter(skill => skill.resumeMentions < skill.jobMentions)
                                                        .slice(0, 5)
                                                        .map((skill, index) => (
                                                            <div key={index} className="bg-white p-3 rounded-lg border border-amber-100 flex justify-between items-center">
                                                                <span className="font-medium text-gray-800">{skill.name}</span>
                                                                <span className="text-amber-600 font-semibold">
                                                                    Add {skill.jobMentions - skill.resumeMentions} more
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recommendations Tab */}
                        {activeTab === 'recommendations' && (
                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-4">AI-Generated Recommendations</h2>
                                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                                        Based on our comprehensive analysis, here are personalized recommendations to optimize your resume
                                    </p>
                                </div>

                                {/* Priority Action Items */}
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                        <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            🎯
                                        </span>
                                        Priority Action Items
                                    </h3>
                                    <div className="space-y-4">
                                        {result.recommendations.length === 0 ? (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                                                <span className="text-4xl mb-4 block">🎉</span>
                                                <p className="text-green-700 font-medium">No specific recommendations needed - your resume is well-optimized!</p>
                                            </div>
                                        ) : (
                                            result.recommendations.map((rec, index) => (
                                                <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 flex items-start">
                                                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 font-medium">{rec}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Quick Wins and Strategic Improvements */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                                        <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
                                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                                🚀
                                            </span>
                                            Quick Wins (High Impact, Low Effort)
                                        </h3>
                                        <div className="space-y-3">
                                            {[
                                                'Add missing high-priority skills to your summary',
                                                'Include skill variations (e.g., "JS" and "JavaScript")',
                                                'Use action verbs with technologies',
                                                'Add quantifiable achievements with tech stack',
                                                'Include relevant certifications'
                                            ].map((tip, index) => (
                                                <div key={index} className="flex items-start bg-white p-3 rounded-lg border border-indigo-100">
                                                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 mt-2"></span>
                                                    <span className="text-gray-700 text-sm">{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                                        <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                                            <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                                📈
                                            </span>
                                            Strategic Improvements
                                        </h3>
                                        <div className="space-y-3">
                                            {[
                                                'Reorganize experience to highlight relevant projects',
                                                'Create "Technical Environment" sections',
                                                'Align job titles with target position terminology',
                                                'Add context around technology usage',
                                                'Include collaborative tools and methodologies'
                                            ].map((tip, index) => (
                                                <div key={index} className="flex items-start bg-white p-3 rounded-lg border border-amber-100">
                                                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2"></span>
                                                    <span className="text-gray-700 text-sm">{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Interactive Checklist */}
                                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                        <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                            📋
                                        </span>
                                        Optimization Checklist
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            'Add missing critical skills (if applicable)',
                                            'Update professional summary with key technologies',
                                            'Create dedicated technical skills section',
                                            'Include both acronyms and full terms',
                                            'Add quantifiable achievements',
                                            'Use consistent formatting and sections',
                                            'Include relevant project examples',
                                            'Proofread for typos and formatting'
                                        ].map((item, index) => (
                                            <label key={index} className="flex items-start cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 mr-3 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                />
                                                <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                                                    {item}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advanced Analysis Tab */}
                        {activeTab === 'advanced' && (
                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Advanced AI Analysis</h2>
                                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                                        Deep dive into the technical details of how our AI analyzed your resume
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Semantic Analysis */}
                                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                                        <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
                                            <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                                🧠
                                            </span>
                                            Semantic Analysis
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-600">Language Similarity Score</span>
                                                    <span className="text-lg font-bold text-purple-600">
                                                        {Math.round(result.advancedData?.semanticSimilarity || 0)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000"
                                                        style={{ width: `${result.advancedData?.semanticSimilarity || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-purple-100">
                                                Measures how well your resume language aligns with the job description using
                                                advanced natural language processing and machine learning algorithms.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Structure Analysis */}
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                                        <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
                                            <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                                                📋
                                            </span>
                                            Structure Analysis
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 mb-2">Found Resume Sections:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.advancedData?.foundSections?.length > 0 ? (
                                                        result.advancedData.foundSections.map((section, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium capitalize"
                                                            >
                                                                {section}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">No section data available</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keyword Density */}
                                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                                        <h3 className="text-lg font-bold text-blue-800 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                📊
                                            </span>
                                            Keyword Density Analysis
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="text-center bg-white p-4 rounded-xl border border-blue-100">
                                                <div className="text-3xl font-bold text-blue-600 mb-2">{result.keywordDensity.totalMentions}</div>
                                                <div className="text-sm text-gray-600">Total Keyword Mentions</div>
                                            </div>
                                            <div className="text-center bg-white p-4 rounded-xl border border-blue-100">
                                                <div className="text-3xl font-bold text-purple-600 mb-2">{result.keywordDensity.uniqueKeywords}</div>
                                                <div className="text-sm text-gray-600">Unique Keywords Found</div>
                                            </div>
                                            <div className="text-center bg-white p-4 rounded-xl border border-blue-100">
                                                <div className="text-3xl font-bold text-teal-600 mb-2">{result.keywordDensity.density}</div>
                                                <div className="text-sm text-gray-600">Average Mentions per Keyword</div>
                                            </div>
                                        </div>
                                        <div className="mt-6 bg-white p-4 rounded-xl border border-blue-100">
                                            <p className="text-sm text-gray-600">
                                                <strong className="text-blue-800">Optimal range:</strong> 3-4 mentions per keyword.
                                                Too few may not be noticed by ATS systems, too many may appear as keyword stuffing.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Skill Categories */}
                                    <div className="lg:col-span-2 bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                                        <h3 className="text-lg font-bold text-orange-800 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                                🎯
                                            </span>
                                            Skill Categories Breakdown
                                        </h3>
                                        {Object.keys(result.advancedData?.skillCategories || {}).length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Object.entries(result.advancedData.skillCategories).map(([category, data]) => (
                                                    <div key={category} className="bg-white p-4 rounded-xl border border-orange-100">
                                                        <h4 className="font-semibold text-gray-800 mb-3 capitalize">
                                                            {category.replace('_', ' ')}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-emerald-600 flex items-center">
                                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                                                    Matched:
                                                                </span>
                                                                <span className="font-semibold text-gray-800">{data.matched?.length || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-red-600 flex items-center">
                                                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                                                    Missing:
                                                                </span>
                                                                <span className="font-semibold text-gray-800">{data.missing?.length || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600 flex items-center">
                                                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                                                    Weight:
                                                                </span>
                                                                <span className="font-semibold text-gray-800">{Math.round((data.weight || 0) * 100)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-white rounded-xl border border-orange-100">
                                                <p className="text-gray-600">No detailed skill category data available</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Engine Info */}
                                    <div className="lg:col-span-2 bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                                🔧
                                            </span>
                                            Analysis Engine Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                                    <span className="text-sm text-gray-600">Backend Status:</span>
                                                    <span className="flex items-center text-green-600 font-medium text-sm">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                        AI Engine Connected
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                                    <span className="text-sm text-gray-600">Analysis Type:</span>
                                                    <span className="text-blue-600 font-medium text-sm">Advanced NLP + ML</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                                    <span className="text-sm text-gray-600">Skill Categories:</span>
                                                    <span className="text-purple-600 font-medium text-sm">
                                                        {Object.keys(result.advancedData?.skillCategories || {}).length} Categories
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                                    <span className="text-sm text-gray-600">Processing Mode:</span>
                                                    <span className="text-indigo-600 font-medium text-sm">Real-time Analysis</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Enhanced Footer */}
            <footer className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white mt-16">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center mb-4">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                                    <span className="text-lg">🤖</span>
                                </div>
                                <h3 className="text-xl font-bold">CareerScan Pro</h3>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3 ">
                                <li className="flex items-center">Features</li>
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center">
                                    <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
                                    Advanced NLP Analysis
                                </li>
                                <li className="flex items-center">
                                    <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
                                    Semantic Similarity Matching
                                </li>
                                <li className="flex items-center">
                                    <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
                                    Real-time Processing
                                </li>
                                <li className="flex items-center">
                                    <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
                                    Industry-specific Scoring
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Technology</h4>
                            <div className="flex flex-wrap gap-2">
                                {['React', 'Node.js', 'AI/ML', 'NLP', 'TensorFlow'].map((tech, index) => (
                                    <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-6 text-center">
                        <p className="text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} AI-Powered CareerScan Pro |
                            Built with advanced machine learning and natural language processing
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ATSScoreChecker;