# API Usage

This document explains how to use the Piper TTS API from other Visual Studio Code extensions.

## Accessing the API

To use the Piper TTS API in your extension, you need to:

1. Add `sethmiller.piper-tts` as an extension dependency in your `package.json`:

```json
"extensionDependencies": [
  "sethmiller.piper-tts"
]
```

2. Access the API in your extension's code:

```typescript
import * as vscode from 'vscode';

// Type definition for the Piper TTS API
interface PiperTTSApi {
  readText(text: string): Promise<void>;
  stopPlayback(): void;
  selectVoice(): Promise<void>;
}

async function usePiperTTS() {
  // Get the Piper TTS extension
  const piperExtension = vscode.extensions.getExtension('sethmiller.piper-tts');
  
  if (!piperExtension) {
    vscode.window.showErrorMessage('Piper TTS extension is not installed');
    return;
  }
  
  // Activate the extension if it's not already activated
  if (!piperExtension.isActive) {
    await piperExtension.activate();
  }
  
  // Get the API from the extension
  const piperApi = piperExtension.exports as PiperTTSApi;
  
  // Now you can use the API
  try {
    await piperApi.readText('Hello, world!');
  } catch (error) {
    console.error('Error using Piper TTS:', error);
  }
}
```

## API Methods

The Piper TTS API provides the following methods:

### `readText(text: string): Promise<void>`

Reads the provided text aloud using the currently selected voice.

- `text`: The text to be read aloud
- Returns a Promise that resolves when the text has been fully read or rejects if an error occurs

### `stopPlayback(): void`

Stops any currently playing text-to-speech.

### `selectVoice(): Promise<void>`

Opens a quick pick menu for the user to select a voice for text-to-speech.
- Returns a Promise that resolves when the user has selected a voice or dismissed the menu