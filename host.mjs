import process from 'node:process';
import childProcess from 'node:child_process';
import { IPCChild } from './lib.mjs';

const js = childProcess.spawn('node', ['child.mjs']);
const ipcJs = new IPCChild(js);

let r;
r = await ipcJs.invoke('echo', 'hoge');
console.log(r);
r = await ipcJs.invoke('test', 'hoge');
console.log(r);
r = await ipcJs.invoke('test2', 'hoge');
console.log(r);

js.kill();
process.stdin.destroy();