
import { BrowserWindow, app, ipcMain, dialog } from "electron";
import ytdl from "ytdl-core";
import MeowDB from "meowdb";
import path from "path";
import fs from 'fs';

const config = new MeowDB({
    dir: __dirname,
    name: "config"
});

let win: BrowserWindow | null;

app.whenReady().then((): void => {
    win = new BrowserWindow({
        width: 900,
        height: 440,
        minWidth: 550,
        minHeight: 440,
        frame: false,
        titleBarStyle: "hidden",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile(path.join(__dirname, "client", "index.html"));
});

ipcMain.on("select-directory", async () => {
    let [dir] = dialog.showOpenDialogSync(win, { properties: ["openDirectory"] }) || [];
    if(!dir) return;
    config.set("downloadDir", dir);
});

ipcMain.on("start-download", (event, { id, title }) => {
    const stream = ytdl(`https://www.youtube.com/watch?v=${id}`, {
        filter: "audioonly",
        quality: "highestaudio"
    });

    let dir = config.get<string>("downloadDir") || app.getPath("downloads");
    stream.pipe(fs.createWriteStream(path.join(dir, `${title.match(/[a-z _\-\d]/gi)?.join("")}.ytd.mp3`)));

    stream.on("progress", (_, downloaded, total) => {
        if (!isNaN(downloaded) && !isNaN(total))
            event.sender.send("download-progress", {
                id, progress: (downloaded / total)
            });
    });
});

ipcMain.on("window-buttons", (_, type) => {
    if (!win) return;
    switch (type) {
        case 'minimize':
            win.minimize();
            break;
        case 'maximize':
            if (win.isMaximized()) win.unmaximize();
            else win.maximize();
            break;
        case 'close':
            win.close();
            break;
    }
});

app.on("window-all-closed", () => {
    app.quit();
});
