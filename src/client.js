var Bot, Channel, Client, DM, EventEmitter, Group, Log, Message, Team, User, WebSocket, https, querystring,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

https = require('https');

querystring = require('querystring');

WebSocket = require('ws');

Log = require('log');

EventEmitter = require('events').EventEmitter;

User = require('./user');

Team = require('./team');

Channel = require('./channel');

Group = require('./group');

DM = require('./dm');

Message = require('./message');

Bot = require('./bot');

Client = (function(_super) {
  __extends(Client, _super);

  Client.prototype.host = 'api.slack.com';

  function Client(token, autoReconnect, autoMark) {
    this.token = token;
    this.autoReconnect = autoReconnect != null ? autoReconnect : true;
    this.autoMark = autoMark != null ? autoMark : false;
    this._onSetStatus = __bind(this._onSetStatus, this);
    this._onSetActive = __bind(this._onSetActive, this);
    this._onSetPresence = __bind(this._onSetPresence, this);
    this._onCreateGroup = __bind(this._onCreateGroup, this);
    this._onOpenDM = __bind(this._onOpenDM, this);
    this._onJoinChannel = __bind(this._onJoinChannel, this);
    this._onLogin = __bind(this._onLogin, this);
    this.authenticated = false;
    this.connected = false;
    this.self = null;
    this.team = null;
    this.channels = {};
    this.dms = {};
    this.groups = {};
    this.users = {};
    this.bots = {};
    this.socketUrl = null;
    this.ws = null;
    this._messageID = 0;
    this._pending = {};
    this._connAttempts = 0;
    this.logger = new Log(process.env.SLACK_LOG_LEVEL || 'info');
  }

  Client.prototype.login = function() {
    this.logger.info('Connecting...');
    return this._apiCall('rtm.start', {
      agent: 'node-slack'
    }, this._onLogin);
  };

  Client.prototype._onLogin = function(data) {
    var c, g, i, k, u;
    if (data) {
      if (!data.ok) {
        this.emit('error', data.error);
        this.authenticated = false;
        if (this.autoReconnect) {
          return this.reconnect();
        }
      } else {
        this.authenticated = true;
        this.self = new User(this, data.self);
        this.team = new Team(this, data.team.id, data.team.name, data.team.domain);
        this.socketUrl = data.url;
        for (k in data.users) {
          u = data.users[k];
          this.users[u.id] = new User(this, u);
        }
        for (k in data.channels) {
          c = data.channels[k];
          this.channels[c.id] = new Channel(this, c);
        }
        for (k in data.ims) {
          i = data.ims[k];
          this.dms[i.id] = new DM(this, i);
        }
        for (k in data.groups) {
          g = data.groups[k];
          this.groups[g.id] = new Group(this, g);
        }
        this.emit('loggedIn', this.self, this.team);
        return this.connect();
      }
    } else {
      this.emit('error', data);
      this.authenticated = false;
      if (this.autoReconnect) {
        return this.reconnect();
      }
    }
  };

  Client.prototype.connect = function() {
    console.log(this.socketUrl);
    if (!this.socketUrl) {
      return false;
    } else {
      this.ws = new WebSocket(this.socketUrl);
      this.ws.on('open', (function(_this) {
        return function() {
          _this._connAttempts = 0;
          _this._lastPong = Date.now();
          return _this._pongTimeout = setInterval(function() {
            if (!_this.connected) {
              return;
            }
            _this.logger.debug('ping');
            _this._send({
              "type": "ping"
            });
            if ((_this._lastPong != null) && Date.now() - _this._lastPong > 10000) {
              _this.logger.error("Last pong is too old: %d", (Date.now() - _this._lastPong) / 1000);
              _this.authenticated = false;
              _this.connected = false;
              return _this.reconnect();
            }
          }, 5000);
        };
      })(this));
      this.ws.on('message', (function(_this) {
        return function(data, flags) {
          return _this.onMessage(JSON.parse(data));
        };
      })(this));
      this.ws.on('error', (function(_this) {
        return function(error) {
          return _this.emit('error', error);
        };
      })(this));
      this.ws.on('close', (function(_this) {
        return function() {
          _this.emit('close');
          _this.connected = false;
          return _this.socketUrl = null;
        };
      })(this));
      this.ws.on('ping', (function(_this) {
        return function(data, flags) {
          return _this.ws.pong;
        };
      })(this));
      return true;
    }
  };

  Client.prototype.disconnect = function() {
    if (!this.connected) {
      return false;
    } else {
      this.autoReconnect = false;
      if (this._pongTimeout) {
        clearInterval(this._pongTimeout);
        this._pongTimeout = null;
      }
      this.ws.close();
      return true;
    }
  };

  Client.prototype.reconnect = function() {
    var timeout;
    if (this._pongTimeout) {
      clearInterval(this._pongTimeout);
      this._pongTimeout = null;
    }
    this.authenticated = false;
    if (this.ws) {
      this.ws.close();
    }
    this._connAttempts++;
    timeout = this._connAttempts * 1000;
    this.logger.info("Reconnecting in %dms", timeout);
    return setTimeout((function(_this) {
      return function() {
        _this.logger.info('Attempting reconnect');
        return _this.login();
      };
    })(this), timeout);
  };

  Client.prototype.joinChannel = function(name, callback) {
    var params;
    params = {
      "name": name
    };
    return this._apiCall('channels.join', params, (function(_this) {
      return function() {
        _this._onJoinChannel.apply(_this, arguments);
        return typeof callback === "function" ? callback.apply(null, arguments) : void 0;
      };
    })(this));
  };

  Client.prototype._onJoinChannel = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.openDM = function(user_id, callback) {
    var params;
    params = {
      "user": user_id
    };
    return this._apiCall('im.open', params, (function(_this) {
      return function() {
        _this._onOpenDM.apply(_this, arguments);
        return typeof callback === "function" ? callback.apply(null, arguments) : void 0;
      };
    })(this));
  };

  Client.prototype._onOpenDM = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.createGroup = function(name, callback) {
    var params;
    params = {
      "name": name
    };
    return this._apiCall('groups.create', params, (function(_this) {
      return function() {
        _this._onCreateGroup.apply(_this, arguments);
        return typeof callback === "function" ? callback.apply(null, arguments) : void 0;
      };
    })(this));
  };

  Client.prototype._onCreateGroup = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.setPresence = function(presence, callback) {
    var params;
    if (presence === !'away' && presence === !'active') {
      return null;
    }
    params = {
      "presence": presence
    };
    return this._apiCall('presence.set', params, (function(_this) {
      return function() {
        _this._onSetPresence.apply(_this, arguments);
        return typeof callback === "function" ? callback.apply(null, arguments) : void 0;
      };
    })(this));
  };

  Client.prototype._onSetPresence = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.setActive = function(callback) {
    var params;
    params = {};
    return this._apiCall('users.setActive', params, (function(_this) {
      return function() {
        _this._onSetActive.apply(_this, arguments);
        return typeof callback === "function" ? callback.apply(null, arguments) : void 0;
      };
    })(this));
  };

  Client.prototype._onSetActive = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.setStatus = function(status, callback) {
    var params;
    params = {
      "status": status
    };
    return this._apiCall('status.set', params, (function(_this) {
      return function() {
        _this._onSetStatus.apply(_this, arguments);
        return callback.apply(null, arguments);
      };
    })(this));
  };

  Client.prototype._onSetStatus = function(data) {
    return this.logger.debug(data);
  };

  Client.prototype.getUserByID = function(id) {
    return this.users[id];
  };

  Client.prototype.getUserByName = function(name) {
    var k;
    for (k in this.users) {
      if (this.users[k].name === name) {
        return this.users[k];
      }
    }
  };

  Client.prototype.getChannelByID = function(id) {
    return this.channels[id];
  };

  Client.prototype.getChannelByName = function(name) {
    var k;
    name = name.replace(/^#/, '');
    for (k in this.channels) {
      if (this.channels[k].name === name) {
        return this.channels[k];
      }
    }
  };

  Client.prototype.getDMByID = function(id) {
    return this.dms[id];
  };

  Client.prototype.getDMByName = function(name) {
    var k;
    for (k in this.dms) {
      if (this.dms[k].name === name) {
        return this.dms[k];
      }
    }
  };

  Client.prototype.getGroupByID = function(id) {
    return this.groups[id];
  };

  Client.prototype.getGroupByName = function(name) {
    var k;
    for (k in this.groups) {
      if (this.groups[k].name === name) {
        return this.groups[k];
      }
    }
  };

  Client.prototype.getChannelGroupOrDMByID = function(id) {
    if (id[0] === 'C') {
      return this.getChannelByID(id);
    } else {
      if (id[0] === 'G') {
        return this.getGroupByID(id);
      } else {
        return this.getDMByID(id);
      }
    }
  };

  Client.prototype.getChannelGroupOrDMByName = function(name) {
    var channel, group;
    channel = this.getChannelByName(name);
    if (!channel) {
      group = this.getGroupByName(name);
      if (!group) {
        return this.getDMByName(name);
      } else {
        return group;
      }
    } else {
      return channel;
    }
  };

  Client.prototype.getUnreadCount = function() {
    var channel, count, dm, group, id, _ref, _ref1, _ref2;
    count = 0;
    _ref = this.channels;
    for (id in _ref) {
      channel = _ref[id];
      if (channel.unread_count != null) {
        count += channel.unread_count;
      }
    }
    _ref1 = this.ims;
    for (id in _ref1) {
      dm = _ref1[id];
      if (dm.unread_count != null) {
        count += dm.unread_count;
      }
    }
    _ref2 = this.groups;
    for (id in _ref2) {
      group = _ref2[id];
      if (group.unread_count != null) {
        count += group.unread_count;
      }
    }
    return count;
  };

  Client.prototype.getChannelsWithUnreads = function() {
    var channel, dm, group, id, unreads, _ref, _ref1, _ref2;
    unreads = [];
    _ref = this.channels;
    for (id in _ref) {
      channel = _ref[id];
      if (channel.unread_count > 0) {
        unreads.push(channel);
      }
    }
    _ref1 = this.ims;
    for (id in _ref1) {
      dm = _ref1[id];
      if (dm.unread_count > 0) {
        unreads.push(dm);
      }
    }
    _ref2 = this.groups;
    for (id in _ref2) {
      group = _ref2[id];
      if (group.unread_count > 0) {
        unreads.push(group);
      }
    }
    return unreads;
  };

  Client.prototype.onStarAdded = function(data) {
    return this.emit('star_added', data);
  };

  Client.prototype.onStarRemoved = function(data) {
    return this.emit('star_removed', data);
  };

  Client.prototype.onMessage = function(message) {
    var channel, k, m, u, user, _ref, _results;
    this.emit('raw_message', message);
    switch (message.type) {
      case "hello":
        this.connected = true;
        return this.emit('open');
      case "presence_change":
        u = this.getUserByID(message.user);
        if (u) {
          this.emit('presenceChange', u, message.presence);
          return u.presence = message.presence;
        }
        break;
      case "manual_presence_change":
        return this.self.presence = message.presence;
      case "status_change":
        u = this.getUserByID(message.user);
        if (u) {
          this.emit('statusChange', u, message.status);
          return u.status = message.status;
        }
        break;
      case "error":
        return this.emit('error', message.error);
      case "message":
        if (message.reply_to) {
          if (this._pending[message.reply_to]) {
            delete this._pending[message.reply_to];
          } else {
            return;
          }
        }
        this.logger.debug(message);
        m = new Message(this, message);
        this.emit('message', m);
        channel = this.getChannelGroupOrDMByID(message.channel);
        if (channel) {
          return channel.addMessage(m);
        }
        break;
      case "channel_marked":
      case "im_marked":
      case "group_marked":
        channel = this.getChannelGroupOrDMByID(message.channel);
        if (channel) {
          channel.last_read = message.ts;
          channel._recalcUnreads();
          return this.emit('channelMarked', channel, message.ts);
        }
        break;
      case "user_typing":
        user = this.getUserByID(message.user);
        channel = this.getChannelGroupOrDMByID(message.channel);
        if (user && channel) {
          this.emit('userTyping', user, channel);
          return channel.startedTyping(user.id);
        } else if (channel) {
          return this.logger.error("Could not find user " + message.user + " for user_typing");
        } else if (user) {
          return this.logger.error("Could not find channel " + message.channel + " for user_typing");
        } else {
          return this.logger.error("Could not find channel/user " + message.channel + "/" + message.user + " for user_typing");
        }
        break;
      case "team_join":
      case "user_change":
        u = message.user;
        this.emit('userChange', u);
        return this.users[u.id] = new User(this, u);
      case "channel_joined":
        return this.channels[message.channel.id] = new Channel(this, message.channel);
      case "channel_left":
        if (this.channels[message.channel]) {
          _results = [];
          for (k in this.channels[message.channel]) {
            if (k !== "id" && k !== "name" && k !== "created" && k !== "creator" && k !== "is_archived" && k !== "is_general") {
              delete this.channels[message.channel][k];
            }
            _results.push(this.channels[message.channel].is_member = false);
          }
          return _results;
        }
        break;
      case "channel_created":
        return this.channels[message.channel.id] = new Channel(this, message.channel);
      case "channel_deleted":
        return delete this.channels[message.channel];
      case "channel_rename":
        return this.channels[message.channel.id] = new Channel(this, message.channel);
      case "channel_archive":
        if (this.channels[message.channel]) {
          return this.channels[message.channel].is_archived = true;
        }
        break;
      case "channel_unarchive":
        if (this.channels[message.channel]) {
          return this.channels[message.channel].is_archived = false;
        }
        break;
      case "im_created":
        return this.dms[message.channel.id] = new DM(this, message.channel);
      case "im_open":
        if (this.dms[message.channel]) {
          return this.dms[message.channel].is_open = true;
        }
        break;
      case "im_close":
        if (this.dms[message.channel]) {
          return this.dms[message.channel].is_open = false;
        }
        break;
      case "group_joined":
        return this.groups[message.channel.id] = new Group(this, message.channel);
      case "group_close":
        if (this.groups[message.channel]) {
          return this.groups[message.channel].is_open = false;
        }
        break;
      case "group_open":
        if (this.groups[message.channel]) {
          return this.groups[message.channel].is_open = true;
        }
        break;
      case "group_left":
      case "group_deleted":
        return delete this.groups[message.channel];
      case "group_archive":
        if (this.groups[message.channel]) {
          return this.groups[message.channel].is_archived = true;
        }
        break;
      case "group_unarchive":
        if (this.groups[message.channel]) {
          return this.groups[message.channel].is_archived = false;
        }
        break;
      case "group_rename":
        return this.groups[message.channel.id] = new Channel(this, message.channel);
      case "pref_change":
        return this.self.prefs[message.name] = message.value;
      case "team_pref_change":
        return this.team.prefs[message.name] = message.value;
      case "team_rename":
        return this.team.name = message.name;
      case "team_domain_change":
        return this.team.domain = message.domain;
      case "bot_added":
      case "bot_changed":
        return this.bots[message.bot.id] = new Bot(this, message.bot);
      case "bot_removed":
        if (this.bots[message.bot.id]) {
          return this.emit('botRemoved', this.bots[message.bot.id]);
        }
        break;
      case 'star_added':
        return this.emit('star_added', message);
      case 'star_removed':
        return this.emit('star_removed', message);
      default:
        if (message.reply_to) {
          if (message.type === 'pong') {
            this.logger.debug('pong');
            this._lastPong = Date.now();
            return delete this._pending[message.reply_to];
          } else if (message.ok) {
            this.logger.debug("Message " + message.reply_to + " was sent");
            if (this._pending[message.reply_to]) {
              m = this._pending[message.reply_to];
              m._onMessageSent(message);
              channel = this.getChannelGroupOrDMByID(m);
              if (channel) {
                channel.addMessage(m);
              }
              this.emit('messageSent', m);
              return delete this._pending[message.reply_to];
            }
          } else {
            return this.emit('error', message.error != null ? message.error : message);
          }
        } else {
          if ((_ref = message.type) !== "file_created" && _ref !== "file_shared" && _ref !== "file_unshared" && _ref !== "file_comment" && _ref !== "file_public" && _ref !== "file_comment_edited" && _ref !== "file_comment_deleted" && _ref !== "file_change" && _ref !== "file_deleted" && _ref !== "star_added" && _ref !== "star_removed") {
            this.logger.debug('Unknown message type: ' + message.type);
            return this.logger.debug(message);
          }
        }
    }
  };

  Client.prototype._send = function(message) {
    if (!this.connected) {
      return false;
    } else {
      message.id = ++this._messageID;
      this._pending[message.id] = message;
      this.ws.send(JSON.stringify(message));
      return message;
    }
  };

  Client.prototype._apiCall = function(method, params, callback) {
    var options, post_data, req;
    params['token'] = this.token;
    post_data = querystring.stringify(params);
    options = {
      hostname: this.host,
      method: 'POST',
      path: '/api/' + method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    };
    req = https.request(options);
    req.on('response', (function(_this) {
      return function(res) {
        var buffer;
        buffer = '';
        res.on('data', function(chunk) {
          return buffer += chunk;
        });
        return res.on('end', function() {
          var value;
          if (callback != null) {
            if (res.statusCode === 200) {
              value = JSON.parse(buffer);
              return callback(value);
            } else {
              return callback({
                'ok': false,
                'error': 'API response: ' + res.statusCode
              });
            }
          }
        });
      };
    })(this));
    req.on('error', (function(_this) {
      return function(error) {
        if (callback != null) {
          return callback({
            'ok': false,
            'error': error.errno
          });
        }
      };
    })(this));
    req.write('' + post_data);
    return req.end();
  };

  return Client;

})(EventEmitter);

module.exports = Client;
