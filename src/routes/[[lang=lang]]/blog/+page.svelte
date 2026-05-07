<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	// Svelte 5 Runes
	let { data }: { data: PageData } = $props();
	
	// Tính toán tiền tố ngôn ngữ cho URL
	let langPrefix = $derived($page.params.lang ? `/${$page.params.lang}` : '');
</script>

<svelte:head>
	<title>Blog - SquishyFile</title>
	<meta name="description" content="Latest news and updates from SquishyFile blog." />
</svelte:head>

<main class="wrap">
    <div class="blog-container">
        <header class="blog-header">
            <h1>Blog</h1>
            <p>Latest articles and updates</p>
        </header>

        <div class="blog-list">
            {#each data.posts as post}
                <a href="{langPrefix}/blog/{post.slug}" class="post-card">
                    <div class="post-meta">
                        <span class="post-date">{post.date}</span>
                    </div>
                    <h2 class="post-title">{post.title}</h2>
                    <p class="post-desc">{post.description}</p>
                    <div class="post-footer">
                        <span class="read-more">Read more →</span>
                    </div>
                </a>
            {:else}
                <div class="empty-state">
                    <p>No posts available for this language yet.</p>
                </div>
            {/each}
        </div>
    </div>
</main>

<style>
    /* Container & Header */
    .blog-container { padding: 40px 0 60px; animation: fadeUp .3s ease; }
    .blog-header { margin-bottom: 40px; text-align: left; }
    .blog-header h1 { 
        font-family: 'Noto Sans JP', sans-serif; font-size: 36px; font-weight: 800; 
        color: var(--text); margin-bottom: 8px; letter-spacing: -1px; 
    }
    .blog-header p { color: var(--muted); font-size: 15px; }

    /* List & Cards */
    .blog-list { display: flex; flex-direction: column; gap: 20px; }
    
    .post-card {
        display: block; text-decoration: none;
        background: var(--surf); border: 1px solid var(--border);
        border-radius: var(--r); padding: 24px;
        transition: all 0.25s ease;
    }

    .post-card:hover {
        border-color: var(--accent);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .post-meta { margin-bottom: 12px; }
    .post-date { font-size: 12px; color: var(--muted); font-weight: 500; }

    .post-title {
        font-family: 'Noto Sans JP', sans-serif; font-size: 22px; font-weight: 700;
        color: var(--text); margin-bottom: 10px; line-height: 1.3;
        transition: color 0.2s;
    }
    .post-card:hover .post-title { color: var(--accent); }

    .post-desc {
        color: var(--muted); font-size: 14px; line-height: 1.6;
        margin-bottom: 16px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .read-more {
        font-size: 13px; font-weight: 600; color: var(--accent);
        opacity: 0.8; transition: opacity 0.2s;
    }
    .post-card:hover .read-more { opacity: 1; }

    .empty-state {
        text-align: center; padding: 60px 0;
        border: 1.5px dashed var(--border); border-radius: var(--r);
        color: var(--muted);
    }

    /* Animation y hệt trang Privacy */
    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Mobile tối ưu */
    @media (max-width: 580px) {
        .blog-header h1 { font-size: 28px; }
        .post-card { padding: 20px; }
        .post-title { font-size: 19px; }
    }
</style>
