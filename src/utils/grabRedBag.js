import {pluginLog} from "./frontLogUtils.js";

const grAPI = window.grab_redbag
const grabedArray = []

export async function grabRedBag(payload) {
    // pluginLog("下面是onRecvActiveMsg的payload")
    // if (payload.msgList[0].peerName === "")
    //     console.log(payload)

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
    if (!wallEl || grabedArray.includes(wallEl.billNo)) return;
    grabedArray.push(wallEl.billNo)//这里使用数组来避免重复播报

    const authData = app.__vue_app__.config.globalProperties.$store.state.common_Auth.authData

    //收红包必要的数据
    const msgSeq = payload.msgList[0].msgSeq
    const recvUin = authData.uin//自己的QQ号
    const peerUid = payload.msgList[0].peerUid//发红包的对象的peerUid
    const name = authData.nickName//应该是自己的名字
    const sendUin = payload.msgList[0].senderUin//发送红包的QQ号
    const pcBody = wallEl.pcBody
    const wishing = wallEl.receiver.title
    const index = wallEl.stringIndex
    const chatType = payload.msgList[0].chatType//聊天类型，1是私聊，2是群聊
    const peerName = payload.msgList[0].peerName//群聊名字
    const title = wallEl.receiver.title
    const redChannel = wallEl.redChannel
    const config = await grAPI.getConfig()
    const IsGroup = config.Send2Who.length === 0 ? 1 : (config.Send2Who[0] === "1" ? 8 : 2)
    const receiver = config.Send2Who.length === 0 || config.Send2Who[0] === "1" ? authData.uid : config.Send2Who[0]


    //先判断黑白名单的类型
    switch (config.blockType) {
        case "0" :
            break;//说明未启用黑白名单

        case "1": {//说明是白名单
            if (!(config.listenKeyWords.some(word => title.includes(word)) || config.listenGroups.includes(peerUid))) {
                pluginLog("未检测到关键字或不在白名单内，不抢红包")
                return
            }
            break
        }
        case "2": {//说明是黑名单
            if (config.avoidKeyWords.some(word => title.includes(word)) || config.avoidGroups.includes(peerUid)) {
                pluginLog("检测到屏蔽词或在屏蔽群内，不抢红包")
                return
            }
            break
        }
    }


    //下面准备发送收红包消息
    pluginLog("准备抢红包")
    let randomDelayForSend = 0;
    if (config.useRandomDelay) {

        const lowerBound = parseInt(config.delayLowerBound)
        const upperBound = parseInt(config.delayUpperBound)
        const lowerBoundForSend = parseInt(config.delayLowerBoundForSend)
        const upperBoundForSend = parseInt(config.delayUpperBoundForSend)
        const randomDelay = Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound;
        randomDelayForSend = Math.floor(Math.random() * (upperBoundForSend - lowerBoundForSend + 1)) + lowerBoundForSend;
        pluginLog("等待随机时间" + randomDelay + "ms")
        await sleep(randomDelay)
    }

    if (redChannel === 32) {
        //说明是口令红包，要输出口令
        await grAPI.invokeNative('ns-ntApi', 'nodeIKernelMsgService/sendMsg', false, {
            "msgId": "0",
            "peer": {
                "chatType": chatType,
                "peerUid": peerUid,
                "guildId": ""
            },
            "msgElements": [
                {
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": title,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }
            ],
            "msgAttributeInfos": new Map(),
        })
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
    pluginLog("抢红包结果为")
    console.log(result)

    if (config.useSelfNotice) {
        pluginLog("准备给自己发送消息")
        if (result.grabRedBagRsp.recvdOrder.amount === "0")
            await grAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": `[Grab RedBag]抢来自"${peerName}(${peerUid})":${sendUin}的红包时失败！红包已被领完！`,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }],
                "msgAttributeInfos": new Map()
            }, null)
        else
            await grAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": `[Grab RedBag]收到来自"${peerName}(${peerUid})":${sendUin}的红包${parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100}元`,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }],
                "msgAttributeInfos": new Map()
            }, null)
    }

    if (config.thanksMsgs.length !== 0 && result.grabRedBagRsp.recvdOrder.amount !== "0" && sendUin !== recvUin) {//给对方发送消息
        await sleep(randomDelayForSend)
        pluginLog("准备给对方发送消息,随机延迟" + randomDelayForSend + "ms")
        await grAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
            "msgId": "0",
            "peer": {"chatType": chatType, "peerUid": peerUid, "guildId": ""},
            "msgElements": [{
                "elementType": 1,
                "elementId": "",
                "textElement": {
                    "content": config.thanksMsgs[Math.floor(Math.random() * config.thanksMsgs.length)],//随机选一条发
                    "atType": 0,
                    "atUid": "",
                    "atTinyId": "",
                    "atNtUid": ""
                }
            }],
            "msgAttributeInfos": new Map()
        }, null)
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
}
