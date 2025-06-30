# Debug Steps for 502/500 Errors

## Step 1: Test API Configuration
Visit this URL in your browser (replace with your actual Vercel URL):
```
https://your-app.vercel.app/api/test-api
```

**Expected responses:**
- ✅ **Success**: `{"status":"ok","configured":true,"response":"API working","model":"gemini-1.5-flash"}`
- ❌ **Not Configured**: `{"error":"Google AI API key not configured","configured":false}`
- ❌ **API Error**: `{"error":"API test failed","configured":true,"details":"..."}`

## Step 2: Check Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set
4. Make sure it's deployed to Production environment

## Step 3: Check Vercel Function Logs
1. Go to your Vercel project dashboard
2. Click on "Functions" tab
3. Look for recent invocations of:
   - `/api/identify-topic`
   - `/api/generate-quiz`
4. Check the logs for detailed error messages

## Step 4: Common Issues to Check

### API Key Issues
- **Problem**: Invalid or missing API key
- **Symptoms**: 401 errors or "authentication failed"
- **Solution**: Regenerate API key in Google AI Studio

### File Processing Issues
- **Problem**: PDF cannot be processed
- **Symptoms**: "Failed to process file buffer"
- **Solution**: Try different PDF, ensure it's not corrupted

### Quota/Rate Limits
- **Problem**: Exceeded Google AI limits
- **Symptoms**: 429 errors or "quota exceeded"
- **Solution**: Wait for quota reset or upgrade plan

### Network/Timeout Issues
- **Problem**: Vercel function timeout
- **Symptoms**: 504 errors or timeouts
- **Solution**: Use smaller PDFs, check Google AI service status

## Step 5: Test with curl
Test the API directly:
```bash
curl -X POST https://your-app.vercel.app/api/test-api
```

## What the Logs Will Show
With the new logging, you should see:
1. "Processing file: [filename] Size: [size] Type: [type]"
2. "File buffer created successfully, size: [bytes]"
3. "Starting Gemini API call..."
4. "Gemini API call successful" OR detailed error information

## Next Steps
1. Run the test API first
2. Check Vercel function logs for specific errors
3. Try with a very small, simple PDF (1-2 pages, text only)
4. Report back with the specific error messages from the logs
