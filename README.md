# Setlist to Playlist

Convert your music setlists into Spotify playlists in minutes! A powerful tool for musicians, DJs, and music enthusiasts to transform setlists into shareable Spotify playlists.

## Features

✨ **Dual Input Methods**
- **Text Input**: Paste your setlist directly 
- **Image Upload**: Upload photos of printed/handwritten setlists with OCR

🎵 **Smart Song Matching**
- Automatic Spotify catalog matching
- Artist and title recognition
- Confidence scoring for matches
- Manual correction capabilities

🚀 **One-Click Playlist Creation**
- Direct Spotify integration with PKCE authentication
- Instant playlist generation
- Shareable playlist links

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Authentication**: Spotify OAuth 2.0 with PKCE (no backend required)
- **OCR**: Tesseract.js for client-side text extraction
- **State Management**: Zustand + React Query
- **Routing**: React Router v6

## Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm
- Spotify Developer Account

### Setup

1. **Clone and install dependencies:**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

2. **Configure Spotify App:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new app
   - Set redirect URI to: `http://localhost:8080/callback`
   - Note your Client ID

3. **Environment Setup:**
```bash
cp .env.example .env
# Edit .env with your Spotify Client ID
```

4. **Start Development Server:**
```bash
npm run dev
```

Visit http://localhost:8080 to use the app!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SPOTIFY_CLIENT_ID` | Your Spotify app's Client ID | ✅ |
| `VITE_REDIRECT_URI` | OAuth redirect URI (default: localhost:8080/callback) | ✅ |
| `VITE_APP_NAME` | App name for branding | ❌ |

## Usage

### Text Input Method
1. Paste your setlist in the text area
2. Supports formats like:
   - `Song Title - Artist Name`
   - `Artist Name - Song Title`  
   - `Song Title` (artist will be detected automatically)

### Image Upload Method  
1. Upload a clear photo of your setlist
2. OCR will extract and clean the text automatically
3. Works with printed and handwritten setlists

### Creating Playlists
1. Review extracted songs and matches
2. Edit any incorrect matches manually
3. Connect to Spotify when ready
4. Set playlist name and description
5. Create and share your playlist!

## Spotify Integration

This app uses Spotify's Authorization Code with PKCE flow for secure authentication without requiring a backend server. Required scopes:

- `playlist-modify-public` - Create public playlists
- `playlist-modify-private` - Create private playlists  
- `user-read-email` - Get user profile info

## Project Structure

```
src/
├── api/           # Spotify Web API client
├── auth/          # PKCE authentication utilities  
├── components/    # Reusable UI components
├── config/        # Environment configuration
├── ocr/           # Tesseract.js OCR processing
├── pages/         # Main app pages (Home, Review, Callback)
├── state/         # Session management context
├── store/         # Zustand state store
└── utils/         # Parsing and matching utilities
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Components

- **Home**: Input methods (text/OCR) and song extraction
- **Review**: Song matching, editing, and playlist creation  
- **Callback**: OAuth callback handling
- **OcrDropzone**: Drag-and-drop image processing

## Deployment

Build the app for production:

```bash
npm run build
```

Deploy the `dist` folder to any static hosting service. Update your Spotify app's redirect URI to match your production domain.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
