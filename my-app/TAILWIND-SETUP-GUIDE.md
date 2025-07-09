# Complete Tailwind CSS Setup Guide

Follow these steps **exactly** to fix the styling issues:

## Step 1: Stop Everything and Clean Up

1. **Stop the development server** (Ctrl + C in terminal)
2. **Close VS Code completely**
3. **Delete these folders/files if they exist:**
   - `node_modules` folder
   - `package-lock.json` file
   - `.next` folder (if it exists)

## Step 2: Reinstall Everything Fresh

1. **Open Terminal** (not VS Code terminal, but the Mac Terminal app)
2. **Navigate to your project folder:**
   \`\`\`bash
   cd /path/to/your/basketball-scouting-app
   \`\`\`
3. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
4. **Initialize Tailwind CSS:**
   \`\`\`bash
   npx tailwindcss init -p
   \`\`\`

## Step 3: Configure Tailwind (Replace Files)

Replace the content of these files with the exact code provided:

### tailwind.config.js
### postcss.config.js  
### app/globals.css
### lib/utils.ts (create lib folder if needed)

## Step 4: Install VS Code Extension

1. **Open VS Code**
2. **Go to Extensions** (Cmd + Shift + X)
3. **Search for:** "Tailwind CSS IntelliSense"
4. **Install it**
5. **Restart VS Code**

## Step 5: Configure VS Code Settings

1. **Open VS Code settings** (Cmd + ,)
2. **Click the {} icon** (top right) to open settings.json
3. **Add these settings:**

\`\`\`json
{
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  },
  "tailwindCSS.experimental.classRegex": [
    "tw\`([^`]*)\`",
    ["clsx\$$([^)]*)\$$", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["classnames\$$([^)]*)\$$", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cva\$$([^)]*)\$$", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\$$([^)]*)\$$", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false
}
\`\`\`

## Step 6: Start Development Server

1. **In VS Code terminal:**
   \`\`\`bash
   npm run dev
   \`\`\`
2. **Open browser:** http://localhost:3000
3. **Hard refresh:** Cmd + Shift + R

## Step 7: Verify It's Working

You should see:
- ✅ Dark gradient background (slate to black)
- ✅ Orange/red buttons and accents
- ✅ Glassmorphism cards with blur effects
- ✅ No more @tailwind errors in VS Code

## If It Still Doesn't Work:

### Check Terminal Output
Look for these messages when running \`npm run dev\`:
\`\`\`
▲ Next.js 14.0.4
- Local: http://localhost:3000
✓ Ready in 2.3s
\`\`\`

### Check Browser Network Tab
1. Press F12 in browser
2. Go to Network tab
3. Refresh page
4. Look for CSS files loading successfully

### Verify File Structure
\`\`\`
your-project/
├── app/
│   ├── globals.css          ← Should have @tailwind directives
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── utils.ts             ← Should have cn function
├── tailwind.config.js       ← Should have content paths
├── postcss.config.js        ← Should have tailwindcss plugin
└── package.json             ← Should have tailwindcss in devDependencies
\`\`\`

### Still Having Issues?
1. **Check Node.js version:** \`node --version\` (should be 18+)
2. **Clear browser cache completely**
3. **Try incognito/private browsing mode**
4. **Check if any ad blockers are interfering**
