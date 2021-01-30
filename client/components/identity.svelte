<script>
	export var data;
	export var selectable = false;
	export var always_show_full_name = false;
	import {createEventDispatcher} from 'svelte';
	
	const dispatch = createEventDispatcher();

	var name = false;

	if (data.names && data.names[0])
		{
		name = data.names[0].split('.');
		name = [name.shift(),name.join('.')];
		}

	function select()
		{
		dispatch('select',data);
		}
	function show()
		{
		this.parentElement.style.backgroundImage = "url("+this.src+")";
		this.parentElement.style.opacity = 1;
		}
	function remove()
		{
		this.remove();
		}
	function bg()
		{
		var n = 0;
		for (var i = 0 ; i < data.address.length ; ++i)
			n = data.address.charCodeAt(i) + ((n<<5)-n);
		return '#' + ('00'+((n>>16)&0xff).toString(16)).substr(-2) + ('00'+((n>>8)&0xff).toString(16)).substr(-2) + ('00'+(n&0xff).toString(16)).substr(-2);
		}
</script>
<style>
	.identity{
		display: flex;
		flex-wrap: nowrap;
		padding: 1em;
		/*border: 1px solid rgba(0,0,0,.1);*/
		border-radius: 999em;
		margin-bottom: .5em;
	}
	.identity.selectable{
		cursor: pointer;
		transition: background-color .1s linear;
	}
	.identity.selectable:hover{
		background-color: rgba(0,0,0,.05);
	}
	.avatar{
		font-size: 1.5em;
		width: 2.5em;
		height: 2.5em;
		line-height: 2.5em;
		color: #fff;
		text-align: center;
		border-radius: 9999px;
		background-color: #fff;
		overflow: hidden;		
		position: relative;
	}
	.avatar .show{
		position: absolute;
		left: 0px;
		top: 0px;
		right: 0px;
		bottom: 0px;
		background-image: none;
		background-position: center;
		background-size: cover;
		opacity: 0;
		transition: opacity .2s linear;
	}
	.avatar img{
		display: none;
	}
	.right{
		padding-left: 1.5em;
		white-space: nowrap;
	}
	.name{
		font-size: 1.5em;
		padding-bottom: .5em;
	}
	.name span:last-of-type{
		opacity: 0;
		transition: opacity .2s linear;
		/*opacity: .25;
		font-size: .65em;
		padding-left: .15em;*/
	}
	.identity:hover .name span:last-of-type,
	.identity.always_show_full_name .name span:last-of-type{
		opacity: .25;
	}
	.address{
		font-size: .85em;
		opacity: .25;
		/*font-family: monospace;*/
	}
	.address.no-name{
		opacity: 1;
		padding-top: 1.5em;
	}
	@media all and (max-width: 40em){
		.identity{
			display: block;
		}
		.avatar{
			margin: 0 auto;
		}
		.right{
			padding-left: 0;
			text-align: center;
		}
	}
</style>
<div class="{selectable ? 'identity selectable' : 'identity'} {always_show_full_name?'always_show_full_name':''}" on:click={selectable && select}>
	<div class="avatar" style="background-color: {bg()}">M
		<div class="show">
			<img alt="" src="https://gaia.blockstack.org/hub/{data.address}//avatar-0" on:load={show} on:error={remove}>
		</div>
	</div>
	<div class="right">
		{#if name}
			<div class="name"><span>{name[0]}</span><span>.{name[1]}</span></div>
		{/if}
		<div class="address{!name?' no-name':''}">#{data.number+1} / ID-{data.address}</div>
	</div>
</div>