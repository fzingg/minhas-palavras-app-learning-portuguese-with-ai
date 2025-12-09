# Minhas Palavras - Portuguese Learning App

A React Native (Expo) mobile app for learning Portuguese vocabulary with AI-powered features.

## Features

### Vocabulary Management
- Add Portuguese-French word pairs with example sentences
- Import vocabulary from JSON files
- Search and filter your word collection
- SQLite database for persistent storage

### Learning Modes

**Quiz Mode**
- Random vocabulary testing
- Translate from Portuguese to French or vice versa
- Flexible answer matching (ignores articles and accents)

**Listen Mode**
- Audio-based learning with European Portuguese (pt-PT) text-to-speech
- Hear the Portuguese word, then after 5 seconds, hear the French translation
- Auto-advances through your vocabulary

### AI Features

**Story Generation (Gemini AI)**
- Generates short stories in Portuguese using your vocabulary words
- Stories are tailored to include words you're learning
- Includes French translations for each word used
- Stories are saved locally for offline reading

**Text-to-Speech**
- Listen to generated stories read aloud in European Portuguese
- Uses device's native TTS with automatic pt-PT voice selection

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based)
- **Database**: SQLite (expo-sqlite)
- **AI**: Google Gemini API for story generation
- **TTS**: expo-speech with European Portuguese voice support
- **Storage**: expo-file-system for story persistence

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Gemini API key:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
4. Run the app: `npx expo start`

## Project Structure

```
app/
  (tabs)/
    index.tsx    # Vocabulary list
    add.tsx      # Add new words
    learn.tsx    # Quiz and Listen modes
    read.tsx     # AI story generation
contexts/
  VocabularyContext.tsx  # State management
database/
  database.ts    # SQLite operations
services/
  gemini.ts      # Gemini AI integration
```
