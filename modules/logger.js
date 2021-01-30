const fs = require('fs');
const config = require('../config');
const CONSTANT = require('./constants');

var log_file = config.log_file || 'app.log';
var write_to_file = config.log_to_file || false;

function ts()
	{
	var d = new Date();
	return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
	}

function p(level)
	{
	return ts()+' ['+process.pid+'] ['+level+'] ';
	}

function write(messages)
	{
	fs.appendFile(log_file,messages.join(' '),error =>
		{
		if (error)
			console.log('File write error: ',error);
		});
	}

var console_log = console.log;
var console_debug = console.debug;
var console_info = console.info;
var console_warn = console.warn;
var console_error = console.error;

console.log = function()
	{
	var args = Array.from(arguments);
	args.unshift(p('LOG'));
	console_log.apply(console,args);
	write_to_file && write(args);
	};

console.debug = function()
	{
	if (config.log & CONSTANT.LOG_DEBUG)
		{
		var args = Array.from(arguments);
		args.unshift(p('DEBUG'));
		console_debug.apply(console,args);
		write_to_file && write(args);
		}
	};

console.info = function()
	{
	if (config.log & CONSTANT.LOG_INFO)
		{
		var args = Array.from(arguments);
		args.unshift(p('INFO'));
		console_info.apply(console,args);
		write_to_file && write(args);
		}
	};

console.warn = function()
	{
	if (config.log & CONSTANT.LOG_WARN)
		{
		var args = Array.from(arguments);
		args.unshift(p('WARN'));
		console_warn.apply(console,args);
		write_to_file && write(args);
		}
	};

console.error = function()
	{
	if (config.log & CONSTANT.LOG_ERROR)
		{
		var args = Array.from(arguments);
		args.unshift(p('ERROR'));
		console_error.apply(console,args);
		write_to_file && write(args);
		}
	};

