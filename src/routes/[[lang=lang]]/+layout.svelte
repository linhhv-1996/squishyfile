<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { Film, Globe, ChevronDown, Home, FileText, Zap } from 'lucide-svelte';
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
	let privacyHref = $derived(`${prefix}/privacy`);
	let termsHref = $derived(`${prefix}/terms`);

	// Active link detection
	let isHome = $derived(
		$page.url.pathname === '/' || $page.url.pathname === `/${currentLangKey}`
	);
	let isBlog = $derived($page.url.pathname.includes('/blog'));
	let isCompressVideo = $derived($page.url.pathname.includes('/compress-video'));
	let isCompressPdf = $derived($page.url.pathname.includes('/compress-pdf'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
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

<footer>
	<div class="wrap">
		<p>{@html t('footer.copy')} 
			<a href={privacyHref}>{t('footer.privacy') || 'Privacy Policy'}</a> &nbsp;·&nbsp;
			<a href={termsHref}>{t('footer.terms') || 'Terms of Service'}</a>
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
