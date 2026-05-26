import { marked } from "marked";

const contentModules = import.meta.glob("$lib/contents/seo/sns-character-limit/*.md", {
	query: "?raw",
	import: "default",
});

export async function load({ params }) {
	const langKey = params.lang || "en";
	const path = `/src/lib/contents/seo/sns-character-limit/${langKey}.md`;

	const loader =
		contentModules[path] ??
		contentModules["/src/lib/contents/seo/sns-character-limit/en.md"];

	let contentHtml = "";

	if (loader) {
		const raw = (await loader()) as string;
		contentHtml = marked.parse(raw) as string;
	}

	return {
		contentHtml,
	};
}
