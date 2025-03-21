import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';

let piperProcess: ReturnType<typeof spawn> | undefined;
let playerProcess: ReturnType<typeof spawn> | undefined;

function getAvailableVoices(context: vscode.ExtensionContext): string[] {
    const parentDir = path.resolve(context.extensionUri.fsPath, '..');
    const voicesDir = path.join(parentDir, 'voices');
    
    try {
        const files = fs.readdirSync(voicesDir);
        return files
            .filter(file => file.endsWith('.onnx'))
            .map(file => path.basename(file, '.onnx'));
    } catch (error) {
        console.error('Error reading voices directory:', error);
        return [];
    }
}

function getVoiceLabel(voice: string): string {
    // Convert the voice ID to a more readable format
    const parts = voice.split('-');
    const locale = parts[0].replace('_', ' ');
    const name = parts[1].replace(/_/g, ' ');
    const quality = parts[2] || '';
    return `${locale} - ${name} (${quality})`;
}

async function selectVoice(context: vscode.ExtensionContext) {
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
        await vscode.workspace.getConfiguration('piper-tts').update(
            'voice',
            selection.description,
            vscode.ConfigurationTarget.Global
        );
    }
}

function getPiperPath(context: vscode.ExtensionContext): string {
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
    } catch (error) {
        console.error('Error reading parent directory:', error);
    }

    let piperPath: string;
    switch (platform) {
        case 'win32':
            piperPath = path.join(parentDir, 'piper/windows_amd64', 'piper.exe');
            break;
        case 'darwin':
            if (arch === 'arm64') {
                piperPath = path.join(parentDir, 'piper/macos_aarch64', 'piper');
            } else {
                piperPath = path.join(parentDir, 'piper/macos_x64', 'piper');
            }
            break;
        case 'linux':
            if (arch === 'arm64') {
                piperPath = path.join(parentDir, 'piper/linux_aarch64', 'piper');
            } else if (arch === 'arm') {
                piperPath = path.join(parentDir, 'piper/linux_armv7l', 'piper');
            } else {
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

function getVoicePath(context: vscode.ExtensionContext): string {
    const config = vscode.workspace.getConfiguration('piper-tts');
    const selectedVoice = config.get<string>('voice') || 'en_US-hfc_female-medium';
    
    const parentDir = path.resolve(context.extensionUri.fsPath, '..');
    const voicePath = path.join(parentDir, 'voices', `${selectedVoice}.onnx`);
    console.log('Voice path:', voicePath);
    console.log('Voice exists:', fs.existsSync(voicePath));
    return voicePath;
}

function getPlaybackCommand(): { command: string, args: string[] } {
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
            ]};
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
    if (playerProcess) {
        playerProcess.kill();
        playerProcess = undefined;
    }
}

export function activate(context: vscode.ExtensionContext) {
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
            const piper = spawn(piperPath, ['--model', voicePath, '--output-raw'], {
                cwd: path.dirname(piperPath),
                env: { ...process.env },
                windowsHide: false
            });
            piperProcess = piper;

            // Log process info
            console.log('Piper process:', piper.pid);
            console.log('Piper working directory:', path.dirname(piperPath));
// Create playback process
const player = spawn(playback.command, playback.args);
playerProcess = player;


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
                playerProcess = undefined;
            });

        } catch (error) {
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

export function deactivate() {
    stopCurrentPlayback();
}
