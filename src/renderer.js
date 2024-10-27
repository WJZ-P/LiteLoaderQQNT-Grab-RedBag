// 运行在 Electron 渲染进程 下的页面脚本
import {pluginLog} from "./utils/frontLogUtils.js";
import {SettingListeners} from "./utils/SettingListeners.js";

const grAPI = window.grab_redbag
let grabRedBagListener = undefined//保存监听器
let hasActived = false

await onLoad();//注入

// 打开设置界面时触发
export const onSettingWindowCreated = async view => {
    // view 为 Element 对象，修改将同步到插件设置界面
    try {
        //整个插件主菜单
        const parser = new DOMParser()
        const settingHTML = parser.parseFromString(await grAPI.getMenuHTML(), "text/html").querySelector(".config-menu")

        const myListener = new SettingListeners(settingHTML)
        await myListener.onLoad()
        view.appendChild(settingHTML);

    } catch (e) {
        setInterval(() => {//防止调试未打开就已经输出，导致捕获不到错误
            console.log(e)
        }, 1000)
    }
}


async function onLoad() {
    if (location.hash === "#/blank") {
        navigation.addEventListener("navigatesuccess", onHashUpdate, {once: true});
    } else {
        await onHashUpdate();
    }

    pluginLog('onLoad函数加载完成')
}

async function onHashUpdate() {
    const hash = location.hash;
    if (hash === '#/blank') return
    if (!(hash.includes("#/main/message") || hash.includes("#/chat"))) return;//不符合条件直接返回

    grAPI.addEventListener('LiteLoader.grab_redbag.unSubscribeListener', () => grAPI.unsubscribeEvent(grabRedBagListener)) //收到取消订阅消息，取消订阅红包消息
    grAPI.addEventListener('LiteLoader.grab_redbag.subscribeListener', () => {
        pluginLog("渲染进程收到请求，准备监听红包事件。")
        grabRedBagListener = grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvActiveMsg", (payload) => grabRedBag(payload))
    })//添加订阅

    pluginLog('执行onHashUpdate')
    //"nodeIKernelMsgListener/onAddSendMsg"
    //"nodeIKernelMsgListener/onRecvMsg"
    try {
        if (!(await grAPI.getConfig()).isActive) {
            pluginLog("功能未开启，不监听抢红包事件")
            return
        }
        grabRedBagListener = grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvActiveMsg", (payload) => grabRedBag(payload))
        pluginLog("事件监听成功")

        //尝试获取群列表

        //有人加群的时候会触发onGroupListUpdate
        grAPI.subscribeEvent("onGroupListUpdate", (payload) => {
            //pluginLog("监听到onGroupListUpdate")
            //console.log(payload)
            if (hasActived) return
            hasActived = true;
            activeAllGroups(payload.groupList)
        })
        const result = await grAPI.invokeNative('ns-NodeStoreApi', "getGroupList", false)
        console.log(result)

    } catch (e) {
        console.log(e)
    }
}

async function grabRedBag(payload) {
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
    const peerName = payload.msgList[0].peerName//群聊名字
    //下面准备发送收红包消息
    pluginLog("准备抢红包")
    const config = await grAPI.getConfig()
    if (config.useRandomDelay) {

        const lowerBound = parseInt(config.delayLowerBound)
        const upperBound = parseInt(config.delayUpperBound)
        const randomDelay = Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound;
        pluginLog("等待随机时间" + randomDelay + "ms")
        await sleep(randomDelay)
    }

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

    if (config.useSelfNotice) {
        pluginLog("准备给自己发送消息")
        await grAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
            "msgId": "0",
            "peer": {"chatType": 1, "peerUid": authData.uid, "guildId": ""},
            "msgElements": [{
                "elementType": 1,
                "elementId": "",
                "textElement": {
                    "content": `[Grab RedBag]收到来自"${peerName}":${peerUid}的红包${parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100}元`,
                    "atType": 0,
                    "atUid": "",
                    "atTinyId": "",
                    "atNtUid": ""
                }
            }],
            "msgAttributeInfos": new Map()
        }, null)
    }

    if(config.thanksMsg.trim()!==""){//给对方发送消息

    }
}

//激活所有的群聊消息
async function activeAllGroups(groupList) {
    for (const group of groupList) {
        //应该对每个group调用active方法
        const result = await grAPI.invokeNative("ns-ntApi", "nodeIKernelMsgService/getAioFirstViewLatestMsgsAndAddActiveChat", false, {
            "peer": {
                "chatType": 2,
                "peerUid": group.groupCode,
                "guildId": ""
            }, "cnt": 0
        }, null)
        // pluginLog(`激活群聊"${group.groupName}"的消息，结果为`)
        // console.log(result)
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
}