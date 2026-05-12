export function GET() {
    const htmlContent = `<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: b1bed723c7c83119</body>
</html>`;

    return new Response(htmlContent, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=UTF-8'
        }
    });
}
