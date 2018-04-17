/*
 By Tomas Pollak <tomas@forkhq.com>.
 MIT License.
*/

const fs    = require('fs'),
      os    = require('os'),
      path  = require('path'),
      spawn = require('child_process').spawn;

var Dialog = module.exports = {

  err: function(str, title, callback) {
    this.show('error', str, title, callback);
  },

  info: function(str, title, callback) {
    this.show('info', str, title, callback);
  },

  warn: function(str, title, callback) {
    this.show('warning', str, title, callback);
  },

  show: function(type, str, title, callback) {
    if (!str || str.trim() == '')
      throw new Error('Empty or no string passed!');

    if (typeof title == 'function') {
      callback = title;
      title = null;
    }

    var cmd     = [],
        os_name = process.platform,
        title   = title ? title : 'Important';

    var str = (str + '').replace(/([.?*+^$[\]\\(){}<>|`-])/g, '\$1');

    // return codes for zenity are 0 on "OK" 
    // and 1 on "No/Cancel" or close window
    if (os_name === 'linux') {

      str = str.replace(/[<>]/g, '');
      cmd.push('zenity');
      cmd.push('--' + type);
      cmd.push('--text') && cmd.push(str);
      cmd.push('--title') && cmd.push(title);
      if (str.length > 30) cmd.push('--width') && cmd.push('300');
	  this.run(cmd, callback);
	  
    // return codes in macOS are exactly as in Linux
    // 0 for 'OK', 1 for 'Cancel'
    } else if (os_name === 'darwin') {
      
      switch (type) { // Set dialog icon
        case 'error':
          type = 0;
          break;
        case 'info':
          type = 1;
          break;
        case 'warning':
          type = 2;
          break;
        default:
          type = '';
      }

      str = str.replace(/"/g, "'"); // double quotes to single quotes
      cmd.push('osascript') && cmd.push('-e');
      var script = 'tell app \"System Events\" to display dialog ';
      script += '\"' + str + '\" with title \"' + title + '\" buttons \"OK\"';
      script += ' with icon ' + type;
      cmd.push(script);
      this.run(cmd, callback);
	  
    } else if (os_name === 'win32') { // windows

      // return codes for Windows (default value minus 1)
      // defaults in https://www.tutorialspoint.com/vbscript/vbscript_dialog_boxes.htm

      // 0 - vbOK
      // 1 - vbCancel
      // 2 - vbAbort
      // 3 - vbRetry
      // 4 - vbIgnore
      // 5 - vbYes
      // 6 - vbNo
     
      switch (type) { // Set MsgBox icon
        case 'error':
          type = 16;
          break;
        case 'info':
          type = 64;
          break;
        case 'warning':
          type = 48;
          break;
        default:
          type = 0;
      }

      str = str.replace(/"/g, "'"); // double quotes to single quotes
     
      // msgbox.vbs script from http://stackoverflow.com/questions/774175
	  
	  let vbScriptPath = path.join(__dirname, 'msgbox.vbs');
	  // Detect packaged applications that save the script in a snapshot that cannot be accessed from cscript
	  console.log(`Script in: ${vbScriptPath}`);
	  fs.stat(vbScriptPath, (err, stats) => {
		console.log(`Script located: ${err || stats}`);
	    if (err) {
		  callback && callback(err && err.code, '', err && err.message);
		  return;
	    }
		cmd.push('cscript');
		cmd.push('//NOLOGO');
		cmd.push(vbScriptPath);
		cmd.push(str) && cmd.push(type) && cmd.push(title);
		console.log(`Composed cmd: ${cmd.join(' ')}`);
		if (stats.ino !== 0) {
          this.run(cmd, callback);
		} else {
			console.log(`Not a real inode`);
			console.log(`Create ${os.tmpdir()}/${require.module}`);
		  fs.mkdtemp(path.join(os.tmpdir(), 'dialog-'), (err, folder) => {
			let vbDestination = path.join(folder, 'msgbox.vbs');
			let callbackClean = (code, stdout, stderr) => {
				fs.unlink(vbDestination, (err) => {
					console.log(`rm: ${err}`);
					fs.rmdir(folder, (err) => {
						console.log(`rmdir: ${err}`);
						callback && callback(code, stdout, stderr);
					});
				});
			};
			console.log(`Temp dir created: ${err || folder}`);
			if (err) {
			  callbackClean(err && err.code, '', err && err.message);
			  return;
			}
			fs.readFile(vbScriptPath, (err, data) => {
				  if (err) {
					callbackClean(err && err.code, '', err && err.message);
					return;
				  }
				fs.writeFile(vbDestination, data, (err) => {
				  console.log(`Script copied: ${err || vbDestination}`);	
				  if (err) {
					callbackClean(err && err.code, '', err && err.message);
					return;
				  }
				  cmd[2] = vbDestination;
				  this.run(cmd, callbackClean);
				});
			});
		  });
		}
	  });
    } else {
	  callback && callback(-1, '', 'Unsupported platform');
	}
  },

  run: function(cmd, cb) {
    var bin    = cmd[0],
        args   = cmd.splice(1),
        stdout = '',
        stderr = '';

    var child = spawn(bin, args);

    child.stdout.on('data', function(data) {
      stdout += data.toString();
    })

    child.stderr.on('data', function(data) {
      stderr += data.toString();
    })

    child.on('exit', function(code) {
      cb && cb(code, stdout, stderr);
    })
  }

}
