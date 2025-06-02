# LogoGen - AI Image Generation Tool

A simple web application for generating logos and icons using AI image generation models compatible with OpenAI's API.

## Features

- 🎨 Generate logos (full size images)
- 🔲 Generate icons (small size images for favicons, etc.)
- 🖼️ Automatic image post-processing and resizing
- 🔧 Environment-based configuration
- 🐳 Docker support for easy deployment
- 🔒 Secure API key management
- ✨ Optional prompt enhancement using an LLM (Large Language Models)

## Quick Start

### Using Docker (Recommended)

1. Clone this repository:
```bash
git clone https://github.com/enu235/LogoGen.git
cd LogoGen
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API configuration:
```
API_KEY=your_api_key_here
API_BASE_URL=https://api.x.ai/v1
MODEL_NAME=grok-vision-beta
```

4. Create required directories (for filesystem storage):
```bash
mkdir -p public/generated temp
```

5. Run with Docker Compose:
```bash
# Default: Uses filesystem bind mounts (recommended)
docker-compose up

# Alternative: Use Docker volumes instead
docker-compose -f docker-compose.volumes.yml up
```

6. Open your browser to `http://localhost:3000`

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create and configure `.env` file (see above)

3. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `API_KEY`: Your API key for the image generation service
- `API_BASE_URL`: Base URL for the API (default: https://api.x.ai/v1)
- `MODEL_NAME`: Model name to use for generation (default: grok-vision-beta)
- `PORT`: Port to run the server on (default: 3000)
- `ENABLE_PROMPT_ENHANCEMENT`: Set to `true` to enable prompt enhancement with LLM, `false` to disable
- `LLM_API_KEY`, `LLM_API_BASE_URL`, `LLM_MODEL_NAME`: LLM settings for prompt enhancement
- `USE_SHARED_API_KEY`: Set to `true` to use the same API key for both image and LLM if supported

## Usage

1. Visit the web interface
2. Choose between "Logo" or "Icon" generation
3. Enter a descriptive prompt
4. Click "Generate"
5. Download your generated image

The application automatically handles:
- Logo generation: Creates high-resolution images suitable for branding
- Icon generation: Creates smaller images optimized for favicons and app icons

### Prompt Enhancement

- If enabled, users will see a checkbox in the UI to opt-in/out of prompt enhancement.
- If disabled, the UI will show a message that prompt enhancement is disabled by server configuration.
- The backend will only enhance prompts if both the config and the checkbox are enabled.

## Docker Support

The project includes Docker configuration for easy deployment:
- `Dockerfile`: Multi-stage build for optimized production image
- `docker-compose.yml`: Complete stack with filesystem bind mounts for persistent storage (default)
- `docker-compose.volumes.yml`: Alternative configuration using Docker volumes
- Generated images are stored directly on the local filesystem in `./public/generated/` (default)
- Temporary files are stored in `./temp/` for easy access and backup
- Automatic dependency installation and optimization

**Storage Options:**
- **Filesystem bind mounts** (default): Images saved directly to local filesystem, immediately accessible
- **Docker volumes**: Traditional Docker volume management, use `-f docker-compose.volumes.yml`

## API Endpoints

- `POST /api/generate` — Generate a logo or icon
- `GET /api/images` — List generated images
- `GET /api/health` — Health and configuration status

## Development

See `docs/DEVELOPMENT.md` for more details.

## Local Testing

- Use `test.sh` for local/CI pre-flight and endpoint checks:
  ```
  ./test.sh
  ```
- This script is not required for Docker or production use.

## 📚 Documentation

For detailed documentation, troubleshooting, and advanced features, see the [`docs/`](./docs/) folder:

- **[📋 Complete Documentation Index](./docs/INDEX.md)** - All documentation in one place
- **[🔧 Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Fix common issues and debug problems
- **[🔐 Security Updates](./docs/SECURITY_UPDATE.md)** - Latest security fixes and status
- **[🚀 Development Guide](./docs/DEVELOPMENT.md)** - Local development setup
- **[📦 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

## License

MIT
