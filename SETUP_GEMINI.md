# Setup Guide for Google Gemini AI

## Steps to complete the migration:

### 1. Get Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Set up environment variables
1. Open the `.env.local` file in your project root
2. Replace `your_google_ai_api_key_here` with your actual API key:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
   ```

### 3. Run your application
```bash
npm run dev
```

### 4. For Vercel Deployment
Add the environment variable in your Vercel dashboard:
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add: `GOOGLE_GENERATIVE_AI_API_KEY` with your API key value
4. Deploy!

## What Changed:

### Dependencies
- ❌ Removed: `@ai-sdk/openai`
- ✅ Added: `@ai-sdk/google`

### API Routes
- **generate-quiz/route.ts**: Now uses `google("gemini-1.5-pro")` instead of `openai("gpt-4o")`
- **identify-topic/route.ts**: Now uses `google("gemini-1.5-pro")` instead of `openai("gpt-4o")`

### Models Used
- **Gemini 1.5 Flash**: Faster and higher free tier limits - excellent for PDF analysis and structured output generation
- **Note**: If you hit quota limits, the app now uses `gemini-1.5-flash` which has more generous free tier limits than `gemini-1.5-pro`

## Benefits of Gemini AI:
- ✅ Often faster response times
- ✅ Competitive performance on reasoning tasks
- ✅ Good PDF processing capabilities
- ✅ Cost-effective pricing
- ✅ Same AI SDK interface - minimal code changes required
- ✅ Higher free tier limits with Flash model

## 🚨 Important: Free Tier Limits
Google AI has free tier limits:
- **Daily requests**: Limited per day
- **Per-minute requests**: Limited per minute
- **Token limits**: Limited input tokens per minute
- **File size**: PDFs should be under 5MB for best compatibility

**If you hit limits:**
1. Wait for the quota to reset (usually 24 hours for daily limits)
2. Consider upgrading to a paid plan for higher limits
3. The app now uses `gemini-1.5-flash` which has higher free limits
4. For large PDFs: Try compressing them or splitting into smaller files

Your app functionality remains exactly the same - it will still generate quizzes from PDFs and identify topics, just powered by Google's Gemini AI instead of OpenAI!
