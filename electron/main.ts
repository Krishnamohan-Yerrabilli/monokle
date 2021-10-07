/* eslint-disable import/order */
/* eslint-disable import/first */
import moduleAlias from 'module-alias';
import * as ElectronLog from 'electron-log';

Object.assign(console, ElectronLog.functions);
moduleAlias.addAliases({
  '@constants': `${__dirname}/../src/constants`,
  '@models': `${__dirname}/../src/models`,
  '@redux': `${__dirname}/../src/redux`,
  '@utils': `${__dirname}/../src/utils`,
  '@src': `${__dirname}/../src/`,
  '@root': `${__dirname}/../`,
});

import {app, BrowserWindow, nativeImage, ipcMain, dialog} from 'electron';
import * as path from 'path';
import installExtension, {REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS} from 'electron-devtools-installer';
import {execSync} from 'child_process';
import * as Splashscreen from '@trodi/electron-splashscreen';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {APP_MIN_HEIGHT, APP_MIN_WIDTH, ROOT_FILE_ENTRY} from '@constants/constants';
import {DOWNLOAD_PLUGIN, DOWNLOAD_PLUGIN_RESULT} from '@constants/ipcEvents';
import {checkMissingDependencies} from '@utils/index';
import ElectronStore from 'electron-store';
import {autoUpdater} from 'electron-updater';
import mainStore from '@redux/main-store';
import {updateNewVersion} from '@redux/reducers/appConfig';
import {NewVersionCode} from '@models/appconfig';
import {K8sResource} from '@models/k8sresource';
import {isInPreviewModeSelector} from '@redux/selectors';
import {HelmChart, HelmValuesFile} from '@models/helm';
import log from 'loglevel';

import {createMenu, getDockMenu} from './menu';
import initKubeconfig from './src/initKubeconfig';
import terminal from '../cli/terminal';
import {downloadPlugin} from './pluginService';

Object.assign(console, ElectronLog.functions);
autoUpdater.logger = console;

const {MONOKLE_RUN_AS_NODE} = process.env;

const isDev = process.env.NODE_ENV === 'development';

const userHomeDir = app.getPath('home');
const userDataDir = app.getPath('userData');
const pluginsDir = path.join(userDataDir, 'monoklePlugins');
const APP_DEPENDENCIES = ['kubectl', 'helm'];

ipcMain.on('get-user-home-dir', event => {
  event.returnValue = userHomeDir;
});

ipcMain.on(DOWNLOAD_PLUGIN, async (event, pluginUrl: string) => {
  try {
    await downloadPlugin(pluginUrl, pluginsDir);
    event.sender.send(DOWNLOAD_PLUGIN_RESULT);
  } catch (err) {
    if (err instanceof Error) {
      event.sender.send(DOWNLOAD_PLUGIN_RESULT, err);
    } else {
      log.warn(err);
    }
  }
});

/**
 * called by thunk to preview a kustomization
 */

ipcMain.on('run-kustomize', (event, folder: string) => {
  try {
    let stdout = execSync('kubectl kustomize ./', {
      cwd: folder,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PUBLIC_URL: process.env.PUBLIC_URL,
      },
    });

    event.sender.send('kustomize-result', {stdout: stdout.toString()});
  } catch (e: any) {
    event.sender.send('kustomize-result', {error: e.toString()});
  }
});

ipcMain.on('check-missing-dependency', event => {
  const missingDependecies = checkMissingDependencies(APP_DEPENDENCIES);
  if (missingDependecies.length > 0) {
    event.sender.send('missing-dependency-result', {dependencies: missingDependecies});
  }
});

ipcMain.handle('select-file', async (event, options: any) => {
  const browserWindow = BrowserWindow.fromId(event.sender.id);
  let dialogOptions: Electron.OpenDialogSyncOptions = {};
  if (options.isDirectoryExplorer) {
    dialogOptions.properties = ['openDirectory'];
  } else {
    if (options.allowMultiple) {
      dialogOptions.properties = ['multiSelections'];
    }
    if (options.acceptedFileExtensions) {
      dialogOptions.filters = [{name: 'Files', extensions: options.acceptedFileExtensions}];
    }
  }

  if (browserWindow) {
    return dialog.showOpenDialogSync(browserWindow, dialogOptions);
  }
  return dialog.showOpenDialogSync(dialogOptions);
});

/**
 * called by thunk to preview a helm chart with values file
 */

ipcMain.on('run-helm', (event, args: any) => {
  try {
    let stdout = execSync(args.helmCommand, {
      cwd: args.cwd,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PUBLIC_URL: process.env.PUBLIC_URL,
        KUBECONFIG: args.kubeconfig,
      },
    });

    event.sender.send('helm-result', {stdout: stdout.toString()});
  } catch (e: any) {
    event.sender.send('helm-result', {error: e.toString()});
  }
});

ipcMain.on('app-version', event => {
  event.sender.send('app-version', {version: app.getVersion()});
});

ipcMain.on('check-update-available', async () => {
  await checkNewVersion();
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall();
  mainStore.dispatch(updateNewVersion({code: NewVersionCode.Idle, data: null}));
});

export const checkNewVersion = async (initial?: boolean) => {
  try {
    mainStore.dispatch(updateNewVersion({code: NewVersionCode.Checking, data: {initial: Boolean(initial)}}));
    await autoUpdater.checkForUpdates();
  } catch (error: any) {
    if (error.errno === -2) {
      mainStore.dispatch(
        updateNewVersion({code: NewVersionCode.Errored, data: {errorCode: -2, initial: Boolean(initial)}})
      );
    } else {
      mainStore.dispatch(
        updateNewVersion({code: NewVersionCode.Errored, data: {errorCode: null, initial: Boolean(initial)}})
      );
    }
  }
};

export const createWindow = (givenPath?: string) => {
  const image = nativeImage.createFromPath(path.join(app.getAppPath(), '/public/icon.ico'));
  const mainBrowserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: APP_MIN_WIDTH,
    minHeight: APP_MIN_HEIGHT,
    title: 'Monokle',
    icon: image,
    webPreferences: {
      webSecurity: false,
      contextIsolation: false,
      nodeIntegration: true, // <--- flag
      nodeIntegrationInWorker: true, // <---  for web workers
      preload: path.join(__dirname, 'preload.js'),
    },
  };
  const splashscreenConfig: Splashscreen.Config = {
    windowOpts: mainBrowserWindowOptions,
    templateUrl: isDev
      ? path.normalize(`${__dirname}/../../public/Splashscreen.html`)
      : path.normalize(`${__dirname}/../Splashscreen.html`),
    delay: 0,
    splashScreenOpts: {
      width: 1200,
      height: 800,
      backgroundColor: 'black',
    },
  };

  const win: any = Splashscreen.initSplashScreen(splashscreenConfig);

  if (isDev) {
    win.loadURL('http://localhost:3000/index.html');
  } else {
    // 'build/index.html'
    win.loadURL(`file://${__dirname}/../index.html`);
  }

  // Hot Reloading
  if (isDev) {
    // eslint-disable-next-line global-require
    require('electron-reload')(__dirname, {
      electron: path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '.bin',
        `electron${process.platform === 'win32' ? '.cmd' : ''}`
      ),
      forceHardReset: true,
      hardResetMethod: 'exit',
    });
  }

  if (isDev) {
    win.webContents.openDevTools();
  }

  autoUpdater.on('update-available', (data: any) => {
    mainStore.dispatch(updateNewVersion({code: NewVersionCode.Available, data: null}));
  });

  autoUpdater.on('update-not-available', (data: any) => {
    mainStore.dispatch(updateNewVersion({code: NewVersionCode.NotAvailable, data: null}));
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    let percent = 0;
    if (progressObj && progressObj.percent) {
      percent = progressObj.percent;
    }
    mainStore.dispatch(updateNewVersion({code: NewVersionCode.Downloading, data: {percent: percent.toFixed(2)}}));
  });

  autoUpdater.on('update-downloaded', (data: any) => {
    mainStore.dispatch(updateNewVersion({code: NewVersionCode.Downloaded, data: null}));
  });

  const missingDependecies = checkMissingDependencies(APP_DEPENDENCIES);

  if (missingDependecies.length > 0) {
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('missing-dependency-result', {dependencies: missingDependecies});
    });
  }

  win.webContents.on('did-finish-load', async () => {
    await checkNewVersion(true);
    initKubeconfig(mainStore, userHomeDir);
    win.webContents.send('executed-from', {path: givenPath});
  });

  return win;
};

export const openApplication = async (givenPath?: string) => {
  await app.whenReady();

  if (isDev) {
    // DevTools
    installExtension(REACT_DEVELOPER_TOOLS)
      .then(name => console.log(`Added Extension:  ${name}`))
      .catch(err => console.log('An error occurred: ', err));

    installExtension(REDUX_DEVTOOLS)
      .then(name => console.log(`Added Extension:  ${name}`))
      .catch(err => console.log('An error occurred: ', err));
  }

  ElectronStore.initRenderer();
  const win = createWindow(givenPath);

  mainStore.subscribe(() => {
    createMenu(mainStore);
    setWindowTitle(mainStore, win);
  });

  if (app.dock) {
    const image = nativeImage.createFromPath(path.join(app.getAppPath(), '/public/large-icon-256.png'));
    app.dock.setIcon(image);
    mainStore.subscribe(() => {
      app.dock.setMenu(getDockMenu(mainStore));
    });
  }

  console.log('info', app.getName(), app.getVersion(), app.getLocale(), givenPath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(givenPath);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
};

if (MONOKLE_RUN_AS_NODE) {
  yargs(hideBin(process.argv)).command(
    '$0',
    'opens current directory',
    () => {},
    async argv => {
      const {executedFrom} = argv;
      openApplication(<string>executedFrom);
    }
  ).argv;
} else {
  openApplication();
}

terminal()
  // eslint-disable-next-line no-console
  .catch(e => console.log(e));

export const setWindowTitle = (store: any, window: BrowserWindow) => {
  const state = store.getState();
  const isInPreviewMode = isInPreviewModeSelector(state);
  const previewType = state.main.previewType;
  const previewResourceId = state.main.previewResourceId;
  const resourceMap = state.main.resourceMap;
  const previewValuesFileId = state.main.previewValuesFileId;
  const helmValuesMap = state.main.helmValuesMap;
  const helmChartMap = state.main.helmChartMap;
  const fileMap = state.main.fileMap;

  let previewResource: K8sResource | undefined;
  let previewValuesFile: HelmValuesFile | undefined;
  let helmChart: HelmChart | undefined;

  if (previewResourceId) {
    previewResource = resourceMap[previewResourceId];
  }

  if (previewValuesFileId && helmValuesMap[previewValuesFileId]) {
    const valuesFile = helmValuesMap[previewValuesFileId];
    previewValuesFile = valuesFile;
    helmChart = helmChartMap[valuesFile.helmChartId];
  }

  let windowTitle = 'Monokle';

  if (isInPreviewMode && previewType === 'kustomization') {
    windowTitle = previewResource ? `[${previewResource.name}] kustomization` : `Monokle`;
    window.setTitle(windowTitle);
    return;
  }
  if (isInPreviewMode && previewType === 'cluster') {
    windowTitle = String(previewResourceId) || 'Monokle';
    window.setTitle(windowTitle);
    return;
  }
  if (isInPreviewMode && previewType === 'helm') {
    windowTitle = `${previewValuesFile?.name} for ${helmChart?.name} Helm chart`;
    window.setTitle(windowTitle);
    return;
  }
  if (fileMap && fileMap[ROOT_FILE_ENTRY] && fileMap[ROOT_FILE_ENTRY].filePath) {
    windowTitle = fileMap[ROOT_FILE_ENTRY].filePath;
    window.setTitle(windowTitle);
    return;
  }
  window.setTitle(windowTitle);
};
