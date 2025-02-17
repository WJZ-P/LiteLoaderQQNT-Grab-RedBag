import {pluginLog} from "./frontLogUtils.js";

const pluginAPI = window.grab_redbag
const grabedArray = []
let antiDetectGroups = []//暂时停止监听的群。
const antiDetectTime = 300000//默认暂停五分钟

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
    const senderName = payload.msgList[0].sendRemarkName || payload.msgList[0].sendMemberName || payload.msgList[0].sendNickName;//发送者的名字
    const pcBody = wallEl.pcBody
    const wishing = wallEl.receiver.title
    const index = wallEl.stringIndex
    const chatType = payload.msgList[0].chatType//聊天类型，1是私聊，2是群聊
    const peerName = payload.msgList[0].peerName//群聊名字
    const title = wallEl.receiver.title
    const redChannel = wallEl.redChannel
    const config = await pluginAPI.getConfig()
    const IsGroup = config.Send2Who.length === 0 ? 1 : (config.Send2Who[0] === "1" ? 8 : 2);
    const receiver = config.Send2Who.length === 0 || config.Send2Who[0] === "1" ? authData.uid : config.Send2Who[0];


    //先判断黑白名单的类型
    switch (config.blockType) {
        case "0" :
            break;//说明未启用黑白名单

        case "1": {//说明是白名单
            if (!((config.listenKeyWords.length === 0 || config.listenKeyWords.some(word => title.includes(word))) && (config.listenGroups.length === 0 || config.listenGroups.includes(peerUid)) && (config.listenQQs.length === 0 || config.listenQQs.includes(sendUin)))) {
                pluginLog("未同时满足关键字、白名单群和发送者条件，不抢红包")
                return
            }
            break
        }
        case "2": {//说明是黑名单
            if (config.avoidKeyWords.some(word => title.includes(word)) || config.avoidGroups.includes(peerUid) || config.avoidQQs.includes(sendUin)) {
                pluginLog("检测到黑名单关键字、在黑名单群内或发送者在黑名单内，不抢红包")
                return
            }
            break
        }
    }


    if (config.notificationonly) {
        pluginLog("检测到已开启仅通知模式")
        await pluginAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
            "msgId": "0",
            "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
            "msgElements": [{
                "elementType": 1,
                "elementId": "",
                "textElement": {
                    "content": `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包！`,
                    "atType": 0,
                    "atUid": "",
                    "atTinyId": "",
                    "atNtUid": ""
                }
            }],
            "msgAttributeInfos": new Map()
        }, null)
        return
    }

    //还要检测是否开启特定时段禁止抢红包功能。
    if (config.stopGrabByTime) {
        //检测时间段
        if (isCurrentTimeInRange(config.stopGrabStartTime, config.stopGrabEndTime)) return
    }
    //检测是否在暂时监听名单内
    if (antiDetectGroups.includes(peerUid)) {
        pluginLog("当前群在暂停收红包的群内！不抢红包！")
        return
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
        await pluginAPI.invokeNative('ns-ntApi', 'nodeIKernelMsgService/sendMsg', false, {
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

    const result = await pluginAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/grabRedBag", false, {
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

    //下面给自己发送提示消息
    if (config.useSelfNotice) {
        pluginLog("准备给自己发送消息")
        if (result.grabRedBagRsp.recvdOrder.amount === "0")
            await pluginAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": `[Grab RedBag]抢来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包时失败！红包已被领完！`,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }],
                "msgAttributeInfos": new Map()
            }, null)
        else {
            //这里先准备好需要用到的数据
            //peerName群名、peerUid群号、senderName发红包的人名、sendUin发红包的人的Q号
            let amount = parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100

            //检测收到的是不是一分钱
            if (amount === 0.01 && config.antiDetect) {
                pluginLog("检测到一分钱红包！不抢红包！")
                //暂时不抢这个群的红包
                antiDetectGroups.push(peerUid)
                //设置定时任务，定时删掉数组中的群
                setTimeout(() => {
                    antiDetectGroups = antiDetectGroups.filter(pausedGroupUid => pausedGroupUid !== peerUid);
                    pluginLog(`恢复监听群${peerName}(${peerUid})`)
                }, antiDetectTime)
            }

            //定义需要发送的消息
            const msg = config.receiveMsg.replace("%peerName%", peerName)
                .replace("%peerUid%", peerUid)
                .replace("%senderName%", senderName)
                .replace("%sendUin%", sendUin)
                .replace("%amount%", amount.toFixed(2))

            await pluginAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": msg,
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

    //下面进行抢到红包的后续处理。没抢到则直接返回。
    if (result.grabRedBagRsp.recvdOrder.amount === "0") return

    //下面给对方发送消息
    if (config.thanksMsgs.length !== 0 && sendUin !== recvUin) {//给对方发送消息。抢自己的红包不发送消息
        await sleep(randomDelayForSend)
        pluginLog("准备给对方发送消息,随机延迟" + randomDelayForSend + "ms")
        await pluginAPI.invokeNative('ns-ntApi', "nodeIKernelMsgService/sendMsg", false, {
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

    //抢完红包之后，记录下当前已抢的红包数量和总额
    pluginAPI.addTotalRedBagNum(1);
    pluginAPI.addTotalAmount(parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
}

function isCurrentTimeInRange(startTimeStr, endTimeStr) {
    // 获取当前时间
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // 将当前时间转换为分钟
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // 将开始和结束时间转换为分钟
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    // 处理跨午夜的情况
    if (startTimeInMinutes < endTimeInMinutes) {
        // 时间段不跨越午夜
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
    } else {
        // 时间段跨越午夜
        return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
    }
}