export interface BlogPost {
	slug: string;
	title: string;
	excerpt: string;
	content: string;
	date: string;
	readTime: number;
	tags: string[];
	cover: string; // gradient CSS value
}

export const posts: BlogPost[] = [
	{
		slug: 'compress-video-discord',
		title: 'How to Compress Video for Discord Without Losing Quality',
		excerpt:
			'Discord enforces an 8 MB file limit for free users. Learn how to compress your video clips to fit perfectly while keeping them sharp.',
		date: '2026-05-05',
		readTime: 5,
		tags: ['Discord', 'Compression', 'Tips'],
		cover: 'linear-gradient(135deg, #4f8cff22 0%, #7c5cfc22 100%)',
		content: `
## Why Discord Has an 8 MB Limit

Discord's free tier caps uploaded files at **8 MB** to keep server costs manageable. If you're sharing a gaming clip, reaction video, or funny moment with friends, you've almost certainly hit this wall.

The trick is to compress your video smartly — reducing file size without making the video look pixelated or washed out.

## The Quick Way: Use SquishyFile

SquishyFile runs entirely in your browser, which means:

- **No uploads to a server** — your video never leaves your device
- **No watermarks** added to your clip
- **No account required** — just drop and compress

Simply drop your video onto the compressor, click the **Discord** preset in the "Target File Size" section, and hit **Compress Now**. The tool will target 8 MB automatically.

## Understanding Video Compression

When you compress a video, you're reducing its **bitrate** — the amount of data used per second of video. Lower bitrate = smaller file, but also lower detail.

Key factors that affect quality:

| Factor | Impact |
|--------|--------|
| Resolution | Lower res = smaller file |
| Frame rate | 30 fps vs 60 fps makes a big difference |
| Codec | H.264 is efficient; newer codecs like AV1 compress better |
| Content type | Static scenes compress better than fast action |

## Tips for Best Results

1. **Trim the clip first** — Cut out dead time at the start/end before compressing. Less footage = smaller file.
2. **Target a realistic size** — If your raw clip is 200 MB and you need 8 MB, expect some quality loss. Aim for your clip to be under ~40 MB before compressing to 8 MB for best results.
3. **Use MP4 (H.264)** — Discord plays MP4 files perfectly. Avoid formats like AVI or MKV which may not preview inline.
4. **Keep it under 2 minutes** — Longer clips need more data. Short punchy clips look great even at 8 MB.

## Checking the Result

After compression, SquishyFile shows you the original size, compressed size, and how much you saved. Download the file and drag it directly into Discord to check it plays inline.

If the quality isn't acceptable, try a slightly higher target (10 MB) — Discord will still let you share it as a download link rather than an inline preview.
`,
	},
	{
		slug: 'mp4-vs-webm',
		title: 'MP4 vs WebM: Which Video Format Should You Use in 2026?',
		excerpt:
			`MP4 and WebM are the two dominant web video formats. Here's a practical breakdown of when to use each one.`,
		date: '2026-05-03',
		readTime: 6,
		tags: ['Formats', 'WebM', 'MP4'],
		cover: 'linear-gradient(135deg, #22d07a22 0%, #4f8cff22 100%)',
		content: `
## The Short Answer

- Use **MP4** for sharing files with people (Discord, email, messaging apps, social media)
- Use **WebM** for video embedded on websites and web apps

## What is MP4?

MP4 (MPEG-4 Part 14) is the most universally supported video container format. It uses the **H.264** codec (or the newer H.265/HEVC) and works on virtually every device and platform:

- ✅ Windows, macOS, iOS, Android
- ✅ Discord, Telegram, WhatsApp, LINE
- ✅ YouTube, Twitter/X, Instagram
- ✅ Email clients (Gmail, Outlook)
- ✅ Every major browser

The main drawback: MP4 with H.264 isn't as efficient as newer codecs. Files can be larger than necessary.

## What is WebM?

WebM is an open-source format developed by Google, designed specifically for the web. It uses the **VP8/VP9** or **AV1** codec, which achieves significantly better compression than H.264 at the same quality level.

- ✅ Chrome, Firefox, Edge (excellent support)
- ✅ YouTube (used internally)
- ⚠️ Safari support is limited (WebM VP8/VP9 only in Safari 16+)
- ❌ Many messaging apps don't support it
- ❌ WhatsApp, LINE, Telegram may not play WebM inline

## File Size Comparison

At the same perceived quality, WebM files are typically **20–40% smaller** than MP4. This matters a lot for web performance.

| Format | Relative File Size | Compatibility |
|--------|-------------------|---------------|
| MP4 (H.264) | 100% (baseline) | Universal |
| MP4 (H.265) | ~50% | Good (patent-encumbered) |
| WebM (VP9) | ~60% | Web-only |
| WebM (AV1) | ~45% | Cutting edge |

## Practical Recommendation

**For sharing with friends:** Always use MP4. It will play everywhere without issues.

**For your website or web app:** Consider WebM, but also provide an MP4 fallback:

\`\`\`html
<video>
  <source src="video.webm" type="video/webm">
  <source src="video.mp4" type="video/mp4">
</video>
\`\`\`

**For archiving:** MP4 with H.264 is the safe choice for long-term compatibility.

## Converting Between Formats

SquishyFile lets you convert between MP4, WebM, MOV, AVI, and GIF directly in your browser — no software to install.
`,
	},
	{
		slug: 'reduce-video-size-email',
		title: 'How to Reduce Video File Size for Email (Gmail, Outlook)',
		excerpt:
			`Email attachments have strict size limits. Here's how to compress your video down to fit Gmail's 25 MB limit without quality disaster.`,
		date: '2026-04-30',
		readTime: 4,
		tags: ['Email', 'Gmail', 'Compression'],
		cover: 'linear-gradient(135deg, #ff5c6a22 0%, #ff9f4322 100%)',
		content: `
## Email Attachment Size Limits

Before you try to attach a video to an email, know the limits:

| Email Service | Attachment Limit |
|--------------|-----------------|
| Gmail | 25 MB |
| Outlook / Hotmail | 20 MB |
| Yahoo Mail | 25 MB |
| Apple Mail | 20 MB (iCloud Mail Drop: up to 5 GB) |

These limits apply to the **total size** of all attachments in a single email, not each one individually.

## Why You Shouldn't Just Zip It

ZIP compression works great for documents and images, but video files are already heavily compressed. Zipping a 50 MB MP4 will typically result in a ~49.5 MB ZIP — essentially no improvement.

The right approach is to re-encode the video with a lower bitrate.

## Step-by-Step: Compress for Gmail (25 MB)

1. Open [SquishyFile](/) and drop your video onto the upload zone
2. Under **Target File Size**, click the **Gmail** preset button
3. Click **Compress Now**
4. Download the compressed video

The compressor targets 25 MB automatically. For short clips (under 2 minutes), the quality will be excellent. For longer videos, you may want to trim the clip first.

## Alternative: Use Google Drive or WeTransfer

If your video is genuinely long (5+ minutes), compression to 25 MB will result in poor quality. Instead:

1. Upload the original video to **Google Drive**
2. Right-click → **Get shareable link**
3. Paste the link in your email

This is free, fast, and the recipient gets full quality. Gmail even integrates Drive sharing directly in the compose window.

## Tips for Better Compression Results

- **Trim first**: Only send the part that matters. A 10-second clip compresses much better than a 5-minute video.
- **Lower resolution if needed**: 1080p video compressed to 25 MB looks okay; 720p compressed to 25 MB looks great.
- **Use MP4**: It's the most email-compatible format and compresses efficiently.
`,
	},
	{
		slug: 'video-formats-social-media-2026',
		title: 'Best Video Formats for Every Social Media Platform in 2026',
		excerpt:
			'Each platform has different requirements. This guide covers the optimal format, resolution, and size for every major social media platform.',
		date: '2026-04-26',
		readTime: 7,
		tags: ['Social Media', 'Formats', 'Guide'],
		cover: 'linear-gradient(135deg, #7c5cfc22 0%, #22d07a22 100%)',
		content: `
## Quick Reference Table

| Platform | Format | Max Size | Recommended Resolution |
|----------|--------|----------|----------------------|
| Instagram Reels | MP4 | 4 GB | 1080×1920 (9:16) |
| TikTok | MP4 | 287 MB | 1080×1920 (9:16) |
| YouTube | MP4 | 256 GB | 1920×1080 or 4K |
| Twitter/X | MP4 | 512 MB | 1280×720 |
| Facebook | MP4 | 4 GB | 1280×720 |
| LinkedIn | MP4 | 5 GB | 1920×1080 |
| Discord | MP4 | 8 MB (free) / 50 MB (Nitro) | Any |

## Instagram

Instagram supports MP4 and MOV. For **Feed posts**, use 1:1 (square) or 4:5 (portrait). For **Reels**, 9:16 vertical is ideal.

Instagram re-encodes your video after upload, so don't obsess over file size — just keep it under the limit and upload the highest quality you have.

**Tip**: Upload MP4 with H.264, not H.265. Instagram's encoder handles H.264 better.

## TikTok

TikTok is strict about vertical video (9:16). The **287 MB** limit is generous for typical clips, but if you're exporting a long-form video, you may need to compress.

TikTok also adds its own watermark if you export from the app — use SquishyFile to compress your original file before uploading.

## Twitter/X

Twitter compresses video aggressively on upload. The **512 MB** limit sounds high, but Twitter downgrades everything to relatively low bitrates anyway. There's no point uploading a 4K file — 720p or 1080p is sufficient.

GIF files work on Twitter but are converted to video on upload, which often looks worse. Upload an actual MP4 instead.

## YouTube

YouTube accepts almost anything and is excellent at re-encoding. However, for fastest processing and best results, upload **MP4 with H.264** codec.

YouTube **Shorts** (under 60 seconds) should be 9:16 vertical, just like TikTok and Reels.

## Compressing for Social Media

SquishyFile can convert your video to the right format and compress it to meet platform limits:

1. Drop your video into the converter
2. Select your target format (MP4 for most platforms)
3. Use the size target presets for Discord/Twitter/X
4. Download and upload to your platform

For platforms with generous limits (YouTube, Instagram, LinkedIn), just convert the format if needed — no need to compress aggressively.
`,
	},
	{
		slug: 'convert-video-without-software',
		title: 'How to Convert Video Format Without Installing Any Software',
		excerpt:
			`You don't need to install VLC, HandBrake, or FFmpeg. Modern browsers can convert video formats entirely in-browser, privately and instantly.`,
		date: '2026-04-22',
		readTime: 4,
		tags: ['Conversion', 'Browser', 'No-install'],
		cover: 'linear-gradient(135deg, #4f8cff22 0%, #22d07a22 100%)',
		content: `
## The Old Way vs. The New Way

**Old way**: Download HandBrake, install FFmpeg via the command line, figure out codec settings, wait for conversion, repeat.

**New way**: Open a browser tab, drop your file, click convert, done.

Browser-based video tools have become genuinely powerful. WebAssembly (WASM) allows tools like SquishyFile to run near-native code (including FFmpeg) directly inside your browser tab, with no server involved.

## Why In-Browser Conversion Matters

### Privacy
Your video never leaves your device. Traditional online converters (like the many "free online converter" sites) upload your file to their server, process it there, then let you download the result. Your video passes through their infrastructure.

With SquishyFile, the conversion happens inside your browser tab. Nothing is uploaded anywhere.

### Speed
Since there's no upload/download round-trip, you're limited only by your CPU speed. Modern laptops convert 1080p video at several times realtime speed.

### Simplicity
No accounts, no subscriptions, no watermarks. Open the page, use it, close it.

## Supported Conversions

SquishyFile supports converting between:

- **MP4** ↔ **WebM** (great for web usage)
- **MP4** ↔ **MOV** (for Apple ecosystem compatibility)
- **MP4** ↔ **AVI** (for legacy software)
- **Video** → **GIF** (for sharing short loops)

## How to Convert

1. Go to the **Convert Format** tab
2. Drop your video file (any format)
3. Select your output format from the buttons
4. Click **Convert Now**
5. Download the converted file

The conversion runs in the background. You can switch browser tabs while it's processing.

## When You Might Still Need Desktop Software

- **4K HDR conversion** with color grading
- **Batch conversion** of hundreds of files
- **Advanced codec control** (custom bitrate, audio tracks, subtitles)
- **Very long videos** (2+ hours) where browser memory becomes a constraint

For everyday clips and sharing scenarios, browser-based conversion handles everything you need.
`,
	},
];

export function getPost(slug: string): BlogPost | undefined {
	return posts.find((p) => p.slug === slug);
}

export function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}
