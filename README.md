# LogoGen - AI Image Generation Tool

A simple web application for generating logos and icons using AI image generation models compatible with OpenAI's API.

## Features

- 🎨 Generate logos (full size images)
- 🔲 Generate icons (small size images for favicons, etc.)
- 🖼️ Automatic image post-processing and resizing
- 🔧 Environment-based configuration
- 🐳 Docker support for easy deployment
- 🔒 Secure API key management

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

4. Run with Docker Compose:
```bash
docker-compose up
```

5. Open your browser to `http://localhost:3000`

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

## Usage

1. Visit the web interface
2. Choose between "Logo" or "Icon" generation
3. Enter a descriptive prompt
4. Click "Generate"
5. Download your generated image

The application automatically handles:
- Logo generation: Creates high-resolution images suitable for branding
- Icon generation: Creates smaller images optimized for favicons and app icons

## Docker Support

The project includes Docker configuration for easy deployment:
- `Dockerfile`: Multi-stage build for optimized production image
- `docker-compose.yml`: Complete stack with volume management
- Automatic dependency installation and optimization

## 📚 Documentation

For detailed documentation, troubleshooting, and advanced features, see the [`docs/`](./docs/) folder:

- **[📋 Complete Documentation Index](./docs/INDEX.md)** - All documentation in one place
- **[🔧 Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Fix common issues and debug problems
- **[🔐 Security Updates](./docs/SECURITY_UPDATE.md)** - Latest security fixes and status
- **[🚀 Development Guide](./docs/DEVELOPMENT.md)** - Local development setup
- **[📦 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

## License

MIT
