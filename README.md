# NCAL Study App

A lightweight, offline web application for practicing North County Academic League (NCAL) questions. This app runs entirely in the browser with no server requirements, making it perfect for deployment on any static hosting service.

## Features

- **Offline First**: No internet connection required after initial load
- **Subject Filtering**: Choose from Humanities, Science, Math, Languages, and Current Events
- **Difficulty Levels**: Practice with Freshman, Junior Varsity, or Varsity questions
- **Configurable Timer**: Set question time limits from 3-60 seconds
- **Smart Answer Matching**: Case-insensitive synonym matching with text normalization
- **Session Tracking**: Monitor progress and performance in real-time
- **Accessibility**: Full keyboard navigation and screen reader support

## How to Run

### Local Development
1. Simply open `index.html` in a modern web browser
2. The app will load the question bank and be ready to use

**Note**: If you encounter issues with `file://` protocol (common in some browsers), use a simple local server:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with npx)
npx serve .

# Then open http://localhost:8000
```

### Public Website Deployment
This app is designed to work on any static hosting service:

- **GitHub Pages**: Upload the entire folder to a repository and enable Pages
- **Netlify**: Drag and drop the folder to deploy
- **Cloudflare Pages**: Connect your repository or upload the folder
- **Vercel**: Import the folder as a static site

All assets use relative paths, so the app will work identically when deployed.

## Data Format

Questions are stored in flat-file format with one question per line:

```
Category;Question;["ANS1","ANS2",...];Level;Author
```

### Field Details
- **Category**: Subject path (e.g., "Humanities>European History")
- **Question**: The question text
- **Answers**: JSON array of acceptable answers (first is canonical)
- **Level**: "Freshman", "Junior Varsity", or "Varsity"
- **Author**: Question author/credit

### Escaping Rules
- Use `\;` for literal semicolons in text
- Use `\\` for literal backslashes in text
- Fields are automatically unescaped during parsing

### Example Lines
```
Humanities>European History;Capital of Russia?;["Moscow","Moskva"];Junior Varsity;NCAL
Science>Biological Science;Organelle for ATP production?;["Mitochondrion","Mitochondria"];Freshman;NCAL
Math>Calculus;d/dx of x^2?;["2x"];Varsity;NCAL
```

## Keyboard Shortcuts

- **Tab**: Navigate between interactive elements
- **Enter**: Submit answer (when focused on input)
- **Space**: Pause/Resume timer (global, not when typing)
- **Arrow Keys**: Navigate form controls

## Answer Matching

The app uses intelligent text normalization for answer matching:

- Case-insensitive comparison
- Hyphens converted to spaces
- Punctuation and special characters removed
- Common articles (the, a, an) stripped
- Whitespace normalized

**Examples**:
- "the—Mitochondria" matches "Mitochondrion"
- "New-York" matches "New York"
- "the moscow" matches "Moscow"

## Performance

- **Parsing**: Handles 1,000+ lines in under 300ms
- **Question Rendering**: New questions appear in under 100ms
- **Memory Efficient**: Minimal state management, no persistence

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires ES6 module support and modern JavaScript features.

## Project Structure

```
ncal-study-app/
├── index.html          # Main HTML file
├── styles.css          # Application styles
├── app.js             # Main application logic
├── parser.js          # Question bank parser
├── normalize.js       # Text normalization utilities
├── ui.js              # UI management functions
├── data/
│   └── bank_sample.txt # Sample question bank
├── assets/
│   └── favicon.svg    # Application icon
└── README.md          # This file
```

## Known Limitations (MVP Scope)

- **No Fuzzy Matching**: Exact synonym matching only
- **No User Accounts**: Single-player practice only
- **No Multiplayer**: No real-time collaboration
- **No Analytics**: No usage tracking or statistics
- **No Remote Data**: All questions must be bundled locally
- **No Question Editing**: Questions are read-only

## Error Handling

The app gracefully handles malformed data:
- Invalid JSON in answers field
- Unknown difficulty levels
- Missing or malformed fields
- Malformed escape sequences

Errors are displayed in a dismissible panel with line-by-line details and a "Copy Details" button for troubleshooting.

## Development Guidelines

### ⚠️ CRITICAL: Always Update JS Version After Every Edit

**MANDATORY RULE**: **ALWAYS update the JavaScript version number in `index.html` after making ANY edit to JavaScript files.** This is non-negotiable and must be done for every change.

**Files that require version updates:**
- `app.js` - Main application logic ⚠️ **ALWAYS UPDATE VERSION**
- `ui.js` - UI management functions ⚠️ **ALWAYS UPDATE VERSION**
- `parser.js` - Question bank parser ⚠️ **ALWAYS UPDATE VERSION**
- `normalize.js` - Text normalization utilities ⚠️ **ALWAYS UPDATE VERSION**
- `styles.css` - Application styles ⚠️ **ALWAYS UPDATE VERSION**

**Update the version parameter in `index.html` after EVERY edit:**
```html
<!-- Before editing -->
<script type="module" src="app.js?v=20241220-15"></script>
<link rel="stylesheet" href="styles.css?v=20241220-15">

<!-- After editing - MUST UPDATE -->
<script type="module" src="app.js?v=20241221-01"></script>
<link rel="stylesheet" href="styles.css?v=20241221-01">
```

**Version Format**: Use `YYYYMMDD-X` where:
- `YYYYMMDD` = Date of changes
- `X` = Increment number for multiple updates per day (01, 02, 03, etc.)

**Why This Matters**: Without version updates, users' browsers cache old JavaScript files, causing bugs and missing features to persist. Users will not see your changes until they hard-refresh their browser, which most users don't know how to do.

### Mandatory Workflow

**Every time you edit JavaScript or CSS files:**

1. ✅ Make your code changes
2. ✅ **IMMEDIATELY update version in `index.html`** (both CSS and JS links)
3. ✅ Test that changes are visible in browser
4. ✅ Commit with descriptive message

**This is not optional.** If you forget to update the version, your changes won't be visible to users.

### When to Update Versions

**ALWAYS Update:**
- ✅ Any JavaScript file edit (`app.js`, `ui.js`, `parser.js`, `normalize.js`)
- ✅ CSS file edits (`styles.css`)
- ✅ Bug fixes
- ✅ New features
- ✅ UI/UX changes
- ✅ Performance improvements
- ✅ Content updates
- ✅ Any change that users should see immediately

**Exception - Don't Update:**
- ❌ Documentation-only changes (README.md)
- ❌ Comments-only changes (but still recommended to update)
- ❌ Whitespace/formatting changes (but still recommended to update)

**Best Practice**: When in doubt, **always update the version**. It's better to update unnecessarily than to have users stuck with old cached code.

### Example Version Progression

```
v=20241220-15  (initial)
v=20241220-16  (first edit same day)
v=20241220-17  (second edit same day)
v=20241221-01  (first edit next day)
v=20241221-02  (second edit next day)
```

**Remember**: Every edit = version bump. No exceptions.

## Contributing

This is an MVP implementation. For production use, consider:
- Adding question validation tools
- Implementing question difficulty algorithms
- Adding performance analytics
- Creating question import/export tools
- Adding user progress tracking

## License

This project is designed for educational use by El Camino High School Academic League

---

**Built for North County Academic League** - Empowering students through academic competition and practice.

