<script>
	export var fullscreen;
	import Logo from './logo.svelte';
</script>
<style>
	div.fullscreen{
		position: fixed;
		top: 0px;
		left: 0px;
		right: 0px;
		bottom: 0px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #fff;
		z-index: 99999;
	}
	div.logo{
		width: 15%;
		min-width: 8em;
	}
	div.logo :global(svg){
		width: 100%;
	}
	div.logo :global(path){
		animation: loading .8s ease-in-out infinite alternate;
	}
	div.logo :global(path:nth-child(1)){
		animation-delay: -1s;
	}
	div.logo :global(path:nth-child(2)){
		animation-delay: -.9s;
	}
	div.logo :global(path:nth-child(3)){
		animation-delay: -.8s;
	}
	@keyframes loading{
		from{
			opacity: 1;
		}
		to{
			opacity: 0.25;
		}
	}
</style>
<div class="{fullscreen&&'fullscreen'}">
	<div class="logo">
		<Logo />
	</div>
</div>