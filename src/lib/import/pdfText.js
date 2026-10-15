// Read a PDF into positioned text items, in the browser. pdf.js is loaded only
// when a PDF is actually opened, so it doesn't weigh down the rest of the app.
// The password (for protected bank statements) is used to open the file in
// memory and is never stored or sent anywhere.

export class PdfPasswordError extends Error {
  constructor(wrong) {
    super(wrong ? 'That password did not open the statement.' : 'This statement is password-protected.')
    this.wrong = wrong
  }
}

export async function readPdfItems(arrayBuffer, password) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), password: password || undefined }).promise
  } catch (err) {
    if (err?.name === 'PasswordException') throw new PdfPasswordError(Boolean(password))
    throw err
  }

  const pages = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    pages.push({
      items: content.items
        .filter(i => i.str && i.str.trim())
        .map(i => ({ x: i.transform[4], y: i.transform[5], str: i.str })),
    })
  }
  await doc.destroy()
  return pages
}
