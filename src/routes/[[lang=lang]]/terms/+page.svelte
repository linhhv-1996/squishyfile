<script lang="ts">
    import { page } from '$app/stores';
    import { marked } from 'marked';

    // Chỉ load các file terms.md
    const termsModules = import.meta.glob('$lib/contents/legal/*/terms.md', { 
        query: '?raw', 
        import: 'default' 
    });

    let htmlContent = $state('');
    let isLoading = $state(true);

    let lang = $derived($page.params.lang || 'en');

    $effect(() => {
        const loadContent = async () => {
            isLoading = true;
            try {
                const path = `/src/lib/contents/legal/${lang}/terms.md`;
                
                if (termsModules[path]) {
                    const mdText = await termsModules[path]() as string;
                    htmlContent = await marked.parse(mdText);
                } else {
                    // Fallback cứng về tiếng Anh nếu không tìm thấy file ngôn ngữ hiện tại
                    const fallbackPath = `/src/lib/contents/legal/en/terms.md`;
                    if (termsModules[fallbackPath]) {
                        const mdText = await termsModules[fallbackPath]() as string;
                        htmlContent = await marked.parse(mdText);
                    } else {
                        htmlContent = '<h1>Terms of Service not found</h1>';
                    }
                }
            } catch (error) {
                console.error("Error loading Terms of Service:", error);
                htmlContent = '<h1>Error loading document</h1>';
            } finally {
                isLoading = false;
            }
        };

        loadContent();
    });
</script>

<svelte:head>
    <title>Terms of Service - SquishyFile</title>
</svelte:head>

<main class="wrap">
    <div class="legal-box">
        {#if isLoading}
            <div class="skeleton">
                <div class="line title"></div>
                <div class="line"></div>
                <div class="line"></div>
                <div class="line half"></div>
            </div>
        {:else}
            <article class="prose">
                {@html htmlContent}
            </article>
        {/if}
    </div>
</main>

<style>
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

    .skeleton .line { height: 16px; background: var(--surf2); border-radius: var(--rsm); margin-bottom: 12px; animation: pulse 1.5s infinite; }
    .skeleton .title { height: 32px; width: 60%; margin-bottom: 30px; }
    .skeleton .half { width: 40%; }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
