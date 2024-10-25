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


        //这个似乎是最常见的，QQ收到消息就是这个。
        grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvActiveMsg", async (payload) => {
            // pluginLog("下面是onRecvActiveMsg的payload")
            //console.log(payload)
            let wallEl = null
            for (const msgElement of payload.msgList[0].elements) {
                if (msgElement.elementType === 9) {//说明是红包消息！
                    pluginLog("收到了红包消息！！！")
                    wallEl = msgElement.walletElement
                    console.log(msgElement.walletElement)//打印红包内容
                    console.log(payload)
                    break
                }
            }
            if (!wallEl) return;

            const authData = app.__vue_app__.config.globalProperties.$store.state.common_Auth.authData

            //收红包必要的数据
            const msgSeq = payload.msgList[0].msgSeq
            const recvUin = authData.uin//自己的QQ号
            const peerUid = payload.msgList[0].peerUid//发红包的对象的peerUid
            const name = authData.nickName//应该是自己的名字
            const pcBody = wallEl.pcBody
            const wishing = wallEl.receiver.title
            const index = wallEl.stringIndex
            const chatType = payload.msgList[0].chatType//聊天类型，1是私聊，2是群聊
            //下面准备发送收红包消息
            pluginLog("准备抢红包")
            const result = await grAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/grabRedBag", false, {
                "grabRedBagReq": {
                    "recvUin": chatType === 1 ? recvUin : peerUid,//私聊的话是自己Q号，群聊就是peerUid
                    "recvType": chatType,
                    "peerUid": peerUid,//对方的uid
                    "name": name,
                    "pcBody": pcBody,
                    "wishing": wishing,
                    "msgSeq": msgSeq,
                    "index": index
                }
            }, {"timeout": 5000})
            pluginLog("抢红包结果为" + JSON.stringify(result))
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