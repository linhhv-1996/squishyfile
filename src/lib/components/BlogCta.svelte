<script lang="ts">
	interface Props {
		tool?: string;
		t: (key: string) => string;
		langPrefix: string;
	}

	let { tool = 'pdf', t, langPrefix }: Props = $props();

	// Normalize: anything that's not 'video' falls back to 'pdf'
	let resolvedTool = $derived(tool === 'video' ? 'video' : 'pdf');

	let href = $derived(resolvedTool === 'video' ? `${langPrefix}/compress-video` : `${langPrefix}/compress-pdf`);
	let title = $derived(t(`blog.cta.${resolvedTool}.title`));
	let btn = $derived(t(`blog.cta.${resolvedTool}.btn`));
	let icon = $derived(resolvedTool === 'video' ? '▶' : '📄');
</script>

<div class="cta-banner">
	<div class="cta-inner">
		<span class="cta-icon">{icon}</span>
		<span class="cta-title">{title}</span>
		<a {href} class="cta-btn">{btn}</a>
	</div>
</div>

<style>
	.cta-banner {
		position: sticky;
		top: 60px;
		z-index: 20;
		background: var(--surf);
		border: 1px solid var(--border);
		padding: 10px;
		margin-bottom: 28px;
		border-radius: 8px;
	}

	.cta-inner {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.cta-icon {
		font-size: 15px;
		flex-shrink: 0;
		line-height: 1;
	}

	.cta-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		flex: 1;
		min-width: 0;
	}

	.cta-btn {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 5px;
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

	@media (max-width: 580px) {
		.cta-inner {
			gap: 8px;
		}
		.cta-title {
			font-size: 12px;
		}
		.cta-btn {
			padding: 6px 12px;
			font-size: 11px;
		}
	}
</style>
