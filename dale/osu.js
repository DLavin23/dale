module.exports = function(slackInst) {
  var sloopy = "https://soundcloud.com/jimkanicki/ohio-state-hang-on-sloopy";

  slackInst.on('message', function(message) {
    var channel, channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
    channel = slackInst.getChannelGroupOrDMByID(message.channel);
    user = slackInst.getUserByID(message.user);
    response = '';
    type = message.type, ts = message.ts, text = message.text;
    channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
    channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
    userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";
    console.log("OSU received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
    if (type === 'message' && (text != null) && (channel != null)) {
      if (text.toLowerCase().indexOf("hang on sloopy") > -1) {
        response = ":osu: " + sloopy;
        channel.send(response);
        return console.log("@" + slackInst.self.name + " responded with \"" + response + "\"");
      }
    } else {
      typeError = type !== 'message' ? "unexpected type " + type + "." : null;
      textError = text == null ? 'text was undefined.' : null;
      channelError = channel == null ? 'channel was undefined.' : null;
      errors = [typeError, textError, channelError].filter(function(element) {
        return element !== null;
      }).join(' ');
      return console.log("@" + slackInst.self.name + " could not respond. " + errors);
    }
  });
};
