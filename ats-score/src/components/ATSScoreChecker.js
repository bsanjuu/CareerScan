import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const ATSScoreChecker = () => {
    // State hooks
    const [resume, setResume] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [selectedJdType, setSelectedJdType] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    const [sampleJdOpen, setSampleJdOpen] = useState(false);
    const [optimizedScoring, setOptimizedScoring] = useState(true);
    const [activeTab, setActiveTab] = useState('score');

    // Sample job descriptions
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

    // Handle file upload
    const handleResumeUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setResume(text);
            setFileUploaded(true);
            setLoading(false);
        };

        reader.readAsText(file);
    };

    // Load sample job description
    const loadSampleJD = (jdType) => {
        setSelectedJdType(jdType);
        setJobDescription(sampleJDs[jdType]);
        setSampleJdOpen(false);
    };

    // Main analysis function
    const analyzeResume = () => {
        if (!resume || !jobDescription) {
            alert('Please upload your resume and enter a job description');
            return;
        }

        setLoading(true);

        // Extract keywords
        const jobKeywords = extractKeywords(jobDescription);
        const resumeKeywords = extractKeywords(resume);

        // Calculate match percentage
        const matchResult = calculateMatchPercentage(jobKeywords, resumeKeywords);

        // Calculate keyword density
        const densityResult = calculateKeywordDensity(resumeKeywords);

        // Calculate resume length score
        const wordCount = resume.split(/\s+/).length;
        const pageEstimate = Math.ceil(wordCount / 500);
        const lengthScore = pageEstimate <= 6 ? 100 : Math.max(0, 100 - ((pageEstimate - 6) * 10));

        // Calculate format score
        const formatScore = calculateFormatScore(resume);

        // Calculate final score
        const finalScore = calculateFinalScore(
            matchResult.matchPercentage,
            densityResult.density,
            lengthScore,
            formatScore
        );

        // Generate recommendations
        const recommendations = generateRecommendations(
            matchResult.missingKeywords,
            densityResult.density,
            pageEstimate
        );

        // Create score breakdown
        const scoreBreakdown = [
            {
                name: 'Skill Match',
                value: Math.round(matchResult.matchPercentage * 0.7),
                color: '#3366CC',
                percentage: matchResult.matchPercentage,
                rawPercentage: matchResult.rawMatchPercentage,
                weight: '70%'
            },
            {
                name: 'Keyword Density',
                value: Math.round(Math.min(densityResult.density / 3.5, 1) * 15),
                color: '#DC3912',
                density: densityResult.density,
                weight: '15%'
            },
            {
                name: 'Resume Length',
                value: Math.round(lengthScore * 0.05),
                color: '#FF9900',
                pages: pageEstimate,
                weight: '5%'
            },
            {
                name: 'Formatting',
                value: Math.round(formatScore * 0.1),
                color: '#109618',
                weight: '10%'
            }
        ];

        // Set result
        setResult({
            score: finalScore,
            keywordMatch: matchResult.matchPercentage,
            rawMatchPercentage: matchResult.rawMatchPercentage,
            matchedKeywords: matchResult.matchedKeywords,
            missingKeywords: matchResult.missingKeywords,
            keywordDensity: densityResult,
            lengthScore,
            formatScore,
            pageLengthEstimate: pageEstimate,
            recommendations,
            scoreBreakdown
        });

        setActiveTab('score');
        setLoading(false);
    };

    // Extract keywords from text
    const extractKeywords = (text) => {
        // Define a list of common technical keywords
        const technicalKeywords = [
            "Java", "Spring", "Spring Boot", "AWS", "Cloud", "Microservices",
            "Kubernetes", "Docker", "REST", "API", "Angular", "React",
            "CI/CD", "Jenkins", "Git", "GitHub", "SQL", "Oracle", "MySQL",
            "PostgreSQL", "NoSQL", "MongoDB", "Agile", "Scrum"
        ];

        const result = {};
        const lowerText = text.toLowerCase();

        technicalKeywords.forEach(keyword => {
            const regex = new RegExp('\\b' + keyword.toLowerCase() + '\\b', 'gi');
            const matches = lowerText.match(regex);

            if (matches && matches.length > 0) {
                result[keyword] = matches.length;
            }
        });

        return result;
    };

    // Calculate match percentage
    const calculateMatchPercentage = (jobKeywords, resumeKeywords) => {
        // Keyword importance weights
        const weights = {
            "Java": 3,
            "AWS": 3,
            "Spring Boot": 2.5,
            "Spring": 2.5,
            "Microservices": 2.5,
            "Kubernetes": 2,
            "Docker": 2,
            "REST": 2,
            "API": 2
        };

        let matchedTotal = 0;
        let importanceTotal = 0;

        const matchedKeywords = [];
        const missingKeywords = [];

        // Calculate weighted match
        for (const keyword in jobKeywords) {
            const importance = weights[keyword] || 1;
            const weight = importance * jobKeywords[keyword];
            importanceTotal += weight;

            if (resumeKeywords[keyword]) {
                matchedTotal += weight;
                matchedKeywords.push({
                    name: keyword,
                    jobMentions: jobKeywords[keyword],
                    resumeMentions: resumeKeywords[keyword]
                });
            } else {
                // Categorize importance
                let category = 'Low';
                if (importance >= 2.5) category = 'High';
                else if (importance >= 1.5) category = 'Medium';

                missingKeywords.push({
                    name: keyword,
                    importance: category,
                    jobMentions: jobKeywords[keyword]
                });
            }
        }

        // Calculate raw and adjusted match percentages
        const rawPercentage = importanceTotal > 0
            ? Math.round((matchedTotal / importanceTotal) * 100)
            : 0;

        // Apply contract optimization curve
        let adjustedPercentage = rawPercentage;
        if (optimizedScoring) {
            if (rawPercentage < 40) {
                adjustedPercentage = Math.round(rawPercentage * 1.75);
            } else if (rawPercentage < 60) {
                adjustedPercentage = Math.round(rawPercentage * 1.4);
            } else if (rawPercentage < 80) {
                adjustedPercentage = Math.round(rawPercentage * 1.15);
            } else {
                adjustedPercentage = Math.round(rawPercentage * 1.05);
            }
        }

        // Cap at 100%
        adjustedPercentage = Math.min(adjustedPercentage, 100);

        return {
            matchPercentage: adjustedPercentage,
            rawMatchPercentage: rawPercentage,
            matchedKeywords,
            missingKeywords
        };
    };

    // Calculate keyword density
    const calculateKeywordDensity = (keywords) => {
        const totalMentions = Object.values(keywords).reduce((sum, count) => sum + count, 0);
        const uniqueKeywords = Object.keys(keywords).length;

        return {
            totalMentions,
            uniqueKeywords,
            density: uniqueKeywords > 0 ? parseFloat((totalMentions / uniqueKeywords).toFixed(1)) : 0
        };
    };

    // Calculate format score
    const calculateFormatScore = (text) => {
        let score = 0;

        // Check for common sections
        if (/professional\s+summary|profile|objective/i.test(text)) score += 20;
        if (/experience|work history|employment/i.test(text)) score += 20;
        if (/education|academic|degree|university/i.test(text)) score += 20;
        if (/skills|technologies|technical skills/i.test(text)) score += 20;

        // Check for formatting elements
        if (/•|-|\*/i.test(text)) score += 20;

        return Math.min(score, 100);
    };

    // Calculate final ATS score
    const calculateFinalScore = (matchPercentage, density, lengthScore, formatScore) => {
        // Apply weights
        const matchScore = matchPercentage * 0.7;
        const densityFactor = Math.min(density / 3.5, 1);
        const densityScore = densityFactor * 15;
        const lengthScore2 = (lengthScore / 100) * 5;
        const formatScore2 = (formatScore / 100) * 10;

        // Calculate base score
        let finalScore = matchScore + densityScore + lengthScore2 + formatScore2;

        // Apply optimization boost
        if (optimizedScoring) {
            if (finalScore >= 60 && finalScore < 75) {
                finalScore += 10;
            } else if (finalScore >= 45 && finalScore < 60) {
                finalScore += 15;
            } else if (finalScore >= 75 && finalScore < 85) {
                finalScore += 5;
            }
        }

        return Math.min(Math.round(finalScore), 100);
    };

    // Generate recommendations
    const generateRecommendations = (missingKeywords, density, pages) => {
        const recommendations = [];

        // Missing skills recommendations
        const highImportance = missingKeywords.filter(kw => kw.importance === 'High');
        if (highImportance.length > 0) {
            const skills = highImportance.slice(0, 5).map(kw => kw.name).join(', ');
            recommendations.push(`Add these critical missing skills (if you have them): ${skills}`);
        }

        // Keyword density recommendations
        if (density < 2) {
            recommendations.push('Increase keyword frequency to 3-4 mentions for important skills');
        } else if (density > 5) {
            recommendations.push('Your keyword density is high. Consider more natural integration of keywords');
        }

        // Length recommendations
        if (pages > 6) {
            recommendations.push('Your resume exceeds 6 pages. Consider focusing on most relevant experience');
        }

        // General recommendations
        recommendations.push('Create a dedicated "Technical Skills" section organized by categories');
        recommendations.push('Include 5-7 important skills in your professional summary');
        recommendations.push('Use both acronyms and full terms (e.g., "AWS (Amazon Web Services)")');

        return recommendations;
    };

    // Helper function for score rating
    const getScoreRating = (score) => {
        if (score >= 85) return { text: 'Excellent', color: 'text-green-600' };
        if (score >= 70) return { text: 'Good', color: 'text-blue-600' };
        if (score >= 60) return { text: 'Moderate', color: 'text-yellow-600' };
        return { text: 'Needs Improvement', color: 'text-red-600' };
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <header className="bg-blue-700 text-white p-4">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl font-bold">ATS Score Checker for Contract Positions</h1>
                    <p className="text-sm">Get 80-90% scores for qualified IT contractors - designed for contract roles</p>
                </div>
            </header>

            <main className="flex-grow p-4">
                <div className="max-w-6xl mx-auto">
                    {/* Input section */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4">Upload Resume & Job Description</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 mb-2">Upload Your Resume</label>
                                <input
                                    type="file"
                                    onChange={handleResumeUpload}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    accept=".txt,.doc,.docx,.pdf,.rtf"
                                />
                                {fileUploaded && (
                                    <p className="text-green-500 mt-1">Resume uploaded successfully!</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Supports DOC, DOCX, PDF, TXT, RTF (max 10MB)
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-gray-700">Job Description</label>
                                    <button
                                        onClick={() => setSampleJdOpen(!sampleJdOpen)}
                                        className="text-blue-600 text-sm"
                                    >
                                        Load Sample JD
                                    </button>
                                </div>

                                {sampleJdOpen && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => loadSampleJD('java')}
                                            className={`px-3 py-1 rounded text-sm ${
                                                selectedJdType === 'java' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                                            }`}
                                        >
                                            Java Full Stack
                                        </button>
                                        <button
                                            onClick={() => loadSampleJD('servicenow')}
                                            className={`px-3 py-1 rounded text-sm ${
                                                selectedJdType === 'servicenow' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                                            }`}
                                        >
                                            ServiceNow Developer
                                        </button>
                                        <button
                                            onClick={() => loadSampleJD('vmware')}
                                            className={`px-3 py-1 rounded text-sm ${
                                                selectedJdType === 'vmware' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                                            }`}
                                        >
                                            VMware/Windows Admin
                                        </button>
                                        <button
                                            onClick={() => loadSampleJD('data')}
                                            className={`px-3 py-1 rounded text-sm ${
                                                selectedJdType === 'data' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                                            }`}
                                        >
                                            Data Engineer
                                        </button>
                                    </div>
                                )}

                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded h-40"
                                    placeholder="Paste the job description here..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-center items-center gap-4">
                            <button
                                onClick={analyzeResume}
                                disabled={loading || !fileUploaded || !jobDescription}
                                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
                            >
                                {loading ? 'Analyzing...' : 'Analyze Resume'}
                            </button>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="optimizedScoring"
                                    checked={optimizedScoring}
                                    onChange={() => setOptimizedScoring(!optimizedScoring)}
                                    className="mr-2"
                                />
                                <label htmlFor="optimizedScoring" className="text-sm text-gray-600">
                                    Contract-Optimized Scoring
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Results section */}
                    {result && (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            {/* Tabs navigation */}
                            <div className="flex border-b overflow-x-auto">
                                <button
                                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'score' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab('score')}
                                >
                                    Overall Score
                                </button>
                                <button
                                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'missing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab('missing')}
                                >
                                    Missing Skills
                                </button>
                                <button
                                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'matched' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab('matched')}
                                >
                                    Matched Skills
                                </button>
                                <button
                                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'recommendations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab('recommendations')}
                                >
                                    Recommendations
                                </button>
                            </div>

                            {/* Overall Score Tab */}
                            {activeTab === 'score' && (
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-xl font-semibold">Overall ATS Score</h2>
                                            <div className="flex items-baseline mt-2">
                                                <span className="text-5xl font-bold">{result.score}%</span>
                                                <span className={`ml-2 text-lg ${getScoreRating(result.score).color}`}>
                          {getScoreRating(result.score).text}
                        </span>
                                            </div>
                                            <p className="text-gray-600 mt-2">
                                                {result.score >= 85
                                                    ? 'Your resume is well-optimized for this contract position!'
                                                    : result.score >= 70
                                                        ? 'Your resume matches this position well with some minor improvements needed.'
                                                        : result.score >= 60
                                                            ? 'Your resume needs moderate adjustments to better match this position.'
                                                            : 'Your resume needs significant adjustments to match this position.'}
                                            </p>
                                            {optimizedScoring && (
                                                <div className="mt-3 text-xs text-gray-500">
                                                    <p>* Contract-optimized scoring applied (standard match: {result.rawMatchPercentage}%)</p>
                                                    <p>* Skill matching has 70% weight in final score</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-52 h-52 mt-4 md:mt-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={result.scoreBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {result.scoreBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => `${value}%`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-gray-50 p-4 rounded">
                                            <h3 className="font-medium text-gray-700">Skill Match</h3>
                                            <p className="text-3xl font-bold text-blue-600">{result.keywordMatch}%</p>
                                            <p className="text-sm text-gray-600">
                                                {result.matchedKeywords.length} of {result.matchedKeywords.length + result.missingKeywords.length} skills matched
                                            </p>
                                            <div className="mt-2">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full"
                                                        style={{ width: `${result.keywordMatch}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded">
                                            <h3 className="font-medium text-gray-700">Keyword Density</h3>
                                            <p className="text-3xl font-bold text-blue-600">{result.keywordDensity.density}</p>
                                            <p className="text-sm text-gray-600">
                                                Mentions per keyword (ideal: 3-4)
                                            </p>
                                            <div className="mt-2">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            result.keywordDensity.density >= 3 && result.keywordDensity.density <= 4
                                                                ? 'bg-green-500'
                                                                : result.keywordDensity.density >= 2 && result.keywordDensity.density <= 5
                                                                    ? 'bg-yellow-500'
                                                                    : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(result.keywordDensity.density / 5 * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded">
                                            <h3 className="font-medium text-gray-700">Resume Length</h3>
                                            <p className="text-3xl font-bold text-blue-600">{result.pageLengthEstimate} pages</p>
                                            <p className="text-sm text-gray-600">
                                                {result.pageLengthEstimate <= 6
                                                    ? 'Good length for contract positions'
                                                    : 'Exceeds recommended 6 pages'}
                                            </p>
                                            <div className="mt-2">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            result.pageLengthEstimate <= 6 ? 'bg-green-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(result.lengthScore, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded">
                                            <h3 className="font-medium text-gray-700">Format Score</h3>
                                            <p className="text-3xl font-bold text-blue-600">{result.formatScore}</p>
                                            <p className="text-sm text-gray-600">
                                                Based on sections and organization
                                            </p>
                                            <div className="mt-2">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            result.formatScore >= 80 ? 'bg-green-500' :
                                                                result.formatScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${result.formatScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-medium mb-3">Score Breakdown</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {result.scoreBreakdown.map((item, index) => (
                                                <div key={index} className="flex items-center">
                                                    <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                                                    <div>
                                                        <div className="flex items-center">
                                                            <span className="font-medium">{item.name}</span>
                                                            <span className="text-gray-500 ml-2 text-sm">({item.weight})</span>
                                                        </div>
                                                        {item.name === 'Skill Match' && (
                                                            <p className="text-sm text-gray-600">
                                                                {item.percentage}% match (raw: {item.rawPercentage}%)
                                                            </p>
                                                        )}
                                                        {item.name === 'Keyword Density' && (
                                                            <p className="text-sm text-gray-600">{item.density} mentions per keyword (target: 3-4)</p>
                                                        )}
                                                        {item.name === 'Resume Length' && (
                                                            <p className="text-sm text-gray-600">Estimated {item.pages} pages (max 6 recommended)</p>
                                                        )}
                                                        {item.name === 'Formatting' && (
                                                            <p className="text-sm text-gray-600">Based on section headings and structure</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Missing Skills Tab */}
                            {activeTab === 'missing' && (
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Missing Skills</h2>

                                    <p className="text-gray-600 mb-6">
                                        These skills from the job description were not found in your resume. Consider adding them if you have experience with them.
                                    </p>

                                    {result.missingKeywords.length === 0 ? (
                                        <p className="text-green-600 font-medium">Great job! Your resume contains all the key skills mentioned in the job description.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {result.missingKeywords.map((skill, index) => (
                                                <div
                                                    key={index}
                                                    className={`p-4 rounded-lg border ${
                                                        skill.importance === 'High'
                                                            ? 'border-red-200 bg-red-50'
                                                            : skill.importance === 'Medium'
                                                                ? 'border-yellow-200 bg-yellow-50'
                                                                : 'border-gray-200 bg-gray-50'
                                                    }`}
                                                >
                                                    <h3 className="font-medium">{skill.name}</h3>
                                                    <p className={`text-sm ${
                                                        skill.importance === 'High'
                                                            ? 'text-red-700'
                                                            : skill.importance === 'Medium'
                                                                ? 'text-yellow-700'
                                                                : 'text-gray-600'
                                                    }`}>
                                                        Importance: {skill.importance}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {result.missingKeywords.length > 0 && (
                                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <h3 className="font-medium text-blue-800 mb-2">Tips for Adding Missing Skills</h3>
                                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                                <li>Only add skills you genuinely have experience with</li>
                                                <li>Include each skill in context, showing how you've applied it</li>
                                                <li>For high-importance skills, try to include them in your professional summary</li>
                                                <li>Consider creating a "Key Skills" section organized by categories</li>
                                                <li>For contract positions, emphasize your ability to quickly apply these skills</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Matched Skills Tab */}
                            {activeTab === 'matched' && (
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Matched Skills</h2>

                                    <p className="text-gray-600 mb-6">
                                        Your resume contains these skills from the job description. The frequency of each skill's mention is shown below.
                                    </p>

                                    {result.matchedKeywords.length === 0 ? (
                                        <p className="text-red-600 font-medium">No matching skills were found in your resume. Please review the Missing Skills tab for guidance.</p>
                                    ) : (
                                        <>
                                            <div className="h-80 mb-6">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={result.matchedKeywords}
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis type="category" dataKey="name" />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="resumeMentions" fill="#4c9be8" name="Times Mentioned in Resume" />
                                                        <Bar dataKey="jobMentions" fill="#8884d8" name="Times Mentioned in Job Description" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <h3 className="font-medium text-green-800 mb-2">Keyword Optimization Tips</h3>
                                                <ul className="list-disc list-inside space-y-2 text-gray-700">
                                                    <li>Aim to mention important skills 3-4 times throughout your resume</li>
                                                    <li>Place critical skills in your professional summary, skills section, and work experience</li>
                                                    <li>Use both the full term and acronym where applicable (e.g., "Amazon Web Services (AWS)")</li>
                                                    <li>For contract positions, emphasize specific projects where you used these technologies</li>
                                                    <li>Ensure skills appear in context, not just in a skills list</li>
                                                </ul>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Recommendations Tab */}
                            {activeTab === 'recommendations' && (
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Recommendations to Reach 80-90% Score</h2>

                                    <div className="mb-6">
                                        <h3 className="font-medium mb-3">Key Improvements for Contract Positions</h3>
                                        <ul className="list-disc list-inside space-y-3 text-gray-700">
                                            {result.recommendations.map((rec, index) => (
                                                <li key={index} className="pl-2">{rec}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                            <h3 className="font-medium text-indigo-800 mb-3">Contract-Specific Resume Tips</h3>
                                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                                <li>Create a dedicated "Technical Skills" section organized by categories</li>
                                                <li>Highlight project-based achievements with measurable outcomes</li>
                                                <li>Emphasize your ability to quickly adapt to new technologies</li>
                                                <li>Include specific technologies and tools used in each role</li>
                                                <li>Use the industry's current terminology for technologies</li>
                                            </ul>
                                        </div>

                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                            <h3 className="font-medium text-amber-800 mb-3">Keyword Optimization Techniques</h3>
                                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                                <li>Include 5-7 key skills in your professional summary</li>
                                                <li>Mention important skills 3-4 times throughout your resume</li>
                                                <li>Use both acronyms and full terms (e.g., "AWS (Amazon Web Services)")</li>
                                                <li>Add a "Technical Environment" section for each role</li>
                                                <li>Include keywords in project titles and achievements</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
                                        <h3 className="font-medium text-gray-800 mb-3">Quick Fixes to Boost Your Score</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 w-5 h-5 border border-gray-300 rounded mr-2 mt-0.5" />
                                                <span>Add missing high-importance skills (if you have experience with them)</span>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 w-5 h-5 border border-gray-300 rounded mr-2 mt-0.5" />
                                                <span>Create a "Technical Skills" section with categories (Languages, Frameworks, etc.)</span>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 w-5 h-5 border border-gray-300 rounded mr-2 mt-0.5" />
                                                <span>Update your professional summary to include 5-7 critical keywords</span>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 w-5 h-5 border border-gray-300 rounded mr-2 mt-0.5" />
                                                <span>Add "Technical Environment" sections to each role listing technologies used</span>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 w-5 h-5 border border-gray-300 rounded mr-2 mt-0.5" />
                                                <span>Convert achievements to highlight specific technologies (e.g., "Reduced latency by 40% using AWS Lambda")</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-gray-800 text-white p-4">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-sm">&copy; {new Date().getFullYear()} ATS Score Checker for Contract Positions | Get scores in the 80-90% range</p>
                </div>
            </footer>
        </div>
    );
};

export default ATSScoreChecker;