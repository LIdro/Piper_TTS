"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
let piperProcess;
function getAvailableVoices(context) {
    const parentDir = path.resolve(context.extensionUri.fsPath, '..');
    const voicesDir = path.join(parentDir, 'voices');
    try {
        const files = fs.readdirSync(voicesDir);
        return files
            .filter(file => file.endsWith('.onnx'))
            .map(file => path.basename(file, '.onnx'));
    }
    catch (error) {
        console.error('Error reading voices directory:', error);
        return [];
    }
}
function getVoiceLabel(voice) {
    // Convert the voice ID to a more readable format
    const parts = voice.split('-');
    const locale = parts[0].replace('_', ' ');
    const name = parts[1].replace(/_/g, ' ');
    const quality = parts[2] || '';
    return `${locale} - ${name} (${quality})`;
}
async function selectVoice(context) {
    const voices = getAvailableVoices(context);
    if (voices.length === 0) {
        vscode.window.showErrorMessage('No voice models found in the voices directory');
        return;
    }
    const items = voices.map(voice => ({
        label: getVoiceLabel(voice),
        description: voice,
    }));
    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a voice for text-to-speech',
    });
    if (selection) {
        await vscode.workspace.getConfiguration('piper-tts').update('voice', selection.description, vscode.ConfigurationTarget.Global);
    }
}
function getPiperPath(context) {
    const platform = os.platform();
    const arch = os.arch();
    // Get absolute path to extension directory
    const extensionPath = context.extensionUri.fsPath;
    console.log('Extension path:', extensionPath);
    // Get parent directory
    const parentDir = path.resolve(extensionPath, '..');
    console.log('Parent directory:', parentDir);
    // List files in parent directory for debugging
    try {
        const files = fs.readdirSync(parentDir);
        console.log('Files in parent directory:', files);
    }
    catch (error) {
        console.error('Error reading parent directory:', error);
    }
    let piperPath;
    switch (platform) {
        case 'win32':
            piperPath = path.join(parentDir, 'piper/windows_amd64', 'piper.exe');
            break;
        case 'darwin':
            if (arch === 'arm64') {
                piperPath = path.join(parentDir, 'piper/macos_aarch64', 'piper');
            }
            else {
                piperPath = path.join(parentDir, 'piper/macos_x64', 'piper');
            }
            break;
        case 'linux':
            if (arch === 'arm64') {
                piperPath = path.join(parentDir, 'piper/linux_aarch64', 'piper');
            }
            else if (arch === 'arm') {
                piperPath = path.join(parentDir, 'piper/linux_armv7l', 'piper');
            }
            else {
                piperPath = path.join(parentDir, 'piper/linux_x86_64', 'piper');
            }
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
    console.log('Full Piper path:', piperPath);
    console.log('Path exists:', fs.existsSync(piperPath));
    return piperPath;
}
function getVoicePath(context) {
    const config = vscode.workspace.getConfiguration('piper-tts');
    const selectedVoice = config.get('voice') || 'en_US-hfc_female-medium';
    const parentDir = path.resolve(context.extensionUri.fsPath, '..');
    const voicePath = path.join(parentDir, 'voices', `${selectedVoice}.onnx`);
    console.log('Voice path:', voicePath);
    console.log('Voice exists:', fs.existsSync(voicePath));
    return voicePath;
}
function getPlaybackCommand() {
    const platform = os.platform();
    switch (platform) {
        case 'win32':
            return { command: 'play', args: [
                    '-t', 'raw',
                    '-r', '22050',
                    '-b', '16',
                    '-e', 'signed',
                    '-c', '1',
                    '-L',
                    '-',
                    'remix', '1'
                ] };
        case 'darwin':
            return { command: 'afplay', args: ['-'] };
        case 'linux':
            return { command: 'aplay', args: ['-r', '22050', '-f', 'S16_LE', '-t', 'raw', '-'] };
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
function stopCurrentPlayback() {
    if (piperProcess) {
        piperProcess.kill();
        piperProcess = undefined;
    }
}
function activate(context) {
    console.log('Piper TTS extension is now active!');
    console.log('Extension path:', context.extensionUri.fsPath);
    console.log('OS platform:', os.platform());
    console.log('OS architecture:', os.arch());
    // Register the voice selection command
    let selectVoiceDisposable = vscode.commands.registerCommand('piper-tts.selectVoice', () => {
        selectVoice(context);
    });
    context.subscriptions.push(selectVoiceDisposable);
    const disposable = vscode.commands.registerCommand('piper-tts.readAloud', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) {
                vscode.window.showInformationMessage('Please select some text to read aloud');
                return;
            }
            // Stop any current playback
            stopCurrentPlayback();
            const piperPath = getPiperPath(context);
            const voicePath = getVoicePath(context);
            // Verify file existence
            if (!fs.existsSync(piperPath)) {
                throw new Error(`Piper executable not found at: ${piperPath}`);
            }
            if (!fs.existsSync(voicePath)) {
                throw new Error(`Voice model not found at: ${voicePath}`);
            }
            const playback = getPlaybackCommand();
            // Create piper process with full path
            const piper = (0, child_process_1.spawn)(piperPath, ['--model', voicePath, '--output-raw'], {
                cwd: path.dirname(piperPath),
                env: { ...process.env },
                windowsHide: false
            });
            piperProcess = piper;
            // Log process info
            console.log('Piper process:', piper.pid);
            console.log('Piper working directory:', path.dirname(piperPath));
            // Create playback process
            const player = (0, child_process_1.spawn)(playback.command, playback.args);
            // Handle process output for debugging
            piper.stdout.on('data', (data) => {
                console.log('Piper output:', data.toString());
            });
            piper.stderr.on('data', (data) => {
                console.error('Piper error output:', data.toString());
            });
            player.stdout.on('data', (data) => {
                console.log('Player output:', data.toString());
            });
            player.stderr.on('data', (data) => {
                console.error('Player error output:', data.toString());
            });
            // Pipe the text through piper and to the playback command
            piper.stdout.pipe(player.stdin);
            piper.stdin.write(text);
            piper.stdin.end();
            // Handle errors
            piper.on('error', (error) => {
                console.error('Piper error:', error);
                vscode.window.showErrorMessage('Error running text-to-speech: ' + error.message);
            });
            player.on('error', (error) => {
                console.error('Playback error:', error);
                vscode.window.showErrorMessage('Error playing audio: ' + error.message);
            });
            // Clean up processes
            piper.on('close', (code) => {
                console.log('Piper process exited with code:', code);
                piperProcess = undefined;
            });
            player.on('close', (code) => {
                console.log('Player process exited with code:', code);
            });
        }
        catch (error) {
            console.error('Error:', error);
            vscode.window.showErrorMessage('Error running text-to-speech: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
    context.subscriptions.push(disposable);
    // Register a command to stop playback
    const stopDisposable = vscode.commands.registerCommand('piper-tts.stopPlayback', () => {
        stopCurrentPlayback();
    });
    context.subscriptions.push(stopDisposable);
}
function deactivate() {
    stopCurrentPlayback();
}
//# sourceMappingURL=extension.js.map