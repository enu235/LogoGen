# LogoGen Development Guide

## Quick Setup

### Option 1: Using Docker (Recommended for Production)

1. **Clone and configure:**
```bash
git clone https://github.com/enu235/LogoGen.git 
cd LogoGen
cp .env.example .env
```

2. **Edit `.env` with your API credentials:**
```bash
API_KEY=your_actual_api_key
API_BASE_URL=https://api.x.ai/v1
MODEL_NAME=grok-vision-beta
```

3. **Start with Docker:**
```bash
docker-compose up --build
```

### Option 2: Local Development

1. **Use the startup script:**
```bash
./start.sh
```

Or manually:

```bash
npm install
cp .env.example .env
# Edit .env with your API key
npm start
```

## API Endpoints

### POST /api/generate
Generate a new image.

**Request:**
```json
{
  "prompt": "Modern tech company logo",
  "imageType": "logo" // or "icon"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "logo_modern_tech_1234567890.png",
    "path": "/generated/logo_modern_tech_1234567890.png",
    "size": 150000,
    "dimensions": { "width": 1024, "height": 1024 },
    "originalPrompt": "Modern tech company logo",
    "imageType": "logo",
    "generatedAt": "2025-06-01T10:00:00.000Z"
  }
}
```

### GET /api/health
Check server status and configuration.

## Image Processing

- **Logos:** Resized to 1024x1024px (configurable via LOGO_SIZE env var)
- **Icons:** Resized to 64x64px (configurable via ICON_SIZE env var)
- All images are saved as PNG format
- Automatic filename generation with timestamp and prompt

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | (required) | Your image generation API key |
| `API_BASE_URL` | `https://api.x.ai/v1` | API endpoint |
| `MODEL_NAME` | `grok-vision-beta` | Model to use |
| `PORT` | `3000` | Server port |
| `LOGO_SIZE` | `1024` | Logo output size in pixels |
| `ICON_SIZE` | `64` | Icon output size in pixels |
| `MAX_FILE_SIZE` | `10485760` | Max file size in bytes |

## Troubleshooting

### Common Issues

1. **"API_KEY not configured"**
   - Make sure you've copied `.env.example` to `.env`
   - Set your actual API key in the `.env` file

2. **Connection errors**
   - Verify your API_BASE_URL is correct
   - Check if your API key has proper permissions

3. **Image processing errors**
   - Ensure sufficient disk space
   - Check that the `public/generated` directory is writable

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

### Docker Logs

View application logs:
```bash
docker-compose logs -f logogen
```

## Security Notes

- The `.env` file is excluded from git via `.gitignore`
- API keys are never exposed to the client
- Images are served from a dedicated directory
- Helmet.js provides security headers
- Input validation on all endpoints
