import { ipcHost } from './lib.mjs';

ipcHost.handle('echo', (arg) => {
  return arg;
});

ipcHost.handle('test', (arg) => {
  return [1, 2, 3];
});

ipcHost.handle('test2', (arg) => {
  return "hello";
});