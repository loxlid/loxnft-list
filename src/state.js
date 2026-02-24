// src/state.js
// Centralized state management for the application

export const state = {
    projects: [],
    currentUser: null,
    sessionToken: localStorage.getItem('loxnft_session') || null,

    // Command process state
    isLoggingIn: true,
    loginStep: 0,
    tempUsername: '',
    tempPassword: '',

    isAdding: false,
    addStep: 0,
    newProject: {},

    // Command history
    history: [],
    historyIndex: -1,

    resetLoginState() {
        this.isLoggingIn = true;
        this.loginStep = 0;
        this.tempUsername = '';
        this.tempPassword = '';
    },

    resetAddState() {
        this.isAdding = false;
        this.addStep = 0;
        this.newProject = {};
    },

    login(username) {
        this.currentUser = username;
        this.sessionToken = username; // using username as token for now, same as original
        localStorage.setItem('loxnft_session', username);
        this.isLoggingIn = false;
    },

    logout() {
        this.currentUser = null;
        this.sessionToken = null;
        this.projects = [];
        localStorage.removeItem('loxnft_session');
        this.resetLoginState();
    },

    addHistory(cmd) {
        if (!cmd.trim()) return;
        // Don't log passwords or sensitive inputs
        if (this.isLoggingIn && this.loginStep > 0) return;

        // Remove duplicate if it was the last command
        if (this.history.length > 0 && this.history[this.history.length - 1] === cmd) {
            this.historyIndex = this.history.length;
            return;
        }

        this.history.push(cmd);
        if (this.history.length > 50) this.history.shift();
        this.historyIndex = this.history.length; // Reset index to "after the end"
    }
};
