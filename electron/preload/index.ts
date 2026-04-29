import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('f5', {
  platform: process.platform,
});
