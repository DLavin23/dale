var User;

User = (function() {
  function User(_client, data) {
    var k;
    this._client = _client;
    if (data == null) {
      data = {};
    }
    for (k in data || {}) {
      this[k] = data[k];
    }
  }

  return User;

})();

module.exports = User;
