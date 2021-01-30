'use strict';

/*
Ryder hardware bridge source code, third revision

Author: Marvin Janssen <marvin@ryder.id>, 2020-2021

This is a basic Blockstack Ryder bridge that serves as a drop-in replacement
for the Blockstack Browser. When the user follow the normal authentication
procedure, the bridge displays a selection screen where the user can opt
to sign in with the Ryder or the conventional Blockstack Browser.

If the user selects the Ryder, then the bridge will forward the request to
the Ryder over the serial interface. As soon as the user confirms (or
rejects) the request on the Ryder, the result is negotiated with the dapp
using the JSON Web Token auth/auth2 bounce.

The bridge will eventually as a configuration interface for the Ryder.
*/

require('./modules/logger');

const cluster = require('cluster');
const IPC = require('node-ipc-promise');
const package_info = require('./package.json');
const RyderSerial = require('ryderserial-proto');

const config = require('./config');

if (!config.ryder_port)
	{
	console.log('Missing RYDER_PORT environment variable. See setup instructions.');
	process.exit(0);
	}

if (cluster.isMaster)
	console.log('Ryder bridge version '+package_info.version);
else
	return require('./modules/worker');

function spawn_worker()
	{
	var worker = cluster.fork();
	worker.on('exit',code =>
		{
		if (code === 50) // fatal exit triggered on purpose
			{
			if (Object.keys(cluster.workers).length === 0)
				{
				console.warn('All workers exited with status 50, master process exiting...');
				process.exit(0);
				}
			}
		else if (code !== 0 && code !== null) // code null is disconnect
			{
			console.warn('Worker exited unexpectedly, respawning.');
			spawn_worker();
			}
		});
	worker.__ipc = IPC(worker);
	worker.__ipc.register('request_app_private_key',request_app_private_key);
	worker.__ipc.register('export_public_identity',export_public_identity);
	}

var ryder_serial = new RyderSerial(config.ryder_port,{debug:!!parseInt(process.env.RYDERSERIAL_DEBUG)});

ryder_serial.on('open',async () =>
	{
	const info = await ryder_serial.send(RyderSerial.COMMAND_INFO);
	if (!info || info.substr(0,5) !== 'ryder')
		{
		console.error(`Device at ${config.ryder_port} does not appear to be a Ryder device`);
		process.exit(0);
		}
	const firmware_version = `${info.charCodeAt(5)}.${info.charCodeAt(6)}.${info.charCodeAt(7)}`;
	console.log(`Found Ryder device, firmware version: ${firmware_version}, initialised: ${!!info.charCodeAt(9)?'yes':'no'}`);
	if (firmware_version !== config.supported_firmware_version)
		{
		console.error('This version of the proxy does not support this firmware.');
		process.exit(0);
		}
	const cores = require('os').cpus().length;
	for (var i = 0 ; i < cores ; ++i)
		{
		console.debug('Spawning worker '+i);
		spawn_worker();
		}
	});

// ryder_serial.on('failed',() =>
// 	{
// 	console.log(`Could not open serial connection to Ryder, is ${process.env.RYDER_PORT} the right port?`);
// 	process.exit();
// 	});

process.on('exit',ryder_serial.close);

function request_app_private_key(identity_number,app_domain)
	{
	return ryder_serial.sequence(async () =>
		{
		console.debug('starting sequence');
		var cmd = new Uint8Array(2);
		cmd[0] = RyderSerial.COMMAND_EXPORT_OWNER_APP_KEY_PRIVATE_KEY;
		cmd[1] = identity_number;
		var response = await ryder_serial.send(cmd);
		if (response !== RyderSerial.RESPONSE_SEND_INPUT)
			return false;
		response = await ryder_serial.send(app_domain+"\0");
		if (response === RyderSerial.RESPONSE_REJECTED)
			return false; // user cancel
		var split = response.split(',');
		var result = 
			{
				app_domain: split[0].substr(2),
				app_public_key: split[1],
				app_private_key: split[2],
				owner_private_key: split[3]
			};
		return result;
		});
	}

async function export_public_identity(identity_number)
	{
	var cmd = new Uint8Array(2);
	cmd[0] = RyderSerial.COMMAND_EXPORT_PUBLIC_IDENTITY;
	cmd[1] = identity_number;
	var identity = await ryder_serial.send(cmd);
	return {number:identity_number,address:identity};
	}

// process.on('exit',code => cluster && cluster.disconnect());

process.once('SIGINT',function(code)
	{
	console.info('SIGINT received.');
	cluster.disconnect(process.exit);
	});

process.once('SIGTERM',function(code)
	{
	console.info('SIGTERM received.');
	cluster.disconnect(process.exit);
	});
