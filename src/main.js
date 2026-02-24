// src/main.js
// Bootstrapper and Event Listener setup
import { state } from './state.js';
import * as ui from './ui.js';
import * as cmd from './cmd.js';
import * as api from './api.js';

const commandInput = document.getElementById('command-input');

async function bootSystem() {
    ui.updateStatusBar('Booting...');
    ui.printSystem("Booting LOXOS v2.0...");

    // Slight delay for effect
    await new Promise(r => setTimeout(r, 600));

    if (state.sessionToken) {
        ui.printSystem("Active session token detected. Verifying...");

        try {
            // Implicit verification by fetching projects
            ui.updateStatusBar('Verifying Token');
            state.currentUser = state.sessionToken; // Optimistically set
            const success = await api.fetchProjects();

            if (success) {
                ui.printSuccess("Session Validated. Resuming connection...");
                ui.printLine("");
                cmd.onLoginSuccess(state.sessionToken);
            } else {
                throw new Error("Invalid session data");
            }
        } catch (e) {
            ui.printWarning("Session expired or invalid. Please log in again.");
            ui.printLine("");
            state.logout();
            cmd.startLoginFlow();
        }
    } else {
        ui.printWarning("System locked. User authentication required.");
        ui.printLine("");
        cmd.startLoginFlow();
    }
}

// Setup Event Listeners
function setupEvents() {
    // Focus input when clicking anywhere on the terminal body
    document.getElementById('terminal-body').addEventListener('click', () => {
        const selection = window.getSelection();
        if (selection.toString().length === 0) {
            ui.focusInput();
        }
    });

    // Handle typing events
    commandInput.addEventListener('keydown', async function (e) {
        if (e.key === 'Enter') {
            const val = this.value;
            this.value = '';
            ui.hideSuggestions();
            await cmd.processCommand(val);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.value = cmd.handleTabCompletion(this.value);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.history.length > 0 && state.historyIndex > 0) {
                state.historyIndex--;
                this.value = state.history[state.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.history.length > 0 && state.historyIndex < state.history.length - 1) {
                state.historyIndex++;
                this.value = state.history[state.historyIndex];
            } else {
                state.historyIndex = state.history.length;
                this.value = '';
            }
        }
    });

    // Handle auto-suggestions on input change
    commandInput.addEventListener('input', function (e) {
        const val = this.value;
        if (!state.isLoggingIn && !state.isAdding && val.trim().length > 0) {
            const suggestions = cmd.getSuggestions(val);
            ui.showSuggestions(suggestions);
        } else {
            ui.hideSuggestions();
        }
    });
}

// Initialize on DOM Load
window.onload = () => {
    setupEvents();
    ui.focusInput();
    bootSystem();
};
