 const express = require('express');
const cors = require('cors');
const multer = require('multer');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 VibeCode Genius Pro Server Enhanced Version Starting...');

// Configure Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: 'ap-southeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

console.log('✅ AWS Bedrock client initialized');

// Security middleware
app.use(helmet());
app.use(compression());
console.log('🔒 Security middleware enabled');

// CORS
app.use(cors());

// Rate limiting
const analysisLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Rate limit exceeded. Try again in 15 minutes.' }
});

// File upload
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 20 }
});

app.use(express.json());
app.use(express.static('public'));

// AI Analysis function
async function analyzeCodeWithBedrock(codeContent, analysisType = 'comprehensive') {
    try {
        let prompt = '';
        
        switch(analysisType) {
            case 'patent':
                prompt = `Analyze this code for patent opportunities. Identify novel algorithms, unique data structures, innovative processing methods, and patentable technical solutions:\n\n${codeContent}`;
                break;
            case 'security':
                prompt = `Perform a security analysis of this code. Identify potential vulnerabilities, security risks, and recommend improvements:\n\n${codeContent}`;
                break;
            case 'optimization':
                prompt = `Analyze this code for performance optimization opportunities. Identify bottlenecks, suggest improvements, and recommend best practices:\n\n${codeContent}`;
                break;
            default:
                prompt = `Provide a comprehensive analysis of this code including: 1) Patent opportunities, 2) Security assessment, 3) Performance optimization, 4) Code quality, 5) Innovation potential:\n\n${codeContent}`;
        }

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 4000,
                temperature: 0.7
            }),
            contentType: 'application/json',
            accept: 'application/json'
        });

        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        
        return {
            success: true,
            analysis: result.content[0].text,
            model: 'Claude 3 Sonnet',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Bedrock analysis error:', error);
        return {
            success: false,
            error: error.message,
            fallback: 'AI analysis temporarily unavailable. Please try again later.'
        };
    }
}

// Analysis endpoint
app.post('/analyze', upload.array('files'), analysisLimit, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        const analysisType = req.body.analysisType || 'comprehensive';
        let combinedCode = '';

        // Process all uploaded files
        for (const file of req.files) {
            const content = file.buffer.toString('utf-8');
            combinedCode += `\n\n--- File: ${file.originalname} ---\n${content}`;
        }

        console.log(`🔍 Starting ${analysisType} analysis for ${req.files.length} files`);

        const result = await analyzeCodeWithBedrock(combinedCode, analysisType);
        
        console.log(`✅ Analysis completed: ${result.success ? 'Success' : 'Failed'}`);
        
        res.json(result);
    } catch (error) {
        console.error('Analysis endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during analysis',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        features: ['AI Analysis', 'Security', 'Rate Limiting', 'File Upload']
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ VibeCode Genius Pro Enhanced Server running on port ${PORT}`);
    console.log(`🔒 Professional features enabled: Security, Analytics, Logging`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
});