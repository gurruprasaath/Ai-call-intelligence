# 🧪 How to Test Phone-to-Site Sync

## Quick Test (5 minutes)

### Step 1: Start Your Backend
```cmd
cd backend
npm start
```
You should see: `🚀 AI Call Intelligence API server is running on port 3001`

### Step 2: Run the Test Script
```cmd
cd ..
node test-mobile-upload.js
```

**Expected output:**
```
🧪 AI Call Intelligence - Mobile Upload Test Suite
🏥 Testing server health...
✅ Server is healthy!
📋 Testing /api/calls endpoint...
✅ Found X existing calls
🧪 Testing mobile upload endpoint...
📤 Uploading to /api/mobile/upload...
✅ Upload successful!
🔄 Polling processing status for call: 67123...
📊 Status: processing | Stage: transcribing | Progress: 30%
📊 Status: completed | Stage: complete | Progress: 100%
✅ Processing completed successfully!
🎉 Your mobile upload is working correctly!
```

### Step 3: Check Web App
```cmd
cd frontend
npm start
```

1. Open http://localhost:3000
2. Go to **"Past Calls"**
3. Look for **test-call-recording.wav** with a **📱 badge**
4. Click on it to see transcription and analysis

---

## Full Mobile App Test

### Step 1: Setup Mobile Development
```cmd
# Install React Native CLI (if not installed)
npm install -g react-native-cli

# Setup the demo app
cd mobile_upload_examples/react-native-demo
npm install
```

### Step 2: Expose Your Server (for mobile testing)
```cmd
# In a new terminal
ngrok http 3001
```
Copy the `https://` URL (like `https://abc123.ngrok.io`)

### Step 3: Configure Mobile App
Edit `mobile_upload_examples/react-native-demo/MobileUploader.js`:
```javascript
const API_BASE_URL = 'https://abc123.ngrok.io/api';  // Your ngrok URL
```

### Step 4: Get Auth Token
1. Open web app at http://localhost:3000
2. Register/login to get authenticated
3. Open browser console (F12)
4. Run: `localStorage.getItem('authToken')`
5. Copy the token

### Step 5: Run Mobile App
```cmd
# Make sure you have Android device/emulator connected
npx react-native run-android
```

### Step 6: Test Upload
1. **Enter auth token** in the mobile app
2. **Record audio** (tap "Start Recording", speak, tap "Stop")
3. **Upload** (tap "Upload Recording")
4. **Watch progress** (should show percentage)

### Step 7: Verify in Web App
1. Go back to web app "Past Calls"
2. **Wait 30 seconds** (auto-refresh)
3. **Look for new recording** with 📱 badge
4. **Click to see** full transcription and analysis

---

## Troubleshooting

### ❌ "Cannot connect to server"
**Problem:** Backend not running  
**Solution:** 
```cmd
cd backend
npm start
```

### ❌ "Server health check failed"
**Problem:** Wrong port or server crashed  
**Solution:** Check if port 3001 is free:
```cmd
netstat -ano | findstr :3001
```

### ❌ "Upload failed: 413 Payload Too Large"
**Problem:** File too big  
**Solution:** Test script creates small files. For real recordings, ensure <25MB.

### ❌ "Processing failed"
**Problem:** Missing API keys  
**Solution:** Check your `.env` file has:
```
GROQ_API_KEY=your_groq_api_key
MONGODB_URI=your_mongodb_connection
```

### ❌ Mobile app "Network Error" 
**Problem:** Phone can't reach server  
**Solution:** 
- Use ngrok for local testing
- Make sure phone and computer on same WiFi
- Check firewall settings

### ❌ "No mobile calls found"
**Problem:** Filtering not working  
**Solution:** Check the "📱 Mobile Recordings" filter in web app

---

## Success Indicators

✅ **Test script completes** without errors  
✅ **Server health check passes**  
✅ **Upload returns callId**  
✅ **Processing reaches "completed" status**  
✅ **Web app shows recording with 📱 badge**  
✅ **Transcription and analysis available**  
✅ **Auto-refresh detects new uploads**  

---

## Performance Check

### Upload Speed
- **Small files (<5MB):** Direct upload, should complete in 10-30 seconds
- **Large files (>5MB):** Chunked upload, 1-5 minutes depending on connection

### Processing Speed  
- **Transcription:** 10-60 seconds (depends on audio length)
- **Analysis:** 10-30 seconds
- **Total:** Usually 1-3 minutes from upload to completion

### Auto-Refresh
- **Web app checks for new calls every 30 seconds**
- **New uploads appear automatically without page refresh**

---

## What Each Test Validates

| Test | What It Checks |
|------|---------------|
| **Server Health** | Backend running, database connected |
| **Mobile Upload** | `/api/mobile/upload` endpoint working |
| **Status Polling** | Async processing pipeline |
| **Get Calls** | Frontend can fetch recordings |
| **Mobile App** | End-to-end phone recording → web display |

Your phone-to-site sync is working when all tests pass! 🎉