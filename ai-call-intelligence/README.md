# AI Call Intelligence Tool

A modern, responsive web application that allows users to upload audio recordings and get AI-powered insights including transcription, summaries, key decisions, action items, and conversation analytics.

## Features

- 🎵 **Audio Upload**: Drag & drop interface for MP3/WAV files (up to 50MB)
- 🤖 **AI Transcription**: Automatic speech-to-text with speaker identification
- 📊 **Smart Analysis**: Extract key decisions, action items, and insights
- 📈 **Analytics**: Sentiment analysis, talk ratios, and conversation metrics
- 🌓 **Dark/Light Mode**: Elegant theme switching with persistence
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- ⚡ **Real-time Processing**: Live progress tracking and instant results
- 🎯 **Action Tracking**: Structured task management from conversations

## Tech Stack

- **Frontend**: React.js 18 + TailwindCSS 3 + React Router 6
- **Backend**: Node.js + Express.js + Multer
- **Icons**: Lucide React (beautiful, consistent icons)
- **Storage**: In-memory (easily replaceable with database)
- **API**: RESTful design with comprehensive error handling

## Project Structure

```
ai-call-intelligence/
├── backend/                 # Express.js API server
│   ├── services/           # Business logic (transcription, analysis, storage)
│   ├── uploads/           # Audio file storage
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API integration
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
└── README.md             # This comprehensive guide
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (recommended: 18+)
- **npm** or **yarn**
- **Git** (for cloning)

### Installation

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd ai-call-intelligence
   ```

2. **Install Backend Dependencies**
   ```cmd
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```cmd
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server** (Terminal 1)
   ```cmd
   cd backend
   npm run dev
   ```
   ✅ Backend will run on `http://localhost:3001`

2. **Start the Frontend Server** (Terminal 2)
   ```cmd
   cd frontend
   npm start
   ```
   ✅ Frontend will run on `http://localhost:3000`

3. **Open in Browser**
   Navigate to `http://localhost:3000` and start uploading audio files!

### Production Build

1. **Build Frontend**
   ```cmd
   cd frontend
   npm run build
   ```

2. **Start Production Server**
   ```cmd
   cd ../backend
   npm start
   ```

## 📖 Usage Guide

### 1. Upload Audio Files
- **Supported Formats**: MP3, WAV
- **File Size Limit**: 50MB
- **Methods**: Drag & drop or click to browse
- **Validation**: Automatic file type and size checking

### 2. Processing Pipeline
1. **File Upload**: Real-time progress tracking
2. **Transcription**: AI-powered speech-to-text
3. **Analysis**: Extract insights, decisions, and action items
4. **Results**: Comprehensive dashboard with analytics

### 3. View Results
- **Summary**: Key discussion points in bullet format
- **Decisions**: Important decisions with confidence levels
- **Action Items**: Structured task list with assignments and deadlines
- **Insights**: Sentiment analysis, talk ratios, and themes

### 4. Manage Calls
- **Browse History**: Search, filter, and sort past calls
- **View Details**: Deep dive into individual conversations
- **Export Data**: Download results (feature ready for implementation)
- **Delete Calls**: Remove outdated recordings

## 🔧 Configuration

### Environment Variables

Create `.env` files for configuration:

**Backend (.env)**
```env
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=your_openai_key_here
# Add other AI service keys
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=1.0.0
```

## 🤖 AI Integration

The application is designed with clear integration points for real AI services:

### 1. Transcription Service (`backend/services/transcription.js`)

**Current**: Mock transcription with realistic data
**Integration Options**:
- **OpenAI Whisper**: Industry-leading accuracy
- **Google Speech-to-Text**: Robust and reliable
- **Azure Speech Services**: Enterprise-grade
- **AWS Transcribe**: Scalable cloud solution

### 2. Analysis Service (`backend/services/analysis.js`)

**Current**: Mock analysis with structured insights
**Integration Options**:
- **OpenAI GPT-4**: Advanced conversation analysis
- **Anthropic Claude**: Alternative language model
- **Custom Models**: Fine-tuned for specific use cases

### 3. Storage Service (`backend/services/storage.js`)

**Current**: In-memory storage for development
**Integration Options**:
- **MongoDB**: Document-based storage
- **PostgreSQL**: Relational database with JSON support
- **Firebase Firestore**: Real-time cloud database
- **Redis**: High-performance caching

## 🎨 Customization

### Theming
- **Colors**: Modify `frontend/tailwind.config.js`
- **Components**: Update component styles in `frontend/src/index.css`
- **Dark Mode**: Automatic system detection with manual override

### Branding
- **Logo**: Replace in `frontend/src/components/Layout.js`
- **Title**: Update in `frontend/public/index.html`
- **Favicon**: Replace files in `frontend/public/`

## 🧪 Testing

### Backend Testing
```cmd
cd backend
npm test
```

### Frontend Testing
```cmd
cd frontend
npm test
```

### Manual Testing Checklist
- [ ] File upload (various formats and sizes)
- [ ] Dark/light mode toggle
- [ ] Responsive design on mobile
- [ ] API error handling
- [ ] Browser compatibility

## 🚀 Deployment

### Docker (Recommended)

Create `Dockerfile` for each service:

**Backend Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
```

### Cloud Deployment

#### Vercel (Frontend)
```bash
cd frontend
npm install -g vercel
vercel --prod
```

#### Heroku (Backend)
```bash
cd backend
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
```

#### AWS/Azure/GCP
- Use container services (ECS, Container Instances, Cloud Run)
- Configure environment variables
- Set up load balancing and auto-scaling

## 📊 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Caching**: Aggressive caching for static assets
- **Compression**: Gzip/Brotli compression enabled

### Monitoring
- **Error Tracking**: Ready for Sentry integration
- **Analytics**: Ready for Google Analytics/Mixpanel
- **Performance**: Built-in React DevTools support

## 🔒 Security

### Current Implementation
- **File Validation**: Type and size checking
- **CORS**: Configured for development
- **Input Sanitization**: Basic protection

### Production Recommendations
- **Authentication**: Add user login/registration
- **Rate Limiting**: Prevent abuse
- **HTTPS**: SSL/TLS certificates
- **API Keys**: Secure environment variable management

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style
- **JavaScript**: ES6+ with consistent formatting
- **React**: Functional components with hooks
- **CSS**: TailwindCSS utility-first approach
- **Naming**: Descriptive and consistent naming

## 📚 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload and process audio |
| `GET` | `/api/calls` | Get all calls |
| `GET` | `/api/calls/:id` | Get specific call |
| `DELETE` | `/api/calls/:id` | Delete call |

### Example Responses

**Upload Response**
```json
{
  "success": true,
  "callId": "uuid-string",
  "data": {
    "transcription": {
      "text": "Full transcript...",
      "confidence": 0.94,
      "duration": 180,
      "speakers": [...]
    },
    "analysis": {
      "summary": ["Point 1", "Point 2"],
      "keyDecisions": [...],
      "actionItems": [...],
      "insights": {...}
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if port 3001 is available
   - Verify Node.js version (16+)
   - Clear node_modules and reinstall

2. **Frontend compilation errors**
   - Ensure all dependencies are installed
   - Check for TailwindCSS configuration
   - Verify React version compatibility

3. **File upload fails**
   - Check file format (MP3/WAV only)
   - Verify file size (max 50MB)
   - Ensure backend is running and accessible

4. **CORS errors**
   - Verify proxy configuration in package.json
   - Check backend CORS settings
   - Ensure both servers are running

### Debug Mode
Enable detailed logging:
```javascript
localStorage.setItem('debug', 'true');
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for inspiration on AI integration patterns
- **TailwindCSS** for the amazing utility-first framework
- **Lucide** for beautiful, consistent icons
- **React** team for the excellent framework

## 📞 Support

- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [your-email@domain.com]
- **Documentation**: Check individual README files in subdirectories

---

**Happy coding! 🎉**