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

	socket.on('error',console.error);
	socket.on('message.identity',function(identity)
		{
		loading = false;
		identities.push(identity);
		identities = identities; // trigger view update
		});
	socket.on('open',function()
		{
		socket.send('list_identities');
		});
	socket.open();
		
</script>
<style>
	.columns{
		display: flex;
		padding: 4em;
	}
	.icon{
		width: 64px;
		padding-right: 2em;
		flex-grow: 0;
		flex-shrink: 0;
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
</style>
{#if loading}
	<Loading fullscreen />
{:else if error}
	<div class="error">{error}</div>
{:else}
	<div class="columns">
		<div class="info">
			<div class="sticky">
				<p>
					This is a list of your current identities.
				</p>
			</div>
		</div>
		<div class="identities">
			{#if identities}
				{#each identities as identity}
					<div transition:fade="{{duration: 100}}">
						<Identity data={identity} />
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}
<Footer />