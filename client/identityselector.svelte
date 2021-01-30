<script>
	import socket from './socket';
	import Identity from './components/identity.svelte';
	import Footer from './components/footer.svelte';
	import Loading from './components/loading.svelte';

	import {fade} from 'svelte/transition';

	var loading = true;
	var identities = [];
	var token;
	var error;
	var selection;

	var auth_request_missing = document.location.search.indexOf('?authRequest=') !== 0;
	if (auth_request_missing)
		{
		error = 'Authentication request missing.';
		loading = false;
		}
	if (!auth_request_missing)
		{
		socket.on('error',console.error);
		socket.on('message.invalid_auth_request',function(type)
			{
			loading = false;
			if (type === 'verification_failed')
				error = 'The authentication request has expired, please go back to the app and try again.';
			else
				error = 'Invalid authentication request, please go to the app and try again.';
			});
		socket.on('message.auth',function(t)
			{
			loading = false;
			token = t;
			socket.send('list_identities');
			});
		socket.on('message.app_auth_private_key',function(auth_response)
			{
			if (!token)
				return;
			if (!auth_response)
				document.location.href = token.payload.redirect_uri;
			else
				document.location.href = token.payload.redirect_uri+'?authResponse='+encodeURIComponent(auth_response);
			});
		socket.on('message.identity',function(identity)
			{
			identities.push(identity);
			identities = identities; // trigger view update
			});
		socket.on('message.identities',function(ids)
			{
			identities = ids;
			});
		socket.on('message.redirect',function(url)
			{
			document.location.href = url;
			});
		socket.on('open',function()
			{
			socket.send('auth_request',document.location.search);
			});
		socket.open();
		}

	function select_identity(event)
		{
		if (!token)
			return;
		selection = event.detail;
		var identity_number = selection.number;
		var address = selection.address;
		socket.send('request_app_auth_private_key',
			{
			domain_name: token.payload.domain_name,
			token_public_key: token.payload.public_keys[0],
			identity_number: identity_number,
			identity_public_key: address
			});
		}
</script>
<style>
	.columns{
		display: flex;
		padding: 4em;
	}
	.info{
		flex-basis: 30%;
		flex-shrink: 0;
	}
	.sticky{
		position: sticky;
		top: 4em;
	}
	.identities{
		flex-grow: 1;
		flex-shrink: 1;
		padding-left: 4em;
	}
	.error{
		margin: 4em;
		padding: 1em;
		text-align: center;
		background-color: rgba(255,0,0,.05);
		border-radius: 999em;
		color: #500;
	}
	.app_domain{
		/*font-weight: bold;
		font-size: 1.5em;*/
	}
	.signin_modal{
		background-color: rgba(0,0,0,.25);
		position: fixed;
		top: 0px;
		right: 0px;
		bottom: 0px;
		left: 0px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	.signin_modal>div{
		background-color: #fff;
		padding: 4em;
	}
	.signin_modal div div{
		padding-top: 1em;
	}
	.signin_modal div div:last-of-type{
		color: #500;
	}
</style>
{#if loading}
	<Loading fullscreen />
{:else if error}
	<div class="error">{error}</div>
{:else}
	{#if selection && token}
		<div class="signin_modal" transition:fade={{duration: 100}}>
			<div>
				<Identity data={selection} always_show_full_name />
				<div>Confirm sign-in to <strong>{token.payload.domain_name.split('//')[1]}</strong> with <strong>identity #{selection.number+1}</strong> on your device.</div>
				<div>Cancel immediately if the identity numbers do not match.</div>
			</div>
		</div>
	{/if}
	<div class="columns">
		<div class="info">
			<div class="sticky">
				{#if token}
					<p>
						<span class="app_domain">{token.payload.domain_name.split('//')[1]}</span> wants to <strong>read your basic information</strong>
						{#if token.payload.scopes.indexOf('publish_data') !== -1}
						and <strong>publish data</strong>{/if}.
					</p>
				{/if}
				<p>
					Select an ID to use or cancel by closing this screen.
				</p>
			</div>
		</div>
		<div class="identities">
			{#if identities}
				{#each identities as identity}
					<div transition:fade="{{duration: 100}}">
						<Identity data={identity} selectable on:select={select_identity} />
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}
<Footer />