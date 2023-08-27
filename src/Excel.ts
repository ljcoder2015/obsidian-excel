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
	}
}
