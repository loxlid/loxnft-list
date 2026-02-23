const outputDiv = document.getElementById('output');
const commandInput = document.getElementById('command-input');
const inputLine = document.getElementById('input-line');
const promptSpan = document.querySelector('.prompt');

let projects = [];
let currentUser = null;

// State management
let isLoggingIn = true;
let loginStep = 0;
let tempUsername = '';
let tempPassword = '';

let isAdding = false;
let addStep = 0;
let newProject = {};

// Local Storage Databases
// ONLY session token is kept locally now. Data is fetched from API.
let activeSession = localStorage.getItem('loxnft_session') || null;

const asciiArt = `
  _      ______   ___   _ ______ _______ 
 | |    / __ \\ \\ / / \\ | |  ____|__   __|
 | |   | |  | \\ V /|  \\| | |__     | |   
 | |   | |  | |> < | . \` |  __|    | |   
 | |___| |__| / . \\| |\\  | |       | |   
 |______\\____/_/ \\_\\_| \\_|_|       |_|   
                                                
   >> LOXNFT Grind Tracker Terminal <<
   >> Type 'help' to see available commands <<
`;

function println(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.innerHTML = text;
    outputDiv.appendChild(line);
    scrollToBottom();
}

function scrollToBottom() {
    outputDiv.scrollTop = outputDiv.scrollHeight;
    // ensure the input is always visible if the mobile keyboard pops up
    setTimeout(() => {
        document.getElementById('input-line').scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
}

function renderNFTGrid() {
    if (projects.length === 0) return "<span class='warning'>No projects tracked. Type 'add' to insert a new one.</span>";

    let html = '<div class="nft-grid">';
    projects.forEach(p => {
        let statusColor = p.status.includes('WL') ? 'color: #39ff14;' : (p.status.includes('Grinding') ? 'color: #ffb000;' : 'color: #888;');
        html += `
            <div class="nft-item">
                <div class="nft-title">${p.name}</div>
                <div class="info" style="margin-bottom: 5px;">${p.twitter}</div>
                <div style="font-size: 0.9em; margin-bottom: 3px;">Type: <span style="color: #00ffff">${p.type}</span></div>
                <div style="font-size: 0.9em; margin-bottom: 3px;">Date: <span>${p.date}</span></div>
                <div style="font-size: 0.9em; margin-top: 10px; ${statusColor}">Status: [${p.status.toUpperCase()}]</div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function renderNFTTable() {
    if (projects.length === 0) return "<span class='warning'>No projects tracked. Type 'add' to insert a new one.</span>";

    let table = `<table style="width:100%; text-align:left; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; font-size: 0.95em;">
        <tr style="border-bottom: 1px dashed var(--text-color); color: var(--accent-color);">
            <th style="padding: 5px;">ID</th>
            <th style="padding: 5px;">PROJECT</th>
            <th style="padding: 5px;">TWITTER</th>
            <th style="padding: 5px;">MINT TYPE</th>
            <th style="padding: 5px;">DATE</th>
            <th style="padding: 5px;">STATUS</th>
        </tr>`;
    projects.forEach(p => {
        let statusColor = p.status.includes('WL') ? '#39ff14' : (p.status.includes('Grinding') ? '#ffb000' : '#888');
        table += `
        <tr>
            <td style="padding: 5px;">#${p.id}</td>
            <td style="padding: 5px; color: #fff;">${p.name}</td>
            <td style="padding: 5px; color: #00ffff;">${p.twitter}</td>
            <td style="padding: 5px;">${p.type}</td>
            <td style="padding: 5px; color: #aaa;">${p.mint_date || p.date}</td>
            <td style="padding: 5px; color: ${statusColor}; font-weight: bold;">[${p.status}]</td>
        </tr>`;
    });
    table += `</table>`;
    return table;
}

async function typeText(text, className = '', speed = 20) {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    outputDiv.appendChild(line);

    for (let i = 0; i < text.length; i++) {
        line.innerHTML += text.charAt(i);
        scrollToBottom();
        await new Promise(r => setTimeout(r, speed));
    }
}

async function initTerminal() {
    await typeText("Booting LOXOS v1.0...", "system", 30);

    // Auto-login check
    if (activeSession) {
        await typeText("Active session detected. Verifying...", "system", 30);

        try {
            // Ping database to implicitly verify
            const res = await fetch(`/api/get-projects?username=${activeSession}`);
            if (res.ok) {
                await typeText("Session Validated. Resuming connection...", "success", 10);
                println("");
                loginSuccess(activeSession);
            } else {
                localStorage.removeItem('loxnft_session');
                throw new Error("Invalid session");
            }
        } catch (e) {
            await typeText("Session expired. Please log in again.", "warning", 30);
            println("");
            startLoginFlow();
        }
    } else {
        await typeText("System locked. User authentication required.", "warning", 30);
        println("");
        startLoginFlow();
    }
}

function startLoginFlow() {
    isLoggingIn = true;
    loginStep = 0;
    println("Enter Username:", "info");
    promptSpan.innerHTML = "USERNAME >";
}

function handleLoginProcess(cmd) {
    const value = cmd.trim();

    if (loginStep === 0) {
        println(`<span class="prompt" style="color: #00ffff">input:</span> ${value}`, 'system');
        if (!value) { println('Username cannot be empty.', 'error'); return; }

        tempUsername = value.toLowerCase();
        loginStep++;
        println("Enter Password:", "info");
        promptSpan.innerHTML = "PASSWORD >";
        commandInput.type = "password"; // hide password input
    } else if (loginStep === 1) {
        println(`<span class="prompt" style="color: #00ffff">input:</span> ********`, 'system');

        const password = value;
        if (!password) {
            println('Password cannot be empty.', 'error');
            return;
        }

        // Try to login first
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: tempUsername, password: password, action: 'login' })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    commandInput.type = "text";
                    loginSuccess(tempUsername);
                } else if (data.error === 'User not found') {
                    // New user! Need confirmation
                    tempPassword = password;
                    loginStep++;
                    println(`New user. Please confirm password for '${tempUsername}':`, "warning");
                    promptSpan.innerHTML = "CONFIRM >";
                } else {
                    commandInput.type = "text";
                    println(`ERROR: ${data.error}`, "error");
                    startLoginFlow();
                }
            })
            .catch(err => {
                commandInput.type = "text";
                println("ERROR: Could not connect to authentication server.", "error");
                startLoginFlow();
            });

    } else if (loginStep === 2) {
        println(`<span class="prompt" style="color: #00ffff">input:</span> ********`, 'system');
        commandInput.type = "text"; // restore text input

        const confirmPass = value;
        if (confirmPass === tempPassword) {
            println("Registering new account securely...", "system");

            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: tempUsername, password: tempPassword, action: 'register' })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        println(`[SYSTEM] New account registered for ${tempUsername}.`, "warning");
                        loginSuccess(tempUsername);
                    } else {
                        println(`ERROR: Registration failed.`, "error");
                        startLoginFlow();
                    }
                });
        } else {
            println("ERROR: Passwords do not match. Registration aborted.", "error");
            startLoginFlow();
        }
    }
}

async function loginSuccess(username) {
    currentUser = username;
    isLoggingIn = false;

    // Set persistent session
    localStorage.setItem('loxnft_session', username);

    println(`Authentication successful. Welcome, ${username}.`, "success");
    await typeText(`Connecting to Secure Cloud Database...`, "system", 20);

    try {
        const res = await fetch(`/api/get-projects?username=${username}`);
        const data = await res.json();

        if (data.success) {
            projects = data.projects;
            await typeText(`Loaded ${projects.length} tracked projects from the cloud.`, "system", 20);
        } else {
            projects = [];
            println("Failed to parse cloud data. Starting empty.", "error");
        }
    } catch (e) {
        projects = [];
        println("Error connecting to database. Starting offline mode.", "error");
    }

    println(`<pre class="info" style="font-size: 0.8em; line-height: 1.2;">${asciiArt}</pre>`);
    promptSpan.innerHTML = `${currentUser}@loxnft:~$`;
}

function processCommand(cmd) {
    if (isLoggingIn) {
        handleLoginProcess(cmd);
        return;
    }

    if (isAdding) {
        handleAddingProcess(cmd);
        return;
    }

    const args = cmd.trim().split(' ');
    const command = args[0].toLowerCase();

    if (cmd.trim() !== '') {
        println(`<span class="prompt">${currentUser}@loxnft:~$</span> ${cmd}`, 'system');
    }

    switch (command) {
        case 'help':
            println('Available commands:');
            println('  <span class="info">list</span>    - Show tracked projects as table');
            println('  <span class="info">grid</span>    - Show tracked projects as grid');
            println('  <span class="info">add</span>     - Add a new project to your list');
            println('  <span class="info">delete</span>  - Delete a project by ID (e.g. delete 2)');
            println('  <span class="info">logout</span>  - Logout from current account');
            println('  <span class="info">clear</span>   - clear terminal output');
            println('  <span class="info">about</span>   - Info about this terminal');
            break;
        case 'list':
        case 'ls':
            println('Loading database list...', 'system');
            setTimeout(() => { println(renderNFTTable()); }, 300);
            break;
        case 'grid':
            println('Opening grid protocol...', 'system');
            setTimeout(() => { println(renderNFTGrid()); }, 300);
            break;
        case 'add':
            isAdding = true;
            addStep = 0;
            newProject = { id: projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1 };
            println('--- ADDING NEW PROJECT ---', 'warning');
            println('Enter Project Name:', 'info');
            promptSpan.innerHTML = 'Project Name >';
            break;
        case 'delete':
        case 'del':
        case 'rm':
            if (args.length < 2) {
                println('Error: Missing ID. Usage: delete [id]', 'error');
            } else {
                const targetId = parseInt(args[1]);
                const index = projects.findIndex(p => p.id === targetId);

                if (index !== -1) {
                    const deletedName = projects[index].name;
                    projects.splice(index, 1);

                    // Backend delete
                    fetch('/api/delete-project', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: targetId, username: currentUser })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            println(`[SUCCESS] Deleted ${deletedName} from tracking list.`, 'success');
                        } else {
                            println(`[ERROR] Partially deleted locally, backend error: ${data.error}`, 'error');
                        }
                    });

                } else {
                    println(`Error: Project with ID ${targetId} not found.`, 'error');
                }
            }
            break;
        case 'logout':
        case 'exit':
            currentUser = null;
            projects = [];
            localStorage.removeItem('loxnft_session'); // Clear persistent session
            println('Logging out...', 'warning');
            setTimeout(() => {
                outputDiv.innerHTML = '';
                startLoginFlow();
            }, 1000);
            break;
        case 'clear':
            outputDiv.innerHTML = '';
            break;
        case 'about':
            println('LOXNFT Tracker v1.1');
            println('Track your upcoming mints, whitelist status, and more.');
            break;
        case '':
            break;
        default:
            println(`Command not found: ${command}. Type 'help' for available commands.`, 'error');
    }
}

function handleAddingProcess(cmd) {
    const value = cmd.trim();
    println(`<span class="prompt" style="color: #00ffff">input:</span> ${value}`, 'system');

    switch (addStep) {
        case 0:
            if (!value) { println('Name cannot be empty.', 'error'); return; }
            newProject.name = value;
            addStep++;
            println('Enter Twitter Handle (e.g. @project):', 'info');
            promptSpan.innerHTML = 'Twitter >';
            break;
        case 1:
            newProject.twitter = value || 'N/A';
            addStep++;
            println('Enter Mint Type (e.g. Freemint, Paid, TBA):', 'info');
            promptSpan.innerHTML = 'Mint Type >';
            break;
        case 2:
            newProject.type = value || 'TBA';
            addStep++;
            println('Enter Mint Date (e.g. Q3 2024, May 15, TBA):', 'info');
            promptSpan.innerHTML = 'Mint Date >';
            break;
        case 3:
            newProject.date = value || 'TBA';
            addStep++;
            println('Enter Status (e.g. Grinding, WL Secured, Watching):', 'info');
            promptSpan.innerHTML = 'Status >';
            break;
        case 4:
            newProject.status = value || 'Watching';

            println("Uploading to secure cloud storage...", "system");

            // Backend Insert
            fetch('/api/add-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser,
                    name: newProject.name,
                    twitter: newProject.twitter,
                    type: newProject.type,
                    mint_date: newProject.date,
                    status: newProject.status
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    projects.push(data.project); // Push the DB returned object with real ID
                    println(`[SUCCESS] Project ${newProject.name} added to your tracker!`, 'success');
                } else {
                    println(`[ERROR] Failed to save to cloud: ${data.error}`, 'error');
                }

                // Reset state
                isAdding = false;
                addStep = 0;
                promptSpan.innerHTML = `${currentUser}@loxnft:~$`;
            });
            break;
    }
}

commandInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const cmd = this.value;
        this.value = '';
        processCommand(cmd);
    }
});

document.getElementById('terminal').addEventListener('click', () => {
    commandInput.focus();
});

window.onload = () => {
    commandInput.focus();
    initTerminal();
};
