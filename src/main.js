// 运行在 Electron 主进程 下的插件入口
const {ipcMain} = require("electron");
const path = require("path");
const {pluginLog} = require("./utils/logUtils");
const {Config} = require("./Config");
const fs = require("fs");
const {ipcModifyer} = require("./utils/ipcUtils");
const pluginPath = path.join(LiteLoader.plugins.grab_redbag.path.plugin);//插件目录
const configPath = path.join(LiteLoader.plugins.grab_redbag.path.data, "config.json");
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
        // 通过 URL 判断是否为 QQ 主聊天窗口（兼容不同平台窗口 ID 不同的问题）
        const url = window.webContents.getURL();
        const isMainWindow = url.includes("#/main/message") || url.includes("#/chat") || url.includes("#/blank");
        if (isMainWindow && chatWindows.length === 0) {
            chatWindows.push(window)
            pluginLog(JSON.stringify(config))

            if (config.isActiveAllGroups)//如果激活所有群，就拦截取消激活的事件，使得激活的聊天不会被取消
            {
                window.webContents._events["-ipc-message"] = ipcModifyer(window.webContents._events["-ipc-message"])
                pluginLog("成功修改deleteActiveChatByUid事件")
            }
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
    pluginLog('所有聊天窗口如下')
    console.log(chatWindows)
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
        pluginLog('主进程准备处理sendMsgToChatWindows')
        pluginLog(_, message, args)
        sendMsgToChatWindows(message, args)
    })
    ipcMain.handle("LiteLoader.grab_redbag.addTotalRedBagNum", (_, num) => {
        Config.setConfig({totalRedBagNum: config.totalRedBagNum + num})
    })
    ipcMain.handle("LiteLoader.grab_redbag.addTotalAmount", (_, amount) => {
        Config.setConfig({totalAmount:config.totalAmount+amount})
    })

    //设置配置
    Config.initConfig(pluginPath, configPath)
}

