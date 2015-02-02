// include modules
// __dirname is only defined in scripts. It's not available in REPL,also not available here...
var https = require('https'),
	http = require('http'),
	fs = require('fs'),
	path = require('path'),
	Q = require('q');