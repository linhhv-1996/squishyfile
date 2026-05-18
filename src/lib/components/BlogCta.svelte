<script lang="ts">
	type BlogCtaData = {
		href?: string;
		key?: string;
		icon?: string;
		title?: string;
		btn?: string;
		external?: boolean;
	};

	interface Props {
		cta?: BlogCtaData;
		t: (key: string) => string;
		langPrefix?: string;
	}

	let { cta, t, langPrefix = '' }: Props = $props();

	function isExternalUrl(url: string) {
		return /^https?:\/\//i.test(url);
	}

	function normalizePath(url: string) {
		if (!url) return '';
		if (isExternalUrl(url)) return url;

		const path = url.startsWith('/') ? url : `/${url}`;
		const prefix = langPrefix && langPrefix !== '/' ? langPrefix : '';

		return `${prefix}${path}`;
	}

	let rawHref = $derived(cta?.href ?? '');
	let href = $derived(normalizePath(rawHref));

	let external = $derived(cta?.external ?? isExternalUrl(rawHref));

	let ctaKey = $derived(cta?.key ?? 'pdf');
	let icon = $derived(cta?.icon ?? '✨');

	let title = $derived(cta?.title ?? t(`blog.cta.${ctaKey}.title`));
	let btn = $derived(cta?.btn ?? t(`blog.cta.${ctaKey}.btn`));

	let target = $derived(external ? '_blank' : undefined);
	let rel = $derived(external ? 'noopener noreferrer' : undefined);
</script>

{#if href}
	<div class="cta-banner">
		<span class="cta-icon">{icon}</span>

		<span class="cta-title">
			{title}
		</span>

		<a class="cta-btn" {href} {target} {rel}>
			{btn}
		</a>
	</div>
{/if}

<style>
	.cta-banner {
		position: sticky;
		top: 70px;
		z-index: 20;
		background: var(--surf);
		border: 1px solid #cdcdcd;
		border-left: 2px solid var(--accent);
		padding: 8px;
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
		transition:
			opacity 0.15s,
			transform 0.1s;
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
