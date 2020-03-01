const API_URL = 'http://localhost:3000';
const WEBSOCKET_URL = 'ws://localhost:3000';

// TERMINAL VARIABLES
let currentTerminalLine = "";
let currentCursorPosition = 0;
let isOpened = false;
let terminal;
let fitAddon;

//CURRENT SOCKET
let socket;

// HTML ELEMENTS
let terminalElement;
let connectionFormElement;
let passwordRadioElement;
let keyRadioElement;
let messageElement;
let passwordInputGroup;
let keyInputGroup;
let hostInput;
let userInput;
let passwordInput;
let keyInput;

function configureInterface() {
    messageElement = document.getElementById('message');
    connectionFormElement = document.getElementById('connection-form');
    terminalElement = document.getElementById('terminal');
    passwordInputGroup = document.getElementById('password-group');
    keyInputGroup = document.getElementById('key-group');
    passwordRadioElement = document.getElementById('password-mode');
    keyRadioElement = document.getElementById('key-mode');
    hostInput = document.getElementById('host');
    userInput = document.getElementById('user');
    passwordInput = document.getElementById('password');
    keyInput = document.getElementById('key');

    function changeMode() {
        if (this.checked && this.value === 'password') {
            passwordInputGroup.style.display = 'block';
            keyInputGroup.style.display = 'none';
        } else {
            passwordInputGroup.style.display = 'none';
            keyInputGroup.style.display = 'block';
        }
    }

    keyRadioElement.addEventListener('change', changeMode);
    passwordRadioElement.addEventListener('change', changeMode);

    connectionFormElement.onsubmit = login;
}

function openTerminal() {
    connectionFormElement.style.display = 'none';
    terminalElement.style.display = 'block';

    if (!isOpened) {
        isOpened = true;
        terminal.open(terminalElement);
        terminal.loadAddon(fitAddon);
    }

    fitAddon.fit();
    terminal.reset();
}

function closeTerminal() {
    connectionFormElement.style.display = 'block';
    terminalElement.style.display = 'none';
}

function configureTerminal() {
    fitAddon = new FitAddon.FitAddon();
    terminal = new Terminal({
        'theme': {
            background: '#4285f4'
        }
    });

    terminal.onKey((key) => {
        if (key.domEvent.ctrlKey && key.domEvent.key === 'c') {
            // Ctrl+C signal is converted and sent directly through the socket
            socket.send('\x03\n');
        } else {
            switch (key.domEvent.code) {
                case 'ArrowUp':
                case 'ArrowDown':
                    return;
                case 'ArrowLeft':
                    if(currentCursorPosition === 0) {
                        return;
                    } 
                    terminal.write(key.key);
                    currentCursorPosition--;
                break;
                case 'ArrowRight':
                    if(currentCursorPosition === currentTerminalLine.length) {
                        return;
                    } 
                    terminal.write(key.key);
                    currentCursorPosition++;                
                break;
                case 'Enter':
                    terminal.write('\r\n');
                    currentTerminalLine += '\n';
                    // Send the message through the WebSocket.
                    socket.send(currentTerminalLine);
                    // reset terminal line and cursor position variables
                    currentTerminalLine = "";
                    currentCursorPosition = 0;
                break;
                case 'Backspace':
                    if(currentCursorPosition===0) {
                        return;
                    } 
                    terminal.write('\b \b');
                    currentTerminalLine = currentTerminalLine.slice(0, -1);
                    currentCursorPosition--;
                    break;
                default:
                    currentTerminalLine += key.key;
                    terminal.write(key.key);
                    currentCursorPosition++;
            }
        }
    });
}

function login() {
    const host = hostInput.value;
    const user = userInput.value;
    const password = passwordInput.value;
    const key = keyInput.files[0];
    const formData = new FormData();

    formData.append('host', host)
    formData.append('user', user)

    if(key) {
        formData.append('key', key);
    } else if(password) {
        formData.append('password', password)
    }

    fetch(API_URL+'/login', {
        method: 'POST',
        credentials: 'include',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.loggedin) {
            openTerminal();
            openSSH();
        } else {
            messageElement.innerText = 'login error';
        }
    })
    .catch((error) => {
        console.error(error)
    })
    return false;
}

function openSSH() {
    // cookie hack for websocket as headers are not populated for websockets
    const cookie = document.cookie.split('; ').find((cookie) => cookie.indexOf('connect.sid') !== -1);

    socket = new WebSocket(WEBSOCKET_URL+'/ssh?cookie='+document.cookie);

    // Handle any errors that occur.
    socket.onerror = function (error) {
        console.log('WebSocket Error: ' + error);
    };

    // Show a connected message when the WebSocket is opened.
    socket.onopen = function (event) {
        console.log('Connected to: ' + event.currentTarget.URL+'\n')
    };

    // Handle messages sent by the server.
    socket.onmessage = function (event) {
        var message = event.data;
        console.log('message received : ' + message);
        terminal.write(message);
    };

    // Show a disconnected message when the WebSocket is closed.
    socket.onclose = function (event) {
        console.log('Disconnected from WebSocket.');
        closeTerminal();
    };
}

window.onload = function () {
    configureInterface();
    configureTerminal();
    return false;
};