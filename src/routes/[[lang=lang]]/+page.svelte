<script lang="ts">
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { Film, FileText, Music, ArrowRight, Cpu, Target, Infinity, ShieldCheck } from 'lucide-svelte';

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
					<div class="tc-ico tc-ico--video">
						<Film size={28} strokeWidth={1.5} />
					</div>
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
					<div class="tc-ico tc-ico--pdf">
						<FileText size={28} strokeWidth={1.5} />
					</div>
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
					<div class="tc-ico tc-ico--mp3">
						<Music size={28} strokeWidth={1.5} />
					</div>
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
		gap: 16px;
		margin-bottom: 24px;
	}

	.tool-card {
		display: flex;
		flex-direction: column;
		background: var(--surf);
		border: 1.5px solid var(--border);
		border-radius: var(--r);
		text-decoration: none;
		overflow: hidden;
		transition: all 0.22s ease;
		position: relative;
	}

	.tool-card::before {
		content: '';
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: opacity 0.25s;
		pointer-events: none;
	}

	.tool-card--video::before {
		background: radial-gradient(ellipse at 30% 20%, rgba(79, 140, 255, 0.08) 0%, transparent 65%);
	}

	.tool-card--pdf::before {
		background: radial-gradient(ellipse at 30% 20%, rgba(124, 92, 252, 0.08) 0%, transparent 65%);
	}

	.tool-card--mp3 {
		grid-column: 1 / -1;
	}

	.tool-card--mp3::before {
		background: radial-gradient(ellipse at 18% 30%, rgba(22, 163, 74, 0.08) 0%, transparent 62%);
	}

	.tool-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
	}

	.tool-card--video:hover {
		border-color: var(--accent);
	}

	.tool-card--pdf:hover {
		border-color: var(--accent2);
	}

	.tool-card--mp3:hover {
		border-color: var(--green);
	}

	.tool-card:hover::before {
		opacity: 1;
	}

	.tc-inner {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 12px 22px 12px;
		flex: 1;
	}

	.tool-card--mp3 .tc-inner {
		align-items: center;
		padding: 12px 22px 12px;
	}

	.tc-ico {
		width: 50px;
		height: 50px;
		flex-shrink: 0;
		border-radius: 14px;
		display: grid;
		place-items: center;
	}

	.tc-ico--video {
		background: linear-gradient(135deg, rgba(79, 140, 255, 0.15), rgba(79, 140, 255, 0.05));
		border: 1px solid rgba(79, 140, 255, 0.2);
		color: var(--accent);
	}

	.tc-ico--pdf {
		background: linear-gradient(135deg, rgba(124, 92, 252, 0.15), rgba(124, 92, 252, 0.05));
		border: 1px solid rgba(124, 92, 252, 0.2);
		color: var(--accent2);
	}

	.tc-ico--mp3 {
		background: linear-gradient(135deg, rgba(22, 163, 74, 0.14), rgba(22, 163, 74, 0.05));
		border: 1px solid rgba(22, 163, 74, 0.2);
		color: var(--green);
	}

	.tc-body {
		flex: 1;
		min-width: 0;
	}

	.tc-title {
		font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
		font-size: 15px;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 6px;
		line-height: 1.3;
	}

	.tc-desc {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.55;
		margin-bottom: 12px;
	}

	.tool-card--mp3 .tc-desc {
		max-width: 560px;
	}

	.tc-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.tc-tag {
		font-size: 10.5px;
		font-weight: 600;
		color: var(--muted);
		background: var(--surf2);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 2px 7px;
	}

	.tc-arrow {
		color: var(--muted);
		flex-shrink: 0;
		margin-top: 2px;
		transition: transform 0.18s, color 0.18s;
	}

	.tool-card:hover .tc-arrow {
		transform: translateX(3px);
		color: var(--accent);
	}

	.tool-card--pdf:hover .tc-arrow {
		color: var(--accent2);
	}

	.tool-card--mp3:hover .tc-arrow {
		color: var(--green);
	}

	.tc-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 11px 20px;
		background: linear-gradient(135deg, var(--accent), var(--accent2));
		color: #fff;
		font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.1px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		transition: opacity 0.18s;
	}

	.tc-cta--pdf {
		background: linear-gradient(135deg, var(--accent2), #4f8cff);
	}

	.tc-cta--mp3 {
		background: linear-gradient(135deg, #16a34a, #2563eb);
	}

	.tool-card:hover .tc-cta {
		opacity: 0.9;
	}

	@media (max-width: 760px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}

		.tool-card--mp3 {
			grid-column: auto;
		}

		.tool-card--mp3 .tc-inner {
			align-items: flex-start;
		}
	}

	@media (max-width: 560px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}

		.tc-inner {
			padding: 18px 16px 14px;
		}

		.tc-ico {
			width: 44px;
			height: 44px;
		}
	}
</style>
