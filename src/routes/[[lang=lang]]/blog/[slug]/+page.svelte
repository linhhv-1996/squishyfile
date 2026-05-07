<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.meta.title} | SquishyFile Blog</title>
	<meta name="description" content="{data.meta.description}" />
	<meta property="og:title" content="{data.meta.title}" />
	<meta property="og:description" content="{data.meta.description}" />
</svelte:head>

<main class="wrap">
    <div class="legal-box">
        <article class="prose">
            <header style="margin-bottom: 32px;">
                <h1 style="margin-bottom: 8px; border: none; padding: 0;">{data.meta.title}</h1>
                <p style="color: var(--muted); font-size: 13px; margin: 0;">Published on: {data.meta.date}</p>
            </header>
            
            {@html data.content}
        </article>
    </div>
</main>

<style>
    /* CSS COPY Y NGUYÊN TỪ TRANG PRIVACY ĐỂ RENDER MARKDOWN */
    .legal-box { padding: 40px 0 60px; min-height: 60vh; animation: fadeUp .3s ease; }
    .prose { color: var(--muted); line-height: 1.7; }
    .prose :global(h1) { font-family: 'Noto Sans JP', sans-serif; font-size: 32px; font-weight: 800; color: var(--text); margin-bottom: 24px; letter-spacing: -0.5px; }
    .prose :global(h2) { font-family: 'Noto Sans JP', sans-serif; font-size: 20px; font-weight: 700; color: var(--text); margin: 32px 0 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .prose :global(h3) { font-size: 16px; color: var(--text); margin: 20px 0 12px; }
    .prose :global(p) { margin-bottom: 16px; }
    .prose :global(ul) { margin-bottom: 16px; padding-left: 20px; }
    .prose :global(li) { margin-bottom: 8px; }
    .prose :global(strong) { color: var(--text); font-weight: 600; }
    .prose :global(a) { color: var(--accent); text-decoration: none; transition: .2s; }
    .prose :global(a:hover) { text-decoration: underline; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
