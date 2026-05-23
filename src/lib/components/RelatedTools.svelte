<!-- src/lib/components/RelatedTools.svelte -->
<script lang="ts">
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import type { RelatedTool } from '$lib/config/relatedTools';

	type Props = {
		label: string;
		tools: RelatedTool[];
	};

	let { label, tools }: Props = $props();
</script>

<div class="related-tools">
	<p class="related-tools-label">{label}</p>

	{#each tools as tool}
		<a href={tool.href} class="related-tools-link">
			<svelte:component this={tool.icon} size={13} strokeWidth={2} />
			<span>{tool.label}</span>
			<ArrowRight size={12} strokeWidth={2} class="related-tools-arrow" />
		</a>
	{/each}
</div>

<style>
	.related-tools {
		padding: 10px 16px 12px;
		border-top: 1px solid var(--border);
	}

	.related-tools-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		letter-spacing: 0.07em;
		margin: 0 0 4px;
	}

	.related-tools-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 0;
		font-size: 13px;
		color: var(--text);
		text-decoration: none;
		border-bottom: 1px solid var(--border);
		transition: color 0.15s;
	}

	.related-tools-link:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.related-tools-link:hover {
		color: var(--accent);
	}

	.related-tools-link span {
		flex: 1;
	}

	.related-tools-arrow {
		color: var(--muted);
		transition: transform 0.15s;
	}

	.related-tools-link:hover .related-tools-arrow {
		transform: translateX(2px);
		color: var(--accent);
	}
</style>
