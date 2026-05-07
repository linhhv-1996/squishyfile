const fs = require('fs');

const path = './src/lib/i18n/translations.ts';
let content = fs.readFileSync(path, 'utf-8');

const updates = {
	en: {
		'meta.title': 'SquishyFile – Free Video & PDF Compressor',
		'hero.title': 'Compress Videos & PDFs<br />in Your Browser',
		'meta.desc': 'Compress videos and PDFs for free, directly in your browser. No upload to server, no watermark, 100% private.'
	},
	de: {
		'meta.title': 'SquishyFile – Video & PDF komprimieren – kostenlos',
		'hero.title': 'Videos & PDFs komprimieren<br />direkt im Browser',
		'meta.desc': 'Video und PDF kostenlos komprimieren – direkt im Browser, ohne Anmeldung. Kein Upload auf Server, kein Wasserzeichen, 100% Datenschutz.'
	},
	ja: {
		'meta.title': 'SquishyFile – 動画・PDF圧縮 無料ツール｜アップロード不要',
		'hero.title': '動画・PDF圧縮を<br />ブラウザで無料で',
		'meta.desc': 'ブラウザで動画・PDFを無料圧縮。アップロード不要・インストール不要・ログインなし。プライバシー保護100%。'
	},
	ko: {
		'meta.title': 'SquishyFile – 동영상 & PDF 압축 무료 온라인 도구',
		'hero.title': '동영상 & PDF 압축<br />브라우저에서 무료로',
		'meta.desc': '동영상과 PDF 용량 줄이기를 브라우저에서 무료로. 서버 업로드 없음, 회원가입 없음, 워터마크 없음. 개인정보 100% 보호.'
	},
	th: {
		'meta.title': 'SquishyFile – บีบอัดวิดีโอ & PDF ฟรี ออนไลน์',
		'hero.title': 'บีบอัดวิดีโอ & PDF<br />บนเบราว์เซอร์ ฟรี',
		'meta.desc': 'ลดขนาดไฟล์วิดีโอและ PDF ฟรีบนเบราว์เซอร์ ไม่ต้องอัปโหลดขึ้นเซิร์ฟเวอร์ ไม่ต้องสมัครสมาชิก ไม่มีลายน้ำ ปลอดภัย ความเป็นส่วนตัวสูง 100%'
	},
	zh: {
		'meta.title': 'SquishyFile – 影片 & PDF 壓縮 免費線上工具',
		'hero.title': '影片 & PDF 壓縮<br />免費線上處理',
		'meta.desc': '免費線上影片與 PDF 壓縮，唔使上載到伺服器，無須登入註冊，無浮水印，隱私保障100%，直接在瀏覽器完成。'
	},
	fr: {
		'meta.title': 'SquishyFile – Compresser Vidéo & PDF en Ligne Gratuit',
		'hero.title': 'Compresser Vidéos & PDFs<br />dans Votre Navigateur',
		'meta.desc': 'Compresseur gratuit en ligne : compresser vidéo et PDF directement dans votre navigateur. Sans inscription, sans filigrane, respect de la vie privée 100%.'
	},
	id: {
		'meta.title': 'SquishyFile – Kompres Video & PDF Online Gratis',
		'hero.title': 'Kompres Video & PDF<br />Langsung di Browser',
		'meta.desc': 'Kompres video dan PDF online gratis langsung di browser. Tanpa upload ke server, tanpa daftar, tanpa watermark. Privasi terjaga 100%.'
	},
	es: {
		'meta.title': 'SquishyFile – Comprimir Video y PDF Online Gratis',
		'hero.title': 'Comprimir Videos y PDFs<br />en Tu Navegador',
		'meta.desc': 'Compresor gratis online: comprimir video y PDF directamente en tu navegador. Sin registro, sin marca de agua, privacidad 100% garantizada.'
	},
	pt: {
		'meta.title': 'SquishyFile – Comprimir Vídeo & PDF Online Grátis',
		'hero.title': 'Comprimir Vídeos & PDFs<br />no Seu Navegador',
		'meta.desc': 'Compressor gratuito online: comprimir vídeo e PDF no navegador. Sem upload para servidor, sem cadastro, sem marca d\'água. Privacidade 100% garantida.'
	}
};

for (const lang of Object.keys(updates)) {
	const blockStart = content.indexOf(`\t${lang}: {`);
	if (blockStart === -1) continue;
	
	let blockEnd = content.indexOf(`\t},`, blockStart);
	if (blockEnd === -1) blockEnd = content.length;

	let block = content.substring(blockStart, blockEnd);
	
	for (const [key, val] of Object.entries(updates[lang])) {
		const regex = new RegExp(`'${key}':[\\s]*'.*'`, 'g');
		if (block.match(regex)) {
			block = block.replace(regex, `'${key}': '${val}'`);
		}
	}
	content = content.substring(0, blockStart) + block + content.substring(blockEnd);
}

fs.writeFileSync(path, content, 'utf-8');
console.log('Updated translations');
