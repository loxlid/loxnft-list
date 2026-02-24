// src/ui.js
// Handles all DOM manipulation and UI rendering
import { state } from './state.js';

const outputDiv = document.getElementById('output');
const statusBar = {
    message: document.getElementById('status-message'),
    user: document.getElementById('status-user'),
    projectsCount: document.getElementById('status-projects-count'),
    connection: document.getElementById('connection-indicator')
};
const suggestionBox = document.getElementById('suggestion-box');
const inputContainer = document.getElementById('input-container');
const toastContainer = document.getElementById('toast-container');
const promptText = document.getElementById('prompt-text');
const commandInput = document.getElementById('command-input');

export function scrollToBottom() {
    // using requestAnimationFrame ensures DOM has updated
    requestAnimationFrame(() => {
        const terminalBody = document.getElementById('terminal-body');
        terminalBody.scrollTop = terminalBody.scrollHeight;
        // Mobile fallback
        inputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
}

export function printLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.innerHTML = text;
    outputDiv.appendChild(line);
    scrollToBottom();
}

export function printSystem(text) { printLine(text, 'system'); }
export function printInfo(text) { printLine(text, 'info'); }
export function printSuccess(text) { printLine(text, 'success'); }
export function printWarning(text) { printLine(text, 'warning'); }
export function printError(text) { printLine(`[ERROR] ${text}`, 'error'); }

export function printASCII(art) {
    printLine(`<pre class="ascii-art">${art}</pre>`);
}

export function clearTerminal() {
    outputDiv.innerHTML = '';
}

export function setPrompt(text) {
    promptText.innerHTML = text;
}

export function setInputType(type) {
    commandInput.type = type;
}

export function getInputValue() {
    return commandInput.value;
}

export function setInputValue(val) {
    commandInput.value = val;
}

export function focusInput() {
    commandInput.focus();
}

export function updateStatusBar(message = '') {
    if (message) statusBar.message.innerText = message;

    if (state.currentUser) {
        statusBar.user.innerText = state.currentUser;
        statusBar.projectsCount.innerText = `[${state.projects.length}] Projects`;
    } else {
        statusBar.user.innerText = 'guest';
        statusBar.projectsCount.innerText = '[0] Projects';
    }
}

export function updateConnectionStatus(status) {
    if (status === 'online') {
        statusBar.connection.className = 'indicator online';
    } else if (status === 'offline') {
        statusBar.connection.className = 'indicator offline';
        showToast('Connection Lost', 'error');
    } else {
        statusBar.connection.className = 'indicator'; // neutral
    }
}

export function renderTable(projects) {
    if (!projects || projects.length === 0) {
        printLine("<span class='warning'>No projects tracked. Type 'add' to insert a new one.</span>");
        return;
    }

    let html = `<div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>PROJECT</th>
                    <th>TWITTER</th>
                    <th>TYPE</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                </tr>
            </thead>
            <tbody>`;

    projects.forEach((p, index) => {
        let statusStyle = p.status.toLowerCase().includes('wl') ? 'color: var(--accent-green); text-shadow: var(--glow-green);'
            : (p.status.toLowerCase().includes('grind') ? 'color: var(--accent-amber);'
                : 'color: var(--text-secondary);');

        let displayId = index + 1; // Always show sequential ID
        html += `
            <tr>
                <td style="color: var(--text-secondary);">#${displayId}</td>
                <td style="color: var(--text-primary); font-weight: 500;">${p.name}</td>
                <td style="color: var(--accent-blue);">${p.twitter}</td>
                <td><span class="card-tag">${p.type}</span></td>
                <td style="color: #aaa;">${p.mint_date || p.date || 'TBA'}</td>
                <td style="font-weight: 600; ${statusStyle}">[${p.status}]</td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    printLine(html);
}

export function renderGrid(projects) {
    if (!projects || projects.length === 0) {
        printLine("<span class='warning'>No projects tracked. Type 'add' to insert a new one.</span>");
        return;
    }

    let html = '<div class="nft-grid">';
    projects.forEach((p, index) => {
        let statusStyle = p.status.toLowerCase().includes('wl') ? 'color: var(--accent-green);'
            : (p.status.toLowerCase().includes('grind') ? 'color: var(--accent-amber);'
                : 'color: var(--text-secondary);');

        let displayId = index + 1; // Always show sequential ID

        html += `
            <div class="nft-card">
                <div class="card-header">
                    <span class="card-title">${p.name}</span>
                    <span class="card-id">#${displayId}</span>
                </div>
                <div style="color: var(--accent-blue); margin-bottom: 12px; font-size: 0.9em;">${p.twitter}</div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    <span class="card-tag" style="background: rgba(0, 229, 255, 0.1); color: var(--accent-blue);">${p.type}</span>
                    <span class="card-tag" style="background: rgba(255, 255, 255, 0.05);">${p.mint_date || p.date || 'TBA'}</span>
                </div>
                
                <div style="font-weight: 600; font-size: 0.9em; ${statusStyle}">Status: [${p.status.toUpperCase()}]</div>
            </div>`;
    });
    html += '</div>';
    printLine(html);
}

export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        hideSuggestions();
        return;
    }

    let html = '';
    suggestions.forEach(s => {
        html += `<div class="suggestion-item"><span class="cmd-name">${s.cmd}</span> <span style="color: #666;">- ${s.desc}</span></div>`;
    });

    suggestionBox.innerHTML = html;
    suggestionBox.classList.remove('hidden');
}

export function hideSuggestions() {
    suggestionBox.classList.add('hidden');
}
