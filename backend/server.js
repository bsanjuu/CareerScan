const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const compromise = require('compromise');
const fs = require('fs').promises;
const path = require('path');

const server = express();
const port = process.env.PORT || 3001;

// Middleware
server.use(cors());
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize NLP tools
const TfIdf = natural.TfIdf;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

class ATSScoreAnalyzer {
    constructor() {
        this.skillCategories = {
            programming_languages: {
                weight: 0.25,
                keywords: [
                    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
                    'kotlin', 'swift', 'scala', 'r', 'php', 'ruby', 'perl', 'node.js', 'nodejs'
                ]
            },
            frameworks_libraries: {
                weight: 0.20,
                keywords: [
                    'react', 'angular', 'vue', 'spring', 'spring boot', 'django', 'flask',
                    'express', 'laravel', '.net', 'asp.net', 'hibernate', 'jquery', 'bootstrap'
                ]
            },
            databases: {
                weight: 0.15,
                keywords: [
                    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle',
                    'sql server', 'sqlite', 'cassandra', 'dynamodb', 'firebase'
                ]
            },
            cloud_platforms: {
                weight: 0.20,
                keywords: [
                    'aws', 'amazon web services', 'azure', 'google cloud', 'gcp', 'heroku',
                    'digital ocean', 'kubernetes', 'docker', 'terraform', 'ansible'
                ]
            },
            tools_technologies: {
                weight: 0.15,
                keywords: [
                    'git', 'github', 'gitlab', 'jenkins', 'ci/cd', 'webpack', 'babel',
                    'npm', 'yarn', 'maven', 'gradle', 'linux', 'unix', 'rest api', 'graphql'
                ]
            },
            methodologies: {
                weight: 0.05,
                keywords: [
                    'agile', 'scrum', 'kanban', 'devops', 'microservices', 'tdd', 'bdd',
                    'solid principles', 'design patterns', 'mvc', 'api design'
                ]
            }
        };

        this.sectionKeywords = {
            summary: ['summary', 'profile', 'objective', 'about'],
            experience: ['experience', 'work history', 'employment', 'professional experience'],
            education: ['education', 'academic', 'degree', 'university', 'college'],
            skills: ['skills', 'technical skills', 'competencies', 'technologies'],
            projects: ['projects', 'portfolio', 'accomplishments'],
            certifications: ['certifications', 'certificates', 'credentials']
        };

        this.atsKeywords = [
            'years of experience', 'bachelor', 'master', 'phd', 'certification',
            'project', 'team', 'lead', 'senior', 'junior', 'manager', 'developer',
            'engineer', 'analyst', 'architect', 'consultant', 'specialist'
        ];
    }

    // Extract text from different file formats
    async extractTextFromFile(buffer, mimetype, filename) {
        try {
            if (mimetype === 'application/pdf') {
                const data = await pdfParse(buffer);
                return data.text;
            } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer });
                return result.value;
            } else if (mimetype === 'text/plain') {
                return buffer.toString('utf-8');
            } else {
                throw new Error('Unsupported file format');
            }
        } catch (error) {
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    // Clean and preprocess text
    preprocessText(text) {
        if (!text) return '';

        // Remove extra whitespace, special characters
        let cleaned = text.toLowerCase()
            .replace(/[^\w\s\-\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Handle common variations
        cleaned = cleaned
            .replace(/\bnode\.?js\b/g, 'nodejs')
            .replace(/\bc\+\+\b/g, 'cplusplus')
            .replace(/\bc#\b/g, 'csharp')
            .replace(/\b\.net\b/g, 'dotnet')
            .replace(/\baws\b/g, 'amazon web services')
            .replace(/\bgcp\b/g, 'google cloud platform');

        return cleaned;
    }

    // Advanced keyword extraction using NLP
    extractKeywords(text, jobDescription) {
        const doc = compromise(text);
        const jdDoc = compromise(jobDescription);

        // Extract entities
        const technologies = doc.match('#Technology').out('array');
        const organizations = doc.match('#Organization').out('array');
        const skills = doc.match('#Skill').out('array');

        // Extract n-grams (1-3 words)
        const tokens = tokenizer.tokenize(this.preprocessText(text));
        const ngrams = [];

        for (let i = 0; i < tokens.length; i++) {
            // Unigrams
            ngrams.push(tokens[i]);

            // Bigrams
            if (i < tokens.length - 1) {
                ngrams.push(`${tokens[i]} ${tokens[i + 1]}`);
            }

            // Trigrams
            if (i < tokens.length - 2) {
                ngrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
            }
        }

        return {
            technologies,
            organizations,
            skills,
            ngrams: [...new Set(ngrams)] // Remove duplicates
        };
    }

    // Calculate semantic similarity using TF-IDF
    calculateSemanticSimilarity(resumeText, jobText) {
        const tfidf = new TfIdf();

        // Add documents
        tfidf.addDocument(this.preprocessText(resumeText));
        tfidf.addDocument(this.preprocessText(jobText));

        // Calculate similarity
        const resumeVector = [];
        const jobVector = [];

        tfidf.listTerms(0).forEach(item => {
            resumeVector.push(item.tfidf);
        });

        tfidf.listTerms(1).forEach(item => {
            jobVector.push(item.tfidf);
        });

        // Cosine similarity
        if (resumeVector.length === 0 || jobVector.length === 0) return 0;

        const dotProduct = resumeVector.reduce((sum, a, i) => sum + a * (jobVector[i] || 0), 0);
        const magnitudeA = Math.sqrt(resumeVector.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(jobVector.reduce((sum, b) => sum + b * b, 0));

        return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
    }

    // Advanced skill matching with context awareness
    analyzeSkillMatch(resumeText, jobDescription) {
        const resumeProcessed = this.preprocessText(resumeText);
        const jobProcessed = this.preprocessText(jobDescription);

        let totalScore = 0;
        let maxPossibleScore = 0;
        const matchedSkills = {};
        const missingSkills = {};
        const skillDetails = {};

        // Analyze each skill category
        for (const [category, data] of Object.entries(this.skillCategories)) {
            const categoryMatched = [];
            const categoryMissing = [];

            for (const skill of data.keywords) {
                const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                const resumeMatches = (resumeProcessed.match(skillRegex) || []).length;
                const jobMatches = (jobProcessed.match(skillRegex) || []).length;

                if (jobMatches > 0) {
                    maxPossibleScore += data.weight * jobMatches;

                    if (resumeMatches > 0) {
                        const skillScore = data.weight * Math.min(resumeMatches / jobMatches, 1);
                        totalScore += skillScore;
                        categoryMatched.push({
                            skill,
                            resumeCount: resumeMatches,
                            jobCount: jobMatches,
                            score: skillScore
                        });
                    } else {
                        categoryMissing.push({
                            skill,
                            jobCount: jobMatches,
                            importance: this.getSkillImportance(skill, jobProcessed)
                        });
                    }
                }
            }

            if (categoryMatched.length > 0 || categoryMissing.length > 0) {
                skillDetails[category] = {
                    matched: categoryMatched,
                    missing: categoryMissing,
                    weight: data.weight
                };
            }
        }

        const matchPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        return {
            matchPercentage: Math.round(matchPercentage * 100) / 100,
            skillDetails,
            totalMatched: Object.values(skillDetails).reduce((sum, cat) => sum + cat.matched.length, 0),
            totalMissing: Object.values(skillDetails).reduce((sum, cat) => sum + cat.missing.length, 0)
        };
    }

    // Determine skill importance based on context
    getSkillImportance(skill, jobText) {
        const skillRegex = new RegExp(`\\b${skill}\\b`, 'gi');
        const matches = jobText.match(skillRegex) || [];

        // Check context around skill mentions
        let importance = 'Low';
        const contexts = [];

        let index = jobText.toLowerCase().indexOf(skill.toLowerCase());
        while (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(jobText.length, index + skill.length + 50);
            const context = jobText.substring(start, end).toLowerCase();
            contexts.push(context);
            index = jobText.toLowerCase().indexOf(skill.toLowerCase(), index + 1);
        }

        // Analyze contexts for importance indicators
        const highImportanceWords = ['required', 'must', 'essential', 'critical', 'mandatory', 'years'];
        const mediumImportanceWords = ['preferred', 'desirable', 'plus', 'bonus', 'nice to have'];

        for (const context of contexts) {
            if (highImportanceWords.some(word => context.includes(word))) {
                importance = 'High';
                break;
            } else if (mediumImportanceWords.some(word => context.includes(word))) {
                importance = 'Medium';
            }
        }

        return importance;
    }

    // Analyze resume structure and formatting
    analyzeResumeStructure(resumeText) {
        const text = resumeText.toLowerCase();
        let structureScore = 0;
        const foundSections = [];
        const recommendations = [];

        // Check for standard resume sections
        for (const [section, keywords] of Object.entries(this.sectionKeywords)) {
            const hasSection = keywords.some(keyword => text.includes(keyword));
            if (hasSection) {
                foundSections.push(section);
                structureScore += 15;
            }
        }

        // Check for formatting elements
        if (/•|\*|-|\d+\./.test(resumeText)) {
            structureScore += 10; // Bullet points
        }

        if (/\b\d{4}\s*-\s*\d{4}\b|\b\d{4}\s*-\s*present\b/i.test(resumeText)) {
            structureScore += 10; // Date ranges
        }

        if (/@\w+\.\w+/.test(resumeText)) {
            structureScore += 5; // Email
        }

        if (/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/.test(resumeText)) {
            structureScore += 5; // Phone number
        }

        // Generate recommendations based on missing sections
        const missingSections = Object.keys(this.sectionKeywords).filter(
            section => !foundSections.includes(section)
        );

        if (missingSections.includes('summary')) {
            recommendations.push('Add a professional summary or objective section');
        }
        if (missingSections.includes('skills')) {
            recommendations.push('Include a dedicated technical skills section');
        }

        return {
            score: Math.min(structureScore, 100),
            foundSections,
            missingSections,
            recommendations
        };
    }

    // Calculate comprehensive ATS score
    async calculateATSScore(resumeText, jobDescription) {
        try {
            // 1. Skill matching analysis (60% weight)
            const skillAnalysis = this.analyzeSkillMatch(resumeText, jobDescription);

            // 2. Semantic similarity (20% weight)
            const semanticSimilarity = this.calculateSemanticSimilarity(resumeText, jobDescription);

            // 3. Resume structure analysis (15% weight)
            const structureAnalysis = this.analyzeResumeStructure(resumeText);

            // 4. Content quality metrics (5% weight)
            const wordCount = resumeText.split(/\s+/).length;
            const sentenceCount = resumeText.split(/[.!?]+/).length;
            const avgWordsPerSentence = wordCount / sentenceCount;
            const contentQualityScore = Math.min(
                (avgWordsPerSentence > 10 && avgWordsPerSentence < 25 ? 80 : 60) +
                (wordCount > 300 && wordCount < 2000 ? 20 : 10),
                100
            );

            // Calculate final score
            const finalScore = Math.round(
                (skillAnalysis.matchPercentage * 0.60) +
                (semanticSimilarity * 100 * 0.20) +
                (structureAnalysis.score * 0.15) +
                (contentQualityScore * 0.05)
            );

            // Generate comprehensive recommendations
            const recommendations = [
                ...structureAnalysis.recommendations,
                ...this.generateSkillRecommendations(skillAnalysis),
                ...this.generateContentRecommendations(wordCount, semanticSimilarity)
            ];

            return {
                overallScore: Math.min(finalScore, 95),
                breakdown: {
                    skillMatch: {
                        score: skillAnalysis.matchPercentage,
                        weight: '60%',
                        details: skillAnalysis.skillDetails
                    },
                    semanticSimilarity: {
                        score: Math.round(semanticSimilarity * 100),
                        weight: '20%'
                    },
                    structure: {
                        score: structureAnalysis.score,
                        weight: '15%',
                        foundSections: structureAnalysis.foundSections
                    },
                    contentQuality: {
                        score: contentQualityScore,
                        weight: '5%',
                        wordCount
                    }
                },
                recommendations,
                matchedSkills: skillAnalysis.skillDetails,
                totalSkillsFound: skillAnalysis.totalMatched,
                totalSkillsMissing: skillAnalysis.totalMissing
            };

        } catch (error) {
            throw new Error(`ATS analysis failed: ${error.message}`);
        }
    }

    generateSkillRecommendations(skillAnalysis) {
        const recommendations = [];

        // Find high-importance missing skills
        const highPriorityMissing = [];
        for (const category of Object.values(skillAnalysis.skillDetails)) {
            highPriorityMissing.push(
                ...category.missing.filter(skill => skill.importance === 'High')
            );
        }

        if (highPriorityMissing.length > 0) {
            recommendations.push(
                `Critical: Add these high-priority skills if you have them: ${
                    highPriorityMissing.slice(0, 5).map(s => s.skill).join(', ')
                }`
            );
        }

        if (skillAnalysis.matchPercentage < 40) {
            recommendations.push('Consider highlighting more relevant technical skills and experience');
        }

        return recommendations;
    }

    generateContentRecommendations(wordCount, similarity) {
        const recommendations = [];

        if (wordCount < 300) {
            recommendations.push('Your resume is quite brief. Consider adding more detail about your experience');
        } else if (wordCount > 2000) {
            recommendations.push('Your resume is lengthy. Consider condensing to focus on most relevant experience');
        }

        if (similarity < 0.3) {
            recommendations.push('Try to better align your resume content with the job description language');
        }

        return recommendations;
    }
}

// Initialize analyzer
const atsAnalyzer = new ATSScoreAnalyzer();

// API Routes

// Health check
server.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Analyze resume endpoint
server.post('/api/analyze-resume', upload.single('resume'), async (req, res) => {
    try {
        const { jobDescription, options = {} } = req.body;

        if (!jobDescription) {
            return res.status(400).json({
                error: 'Job description is required'
            });
        }

        let resumeText = '';

        // Handle file upload or text input
        if (req.file) {
            resumeText = await atsAnalyzer.extractTextFromFile(
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname
            );
        } else if (req.body.resumeText) {
            resumeText = req.body.resumeText;
        } else {
            return res.status(400).json({
                error: 'Resume file or text is required'
            });
        }

        if (resumeText.length < 100) {
            return res.status(400).json({
                error: 'Resume text is too short. Please provide a complete resume.'
            });
        }

        // Perform ATS analysis
        const analysisResult = await atsAnalyzer.calculateATSScore(resumeText, jobDescription);

        res.json({
            success: true,
            data: analysisResult,
            metadata: {
                resumeLength: resumeText.length,
                jobDescriptionLength: jobDescription.length,
                analyzedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});

// Analyze text-only endpoint (for faster processing)
server.post('/api/analyze-text', async (req, res) => {
    try {
        const { resumeText, jobDescription } = req.body;

        if (!resumeText || !jobDescription) {
            return res.status(400).json({
                error: 'Both resume text and job description are required'
            });
        }

        const analysisResult = await atsAnalyzer.calculateATSScore(resumeText, jobDescription);

        res.json({
            success: true,
            data: analysisResult,
            metadata: {
                resumeLength: resumeText.length,
                jobDescriptionLength: jobDescription.length,
                analyzedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});

// Get skill categories
server.get('/api/skill-categories', (req, res) => {
    res.json({
        categories: Object.keys(atsAnalyzer.skillCategories),
        details: atsAnalyzer.skillCategories
    });
});

// Error handling middleware
server.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
server.listen(port, () => {
    console.log(`🚀 ATS Score API running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Analyze endpoint: http://localhost:${port}/api/analyze-resume`);
});

module.exports = server;