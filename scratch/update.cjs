const fs = require('fs');

const path = './src/lib/i18n/translations.ts';
let content = fs.readFileSync(path, 'utf-8');

const updates = {
	en: {
		'tab.pdf': 'Compress PDF',
		'btn.removePassword': 'Compress PDF',
		'res.pdf.title': 'PDF compressed!',
		'res.pdf.sub': 'Your compressed PDF is ready to download',
		'btn.dl.pdf': 'Download Compressed PDF',
		'status.removingPass': 'Compressing PDF…',
		'sec.pdfPasswordOpt': 'Remove password (Optional)',
	},
	de: {
		'tab.pdf': 'PDF komprimieren',
		'btn.removePassword': 'PDF komprimieren',
		'res.pdf.title': 'Komprimierung abgeschlossen!',
		'res.pdf.sub': 'Ihre komprimierte PDF ist bereit',
		'btn.dl.pdf': 'Komprimierte PDF herunterladen',
		'status.removingPass': 'PDF wird komprimiert…',
		'sec.pdfPasswordOpt': 'Passwort entfernen (Optional)',
	},
	ja: {
		'tab.pdf': 'PDFを圧縮',
		'btn.removePassword': 'PDFを圧縮',
		'res.pdf.title': 'PDFの圧縮が完了しました！',
		'res.pdf.sub': '圧縮されたPDFの準備ができました',
		'btn.dl.pdf': '圧縮済みPDFをダウンロード',
		'status.removingPass': 'PDFを圧縮中…',
		'sec.pdfPasswordOpt': 'パスワードを削除 (任意)',
	},
	ko: {
		'tab.pdf': 'PDF 압축',
		'btn.removePassword': 'PDF 압축',
		'res.pdf.title': 'PDF 압축 완료!',
		'res.pdf.sub': '압축된 PDF가 준비되었습니다',
		'btn.dl.pdf': '압축된 PDF 다운로드',
		'status.removingPass': 'PDF 압축 중…',
		'sec.pdfPasswordOpt': '비밀번호 제거 (선택 사항)',
	},
	th: {
		'tab.pdf': 'บีบอัด PDF',
		'btn.removePassword': 'บีบอัด PDF',
		'res.pdf.title': 'บีบอัด PDF สำเร็จ!',
		'res.pdf.sub': 'PDF ที่บีบอัดแล้วพร้อมดาวน์โหลด',
		'btn.dl.pdf': 'ดาวน์โหลด PDF ที่บีบอัดแล้ว',
		'status.removingPass': 'กำลังบีบอัด PDF…',
		'sec.pdfPasswordOpt': 'ลบรหัสผ่าน (ไม่บังคับ)',
	},
	zh: {
		'tab.pdf': '壓縮 PDF',
		'btn.removePassword': '壓縮 PDF',
		'res.pdf.title': 'PDF 壓縮完成！',
		'res.pdf.sub': '您的壓縮 PDF 已準備就緒',
		'btn.dl.pdf': '下載壓縮的 PDF',
		'status.removingPass': '正在壓縮 PDF…',
		'sec.pdfPasswordOpt': '移除密碼（選填）',
	},
	fr: {
		'tab.pdf': 'Compresser PDF',
		'btn.removePassword': 'Compresser PDF',
		'res.pdf.title': 'PDF compressé !',
		'res.pdf.sub': 'Votre PDF compressé est prêt',
		'btn.dl.pdf': 'Télécharger le PDF compressé',
		'status.removingPass': 'Compression du PDF…',
		'sec.pdfPasswordOpt': 'Supprimer le mot de passe (Facultatif)',
	},
	id: {
		'tab.pdf': 'Kompres PDF',
		'btn.removePassword': 'Kompres PDF',
		'res.pdf.title': 'PDF berhasil dikompres!',
		'res.pdf.sub': 'PDF Anda yang telah dikompres siap diunduh',
		'btn.dl.pdf': 'Unduh PDF yang Dikompres',
		'status.removingPass': 'Mengompres PDF…',
		'sec.pdfPasswordOpt': 'Hapus kata sandi (Opsional)',
	},
	es: {
		'tab.pdf': 'Comprimir PDF',
		'btn.removePassword': 'Comprimir PDF',
		'res.pdf.title': '¡PDF comprimido!',
		'res.pdf.sub': 'Tu PDF comprimido está listo',
		'btn.dl.pdf': 'Descargar PDF comprimido',
		'status.removingPass': 'Comprimiendo PDF…',
		'sec.pdfPasswordOpt': 'Quitar contraseña (Opcional)',
	},
	pt: {
		'tab.pdf': 'Comprimir PDF',
		'btn.removePassword': 'Comprimir PDF',
		'res.pdf.title': 'PDF comprimido!',
		'res.pdf.sub': 'Seu PDF comprimido está pronto',
		'btn.dl.pdf': 'Baixar PDF comprimido',
		'status.removingPass': 'Comprimindo PDF…',
		'sec.pdfPasswordOpt': 'Remover senha (Opcional)',
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
		} else {
			// Append before the end of the block, assuming last item has no trailing comma or just insert at the end
			// It's safer to just replace 'file.type.pdf': 'PDF', with 'file.type.pdf': 'PDF',\n\t\t'key': 'val',
			if (key === 'sec.pdfPasswordOpt') {
				block = block.replace(`'file.type.pdf': 'PDF'`, `'file.type.pdf': 'PDF',\n\t\t'sec.pdfPasswordOpt': '${val}'`);
				// Handle pt which has no comma
				block = block.replace(`'file.type.pdf': 'PDF',,`, `'file.type.pdf': 'PDF',`);
			}
		}
	}
	content = content.substring(0, blockStart) + block + content.substring(blockEnd);
}

fs.writeFileSync(path, content, 'utf-8');
console.log('Updated translations');
