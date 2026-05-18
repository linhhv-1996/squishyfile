<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.css';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { ChevronDown, Home, FileText, Zap, Music, RefreshCw } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Tự động nhận diện ngôn ngữ từ URL
	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let langOpen = $state(false);
	let toolsOpen = $state(false);
	let mobileOpen = $state(false);

	let langWrap: HTMLDivElement;
	let toolsWrap: HTMLDivElement;

	function switchLanguage(newLang: string) {
		// Xác định đường dẫn trang chủ của ngôn ngữ mới
		// Nếu là 'en' thì về '/', các ngôn ngữ khác thì về '/[code]'
		const newHomePath = newLang === 'en' ? '/' : `/${newLang}`;

		langOpen = false;
		toolsOpen = false;
		closeMobileMenu();

		// Dùng window.location.href để ép trình duyệt load lại trang (F5)
		// và đẩy người dùng về trang chủ của ngôn ngữ đó
		window.location.href = newHomePath;
	}

	function toggleMobileMenu() {
		mobileOpen = !mobileOpen;
		if (typeof document !== 'undefined') document.body.style.overflow = mobileOpen ? 'hidden' : '';
	}

	function closeMobileMenu() {
		mobileOpen = false;
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	}

	onMount(() => {
		const closeMenusOnOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node;

			if (langWrap && !langWrap.contains(target)) langOpen = false;
			if (toolsWrap && !toolsWrap.contains(target)) toolsOpen = false;
		};

		document.addEventListener('click', closeMenusOnOutsideClick);
		return () => document.removeEventListener('click', closeMenusOnOutsideClick);
	});

	// Xử lý link thông minh dựa theo ngôn ngữ
	let prefix = $derived(currentLangKey !== 'en' ? `/${currentLangKey}` : '');
	let homeHref = $derived(prefix || '/');
	let blogHref = $derived(`${prefix}/blog`);
	let compressVideoHref = $derived(`${prefix}/compress-video`);
	let compressPdfHref = $derived(`${prefix}/compress-pdf`);
	let videoToMp3Href = $derived(`${prefix}/video-to-mp3`);
	let videoConverterHref = $derived(`${prefix}/video-converter`);
	let privacyHref = $derived(`${prefix}/privacy`);
	let termsHref = $derived(`${prefix}/terms`);
	let contactHref = $derived(`${prefix}/contact`);

	// Active link detection
	let isHome = $derived(
		$page.url.pathname === '/' || $page.url.pathname === `/${currentLangKey}`
	);
	let isBlog = $derived($page.url.pathname.includes('/blog'));

	let isCompressVideo = $derived($page.url.pathname.includes('/compress-video'));
	let isCompressPdf = $derived($page.url.pathname.includes('/compress-pdf'));
	let isVideoToMp3 = $derived($page.url.pathname.includes('/video-to-mp3'));

	let isVideoConverter = $derived(
		$page.url.pathname.includes('/video-converter') ||
			$page.url.pathname.includes('/mov-to-mp4') ||
			$page.url.pathname.includes('/avi-to-mp4') ||
			$page.url.pathname.includes('/mkv-to-mp4') ||
			$page.url.pathname.includes('/webm-to-mp4')
	);

	let isToolPage = $derived(
		isCompressVideo || isCompressPdf || isVideoToMp3 || isVideoConverter
	);

	let toolsLabel = $derived(t('nav.tools') !== 'nav.tools' ? t('nav.tools') : 'Tools');
	let convertLabel = $derived(t('tab.convert') !== 'tab.convert' ? t('tab.convert') : 'Convert');

	// Hreflang: lấy path hiện tại, bỏ prefix ngôn ngữ (dùng cho SEO alternate links)
	let currentPath = $derived((() => {
		const pathname = $page.url.pathname;
		if (currentLangKey === 'en') return pathname;
		const stripped = pathname.replace(new RegExp(`^/${currentLangKey}(?=/|$)`), '');
		return stripped || '/';
	})());

	let isBlogPost = $derived(currentPath.startsWith('/blog/') && currentPath.length > '/blog/'.length);

	let ogImagePath = $derived((() => {
		const lang = currentLangKey.toLowerCase();

		if (currentPath === '/compress-pdf' || currentPath.startsWith('/compress-pdf/')) {
			return `/og/compress-pdf/${lang}.png`;
		}

		if (currentPath === '/compress-video' || currentPath.startsWith('/compress-video/')) {
			return `/og/compress-video/${lang}.png`;
		}

		if (currentPath === '/video-to-mp3' || currentPath.startsWith('/video-to-mp3/')) {
			return `/og/video-to-mp3/${lang}.png`;
		}

		if (
			currentPath === '/video-converter' || currentPath.startsWith('/video-converter/') ||
			currentPath === '/mov-to-mp4' || currentPath.startsWith('/mov-to-mp4/') ||
			currentPath === '/avi-to-mp4' || currentPath.startsWith('/avi-to-mp4/') ||
			currentPath === '/mkv-to-mp4' || currentPath.startsWith('/mkv-to-mp4/') ||
			currentPath === '/webm-to-mp4' || currentPath.startsWith('/webm-to-mp4/')
		) {
			return `/og/video-converter/${lang}.png`;
		}

		return `/og/${lang}.png`;
	})());

	let ogImageUrl = $derived(`${$page.url.origin}${ogImagePath}`);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />

	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:url" content={$page.url.href} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogImageUrl} />

	<meta name="robots" content="index, follow" />

	<!-- canonical: tránh duplicate content, trỏ về URL chính xác của trang hiện tại -->
	<link
		rel="canonical"
		href={`${$page.url.origin}${currentLangKey === 'en' ? '' : `/${currentLangKey}`}${currentPath === '/' ? '' : currentPath}`}
	/>

	<!-- hreflang: dùng BCP 47 (zh-TW, pt-BR thay vì zh, pt) -->
	{#if !isBlogPost}
		<meta property="og:type" content="website" />

		{#each languages as lang}
			<link
				rel="alternate"
				hreflang={lang.hreflang}
				href={`${$page.url.origin}${lang.key === 'en' ? '' : `/${lang.key}`}${currentPath === '/' ? '' : currentPath}`}
			/>
		{/each}

		<!-- x-default: trỏ về bản English khi không match ngôn ngữ nào -->
		<link
			rel="alternate"
			hreflang="x-default"
			href={`${$page.url.origin}${currentPath === '/' ? '' : currentPath}`}
		/>
	{:else}
		<meta property="og:type" content="article" />
		<!-- Blog post: chỉ self-reference, không cross-language -->
		<link rel="alternate" hreflang={activeLang.hreflang} href={$page.url.href} />
	{/if}
</svelte:head>

<header class="main-header">
	<div class="hinner">
		<a href={homeHref} class="logo">
			<span class="logo-name">Squishy<span>file</span></span>
		</a>

		<nav class="hnav">
			<div bind:this={toolsWrap} class:open={toolsOpen} class="tools-wrap">
				<button
					class:active={isToolPage}
					class="tools-btn"
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						toolsOpen = !toolsOpen;
						langOpen = false;
					}}
				>
					<span>{toolsLabel}</span>
					<ChevronDown size={11} strokeWidth={2} />
				</button>

				<div class="tools-menu">
					<a href={compressVideoHref} class:active={isCompressVideo} onclick={() => (toolsOpen = false)}>
						<Zap size={13} strokeWidth={2.2} />
						<span>{t('tab.compress')}</span>
					</a>

					<a href={videoConverterHref} class:active={isVideoConverter} onclick={() => (toolsOpen = false)}>
						<RefreshCw size={13} strokeWidth={2.2} />
						<span>{convertLabel}</span>
					</a>

					<a href={compressPdfHref} class:active={isCompressPdf} onclick={() => (toolsOpen = false)}>
						<FileText size={13} strokeWidth={2.2} />
						<span>{t('tab.pdf')}</span>
					</a>

					<a href={videoToMp3Href} class:active={isVideoToMp3} onclick={() => (toolsOpen = false)}>
						<Music size={13} strokeWidth={2.2} />
						<span>{t('tab.mp3')}</span>
					</a>
				</div>
			</div>

			<a href={blogHref} class:active={isBlog}>{t('nav.blog') || 'Blog'}</a>
		</nav>

		<div class="hright">
			<div bind:this={langWrap} class:open={langOpen} class="lang-wrap">
				<button
					class="lang-btn"
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						langOpen = !langOpen;
						toolsOpen = false;
					}}
				>
					<span class="flag">{activeLang.flag}</span>
					<span>{activeLang.code}</span>
					<ChevronDown size={11} strokeWidth={2} class="chevron-icon" />
				</button>

				<div class="lang-menu">
					{#each languages as lang}
						<button
							class:on={activeLang.key === lang.key}
							class="lang-opt"
							type="button"
							onclick={() => switchLanguage(lang.key)}
						>
							<span class="lf">{lang.flag}</span>
							<span class="ln">{lang.name}</span>
							<span class="lc">{lang.code}</span>
						</button>
					{/each}
				</div>
			</div>

			<button class:open={mobileOpen} class="ham-btn" type="button" onclick={toggleMobileMenu} aria-label="Menu">
				<span></span><span></span><span></span>
			</button>
		</div>
	</div>
</header>

<div class:open={mobileOpen} class="mobile-menu">
	<a href={homeHref} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><Home size={18} /></span><span>{t('nav.home') || 'Home'}</span>
	</a>

	<a href={compressVideoHref} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><Zap size={18} /></span><span>{t('tab.compress')}</span>
	</a>

	<a href={videoConverterHref} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><RefreshCw size={18} /></span><span>{convertLabel}</span>
	</a>

	<a href={compressPdfHref} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><FileText size={18} /></span><span>{t('tab.pdf')}</span>
	</a>

	<a href={videoToMp3Href} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><Music size={18} /></span><span>{t('tab.mp3')}</span>
	</a>

	<a href={blogHref} class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><FileText size={18} /></span><span>{t('nav.blog') || 'Blog'}</span>
	</a>

	<div class="mm-divider"></div>

	<div class="mm-lang-grid">
		{#each languages as lang}
			<button
				class:on={activeLang.key === lang.key}
				class="mm-lang-opt"
				type="button"
				onclick={() => switchLanguage(lang.key)}
			>
				<span class="mlf">{lang.flag}</span>
				<span class="mln">{lang.name}</span>
			</button>
		{/each}
	</div>
</div>

{@render children()}

<!-- START Ads -->
<!-- Side Ad Banners — chỉ render trên desktop qua CSS -->
<div class="banner-left" id="ad-left"></div>
<div class="banner-right" id="ad-right"></div>
<!-- END Ads -->

<footer>
	<div class="wrap">
		<p>
			{@html t('footer.copy')}
			<a href={privacyHref}>{t('footer.privacy') || 'Privacy Policy'}</a> &nbsp;·&nbsp;
			<a href={termsHref}>{t('footer.terms') || 'Terms of Service'}</a> &nbsp;·&nbsp;
			<a href={contactHref}>{t('footer.contact') || 'Contact'}</a>
		</p>
	</div>
</footer>

<style>
	/* Nav links with icons */
	.hnav {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.hnav a,
	.tools-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.tools-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.tools-btn {
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0;
	}

	.tools-btn.active,
	.tools-wrap.open .tools-btn {
		color: var(--brand);
	}

	.tools-menu {
		position: absolute;
		top: calc(100% + 12px);
		left: 0;
		z-index: 50;
		min-width: 184px;
		padding: 5px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surf);
		box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		pointer-events: none;
		transition:
			opacity 0.14s ease,
			transform 0.14s ease,
			visibility 0.14s ease;
	}

	.tools-wrap.open .tools-menu {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
		pointer-events: auto;
	}

	.tools-menu a {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 8px;
		border-radius: 7px;
		line-height: 1.2;
		text-decoration: none;
		white-space: nowrap;
	}

	.tools-menu a:hover,
	.tools-menu a.active {
		background: color-mix(in srgb, var(--brand) 9%, transparent);
		color: var(--brand);
	}

	.tools-menu span {
		max-width: 170px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.hnav {
			display: none;
		}
	}
</style>
