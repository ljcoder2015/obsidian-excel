import ExcelPlugin from "main";
import { TextFileView, WorkspaceLeaf } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";

export const VIEW_TYPE_EXCEL = "excel-view";

export class ExcelView extends TextFileView {
	public plugin: ExcelPlugin;
	public ownerWindow: Window;
	public ownerDocument: Document;
	public sheet: any;

	constructor(leaf: WorkspaceLeaf, plugin: ExcelPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;

		this.contentEl.empty();
		this.contentEl.createDiv({
			attr: {
				id: "x-spreadsheet",
				class: "sheet-box",
			},
		});

		console.log(this.ownerWindow.document.documentElement.clientWidth);
		const jsonData = JSON.parse(this.data || "{}") || {}
		//@ts-ignore
		this.sheet = new Spreadsheet("#x-spreadsheet", {
			view: {
				height: () => this.contentEl.clientHeight,
				width: () => this.contentEl.clientWidth,
			  },
		})
		.loadData(jsonData) // load data
		.change(data => {
		  // save data to db
		  this.data = JSON.stringify(data);
		});

		this.sheet.validate()
	}

	onload(): void {
		const apiMissing = Boolean(
			typeof this.containerEl.onWindowMigrated === "undefined"
		);
		this.ownerWindow = this.containerEl.win;
	}

	clear(): void {
		this.data = "";
	}

	getViewType(): string {
		return VIEW_TYPE_EXCEL;
	}
}
