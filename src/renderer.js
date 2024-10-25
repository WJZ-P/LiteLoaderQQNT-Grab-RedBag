// 运行在 Electron 渲染进程 下的页面脚本
import {pluginLog} from "./utils/frontLogUtils.js";

const grAPI = window.grab_redbag
onLoad();//注入

// 打开设置界面时触发
export const onSettingWindowCreated = view => {
    // view 为 Element 对象，修改将同步到插件设置界面
}

function onLoad() {
    pluginLog("正在调用onLoad函数")
    if (location.hash === "#/blank") {
        navigation.addEventListener("navigatesuccess", onHashUpdate, {once: true});
    } else {
        onHashUpdate();
    }

    pluginLog('onLoad函数加载完成')
}

function onHashUpdate() {
    const hash = location.hash;
    if (hash === '#/blank') return

    if (!(hash.includes("#/main/message") || hash.includes("#/chat"))) return;//不符合条件直接返回

    pluginLog('[EC渲染进程]执行onHashUpdate')

    try {
        grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvMsg", (payload) => {
            // pluginLog("下面是onRecvMsg的payload")
            // console.log(payload)
        })

        //这个似乎是最常见的，QQ收到消息就是这个。
        grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvActiveMsg", (payload) => {
            // pluginLog("下面是onRecvActiveMsg的payload")
            //console.log(payload)
            for (const msgElement of payload.msgList[0].elements) {
                if (msgElement.elementType === 9) {//说明是红包消息！
                    pluginLog("收到了红包消息！！！")
                    console.log(msgElement.walletElement)//打印红包内容
                }
            }
        })

        // grAPI.subscribeEvent("nodeIKernelMsgListener/onAddSendMsg", (payload) => {
        //     pluginLog("下面是onAddSendMsg的payload")
        //     console.log(payload)
        // })

        pluginLog("事件监听成功")
    } catch (e) {
        console.log(e)
    }
}