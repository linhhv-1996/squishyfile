import { marked } from "marked";

const howToModules = import.meta.glob(
	"$lib/contents/seo/video-to-mp3/*.md",
	{
		query: "?raw",
		import: "default",
	},
);

export async function load({ params }) {
	const langKey = params.lang || "en";
	const path = `/src/lib/contents/seo/video-to-mp3/${langKey}.md`;

	const loader =
		howToModules[path] ??
		howToModules["/src/lib/contents/seo/video-to-mp3/en.md"];

	let howToHtml = "";

	if (loader) {
		const raw = (await loader()) as string;
		howToHtml = marked.parse(raw) as string;
	}

	return {
		howToHtml,
	};
}
