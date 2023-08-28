import { EditorView, WidgetType } from "@codemirror/view"
import Spreadsheet from "x-data-spreadsheet";

export class ExcelWidget extends WidgetType {
    data: string
    constructor(data: string) {
        super()
        this.data = data
    }

    toDOM(view: EditorView): HTMLElement {
        const time = new Date().getTime()
        const sheetEle = document.createDiv({
			cls: 'sheet-iframe',
			attr: {
				id: `x-spreadsheet-${time}`,
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
				width: () => document.body.clientWidth,
			},
		}).loadData(jsonData); // load data

		// @ts-ignore
		sheet.validate();

        return sheetEle
    }
}
