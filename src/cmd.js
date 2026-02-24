// src/cmd.js
// Command parser and execution logic
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';

const COMMANDS = [
    { cmd: 'help', desc: 'Show available commands' },
    { cmd: 'list', desc: 'Show projects as a table', aliases: ['ls'] },
    { cmd: 'grid', desc: 'Show projects as a visual grid' },
    { cmd: 'add', desc: 'Add a new project to tracker' },
    { cmd: 'delete', desc: 'Delete project by ID', aliases: ['del', 'rm'] },
    { cmd: 'clear', desc: 'Clear terminal output' },
    { cmd: 'about', desc: 'System info' },
    { cmd: 'logout', desc: 'End session securely', aliases: ['exit'] }
];

export function handleTabCompletion(currentInput) {
    if (!currentInput) return currentInput;

    const input = currentInput.toLowerCase();
    const matches = COMMANDS.filter(c => c.cmd.startsWith(input));

    if (matches.length === 1) {
        return matches[0].cmd + ' ';
    }
    return currentInput;
}

export function getSuggestions(currentInput) {
    if (!currentInput) return [];

    const input = currentInput.toLowerCase();
    // Only suggest root commands, not arguments yet
    if (input.includes(' ')) return [];

    return COMMANDS.filter(c => c.cmd.startsWith(input) || (c.aliases && c.aliases.some(a => a.startsWith(input))));
}

export async function processCommand(rawCmd) {
    const cmd = rawCmd.trim();
    ui.hideSuggestions();

    if (state.isLoggingIn) {
        await handleLoginProcess(cmd);
        return;
    }

    if (state.isAdding) {
        await handleAddingProcess(cmd);
        return;
    }

    if (cmd !== '') {
        ui.printLine(`<span class="prompt">${state.currentUser}@loxnft:~$</span> ${cmd}`, 'system');
        state.addHistory(cmd);
    } else {
        return;
    }

    const args = cmd.split(' ');
    const command = args[0].toLowerCase();

    switch (command) {
        case 'help':
            ui.printLine('Available commands:');
            COMMANDS.forEach(c => {
                let aliasStr = c.aliases ? ` (alias: ${c.aliases.join(', ')})` : '';
                ui.printLine(`  <span class="info" style="display:inline-block; width:80px;">${c.cmd}</span> - ${c.desc}${aliasStr}`);
            });
            break;

        case 'list':
        case 'ls':
            ui.printSystem('Loading database list...');
            setTimeout(() => { ui.renderTable(state.projects); }, 150);
            break;

        case 'grid':
            ui.printSystem('Opening grid protocol...');
            setTimeout(() => { ui.renderGrid(state.projects); }, 150);
            break;

        case 'add':
            state.isAdding = true;
            state.addStep = 0;
            // Generate temporary ID
            state.newProject = { id: state.projects.length > 0 ? Math.max(...state.projects.map(p => p.id)) + 1 : 1 };

            ui.printLine('--- ADDING NEW PROJECT ---', 'warning');
            ui.printInfo('Enter Project Name:');
            ui.setPrompt('Project Name >');
            break;

        case 'delete':
        case 'del':
        case 'rm':
            if (args.length < 2) {
                ui.printError('Missing ID. Usage: delete [id]');
            } else {
                // The user sees indices 1, 2, 3...
                // So index 1 corresponds to state.projects[0]
                const displayId = parseInt(args[1]);
                const index = displayId - 1;

                if (index >= 0 && index < state.projects.length) {
                    const projectToDelete = state.projects[index];
                    const targetId = projectToDelete.id; // Get the real DB ID
                    const deletedName = projectToDelete.name;

                    // Optimistic UI update
                    state.projects.splice(index, 1);
                    ui.updateStatusBar();

                    try {
                        const data = await api.deleteProjectApi(targetId);
                        if (data.success) {
                            ui.printSuccess(`Deleted '${deletedName}' from tracking list.`);
                            ui.showToast(`Deleted ${deletedName}`, 'success');
                        } else {
                            ui.printError(`Backend error: ${data.error}`);
                            // Rollback? (omitted for simplicity, assume backend is truth)
                        }
                    } catch (e) {
                        ui.printError('Failed to delete on server. Check connection.');
                    }
                } else {
                    ui.printError(`Project with ID ${displayId} not found.`);
                }
            }
            break;

        case 'clear':
            ui.clearTerminal();
            break;

        case 'about':
            ui.printLine('LOXNFT Tracker v2.0', 'info');
            ui.printLine('Cyber-Professional Edition. Track your upcoming mints, whitelist status, and more.');
            break;

        case 'logout':
        case 'exit':
            ui.printWarning('Logging out securely...');
            state.logout();
            ui.updateStatusBar('Locked');
            setTimeout(() => {
                ui.clearTerminal();
                startLoginFlow();
            }, 800);
            break;

        default:
            ui.printError(`Command not found: ${command}. Type 'help' for available commands.`);
    }
}

export function startLoginFlow() {
    state.resetLoginState();
    ui.printInfo("Enter Username:");
    ui.setPrompt("USERNAME >");
    ui.setInputType("text");
}

async function handleLoginProcess(cmd) {
    const value = cmd.trim();

    if (state.loginStep === 0) {
        ui.printSystem(`<span class="prompt" style="color: var(--accent-blue)">input:</span> ${value}`);
        if (!value) { ui.printError('Username cannot be empty.'); return; }

        state.tempUsername = value.toLowerCase();
        state.loginStep++;

        ui.printInfo("Enter Password:");
        ui.setPrompt("PASSWORD >");
        ui.setInputType("password");

    } else if (state.loginStep === 1) {
        ui.printSystem(`<span class="prompt" style="color: var(--accent-blue)">input:</span> ********`);

        const password = value;
        if (!password) { ui.printError('Password cannot be empty.'); return; }

        try {
            ui.updateStatusBar('Authenticating...');
            const data = await api.loginApi(state.tempUsername, password, 'login');

            if (data.success) {
                ui.setInputType("text");
                onLoginSuccess(state.tempUsername);
            } else if (data.error === 'User not found') {
                // New user flow
                state.tempPassword = password;
                state.loginStep++;
                ui.printWarning(`New user. Please confirm password for '${state.tempUsername}':`);
                ui.setPrompt("CONFIRM >");
            } else {
                ui.setInputType("text");
                ui.printError(data.error);
                startLoginFlow();
            }
        } catch (err) {
            ui.setInputType("text");
            ui.printError("Could not connect to authentication server.");
            startLoginFlow();
        }

    } else if (state.loginStep === 2) {
        ui.printSystem(`<span class="prompt" style="color: var(--accent-blue)">input:</span> ********`);
        ui.setInputType("text");

        const confirmPass = value;
        if (confirmPass === state.tempPassword) {
            ui.printSystem("Registering new account securely...");
            try {
                const data = await api.loginApi(state.tempUsername, state.tempPassword, 'register');
                if (data.success) {
                    ui.printWarning(`[SYSTEM] New account registered for ${state.tempUsername}.`);
                    onLoginSuccess(state.tempUsername);
                } else {
                    ui.printError(`Registration failed: ${data.error}`);
                    startLoginFlow();
                }
            } catch (err) {
                ui.printError("Registration server unreachable.");
                startLoginFlow();
            }
        } else {
            ui.printError("Passwords do not match. Registration aborted.");
            startLoginFlow();
        }
    }
}

export async function onLoginSuccess(username) {
    state.login(username);

    ui.printSuccess(`Authentication successful. Welcome, ${username}.`);
    ui.updateStatusBar('Connected');
    ui.showToast(`Logged in as ${username}`, 'success');

    ui.printSystem(`Connecting to Secure Cloud Database...`);

    const success = await api.fetchProjects();

    if (success) {
        ui.printSystem(`Loaded ${state.projects.length} tracked projects from the cloud.`);
        ui.updateStatusBar('Online');
    } else {
        ui.printError("Failed to parse cloud data. Starting empty/offline mode.");
        ui.updateStatusBar('Offline Mode');
    }

    const asciiArt = `
  _      ______   ___   _ ______ _______ 
 | |    / __ \\ \\ / / \\ | |  ____|__   __|
 | |   | |  | \\ V /|  \\| | |__     | |   
 | |   | |  | |> < | . \` |  __|    | |   
 | |___| |__| / . \\| |\\  | |       | |   
 |______\\____/_/ \\_\\_| \\_|_|       |_|   
 
   >> OS: LOXOS v2.0 <<
   >> USER: ${username.toUpperCase()} <<
   >> Type 'help' to begin <<`;

    ui.printASCII(asciiArt);
    ui.setPrompt(`${state.currentUser}@loxnft:~$`);
}

async function handleAddingProcess(cmd) {
    const value = cmd.trim();
    ui.printSystem(`<span class="prompt" style="color: var(--accent-blue)">input:</span> ${value}`);

    switch (state.addStep) {
        case 0:
            if (!value) { ui.printError('Name cannot be empty.'); return; }
            state.newProject.name = value;
            state.addStep++;
            ui.printInfo('Enter Twitter Handle (e.g. @project):');
            ui.setPrompt('Twitter >');
            break;
        case 1:
            state.newProject.twitter = value || 'N/A';
            state.addStep++;
            ui.printInfo('Enter Mint Type (e.g. Freemint, Paid, TBA):');
            ui.setPrompt('Mint Type >');
            break;
        case 2:
            state.newProject.type = value || 'TBA';
            state.addStep++;
            ui.printInfo('Enter Mint Date (e.g. Q3 2024, May 15, TBA):');
            ui.setPrompt('Mint Date >');
            break;
        case 3:
            state.newProject.date = value || 'TBA';
            state.addStep++;
            ui.printInfo('Enter Status (e.g. Grinding, WL Secured, Watching):');
            ui.setPrompt('Status >');
            break;
        case 4:
            state.newProject.status = value || 'Watching';
            ui.printSystem("Uploading to secure cloud storage...");

            try {
                const data = await api.addProjectApi(state.newProject);
                if (data.success) {
                    state.projects.push(data.project); // Has real DB ID
                    ui.printSuccess(`Project ${state.newProject.name} added to your tracker!`);
                    ui.showToast('Project created successfully', 'success');
                } else {
                    ui.printError(`Failed to save to cloud: ${data.error}`);
                }
            } catch (err) {
                ui.printError("Network error. Project not saved.");
            }

            // Reset state
            state.resetAddState();
            ui.updateStatusBar('Online');
            ui.setPrompt(`${state.currentUser}@loxnft:~$`);
            break;
    }
}
