// Runs API + Angular dev server together (avoids npm/PowerShell script issues).
import { spawn } from 'node:child_process';

const run = (args) => spawn(process.execPath, args, { stdio: 'inherit' });
const api = run(['server/server.mjs']);
const ng = run(['node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '0.0.0.0']);
const stop = () => { api.kill(); ng.kill(); };
process.on('SIGINT', stop);
ng.on('exit', stop);
api.on('exit', stop);
