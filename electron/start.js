#!/usr/bin/env node

/**
 * Electron startup script
 * Starts the Next.js standalone server, waits for it to be ready,
 * then launches the Electron window.
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SERVER_PATH = path.join(ROOT_DIR, '.next', 'standalone', 'server.js');

let nextServer = null;
let electronProcess = null;

function checkServerReady() {
  return new Promise((resolve) => {
    const check = () => {
      http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200 || res.statusCode === 302) {
          resolve(true);
        } else {
          setTimeout(check, 500);
        }
      }).on('error', () => {
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function start() {
  console.log('Starting Next.js server...');
  
  // Start the Next.js standalone server
  nextServer = spawn('node', [SERVER_PATH], {
    cwd: ROOT_DIR,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: 'inherit',
  });

  nextServer.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
    process.exit(1);
  });

  // Wait for server to be ready
  console.log('Waiting for server to be ready...');
  await checkServerReady();
  console.log('Server is ready!');

  // Launch Electron
  console.log('Launching Electron...');
  electronProcess = spawn('npx', ['electron', path.join(ROOT_DIR, 'electron', 'main.js')], {
    cwd: ROOT_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  });

  electronProcess.on('error', (err) => {
    console.error('Failed to start Electron:', err);
    cleanup();
  });

  electronProcess.on('exit', () => {
    cleanup();
  });
}

function cleanup() {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

start();
