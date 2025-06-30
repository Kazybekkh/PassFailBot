# Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Error: 413 Payload Too Large
**Problem**: PDF file is too large for processing
**Solutions**:
- ✅ **Fixed**: Backend and frontend now both limit to 5MB
- Use PDFs smaller than 5MB
- Compress your PDF using online tools
- Split large PDFs into smaller sections
- Remove images/graphics from PDF if possible

### 🔴 Error: 504 Gateway Timeout
**Problem**: Request takes too long to process
**Solutions**:
- ✅ **Fixed**: Added timeout handling with better error messages
- Use simpler, text-heavy PDFs (avoid complex graphics)
- Try PDFs with fewer pages (1-10 pages ideal)
- Ensure stable internet connection
- Wait and try again (server might be busy)

### 🔴 Error: 429 Too Many Requests  
**Problem**: Hit Google AI API quota limits
**Solutions**:
- Wait 24 hours for daily quota reset
- Wait 1 minute for per-minute quota reset
- Upgrade to paid Google AI plan for higher limits
- Use smaller, simpler PDFs to reduce token usage

### 🔴 Error: 404 favicon.ico
**Problem**: Missing favicon file
**Solution**: ✅ Fixed! Added favicon from robot head image

### 🔴 Error: Could not identify topic/generate quiz
**Problem**: API connection or processing issues
**Solutions**:
- Check your API key is correctly set in `.env.local`
- Ensure internet connection is stable
- Try with a smaller, simpler PDF
- Check Google AI Studio for any service issues

## Tips for Best Results

### 📄 PDF Preparation
- **Size**: Keep under 5MB
- **Pages**: 1-20 pages work best
- **Content**: Text-heavy PDFs work better than image-heavy ones
- **Format**: Standard PDF format (not scanned images)

### 🤖 API Optimization
- **File size**: Smaller files = faster processing
- **Content type**: Educational content works best
- **Language**: English content has best support

### 🚀 Performance Tips
- Upload during off-peak hours
- Clear browser cache if having issues
- Try different PDFs if one doesn't work
- Check browser console for detailed error messages

## Getting Help
1. Check the browser console (F12) for detailed error messages
2. Verify your Google AI API key is valid
3. Test with a simple, small PDF first
4. Check Google AI Studio quota usage
