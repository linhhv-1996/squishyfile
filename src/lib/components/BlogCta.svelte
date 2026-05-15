<script lang="ts">
	interface Props {
		tool?: string;
		t: (key: string) => string;
		langPrefix: string;
	}

	let { tool = 'pdf', t, langPrefix }: Props = $props();

	let resolvedTool = $derived(
		tool === 'video' || tool === 'video-to-mp3' ? tool : 'pdf'
	);

	let href = $derived(
		resolvedTool === 'video'
			? `${langPrefix}/compress-video`
			: resolvedTool === 'video-to-mp3'
				? `${langPrefix}/video-to-mp3`
				: `${langPrefix}/compress-pdf`
	);
	let title = $derived(t(`blog.cta.${resolvedTool}.title`));
	let btn = $derived(t(`blog.cta.${resolvedTool}.btn`));
	let icon = $derived(
		resolvedTool === 'video' ? '▶' : resolvedTool === 'video-to-mp3' ? '🎵' : '📄'
	);
</script>

<div class="cta-banner">
	<span class="cta-icon">{icon}</span>
	<span class="cta-title">{title}</span>
	<a {href} class="cta-btn">{btn}</a>
</div>

<style>
	.cta-banner {
		position: sticky;
		top: 70px;
		z-index: 20;
		background: var(--surf);
		border: 1px solid #cdcdcd;
		border-left: 2px solid var(--accent);
		padding: 8px 8px;
		margin-bottom: 28px;
		border-radius: 8px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cta-icon {
		font-size: 15px;
		flex-shrink: 0;
		line-height: 1;
	}

	.cta-title {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		line-height: 1.45;
	}

	.cta-btn {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 7px 14px;
		border-radius: var(--rsm, 6px);
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		transition: opacity 0.15s, transform 0.1s;
	}

	.cta-btn:hover {
		opacity: 0.88;
		transform: translateY(-1px);
	}

	.cta-btn:active {
		transform: translateY(0);
		opacity: 1;
	}

	@media (max-width: 480px) {
		.cta-icon,
		.cta-title {
			display: none;
		}

		.cta-btn {
			width: 100%;
			padding: 11px 14px;
			font-size: 13px;
		}
	}
</style>
