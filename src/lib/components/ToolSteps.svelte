<script lang="ts">
	type StepItem = {
		title: string;
		desc: string;
	};

	let {
		title = "",
		steps = [],
	}: {
		title?: string;
		steps?: StepItem[];
	} = $props();
</script>

<section class="steps-sec" aria-labelledby="steps-title">
	<h2 id="steps-title" class="steps-title">{title}</h2>

	<div class="steps-strip">
		{#each steps as step, i}
			<div class="step-item">
				<div class="step-top">
					<span class="step-num">{i + 1}</span>
					<span class="step-title">{step.title}</span>
				</div>
				<p class="step-desc">{step.desc}</p>
			</div>
		{/each}
	</div>
</section>

<style>
	.steps-sec {
		margin-top: 30px;
		margin-bottom: 10px;
	}

	.steps-title {
		font-size: 0.95rem;
		font-weight: 650;
		color: var(--text);
		margin: 0 0 10px;
		line-height: 1.35;
	}

	.steps-strip {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: 1px solid var(--border);
		border-radius: var(--r);
		background: var(--surf);
		overflow: hidden;
	}

	.step-item {
		position: relative;
		padding: 13px 14px;
		min-width: 0;
	}

	.step-item + .step-item {
		border-left: 1px solid var(--border);
	}

	.step-top {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 4px;
		min-width: 0;
	}

	.step-num {
		flex: 0 0 auto;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		font-size: 11px;
		font-weight: 700;
		line-height: 18px;
		text-align: center;
	}

	.step-title {
		min-width: 0;
		color: var(--text);
		font-size: 13.5px;
		font-weight: 500;
		line-height: 1.35;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.step-desc {
		margin: 0;
		color: var(--muted);
		font-size: 12.5px;
		line-height: 1.5;
	}

	@media (max-width: 599px) {
		.steps-strip {
			grid-template-columns: 1fr;
		}

		.step-item {
			padding: 12px 13px;
		}

		.step-item + .step-item {
			border-left: 0;
			border-top: 1px solid var(--border);
		}

		.step-title {
			white-space: normal;
		}
	}
</style>
