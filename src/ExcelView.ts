import ExcelPlugin from "main";
import { TextFileView, WorkspaceLeaf } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";
import * as XLSX from "xlsx";
import { stox, xtos } from "./utils/xlsxspread";

export const VIEW_TYPE_EXCEL = "excel-view";

export class ExcelView extends TextFileView {
	public plugin: ExcelPlugin;
	public ownerWindow: Window;
	public sheet: any;
	public importEle: HTMLElement;
	public exportEle: HTMLElement;

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

		const jsonData = JSON.parse(this.data || "{}") || {};

		app.workspace.onLayoutReady(async () => {
			//@ts-ignore
			this.sheet = new Spreadsheet("#x-spreadsheet", {
				view: {
					height: () => this.contentEl.clientHeight,
					width: () => this.contentEl.clientWidth,
				},
			})
				.loadData(jsonData) // load data
				.change((data) => {
					// save data to db
					this.data = JSON.stringify(data);
				});

			this.sheet.validate();

			// 导入导出
			const importInput = this.contentEl.createEl("input", {
				cls: "import-excel",
				type: "file",
				attr: {
					id: "import",
					accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			});
			importInput.addEventListener(
				"change",
				this.handleFile.bind(this),
				false
			);
		});
	}

	// 处理顶部导入按钮点击事件
	handleImportClick(ev: MouseEvent) {
		const importEle = document.getElementById("import");
		importEle?.click();
		// 打开文件
		console.log("handleImportClick", importEle);
	}

	handleFile(e: Event) {
		console.log("handleFile", e);
		//@ts-ignore
		const files = e.target?.files;
		var f = files[0];
		var reader = new FileReader();
		var instance = this;
		reader.onload = (e) => {
			const data = e.target?.result;
			console.log(data, instance);

			instance.process_wb(XLSX.read(data));
		};
		reader.readAsArrayBuffer(f);
	}

	process_wb(wb: XLSX.WorkBook) {
		const sheetData = stox(wb);
		this.sheet.loadData(sheetData);
	}

	handleExportClick(ev: MouseEvent) {
		var new_wb = xtos(this.sheet.getData()) as XLSX.WorkBook;
		var title = this.file?.basename ?? "sheet";
		/* write file and trigger a download */
		XLSX.writeFile(new_wb, title + ".xlsx", {});
	}

	onload(): void {
		const apiMissing = Boolean(
			typeof this.containerEl.onWindowMigrated === "undefined"
		);
		this.ownerWindow = this.containerEl.win;

		// 添加顶部导入按钮
		this.importEle = this.addAction("download", "import xlsx file", (ev) =>
			this.handleImportClick(ev)
		);

		this.exportEle = this.addAction("upload", "export xlsx file", (ev) =>
			this.handleExportClick(ev)
		);
	}

	clear(): void {
		this.data = "";
	}

	getViewType(): string {
		return VIEW_TYPE_EXCEL;
	}
}
