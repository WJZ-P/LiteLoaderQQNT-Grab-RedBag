// 运行在 Electron 主进程 下的插件入口
const {ipcMain} = require("electron");
const path = require("path");
const {pluginLog} = require("./utils/logUtils");
const {Config} = require("./Config");
const fs = require("fs");
const pluginPath = path.join(LiteLoader.plugins.grab_redbag.path.plugin);//插件目录
const configPath = path.join(pluginPath, "config.json");
const config = Config.config

onLoad()//妈的，启动！

const chatWindows = []//收集聊天窗口

// 创建窗口时触发
module.exports.onBrowserWindowCreated = window => {
    // window 为 Electron 的 BrowserWindow 实例

    //监听preload发来的请求webContentsID
    window.webContents.on('ipc-message-sync', (event, channel) => {
        if (channel == '___!boot') {
            event.returnValue = {
                enabled: true,
                webContentsId: window.webContents.id.toString(),
            };
        }
    });

    window.webContents.on("did-stop-loading", async () => {
        if (window.id === 2) {//只改QQ主窗口就行了
            chatWindows.push(window)
        }
    })
}

/**
 * 主进程发消息通知所有渲染进程中的聊天窗口
 * @param message
 * @param args
 */
function sendMsgToChatWindows(message, args) {
    pluginLog('给所有渲染进程发送消息')
    // pluginLog('所有聊天窗口如下')
    // console.log(chatWindows)
    for (const window of chatWindows) {
        if (window.isDestroyed()) continue;
        window.webContents.send(message, args);
    }
}

function onLoad() {
    pluginLog("启动！")

    ipcMain.handle("LiteLoader.grab_redbag.getMenuHTML", () => fs.readFileSync(path.join(config.pluginPath, 'src/pluginMenu.html'), 'utf-8'))
    ipcMain.handle("LiteLoader.grab_redbag.getConfig", () => Config.getConfig())
    ipcMain.handle("LiteLoader.grab_redbag.setConfig", async (event, newConfig) => Config.setConfig(newConfig))//更新配置，并且返回新的配置
    ipcMain.on("LiteLoader.grab_redbag.sendMsgToChatWindows", (_, message, args) => {
        console.log('主进程准备处理sendMsgToChatWindows')
        pluginLog(_, message, args)
        sendMsgToChatWindows(message, args)
    })

    //设置配置
    Config.initConfig(pluginPath, configPath)
}

