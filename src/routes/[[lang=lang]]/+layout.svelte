<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.css';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { ChevronDown, Home, FileText, Zap, Music } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Tự động nhận diện ngôn ngữ từ URL
	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let langOpen = $state(false);
	let mobileOpen = $state(false);
	let langWrap: HTMLDivElement;

	function switchLanguage(newLang: string) {
		// Xác định đường dẫn trang chủ của ngôn ngữ mới
		// Nếu là 'en' thì về '/', các ngôn ngữ khác thì về '/[code]'
		const newHomePath = newLang === 'en' ? '/' : `/${newLang}`;

		langOpen = false;
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
		const closeLangOnOutsideClick = (event: MouseEvent) => {
			if (langWrap && !langWrap.contains(event.target as Node)) langOpen = false;
		};
		document.addEventListener('click', closeLangOnOutsideClick);
		return () => document.removeEventListener('click', closeLangOnOutsideClick);
	});

	// Xử lý link thông minh dựa theo ngôn ngữ
	let prefix = $derived(currentLangKey !== 'en' ? `/${currentLangKey}` : '');
	let homeHref = $derived(prefix || '/');
	let blogHref = $derived(`${prefix}/blog`);
	let compressVideoHref = $derived(`${prefix}/compress-video`);
	let compressPdfHref = $derived(`${prefix}/compress-pdf`);
	let videoToMp3Href = $derived(`${prefix}/video-to-mp3`);
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
			<a href={compressVideoHref} class:active={isCompressVideo}>
				<Zap size={13} strokeWidth={2.2} /> {t('tab.compress')}
			</a>
			<a href={compressPdfHref} class:active={isCompressPdf}>
				<FileText size={13} strokeWidth={2.2} /> {t('tab.pdf')}
			</a>
			<a href={videoToMp3Href} class:active={isVideoToMp3}>
				<Music size={13} strokeWidth={2.2} /> {t('tab.mp3')}
			</a>
			
			<a href={blogHref} class:active={isBlog}>{t('nav.blog') || 'Blog'}</a>
		</nav>

		<div class="hright">
			<div bind:this={langWrap} class:open={langOpen} class="lang-wrap">
				<button class="lang-btn" type="button" onclick={(event) => {
					event.stopPropagation();
					langOpen = !langOpen;
				}}>
					<span class="flag">{activeLang.flag}</span>
					<span>{activeLang.code}</span>
					<ChevronDown size={11} strokeWidth={2} class="chevron-icon" />
				</button>
				<div class="lang-menu">
					{#each languages as lang}
						<button class:on={activeLang.key === lang.key} class="lang-opt" type="button" onclick={() => switchLanguage(lang.key)}>
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
			<button class:on={activeLang.key === lang.key} class="mm-lang-opt" type="button" onclick={() => switchLanguage(lang.key)}>
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
		<p>{@html t('footer.copy')} 
            <a href={privacyHref}>{t('footer.privacy') || 'Privacy Policy'}</a> &nbsp;·&nbsp;
            <a href={termsHref}>{t('footer.terms') || 'Terms of Service'}</a> &nbsp;·&nbsp;
            <a href={contactHref}>{t('footer.contact') || 'Contact'}</a>
        </p>
	</div>
</footer>

<style>
	/* Nav links with icons */
	.hnav a {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
</style>
