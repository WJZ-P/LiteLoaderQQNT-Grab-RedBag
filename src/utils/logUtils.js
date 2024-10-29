const pluginName = hexToAnsi('#e13045') + "[Grab-Redpack] " + '\x1b[0m'
function hexToAnsi(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}
function pluginLog(message){
    return console.log(pluginName+message)
}

module.exports={pluginLog}