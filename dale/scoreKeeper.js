var ScoreKeeper;

ScoreKeeper = (function() {
  function ScoreKeeper(robot1) {
    this.robot = robot1;
    this.cache = {
      scoreLog: {},
      scores: {}
    };

    this.robot.on('open', (function(_this) {
       return function() {
         var base, base1;
         (base = _this.robot.data.scoreKeeper).scoreLog || (base.scoreLog = {});
         (base1 = _this.robot.data.scoreKeeper).scores || (base1.scores = {});
         _this.cache.scores = _this.robot.data.scoreKeeper.scores || {};
         return _this.cache.scoreLog = _this.robot.data.scoreKeeper.scoreLog || {};
       };
    })(this));
  }

  ScoreKeeper.prototype.getUser = function(user) {
    var base;
    (base = this.cache.scores)[user] || (base[user] = 0);
    return user;
  };

  ScoreKeeper.prototype.saveUser = function(user, from) {
    this.saveScoreLog(user, from);
    this.robot.data.scoreKeeper.scores[user] = this.cache.scores[user];
    this.robot.data.scoreKeeper.scoreLog[user] = this.cache.scoreLog[user];
		this.robot.persist.writePersistFile(this.robot.data)
    return this.cache.scores[user];
  };

  ScoreKeeper.prototype.add = function(user, from) {
    if (this.validate(user, from)) {
      user = this.getUser(user);
      this.cache.scores[user]++;
      return this.saveUser(user, from);
    }
  };

  ScoreKeeper.prototype.subtract = function(user, from) {
    if (this.validate(user, from)) {
      user = this.getUser(user);
      this.cache.scores[user]--;
      return this.saveUser(user, from);
    }
  };

  ScoreKeeper.prototype.scoreForUser = function(user) {
    user = this.getUser(user);
    return this.cache.scores[user];
  };

  ScoreKeeper.prototype.saveScoreLog = function(user, from) {
    var base;
    (base = this.cache.scoreLog)[from] || (base[from] = {});
    return this.cache.scoreLog[from][user] = new Date();
  };

  ScoreKeeper.prototype.isSpam = function(user, from) {
    var base, dateSubmitted, messageIsSpam;
    (base = this.cache.scoreLog)[from] || (base[from] = {});
    if (!this.cache.scoreLog[from][user]) {
      return false;
    }
    dateSubmitted = this.cache.scoreLog[from][user];
    messageIsSpam = dateSubmitted.setMinutes(dateSubmitted.getMinutes() + 5) > new Date();
    if (!messageIsSpam) {
      delete this.cache.scoreLog[from][user];
    }
    return messageIsSpam;
  };

  ScoreKeeper.prototype.validate = function(user, from) {
		console.log("in validate: user, from");
		console.log(user);
		console.log(from);
		console.log(user !== from);
		console.log(user != from);
    // return user !== from && user !== "" && !this.isSpam(user, from);
    return user !== from && user !== "";
  };

  ScoreKeeper.prototype.length = function() {
    return this.cache.scoreLog.length;
  };

  ScoreKeeper.prototype.top = function(amount) {
    var name, ref, score, tops;
    tops = [];
    ref = this.cache.scores;
    for (name in ref) {
      score = ref[name];
      tops.push({
        name: name,
        score: score
      });
    }
    return tops.sort(function(a, b) {
      return b.score - a.score;
    }).slice(0, amount);
  };

  return ScoreKeeper;

})();

module.exports = function(robot) {
  var scoreKeeper;
  scoreKeeper = new ScoreKeeper(robot);

  robot.on('message', function(message){
    var channel, channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
    channel = robot.getChannelGroupOrDMByID(message.channel);
    user = robot.getUserByID(message.user);
    response = '';
    type = message.type, ts = message.ts, text = message.text;
    channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
    channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
    userName = (user != null ? user.name : void 0) != null ? user.name : "UNKNOWN_USER";
    console.log("ScoreKeeper received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
    if (type === 'message' && (text != null) && (channel != null)) {
		  // First attempt to match "<name>++"
      var match = /([\w\s]+)([\W\S]*)?(\+\+)$/i.exec(text);
      if(match) {
        var from, name, newScore;
        name = match[1].trim().toLowerCase();
        newScore = scoreKeeper.add(name, userName);
        if (newScore != null) {
          return channel.send(name + " has " + newScore + " points.");
        }
        return console.log("ScoreKeeper attempted to add for: " + name + ", however newScore was set to null");
      }

		  // Next attempt to match "<name>--"
      match = /([\w\s]+)([\W\S]*)?(\-\-)$/i.exec(text);
      if(match) {
        var from, name, newScore;
        name = match[1].trim().toLowerCase();
        newScore = scoreKeeper.subtract(name, userName);
        if (newScore != null) {
          return channel.send(name + " has " + newScore + " points.");
        }
        return console.log("ScoreKeeper attempted to subtract for: " + name + ", however newScore was set to null");
      }
    }
  });

  // robot.hear(/([\w\s]+)([\W\S]*)?(\+\+)$/i, function(msg) {
  //   var from, name, newScore;
  //   name = msg.match[1].trim().toLowerCase();
  //   from = msg.message.user.name.toLowerCase();
  //   newScore = scoreKeeper.add(name, from);
  //   if (newScore != null) {
  //     return msg.send(name + " has " + newScore + " points.");
  //   }
  // });
  // robot.hear(/([\w\s]+)([\W\S]*)?(\-\-)$/i, function(msg) {
  //   var from, name, newScore;
  //   name = msg.match[1].trim().toLowerCase();
  //   from = msg.message.user.name.toLowerCase();
  //   newScore = scoreKeeper.subtract(name, from);
  //   if (newScore != null) {
  //     return msg.send(name + " has " + newScore + " points.");
  //   }
  // });
  // robot.respond(/score (for\s)?(.*)/i, function(msg) {
  //   var name, score;
  //   name = msg.match[2].trim().toLowerCase();
  //   score = scoreKeeper.scoreForUser(name);
  //   return msg.send(name + " has " + score + " points.");
  // });
  // return robot.respond(/top (\d+)/i, function(msg) {
  //   var amount, i, j, message, ref, tops;
  //   amount = msg.match[1] >> 0;
  //   tops = scoreKeeper.top(amount);
  //   message = "\n``````````````````\nTOP " + tops.length + ":\n";
  //   for (i = j = 0, ref = tops.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
  //     message += (i + 1) + ". " + tops[i].name + " : " + tops[i].score + "\n";
  //   }
  //   message += "``````````````````";
  //   return msg.send(message);
  // });
};

// ---
// generated by coffee-script 1.9.2
