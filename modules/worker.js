'use strict';

/*
Ryder hardware proxy source code, third revision

Author: Marvin Janssen <marvin@ryder.id>, 2020-2021

This is a basic Blockstack Ryder proxy that serves as a drop-in replacement
for the Blockstack Browser. When the user follow the normal authentication
procedure, the proxy displays a selection screen where the user can opt
to sign in with the Ryder or the conventional Blockstack Browser.

If the user selects the Ryder, then the proxy will forward the request to
the Ryder over the serial interface. As soon as the user confirms (or
rejects) the request on the Ryder, the result is negotiated with the dapp
using the JSON Web Token auth/auth2 bounce.

The proxy will eventually serve as a bridge and configuration interface
for the Ryder.
*/

const IPC = require('node-ipc-promise');
const ipc = IPC();
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const fsp = fs.promises;
const querystring = require('querystring');
// const blockstack = require('blockstack');
const blockstack_auth = require('blockstack/lib/auth');
const jsontokens = require('jsontokens');

const config = require('../config');

const proxy_url = 'http://'+(config.host||'localhost')+(config.port!==0?':'+config.port:'')+'/';

function escape_html(str)
	{
	return str
		.replace(/&/g,"&amp;")
		.replace(/</g,"&lt;")
		.replace(/>/g,"&gt;")
		.replace(/"/g,"&quot;")
		.replace(/'/g,"&#039;");
	}

async function request_handler(request,response)
	{
	var split = request.url.split('?');
	var url = split[0] || '/';
	var query = split[1] && querystring.parse(split[1]) || {};
	split = null;
	if (url.indexOf('/static/') === 0)
		{
		var file = 'interface/'+url.substr(7).replace(/\.\.|\//g,'');
		try
			{
			await fsp.access(file,fs.constants.R_OK);
			response.setHeader('content-type',content_type(file));
			return response.end(await fsp.readFile(file));
			}
		catch (error)
			{
			console.error(error);
			return response.writeHead(404).end('Not Found');
			}
		}
	switch (url)
		{
		case '/': return response.end(await app_html('Dashboard'));
		case '/auth': return response.end(await app_html('IdentitySelector'));
	
		case '/favicon.ico': //TODO-
		default:
			response.writeHead(400).end('bad request');
			break;
		}
	};

const server = http.createServer(
	{
	cert: process.env.RYDER_HOST_CERT ? fs.readFileSync(process.env.RYDER_HOST_CERT) : undefined,
	key: process.env.RYDER_HOST_KEY ? fs.readFileSync(process.env.RYDER_HOST_KEY) : undefined
	},request_handler);

const wss = new WebSocket.Server({server:server});

wss.on('connection',function(ws,request)
	{
	if (request.connection.remoteAddress !== '127.0.0.1' && request.connection.remoteAddress !== '::1')
		return console.log('Rejected non-local connection from '+request.connection.remoteAddress);

	console.debug('Incoming connection');

	ws._emit = function(event,data)
		{
		ws.send(JSON.stringify({event:event,data:data}));
		};

	ws.on('message',async message =>
		{
		try
			{
			message = JSON.parse(message);
			}
		catch (error)
			{
			console.error(error);
			return;
			}
		if (message.op)
			switch (message.op)
				{
				case 'auth_request':
					if (!message.data)
						return ws._emit('invalid_auth_request','missing_data');
					if (message.data[0] === '?')
						message.data = message.data.substr(1);
					try
						{
						var query = querystring.parse(message.data);
						}
					catch (error)
						{
						return;
						}
					if (!query.authRequest)
						return;
					try
						{
						var verified = await blockstack_auth.verifyAuthRequest(query.authRequest);
						}
					catch (error)
						{
						// console.error(error,jsontokens.decodeToken(query.authRequest));
						return ws._emit('invalid_auth_request','verification_failed');
						}
					if (verified)
						{
						var token = jsontokens.decodeToken(query.authRequest);
						console.log(token);
						if (typeof token.payload.redirect_uri === 'object' && token.payload.redirect_uri.isTrusted)
							token.payload.redirect_uri = token.payload.domain_name; //TODO- get redirect from manifest
						if (token.payload.redirect_uri.indexOf(token.payload.domain_name) !== 0)
							{
							console.error('domain name and redirect uri mismatch');
							return ws._emit('redirect',token.payload.redirect_uri);
							}

						if (query.echo) // echo reply
							return ws._emit('redirect',token.payload.redirect_uri+'?echoReply='+encodeURIComponent(query.echo)+'&authContinuation='+encodeURIComponent(proxy_url+'auth?authRequest='+query.authRequest+'&echo='));
						return ws._emit('auth',token);
						}
					else
						return ws._emit('invalid_auth_request','verification_failed');
					break;

				case 'list_identities':
					//ws._emit('identities',await list_identities());
					list_identities(ws);
					break;

				case 'request_app_auth_private_key':
					if (!message.data || !message.data.domain_name || !message.data.token_public_key || !message.data.identity_public_key || typeof message.data.identity_number !== 'number')
						return;
					var info = await request_app_private_key(message.data.identity_number,message.data.domain_name);
					if (!info)
						return ws._emit('app_auth_private_key',false);
					info.identity_public_key = message.data.identity_public_key;
					var auth_response = await create_auth_response(message.token_public_key,info);
					ws._emit('app_auth_private_key',auth_response);
					break;

				// case 'sign_in':
				// 	if (!message.data || !message.data.domain_name || typeof message.data.identity_number !== 'number')
				// 		return;
				// 	ws._emit('app_auth',);
				// 	break;
				}
		});
	ws.on('close',function()
		{
		//console.log('Connection closed');
		});

	//send_identities(ws);
	});

async function list_identities(ws)
	{
	//var identities = [];
	var n = 0;
	var identity;
	do
		{
		identity = await ipc.exec('export_public_identity',n++);
		identity.names = await get_address_names(identity.address);
		//identities.push(identity);
		ws._emit('identity',identity);
		}
	while (identity.names && identity.names.length);
	//return identities;
	}

async function get_json(url)
	{
	return new Promise((resolve,reject) =>
		{
		https.get(url,response =>
			{
			var json = '';
			response.on('data',chunk => json += chunk);
			response.on('end',() =>
				{
				try
					{
					resolve(JSON.parse(json));
					}
				catch (error)
					{
					reject(error);
					}
				});
			}).on('error',reject);
		});
	}

async function request_app_private_key(identity,app_domain)
	{
	return ipc.exec('request_app_private_key',identity,app_domain);
	}


var names_cache = {};
var names_cache_time = 1000 * 60 * 10; // 10 minutes

async function get_address_names(address)
	{
	if (names_cache[address])
		{
		if (names_cache[address].time + names_cache_time > (+new Date()))
			return names_cache[address].names;
		delete names_cache[address];
		}
	try
		{
		var result = await get_json(config.api_url+'/v1/addresses/bitcoin/'+address);
		if (result && result.names && result.names.length)
			{
			names_cache[address] = {time:+new Date(),names:result.names};
			return result.names;
			}
		}
	catch (error){}
	return null;
	}

var mime_types =
	{
	html: 'text/html',
	css: 'text/css',
	svg: 'image/svg+xml',
	js: 'text/javascript',
	map: 'application/json',
	ico: 'image/x-icon',
	_: 'application/octet-stream'
	};

async function app_html(app)
	{
	var html = await fsp.readFile('interface/index.html','utf8');
	return html.replace(/\{\{app\}\}/g,app);
	}

function content_type(file)
	{
	if (typeof file !== 'string')
		return false;
	var ext = file.split('.');
	if (!ext.length)
		return false;
	ext = ext[ext.length-1];
	return mime_types[ext] || mime_types['_'];
	}

function next_month()
	{
	// from blockstack source
	return new Date(new Date().setMonth(new Date().getMonth() + 1));
	}

async function create_auth_response(transit_public_key,keys)
	{
	var username = null;
	if (keys.identity_public_key)
		{
		username = await get_address_names(keys.identity_public_key);
		username = username && username[0] ? username[0] : null;
		}
	var a = blockstack_auth.makeAuthResponse(
		keys.owner_private_key,
		{}, // profile
		username, // username
		{}, // metadata
		null, // coretoken
		keys.app_private_key,
		next_month().getTime(),
		transit_public_key, // transit public key
		config.hub_url,
		config.api_url,
		null // association token
		);
	console.log(a);
	return a;
	}

server.listen(config.port,'127.0.0.1',error => error ? console.error(error) : console.log("Listening on port "+config.port));
