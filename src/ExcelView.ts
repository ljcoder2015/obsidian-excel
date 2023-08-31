import ExcelPlugin from "main";
import { TextFileView, WorkspaceLeaf, Platform, Notice } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";
import * as XLSX from "xlsx";
import { stox, xtos } from "./utils/xlsxspread";

export const VIEW_TYPE_EXCEL = "excel-view";

export class ExcelView extends TextFileView {
	public plugin: ExcelPlugin;
	public ownerWindow: Window;
	public sheet: Spreadsheet;
	public importEle: HTMLElement;
	public exportEle: HTMLElement;
	public embedLinkEle: HTMLElement;
	public sheetEle: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: ExcelPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;

		app.workspace.onLayoutReady(async () => {
			// console.log('setViewData')
			await this.refresh();
		});
	}

	// 处理顶部导入按钮点击事件
	handleImportClick(ev: MouseEvent) {
		const importEle = document.getElementById("import");
		importEle?.click();
	}

	handleFile(e: Event) {
		//@ts-ignore
		const files = e.target?.files;
		if (!files) {
			new Notice('Failed to get file')
			return
		}
		const f = files[0];
		const reader = new FileReader();
		reader.onload = (e) => {
			const data = e.target?.result;
			
			if (data) {
				this.process_wb(XLSX.read(data));
			} else {
				new Notice('Read file error')
			}
		};
		reader.readAsArrayBuffer(f);
	}

	process_wb(wb: XLSX.WorkBook) {
		const sheetData = stox(wb);
		if (sheetData) {
			this.sheet.loadData(sheetData);
			this.data = JSON.stringify(sheetData);
		} else {
			new Notice('Data parsing error')
		}
	}

	handleExportClick(ev: MouseEvent) {
		//@ts-ignore
		const new_wb = xtos(this.sheet.getData()) as XLSX.WorkBook;
		const title = this.file?.basename ?? "sheet";
		/* write file and trigger a download */
		XLSX.writeFile(new_wb, title + ".xlsx", {});
	}

	handleEmbedLink(e:Event) {
		if (this.file) {
			navigator.clipboard.writeText(
				`![[${this.file.path}]]`,
			);
			new Notice('Copy embed link to clipboard')
		} else {
			new Notice('Copy embed link failed')
		}
	}

	onload(): void {
		this.ownerWindow = this.containerEl.win;

		// 添加顶部导入按钮
		this.importEle = this.addAction("download", "import xlsx file", (ev) =>
			this.handleImportClick(ev)
		);

		this.exportEle = this.addAction("upload", "export xlsx file", (ev) =>
			this.handleExportClick(ev)
		);

		this.embedLinkEle = this.addAction("link", "copy embed link", (ev) =>
			this.handleEmbedLink(ev)
		);

		super.onload();
	}

	clear(): void {
		this.data = "";
	}

	getViewType(): string {
		return VIEW_TYPE_EXCEL;
	}

	refresh() {
		this.contentEl.empty();
		this.sheetEle = this.contentEl.createDiv({
			attr: {
				id: "x-spreadsheet",
				class: "sheet-box",
			},
		});

		// 添加隐藏的导入input，用来选择导入的文件
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

		// 初始化 sheet
		const jsonData = JSON.parse(this.data || "{}") || {};
		//@ts-ignore
		this.sheet = new Spreadsheet(this.sheetEle, {
			showBottomBar: true,
				view: {
					height: () => this.contentEl.clientHeight,
					width: () => this.contentEl.clientWidth,
				},
			})
			.loadData(jsonData) // load data
			.change(() => {
				// save data to db
				const data = this.sheet.getData()
				console.log('save data to db', data)
				this.data = JSON.stringify(data);
			})

		// @ts-ignore
		this.sheet.validate();
	}

	onResize() {
		if (Platform.isDesktopApp) {
			this.refresh();
		}
		// console.log('resize')
		super.onResize()
	}
}
