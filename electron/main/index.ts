import { existsSync } from 'node:fs';
import { app, BrowserWindow, ipcMain, Menu, nativeImage, nativeTheme, shell } from 'electron';
import { join } from 'node:path';
import { ConversationEngine } from './conversation-engine';
import { WorkspaceStore } from './workspace-store';

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);
const APP_DISPLAY_NAME = 'F5';
process.title = APP_DISPLAY_NAME;
app.name = APP_DISPLAY_NAME;
app.setName(APP_DISPLAY_NAME);

const store = new WorkspaceStore(join(app.getPath('userData'), 'workspace'));
const engine = new ConversationEngine(store);
let aboutWindow: BrowserWindow | undefined;
let helpWindow: BrowserWindow | undefined;
type IconPreference = 'light' | 'dark' | 'system';
type IconMode = 'light' | 'dark';
let iconPreference: IconPreference = 'system';

// Defines the macOS menu explicitly so development builds do not expose Electron's default app name.
function configureApplicationMenu(): void {
  if (process.platform !== 'darwin') return;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: APP_DISPLAY_NAME,
        submenu: [
          { label: `About ${APP_DISPLAY_NAME}`, click: () => showAboutWindow() },
          { type: 'separator' },
          { label: 'Services', role: 'services', submenu: [] },
          { type: 'separator' },
          { label: `Hide ${APP_DISPLAY_NAME}`, role: 'hide' },
          { label: 'Hide Others', role: 'hideOthers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { label: `Quit ${APP_DISPLAY_NAME}`, role: 'quit' },
        ],
      },
      { label: 'File', submenu: [{ role: 'close' }] },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
      },
      {
        label: 'Help',
        submenu: [
          { label: `${APP_DISPLAY_NAME} Help`, click: () => showHelpWindow() },
          { type: 'separator' },
          {
            label: 'Show Workspace Folder',
            click: () => {
              void shell.openPath(store.workspacePath);
            },
          },
        ],
      },
    ]),
  );
}

function resolveIconMode(preference: IconPreference = iconPreference): IconMode {
  if (preference === 'system') return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  return preference;
}

function getIconResourcePath(fileName: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, fileName)
    : join(process.cwd(), 'resources', fileName);
}

function getAppIconPath(mode: IconMode = resolveIconMode()): string | undefined {
  const iconPath = getIconResourcePath(mode === 'dark' ? 'icon-dark.png' : 'icon.png');
  return existsSync(iconPath) ? iconPath : undefined;
}

function getAppIcon(mode?: IconMode): Electron.NativeImage | undefined {
  const iconPath = getAppIconPath(mode) ?? getIconResourcePath('icon.png');
  if (!existsSync(iconPath)) return undefined;
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}

function applyAppIcon(): void {
  const icon = getAppIcon();
  if (!icon) return;
  if (process.platform === 'darwin') app.dock?.setIcon(icon);
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.setIcon(icon);
  }
  const iconDataUrl = icon.toDataURL();
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    void aboutWindow.loadURL(buildAboutDataUrl(iconDataUrl));
  }
  if (helpWindow && !helpWindow.isDestroyed()) {
    void helpWindow.loadURL(buildHelpDataUrl(iconDataUrl));
  }
}

async function initializeAppIconPreference(): Promise<void> {
  const profile = await store.ensureProfile();
  iconPreference = profile.iconTheme;
  applyAppIcon();
}

function setAppIconPreference(preference: IconPreference): void {
  iconPreference = preference;
  applyAppIcon();
}

// Shows a branded About panel because the native Electron panel keeps Electron.app branding in dev builds.
function showAboutWindow(): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  const icon = getAppIcon();
  aboutWindow = new BrowserWindow({
    width: 420,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `About ${APP_DISPLAY_NAME}`,
    backgroundColor: '#1f2030',
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  aboutWindow.setMenuBarVisibility(false);
  aboutWindow.once('ready-to-show', () => aboutWindow?.show());
  aboutWindow.on('closed', () => {
    aboutWindow = undefined;
  });
  void aboutWindow.loadURL(buildAboutDataUrl(icon?.toDataURL() ?? ''));
}

// Builds the static About window HTML so the menu action can show F5 branding in dev and packaged builds.
function buildAboutDataUrl(iconDataUrl: string): string {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
      body {
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 50% 8%, rgba(255,255,255,0.08), transparent 34%), #202132;
        color: #f7f7fb;
        font: 15px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
        user-select: none;
      }
      main { display: grid; justify-items: center; gap: 14px; padding-top: 14px; }
      img {
        width: 88px;
        height: 88px;
        border-radius: 22px;
        box-shadow: 0 18px 46px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255,255,255,0.28);
      }
      h1 { margin: 8px 0 0; font-size: 30px; line-height: 1; font-weight: 750; letter-spacing: 0; }
      p { margin: 0; color: rgba(247,247,251,0.78); font-size: 14px; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      ${iconDataUrl ? `<img src="${iconDataUrl}" alt="${APP_DISPLAY_NAME}" />` : ''}
      <h1>${APP_DISPLAY_NAME}</h1>
      <p>Version ${app.getVersion()}</p>
    </main>
  </body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

// Shows the Help menu content in a lightweight branded window without requiring external docs.
function showHelpWindow(): void {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.show();
    helpWindow.focus();
    return;
  }

  const icon = getAppIcon();
  helpWindow = new BrowserWindow({
    width: 560,
    height: 420,
    minWidth: 480,
    minHeight: 360,
    title: `${APP_DISPLAY_NAME} Help`,
    backgroundColor: '#f4f4f6',
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  helpWindow.setMenuBarVisibility(false);
  helpWindow.once('ready-to-show', () => helpWindow?.show());
  helpWindow.on('closed', () => {
    helpWindow = undefined;
  });
  void helpWindow.loadURL(buildHelpDataUrl(icon?.toDataURL() ?? ''));
}

// Builds static help content so the menu has a dependable local destination in dev and packaged builds.
function buildHelpDataUrl(iconDataUrl: string): string {
  const workspacePath = escapeHtml(store.workspacePath);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        background: #f4f4f6;
        color: #1f2028;
        font: 14px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        padding: 28px;
      }
      header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
      img { width: 52px; height: 52px; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
      h1 { margin: 0; font-size: 24px; line-height: 1.1; letter-spacing: 0; }
      p { margin: 6px 0 0; color: #686b73; font-size: 13px; }
      section { border: 1px solid rgba(31,32,40,0.12); border-radius: 14px; padding: 16px; background: rgba(255,255,255,0.72); }
      section + section { margin-top: 14px; }
      h2 { margin: 0 0 12px; font-size: 15px; }
      dl { display: grid; grid-template-columns: 150px 1fr; gap: 10px 14px; margin: 0; }
      dt { color: #686b73; }
      dd { margin: 0; font-weight: 600; }
      code { font-family: "SF Mono", Menlo, monospace; font-size: 12px; word-break: break-all; color: #30323a; }
      @media (prefers-color-scheme: dark) {
        body { background: #202132; color: #f7f7fb; }
        p, dt { color: rgba(247,247,251,0.68); }
        section { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
        code { color: rgba(247,247,251,0.86); }
      }
    </style>
  </head>
  <body>
    <header>
      ${iconDataUrl ? `<img src="${iconDataUrl}" alt="${APP_DISPLAY_NAME}" />` : ''}
      <div>
        <h1>${APP_DISPLAY_NAME} Help</h1>
        <p>Local AI workspace with Markdown conversations.</p>
      </div>
    </header>
    <section>
      <h2>Common Actions</h2>
      <dl>
        <dt>New conversation</dt><dd>Use the plus button in the top bar or conversation list.</dd>
        <dt>Conversation files</dt><dd>Use “Show file location” from the conversation menu.</dd>
        <dt>Workspace folder</dt><dd>Use Help > Show Workspace Folder.</dd>
      </dl>
    </section>
    <section>
      <h2>Workspace Path</h2>
      <code>${workspacePath}</code>
    </section>
  </body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

ipcMain.handle('workspace:initialize', async (_event, activeConversationId?: string) => {
  return engine.initialize(activeConversationId);
});

ipcMain.handle('conversation:create', async (_event, input) => {
  return engine.createConversation(input);
});

ipcMain.handle('conversation:open', async (_event, conversationId: string) => {
  return engine.openConversation(conversationId);
});

ipcMain.handle('conversation:send-message', async (_event, input) => {
  return engine.sendMessage(input);
});

ipcMain.handle('conversation:rename', async (_event, input) => {
  return engine.renameConversation(input);
});

ipcMain.handle('conversation:star', async (_event, input) => {
  return engine.starConversation(input);
});

ipcMain.handle('conversation:archive', async (_event, input) => {
  return engine.archiveConversation(input);
});

ipcMain.handle('conversation:delete', async (_event, input) => {
  return engine.deleteConversation(input);
});

ipcMain.handle('task:create', async (_event, input) => {
  return engine.createTask(input);
});

ipcMain.handle('task:update', async (_event, input) => {
  return engine.updateTask(input);
});

ipcMain.handle('task:delete', async (_event, input) => {
  return engine.deleteTask(input);
});

ipcMain.handle('task-list:create', async (_event, input) => {
  return engine.createTaskList(input);
});

ipcMain.handle('task-list:update', async (_event, input) => {
  return engine.updateTaskList(input);
});

ipcMain.handle('task-list:delete', async (_event, input) => {
  return engine.deleteTaskList(input);
});

ipcMain.handle('document:create', async (_event, input) => {
  return engine.createDocument(input);
});

ipcMain.handle('document:open', async (_event, documentId: string) => {
  return engine.openDocument(documentId);
});

ipcMain.handle('document:update', async (_event, input) => {
  return engine.updateDocument(input);
});

ipcMain.handle('document:delete', async (_event, input) => {
  return engine.deleteDocument(input);
});

ipcMain.handle('profile:update', async (_event, input) => {
  const snapshot = await engine.updateProfile(input);
  setAppIconPreference(snapshot.profile.iconTheme);
  return snapshot;
});

ipcMain.handle('agent:test-connection', async (_event, agentId: string) => {
  return engine.testAgentConnection(agentId);
});

ipcMain.handle('conversation:cancel-queued', async (_event, input) => {
  return engine.cancelQueued(input);
});

ipcMain.handle('agent:cancel-active', async (_event, conversationId: string) => {
  return engine.cancelActive(conversationId);
});

ipcMain.handle('workspace:reveal', async () => {
  await shell.openPath(store.workspacePath);
  return store.workspacePath;
});

ipcMain.handle('conversation:reveal', async (_event, conversationId: string) => {
  const path = engine.conversationPath(conversationId);
  shell.showItemInFolder(join(path, 'conversation.md'));
  return path;
});

ipcMain.handle('conversation:export', async (_event, conversationId: string) => {
  const path = await engine.exportConversation(conversationId);
  shell.showItemInFolder(path);
  return path;
});

ipcMain.handle('document:reveal', async (_event, documentId: string) => {
  const path = engine.documentPath(documentId);
  shell.showItemInFolder(path);
  return path;
});

// Creates the Electron shell with macOS inset controls, vibrancy, and the secure preload bridge.
function createWindow(): void {
  const initialWidth = Number(process.env.F5_WINDOW_WIDTH ?? 1500);
  const initialHeight = Number(process.env.F5_WINDOW_HEIGHT ?? 980);
  const isMac = process.platform === 'darwin';
  const icon = getAppIcon();
  const mainWindow = new BrowserWindow({
    width: Number.isFinite(initialWidth) ? initialWidth : 1500,
    height: Number.isFinite(initialHeight) ? initialHeight : 980,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: isMac ? '#00000000' : '#f0f0f4',
    transparent: isMac,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 24 },
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    show: false,
    title: APP_DISPLAY_NAME,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  engine.addWindow(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDevelopment) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  configureApplicationMenu();
  await initializeAppIconPreference();
  nativeTheme.on('updated', () => {
    if (iconPreference === 'system') applyAppIcon();
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
