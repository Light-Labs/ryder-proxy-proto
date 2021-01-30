'use strict';

var web_socket = null;

function error(error)
	{
	this.emit('error',error);
	if (!reconnecting)
		{
		reconnecting = true;
		setTimeout(this.reconnect.bind(this),2000);
		}
	}

function message(data)
	{
	try
		{
		data = JSON.parse(data.data);
		}
	catch (error)
		{
		this.emit('error',error);
		return;
		}
	this.emit('message',data);
	if (data.event)
		this.emit('message.'+data.event,data.data);
	}

function open()
	{
	connecting = false;
	this.emit('open');
	}

var connecting = false;
var reconnecting = false;
var listeners = {};

var socket = {
	open: function()
		{
		if (web_socket)
			return;
		connecting = true;
		reconnecting = false;
		web_socket = new WebSocket('ws://'+document.location.host);
		web_socket.onerror = error.bind(this);
		web_socket.onmessage = message.bind(this);
		web_socket.onopen = open.bind(this);
		},
	close: function()
		{
		if (web_socket)
			try {web_socket.close()}catch(e){}
		web_socket = null;
		},
	send: function(op,data)
		{
		if (!web_socket)
			return false;
		return web_socket.send(JSON.stringify({op:op,data:data}));
		},
	reconnect: function()
		{
		reconnecting = true;
		this.close();
		this.open();
		},
	on: function(event,callback)
		{
		if (!listeners[event])
			listeners[event] = [];
		listeners[event].push(callback);
		},
	off: function(event,callback)
		{
		if (listeners[event])
			{
			var i = listeners[event].indexOf(callback); 
			if (i !== -1)
				listeners[event].splice(i,1);
			}
		},
	emit: function(event,data)
		{
		if (listeners[event])
			for (var i = 0 ; i < listeners[event].length ; ++i)
				listeners[event][i](data);
		}
};

export default socket;
