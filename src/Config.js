const fs = require('fs');
const {pluginLog} = require("./utils/logUtils")
const path = require("path");

class Config {
    static config = {
        isActive: true,//是否开启抢红包功能
        notificationonly: false,//是否仅通知
        antiDetect:false,//是否启用一分钱检测
        useRandomDelay: false,//是否启用随机延迟
        delayLowerBound: "",
        delayUpperBound: "",
        useRandomDelayForSend: false,//是否启用随机延迟，给对方发送消息
        delayLowerBoundForSend: "",
        delayUpperBoundForSend: "",
        avoidKeyWords: [],//屏蔽词
        avoidGroups: [],//屏蔽群聊
        avoidQQs: [],//屏蔽QQ
        listenKeyWords: [],//白名单词语
        listenGroups: [],//白名单群聊
        listenQQs: [],//白名单QQ
        Send2Who: [],//回馈QQ群号
        useSelfNotice: true,//抢到红包后是否给自己发送消息
        // isSendToPhone: false,//抢红包后是否发送到手机
        thanksMsgs: [],//抢到红包之后的感谢消息
        isActiveAllGroups: false,//是否监听所有的群聊
        blockType: "0",//0不启用，1白名单2黑名单
        totalRedBagNum:0,//总共抢到的红包数量
        totalAmount:0,//总共抢到的金额
        stopGrabByTime:false,//根据时间停止抢红包
        stopGrabStartTime:"00:00",//暂停抢红包的开始时间
        stopGrabEndTime:"00:00",//暂停抢红包的结束时间
        notifyOnBlocked: false,//黑白名单拦截时是否发送提醒
        receiveMsg: "[Grab RedBag]收到来自群\"%peerName%(%peerUid%)\"成员:\"%senderName%(%sendUin%)\"发送的的红包%amount%元"
    }

    static initConfig(pluginPath, configPath) {
        this.config.pluginPath = pluginPath
        this.config.configPath = configPath
        pluginLog('现在执行initConfig方法')
        if (!(fs.existsSync(this.config.configPath))) {//如果文件目录不存在，就创建文件
            fs.mkdirSync(path.dirname(this.config.configPath),{ recursive: true })
            pluginLog('第一次启动，准备创建配置文件')
            pluginLog('插件路径为' + this.config.pluginPath)
            fs.writeFileSync(this.config.configPath, JSON.stringify(this.config, null, 4), 'utf-8')
            pluginLog('配置文件创建成功')
        }
        Object.assign(this.config, JSON.parse(fs.readFileSync(this.config.configPath, 'utf-8')))
        // 防止文件中的旧路径覆盖正确路径
        this.config.pluginPath = pluginPath
        this.config.configPath = configPath
        pluginLog('当前的配置文件为')
        console.log(this.config)
        pluginLog('配置初始化完毕')
    }

    static getConfig() {
        try {
            return this.config
        } catch (e) {
            pluginLog('读取配置文件失败')
        }
    }

    static setConfig(newConfig) {
        try {
            // 使用 Object.assign() 更新 config 对象的属性
            pluginLog("变化的属性为" + JSON.stringify(newConfig))
            Object.assign(this.config, newConfig);
            // 写入配置文件
            fs.writeFileSync(this.config.configPath, JSON.stringify(this.config, null, 4), 'utf-8')
            pluginLog('修改配置文件成功,当前配置如下')
            pluginLog(JSON.stringify(this.config, null, 4))
            return this.config
        } catch (e) {
            pluginLog("发生错误!")
            console.log(e)
        }
    }
}

module.exports = {Config}
