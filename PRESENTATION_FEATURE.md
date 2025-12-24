# AI Presentation Feature

This feature allows users to upload PDF presentations and automatically generate AI-powered speaker scripts with voice narration for each slide.

## Features

- **PDF Upload**: Drag-and-drop or browse to upload PDF presentations
- **AI Script Generation**: Automatically generates natural, conversational speaker scripts for each slide using free LLM models via OpenRouter (default: yi-lightning)
- **Voice Narration**: Converts scripts to audio using ElevenLabs text-to-speech
- **Caching**: Scripts and audio are cached in the database and R2 storage to avoid regeneration
- **Presentation Management**: View and select from previously uploaded presentations
- **Keyboard Navigation**: Use arrow keys to navigate slides, 'M' to toggle mute
- **Audio Controls**: Play, pause, and replay audio narration

## Architecture

### Database Schema

Two new tables are added:

1. **presentations**: Stores presentation metadata
   - `id`: Unique identifier
   - `name`: Presentation filename
   - `pdf_url`: R2 storage URL for the PDF
   - `total_pages`: Number of pages in the PDF
   - `created_at`: Upload timestamp

2. **script_cache**: Caches generated scripts and audio
   - `id`: Auto-increment primary key
   - `content_hash`: SHA-256 hash of (pdfId + pageNumber + totalPages + textContent)
   - `pdf_id`: Reference to presentation
   - `page_number`: Slide number
   - `total_pages`: Total slides in presentation
   - `script`: Generated speaker script
   - `audio_url`: R2 storage URL for audio file
   - `created_at`: Generation timestamp

### API Endpoints

1. **GET /api/presentations**: List all presentations
2. **POST /api/presentations**: Upload a new PDF presentation
3. **POST /api/generate-script**: Generate script and audio for a slide

### Components

- **PresentationViewer** (`src/components/presentation-viewer.tsx`): Main component
  - Upload interface
  - Presentation gallery
  - PDF viewer with controls
  - Script display panel
  - Audio playback

### Storage

- **PDFs**: Stored in R2 under `presentations/{id}.pdf`
- **Audio**: Stored in R2 under `audio/{contentHash}.mp3`

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Database
DATABASE_URL=your_libsql_url
DATABASE_AUTH_TOKEN=your_libsql_token

# R2 Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_BASE_URL=https://your-bucket.r2.dev

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: LLM Model Selection (defaults to 01-ai/yi-lightning)
# LLM_MODEL=01-ai/yi-lightning
# LLM_MODEL=nousresearch/hermes-3-llama-3.1-405b:free
```

## Usage

1. Navigate to `/presentations` in your app
2. Upload a PDF presentation or select an existing one
3. The AI will automatically:
   - Extract text from each slide
   - Generate a natural speaker script
   - Create voice narration using ElevenLabs
4. Navigate through slides using:
   - Arrow buttons
   - Keyboard arrows (← →)
   - Slide indicator dots
5. Control audio with:
   - Play/Pause button
   - Mute button
   - Keyboard 'M' key to toggle mute

## Caching Strategy

The system uses content-based hashing to cache scripts and audio:

- **Content Hash**: `SHA-256(pdfId + pageNumber + totalPages + textContent)`
- If the same slide content is encountered again, cached script and audio are returned
- This saves API costs and improves response time

## Customization

### Voice Settings

Edit the `VOICE_ID` constant in `src/routes/api/generate-script/$.ts`:

```typescript
const VOICE_ID = "a9QznHbxnuMJcEJmicSn" // Change to your preferred ElevenLabs voice
```

### LLM Model Selection

The system uses free models from OpenRouter. You can switch models by setting the `LLM_MODEL` environment variable:

**Default**: `01-ai/yi-lightning` (fast, good quality)

**Alternative Free Models**:
- `nousresearch/hermes-3-llama-3.1-405b:free` - Very capable 405B model
- `meta-llama/llama-3.2-3b-instruct:free` - Lightweight and fast
- `google/gemini-flash-1.5:free` - Google's fast model

To switch models, add to `.env`:
```env
LLM_MODEL=nousresearch/hermes-3-llama-3.1-405b:free
```

Or edit directly in `src/routes/api/generate-script/$.ts`:
```typescript
const LLM_MODEL = process.env.LLM_MODEL || "01-ai/yi-lightning"
```

### Script Prompt

Modify the prompt in `src/routes/api/generate-script/$.ts` to customize:
- Tone and style
- Language handling
- Script length
- Content focus

### UI Styling

The component uses Tailwind CSS with a dark theme. Customize colors and styles in:
- `src/components/presentation-viewer.tsx`

## Performance Considerations

- **First Load**: Generating script + audio takes 5-10 seconds per slide
- **Cached Load**: Instant retrieval from database
- **Audio Streaming**: Audio plays as soon as available
- **PDF Rendering**: Uses react-pdf with worker for smooth rendering

## Dependencies

All required dependencies are already installed:
- `ai`: AI SDK for text generation
- `@ai-sdk/elevenlabs`: ElevenLabs integration
- `@openrouter/ai-sdk-provider`: OpenRouter integration for LLM access
- `react-pdf`: PDF rendering
- `@aws-sdk/client-s3`: R2 storage
- `@libsql/client`: Database client

## Future Enhancements

Potential improvements:
- [ ] Multi-language support detection
- [ ] Custom voice selection per presentation
- [ ] Presentation sharing and collaboration
- [ ] Export scripts as subtitles/captions
- [ ] Presentation analytics (views, completions)
- [ ] Slide notes and annotations
- [ ] Auto-advance slides with audio timing

