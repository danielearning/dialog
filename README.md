Dialog
======

Simple wrapper around zenity, osascript and vbscript that lets you
show native alert dialogs on Linux, OSX and Windows (including `zeit/pkg`'ed apps and maybe other packaged ones), respectively.

Example
-----

``` js
var dialog = require('dialog');

dialog.info('Hello there');
```

Usage
-------
To show an error dialog:

``` js
dialog.err(msg, title, callback);
```

To show a generic info dialog:

``` js
dialog.info(msg, title, callback);

// example, setting title
dialog.info('Ground control to major Tom.', 'My app', function(err, exitCode) {
	if (err) console.log('Error: ' + err);
	if (exitCode == 0) console.log('User clicked OK');
})
```

To show a warning dialog:

``` js
dialog.warn(msg, title, callback);

// example, without setting title
dialog.warn('This computer will autoterminate itself in 5 seconds.', function(err, exitCode){
	if (exitCode == 1) console.log('User closed window');
})
```

`exitCode` indicates whether the user clicked the default (OK) button (value `0`), or if they closed the window or clicked the "No/Cancel" button (value `1`).

Both `title` and `callback` are optional. Default title shown is "Important".

Credits
-------
Written by Tomás Pollak, except for the MsgBox script which was written by
[StackOverflow user boflynn](http://stackoverflow.com/a/774197).
Improvements by Daniel Martínez.

Copyright
---------
(c) 2012 Fork Ltd. MIT license.
(c) 2018 Daniel Martínez. MIT license.
