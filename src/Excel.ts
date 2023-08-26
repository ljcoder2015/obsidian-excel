import { MarkdownRenderChild } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";

export class Excel extends MarkdownRenderChild {
	data: string;
	index: number;

	constructor(containerEl: HTMLElement, data: string, index: number) {
		super(containerEl);
		this.data = data;
		this.index = index;
	}

	onload(): void {
        console.log
		const sheetEle = this.containerEl.createDiv({
			cls: 'sheet-iframe',
			attr: {
				id: `x-spreadsheet-${this.index}`,
			},
		});

		const jsonData = JSON.parse(this.data || "{}") || {};
		//@ts-ignore
		const sheet = new Spreadsheet(sheetEle, {
			mode: "read",
			showToolbar: false,
			showBottomBar: true,
			view: {
				height: () => 300,
				width: () => this.containerEl.clientWidth,
			},
		}).loadData(jsonData); // load data

		// @ts-ignore
		sheet.validate();

		// const sheetIframe = this.containerEl.createEl("iframe", {
		// 	cls: "sheet-iframe",
		// });

		// var document = sheetIframe.contentDocument
		// if (document) {
		// 	// 原生插入div
		// 	const sheetDiv = document.createElement("div");
		// 	sheetDiv.id = "x-spreadsheet";
		// 	document.body.appendChild(sheetDiv);

		//     // <link rel="stylesheet" href="https://unpkg.com/x-data-spreadsheet@1.1.9/dist/xspreadsheet.css">
		//     // <script src="https://unpkg.com/x-data-spreadsheet@1.1.9/dist/xspreadsheet.js"></script>

		//     const cssEl = document.createElement('link')
		//     cssEl.rel = 'stylesheet'
		//     cssEl.href = 'https://unpkg.com/x-data-spreadsheet@1.1.9/dist/xspreadsheet.css'
		//     document.head.appendChild(cssEl)

		//     const scritpLinkEl = document.createElement('script')
		//     scritpLinkEl.lang = 'javascript';
		//     scritpLinkEl.type = 'text/javascript';
		//     scritpLinkEl.text = Spreadsheet.toString()

		//     document.body.appendChild(scritpLinkEl)

		//     console.log(scritpLinkEl, '-----')

		// 	const scriptString = `
		//         const s = x_spreadsheet("#x-spreadsheet", {
		//             mode: "read",
		//             view: {
		//                 height: () => ${this.containerEl.clientHeight},
		//                 width: () => 300,
		//             },
		//         }).loadData(${this.data});

		//         s.validate();
		//     `;

		// 	const sEl = document.createElement("script");
		// 	sEl.text = scriptString;
		// 	document.body.appendChild(sEl);
		// }

		// console.log(
		//     "sheetIframe",
		//     sheetIframe
		// );

		// this.containerEl.replaceWith(sheetIframe);
	}
}
