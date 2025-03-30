/**
 * Script to parse VOICES.md and create a JSON file with voice data
 */
const fs = require('fs');
const path = require('path');

// Read the VOICES.md file
const voicesFilePath = path.join(__dirname, '..', 'voices', 'VOICES.md');
const voicesContent = fs.readFileSync(voicesFilePath, 'utf8');

// Initialize the result object
const voices = {};

// Split the content by lines and process line by line
const lines = voicesContent.split('\n');

let currentLanguage = null;
let currentVoice = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines or the title
    if (!line.trim() || line.trim() === '# Voices') {
        continue;
    }
    
    // Check if this is a language line
    if (line.match(/^\* [^(]+ \(`[^`]+`/)) {
        const match = line.match(/^\* ([^(]+) \(`([^`]+)`/);
        if (match) {
            const languageName = match[1].trim();
            const languageCode = match[2].trim();
            currentLanguage = languageName + " (" + languageCode + ")";
            voices[currentLanguage] = {};
            currentVoice = null;
        }
        continue;
    }
    
    // Check if this is a voice line
    if (line.match(/^\s{4}\* [^\s]+$/)) {
        const match = line.match(/^\s{4}\* ([^\s]+)$/);
        if (match && currentLanguage) {
            currentVoice = match[1].trim();
            voices[currentLanguage][currentVoice] = {};
        }
        continue;
    }
    
    // Check if this is a quality line
    if (line.match(/^\s{8}\* [^\s]+ - \[\[model\]/)) {
        const match = line.match(/^\s{8}\* ([^\s]+) - \[\[model\]\(([^)]+)\)\] \[\[config\]\(([^)]+)\)\]/);
        if (match && currentLanguage && currentVoice) {
            const quality = match[1].trim();
            const modelUrl = match[2].trim();
            const configUrl = match[3].trim();
            
            voices[currentLanguage][currentVoice][quality] = {
                model: modelUrl,
                config: configUrl
            };
        }
    }
}

// Write the result to a JSON file
const outputFilePath = path.join(__dirname, '..', 'voices', 'voices.json');
fs.writeFileSync(outputFilePath, JSON.stringify(voices, null, 2), 'utf8');

console.log(`Successfully created ${outputFilePath}`);