/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow } from 'electron'
import MenuBuilder from './menu'
const ipcMain = require('electron').ipcMain
const ipcRenderer = require('electron').ipcRenderer
//import keytar from 'keytar'
import Transport from '@ledgerhq/hw-transport-node-hid'
import Str from '@ledgerhq/hw-app-str'

var mainWindow = null

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')()
  const path = require('path')
  const p = path.join(__dirname, '..', 'app', 'node_modules')
  require('module').globalPaths.push(p)
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ]

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(console.log)
}

/**
 * Add event listeners...
 */
app.on('ready', async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions()
  }

  const path = require('path')

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 700,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    frame: false
  })

  //mainWindow.setContentProtection(true)

  mainWindow.loadURL(`file://${__dirname}/app.html`)

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('minimize',function(event){
    event.preventDefault();
    mainWindow.minimize();
  })

  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()
})

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => app.quitting = true)

//app.on('activate', () => { mainWindow.show() })

/*
//TODO: Figure out how to do Production Build with C binding library
//Moved Keytar to Main IPC
ipcMain.on('get-password', (event, serviceName, user) => {
  event.returnValue = keytar.getPassword(serviceName, user);
})

ipcMain.on('set-password', (event, serviceName, user, pass) => {
  event.returnValue = keytar.setPassword(serviceName, user, pass);
})

ipcMain.on('delete-password', (event, serviceName, user) => {
  event.returnValue = keytar.deletePassword(serviceName, user);
})
*/

/*ipcRenderer.on('getLedgerStellarKey-reply', (event, arg) => {
  console.log('IPCRenderer || getLedgerStellarKey-reply')
  console.log(args)
})*/

ipcMain.on('getLedgerStellarKey', (event, arg) => {
  const sub = Transport.listen({
    next: async e => {
        console.log(`Listen Transport: ${JSON.stringify(e)}`)
        const transport = await Transport.open(e.descriptor).catch( error => {
          console.log(`Transport Error || ${JSON.stringify(error)}`)
        })

        console.log(`Transport: ${JSON.stringify(transport)}`)
        const str = new Str(transport)
        const result = await str.getAppConfiguration();

        await str.getPublicKey("44'/148'/0'").then(res => {
          console.log('App found');
          console.log(`Public Key: ${res.publicKey}`)
        }).catch((err) => {
          console.log(JSON.stringify(err))
          transport.close();
        })
        sub.unsubscribe()
    },
    error: error => {
      console.log(JSON.stringify(error))
    },
    complete: () => {

    }
  })
})