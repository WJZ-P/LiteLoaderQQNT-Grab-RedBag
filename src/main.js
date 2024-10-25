// 运行在 Electron 主进程 下的插件入口

const path = require("path");
const {pluginLog} = require("./utils/logUtils");
const {Config} = require("./Config");
const pluginPath = path.join(LiteLoader.plugins.encrypt_chat.path.plugin);//插件目录
const configPath = path.join(pluginPath, "config.json");

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
        if(window.id===2){//只改QQ主窗口就行了

        }
    })
}

function onLoad(){
    pluginLog("启动！")
    //设置配置
    Config.initConfig(pluginPath, configPath)
}