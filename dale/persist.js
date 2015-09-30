fs = require('fs');
module.exports = {
  writePersistFile: function(obj) {
    fs.writeFile('./persist.json', JSON.stringify(obj), function(err) {
      if(err) {
        console.log("Error in writing persist file: " + err);
      } else {
        console.log("Wrote persist file successfully, persist.json now:");
				console.log(JSON.stringify(obj));
      }
    });
  },
       
  readPersistFile: function(callback) {
	  fs.readFile('./persist.json', 'utf-8', function (err,data) {
		  if (err) {
			  return console.log(err);
		  }
		  callback(JSON.parse(data));
	  });
  }
};
