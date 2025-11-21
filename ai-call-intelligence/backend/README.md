# AI Call Intelligence - Backend

Backend API server for the AI Call Intelligence Tool built with Node.js and Express.

## Features

- 🚀 RESTful API with Express.js
- 📁 File upload handling with Multer
- 🎵 Audio file validation (MP3/WAV)
- 🤖 Mock AI transcription and analysis services
- 💾 In-memory storage (database-ready)
- 🔍 CORS enabled for frontend integration

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload and process audio file |
| `GET` | `/api/calls` | Get all past calls |
| `GET` | `/api/calls/:id` | Get specific call details |
| `DELETE` | `/api/calls/:id` | Delete a call |

### Upload API Response

```json
{
  "success": true,
  "callId": "uuid-string",
  "data": {
    "transcription": {
      "text": "Full conversation transcript...",
      "confidence": 0.94,
      "duration": 180,
      "speakers": [...]
    },
    "analysis": {
      "summary": ["Key point 1", "Key point 2"],
      "keyDecisions": [...],
      "actionItems": [...],
      "insights": {...}
    }
  }
}
```

## Installation & Setup

1. **Install Dependencies**
   ```cmd
   cd backend
   npm install
   ```

2. **Start Development Server**
   ```cmd
   npm run dev
   ```
   
   Or for production:
   ```cmd
   npm start
   ```

3. **Server will run on:** `http://localhost:3001`

## Project Structure

```
backend/
├── services/           # Business logic services
│   ├── transcription.js   # Mock transcription service
│   ├── analysis.js        # Mock conversation analysis  
│   └── storage.js         # In-memory storage
├── uploads/            # Uploaded audio files
├── server.js          # Express server setup
└── package.json       # Dependencies and scripts
```

## Environment Variables

Create a `.env` file for production:

```env
PORT=3001
NODE_ENV=production
OPENAI_API_KEY=your_openai_key_here
# Add other AI service keys as needed
```

Database (MongoDB Atlas)

Set the MongoDB connection string as an environment variable. Preferred name: `ATLAS_URI`. For backwards compatibility `MONGODB_URI` is also supported.

Example:

```env
# Atlas (preferred)
ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ai-call-intelligence?retryWrites=true&w=majority

# or (legacy)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ai-call-intelligence?retryWrites=true&w=majority
```

If neither is provided, the server will fall back to `mongodb://localhost:27017/ai-call-intelligence`.

## AI Service Integration

The backend is designed with clear integration points for real AI services:

### 1. Transcription Service (`services/transcription.js`)

Replace the mock transcription with:
- **OpenAI Whisper**: Add OpenAI SDK and API key
- **Google Speech-to-Text**: Add Google Cloud SDK
- **Azure Speech Services**: Add Azure Cognitive Services SDK

### 2. Analysis Service (`services/analysis.js`)

Replace the mock analysis with:
- **OpenAI GPT-4**: For conversation analysis and summarization
- **Anthropic Claude**: Alternative language model
- **Custom Models**: Fine-tuned models for specific use cases

### 3. Storage Service (`services/storage.js`)

Replace in-memory storage with:
- **MongoDB**: For document-based storage
- **PostgreSQL**: For relational data
- **Firebase Firestore**: For cloud storage

## File Upload Configuration

- **Supported formats**: MP3, WAV
- **File size limit**: 50MB
- **Storage location**: `uploads/` directory
- **Validation**: MIME type and extension checking

## Error Handling

The API includes comprehensive error handling for:
- Invalid file types
- File size limits
- Processing errors
- Missing files
- Database errors

## CORS Configuration

CORS is enabled for all origins in development. For production, configure specific origins:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

## Testing the API

Test with curl:

```cmd
# Health check
curl http://localhost:3001/api/health

# Upload audio file
curl -X POST -F "audio=@path/to/audio.mp3" http://localhost:3001/api/upload

# Get all calls
curl http://localhost:3001/api/calls
```

## Production Considerations

1. **Security**: Add authentication middleware
2. **Rate Limiting**: Implement request rate limiting  
3. **File Storage**: Use cloud storage (AWS S3, Google Cloud Storage)
4. **Database**: Replace in-memory storage with persistent database
5. **Logging**: Add structured logging with Winston
6. **Monitoring**: Add health checks and metrics
7. **SSL/TLS**: Enable HTTPS in production