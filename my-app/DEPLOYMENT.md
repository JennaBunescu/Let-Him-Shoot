# Deployment Guide

## Vercel Deployment (Frontend + API)

This application is designed to be deployed as a full-stack Next.js application on Vercel.

### Prerequisites

- GitHub account
- Vercel account
- Node.js 18+ locally

### Steps

1. **Push to GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   \`\`\`

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings (auto-detected for Next.js)
   - Deploy

3. **Environment Variables** (if needed)
   - Add any required environment variables in Vercel dashboard
   - For production scraping, you might need API keys or proxy settings

### Alternative: Manual Deployment

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

## Separate Backend Deployment (Optional)

If you prefer to separate the backend, you can extract the API routes to a standalone Express server.

### Railway Deployment

1. Create `server.js`:
\`\`\`javascript
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

// Import your API routes
app.use('/api', require('./api'))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
\`\`\`

2. Deploy to Railway:
   - Connect GitHub repository
   - Railway auto-detects Node.js
   - Set environment variables
   - Deploy

### Render Deployment

1. Create `render.yaml`:
\`\`\`yaml
services:
  - type: web
    name: basketball-scout-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
\`\`\`

2. Deploy to Render:
   - Connect GitHub repository
   - Configure build settings
   - Deploy

## Production Considerations

### Web Scraping
- Implement proper rate limiting
- Add retry logic for failed requests
- Consider using proxies for large-scale scraping
- Respect robots.txt and terms of service

### Performance
- Enable caching for API responses
- Implement database for persistent storage
- Use CDN for static assets
- Monitor API response times

### Security
- Implement CORS properly
- Add rate limiting to API endpoints
- Sanitize scraped data
- Use HTTPS in production

### Monitoring
- Set up error tracking (Sentry)
- Monitor API performance
- Track user analytics
- Set up uptime monitoring
