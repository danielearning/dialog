/*
 * Daniel Martínez Contador <danielearning@gmail.com>.
 * MIT License.
 * 
 * Original licenses follow:
 */
/*
 * By Tomas Pollak <tomas@forkhq.com>.
 * MIT License.
 */

const fs     = require('fs'),
			os     = require('os'),
			path   = require('path'),
			spawn  = require('child_process').spawn,
			log4js = require('@log4js-node/log4js-api'),
			logger = log4js.getLogger('dialog');

const Dialog = module.exports = {
	
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
		if (!str || str.trim() === '') {
			let msg = 'Empty or no string passed!';
			logger.error(msg);
			throw new Error(msg);
		}
		
		if (typeof title === 'function') {
			callback = title;
			title = null;
		}
		
		const cmd     = [],
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
			if (str.length > 30) {
				cmd.push('--width') && cmd.push('300');
			}
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
			const script = `tell app \"System Events\" to display dialog  "${str}" with title "${title}" buttons "OK"  with icon ${type}`;
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
			
			const vbScriptPath = path.join(__dirname, 'msgbox.vbs');
			// Detect packaged applications that save the script in a snapshot that cannot be accessed from cscript
			fs.stat(vbScriptPath, (err, stats) => {
				if (err) {
					callback && callback(err);
					return;
				}
				cmd.push('cscript');
				cmd.push('//NOLOGO');
				cmd.push(vbScriptPath);
				cmd.push(str) && cmd.push(type) && cmd.push(title);
				if (stats.ino !== 0) { // Script can be found in valid filesystem
					this.run(cmd, callback);
				} else { // Script must be copied from snapshot to filesystem
					fs.mkdtemp(path.join(os.tmpdir(), 'dialog-'), (err, folder) => {
						const vbDestination = path.join(folder, 'msgbox.vbs');
						const callbackClean = (code, stdout, stderr) => {
							fs.unlink(vbDestination, (err) => {
								// The dialog was shown, don't fail...
								if (err) { logger.warn(err); }
								fs.rmdir(folder, (err) => {
									if (err) { logger.warn(err); }
									callback && callback(null, code, stdout, stderr);
								});
							});
						};
						if (err) {
							// Temporary directory cannot be created. Dialog cannot be shown
							if (err) { logger.error(err); }
							callback(err);
							return;
						}
						fs.readFile(vbScriptPath, (err, data) => {
							if (err) {
								// Script cannot be read. Dialog cannot be shown
								if (err) { logger.error(err); }
								callbackClean(err);
								return;
							}
							fs.writeFile(vbDestination, data, (err) => {
								if (err) {
									// Script cannot be copied to fs. Dialog cannot be shown
									if (err) { logger.error(err); }
									callbackClean(err);
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
			callback && callback('Unsupported platform');
		}
	},
	
	run: function(cmd, cb) {
		const bin    = cmd[0],
					args   = cmd.splice(1),
					child  = spawn(bin, args);
		var   stdout = '',
					stderr = '';
		
		child.stdout.on('data', function(data) {
			stdout += data.toString();
		});
		
		child.stderr.on('data', function(data) {
			stderr += data.toString();
		});	
		
		child.on('exit', function(code) {
			cb && cb(null, code, stdout, stderr);
		});
		
		child.on('error', function(err) {
			// Error
			cb && cb(err);
		});
	}
	
}
