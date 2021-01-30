const CONSTANT = require('./modules/constants');

require('dotenv').config();

module.exports = {
	"supported_firmware_version": "0.0.1",
	"host": process.env.RYDER_HOST || "localhost",
	"log": process.env.RYDER_LOG || CONSTANT.LOG_ALL,
	"port": process.env.RYDER_HOST_PORT || 8888,
	"ryder_port": process.env.RYDER_PORT,
	"baud_rate": process.env.RYDER_BAUD_RATE || 115200,
	"hub_url": process.env.RYDER_HUB_URL || "https://hub.blockstack.org",
	"api_url": process.env.RYDER_BLOCKSTACK_API_URL || "https://core.blockstack.org"
};
