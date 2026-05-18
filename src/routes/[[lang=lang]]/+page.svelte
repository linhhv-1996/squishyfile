<script lang="ts">
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { ArrowRight, ShieldCheck } from 'lucide-svelte';

	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let compressHref = $derived(
		currentLangKey !== 'en' ? `/${currentLangKey}/compress-video` : '/compress-video'
	);
	let pdfHref = $derived(
		currentLangKey !== 'en' ? `/${currentLangKey}/compress-pdf` : '/compress-pdf'
	);
	let mp3Href = $derived(
		currentLangKey !== 'en' ? `/${currentLangKey}/video-to-mp3` : '/video-to-mp3'
	);
	let convertHref = $derived(
		currentLangKey !== 'en' ? `/${currentLangKey}/video-converter` : '/video-converter'
	);
</script>

<svelte:head>
	<title>{t('meta.title')}</title>
	<meta property="og:title" content="{t('meta.title')}" />
	<meta name="description" content={t('meta.desc')} />
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html t('hero.title')}</h1>
			<p>{t('hero.sub')}</p>
			<div class="pills">
				<div class="pill"><span class="dot"></span><span>{t('hero.pill1')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill2')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill3')}</span></div>
			</div>
		</section>

		<div class="tool-grid">
			<a href={compressHref} class="tool-card tool-card--video">
				<div class="tc-inner">
					<div class="tc-body">
						<h2 class="tc-title">{t('home.card.video.title')}</h2>
						<p class="tc-desc">{t('home.card.video.desc')}</p>
						<div class="tc-tags">
							<span class="tc-tag">MP4</span>
							<span class="tc-tag">MOV</span>
							<span class="tc-tag">AVI</span>
							<span class="tc-tag">WebM</span>
							<span class="tc-tag">MKV</span>
						</div>
					</div>
					<div class="tc-arrow">
						<ArrowRight size={18} strokeWidth={2} />
					</div>
				</div>
				<div class="tc-cta">{t('home.card.video.cta')} <ArrowRight size={14} strokeWidth={2.2} /></div>
			</a>

			<a href={pdfHref} class="tool-card tool-card--pdf">
				<div class="tc-inner">
					<div class="tc-body">
						<h2 class="tc-title">{t('home.card.pdf.title')}</h2>
						<p class="tc-desc">{t('home.card.pdf.desc')}</p>
						<div class="tc-tags">
							<span class="tc-tag">PDF</span>
							<span class="tc-tag">{t('home.card.pdf.tag.password')}</span>
							<span class="tc-tag">{t('home.card.pdf.tag.fast')}</span>
						</div>
					</div>
					<div class="tc-arrow">
						<ArrowRight size={18} strokeWidth={2} />
					</div>
				</div>
				<div class="tc-cta tc-cta--pdf">{t('home.card.pdf.cta')} <ArrowRight size={14} strokeWidth={2.2} /></div>
			</a>

			<a href={mp3Href} class="tool-card tool-card--mp3">
				<div class="tc-inner">
					<div class="tc-body">
						<h2 class="tc-title">{t('home.card.mp3.title')}</h2>
						<p class="tc-desc">{t('home.card.mp3.desc')}</p>
						<div class="tc-tags">
							<span class="tc-tag">MP4</span>
							<span class="tc-tag">MOV</span>
							<span class="tc-tag">AVI</span>
							<span class="tc-tag">WebM</span>
							<span class="tc-tag">MP3</span>
						</div>
					</div>
					<div class="tc-arrow">
						<ArrowRight size={18} strokeWidth={2} />
					</div>
				</div>
				<div class="tc-cta tc-cta--mp3">{t('home.card.mp3.cta')} <ArrowRight size={14} strokeWidth={2.2} /></div>
			</a>

			<a href={convertHref} class="tool-card tool-card--convert">
				<div class="tc-inner">
					<div class="tc-body">
						<h2 class="tc-title">{t('home.card.convert.title')}</h2>
						<p class="tc-desc">{t('home.card.convert.desc')}</p>
						<div class="tc-tags">
							<span class="tc-tag">MOV</span>
							<span class="tc-tag">MKV</span>
							<span class="tc-tag">AVI</span>
							<span class="tc-tag">WebM</span>
							<span class="tc-tag">MP4</span>
						</div>
					</div>
					<div class="tc-arrow">
						<ArrowRight size={18} strokeWidth={2} />
					</div>
				</div>
				<div class="tc-cta tc-cta--convert">
					{t('home.card.convert.cta')} <ArrowRight size={14} strokeWidth={2.2} />
				</div>
			</a>

		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>{@html t('note.privacy')}</p>
		</div>

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t('faq.home.title')}</h2>
			<div class="faq-list">
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.1.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.1.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.2.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.2.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.3.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.3.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.4.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.4.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.5.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.5.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.home.6.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.home.6.a')}</span>
					</div>
				</details>
			</div>
		</section>
	</div>
</main>

<style>
	.tool-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 18px;
	}

	.tool-card {
		display: flex;
		min-height: 188px;
		flex-direction: column;
		justify-content: space-between;
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		text-decoration: none;
		overflow: hidden;
		transition: border-color .15s ease, background .15s ease;
		position: relative;
	}

	.tool-card:hover {
		background: var(--surf);
		border-color: var(--border-hover);
	}

	.tool-card:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.tool-card--convert,
	.tool-card--mp3 {
		grid-column: auto;
	}

	.tc-inner {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 18px 18px 14px;
		flex: 1;
	}

	.tool-card--convert .tc-inner,
	.tool-card--mp3 .tc-inner {
		align-items: flex-start;
		padding: 18px 18px 14px;
	}

	.tc-body {
		flex: 1;
		min-width: 0;
	}

	.tc-title {
		font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
		font-size: 15px;
		font-weight: 680;
		color: var(--text);
		margin-bottom: 7px;
		line-height: 1.35;
		letter-spacing: -.1px;
	}

	.tc-desc {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.55;
		margin-bottom: 13px;
	}

	.tool-card--mp3 .tc-desc {
		max-width: none;
	}

	.tc-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.tc-tag {
		display: inline-flex;
		align-items: center;
		min-height: 22px;
		font-size: 10.5px;
		font-weight: 600;
		color: var(--muted);
		background: var(--surf2);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 2px 7px;
		line-height: 1;
	}

	.tc-arrow {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: var(--rsm);
		background: var(--surf2);
		flex-shrink: 0;
		transition: color .15s ease, border-color .15s ease, background .15s ease;
	}

	.tool-card:hover .tc-arrow {
		color: var(--accent);
		border-color: var(--border-hover);
		background: var(--surf);
	}

	.tc-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 11px 18px;
		background: transparent;
		color: var(--accent);
		font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
		font-size: 12.5px;
		font-weight: 650;
		letter-spacing: 0;
		border-top: 1px solid var(--border);
		transition: background .15s ease, color .15s ease;
	}

	.tc-cta--pdf,
	.tc-cta--mp3,
	.tc-cta--convert {
		background: transparent;
		color: var(--accent);
	}

	.tool-card:hover .tc-cta {
		background: var(--surf2);
		color: var(--text);
	}

	@media (max-width: 760px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}

		.tool-card {
			min-height: auto;
		}

		.tool-card--mp3,
		.tool-card--convert {
			grid-column: auto;
		}
	}

	@media (max-width: 560px) {
		.tool-grid {
			gap: 10px;
		}

		.tc-inner,
		.tool-card--convert .tc-inner,
		.tool-card--mp3 .tc-inner {
			padding: 15px 14px 12px;
			gap: 10px;
		}

		.tc-title {
			font-size: 14px;
		}

		.tc-cta {
			padding: 10px 14px;
		}
	}
</style>
