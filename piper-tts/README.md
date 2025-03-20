# Piper TTS Extension

A Text-to-Speech extension for Visual Studio Code using Piper, a fast, local neural text-to-speech engine.

## Features

- Convert selected text to speech with high-quality voices
- Support for multiple languages and voices
- Local processing (no internet connection required)
- Cross-platform support (Windows, macOS, Linux)

## Requirements

### Windows Users
- Install [SoX (Sound eXchange)](https://sourceforge.net/projects/sox/files/sox/) 
  - Download and install the latest version
  - Ensure `play.exe` is in your system PATH

### macOS Users
No additional requirements.

### Linux Users
No additional requirements (uses `aplay` which is typically pre-installed).

## Usage

1. Select the text you want to read aloud
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type "Read Aloud" and select the command
4. The selected text will be read aloud using the default voice

## Extension Settings

Currently, this extension does not have any configurable settings.

## Known Issues

- Windows users must install SoX for audio playback to work

## Release Notes

### 1.0.0

Initial release:
- Basic text-to-speech functionality
- Support for Windows, macOS, and Linux
- Default English voice included
