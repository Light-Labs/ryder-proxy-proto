'use strict';
import Dashboard from './dashboard.svelte';
import IdentitySelector from './identityselector.svelte';
var apps = {Dashboard,IdentitySelector};
if (apps[document.body.dataset.app])
	new apps[document.body.dataset.app]({target:document.body});
else
	console.error('unknown app, cannot continue');
