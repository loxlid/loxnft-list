// src/api.js
// API wrapper for server requests
import { state } from './state.js';
import { printSystem, printError, clearTerminal, updateConnectionStatus } from './ui.js';

const API_BASE = '/api';

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function fetchApi(endpoint, options = {}) {
    updateConnectionStatus('connecting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        updateConnectionStatus('online');

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        updateConnectionStatus('offline');
        console.error('API Error:', error);
        throw error;
    }
}

export async function loginApi(username, password, action) {
    return fetchApi('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, action })
    });
}

export async function fetchProjects() {
    try {
        const data = await fetchApi(`/get-projects?username=${state.currentUser}`);
        if (data.success) {
            state.projects = data.projects || [];
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

export async function addProjectApi(projectData) {
    return fetchApi('/add-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: state.currentUser,
            name: projectData.name,
            twitter: projectData.twitter,
            type: projectData.type,
            mint_date: projectData.date,
            status: projectData.status
        })
    });
}

export async function deleteProjectApi(id) {
    return fetchApi('/delete-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: state.currentUser,
            id: id
        })
    });
}
